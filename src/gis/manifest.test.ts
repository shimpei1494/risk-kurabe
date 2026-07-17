import { describe, expect, it } from "vite-plus/test";

import {
  a31aArtifactUrl,
  a31aMapArtifactUrl,
  a53ArtifactUrl,
  a53MapArtifactUrl,
  riskDataCoverageSchema,
  riskDataManifestSchema,
  tokyoRegionalRiskArtifactUrl,
  tokyoRegionalRiskMapArtifactUrl,
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

  it("A53の降雨規模別datasetを受け入れる", () => {
    const manifest = riskDataManifestSchema.parse({
      ...validManifest,
      datasets: [
        ...validManifest.datasets,
        {
          id: "a53-kanto-010",
          indicator: "a53-frequency-flood-depth",
          name: "洪水浸水想定区域（1/10）",
          provider: "国土交通省",
          referencePeriod: "2025年度",
          acquiredAt: "2026-07-17",
          license: "CC BY 4.0",
          sourceUrl: "https://example.com/a53",
          prefectures: ["08", "09", "10", "11", "12", "13", "14"],
          basinCodes: ["830301"],
          rainfallDenominator: 10,
          artifact: {
            path: "query/a53/010/kanto.fgb",
            contentType: "application/flatgeobuf",
            size: 100,
            sha256: "c".repeat(64),
          },
          mapArtifact: {
            path: "map/a53/010.pmtiles",
            contentType: "application/vnd.pmtiles",
            size: 80,
            sha256: "d".repeat(64),
          },
        },
      ],
    });

    expect(manifest.datasets[1]?.indicator).toBe("a53-frequency-flood-depth");
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

  it("A53の水系別・降雨規模別カバレッジを受け入れる", () => {
    const coverage = riskDataCoverageSchema.parse({
      schemaVersion: 1,
      dataVersion: "risk-data-v1",
      a31a: {
        prefectures: {},
      },
      a53: {
        basins: {
          "830301": {
            name: "久慈川水系",
            a31aLinkStatus: "linked",
            returnPeriods: {
              "10": {
                status: "available",
                datasetId: "a53-kanto-010",
              },
            },
          },
        },
      },
    });

    expect(coverage.a53?.basins["830301"]?.returnPeriods["10"]?.status).toBe("available");
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

describe("A53 artifact URL", () => {
  const manifest = riskDataManifestSchema.parse({
    ...validManifest,
    datasets: [
      ...validManifest.datasets,
      {
        id: "a53-kanto-030",
        indicator: "a53-frequency-flood-depth",
        name: "洪水浸水想定区域（1/30）",
        provider: "国土交通省",
        referencePeriod: "2025年度",
        acquiredAt: "2026-07-17",
        license: "CC BY 4.0",
        sourceUrl: "https://example.com/a53",
        prefectures: ["08", "09", "10", "11", "12", "13", "14"],
        basinCodes: ["830301"],
        rainfallDenominator: 30,
        artifact: {
          path: "query/a53/030/kanto.fgb",
          contentType: "application/flatgeobuf",
          size: 100,
          sha256: "c".repeat(64),
        },
        mapArtifact: {
          path: "map/a53/030.pmtiles",
          contentType: "application/vnd.pmtiles",
          size: 80,
          sha256: "d".repeat(64),
        },
      },
    ],
  });

  it("降雨規模に対応するFGB URLを組み立てる", () => {
    expect(
      a53ArtifactUrl({
        baseUrl: "https://data.example.com/risk-data/v1",
        manifest,
        rainfallDenominator: 30,
      }),
    ).toBe("https://data.example.com/risk-data/v1/query/a53/030/kanto.fgb");
  });

  it("降雨規模に対応するPMTiles URLを組み立てる", () => {
    expect(
      a53MapArtifactUrl({
        baseUrl: "https://data.example.com/risk-data/v1",
        manifest,
        rainfallDenominator: 30,
      }),
    ).toBe("https://data.example.com/risk-data/v1/map/a53/030.pmtiles");
  });
});

describe("東京都地域危険度 artifact URL", () => {
  const manifest = riskDataManifestSchema.parse({
    ...validManifest,
    datasets: [
      ...validManifest.datasets,
      {
        id: "tokyo-regional-risk-9",
        indicator: "tokyo-regional-risk",
        name: "地震に関する地域危険度測定調査",
        provider: "東京都都市整備局",
        referencePeriod: "2022年9月",
        acquiredAt: "2026-07-17",
        license: "CC BY 4.0",
        sourceUrl: "https://example.com/tokyo-risk",
        prefectures: ["13"],
        townCount: 5192,
        artifact: {
          path: "query/tokyo/regional-risk.fgb",
          contentType: "application/flatgeobuf",
          size: 100,
          sha256: "e".repeat(64),
        },
        mapArtifacts: {
          buildingCollapse: {
            path: "map/tokyo-building-collapse.pmtiles",
            contentType: "application/vnd.pmtiles",
            size: 80,
            sha256: "f".repeat(64),
          },
          fire: {
            path: "map/tokyo-fire.pmtiles",
            contentType: "application/vnd.pmtiles",
            size: 70,
            sha256: "1".repeat(64),
          },
        },
      },
    ],
  });

  it("地点判定用FGB URLを組み立てる", () => {
    expect(
      tokyoRegionalRiskArtifactUrl({
        baseUrl: "https://data.example.com/risk-data/v1",
        manifest,
      }),
    ).toBe("https://data.example.com/risk-data/v1/query/tokyo/regional-risk.fgb");
  });

  it("選択指標のPMTiles URLを組み立てる", () => {
    expect(
      tokyoRegionalRiskMapArtifactUrl({
        baseUrl: "https://data.example.com/risk-data/v1",
        manifest,
        indicator: "fire",
      }),
    ).toBe("https://data.example.com/risk-data/v1/map/tokyo-fire.pmtiles");
  });
});
