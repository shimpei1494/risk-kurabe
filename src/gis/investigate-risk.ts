import type { FloodCoverageStatus } from "../domain/flood-evaluator";
import type { EvidenceBasedInvestigation, InvestigationIssue } from "../domain/investigation";
import { INVESTIGATION_LOGIC_VERSION } from "../domain/investigation";
import type { RiskDataSourceInfo } from "../domain/risk";
import { evaluateA31aAtPoint, hasA31aBoundaryWarning, type A31aFeature } from "./a31a-evaluator";
import { fetchA31aCandidates, fetchTokyoRegionalRiskCandidates } from "./flatgeobuf-source";
import type { GeoPoint } from "./geometry";
import {
  a31aArtifactUrl,
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
  fetchTokyoCandidates: (options: {
    url: string;
    location: GeoPoint;
    radiusMeters?: number;
  }) => Promise<readonly TokyoRegionalRiskFeature[]>;
}

const defaultDependencies: InvestigationDependencies = {
  loadCatalog: loadRiskDataCatalog,
  fetchA31aCandidates,
  fetchTokyoCandidates: fetchTokyoRegionalRiskCandidates,
};

/**
 * カタログを一度だけ読み、A31aと東京都地域危険度を地点ごとに取得する。
 * 各成果物の一時失敗は他指標を巻き込まず、issuesと判定不能結果として返す。
 */
export async function investigateRisk({
  baseUrl,
  prefectureCode,
  location,
  radiusMeters = 25,
  signal,
  dependencies = defaultDependencies,
  catalog: suppliedCatalog,
}: {
  baseUrl: string;
  prefectureCode: string;
  location: GeoPoint;
  radiusMeters?: number;
  signal?: AbortSignal;
  dependencies?: InvestigationDependencies;
  catalog?: { manifest: RiskDataManifest; coverage: RiskDataCoverage };
}): Promise<EvidenceBasedInvestigation> {
  let catalog = suppliedCatalog;
  if (!catalog) {
    try {
      catalog = await dependencies.loadCatalog(baseUrl, signal);
    } catch {
      return { kind: "failed", location, prefectureCode, errorCode: "catalog-unavailable" };
    }
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
      : { overall: false, buildingCollapse: false, fire: false };

  const sources: RiskDataSourceInfo[] = [];
  for (const dataset of catalog.manifest.datasets) {
    let isRelevant = dataset.indicator !== "tokyo-regional-risk" || isTokyo;
    if (dataset.indicator === "a31a-maximum-flood-depth") {
      isRelevant = false;
      for (const datasetPrefectureCode of dataset.prefectures) {
        if (datasetPrefectureCode === prefectureCode) {
          isRelevant = true;
          break;
        }
      }
    }
    if (!isRelevant) continue;
    const { id, name, provider, referencePeriod, acquiredAt, license, sourceUrl } = dataset;
    sources.push({ id, name, provider, referencePeriod, acquiredAt, license, sourceUrl });
  }

  return {
    kind: "completed",
    location,
    prefectureCode,
    dataVersion: catalog.manifest.dataVersion,
    logicVersion: INVESTIGATION_LOGIC_VERSION,
    sources,
    maximumFlood,
    tokyoRegionalRisk: { result: tokyoResult, boundaryWarnings },
    issues,
  };
}
