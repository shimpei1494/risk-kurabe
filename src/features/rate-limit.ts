import { getRequestHeader } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";

type RateLimitBinding = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

function getClientIp(): string {
  const forwardedFor = getRequestHeader("x-forwarded-for");
  return (
    getRequestHeader("cf-connecting-ip") ?? forwardedFor?.split(",", 1)[0]?.trim() ?? "unknown"
  );
}

export async function enforceRateLimit(
  binding: RateLimitBinding | undefined,
  namespace: string,
): Promise<void> {
  // Local development does not have the Cloudflare binding. Production has it
  // because it is declared in wrangler.jsonc.
  if (!binding) return;

  const { success } = await binding.limit({ key: `${namespace}:${getClientIp()}` });
  if (success) return;

  throw new Response("リクエストが多すぎます。少し待ってから再試行してください。", {
    status: 429,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "retry-after": "10",
    },
  });
}

export const yahooRateLimiter = env.YAHOO_RATE_LIMITER;
export const aiRateLimiter = env.AI_RATE_LIMITER;
