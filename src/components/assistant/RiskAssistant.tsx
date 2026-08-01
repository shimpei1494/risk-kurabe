import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
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
import { riskAssistantLibrary } from "../../features/assistant/risk-assistant-library";
import {
  ASSISTANT_STARTERS,
  assistantContextKey,
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

function AssistantResponse({ response }: { response: string }) {
  const [hasError, setHasError] = useState(false);
  return (
    <Paper withBorder radius="lg" p="md" className="risk-assistant-response">
      {hasError ? (
        <Text mb="sm" fz={12} c="red.8" role="alert">
          説明UIの一部を表示できませんでした。
        </Text>
      ) : null}
      <Renderer
        response={response}
        library={riskAssistantLibrary}
        onError={(errors) => setHasError(errors.length > 0)}
      />
    </Paper>
  );
}

export function RiskAssistantLauncher() {
  const open = useRiskAssistantStore((state) => state.open);
  return (
    <Button
      variant="light"
      radius="xl"
      size="sm"
      leftSection={<span aria-hidden>✦</span>}
      onClick={open}
      aria-haspopup="dialog"
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

export function RiskAssistantPanel({ locations }: { locations: readonly ComparisonLocation[] }) {
  const isDesktop = useMediaQuery("(min-width: 48em)");
  const [question, setQuestion] = useState("");
  const opened = useRiskAssistantStore((state) => state.opened);
  const close = useRiskAssistantStore((state) => state.close);
  const addMessage = useRiskAssistantStore((state) => state.addMessage);
  const clearMessages = useRiskAssistantStore((state) => state.clearMessages);
  const contextKey = assistantContextKey(locations);
  const messages = useRiskAssistantStore(
    (state) => state.messagesByContext[contextKey] ?? EMPTY_MESSAGES,
  );

  function ask(nextQuestion: string) {
    const normalized = nextQuestion.trim();
    if (!normalized) return;
    addMessage(contextKey, normalized, buildDemoAssistantResponse(locations, normalized));
    setQuestion("");
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
                  仮実装
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
                  <AssistantResponse response={message.response} />
                </Box>
              </Box>
            ))}

            {messages.length > 0 ? (
              <Button
                variant="subtle"
                color="stone"
                size="compact-sm"
                onClick={() => clearMessages(contextKey)}
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
              disabled={question.trim().length === 0}
            >
              ↑
            </ActionIcon>
          </Group>
          <Text mt="2xs" fz={10.5} c="var(--mantine-color-stone-7)" ta="center">
            仮実装では入力内容を外部へ送信しません
          </Text>
        </Box>
      </Box>
    </Drawer>
  );
}
