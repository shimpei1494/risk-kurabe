import {
  evaluateFloodMatches,
  type EvaluatedFloodResult,
  type FloodCoverageStatus,
} from "../domain/flood-evaluator";
import { evaluateA31aAtPoint, hasA31aBoundaryWarning, type A31aFeature } from "./a31a-evaluator";
import { fetchA31aCandidates } from "./flatgeobuf-source";
import type { GeoPoint } from "./geometry";
import {
  a31aArtifactUrl,
  loadRiskDataCatalog,
  type RiskDataCoverage,
  type RiskDataManifest,
} from "./manifest";

export interface A31aCoverageSummary {
  status: FloodCoverageStatus;
  datasetIds: readonly string[];
  includedRiverCategories: readonly string[];
  excludedRiverCategories: readonly string[];
}

export interface CompletedA31aInvestigation {
  kind: "completed";
  result: EvaluatedFloodResult;
  boundaryWarning: boolean;
  dataVersion: string;
  logicVersion: string;
  coverage: A31aCoverageSummary;
}

export interface FailedA31aInvestigation {
  kind: "failed";
  result: EvaluatedFloodResult;
  boundaryWarning: false;
  errorCode: "catalog-unavailable" | "artifact-unavailable";
}

export type A31aInvestigation = CompletedA31aInvestigation | FailedA31aInvestigation;

interface InvestigationDependencies {
  loadCatalog: (
    baseUrl: string,
    signal?: AbortSignal,
  ) => Promise<{ manifest: RiskDataManifest; coverage: RiskDataCoverage }>;
  fetchCandidates: (options: {
    url: string;
    location: GeoPoint;
    radiusMeters?: number;
  }) => Promise<readonly A31aFeature[]>;
}

const defaultDependencies: InvestigationDependencies = {
  loadCatalog: loadRiskDataCatalog,
  fetchCandidates: fetchA31aCandidates,
};

const undeterminedResult = (): EvaluatedFloodResult => evaluateFloodMatches([], "unknown");

function failed(errorCode: FailedA31aInvestigation["errorCode"]): FailedA31aInvestigation {
  return {
    kind: "failed",
    result: undeterminedResult(),
    boundaryWarning: false,
    errorCode,
  };
}

/**
 * R2の版情報、都県別カバレッジ、FlatGeobufの候補取得と厳密な地点判定を
 * ひとつの処理にまとめる。一時的な取得失敗は completed にせず、呼び出し側が
 * sessionStorageへ保存しないよう明示する。
 */
export async function investigateA31a({
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
}): Promise<A31aInvestigation> {
  let catalog: Awaited<ReturnType<InvestigationDependencies["loadCatalog"]>>;
  try {
    catalog = await dependencies.loadCatalog(baseUrl, signal);
  } catch {
    return failed("catalog-unavailable");
  }

  const prefectureCoverage = catalog.coverage.a31a.prefectures[prefectureCode];
  const coverage: A31aCoverageSummary = prefectureCoverage ?? {
    status: "unknown",
    datasetIds: [],
    includedRiverCategories: [],
    excludedRiverCategories: [],
  };
  const artifactUrl = a31aArtifactUrl({
    baseUrl,
    manifest: catalog.manifest,
    prefectureCode,
  });

  if (coverage.status !== "available" && coverage.status !== "partial") {
    return {
      kind: "completed",
      result: evaluateFloodMatches([], coverage.status),
      boundaryWarning: false,
      dataVersion: catalog.manifest.dataVersion,
      logicVersion: catalog.manifest.logicVersion,
      coverage,
    };
  }

  if (!artifactUrl) return failed("artifact-unavailable");

  let candidates: readonly A31aFeature[];
  try {
    candidates = await dependencies.fetchCandidates({
      url: artifactUrl,
      location,
      radiusMeters,
    });
  } catch {
    return failed("artifact-unavailable");
  }

  return {
    kind: "completed",
    result: evaluateA31aAtPoint(location, candidates, coverage.status),
    boundaryWarning: hasA31aBoundaryWarning(location, candidates, coverage.status, radiusMeters),
    dataVersion: catalog.manifest.dataVersion,
    logicVersion: catalog.manifest.logicVersion,
    coverage,
  };
}
