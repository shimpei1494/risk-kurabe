import type { ComparisonLocation } from "../../domain/location";
import type { DataStateKind, InvestigationResult } from "../../domain/risk";

export const ASSISTANT_STARTERS = [
  "地点ごとの違いを説明して",
  "区域外や対象外の意味を教えて",
  "境界警告について説明して",
] as const;

function literal(value: string): string {
  return JSON.stringify(value);
}

const STATE_LABELS: Record<Exclude<DataStateKind, "value">, string> = {
  outOfArea: "区域外",
  unpublished: "未公開",
  notApplicable: "対象外",
  undetermined: "判定データなし",
};

function stateValue(state: DataStateKind, value?: string): string {
  return state === "value" ? (value ?? "値あり") : STATE_LABELS[state];
}

type Fact = {
  location: string;
  indicator: string;
  value: string;
  state: DataStateKind;
  boundaryWarning: boolean;
};

export type AssistantFact = Omit<Fact, "boundaryWarning"> & { boundaryWarning: boolean };

function factsFor(location: ComparisonLocation): Fact[] {
  const result = location.result;
  if (!result) return [];

  const facts: Fact[] = [
    {
      location: location.name,
      indicator: "最大浸水深",
      value: stateValue(
        result.maxFloodDepth.state,
        result.maxFloodDepth.sourceLabel ?? result.maxFloodDepth.category,
      ),
      state: result.maxFloodDepth.state,
      boundaryWarning: result.maxFloodDepth.boundaryWarning ?? false,
    },
    {
      location: location.name,
      indicator: "東京都・地震時の総合危険度",
      value: stateValue(
        result.tokyoEarthquakeRisk.state,
        result.tokyoEarthquakeRisk.rank ? `ランク${result.tokyoEarthquakeRisk.rank}／5` : undefined,
      ),
      state: result.tokyoEarthquakeRisk.state,
      boundaryWarning: result.tokyoEarthquakeRisk.boundaryWarning ?? false,
    },
  ];

  if (result.buildingCollapseRisk.state === "value") {
    facts.push({
      location: location.name,
      indicator: "建物倒壊危険度",
      value: `ランク${result.buildingCollapseRisk.rank}／5`,
      state: "value",
      boundaryWarning: result.buildingCollapseRisk.boundaryWarning ?? false,
    });
  }

  if (result.fireRisk.state === "value") {
    facts.push({
      location: location.name,
      indicator: "火災危険度",
      value: `ランク${result.fireRisk.rank}／5`,
      state: "value",
      boundaryWarning: result.fireRisk.boundaryWarning ?? false,
    });
  }

  return facts;
}

/**
 * AIへ渡す公開データの最小コンテキスト。住所・座標・出典URLは含めない。
 */
export function buildAssistantFacts(locations: readonly ComparisonLocation[]): AssistantFact[] {
  return locations.flatMap(factsFor);
}

function responseTitle(question: string, locationCount: number): string {
  if (/区域外|対象外|判定不能|データ/.test(question)) return "値がない状態を分けて読みます";
  if (/境界/.test(question)) return "ピン付近の変化を確認します";
  return locationCount === 1 ? "この地点の公表区分を整理します" : "同じ指標で地点差を整理します";
}

function responseBody(question: string, locationCount: number): string {
  if (/区域外|対象外|判定不能|データ/.test(question)) {
    return "区域外はデータが定めた区域の外、対象外は地域限定指標の適用外です。どちらも安全を意味しません。";
  }
  if (/境界/.test(question)) {
    return "境界警告は、ピンから25m以内に異なる判定があることを示します。主結果を周辺の最大値へ置き換えるものではありません。";
  }
  return locationCount === 1
    ? "現在表示されている公開データの区分と状態だけを、災害種別を混ぜずに並べます。"
    : "各地点を同じ公開指標で並べます。独自の総合点やおすすめ順位は作りません。";
}

function noteFor(question: string, hasBoundary: boolean): { kind: string; text: string } {
  if (/境界/.test(question) && hasBoundary) {
    return { kind: "boundary", text: "境界警告があります。" };
  }
  if (/境界/.test(question)) {
    return {
      kind: "information",
      text: "現在の結果には境界警告がありません。ただし、最終確認には自治体のハザードマップも利用してください。",
    };
  }
  if (/区域外|対象外|判定不能|データ/.test(question)) {
    return {
      kind: "warning",
      text: "値が表示されない理由は状態ごとに異なります。グレーの表示を低リスクと読み替えないでください。",
    };
  }
  return {
    kind: "information",
    text: "この説明は公開データの読み方を補助するもので、安全・危険や居住先を判定するものではありません。",
  };
}

export function buildDemoAssistantResponse(
  locations: readonly ComparisonLocation[],
  question: string,
): string {
  const facts = locations.flatMap(factsFor);
  const hasBoundary = facts.some((fact) => fact.boundaryWarning);
  const note = noteFor(question, hasBoundary);
  const references = [
    "summary",
    ...facts.map((_, index) => `fact${index + 1}`),
    "note",
    "evidence",
  ];
  const lines = [
    `root = AssistantCard([${references.join(", ")}])`,
    `summary = AssistantSummary("公開データの説明", ${literal(responseTitle(question, locations.length))}, ${literal(responseBody(question, locations.length))})`,
    ...facts.map(
      (fact, index) =>
        `fact${index + 1} = RiskFact(${literal(fact.location)}, ${literal(fact.indicator)}, ${literal(fact.value)}, ${literal(fact.state)})`,
    ),
    `note = AssistantNote(${literal(note.kind)}, ${literal(note.text)})`,
    `evidence = EvidenceFooter("画面に表示中の地点判定と出典情報だけを使った仮の説明です。住所と座標は含めていません。")`,
  ];
  return lines.join("\n");
}

export function assistantContextKey(locations: readonly ComparisonLocation[]): string {
  return locations
    .map((location) => {
      const result: InvestigationResult | undefined = location.result;
      return [
        location.id,
        result?.dataVersion ?? "",
        result?.logicVersion ?? "",
        result?.maxFloodDepth.state ?? "",
        result?.maxFloodDepth.category ?? "",
        result?.tokyoEarthquakeRisk.state ?? "",
        result?.tokyoEarthquakeRisk.rank ?? "",
      ].join(":");
    })
    .join("|");
}
