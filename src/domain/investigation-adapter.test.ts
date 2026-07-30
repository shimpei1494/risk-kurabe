import { describe, expect, it } from "vite-plus/test";

import type { EvidenceBasedInvestigationResult } from "./investigation";
import { outsideKantoResult, toUiInvestigationResult } from "./investigation-adapter";

const result: EvidenceBasedInvestigationResult = {
  kind: "completed",
  location: { longitude: 139.7, latitude: 35.6 },
  prefectureCode: "13",
  dataVersion: "v1",
  logicVersion: "v1",
  sources: [],
  maximumFlood: {
    result: {
      state: "value",
      primary: {
        datasetId: "a31a",
        featureId: "1",
        riverOrBasinId: "830301",
        riverOrBasinName: "利根川",
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
  },
  frequencyFloods: [
    {
      rainfallDenominator: 10,
      result: {
        state: "outOfArea",
        evidences: [],
        candidateBasinIds: ["830301"],
        unpublishedBasinIds: [],
      },
      boundaryWarning: false,
    },
    {
      rainfallDenominator: 30,
      result: {
        state: "value",
        primary: {
          datasetId: "a53",
          featureId: "2",
          riverOrBasinId: "830301",
          riverOrBasinName: "利根川水系",
          depth: {
            sourceCode: "3",
            sourceLabel: "3.0m以上5.0m未満",
            minMeters: 3,
            maxMeters: 5,
          },
        },
        evidences: [],
        candidateBasinIds: ["830301"],
        unpublishedBasinIds: [],
      },
      boundaryWarning: false,
    },
  ],
  tokyoRegionalRisk: {
    result: {
      state: "value",
      primary: {
        dataset_id: "tokyo-regional-risk-9",
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
      evidences: [],
    },
    boundaryWarnings: { overall: true, buildingCollapse: false, fire: false },
  },
  issues: [],
};

describe("toUiInvestigationResult", () => {
  it("元区分名を残し、最も頻度の高い値ありA53を要約する", () => {
    const adapted = toUiInvestigationResult(result);
    expect(adapted.maxFloodDepth).toMatchObject({
      state: "value",
      category: "0.5〜3m",
      sourceLabel: "0.5m以上3.0m未満",
      boundaryWarning: true,
    });
    expect(adapted.floodFrequency).toMatchObject({
      state: "value",
      frequencyLabel: "30年に1回程度",
      sourceLabel: "3.0m以上5.0m未満",
    });
    expect(adapted.floodFrequency.periods).toEqual([
      expect.objectContaining({
        rainfallDenominator: 10,
        state: "outOfArea",
      }),
      expect.objectContaining({
        rainfallDenominator: 30,
        state: "value",
        category: "3〜5m",
        sourceLabel: "3.0m以上5.0m未満",
      }),
    ]);
    expect(adapted.tokyoEarthquakeRisk).toEqual({
      state: "value",
      rank: 3,
      score: 1.3,
      order: 150,
      activityDifficulty: 0.2,
      groundClassification: "台地1",
      boundaryWarning: true,
      municipalityName: "千代田区",
      townName: "丸の内一丁目",
    });
    expect(adapted.buildingCollapseRisk).toMatchObject({
      rank: 2,
      score: 1.2,
      order: 100,
    });
  });

  it("関東外は洪水を区域外ではなく対象外にする", () => {
    expect(outsideKantoResult().maxFloodDepth.state).toBe("notApplicable");
  });

  it("部分失敗をUIモデルへ残し、判定不能を区域外へ変換しない", () => {
    const adapted = toUiInvestigationResult({
      ...result,
      issues: [{ code: "a53-artifact-unavailable", rainfallDenominator: 30 }],
      frequencyFloods: [
        {
          rainfallDenominator: 30,
          result: {
            state: "undetermined",
            evidences: [],
            candidateBasinIds: ["830301"],
            unpublishedBasinIds: [],
          },
          boundaryWarning: false,
        },
      ],
    });

    expect(adapted.floodFrequency.state).toBe("undetermined");
    expect(adapted.problems).toEqual([
      { code: "a53-artifact-unavailable", rainfallDenominator: 30 },
    ]);
  });
});
