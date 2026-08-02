import { describe, expect, it } from "vite-plus/test";

import {
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
  dataVersion: "v3",
  logicVersion: "risk-evaluator-v4-official-flood-tile",
  datasets: [
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
  it("V3カタログを受け入れる", () => {
    const v3Manifest = riskDataManifestSchema.parse({
      schemaVersion: 1,
      dataVersion: "v3",
      logicVersion: "risk-evaluator-v4-official-flood-tile",
      datasets: [manifest.datasets[0]],
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
    expect(v3Coverage.tokyoRegionalRisk?.townCount).toBe(5_192);
  });

  it("東京都地域危険度の成果物URLを組み立てる", () => {
    const baseUrl = "https://data.example.com/risk-data/v3/";
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

  it("成果物URLが配信元の範囲外へ移動するパスを拒否する", () => {
    const baseUrl = "https://data.example.com/risk-data/v3/";
    const dataset = manifest.datasets[0]!;
    const absoluteManifest = {
      ...manifest,
      datasets: [
        {
          ...dataset,
          artifact: artifact("https://attacker.example/risk.fgb"),
        },
      ],
    };
    const traversalManifest = {
      ...manifest,
      datasets: [
        {
          ...dataset,
          artifact: artifact("../risk.fgb"),
        },
      ],
    };

    expect(() => tokyoRegionalRiskArtifactUrl({ baseUrl, manifest: absoluteManifest })).toThrow(
      "配信元の範囲外",
    );
    expect(() => tokyoRegionalRiskArtifactUrl({ baseUrl, manifest: traversalManifest })).toThrow(
      "配信元の範囲外",
    );
  });

  it("東京都地域危険度のみのV3カバレッジを受け入れる", () => {
    const coverage = riskDataCoverageSchema.parse({
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
    expect(coverage.tokyoRegionalRisk?.townCount).toBe(5_192);
  });
});
