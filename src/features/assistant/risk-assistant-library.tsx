import { Box, Group, Paper, Stack, Text, ThemeIcon, useMantineTheme } from "@mantine/core";
import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";

import { DataBadge } from "../../components/shared/DataBadge";
import { BoundaryWarningNote, InfoBanner } from "../../components/shared/InfoBlocks";
import type { DataStateKind, FloodDepthCategory, RegionalRiskRank } from "../../domain/risk";

const dataStateSchema = z.enum([
  "value",
  "outOfArea",
  "unpublished",
  "notApplicable",
  "undetermined",
]);

const AssistantSummary = defineComponent({
  name: "AssistantSummary",
  description: "公開データから読み取れる内容を、評価や推奨をせずに短く説明する導入部。",
  props: z.object({
    eyebrow: z.string(),
    title: z.string(),
    body: z.string(),
  }),
  component: ({ props }) => (
    <Box className="risk-assistant-summary">
      <Text fz={10.5} fw={800} c="teal.8" tt="uppercase" lts="0.08em">
        {props.eyebrow}
      </Text>
      <Text mt="4xs" fz={18} fw={900} lh={1.45} c="var(--mantine-color-stone-9)">
        {props.title}
      </Text>
      <Text mt="2xs" fz={13} lh={1.85} c="var(--mantine-color-stone-8)">
        {props.body}
      </Text>
    </Box>
  ),
});

function valueColor(
  indicator: string,
  value: string,
  risk: ReturnType<typeof useMantineTheme>["other"]["risk"],
) {
  if (indicator === "最大浸水深" && value in risk.floodDepth) {
    return risk.floodDepth[value as FloodDepthCategory];
  }

  const rank = /ランク([1-5])/.exec(value)?.[1];
  if (rank) return risk.regionalRiskRank[Number(rank) as RegionalRiskRank];
  return undefined;
}

const RiskFact = defineComponent({
  name: "RiskFact",
  description: "1地点の1指標について、公表区分またはデータ状態を既存の結果バッジで表示する。",
  props: z.object({
    location: z.string(),
    indicator: z.string(),
    value: z.string(),
    state: dataStateSchema,
  }),
  component: ({ props }) => {
    const { other } = useMantineTheme();
    return (
      <Paper withBorder radius="md" px="sm" py="xs" className="risk-assistant-fact">
        <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
          <div>
            <Text fz={10.5} fw={800} c="teal.8">
              {props.location}
            </Text>
            <Text mt={2} fz={12.5} fw={700} c="var(--mantine-color-stone-9)">
              {props.indicator}
            </Text>
          </div>
          <DataBadge
            state={props.state as DataStateKind}
            valueLabel={props.value}
            valueColor={valueColor(props.indicator, props.value, other.risk)}
            outOfAreaLabel="区域外"
            notApplicableLabel="対象外"
            undeterminedLabel="判定データなし"
          />
        </Group>
      </Paper>
    );
  },
});

const AssistantNote = defineComponent({
  name: "AssistantNote",
  description: "データの読み方または重要な注意事項。境界警告は専用の既存UIで表示する。",
  props: z.object({
    kind: z.enum(["information", "warning", "boundary"]),
    text: z.string(),
  }),
  component: ({ props }) =>
    props.kind === "boundary" ? (
      <BoundaryWarningNote />
    ) : (
      <InfoBanner variant={props.kind === "warning" ? "warning" : "neutral"}>
        {props.text}
      </InfoBanner>
    ),
});

const AssistantText = defineComponent({
  name: "AssistantText",
  description:
    "挨拶、利用範囲の案内、短い受け答えなど、専用のデータUIが不要な場合に通常の文章を表示する。",
  props: z.object({
    text: z.string(),
  }),
  component: ({ props }) => (
    <Text fz={13} lh={1.85} c="var(--mantine-color-stone-8)" style={{ whiteSpace: "pre-wrap" }}>
      {props.text}
    </Text>
  ),
});

const EvidenceFooter = defineComponent({
  name: "EvidenceFooter",
  description: "AI説明の根拠範囲と、利用者が次に確認すべき場所を示す末尾注記。",
  props: z.object({
    text: z.string(),
  }),
  component: ({ props }) => (
    <Group gap="2xs" align="flex-start" wrap="nowrap" className="risk-assistant-evidence">
      <ThemeIcon variant="light" radius="xl" size={20} fz={10} flex="none">
        根
      </ThemeIcon>
      <Text fz={11.5} lh={1.7} c="var(--mantine-color-stone-7)">
        {props.text}
      </Text>
    </Group>
  ),
});

const assistantChild = z.union([
  AssistantSummary.ref,
  RiskFact.ref,
  AssistantNote.ref,
  AssistantText.ref,
  EvidenceFooter.ref,
]);

const AssistantCard = defineComponent({
  name: "AssistantCard",
  description: "TOKYOりすくらべのAI説明を、読み取り専用の縦一列で表示するルート。",
  props: z.object({ children: z.array(assistantChild) }),
  component: ({ props, renderNode }) => (
    <Stack gap="sm" className="risk-assistant-card">
      {/* OpenUIの描画コンテキストが参照ノードをReact要素へ変換する公式API。 */}
      {/* oxlint-disable-next-line react-doctor/no-render-in-render */}
      {renderNode(props.children)}
    </Stack>
  ),
});

export const riskAssistantLibrary = createLibrary({
  root: "AssistantCard",
  components: [
    AssistantCard,
    AssistantSummary,
    RiskFact,
    AssistantNote,
    AssistantText,
    EvidenceFooter,
  ],
});

export const riskAssistantPromptOptions = {
  preamble:
    "あなたは公開GISデータの読み方を説明する補助者です。安全性の判定、居住推奨、独自順位、異なる災害種別の重み付けは行いません。",
  additionalRules: [
    "必ずAssistantCardをルートにし、1列の読み取り専用UIを作る。",
    "入力に含まれる公表値、データ状態、境界警告だけを説明する。",
    "区域外、対象外、未公開、判定不能を安全と表現しない。",
    "住所、座標、任意URL、入力にない数値や原因を生成しない。",
    "挨拶、機能範囲の確認、公開データと無関係な質問では、表示中の地点結果を繰り返さずAssistantTextで短く自然に答える。",
    "専用コンポーネントが回答を理解しやすくする場合だけAssistantSummary、RiskFact、AssistantNoteを使う。",
  ],
};
