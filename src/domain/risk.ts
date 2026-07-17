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

export interface FloodDepthEvidence {
  riverOrBasinName: string;
  category: FloodDepthCategory;
}

export interface MaxFloodDepthResult {
  state: DataStateKind;
  category?: FloodDepthCategory;
  /** 重複判定: 複数河川が該当した場合の全根拠 */
  evidences?: FloodDepthEvidence[];
  boundaryWarning?: boolean;
}

export interface FloodFrequencyResult {
  state: DataStateKind;
  /** 例: "30年に1回程度から" */
  frequencyLabel?: string;
  category?: FloodDepthCategory;
}

export interface RegionalRiskResult {
  state: DataStateKind;
  rank?: RegionalRiskRank;
}

export interface InvestigationResult {
  maxFloodDepth: MaxFloodDepthResult;
  floodFrequency: FloodFrequencyResult;
  buildingCollapseRisk: RegionalRiskResult;
  fireRisk: RegionalRiskResult;
  /** AIによる公開データの要約（評価ではない） */
  aiSummary: string;
}
