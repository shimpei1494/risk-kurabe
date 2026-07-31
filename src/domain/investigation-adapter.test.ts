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
        datasetId: "gsi-hazardmap-flood-integrated",
        featureId: "1",
        riverOrBasinId: "830301",
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
  },
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
  it("元区分名と東京都地域危険度の詳細をUIモデルへ移す", () => {
    const adapted = toUiInvestigationResult(result);
    expect(adapted.maxFloodDepth).toMatchObject({
      state: "value",
      category: "0.5〜3m",
      sourceLabel: "0.5m以上3.0m未満",
      boundaryWarning: true,
    });
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

  it("部分失敗をUIモデルへ残す", () => {
    const adapted = toUiInvestigationResult({
      ...result,
      issues: [{ code: "official-flood-tile-unavailable" }],
    });

    expect(adapted.problems).toEqual([{ code: "official-flood-tile-unavailable" }]);
  });

  it.each([
    { maxMeters: 0.5, category: "0.5m未満" },
    { maxMeters: 3, category: "0.5〜3m" },
    { maxMeters: 5, category: "3〜5m" },
    { maxMeters: 10, category: "5〜10m" },
    { maxMeters: 20, category: "10〜20m" },
    { maxMeters: null, category: "20m以上" },
  ] as const)("公式の6階級をUI区分へ保ったまま移す: $category", ({ maxMeters, category }) => {
    const primary = result.maximumFlood.result.primary;
    if (!primary) throw new Error("テスト用の洪水判定がありません");

    const adapted = toUiInvestigationResult({
      ...result,
      maximumFlood: {
        ...result.maximumFlood,
        result: {
          ...result.maximumFlood.result,
          primary: {
            ...primary,
            depth: { ...primary.depth, maxMeters },
          },
        },
      },
    });

    expect(adapted.maxFloodDepth.category).toBe(category);
  });
});
