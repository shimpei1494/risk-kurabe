import { createParser } from "@openuidev/react-lang";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import OpenAI from "openai";
import { z } from "zod";

import { riskAssistantLibrary, riskAssistantPromptOptions } from "./risk-assistant-library";
import { RISK_ASSISTANT_MODEL_CONFIG, type RiskAssistantPurpose } from "./risk-assistant-model";
import type { AssistantFact } from "./risk-assistant-response";

const factSchema = z.object({
  location: z.string().min(1).max(40),
  indicator: z.string().min(1).max(80),
  value: z.string().min(1).max(80),
  state: z.enum([
    "value",
    "uncolored",
    "outOfArea",
    "unpublished",
    "notApplicable",
    "undetermined",
  ]),
  boundaryWarning: z.boolean(),
});

const inputSchema = z.object({
  question: z.string().trim().min(1).max(200),
  facts: z.array(factSchema).max(24),
  fallbackResponse: z.string().min(1),
  purpose: z
    .enum(["publicDataExplanation", "definitionExplanation", "locationChangeGuide"])
    .default("publicDataExplanation"),
});

const parser = createParser(riskAssistantLibrary.toJSONSchema(), "AssistantCard");

function makePrompt(question: string, facts: readonly AssistantFact[]): string {
  return [
    "現在表示中の公開データです。以下にない住所、座標、URL、数値、原因は生成しないでください。",
    JSON.stringify({ facts }, null, 0),
    `利用者の質問: ${question}`,
    "質問に答えるためのOpenUI Langだけを出力してください。Markdown、コードフェンス、前置きは不要です。",
  ].join("\n");
}

function isValidOpenUiResponse(response: string): boolean {
  const result = parser.parse(response);
  return (result.meta?.errors?.length ?? 0) === 0;
}

export type RiskAssistantStreamEvent =
  | { type: "delta"; content: string }
  | { type: "replace"; content: string }
  | { type: "done" };

function fallbackStream(response: string): ReadableStream<RiskAssistantStreamEvent> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue({ type: "replace", content: response });
      controller.enqueue({ type: "done" });
      controller.close();
    },
  });
}

export const askRiskAssistant = createServerFn({ method: "POST" })
  .inputValidator((value) => inputSchema.parse(value))
  .handler(async ({ data }) => {
    const modelConfig =
      RISK_ASSISTANT_MODEL_CONFIG[data.purpose as RiskAssistantPurpose] ??
      RISK_ASSISTANT_MODEL_CONFIG.publicDataExplanation;
    const gatewayConfigured = Boolean(env.AI_GATEWAY_BASE_URL && env.CF_AIG_TOKEN);
    if (!gatewayConfigured && !env.OPENAI_API_KEY) return fallbackStream(data.fallbackResponse);

    const client = new OpenAI({
      // BYOK利用時はOpenAIキーではなくCloudflare APIトークンでGatewayを認証する。
      apiKey: gatewayConfigured ? env.CF_AIG_TOKEN : env.OPENAI_API_KEY,
      baseURL: gatewayConfigured ? env.AI_GATEWAY_BASE_URL : "https://api.openai.com/v1",
      ...(gatewayConfigured
        ? {
            defaultHeaders: {
              "cf-aig-authorization": `Bearer ${env.CF_AIG_TOKEN}`,
              ...(env.AI_GATEWAY_BYOK_ALIAS
                ? { "cf-aig-byok-alias": env.AI_GATEWAY_BYOK_ALIAS }
                : {}),
            },
          }
        : {}),
    });

    return new ReadableStream<RiskAssistantStreamEvent>({
      async start(controller) {
        let output = "";
        try {
          const stream = await client.chat.completions.create({
            model: modelConfig.model,
            messages: [
              {
                role: "system",
                content: [
                  riskAssistantLibrary.prompt(riskAssistantPromptOptions),
                  "事実の値は入力データをそのまま使い、評価・推奨・独自順位を作らないでください。",
                ].join("\n\n"),
              },
              { role: "user", content: makePrompt(data.question, data.facts) },
            ],
            reasoning_effort: modelConfig.reasoningEffort,
            max_completion_tokens: 1800,
            stream: true,
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta.content;
            if (!content) continue;
            output += content;
            controller.enqueue({ type: "delta", content });
          }

          if (!output.trim() || !isValidOpenUiResponse(output)) {
            controller.enqueue({ type: "replace", content: data.fallbackResponse });
          }
          controller.enqueue({ type: "done" });
          controller.close();
        } catch {
          controller.enqueue({ type: "replace", content: data.fallbackResponse });
          controller.enqueue({ type: "done" });
          controller.close();
        }
      },
    });
  });
