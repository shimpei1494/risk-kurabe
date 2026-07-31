import type { NormalizedFloodDepth } from "./flood-evaluator";
import type { EvidenceBasedInvestigationResult } from "./investigation";
import type { FloodDepthCategory, InvestigationResult } from "./risk";

export const KANTO_PREFECTURE_CODES = new Set(["08", "09", "10", "11", "12", "13", "14"]);

function floodCategory(depth: NormalizedFloodDepth): FloodDepthCategory {
  if (depth.maxMeters === null) return "5m以上";
  if (depth.maxMeters <= 0.5) return "0.5m未満";
  if (depth.maxMeters <= 3) return "0.5〜3m";
  if (depth.maxMeters <= 5) return "3〜5m";
  return "5m以上";
}

export function toUiInvestigationResult(
  investigation: EvidenceBasedInvestigationResult,
): InvestigationResult {
  const maximum = investigation.maximumFlood;
  const maximumPrimary = maximum.result.primary;
  const tokyo = investigation.tokyoRegionalRisk;
  const tokyoPrimary = tokyo.result.primary;

  return {
    maxFloodDepth: {
      state: maximum.result.state,
      category: maximumPrimary ? floodCategory(maximumPrimary.depth) : undefined,
      sourceLabel: maximumPrimary?.depth.sourceLabel,
      boundaryWarning: maximum.boundaryWarning,
    },
    tokyoEarthquakeRisk: {
      state: tokyo.result.state,
      rank: tokyoPrimary?.overall_rank,
      score: tokyoPrimary?.overall_score,
      order: tokyoPrimary?.overall_order,
      activityDifficulty: tokyoPrimary?.activity_difficulty,
      groundClassification: tokyoPrimary?.ground_classification,
      boundaryWarning: tokyo.boundaryWarnings.overall,
      municipalityName: tokyoPrimary?.municipality_name,
      townName: tokyoPrimary?.town_name,
    },
    buildingCollapseRisk: {
      state: tokyo.result.state,
      rank: tokyoPrimary?.building_collapse_rank,
      score: tokyoPrimary?.building_collapse_score,
      order: tokyoPrimary?.building_collapse_order,
      boundaryWarning: tokyo.boundaryWarnings.buildingCollapse,
      municipalityName: tokyoPrimary?.municipality_name,
      townName: tokyoPrimary?.town_name,
    },
    fireRisk: {
      state: tokyo.result.state,
      rank: tokyoPrimary?.fire_rank,
      score: tokyoPrimary?.fire_score,
      order: tokyoPrimary?.fire_order,
      boundaryWarning: tokyo.boundaryWarnings.fire,
      municipalityName: tokyoPrimary?.municipality_name,
      townName: tokyoPrimary?.town_name,
    },
    dataVersion: investigation.dataVersion,
    logicVersion: investigation.logicVersion,
    problems: investigation.issues,
    sources: investigation.sources,
    aiSummary: "",
  };
}

export function outsideKantoResult(): InvestigationResult {
  return {
    maxFloodDepth: { state: "notApplicable" },
    tokyoEarthquakeRisk: { state: "notApplicable" },
    buildingCollapseRisk: { state: "notApplicable" },
    fireRisk: { state: "notApplicable" },
    problems: [],
    sources: [],
    aiSummary: "",
  };
}

export function failedInvestigationResult(): InvestigationResult {
  return {
    maxFloodDepth: { state: "undetermined" },
    tokyoEarthquakeRisk: { state: "undetermined" },
    buildingCollapseRisk: { state: "undetermined" },
    fireRisk: { state: "undetermined" },
    problems: [{ code: "catalog-unavailable" }],
    sources: [],
    aiSummary: "",
  };
}
