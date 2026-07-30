/**
 * データ状態と各リスク指標の型。用語は docs/CONTEXT.md の定義に合わせる。
 */

export type DataStateKind =
  | "value" // 値あり
  | "outOfArea" // 区域外
  | "unpublished" // 未公開
  | "notApplicable" // 対象外
  | "undetermined"; // 判定不能

export type FloodDepthCategory = "0.5m未満" | "0.5〜3m" | "3〜5m" | "5m以上";

export type RegionalRiskRank = 1 | 2 | 3 | 4 | 5;

export type InvestigationProblemCode =
  | "catalog-unavailable"
  | "a31a-artifact-unavailable"
  | "a53-artifact-unavailable"
  | "tokyo-regional-risk-artifact-unavailable";

export interface InvestigationProblem {
  code: InvestigationProblemCode;
  rainfallDenominator?: RainfallDenominator;
}

export interface RiskDataSourceInfo {
  id: string;
  name: string;
  provider: string;
  referencePeriod: string;
  acquiredAt: string;
  license: string;
  sourceUrl: string;
}

export interface FloodDepthEvidence {
  riverOrBasinName: string;
  /** 公開元の区分名をそのまま表示する。 */
  category: string;
}

export interface MaxFloodDepthResult {
  state: DataStateKind;
  category?: FloodDepthCategory;
  sourceLabel?: string;
  /** 重複判定: 複数河川が該当した場合の全根拠 */
  evidences?: FloodDepthEvidence[];
  boundaryWarning?: boolean;
}

export interface FloodFrequencyResult {
  state: DataStateKind;
  /** 例: "30年に1回程度から" */
  frequencyLabel?: string;
  category?: FloodDepthCategory;
  sourceLabel?: string;
  evidences?: FloodDepthEvidence[];
  boundaryWarning?: boolean;
  /** 降雨規模ごとの判定。比較表示と地図はこの同じ値を参照する。 */
  periods: readonly FloodFrequencyPeriodResult[];
}

export interface FloodFrequencyPeriodResult {
  rainfallDenominator: RainfallDenominator;
  state: DataStateKind;
  category?: FloodDepthCategory;
  sourceLabel?: string;
  evidences?: FloodDepthEvidence[];
  boundaryWarning?: boolean;
}

export const RAINFALL_DENOMINATORS = [10, 30, 50, 100, 150, 200] as const;
export type RainfallDenominator = (typeof RAINFALL_DENOMINATORS)[number];

export interface RegionalRiskResult {
  state: DataStateKind;
  rank?: RegionalRiskRank;
  score?: number;
  order?: number;
  boundaryWarning?: boolean;
  municipalityName?: string;
  townName?: string;
}

export interface TokyoEarthquakeRiskResult extends RegionalRiskResult {
  activityDifficulty?: number;
  groundClassification?: string;
}

export interface InvestigationResult {
  maxFloodDepth: MaxFloodDepthResult;
  floodFrequency: FloodFrequencyResult;
  tokyoEarthquakeRisk: TokyoEarthquakeRiskResult;
  buildingCollapseRisk: RegionalRiskResult;
  fireRisk: RegionalRiskResult;
  dataVersion?: string;
  logicVersion?: string;
  problems: readonly InvestigationProblem[];
  sources: readonly RiskDataSourceInfo[];
  /** AIによる公開データの要約（評価ではない） */
  aiSummary: string;
}

export function floodFrequencyAt(
  result: FloodFrequencyResult,
  rainfallDenominator: RainfallDenominator,
): FloodFrequencyPeriodResult {
  return (
    result.periods.find((period) => period.rainfallDenominator === rainfallDenominator) ?? {
      rainfallDenominator,
      state: result.state,
      category: result.category,
      sourceLabel: result.sourceLabel,
      evidences: result.evidences,
      boundaryWarning: result.boundaryWarning,
    }
  );
}
