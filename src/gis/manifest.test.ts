import { describe, expect, it } from "vite-plus/test";

import {
  a31aArtifactUrl,
  a31aMapArtifactUrl,
  riskDataCoverageSchema,
  riskDataManifestSchema,
} from "./manifest";

const validManifest = {
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
      mapArtifact: {
        path: "map/a31a.pmtiles",
        contentType: "application/vnd.pmtiles",
        size: 80,
        sha256: "b".repeat(64),
      },
    },
  ],
} as const;

describe("riskDataManifestSchema", () => {
  it("正しいmanifestを検証する", () => {
    expect(riskDataManifestSchema.parse(validManifest).dataVersion).toBe("risk-data-v1");
  });

  it("不正なチェックサムを拒否する", () => {
    expect(() =>
      riskDataManifestSchema.parse({
        ...validManifest,
        datasets: [
          {
            ...validManifest.datasets[0],
            artifact: { ...validManifest.datasets[0].artifact, sha256: "invalid" },
          },
        ],
      }),
    ).toThrow();
  });
});

describe("riskDataCoverageSchema", () => {
  it("部分収録状態を受け入れる", () => {
    const coverage = riskDataCoverageSchema.parse({
      schemaVersion: 1,
      dataVersion: "risk-data-v1",
      a31a: {
        prefectures: {
          "13": {
            status: "partial",
            datasetIds: ["a31a-tokyo"],
            includedRiverCategories: ["洪水予報河川・水位周知河川"],
            excludedRiverCategories: ["その他の河川"],
          },
        },
      },
    });

    expect(coverage.a31a.prefectures["13"]?.status).toBe("partial");
  });
});

describe("a31aArtifactUrl", () => {
  it("都県に対応するFGBの絶対URLを組み立てる", () => {
    const manifest = riskDataManifestSchema.parse(validManifest);
    expect(
      a31aArtifactUrl({
        baseUrl: "https://data.example.com/risk-data/v1",
        manifest,
        prefectureCode: "13",
      }),
    ).toBe("https://data.example.com/risk-data/v1/query/a31a/tokyo.fgb");
  });

  it("都県に対応するPMTilesの絶対URLを組み立てる", () => {
    const manifest = riskDataManifestSchema.parse(validManifest);
    expect(
      a31aMapArtifactUrl({
        baseUrl: "https://data.example.com/risk-data/v1",
        manifest,
        prefectureCode: "13",
      }),
    ).toBe("https://data.example.com/risk-data/v1/map/a31a.pmtiles");
  });
});
