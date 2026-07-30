import { describe, expect, it } from "vite-plus/test";

import {
  evaluateFloodMatches,
  selectMaxFloodMatch,
  type FloodPolygonMatch,
} from "./flood-evaluator";

function match(
  featureId: string,
  sourceLabel: string,
  minMeters: number,
  maxMeters: number | null,
  datasetId = "a31a-tokyo",
): FloodPolygonMatch {
  return {
    datasetId,
    featureId,
    riverOrBasinId: `basin-${featureId}`,
    riverOrBasinName: `水系${featureId}`,
    depth: { sourceCode: `depth-${featureId}`, sourceLabel, minMeters, maxMeters },
  };
}

describe("selectMaxFloodMatch", () => {
  it("上限が最も大きい元区分を主結果にする", () => {
    const shallow = match("shallow", "0.5m以上3.0m未満", 0.5, 3);
    const deep = match("deep", "3.0m以上5.0m未満", 3, 5);
    expect(selectMaxFloodMatch([shallow, deep])).toEqual(deep);
  });

  it("同じ上限なら下限が大きい元区分を主結果にする", () => {
    const broad = match("broad", "0.5m以上5.0m未満", 0.5, 5);
    const narrowDeep = match("narrow", "3.0m以上5.0m未満", 3, 5);
    expect(selectMaxFloodMatch([broad, narrowDeep])).toEqual(narrowDeep);
  });

  it("上限なしの区分を有限上限の区分より先にする", () => {
    const finite = match("finite", "5.0m以上10.0m未満", 5, 10);
    const unbounded = match("unbounded", "10.0m以上", 10, null);
    expect(selectMaxFloodMatch([finite, unbounded])).toEqual(unbounded);
  });

  it("深さが同順位ならデータセットIDと地物IDで順序を固定する", () => {
    const laterDataset = match("001", "3.0m以上5.0m未満", 3, 5, "dataset-b");
    const laterFeature = match("002", "3.0m以上5.0m未満", 3, 5, "dataset-a");
    const expected = match("001", "3.0m以上5.0m未満", 3, 5, "dataset-a");
    expect(selectMaxFloodMatch([laterDataset, laterFeature, expected])).toEqual(expected);
  });
});

describe("evaluateFloodMatches", () => {
  it("重複する全根拠を保持しながら最大区分を返す", () => {
    const shallow = match("shallow", "0.5m以上3.0m未満", 0.5, 3);
    const deep = match("deep", "3.0m以上5.0m未満", 3, 5);
    expect(evaluateFloodMatches([shallow, deep], "available")).toEqual({
      state: "value",
      primary: deep,
      evidences: [deep, shallow],
    });
  });

  it.each([
    ["available", "outOfArea"],
    ["partial", "undetermined"],
    ["unpublished", "unpublished"],
    ["failed", "undetermined"],
    ["unknown", "undetermined"],
  ] as const)("未一致かつカバレッジが%sなら%sを返す", (coverage, expectedState) => {
    expect(evaluateFloodMatches([], coverage)).toEqual({ state: expectedState, evidences: [] });
  });
});
