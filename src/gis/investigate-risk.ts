import { evaluateFloodMatches } from "../domain/flood-evaluator";
import type { EvidenceBasedInvestigation, InvestigationIssue } from "../domain/investigation";
import { INVESTIGATION_LOGIC_VERSION } from "../domain/investigation";
import type { RiskDataSourceInfo } from "../domain/risk";
import { fetchTokyoRegionalRiskCandidates } from "./flatgeobuf-source";
import type { GeoPoint } from "./geometry";
import { fetchOfficialFloodAtPoint, OFFICIAL_FLOOD_SOURCE_URL } from "./hazardmap-raster";
import {
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
  fetchOfficialFlood: (options: {
    location: GeoPoint;
    radiusMeters?: number;
    signal?: AbortSignal;
  }) => Promise<{
    result: import("../domain/flood-evaluator").EvaluatedFloodResult;
    boundaryWarning: boolean;
  }>;
  fetchTokyoCandidates: (options: {
    url: string;
    location: GeoPoint;
    radiusMeters?: number;
  }) => Promise<readonly TokyoRegionalRiskFeature[]>;
}

const defaultDependencies: InvestigationDependencies = {
  loadCatalog: loadRiskDataCatalog,
  fetchOfficialFlood: fetchOfficialFloodAtPoint,
  fetchTokyoCandidates: fetchTokyoRegionalRiskCandidates,
};

/**
 * カタログを一度だけ読み、公式洪水タイルと東京都地域危険度を地点ごとに取得する。
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
  let maximumFlood: Awaited<ReturnType<InvestigationDependencies["fetchOfficialFlood"]>>;
  try {
    maximumFlood = await dependencies.fetchOfficialFlood({ location, radiusMeters, signal });
  } catch {
    issues.push({ code: "official-flood-tile-unavailable" });
    maximumFlood = {
      result: evaluateFloodMatches([], "failed"),
      boundaryWarning: false,
    };
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
      : { overall: false, buildingCollapse: false, fire: false };

  const sources: RiskDataSourceInfo[] = [];
  for (const dataset of catalog.manifest.datasets) {
    if (!isTokyo) continue;
    const { id, name, provider, referencePeriod, acquiredAt, license, sourceUrl } = dataset;
    sources.push({ id, name, provider, referencePeriod, acquiredAt, license, sourceUrl });
  }
  sources.unshift({
    id: "gsi-hazardmap-flood-integrated",
    name: "重ねるハザードマップ 洪水浸水想定区域（想定最大規模）",
    provider: "国土交通省・国土地理院",
    referencePeriod: "公式配信タイル（更新型）",
    acquiredAt: "調査時に取得",
    license: "公共データ利用規約（PDL1.0）",
    sourceUrl: OFFICIAL_FLOOD_SOURCE_URL,
  });

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
