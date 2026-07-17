import type { EvaluatedFrequencyFloodResult, NormalizedFloodDepth } from "./flood-evaluator";
import type { EvidenceBasedInvestigationResult } from "./investigation";
import type {
  DataStateKind,
  FloodDepthCategory,
  FloodFrequencyResult,
  InvestigationResult,
  RainfallDenominator,
} from "./risk";

export const KANTO_PREFECTURE_CODES = new Set(["08", "09", "10", "11", "12", "13", "14"]);

function floodCategory(depth: NormalizedFloodDepth): FloodDepthCategory {
  if (depth.maxMeters === null) return "5m以上";
  if (depth.maxMeters <= 0.5) return "0.5m未満";
  if (depth.maxMeters <= 3) return "0.5〜3m";
  if (depth.maxMeters <= 5) return "3〜5m";
  return "5m以上";
}

function evidences(result: {
  evidences: readonly {
    riverOrBasinName: string;
    depth: NormalizedFloodDepth;
  }[];
}) {
  return result.evidences.map(({ riverOrBasinName, depth }) => ({
    riverOrBasinName,
    category: depth.sourceLabel,
  }));
}

function summarizedFrequencyState(
  results: readonly EvaluatedFrequencyFloodResult[],
): DataStateKind {
  if (results.some(({ state }) => state === "undetermined")) return "undetermined";
  if (results.some(({ state }) => state === "outOfArea")) return "outOfArea";
  if (results.some(({ state }) => state === "unpublished")) return "unpublished";
  return "undetermined";
}

function frequencyResult(investigation: EvidenceBasedInvestigationResult): FloodFrequencyResult {
  const firstValue = investigation.frequencyFloods.find(({ result }) => result.state === "value");
  const periods = investigation.frequencyFloods.map(
    ({ rainfallDenominator, result, boundaryWarning }) => ({
      rainfallDenominator: rainfallDenominator as RainfallDenominator,
      state: result.state,
      category: result.primary ? floodCategory(result.primary.depth) : undefined,
      sourceLabel: result.primary?.depth.sourceLabel,
      evidences: evidences(result),
      boundaryWarning,
    }),
  );
  if (firstValue?.result.primary) {
    return {
      state: "value",
      frequencyLabel: `${firstValue.rainfallDenominator}年に1回程度`,
      category: floodCategory(firstValue.result.primary.depth),
      sourceLabel: firstValue.result.primary.depth.sourceLabel,
      evidences: evidences(firstValue.result),
      boundaryWarning: firstValue.boundaryWarning,
      periods,
    };
  }

  return {
    state: summarizedFrequencyState(investigation.frequencyFloods.map(({ result }) => result)),
    boundaryWarning: investigation.frequencyFloods.some(({ boundaryWarning }) => boundaryWarning),
    periods,
  };
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
      evidences: evidences(maximum.result),
      boundaryWarning: maximum.boundaryWarning,
    },
    floodFrequency: frequencyResult(investigation),
    buildingCollapseRisk: {
      state: tokyo.result.state,
      rank: tokyoPrimary?.building_collapse_rank,
      boundaryWarning: tokyo.boundaryWarnings.buildingCollapse,
      municipalityName: tokyoPrimary?.municipality_name,
      townName: tokyoPrimary?.town_name,
    },
    fireRisk: {
      state: tokyo.result.state,
      rank: tokyoPrimary?.fire_rank,
      boundaryWarning: tokyo.boundaryWarnings.fire,
      municipalityName: tokyoPrimary?.municipality_name,
      townName: tokyoPrimary?.town_name,
    },
    aiSummary: "",
  };
}

export function outsideKantoResult(): InvestigationResult {
  return {
    maxFloodDepth: { state: "notApplicable" },
    floodFrequency: { state: "notApplicable", periods: [] },
    buildingCollapseRisk: { state: "notApplicable" },
    fireRisk: { state: "notApplicable" },
    aiSummary: "",
  };
}

export function failedInvestigationResult(): InvestigationResult {
  return {
    maxFloodDepth: { state: "undetermined" },
    floodFrequency: { state: "undetermined", periods: [] },
    buildingCollapseRisk: { state: "undetermined" },
    fireRisk: { state: "undetermined" },
    aiSummary: "",
  };
}
