import { describe, expect, it, vi } from "vite-plus/test";

import { INVESTIGATION_LOGIC_VERSION } from "../domain/investigation";
import { OFFICIAL_FLOOD_SOURCE_URL } from "./hazardmap-raster";
import { investigateRisk, type InvestigationDependencies } from "./investigate-risk";
import type { RiskDataCoverage, RiskDataManifest } from "./manifest";
import type { TokyoRegionalRiskFeature } from "./tokyo-risk-evaluator";

const manifest: RiskDataManifest = {
  schemaVersion: 1,
  dataVersion: "v3",
  logicVersion: "risk-evaluator-v3",
  datasets: [],
};
const coverage: RiskDataCoverage = {
  schemaVersion: 1,
  dataVersion: "v3",
};
const floodResult = {
  result: {
    state: "value" as const,
    primary: {
      datasetId: "gsi-hazardmap-flood-integrated",
      featureId: "tile:1:2",
      riverOrBasinId: "official-integrated",
      riverOrBasinName: "重ねるハザードマップ（統合タイル）",
      depth: {
        sourceCode: "2",
        sourceLabel: "0.5m以上3.0m未満",
        minMeters: 0.5,
        maxMeters: 3,
      },
    },
    evidences: [],
  },
  boundaryWarning: true,
};

function dependencies(): InvestigationDependencies {
  return {
    loadCatalog: vi.fn().mockResolvedValue({ manifest, coverage }),
    fetchOfficialFlood: vi.fn().mockResolvedValue(floodResult),
    fetchTokyoCandidates: vi.fn().mockResolvedValue([]),
  };
}

describe("investigateRisk", () => {
  it("公式洪水タイルを判定し、データ版とロジック版を返す", async () => {
    const deps = dependencies();
    const result = await investigateRisk({
      baseUrl: "https://data.example.com/risk-data/v3/",
      prefectureCode: "11",
      location: { longitude: 139.7, latitude: 35.69 },
      dependencies: deps,
    });
    expect(result).toMatchObject({
      kind: "completed",
      dataVersion: "v3",
      logicVersion: INVESTIGATION_LOGIC_VERSION,
      maximumFlood: { result: { state: "value" } },
      issues: [],
    });
    expect(deps.fetchOfficialFlood).toHaveBeenCalledWith({
      location: { longitude: 139.7, latitude: 35.69 },
      radiusMeters: 25,
      signal: undefined,
    });
  });

  it("公式洪水タイル取得失敗を部分失敗として残す", async () => {
    const deps = dependencies();
    vi.mocked(deps.fetchOfficialFlood).mockRejectedValue(new Error("tile request failed"));
    const result = await investigateRisk({
      baseUrl: "https://data.example.com/risk-data/v3/",
      prefectureCode: "11",
      location: { longitude: 139.7, latitude: 35.69 },
      dependencies: deps,
    });
    expect(result).toMatchObject({
      kind: "completed",
      maximumFlood: { result: { state: "undetermined" }, boundaryWarning: false },
      issues: [{ code: "official-flood-tile-unavailable" }],
    });
  });

  it("カタログを取得できなければ調査全体を失敗にする", async () => {
    const deps = dependencies();
    vi.mocked(deps.loadCatalog).mockRejectedValue(new Error("manifest request failed"));
    const result = await investigateRisk({
      baseUrl,
      prefectureCode: "13",
      location: insideTown,
      dependencies: deps,
    });
    expect(result).toEqual({
      kind: "failed",
      location: insideTown,
      prefectureCode: "13",
      errorCode: "catalog-unavailable",
    });
    expect(deps.fetchOfficialFlood).not.toHaveBeenCalled();
  });

  it("渡されたカタログがあれば再取得しない", async () => {
    const deps = dependencies();
    await investigateRisk({
      baseUrl,
      prefectureCode: "11",
      location: insideTown,
      dependencies: deps,
      catalog: { manifest, coverage },
    });
    expect(deps.loadCatalog).not.toHaveBeenCalled();
  });

  it("東京都外では地域危険度を取得せず、出典は公式洪水タイルだけにする", async () => {
    const deps = dependencies();
    vi.mocked(deps.loadCatalog).mockResolvedValue(tokyoCatalog("available"));
    const result = await investigateRisk({
      baseUrl,
      prefectureCode: "11",
      location: insideTown,
      dependencies: deps,
    });
    expect(deps.fetchTokyoCandidates).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      kind: "completed",
      sources: [officialFloodSource],
      tokyoRegionalRisk: {
        result: { state: "notApplicable" },
        boundaryWarnings: { overall: false, buildingCollapse: false, fire: false },
      },
    });
  });

  it("東京都内では地域危険度の成果物から町丁目を判定し、出典に追加する", async () => {
    const deps = dependencies();
    vi.mocked(deps.loadCatalog).mockResolvedValue(tokyoCatalog("available"));
    vi.mocked(deps.fetchTokyoCandidates).mockResolvedValue([townFeature]);
    const result = await investigateRisk({
      baseUrl,
      prefectureCode: "13",
      location: insideTown,
      dependencies: deps,
    });
    expect(deps.fetchTokyoCandidates).toHaveBeenCalledWith({
      url: `${baseUrl}query/tokyo-regional-risk.fgb`,
      location: insideTown,
      radiusMeters: 25,
    });
    expect(result).toMatchObject({
      kind: "completed",
      sources: [officialFloodSource, tokyoSource],
      tokyoRegionalRisk: {
        result: { state: "value", primary: townFeature.properties },
        boundaryWarnings: { overall: false, buildingCollapse: false, fire: false },
      },
      issues: [],
    });
  });

  it("東京都内で町丁目の境界上にあれば全指標に境界警告を出す", async () => {
    const deps = dependencies();
    vi.mocked(deps.loadCatalog).mockResolvedValue(tokyoCatalog("partial"));
    vi.mocked(deps.fetchTokyoCandidates).mockResolvedValue([townFeature]);
    const result = await investigateRisk({
      baseUrl,
      prefectureCode: "13",
      location: onTownBoundary,
      dependencies: deps,
    });
    expect(result).toMatchObject({
      tokyoRegionalRisk: {
        boundaryWarnings: { overall: true, buildingCollapse: true, fire: true },
      },
    });
  });

  it.each(["unpublished", "failed", "unknown"] as const)(
    "東京都のカバレッジが%sなら成果物を取得しない",
    async (status) => {
      const deps = dependencies();
      vi.mocked(deps.loadCatalog).mockResolvedValue(tokyoCatalog(status));
      const result = await investigateRisk({
        baseUrl,
        prefectureCode: "13",
        location: insideTown,
        dependencies: deps,
      });
      expect(deps.fetchTokyoCandidates).not.toHaveBeenCalled();
      expect(result).toMatchObject({ issues: [] });
    },
  );

  it("東京都の成果物取得に失敗したら部分失敗として残す", async () => {
    const deps = dependencies();
    vi.mocked(deps.loadCatalog).mockResolvedValue(tokyoCatalog("available"));
    vi.mocked(deps.fetchTokyoCandidates).mockRejectedValue(new Error("fgb request failed"));
    const result = await investigateRisk({
      baseUrl,
      prefectureCode: "13",
      location: insideTown,
      dependencies: deps,
    });
    expect(result).toMatchObject({
      kind: "completed",
      tokyoRegionalRisk: {
        result: { state: "undetermined" },
        boundaryWarnings: { overall: false, buildingCollapse: false, fire: false },
      },
      issues: [{ code: "tokyo-regional-risk-artifact-unavailable" }],
    });
  });

  it("manifestに東京都の成果物がなければ部分失敗として残す", async () => {
    const deps = dependencies();
    vi.mocked(deps.loadCatalog).mockResolvedValue({
      manifest,
      coverage: tokyoCatalog("available").coverage,
    });
    const result = await investigateRisk({
      baseUrl,
      prefectureCode: "13",
      location: insideTown,
      dependencies: deps,
    });
    expect(deps.fetchTokyoCandidates).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      tokyoRegionalRisk: { result: { state: "undetermined" } },
      issues: [{ code: "tokyo-regional-risk-artifact-unavailable" }],
    });
  });
});

const baseUrl = "https://data.example.com/risk-data/v3/";
const insideTown = { longitude: 139.7, latitude: 35.6 };
const onTownBoundary = { longitude: 139.701, latitude: 35.6 };

const officialFloodSource = {
  id: "gsi-hazardmap-flood-integrated",
  name: "重ねるハザードマップ 洪水浸水想定区域（想定最大規模）",
  provider: "国土交通省・国土地理院",
  referencePeriod: "公式配信タイル（更新型）",
  acquiredAt: "調査時に取得",
  license: "公共データ利用規約（PDL1.0）",
  sourceUrl: OFFICIAL_FLOOD_SOURCE_URL,
};

const tokyoSource = {
  id: "tokyo-risk",
  name: "地域危険度",
  provider: "東京都",
  referencePeriod: "第9回",
  acquiredAt: "2026-07-30",
  license: "東京都オープンデータ利用規約",
  sourceUrl: "https://example.com/tokyo",
};

function tokyoCatalog(status: NonNullable<RiskDataCoverage["tokyoRegionalRisk"]>["status"]): {
  manifest: RiskDataManifest;
  coverage: RiskDataCoverage;
} {
  const checksum = "a".repeat(64);
  const mapArtifact = (path: string) => ({
    path,
    contentType: "application/vnd.pmtiles" as const,
    size: 456,
    sha256: checksum,
  });
  return {
    manifest: {
      ...manifest,
      datasets: [
        {
          ...tokyoSource,
          indicator: "tokyo-regional-risk",
          prefectures: ["13"],
          townCount: 1,
          artifact: {
            path: "query/tokyo-regional-risk.fgb",
            contentType: "application/flatgeobuf",
            size: 123,
            sha256: checksum,
          },
          mapArtifacts: {
            overall: mapArtifact("map/overall.pmtiles"),
            buildingCollapse: mapArtifact("map/building-collapse.pmtiles"),
            fire: mapArtifact("map/fire.pmtiles"),
          },
        },
      ],
    },
    coverage: {
      ...coverage,
      tokyoRegionalRisk: {
        prefectureCode: "13",
        status,
        datasetId: "tokyo-risk",
        townCount: 1,
        municipalityCount: 1,
        excludedAreas: [],
      },
    },
  };
}

const townFeature: TokyoRegionalRiskFeature = {
  type: "Feature",
  properties: {
    dataset_id: "tokyo-risk",
    source_id: 1,
    town_key: "千代田区:丸の内一丁目",
    municipality_name: "千代田区",
    town_name: "丸の内一丁目",
    ground_classification: "台地1",
    building_collapse_score: 1.2,
    building_collapse_order: 100,
    building_collapse_rank: 2,
    fire_score: 1.5,
    fire_order: 200,
    fire_rank: 3,
    activity_difficulty: 0.2,
    overall_score: 1.3,
    overall_order: 150,
    overall_rank: 3,
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [139.699, 35.599],
        [139.701, 35.599],
        [139.701, 35.601],
        [139.699, 35.601],
        [139.699, 35.599],
      ],
    ],
  },
};
