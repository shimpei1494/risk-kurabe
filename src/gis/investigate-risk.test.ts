import { describe, expect, it, vi } from "vite-plus/test";

import { investigateRisk, type InvestigationDependencies } from "./investigate-risk";
import type { RiskDataCoverage, RiskDataManifest } from "./manifest";

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
      logicVersion: "risk-evaluator-v4-official-flood-tile",
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
      maximumFlood: { result: { state: "undetermined" } },
      issues: [{ code: "official-flood-tile-unavailable" }],
    });
  });
});
