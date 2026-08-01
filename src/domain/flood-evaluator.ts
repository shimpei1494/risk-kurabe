import type { DataStateKind } from "./risk";

/**
 * 元データの浸水深区分。中央値などの推定値は作らず、表示には sourceLabel を使う。
 * maxMeters が null の区分は上限なしとして扱う。
 */
export interface NormalizedFloodDepth {
  sourceCode: string;
  sourceLabel: string;
  minMeters: number;
  maxMeters: number | null;
}

export interface FloodPolygonMatch {
  datasetId: string;
  featureId: string;
  riverOrBasinId: string;
  riverOrBasinName: string;
  depth: NormalizedFloodDepth;
}

export type FloodCoverageStatus = "available" | "partial" | "unpublished" | "failed" | "unknown";

export interface EvaluatedFloodResult {
  state: Extract<
    DataStateKind,
    "value" | "uncolored" | "outOfArea" | "unpublished" | "undetermined"
  >;
  primary?: FloodPolygonMatch;
  /** 主結果以外も含む、地点に一致した全地物。表示順も決定的に固定する。 */
  evidences: readonly FloodPolygonMatch[];
}

function comparableMaxMeters(depth: NormalizedFloodDepth): number {
  return depth.maxMeters ?? Number.POSITIVE_INFINITY;
}

function sortedCopy<T>(values: readonly T[], compare: (a: T, b: T) => number): T[] {
  // ES2022を対象にしているため、ES2023のArray.prototype.toSortedは使用しない。
  // oxlint-disable-next-line react-doctor/js-tosorted-immutable
  return [...values].sort(compare);
}

/**
 * ADR-0021の順序:
 * 1. 上限が大きい区分
 * 2. 下限が大きい区分
 * 3. datasetId
 * 4. featureId
 */
function compareFloodMatches(a: FloodPolygonMatch, b: FloodPolygonMatch): number {
  const maxDifference = comparableMaxMeters(b.depth) - comparableMaxMeters(a.depth);
  if (Number.isFinite(maxDifference) && maxDifference !== 0) return maxDifference;

  const minDifference = b.depth.minMeters - a.depth.minMeters;
  if (minDifference !== 0) return minDifference;

  const datasetDifference = a.datasetId.localeCompare(b.datasetId);
  if (datasetDifference !== 0) return datasetDifference;

  return a.featureId.localeCompare(b.featureId);
}

export function selectMaxFloodMatch(
  matches: readonly FloodPolygonMatch[],
): FloodPolygonMatch | undefined {
  let selected: FloodPolygonMatch | undefined;
  for (const match of matches) {
    if (!selected || compareFloodMatches(match, selected) < 0) selected = match;
  }
  return selected;
}

/**
 * ポリゴン未一致だけでは「区域外」にしない。
 * 収録済みカバレッジを確認できた場合だけ区域外にする。
 */
export function evaluateFloodMatches(
  matches: readonly FloodPolygonMatch[],
  coverageStatus: FloodCoverageStatus,
): EvaluatedFloodResult {
  const evidences = sortedCopy(matches, compareFloodMatches);
  const primary = evidences[0];

  if (primary) {
    return { state: "value", primary, evidences };
  }

  const stateByCoverage = {
    available: "outOfArea",
    failed: "undetermined",
    partial: "undetermined",
    unknown: "undetermined",
    unpublished: "unpublished",
  } as const satisfies Record<FloodCoverageStatus, EvaluatedFloodResult["state"]>;

  return {
    state: stateByCoverage[coverageStatus],
    evidences,
  };
}
