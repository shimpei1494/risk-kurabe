import { describe, expect, it } from "vite-plus/test";

import {
  a31aArtifactUrl,
  a31aMapArtifactUrl,
  riskDataCoverageSchema,
  riskDataManifestSchema,
  tokyoRegionalRiskArtifactUrl,
  tokyoRegionalRiskMapArtifactUrl,
} from "./manifest";

const checksum = "a".repeat(64);
const artifact = (path: string) => ({
  path,
  contentType: "application/flatgeobuf" as const,
  size: 123,
  sha256: checksum,
});
const mapArtifact = (path: string) => ({
  path,
  contentType: "application/vnd.pmtiles" as const,
  size: 456,
  sha256: checksum,
});

const manifest = riskDataManifestSchema.parse({
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
      artifact: artifact("query/a31a/13.fgb"),
      mapArtifact: mapArtifact("map/a31a.pmtiles"),
    },
    {
      id: "tokyo-risk",
      indicator: "tokyo-regional-risk",
      name: "地域危険度",
      provider: "東京都",
      referencePeriod: "第9回",
      acquiredAt: "2026-07-30",
      license: "東京都オープンデータ利用規約",
      sourceUrl: "https://example.com/tokyo",
      prefectures: ["13"],
      townCount: 5_192,
      artifact: artifact("query/tokyo-regional-risk.fgb"),
      mapArtifacts: {
        overall: mapArtifact("map/tokyo-overall-risk.pmtiles"),
        buildingCollapse: mapArtifact("map/tokyo-building-collapse.pmtiles"),
        fire: mapArtifact("map/tokyo-fire.pmtiles"),
      },
    },
  ],
});

describe("risk data catalog", () => {
  it("A31aなしのV3カタログを受け入れる", () => {
    const v3Manifest = riskDataManifestSchema.parse({
      schemaVersion: 1,
      dataVersion: "v3",
      logicVersion: "risk-evaluator-v4-official-flood-tile",
      datasets: [manifest.datasets[1]],
    });
    const v3Coverage = riskDataCoverageSchema.parse({
      schemaVersion: 1,
      dataVersion: "v3",
      tokyoRegionalRisk: {
        prefectureCode: "13",
        status: "available",
        datasetId: "tokyo-risk",
        townCount: 5_192,
        municipalityCount: 51,
        excludedAreas: ["島しょ部"],
      },
    });

    expect(v3Manifest.datasets).toHaveLength(1);
    expect(v3Coverage.a31a).toBeUndefined();
  });

  it("A31aと東京都地域危険度の成果物URLを組み立てる", () => {
    const baseUrl = "https://data.example.com/risk-data/v2/";
    expect(a31aArtifactUrl({ baseUrl, manifest, prefectureCode: "13" })).toBe(
      `${baseUrl}query/a31a/13.fgb`,
    );
    expect(a31aMapArtifactUrl({ baseUrl, manifest, prefectureCode: "13" })).toBe(
      `${baseUrl}map/a31a.pmtiles`,
    );
    expect(tokyoRegionalRiskArtifactUrl({ baseUrl, manifest })).toBe(
      `${baseUrl}query/tokyo-regional-risk.fgb`,
    );
    expect(tokyoRegionalRiskMapArtifactUrl({ baseUrl, manifest, indicator: "fire" })).toBe(
      `${baseUrl}map/tokyo-fire.pmtiles`,
    );
    expect(tokyoRegionalRiskMapArtifactUrl({ baseUrl, manifest, indicator: "overall" })).toBe(
      `${baseUrl}map/tokyo-overall-risk.pmtiles`,
    );
  });

  it("A31aと東京都地域危険度のカバレッジを受け入れる", () => {
    const coverage = riskDataCoverageSchema.parse({
      schemaVersion: 1,
      dataVersion: "risk-data-v2",
      a31a: {
        prefectures: {
          "13": {
            status: "partial",
            datasetIds: ["a31a-tokyo"],
            includedRiverCategories: ["国管理"],
            excludedRiverCategories: ["都管理"],
          },
        },
      },
      tokyoRegionalRisk: {
        prefectureCode: "13",
        status: "available",
        datasetId: "tokyo-risk",
        townCount: 5_192,
        municipalityCount: 51,
        excludedAreas: ["島しょ部"],
      },
    });
    expect(coverage.a31a?.prefectures["13"]?.status).toBe("partial");
    expect(coverage.tokyoRegionalRisk?.townCount).toBe(5_192);
  });
});
