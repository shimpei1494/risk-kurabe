/**
 * データ状態と各リスク指標の型。用語は docs/CONTEXT.md の定義に合わせる。
 */

export type DataStateKind =
  | "value" // 値あり
  | "uncolored" // 取得成功・公表レイヤー上に着色区分なし
  | "outOfArea" // 区域外
  | "unpublished" // 未公開
  | "notApplicable" // 対象外
  | "undetermined"; // 判定不能

export type FloodDepthCategory =
  | "0.5m未満"
  | "0.5〜3m"
  | "3〜5m"
  | "5〜10m"
  | "10〜20m"
  | "20m以上";

export type RegionalRiskRank = 1 | 2 | 3 | 4 | 5;

export type InvestigationProblemCode =
  | "catalog-unavailable"
  | "official-flood-tile-unavailable"
  | "tokyo-regional-risk-artifact-unavailable";

export interface InvestigationProblem {
  code: InvestigationProblemCode;
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

export interface MaxFloodDepthResult {
  state: DataStateKind;
  category?: FloodDepthCategory;
  sourceLabel?: string;
  boundaryWarning?: boolean;
}

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
