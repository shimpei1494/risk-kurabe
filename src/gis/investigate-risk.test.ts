import { describe, expect, it, vi } from "vite-plus/test";

import type { A31aFeature } from "./a31a-evaluator";
import { investigateRisk, type InvestigationDependencies } from "./investigate-risk";
import type { RiskDataCoverage, RiskDataManifest } from "./manifest";

const checksum = "a".repeat(64);
const manifest: RiskDataManifest = {
  schemaVersion: 1,
  dataVersion: "risk-data-v2",
  logicVersion: "risk-evaluator-v3",
  datasets: [
    {
      id: "a31a-tokyo",
      indicator: "a31a-maximum-flood-depth",
      name: "洪水浸水想定区域",
      provider: "国土交通省",
      referencePeriod: "2024",
      acquiredAt: "2026-07-30",
      license: "CC BY 4.0",
      sourceUrl: "https://example.com/a31a",
      prefectures: ["13"],
      artifact: {
        path: "query/a31a/13.fgb",
        contentType: "application/flatgeobuf",
        size: 1,
        sha256: checksum,
      },
    },
  ],
};
const coverage: RiskDataCoverage = {
  schemaVersion: 1,
  dataVersion: "risk-data-v2",
  a31a: {
    prefectures: {
      "13": {
        status: "available",
        datasetIds: ["a31a-tokyo"],
        includedRiverCategories: ["国管理"],
        excludedRiverCategories: [],
      },
    },
  },
};
const a31aFeature: A31aFeature = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [139.69, 35.68],
        [139.71, 35.68],
        [139.71, 35.7],
        [139.69, 35.7],
        [139.69, 35.68],
      ],
    ],
  },
  properties: {
    dataset_id: "a31a-tokyo",
    source_file: "a31a.geojson",
    river_id: "8303010001",
    river_name: "利根川",
    manager_code: "1",
    manager_name: "国",
    depth_code: 2,
    depth_label: "0.5m以上3.0m未満",
    depth_min_m: 0.5,
    depth_max_m: 3,
  },
};

function dependencies(): InvestigationDependencies {
  return {
    loadCatalog: vi.fn().mockResolvedValue({ manifest, coverage }),
    fetchA31aCandidates: vi.fn().mockResolvedValue([a31aFeature]),
    fetchTokyoCandidates: vi.fn().mockResolvedValue([]),
  };
}

describe("investigateRisk", () => {
  it("A31aを判定し、データ版とロジック版を返す", async () => {
    const deps = dependencies();
    const result = await investigateRisk({
      baseUrl: "https://data.example.com/risk-data/v2/",
      prefectureCode: "13",
      location: { longitude: 139.7, latitude: 35.69 },
      dependencies: deps,
    });
    expect(result).toMatchObject({
      kind: "completed",
      dataVersion: "risk-data-v2",
      logicVersion: "risk-evaluator-v3",
      maximumFlood: { result: { state: "value" } },
      issues: [],
    });
    expect(deps.fetchA31aCandidates).toHaveBeenCalledWith({
      url: "https://data.example.com/risk-data/v2/query/a31a/13.fgb",
      location: { longitude: 139.7, latitude: 35.69 },
      radiusMeters: 25,
    });
  });

  it("A31a取得失敗を部分失敗として残す", async () => {
    const deps = dependencies();
    vi.mocked(deps.fetchA31aCandidates).mockRejectedValue(new Error("Range request failed"));
    const result = await investigateRisk({
      baseUrl: "https://data.example.com/risk-data/v2/",
      prefectureCode: "13",
      location: { longitude: 139.7, latitude: 35.69 },
      dependencies: deps,
    });
    expect(result).toMatchObject({
      kind: "completed",
      maximumFlood: { result: { state: "undetermined" } },
      issues: [{ code: "a31a-artifact-unavailable" }],
    });
  });
});
