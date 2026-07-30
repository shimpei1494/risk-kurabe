import { describe, expect, it } from "vite-plus/test";

import {
  evaluateTokyoRegionalRiskAtPoint,
  tokyoBoundaryWarnings,
  type TokyoRegionalRiskFeature,
  type TokyoRegionalRiskProperties,
} from "./tokyo-risk-evaluator";

const location = { longitude: 139.7, latitude: 35.6 };

function properties({
  townKey = "千代田区:丸の内一丁目",
  buildingRank = 2,
  fireRank = 3,
  sourceId = 1,
}: {
  townKey?: string;
  buildingRank?: 1 | 2 | 3 | 4 | 5;
  fireRank?: 1 | 2 | 3 | 4 | 5;
  sourceId?: number;
} = {}): TokyoRegionalRiskProperties {
  const [municipalityName = "", townName = ""] = townKey.split(":");
  return {
    dataset_id: "tokyo-regional-risk-9",
    source_id: sourceId,
    town_key: townKey,
    municipality_name: municipalityName,
    town_name: townName,
    ground_classification: "台地1",
    building_collapse_score: 1.2,
    building_collapse_order: 100,
    building_collapse_rank: buildingRank,
    fire_score: 1.5,
    fire_order: 200,
    fire_rank: fireRank,
    activity_difficulty: 0.2,
    overall_score: 1.3,
    overall_order: 150,
    overall_rank: 3,
  };
}

function rectangle(
  minLongitude: number,
  maxLongitude: number,
  featureProperties: TokyoRegionalRiskProperties,
): TokyoRegionalRiskFeature {
  return {
    type: "Feature",
    properties: featureProperties,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [minLongitude, 35.599],
          [maxLongitude, 35.599],
          [maxLongitude, 35.601],
          [minLongitude, 35.601],
          [minLongitude, 35.599],
        ],
      ],
    },
  };
}

describe("evaluateTokyoRegionalRiskAtPoint", () => {
  it("町丁目を正確に照合して建物倒壊・火災ランクの根拠を返す", () => {
    const result = evaluateTokyoRegionalRiskAtPoint({
      location,
      candidates: [rectangle(139.699, 139.701, properties())],
      coverageStatus: "available",
      isTokyo: true,
    });
    expect(result).toMatchObject({
      state: "value",
      primary: {
        building_collapse_rank: 2,
        fire_rank: 3,
        municipality_name: "千代田区",
      },
    });
  });

  it("東京都外ではFGB候補に関係なく対象外にする", () => {
    const result = evaluateTokyoRegionalRiskAtPoint({
      location,
      candidates: [rectangle(139.699, 139.701, properties())],
      coverageStatus: "available",
      isTokyo: false,
    });
    expect(result.state).toBe("notApplicable");
  });

  it("東京都内かつ収録済みで町丁目未一致なら区域外にする", () => {
    const result = evaluateTokyoRegionalRiskAtPoint({
      location,
      candidates: [],
      coverageStatus: "available",
      isTokyo: true,
    });
    expect(result.state).toBe("outOfArea");
  });
});

describe("tokyoBoundaryWarnings", () => {
  it("25m以内の町丁目境界で変わる指標だけを警告する", () => {
    const west = rectangle(139.699, 139.7, properties());
    const east = rectangle(
      139.7,
      139.701,
      properties({
        townKey: "千代田区:丸の内二丁目",
        buildingRank: 4,
        fireRank: 3,
        sourceId: 2,
      }),
    );

    const warnings = tokyoBoundaryWarnings({
      location: { longitude: 139.6999, latitude: 35.6 },
      candidates: [west, east],
      coverageStatus: "available",
    });
    expect(warnings).toEqual({ buildingCollapse: true, fire: false });
  });
});
