import { describe, expect, it, vi } from "vite-plus/test";

import type { A31aFeature } from "./a31a-evaluator";
import { investigateA31a } from "./investigate-a31a";
import { riskDataCoverageSchema, riskDataManifestSchema, type RiskDataCoverage } from "./manifest";

const manifest = riskDataManifestSchema.parse({
  schemaVersion: 1,
  dataVersion: "risk-data-v1",
  logicVersion: "flood-evaluator-v1",
  datasets: [
    {
      id: "a31a-tokyo",
      indicator: "a31a-maximum-flood-depth",
      name: "洪水浸水想定区域",
      provider: "国土交通省",
      referencePeriod: "2025年度",
      acquiredAt: "2026-07-17",
      license: "CC BY 4.0",
      sourceUrl: "https://example.com/source",
      prefectures: ["13"],
      artifact: {
        path: "query/a31a/tokyo.fgb",
        contentType: "application/flatgeobuf",
        size: 100,
        sha256: "a".repeat(64),
      },
    },
  ],
});

function coverage(status: "available" | "partial" | "unpublished"): RiskDataCoverage {
  return riskDataCoverageSchema.parse({
    schemaVersion: 1,
    dataVersion: "risk-data-v1",
    a31a: {
      prefectures: {
        "13": {
          status,
          datasetIds: ["a31a-tokyo"],
          includedRiverCategories: ["洪水予報河川・水位周知河川"],
          excludedRiverCategories: status === "partial" ? ["その他の河川"] : [],
        },
      },
    },
  });
}

const location = { longitude: 139.7, latitude: 35.6 };
const containingFeature: A31aFeature = {
  type: "Feature",
  properties: {
    dataset_id: "a31a-tokyo",
    source_file: "river.geojson",
    river_id: "river-1",
    river_name: "テスト川",
    manager_code: "13",
    manager_name: "東京都",
    depth_code: 2,
    depth_label: "0.5m以上3.0m未満",
    depth_min_m: 0.5,
    depth_max_m: 3,
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

function dependencies({
  catalogCoverage = coverage("partial"),
  candidates = [containingFeature],
}: {
  catalogCoverage?: RiskDataCoverage;
  candidates?: readonly A31aFeature[];
} = {}) {
  return {
    loadCatalog: vi.fn().mockResolvedValue({ manifest, coverage: catalogCoverage }),
    fetchCandidates: vi.fn().mockResolvedValue(candidates),
  };
}

describe("investigateA31a", () => {
  it("カタログから対象FGBを選び、地点判定と版情報を返す", async () => {
    const deps = dependencies();
    const investigation = await investigateA31a({
      baseUrl: "https://data.example.com/risk-data/v1",
      prefectureCode: "13",
      location,
      dependencies: deps,
    });

    expect(investigation.kind).toBe("completed");
    expect(investigation.result.state).toBe("value");
    expect(investigation.result.primary?.riverOrBasinName).toBe("テスト川");
    expect(investigation.kind === "completed" && investigation.dataVersion).toBe("risk-data-v1");
    expect(deps.fetchCandidates).toHaveBeenCalledWith({
      url: "https://data.example.com/risk-data/v1/query/a31a/tokyo.fgb",
      location,
      radiusMeters: 25,
    });
  });

  it("部分収録で未一致なら区域外ではなく判定不能にする", async () => {
    const investigation = await investigateA31a({
      baseUrl: "https://data.example.com/risk-data/v1",
      prefectureCode: "13",
      location,
      dependencies: dependencies({ candidates: [] }),
    });

    expect(investigation.kind).toBe("completed");
    expect(investigation.result.state).toBe("undetermined");
  });

  it("未公開ならFGBを取得せず正常な未公開結果にする", async () => {
    const deps = dependencies({ catalogCoverage: coverage("unpublished") });
    const investigation = await investigateA31a({
      baseUrl: "https://data.example.com/risk-data/v1",
      prefectureCode: "13",
      location,
      dependencies: deps,
    });

    expect(investigation.kind).toBe("completed");
    expect(investigation.result.state).toBe("unpublished");
    expect(deps.fetchCandidates).not.toHaveBeenCalled();
  });

  it("カタログ取得失敗をキャッシュ不可の一時エラーにする", async () => {
    const deps = dependencies();
    deps.loadCatalog.mockRejectedValue(new Error("network error"));

    const investigation = await investigateA31a({
      baseUrl: "https://data.example.com/risk-data/v1",
      prefectureCode: "13",
      location,
      dependencies: deps,
    });

    expect(investigation).toMatchObject({
      kind: "failed",
      errorCode: "catalog-unavailable",
      result: { state: "undetermined" },
    });
  });

  it("FGB取得失敗を区域外にせずキャッシュ不可の一時エラーにする", async () => {
    const deps = dependencies();
    deps.fetchCandidates.mockRejectedValue(new Error("range request failed"));

    const investigation = await investigateA31a({
      baseUrl: "https://data.example.com/risk-data/v1",
      prefectureCode: "13",
      location,
      dependencies: deps,
    });

    expect(investigation).toMatchObject({
      kind: "failed",
      errorCode: "artifact-unavailable",
      result: { state: "undetermined" },
    });
  });
});
