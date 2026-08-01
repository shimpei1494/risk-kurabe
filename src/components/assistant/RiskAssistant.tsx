import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Renderer } from "@openuidev/react-lang";
import { useState } from "react";

import type { ComparisonLocation } from "../../domain/location";
import { askRiskAssistant } from "../../features/assistant/ask-risk-assistant";
import { riskAssistantLibrary } from "../../features/assistant/risk-assistant-library";
import {
  ASSISTANT_STARTERS,
  assistantContextKey,
  buildAssistantFacts,
  buildDemoAssistantResponse,
} from "../../features/assistant/risk-assistant-response";
import { useRiskAssistantStore } from "../../features/assistant/risk-assistant-store";

const EMPTY_MESSAGES: never[] = [];

function AssistantMark() {
  return (
    <ThemeIcon
      size={32}
      radius="md"
      className="risk-assistant-mark"
      styles={{ root: { fontFamily: "'Zen Maru Gothic', sans-serif", fontWeight: 900 } }}
    >
      AI
    </ThemeIcon>
  );
}

function AssistantResponse({ response, isStreaming }: { response: string; isStreaming: boolean }) {
  const [hasError, setHasError] = useState(false);
  return (
    <Paper
      withBorder
      radius="lg"
      p="md"
      className="risk-assistant-response"
      aria-live="polite"
      aria-busy={isStreaming}
    >
      {hasError ? (
        <Text mb="sm" fz={12} c="red.8" role="alert">
          説明UIの一部を表示できませんでした。
        </Text>
      ) : null}
      {response ? (
        <Renderer
          response={response}
          library={riskAssistantLibrary}
          isStreaming={isStreaming}
          onError={(errors) => {
            if (!isStreaming) setHasError(errors.length > 0);
          }}
        />
      ) : (
        <Group gap="xs" py="2xs">
          <Loader size="xs" color="teal" />
          <Text fz={12} c="var(--mantine-color-stone-7)">
            回答を考えています…
          </Text>
        </Group>
      )}
    </Paper>
  );
}

export function RiskAssistantLauncher() {
  const open = useRiskAssistantStore((state) => state.open);
  const opened = useRiskAssistantStore((state) => state.opened);
  return (
    <Button
      variant="light"
      radius="xl"
      size="sm"
      leftSection={<span aria-hidden>✦</span>}
      onClick={open}
      aria-expanded={opened}
      aria-controls="risk-assistant-panel"
    >
      <Box component="span" visibleFrom="sm">
        AIに質問
      </Box>
      <Box component="span" hiddenFrom="sm">
        AI
      </Box>
    </Button>
  );
}

function RiskAssistantSurface({ locations }: { locations: readonly ComparisonLocation[] }) {
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const close = useRiskAssistantStore((state) => state.close);
  const beginMessage = useRiskAssistantStore((state) => state.beginMessage);
  const appendResponse = useRiskAssistantStore((state) => state.appendResponse);
  const replaceResponse = useRiskAssistantStore((state) => state.replaceResponse);
  const completeMessage = useRiskAssistantStore((state) => state.completeMessage);
  const clearMessages = useRiskAssistantStore((state) => state.clearMessages);
  const contextKey = assistantContextKey(locations);
  const messages = useRiskAssistantStore(
    (state) => state.messagesByContext[contextKey] ?? EMPTY_MESSAGES,
  );

  async function ask(nextQuestion: string) {
    const normalized = nextQuestion.trim();
    if (!normalized || isAsking) return;
    const fallbackResponse = buildDemoAssistantResponse(locations, normalized);
    const messageId = beginMessage(contextKey, normalized);
    setIsAsking(true);
    setQuestion("");
    try {
      const stream = await askRiskAssistant({
        data: {
          question: normalized,
          facts: buildAssistantFacts(locations),
          fallbackResponse,
        },
      });
      const reader = stream.getReader();
      while (true) {
        // ストリームのチャンクは到着順に反映する必要がある。
        // oxlint-disable-next-line react-doctor/async-await-in-loop
        const { value, done } = await reader.read();
        if (done) break;
        if (value.type === "delta") appendResponse(contextKey, messageId, value.content);
        if (value.type === "replace") replaceResponse(contextKey, messageId, value.content);
        if (value.type === "done") completeMessage(contextKey, messageId);
      }
    } catch {
      replaceResponse(contextKey, messageId, fallbackResponse);
      completeMessage(contextKey, messageId);
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <Box className="risk-assistant-shell">
      <Group
        justify="space-between"
        align="flex-start"
        wrap="nowrap"
        px="lg"
        py="md"
        className="risk-assistant-header"
      >
        <Group gap="sm" wrap="nowrap">
          <AssistantMark />
          <div>
            <Group gap="2xs">
              <Text fz={15} fw={900} c="var(--mantine-color-stone-9)">
                公開データ説明アシスタント
              </Text>
              <Badge size="xs" variant="light" tt="none">
                AI
              </Badge>
            </Group>
            <Text mt={2} fz={11.5} c="var(--mantine-color-stone-7)">
              画面の結果を、同じものさしで読み解きます
            </Text>
          </div>
        </Group>
        <ActionIcon variant="subtle" color="stone" aria-label="AI説明を閉じる" onClick={close}>
          ×
        </ActionIcon>
      </Group>

      <ScrollArea className="risk-assistant-scroll" type="auto" offsetScrollbars>
        <Stack gap="md" px="lg" py="lg">
          <Paper radius="lg" p="md" className="risk-assistant-welcome">
            <Text fz={13} fw={800} c="var(--mantine-color-stone-9)">
              何を確認しますか？
            </Text>
            <Text mt="2xs" fz={12} lh={1.75} c="var(--mantine-color-stone-7)">
              AIは地点判定をやり直さず、表示中の公開データだけを説明します。
            </Text>
            <Stack mt="sm" gap="2xs">
              {ASSISTANT_STARTERS.map((starter) => (
                <Button
                  key={starter}
                  variant="white"
                  color="stone"
                  radius="md"
                  justify="space-between"
                  rightSection={<span aria-hidden>→</span>}
                  onClick={() => ask(starter)}
                  className="risk-assistant-starter"
                  disabled={isAsking}
                >
                  {starter}
                </Button>
              ))}
            </Stack>
          </Paper>

          {messages.map((message) => (
            <Box key={message.id} className="risk-assistant-exchange">
              <Paper ml="xl" radius="lg" px="md" py="sm" bg="teal.7">
                <Text fz={12.5} lh={1.65} c="white">
                  {message.question}
                </Text>
              </Paper>
              <Box mt="sm" className="risk-assistant-answer-rail">
                <Group gap="2xs" mb="2xs">
                  <AssistantMark />
                  <Text fz={10.5} fw={800} c="teal.8">
                    公開データからの説明
                  </Text>
                </Group>
                <AssistantResponse
                  response={message.response}
                  isStreaming={message.status === "streaming"}
                />
              </Box>
            </Box>
          ))}

          {messages.length > 0 ? (
            <Button
              variant="subtle"
              color="stone"
              size="compact-sm"
              onClick={() => clearMessages(contextKey)}
              disabled={isAsking}
              style={{ alignSelf: "center" }}
            >
              この説明をクリア
            </Button>
          ) : null}
        </Stack>
      </ScrollArea>

      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
        px="lg"
        pt="sm"
        pb="md"
        className="risk-assistant-composer"
      >
        <Group gap="2xs" align="flex-end" wrap="nowrap">
          <Textarea
            value={question}
            onChange={(event) => setQuestion(event.currentTarget.value)}
            placeholder="結果について質問する"
            aria-label="結果について質問する"
            autosize
            minRows={1}
            maxRows={3}
            maxLength={200}
            flex={1}
            radius="md"
          />
          <ActionIcon
            type="submit"
            size={42}
            radius="md"
            aria-label="質問を送る"
            disabled={question.trim().length === 0 || isAsking}
          >
            ↑
          </ActionIcon>
        </Group>
        <Text mt="2xs" fz={10.5} c="var(--mantine-color-stone-7)" ta="center">
          AIには表示中の公開データと質問だけを送信します。住所・座標は送信しません。
        </Text>
      </Box>
    </Box>
  );
}

export function RiskAssistantPanel({
  locations,
  displayMode = "overlay",
}: {
  locations: readonly ComparisonLocation[];
  displayMode?: "inline" | "overlay";
}) {
  const isDesktop = useMediaQuery("(min-width: 48em)");
  const opened = useRiskAssistantStore((state) => state.opened);
  const close = useRiskAssistantStore((state) => state.close);

  if (displayMode === "inline") {
    return opened ? (
      <Box
        component="aside"
        id="risk-assistant-panel"
        aria-label="公開データ説明アシスタント"
        className="risk-assistant-inline"
      >
        <RiskAssistantSurface locations={locations} />
      </Box>
    ) : null;
  }

  return (
    <Drawer
      opened={opened}
      onClose={close}
      position={isDesktop ? "right" : "bottom"}
      size={isDesktop ? 440 : "92%"}
      radius={isDesktop ? 0 : "lg"}
      padding={0}
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.32, blur: 2 }}
      aria-label="公開データ説明アシスタント"
      styles={{
        body: { height: "100%", overflow: "hidden" },
        content: { background: "var(--mantine-color-stone-0)" },
      }}
    >
      <Box id="risk-assistant-panel" h="100%">
        <RiskAssistantSurface locations={locations} />
      </Box>
    </Drawer>
  );
}
