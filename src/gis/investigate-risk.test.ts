import { describe, expect, it, vi } from "vite-plus/test";

import type { A31aFeature } from "./a31a-evaluator";
import type { A53Feature } from "./a53-evaluator";
import { investigateRisk, type InvestigationDependencies } from "./investigate-risk";
import {
  riskDataCoverageSchema,
  riskDataManifestSchema,
  type RiskDataCoverage,
  type RiskDataManifest,
} from "./manifest";
import type { TokyoRegionalRiskFeature } from "./tokyo-risk-evaluator";

const artifact = (path: string) => ({
  path,
  contentType: "application/flatgeobuf" as const,
  size: 100,
  sha256: "a".repeat(64),
});
const mapArtifact = (path: string) => ({
  path,
  contentType: "application/vnd.pmtiles" as const,
  size: 100,
  sha256: "b".repeat(64),
});
const datasetBase = {
  name: "テストデータ",
  provider: "提供者",
  referencePeriod: "2025年度",
  acquiredAt: "2026-07-17",
  license: "CC BY 4.0",
  sourceUrl: "https://example.com/source",
};

const manifest: RiskDataManifest = riskDataManifestSchema.parse({
  schemaVersion: 1,
  dataVersion: "risk-data-v1",
  logicVersion: "risk-evaluator-v1",
  datasets: [
    {
      ...datasetBase,
      id: "a31a-kanto",
      indicator: "a31a-maximum-flood-depth",
      prefectures: ["13", "14"],
      artifact: artifact("query/a31a/tokyo.fgb"),
    },
    {
      ...datasetBase,
      id: "a53-010",
      indicator: "a53-frequency-flood-depth",
      prefectures: ["13", "14"],
      basinCodes: ["830301"],
      rainfallDenominator: 10,
      artifact: artifact("query/a53/010/kanto.fgb"),
      mapArtifact: mapArtifact("map/a53/010.pmtiles"),
    },
    {
      ...datasetBase,
      id: "a53-030",
      indicator: "a53-frequency-flood-depth",
      prefectures: ["13", "14"],
      basinCodes: ["830301"],
      rainfallDenominator: 30,
      artifact: artifact("query/a53/030/kanto.fgb"),
      mapArtifact: mapArtifact("map/a53/030.pmtiles"),
    },
    {
      ...datasetBase,
      id: "tokyo-risk",
      indicator: "tokyo-regional-risk",
      prefectures: ["13"],
      townCount: 1,
      artifact: artifact("query/tokyo/regional-risk.fgb"),
      mapArtifacts: {
        buildingCollapse: mapArtifact("map/tokyo-building.pmtiles"),
        fire: mapArtifact("map/tokyo-fire.pmtiles"),
      },
    },
  ],
});

const coverage: RiskDataCoverage = riskDataCoverageSchema.parse({
  schemaVersion: 1,
  dataVersion: "risk-data-v1",
  a31a: {
    prefectures: {
      "13": {
        status: "available",
        datasetIds: ["a31a-kanto"],
        includedRiverCategories: ["洪水予報河川"],
        excludedRiverCategories: [],
      },
      "14": {
        status: "available",
        datasetIds: ["a31a-kanto"],
        includedRiverCategories: ["洪水予報河川"],
        excludedRiverCategories: [],
      },
    },
  },
  a53: {
    basins: {
      "830301": {
        name: "利根川水系",
        a31aLinkStatus: "linked",
        returnPeriods: {
          "10": { status: "available", datasetId: "a53-010" },
          "30": { status: "unpublished" },
        },
      },
    },
  },
  tokyoRegionalRisk: {
    prefectureCode: "13",
    status: "available",
    datasetId: "tokyo-risk",
    townCount: 1,
    municipalityCount: 1,
    excludedAreas: ["島しょ部"],
  },
});

const location = { longitude: 139.7, latitude: 35.6 };

function squareGeometry() {
  return {
    type: "Polygon" as const,
    coordinates: [
      [
        [139.699, 35.599],
        [139.701, 35.599],
        [139.701, 35.601],
        [139.699, 35.601],
        [139.699, 35.599],
      ],
    ],
  };
}

const a31aFeature: A31aFeature = {
  type: "Feature",
  properties: {
    dataset_id: "a31a-kanto",
    source_file: "river.geojson",
    river_id: "8303010001",
    river_name: "利根川",
    manager_code: "83",
    manager_name: "国土交通省",
    depth_code: 2,
    depth_label: "0.5m以上3.0m未満",
    depth_min_m: 0.5,
    depth_max_m: 3,
  },
  geometry: squareGeometry(),
};

const a53Feature: A53Feature = {
  type: "Feature",
  properties: {
    dataset_id: "a53-010",
    source_file: "a53.geojson",
    basin_code: "830301",
    basin_name: "利根川水系",
    depth_code_3: 2,
    depth_code_6: 3,
    depth_scale: "six-level",
    depth_code: 3,
    depth_label: "3.0m以上5.0m未満",
    depth_min_m: 3,
    depth_max_m: 5,
    rainfall_denominator: 10,
  },
  geometry: squareGeometry(),
};

const tokyoFeature: TokyoRegionalRiskFeature = {
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
  geometry: squareGeometry(),
};

function dependencies({
  a31aCandidates = [a31aFeature],
}: {
  a31aCandidates?: readonly A31aFeature[];
} = {}) {
  return {
    loadCatalog: vi.fn().mockResolvedValue({ manifest, coverage }),
    fetchA31aCandidates: vi.fn().mockResolvedValue(a31aCandidates),
    fetchA53Candidates: vi.fn().mockResolvedValue([a53Feature]),
    fetchTokyoCandidates: vi.fn().mockResolvedValue([tokyoFeature]),
  } satisfies InvestigationDependencies;
}

describe("investigateRisk", () => {
  it("A31a一致水系を起点に収録済みA53だけを取得し、東京指標と版を統合する", async () => {
    const deps = dependencies();
    const result = await investigateRisk({
      baseUrl: "https://data.example.com/risk-data/v1",
      prefectureCode: "13",
      location,
      dependencies: deps,
    });

    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    expect(result.maximumFlood.result.primary?.riverOrBasinId).toBe("830301");
    expect(result.frequencyFloods).toMatchObject([
      {
        rainfallDenominator: 10,
        result: { state: "value", primary: { depth: { sourceLabel: "3.0m以上5.0m未満" } } },
      },
      { rainfallDenominator: 30, result: { state: "unpublished" } },
    ]);
    expect(result.tokyoRegionalRisk.result.primary?.building_collapse_rank).toBe(2);
    expect(result.dataVersion).toBe("risk-data-v1");
    expect(result.issues).toEqual([]);
    expect(deps.fetchA53Candidates).toHaveBeenCalledTimes(1);
    expect(deps.fetchA53Candidates).toHaveBeenCalledWith({
      url: "https://data.example.com/risk-data/v1/query/a53/010/kanto.fgb",
      location,
      radiusMeters: 25,
    });
  });

  it("A31aの面に一致しなければA53を独立検索しない", async () => {
    const deps = dependencies({ a31aCandidates: [] });
    const result = await investigateRisk({
      baseUrl: "https://data.example.com/risk-data/v1",
      prefectureCode: "13",
      location,
      dependencies: deps,
    });

    expect(result.kind).toBe("completed");
    expect(deps.fetchA53Candidates).not.toHaveBeenCalled();
    if (result.kind === "completed") {
      expect(
        result.frequencyFloods.every(({ result: item }) => item.state === "undetermined"),
      ).toBe(true);
    }
  });

  it("東京都外では地域危険度を取得せず対象外にする", async () => {
    const deps = dependencies({ a31aCandidates: [] });
    const result = await investigateRisk({
      baseUrl: "https://data.example.com/risk-data/v1",
      prefectureCode: "14",
      location,
      dependencies: deps,
    });

    expect(deps.fetchTokyoCandidates).not.toHaveBeenCalled();
    expect(result.kind === "completed" ? result.tokyoRegionalRisk.result.state : result.kind).toBe(
      "notApplicable",
    );
  });

  it("A53取得失敗を区域外にせず、他指標を残した部分失敗にする", async () => {
    const deps = dependencies();
    deps.fetchA53Candidates.mockRejectedValue(new Error("Range request failed"));
    const result = await investigateRisk({
      baseUrl: "https://data.example.com/risk-data/v1",
      prefectureCode: "13",
      location,
      dependencies: deps,
    });

    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") return;
    expect(result.frequencyFloods[0]?.result.state).toBe("undetermined");
    expect(result.tokyoRegionalRisk.result.state).toBe("value");
    expect(result.issues).toContainEqual({
      code: "a53-artifact-unavailable",
      rainfallDenominator: 10,
    });
  });

  it("カタログ取得失敗は全体をキャッシュ不可の失敗にする", async () => {
    const deps = dependencies();
    deps.loadCatalog.mockRejectedValue(new Error("network error"));
    const result = await investigateRisk({
      baseUrl: "https://data.example.com/risk-data/v1",
      prefectureCode: "13",
      location,
      dependencies: deps,
    });
    expect(result).toMatchObject({ kind: "failed", errorCode: "catalog-unavailable" });
  });

  it("検証済みカタログを渡した場合は再取得せず地点判定する", async () => {
    const deps = dependencies();
    deps.loadCatalog.mockRejectedValue(new Error("should not load"));
    const result = await investigateRisk({
      baseUrl: "https://data.example.com/risk-data/v1",
      prefectureCode: "13",
      location,
      dependencies: deps,
      catalog: { manifest, coverage },
    });

    expect(result.kind).toBe("completed");
    expect(deps.loadCatalog).not.toHaveBeenCalled();
  });
});
