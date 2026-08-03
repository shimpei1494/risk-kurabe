import { Box, Group, Paper, Stack, Text, ThemeIcon, Tooltip, useMantineTheme } from "@mantine/core";
import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";

import { DataBadge } from "../../components/shared/DataBadge";
import { BoundaryWarningNote, InfoBanner } from "../../components/shared/InfoBlocks";
import { OfficialHazardMapLinksByOrder } from "../../components/shared/OfficialHazardMapLinks";
import type { DataStateKind, FloodDepthCategory, RegionalRiskRank } from "../../domain/risk";

const dataStateSchema = z.enum([
  "value",
  "uncolored",
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
                ) : item.state === "uncolored" ? (
                  <Box className="risk-comparison-flood-no-display">
                    <span aria-hidden />
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
                {item.state === "value"
                  ? value
                  : item.state === "uncolored"
                    ? "浸水深表示なし"
                    : "\u00a0"}
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
        <Group gap="4xs" wrap="nowrap">
          <Text fz={12.5} fw={900} c="var(--mantine-color-stone-9)">
            {props.indicator}
          </Text>
          {props.indicator === "最大浸水深" ? (
            <Tooltip
              label="「浸水深表示なし」は取得成功時の着色区分なしです。0m付近に置きますが、浸水しない・安全を意味しません。"
              multiline
              w={250}
              withArrow
            >
              <ThemeIcon variant="light" radius="xl" size={16} fz={10} aria-label="表示の補足">
                i
              </ThemeIcon>
            </Tooltip>
          ) : null}
        </Group>
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
          ? "帯は公表された浸水深の範囲です。"
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

const HazardMapLinks = defineComponent({
  name: "HazardMapLinks",
  description:
    "表示中の地点を国土地理院の重ねるハザードマップで開く。浸水・内水・土砂災害・高潮・津波などの詳細確認用で、東京都の地震地域危険度の確認には使わない。",
  props: z.object({
    locations: z
      .array(z.union([z.literal(1), z.literal(2), z.literal(3)]))
      .min(1)
      .max(3),
  }),
  component: ({ props }) => <OfficialHazardMapLinksByOrder orders={props.locations} />,
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
  HazardMapLinks.ref,
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
    HazardMapLinks,
    EvidenceFooter,
  ],
});

export const riskAssistantPromptOptions = {
  preamble:
    "あなたは公開GISデータの読み方を説明する補助者です。安全性の判定、居住推奨、独自順位、異なる災害種別の重み付けは行いません。",
  additionalRules: [
    "指標の意味やランクの読み方を尋ねられたら、定義だけを繰り返さず、次の公開データの基礎知識から利用者の質問に直接答える。必要な部分だけを短く使い、入力にない地点の値や個別の被害予測は作らない。",
    "洪水の『最大浸水深』は、想定し得る最大規模の降雨で河川が氾濫した場合の浸水深を、国土交通省・国土地理院の公開区分（0.5m未満、0.5〜3m、3〜5m、5〜10m、10〜20m、20m以上）で示すもの。実測値、個別の建物・敷地の浸水深、将来必ず起きる水深ではなく、表示区分の範囲として説明する。",
    "東京都の地域危険度は、第9回調査（2022年9月公表）に基づく、都内5,192町丁目の相対評価。総合危険度・建物倒壊危険度・火災危険度のランク1〜5は、被災確率や『何割危険』ではなく、危険量の順位を構成比で5段階に分けたもの。ランクの数字は大きいほど、東京都内で比較した危険量が高い。東京都外の『対象外』は最低ランクではない。",
    "ランクの目安を聞かれたら、第9回調査の順位帯として、ランク5は1〜85位（上位約1.6%）、ランク4は86〜373位（次の約5.6%）、ランク3は374〜1,195位（上位約7〜23%）、ランク2は1,196〜2,848位、ランク1は2,849〜5,192位と説明できる。ただし、ランク3の危険量の境目は、建物倒壊・火災・総合の指標ごとに異なる。『ランク3＝被害が3/5の確率』『必ず危険』とは説明しない。『かなり危険？』には、5段階の真ん中だが都内順位では上位約7〜23%の比較的高いグループ、と直接答えたうえで、絶対的な被害確率ではないと添える。",
    "『建物倒壊危険度』は、地盤特性・建物量・建物特性から、地震による面積当たりの建物全壊棟数（危険量）を評価したもの。『火災危険度』は、地震時の出火と延焼の危険性から、面積当たりの建物全焼棟数（危険量）を評価したもの。どちらも個別の建物が倒壊・焼失する確率や診断結果ではない。",
    "『東京都・地震時の総合危険度』は、建物倒壊危険量と火災危険量を合算し、道路等の整備状況による災害時活動困難係数を掛けた、地震に関する東京都内の相対指標。洪水・土砂災害・高潮・津波を含む、災害全般の総合点ではない。",
    "ランクについて不安を感じている質問には、まず結論を平易に答え、次に『都内の町丁目同士の比較』『確率ではない』『個別の建物・敷地の診断ではない』という限界を必要な範囲で説明する。利用者を突き放す言い方や、ランクだけで居住可否を断定する言い方は避ける。",
    "必ずAssistantCardをルートにし、1列の読み取り専用UIを作る。",
    "入力に含まれる公表値、データ状態、境界警告だけを説明する。",
    "浸水深表示なし、区域外、対象外、未公開、判定不能を安全と表現しない。",
    "uncolored（浸水深表示なし）は公表レイヤーを正常取得したが、その地点に着色された浸水深区分がない状態。比較UIでは0m付近に置くが、0m、浸水しない、安全とは説明しない。着色地点より公表表示上は低い、と説明できる。",
    "undeterminedは取得・判定失敗であり、uncoloredと混同しない。",
    "住所、座標、任意URL、入力にない数値や原因を生成しない。",
    "利用者がハザードマップ、浸水・内水・土砂災害・高潮・津波の詳しい情報や公式地図を求めた場合はHazardMapLinksを使える。locationsには入力に存在する地点番号だけを含める。URLや座標は生成しない。",
    "HazardMapLinksは東京都の地震地域危険度、建物倒壊危険度、火災危険度の詳細確認としては使わない。重ねるハザードマップが別系統の災害情報であることを説明する。",
    "挨拶、機能範囲の確認、公開データと無関係な質問では、表示中の地点結果を繰り返さずAssistantTextで短く自然に答える。",
    "2〜3地点の違いを尋ねられた場合は、地点ごとのRiskFactを並べず、同じ指標ごとにRiskComparisonを使う。",
    "RiskComparisonには同じindicatorの地点だけを2〜3件含め、入力のlocation、value、state、boundaryWarningを一字も変更せず渡す。",
    "最大浸水深と危険度ランクを同じRiskComparisonへ混ぜない。uncoloredは0m付近へ表示できるが数値0とは断定しない。区域外、対象外、未公開、判定不能を数値0として扱わない。",
    "専用コンポーネントが回答を理解しやすくする場合だけAssistantSummary、RiskFact、AssistantNoteを使う。",
  ],
};
