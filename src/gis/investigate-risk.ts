import {
  evaluateFrequencyFloodMatches,
  type BasinCoverage,
  type FloodCoverageStatus,
} from "../domain/flood-evaluator";
import type {
  EvidenceBasedInvestigation,
  FrequencyFloodInvestigation,
  InvestigationIssue,
} from "../domain/investigation";
import { evaluateA31aAtPoint, hasA31aBoundaryWarning, type A31aFeature } from "./a31a-evaluator";
import { evaluateA53AtPoint, hasA53BoundaryWarning, type A53Feature } from "./a53-evaluator";
import {
  fetchA31aCandidates,
  fetchA53Candidates,
  fetchTokyoRegionalRiskCandidates,
} from "./flatgeobuf-source";
import type { GeoPoint } from "./geometry";
import {
  a31aArtifactUrl,
  a53ArtifactUrl,
  loadRiskDataCatalog,
  tokyoRegionalRiskArtifactUrl,
  type RiskDataCoverage,
  type RiskDataManifest,
} from "./manifest";
import {
  evaluateTokyoRegionalRiskAtPoint,
  tokyoBoundaryWarnings,
  type TokyoRegionalRiskFeature,
} from "./tokyo-risk-evaluator";

export interface InvestigationDependencies {
  loadCatalog: (
    baseUrl: string,
    signal?: AbortSignal,
  ) => Promise<{ manifest: RiskDataManifest; coverage: RiskDataCoverage }>;
  fetchA31aCandidates: (options: {
    url: string;
    location: GeoPoint;
    radiusMeters?: number;
  }) => Promise<readonly A31aFeature[]>;
  fetchA53Candidates: (options: {
    url: string;
    location: GeoPoint;
    radiusMeters?: number;
  }) => Promise<readonly A53Feature[]>;
  fetchTokyoCandidates: (options: {
    url: string;
    location: GeoPoint;
    radiusMeters?: number;
  }) => Promise<readonly TokyoRegionalRiskFeature[]>;
}

const defaultDependencies: InvestigationDependencies = {
  loadCatalog: loadRiskDataCatalog,
  fetchA31aCandidates,
  fetchA53Candidates,
  fetchTokyoCandidates: fetchTokyoRegionalRiskCandidates,
};

function coverageForA53Period(
  coverage: RiskDataCoverage,
  basinIds: readonly string[],
  rainfallDenominator: number,
): BasinCoverage[] {
  return basinIds.map((riverOrBasinId) => ({
    riverOrBasinId,
    status:
      coverage.a53?.basins[riverOrBasinId]?.returnPeriods[String(rainfallDenominator)]?.status ??
      "unknown",
  }));
}

function a53ReturnPeriods(manifest: RiskDataManifest): number[] {
  const returnPeriods: number[] = [];
  const seenReturnPeriods = new Set<number>();
  for (const dataset of manifest.datasets) {
    if (
      dataset.indicator === "a53-frequency-flood-depth" &&
      !seenReturnPeriods.has(dataset.rainfallDenominator)
    ) {
      returnPeriods.push(dataset.rainfallDenominator);
      seenReturnPeriods.add(dataset.rainfallDenominator);
    }
  }
  return returnPeriods.sort((a, b) => a - b);
}

async function investigateFrequencyPeriod({
  baseUrl,
  manifest,
  coverage,
  rainfallDenominator,
  location,
  radiusMeters,
  a31aMatches,
  dependencies,
}: {
  baseUrl: string;
  manifest: RiskDataManifest;
  coverage: RiskDataCoverage;
  rainfallDenominator: number;
  location: GeoPoint;
  radiusMeters: number;
  a31aMatches: ReturnType<typeof evaluateA31aAtPoint>["evidences"];
  dependencies: InvestigationDependencies;
}): Promise<{
  investigation: FrequencyFloodInvestigation;
  issue?: InvestigationIssue;
}> {
  const basinIds = [...new Set(a31aMatches.map(({ riverOrBasinId }) => riverOrBasinId))];
  const basinCoverage = coverageForA53Period(coverage, basinIds, rainfallDenominator);
  const hasAvailableBasin = basinCoverage.some(({ status }) => status === "available");

  if (!hasAvailableBasin) {
    return {
      investigation: {
        rainfallDenominator,
        result: evaluateFrequencyFloodMatches({
          a31aMatches,
          a53Matches: [],
          basinCoverage,
        }),
        boundaryWarning: false,
      },
    };
  }

  const url = a53ArtifactUrl({ baseUrl, manifest, rainfallDenominator });
  if (!url) {
    const failedCoverage = basinCoverage.map((item) =>
      item.status === "available" ? { ...item, status: "failed" as const } : item,
    );
    return {
      investigation: {
        rainfallDenominator,
        result: evaluateFrequencyFloodMatches({
          a31aMatches,
          a53Matches: [],
          basinCoverage: failedCoverage,
        }),
        boundaryWarning: false,
      },
      issue: { code: "a53-artifact-unavailable", rainfallDenominator },
    };
  }

  let candidates: readonly A53Feature[];
  try {
    candidates = await dependencies.fetchA53Candidates({ url, location, radiusMeters });
  } catch {
    const failedCoverage = basinCoverage.map((item) =>
      item.status === "available" ? { ...item, status: "failed" as const } : item,
    );
    return {
      investigation: {
        rainfallDenominator,
        result: evaluateFrequencyFloodMatches({
          a31aMatches,
          a53Matches: [],
          basinCoverage: failedCoverage,
        }),
        boundaryWarning: false,
      },
      issue: { code: "a53-artifact-unavailable", rainfallDenominator },
    };
  }

  return {
    investigation: {
      rainfallDenominator,
      result: evaluateA53AtPoint({ location, candidates, a31aMatches, basinCoverage }),
      boundaryWarning: hasA53BoundaryWarning({
        location,
        candidates,
        a31aMatches,
        basinCoverage,
        radiusMeters,
      }),
    },
  };
}

/**
 * カタログを一度だけ読み、A31aの一致水系を起点としてA53を必要な期間だけ取得する。
 * 各成果物の一時失敗は他指標を巻き込まず、issuesと判定不能結果として返す。
 */
export async function investigateRisk({
  baseUrl,
  prefectureCode,
  location,
  radiusMeters = 25,
  signal,
  dependencies = defaultDependencies,
}: {
  baseUrl: string;
  prefectureCode: string;
  location: GeoPoint;
  radiusMeters?: number;
  signal?: AbortSignal;
  dependencies?: InvestigationDependencies;
}): Promise<EvidenceBasedInvestigation> {
  let catalog: { manifest: RiskDataManifest; coverage: RiskDataCoverage };
  try {
    catalog = await dependencies.loadCatalog(baseUrl, signal);
  } catch {
    return { kind: "failed", location, prefectureCode, errorCode: "catalog-unavailable" };
  }

  const issues: InvestigationIssue[] = [];
  const prefectureCoverage = catalog.coverage.a31a.prefectures[prefectureCode];
  let a31aCoverage: FloodCoverageStatus = prefectureCoverage?.status ?? "unknown";
  let a31aCandidates: readonly A31aFeature[] = [];
  const a31aUrl = a31aArtifactUrl({
    baseUrl,
    manifest: catalog.manifest,
    prefectureCode,
  });

  if (a31aCoverage === "available" || a31aCoverage === "partial") {
    if (a31aUrl) {
      try {
        a31aCandidates = await dependencies.fetchA31aCandidates({
          url: a31aUrl,
          location,
          radiusMeters,
        });
      } catch {
        a31aCoverage = "failed";
        issues.push({ code: "a31a-artifact-unavailable" });
      }
    } else {
      a31aCoverage = "failed";
      issues.push({ code: "a31a-artifact-unavailable" });
    }
  }

  const a31aResult = evaluateA31aAtPoint(location, a31aCandidates, a31aCoverage);
  const maximumFlood = {
    result: a31aResult,
    boundaryWarning:
      a31aCoverage === "available" || a31aCoverage === "partial"
        ? hasA31aBoundaryWarning(location, a31aCandidates, a31aCoverage, radiusMeters)
        : false,
  };

  const frequencyResults = await Promise.all(
    a53ReturnPeriods(catalog.manifest).map((rainfallDenominator) =>
      investigateFrequencyPeriod({
        baseUrl,
        manifest: catalog.manifest,
        coverage: catalog.coverage,
        rainfallDenominator,
        location,
        radiusMeters,
        a31aMatches: a31aResult.evidences,
        dependencies,
      }),
    ),
  );
  const frequencyFloods = frequencyResults.map(({ investigation }) => investigation);
  for (const { issue } of frequencyResults) {
    if (issue) issues.push(issue);
  }

  const isTokyo = prefectureCode === "13";
  const tokyoCoverage = catalog.coverage.tokyoRegionalRisk?.status ?? "unknown";
  let tokyoCandidates: readonly TokyoRegionalRiskFeature[] = [];
  let effectiveTokyoCoverage = tokyoCoverage;
  if (isTokyo && (tokyoCoverage === "available" || tokyoCoverage === "partial")) {
    const url = tokyoRegionalRiskArtifactUrl({ baseUrl, manifest: catalog.manifest });
    if (url) {
      try {
        tokyoCandidates = await dependencies.fetchTokyoCandidates({
          url,
          location,
          radiusMeters,
        });
      } catch {
        effectiveTokyoCoverage = "failed";
        issues.push({ code: "tokyo-regional-risk-artifact-unavailable" });
      }
    } else {
      effectiveTokyoCoverage = "failed";
      issues.push({ code: "tokyo-regional-risk-artifact-unavailable" });
    }
  }

  const tokyoResult = evaluateTokyoRegionalRiskAtPoint({
    location,
    candidates: tokyoCandidates,
    coverageStatus: effectiveTokyoCoverage,
    isTokyo,
  });
  const boundaryWarnings =
    isTokyo && (effectiveTokyoCoverage === "available" || effectiveTokyoCoverage === "partial")
      ? tokyoBoundaryWarnings({
          location,
          candidates: tokyoCandidates,
          coverageStatus: effectiveTokyoCoverage,
          radiusMeters,
        })
      : { buildingCollapse: false, fire: false };

  return {
    kind: "completed",
    location,
    prefectureCode,
    dataVersion: catalog.manifest.dataVersion,
    logicVersion: catalog.manifest.logicVersion,
    maximumFlood,
    frequencyFloods,
    tokyoRegionalRisk: { result: tokyoResult, boundaryWarnings },
    issues,
  };
}
