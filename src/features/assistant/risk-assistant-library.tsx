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

const comparisonItemSchema = z.object({
  location: z.string(),
  value: z.string(),
  state: dataStateSchema,
  boundaryWarning: z.boolean(),
});

type ComparisonItem = z.infer<typeof comparisonItemSchema>;

function floodRange(value: unknown): { lower: number; upper: number; openEnded: boolean } | null {
  if (typeof value !== "string") return null;
  const numbers = [...value.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  if (numbers.length >= 2) {
    return { lower: numbers[0]!, upper: numbers[1]!, openEnded: false };
  }
  if (numbers.length === 1 && /未満/.test(value)) {
    return { lower: 0, upper: numbers[0]!, openEnded: false };
  }
  if (numbers.length === 1 && /以上/.test(value)) {
    return { lower: numbers[0]!, upper: numbers[0]! + 5, openEnded: true };
  }
  return null;
}

function floodCategory(value: unknown): FloodDepthCategory | null {
  const range = floodRange(value);
  if (!range) return null;
  if (range.openEnded && range.lower === 20) return "20m以上";

  const key = `${range.lower}-${range.upper}`;
  const categories: Record<string, FloodDepthCategory> = {
    "0-0.5": "0.5m未満",
    "0.5-3": "0.5〜3m",
    "3-5": "3〜5m",
    "5-10": "5〜10m",
    "10-20": "10〜20m",
  };
  return categories[key] ?? null;
}

function riskRank(value: unknown): RegionalRiskRank | null {
  if (typeof value !== "string") return null;
  const rank = /ランク\s*([1-5])/.exec(value)?.[1];
  return rank ? (Number(rank) as RegionalRiskRank) : null;
}

function displayValue(item: ComparisonItem): string {
  return typeof item.value === "string" ? item.value : "";
}

function floodScale(items: ComparisonItem[]): { max: number; ticks: number[] } {
  let highest = 0;
  let hasOpenEnded = false;
  for (const item of items) {
    if (item.state !== "value") continue;
    const range = floodRange(item.value);
    if (!range) continue;
    highest = Math.max(highest, range.upper);
    hasOpenEnded ||= range.openEnded;
  }

  let max = 5;
  if (hasOpenEnded || highest > 20) max = 25;
  else if (highest > 10) max = 20;
  else if (highest > 5) max = 10;
  else if (highest > 3) max = 5;
  else if (highest > 0.5) max = 3;
  else if (highest > 0) max = 0.5;

  return { max, ticks: [max, max / 2, 0] };
}

function rankPosition(rank: number): number {
  return 12 + ((rank - 1) / 4) * 76;
}

function ComparisonState({ item }: { item: ComparisonItem }) {
  const value = displayValue(item) || "データ状態を確認中";
  return (
    <Box className="risk-comparison-state">
      <Text fz={10.5} fw={800} c="var(--mantine-color-stone-8)">
        {value}
      </Text>
      <Text fz={9.5} lh={1.35} c="var(--mantine-color-stone-7)">
        大小比較できません
      </Text>
    </Box>
  );
}

function FloodPlot({ items }: { items: ComparisonItem[] }) {
  const { other } = useMantineTheme();
  const scale = floodScale(items);

  return (
    <Box className="risk-comparison-chart">
      <Box className="risk-comparison-axis" aria-hidden>
        {scale.ticks.map((tick) => (
          <Text
            key={tick}
            component="span"
            className="risk-comparison-axis-label"
            style={{ bottom: `${(tick / scale.max) * 100}%` }}
          >
            {tick}m
          </Text>
        ))}
      </Box>
      <Box
        className="risk-comparison-columns"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map((item, index) => {
          const value = displayValue(item);
          const range = item.state === "value" ? floodRange(value) : null;
          const color = valueColor("最大浸水深", value, other.risk);
          return (
            <Box key={item.location || index} className="risk-comparison-column">
              <Box className="risk-comparison-plot-area">
                {range ? (
                  <Box
                    className="risk-comparison-flood-range"
                    style={{
                      bottom: `${(Math.min(range.lower, scale.max) / scale.max) * 100}%`,
                      height: `${Math.max(
                        ((Math.min(range.upper, scale.max) - Math.min(range.lower, scale.max)) /
                          scale.max) *
                          100,
                        3,
                      )}%`,
                      background: color?.bg,
                      borderColor: color?.text,
                      color: color?.text,
                    }}
                  >
                    {range.openEnded ? <span className="risk-comparison-open-end">↑</span> : null}
                  </Box>
                ) : item.state === "outOfArea" ? (
                  <Box className="risk-comparison-flood-no-zone">
                    <span aria-hidden />
                    <Text fz={8.5} fw={800} c="var(--mantine-color-stone-7)">
                      区分なし
                    </Text>
                  </Box>
                ) : (
                  <ComparisonState item={item} />
                )}
              </Box>
              <Text className="risk-comparison-location" title={item.location || undefined}>
                {item.location || "地点を読込中"}
                {item.boundaryWarning ? <span aria-label="境界警告あり"> ▲</span> : null}
              </Text>
              <Text className="risk-comparison-value">
                {item.state === "value" ? value : item.state === "outOfArea" ? "区域外" : "\u00a0"}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function RankPlot({ items }: { items: ComparisonItem[] }) {
  const { other } = useMantineTheme();
  const ticks = [5, 4, 3, 2, 1];

  return (
    <Box className="risk-comparison-chart">
      <Box className="risk-comparison-axis" aria-hidden>
        {ticks.map((tick) => (
          <Text
            key={tick}
            component="span"
            className="risk-comparison-axis-label"
            style={{ bottom: `${rankPosition(tick)}%` }}
          >
            {tick}
          </Text>
        ))}
      </Box>
      <Box
        className="risk-comparison-columns"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map((item, index) => {
          const value = displayValue(item);
          const rank = item.state === "value" ? riskRank(value) : null;
          const color = rank ? other.risk.regionalRiskRank[rank] : undefined;
          return (
            <Box key={item.location || index} className="risk-comparison-column">
              <Box className="risk-comparison-plot-area">
                {rank ? (
                  <>
                    <Box
                      className="risk-comparison-rank-stem"
                      style={{ height: `${rankPosition(rank)}%`, background: color?.bg }}
                    />
                    <Box
                      className="risk-comparison-rank-dot"
                      style={{
                        bottom: `${rankPosition(rank)}%`,
                        background: color?.bg,
                        borderColor: color?.text,
                        color: color?.text,
                      }}
                    >
                      <span>{rank}</span>
                    </Box>
                  </>
                ) : (
                  <ComparisonState item={item} />
                )}
              </Box>
              <Text className="risk-comparison-location" title={item.location || undefined}>
                {item.location || "地点を読込中"}
                {item.boundaryWarning ? <span aria-label="境界警告あり"> ▲</span> : null}
              </Text>
              <Text className="risk-comparison-value">
                {item.state === "value" ? value : "\u00a0"}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const RiskComparison = defineComponent({
  name: "RiskComparison",
  description:
    "2〜3地点の同じ指標を、最大浸水深はメートル範囲、危険度ランクは1〜5の目盛りで視覚的に比較する。異なる指標を混ぜない。",
  props: z.object({
    indicator: z.enum(["最大浸水深", "東京都・地震時の総合危険度", "建物倒壊危険度", "火災危険度"]),
    items: z.array(comparisonItemSchema).min(2).max(3),
  }),
  component: ({ props }) => (
    <Paper withBorder radius="lg" p="sm" className="risk-comparison-card">
      <Group justify="space-between" align="baseline" gap="xs" wrap="nowrap">
        <Text fz={12.5} fw={900} c="var(--mantine-color-stone-9)">
          {props.indicator}
        </Text>
        <Text fz={9.5} fw={700} c="var(--mantine-color-stone-6)" flex="none">
          {props.indicator === "最大浸水深" ? "単位 m" : "ランク 1–5"}
        </Text>
      </Group>
      {props.indicator === "最大浸水深" ? (
        <FloodPlot items={props.items} />
      ) : (
        <RankPlot items={props.items} />
      )}
      <Text mt="xs" fz={9.5} lh={1.45} c="var(--mantine-color-stone-7)">
        {props.indicator === "最大浸水深"
          ? props.items.some((item) => item.state === "outOfArea")
            ? "帯は公表区分の範囲です。区域外は0mではなく、公開タイル上に浸水深区分がない状態です。"
            : "帯は公表された浸水深の範囲です。"
          : "上にあるほど公表ランクが高いことを示します。"}
      </Text>
    </Paper>
  ),
});

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
  if (indicator === "最大浸水深") {
    const category = floodCategory(value);
    if (category) return risk.floodDepth[category];
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
  RiskComparison.ref,
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
    RiskComparison,
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
    "2〜3地点の違いを尋ねられた場合は、地点ごとのRiskFactを並べず、同じ指標ごとにRiskComparisonを使う。",
    "RiskComparisonには同じindicatorの地点だけを2〜3件含め、入力のlocation、value、state、boundaryWarningを一字も変更せず渡す。",
    "最大浸水深と危険度ランクを同じRiskComparisonへ混ぜない。区域外、対象外、未公開、判定不能を数値0として扱わない。",
    "専用コンポーネントが回答を理解しやすくする場合だけAssistantSummary、RiskFact、AssistantNoteを使う。",
  ],
};
