import type { GeoPoint } from "../gis/geometry";
import type {
  EvaluatedTokyoRegionalRisk,
  TokyoBoundaryWarnings,
} from "../gis/tokyo-risk-evaluator";
import type { EvaluatedFloodResult, EvaluatedFrequencyFloodResult } from "./flood-evaluator";
import type { RiskDataSourceInfo } from "./risk";

export interface FloodIndicatorInvestigation {
  result: EvaluatedFloodResult;
  boundaryWarning: boolean;
}

export interface FrequencyFloodInvestigation {
  rainfallDenominator: number;
  result: EvaluatedFrequencyFloodResult;
  boundaryWarning: boolean;
}

export interface TokyoRegionalRiskInvestigation {
  result: EvaluatedTokyoRegionalRisk;
  boundaryWarnings: TokyoBoundaryWarnings;
}

export type InvestigationIssueCode =
  | "a31a-artifact-unavailable"
  | "a53-artifact-unavailable"
  | "tokyo-regional-risk-artifact-unavailable";

export interface InvestigationIssue {
  code: InvestigationIssueCode;
  rainfallDenominator?: number;
}

/**
 * UI用に丸める前の、出典ラベル・全根拠・境界警告を保持した地点判定結果。
 */
export interface EvidenceBasedInvestigationResult {
  kind: "completed";
  location: GeoPoint;
  prefectureCode: string;
  dataVersion: string;
  logicVersion: string;
  sources: readonly RiskDataSourceInfo[];
  maximumFlood: FloodIndicatorInvestigation;
  frequencyFloods: readonly FrequencyFloodInvestigation[];
  tokyoRegionalRisk: TokyoRegionalRiskInvestigation;
  /** 部分失敗。成功した指標はそのまま表示・利用できる。 */
  issues: readonly InvestigationIssue[];
}

export interface FailedEvidenceBasedInvestigation {
  kind: "failed";
  location: GeoPoint;
  prefectureCode: string;
  errorCode: "catalog-unavailable";
}

export type EvidenceBasedInvestigation =
  | EvidenceBasedInvestigationResult
  | FailedEvidenceBasedInvestigation;
