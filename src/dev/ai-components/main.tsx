import "@mantine/core/styles.css";
import "../../styles.css";
import "./preview.css";
import {
  Alert,
  Badge,
  Box,
  Button,
  Code,
  Group,
  MantineProvider,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { createParser, Renderer } from "@openuidev/react-lang";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { askRiskAssistant } from "../../features/assistant/ask-risk-assistant";
import { riskAssistantLibrary } from "../../features/assistant/risk-assistant-library";
import type { RiskAssistantPurpose } from "../../features/assistant/risk-assistant-model";
import { theme } from "../../theme";
import {
  ASSISTANT_FACT_SETS,
  ASSISTANT_PREVIEW_FIXTURES,
  type AssistantPreviewFixture,
} from "./fixtures";

type PreviewWidth = "390" | "480" | "full";

interface LabState {
  factSetId: string;
  fixtureId: string;
  isAsking: boolean;
  isStreaming: boolean;
  previewWidth: PreviewWidth;
  purpose: RiskAssistantPurpose;
  question: string;
  renderedResponse: string;
  response: string;
  runtimeErrors: string[];
}

const parser = createParser(riskAssistantLibrary.toJSONSchema(), "AssistantCard");
const initialFixture = ASSISTANT_PREVIEW_FIXTURES[0]!;
const initialState: LabState = {
  factSetId: ASSISTANT_FACT_SETS[0]!.id,
  fixtureId: initialFixture.id,
  isAsking: false,
  isStreaming: false,
  previewWidth: "390",
  purpose: "publicDataExplanation",
  question: "地点ごとの違いを説明して",
  renderedResponse: initialFixture.response,
  response: initialFixture.response,
  runtimeErrors: [],
};

function diagnosticsFor(response: string) {
  const result = parser.parse(response);
  return {
    errors: result.meta.errors.map((error) => String(error)),
    unresolved: result.meta.unresolved.map((item) => String(item)),
  };
}

function LabHeader() {
  return (
    <header className="ai-lab-header">
      <Group justify="space-between" align="flex-start" gap="xl">
        <Group gap="md" align="flex-start" wrap="nowrap">
          <ThemeIcon size={46} radius="lg" className="ai-lab-mark">
            UI
          </ThemeIcon>
          <div>
            <Group gap="xs">
              <Title order={1}>AI UI Lab</Title>
              <Badge color="orange" variant="light" tt="none">
                vp dev only
              </Badge>
            </Group>
            <Text mt={3} fz="sm" c="var(--mantine-color-stone-7)">
              OpenUI Langの入力、ストリーミング、実寸表示を同じ検査台で確認します。
            </Text>
          </div>
        </Group>
        <Code className="ai-lab-path">/__dev/ai-components</Code>
      </Group>
    </header>
  );
}

function LabToolbar({
  fixture,
  fixtureId,
  isAsking,
  previewWidth,
  onFixtureChange,
  onPreviewWidthChange,
  onReplay,
}: {
  fixture: AssistantPreviewFixture;
  fixtureId: string;
  isAsking: boolean;
  previewWidth: PreviewWidth;
  onFixtureChange: (value: string | null) => void;
  onPreviewWidthChange: (value: PreviewWidth) => void;
  onReplay: () => void;
}) {
  return (
    <Paper withBorder radius="lg" p="md" className="ai-lab-toolbar">
      <Group justify="space-between" gap="lg" align="flex-end">
        <Group gap="md" align="flex-end">
          <Select
            label="固定サンプル"
            value={fixtureId}
            data={ASSISTANT_PREVIEW_FIXTURES.map((item) => ({ value: item.id, label: item.label }))}
            onChange={onFixtureChange}
            allowDeselect={false}
            w={210}
          />
          <Box>
            <Text fz={12} fw={700} mb={5} c="var(--mantine-color-stone-8)">
              プレビュー幅
            </Text>
            <SegmentedControl
              value={previewWidth}
              onChange={(value) => onPreviewWidthChange(value as PreviewWidth)}
              data={[
                { value: "390", label: "390px" },
                { value: "480", label: "480px" },
                { value: "full", label: "全幅" },
              ]}
            />
          </Box>
          <Button variant="light" onClick={onReplay} disabled={isAsking}>
            ストリーミング再生
          </Button>
        </Group>
        <Text fz={11.5} c="var(--mantine-color-stone-7)" maw={430}>
          {fixture.description}
        </Text>
      </Group>
      <Group mt="sm" gap="2xs">
        {fixture.components.map((component) => (
          <Badge key={component} variant="outline" color="stone" tt="none">
            {component}
          </Badge>
        ))}
      </Group>
    </Paper>
  );
}

function LangEditor({
  diagnostics,
  response,
  onChange,
  onReset,
}: {
  diagnostics: ReturnType<typeof diagnosticsFor>;
  response: string;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <Paper withBorder radius="lg" p="md">
      <Group justify="space-between" mb="xs">
        <div>
          <Text fw={900}>OpenUI Lang</Text>
          <Text fz={11.5} c="var(--mantine-color-stone-7)">
            編集内容は右側へ即時反映されます。
          </Text>
        </div>
        <Button size="compact-sm" variant="subtle" onClick={onReset}>
          元に戻す
        </Button>
      </Group>
      <Textarea
        aria-label="OpenUI Langを編集"
        value={response}
        onChange={(event) => onChange(event.currentTarget.value)}
        autosize
        minRows={17}
        maxRows={28}
        className="ai-lab-code-input"
      />
      <Group mt="xs" gap="xs">
        <Badge color={diagnostics.errors.length === 0 ? "teal" : "red"} variant="light">
          errors {diagnostics.errors.length}
        </Badge>
        <Badge color={diagnostics.unresolved.length === 0 ? "teal" : "orange"} variant="light">
          unresolved {diagnostics.unresolved.length}
        </Badge>
        <Text fz={11} c="var(--mantine-color-stone-7)">
          {response.length.toLocaleString()} chars
        </Text>
      </Group>
      {diagnostics.errors.length > 0 ? (
        <Alert mt="sm" color="red" title="パースエラー">
          {diagnostics.errors.join("\n")}
        </Alert>
      ) : null}
    </Paper>
  );
}

function AiGenerator({
  factSetId,
  isAsking,
  purpose,
  question,
  onFactSetChange,
  onGenerate,
  onPurposeChange,
  onQuestionChange,
}: {
  factSetId: string;
  isAsking: boolean;
  purpose: RiskAssistantPurpose;
  question: string;
  onFactSetChange: (value: string) => void;
  onGenerate: () => void;
  onPurposeChange: (value: RiskAssistantPurpose) => void;
  onQuestionChange: (value: string) => void;
}) {
  const factSet =
    ASSISTANT_FACT_SETS.find((item) => item.id === factSetId) ?? ASSISTANT_FACT_SETS[0]!;
  return (
    <Paper withBorder radius="lg" p="md" className="ai-lab-ai-panel">
      <Group justify="space-between" mb="sm">
        <div>
          <Text fw={900}>実際のAIで生成</Text>
          <Text fz={11.5} c="var(--mantine-color-stone-7)">
            ボタンを押した場合だけ、設定済みGatewayへリクエストします。
          </Text>
        </div>
        <Badge variant="dot" color="orange" tt="none">
          API使用
        </Badge>
      </Group>
      <Group grow align="flex-start">
        <Select
          label="入力データ"
          value={factSetId}
          data={ASSISTANT_FACT_SETS.map((item) => ({ value: item.id, label: item.label }))}
          onChange={(value) => value && onFactSetChange(value)}
          allowDeselect={false}
        />
        <Select
          label="用途"
          value={purpose}
          data={[
            { value: "publicDataExplanation", label: "公開データの説明" },
            { value: "definitionExplanation", label: "用語・定義の説明" },
            { value: "locationChangeGuide", label: "地点変更の案内" },
          ]}
          onChange={(value) => value && onPurposeChange(value as RiskAssistantPurpose)}
          allowDeselect={false}
        />
      </Group>
      <Textarea
        mt="sm"
        label="質問"
        value={question}
        onChange={(event) => onQuestionChange(event.currentTarget.value)}
        minRows={2}
      />
      <Group justify="space-between" mt="sm" align="flex-end">
        <Text fz={11} c="var(--mantine-color-stone-7)" maw={360}>
          {factSet.description} 住所・座標は送信しません。
        </Text>
        <Button onClick={onGenerate} loading={isAsking} disabled={!question.trim()}>
          AIで生成
        </Button>
      </Group>
    </Paper>
  );
}

function PreviewPane({
  isStreaming,
  previewWidth,
  renderedResponse,
  runtimeErrors,
  onRendererError,
}: {
  isStreaming: boolean;
  previewWidth: PreviewWidth;
  renderedResponse: string;
  runtimeErrors: string[];
  onRendererError: (errors: string[]) => void;
}) {
  const previewStyle =
    previewWidth === "full" ? { width: "100%" } : { width: `${Number(previewWidth)}px` };
  return (
    <section className="ai-lab-preview-zone" aria-label="AIコンポーネントのプレビュー">
      <Group justify="space-between" mb="xs">
        <div>
          <Text fw={900}>実寸プレビュー</Text>
          <Text fz={11.5} c="var(--mantine-color-stone-7)">
            実際のriskAssistantLibraryで描画しています。
          </Text>
        </div>
        <Badge color={isStreaming ? "orange" : "teal"} variant="light" tt="none">
          {isStreaming ? "streaming" : "complete"}
        </Badge>
      </Group>
      <Box className="ai-lab-ruler" style={previewStyle} data-width={previewWidth}>
        <Text className="ai-lab-ruler-label">
          {previewWidth === "full" ? "container width" : `${previewWidth}px`}
        </Text>
        <Paper withBorder radius="lg" p="md" className="risk-assistant-response ai-lab-preview">
          {renderedResponse ? (
            <Renderer
              response={renderedResponse}
              library={riskAssistantLibrary}
              isStreaming={isStreaming}
              onError={(errors) => {
                if (!isStreaming) onRendererError(errors.map((error) => String(error)));
              }}
            />
          ) : (
            <Stack align="center" py="5xl" gap="xs">
              <ThemeIcon variant="light" radius="xl" size={42}>
                …
              </ThemeIcon>
              <Text fz="sm" c="var(--mantine-color-stone-7)">
                OpenUI Langを待っています
              </Text>
            </Stack>
          )}
        </Paper>
      </Box>
      {runtimeErrors.length > 0 ? (
        <Alert mt="md" color="red" title="Rendererエラー">
          {runtimeErrors.join("\n")}
        </Alert>
      ) : null}
    </section>
  );
}

function PreviewApp() {
  const [state, setState] = useState(initialState);
  const replayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fixture =
    ASSISTANT_PREVIEW_FIXTURES.find((item) => item.id === state.fixtureId) ?? initialFixture;
  const factSet =
    ASSISTANT_FACT_SETS.find((item) => item.id === state.factSetId) ?? ASSISTANT_FACT_SETS[0]!;
  const diagnostics = useMemo(() => diagnosticsFor(state.response), [state.response]);
  const update = (next: Partial<LabState>) => setState((current) => ({ ...current, ...next }));

  useEffect(
    () => () => {
      if (replayTimer.current) clearTimeout(replayTimer.current);
    },
    [],
  );

  function selectFixture(nextId: string | null) {
    const next = ASSISTANT_PREVIEW_FIXTURES.find((item) => item.id === nextId);
    if (!next) return;
    if (replayTimer.current) clearTimeout(replayTimer.current);
    update({
      fixtureId: next.id,
      response: next.response,
      renderedResponse: next.response,
      runtimeErrors: [],
      isStreaming: false,
    });
  }

  function replayStream() {
    if (replayTimer.current) clearTimeout(replayTimer.current);
    const source = state.response;
    let cursor = 0;
    update({ renderedResponse: "", runtimeErrors: [], isStreaming: true });
    const appendChunk = () => {
      cursor = Math.min(source.length, cursor + 18);
      update({ renderedResponse: source.slice(0, cursor) });
      if (cursor >= source.length) {
        update({ isStreaming: false });
        replayTimer.current = null;
        return;
      }
      replayTimer.current = setTimeout(appendChunk, 24);
    };
    appendChunk();
  }

  async function generateWithAi() {
    const normalized = state.question.trim();
    if (!normalized || state.isAsking) return;
    if (replayTimer.current) clearTimeout(replayTimer.current);
    update({
      isAsking: true,
      isStreaming: true,
      response: "",
      renderedResponse: "",
      runtimeErrors: [],
    });
    try {
      const stream = await askRiskAssistant({
        data: {
          question: normalized,
          facts: [...factSet.facts],
          fallbackResponse: fixture.response,
          purpose: state.purpose,
        },
      });
      const reader = stream.getReader();
      let nextResponse = "";
      while (true) {
        // OpenUIのチャンク順を保ってプレビューへ反映する。
        // oxlint-disable-next-line react-doctor/async-await-in-loop
        const { value, done } = await reader.read();
        if (done) break;
        if (value.type === "delta") nextResponse += value.content;
        if (value.type === "replace") nextResponse = value.content;
        if (value.type !== "done")
          update({ response: nextResponse, renderedResponse: nextResponse });
      }
    } catch (error) {
      update({ runtimeErrors: [error instanceof Error ? error.message : "AI生成に失敗しました"] });
    } finally {
      update({ isAsking: false, isStreaming: false });
    }
  }

  return (
    <Box className="ai-lab-page">
      <LabHeader />
      <main className="ai-lab-main">
        <LabToolbar
          fixture={fixture}
          fixtureId={state.fixtureId}
          isAsking={state.isAsking}
          previewWidth={state.previewWidth}
          onFixtureChange={selectFixture}
          onPreviewWidthChange={(previewWidth) => update({ previewWidth })}
          onReplay={replayStream}
        />
        <div className="ai-lab-workbench">
          <Stack gap="md" className="ai-lab-editor-column">
            <LangEditor
              diagnostics={diagnostics}
              response={state.response}
              onChange={(response) =>
                update({
                  response,
                  renderedResponse: response,
                  runtimeErrors: [],
                  isStreaming: false,
                })
              }
              onReset={() => selectFixture(fixture.id)}
            />
            <AiGenerator
              factSetId={state.factSetId}
              isAsking={state.isAsking}
              purpose={state.purpose}
              question={state.question}
              onFactSetChange={(factSetId) => update({ factSetId })}
              onGenerate={() => void generateWithAi()}
              onPurposeChange={(purpose) => update({ purpose })}
              onQuestionChange={(question) => update({ question })}
            />
          </Stack>
          <PreviewPane
            isStreaming={state.isStreaming}
            previewWidth={state.previewWidth}
            renderedResponse={state.renderedResponse}
            runtimeErrors={state.runtimeErrors}
            onRendererError={(runtimeErrors) => update({ runtimeErrors })}
          />
        </div>
      </main>
    </Box>
  );
}

const rootElement = document.querySelector("#root");
if (!rootElement) throw new Error("AI UI Labの描画先がありません");

createRoot(rootElement).render(
  <MantineProvider theme={theme}>
    <PreviewApp />
  </MantineProvider>,
);
