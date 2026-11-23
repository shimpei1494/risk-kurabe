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
  datasetId = "gsi-hazardmap-flood-integrated",
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

  it("下限が小さくても上限が大きい区分を優先する", () => {
    const wideDeep = match("wide", "0.5m以上10.0m未満", 0.5, 10);
    const narrowShallow = match("narrow", "3.0m以上5.0m未満", 3, 5);
    expect(selectMaxFloodMatch([wideDeep, narrowShallow])).toEqual(wideDeep);
    expect(selectMaxFloodMatch([narrowShallow, wideDeep])).toEqual(wideDeep);
  });

  it("上限なしの区分は下限が小さくても有限上限の区分より優先する", () => {
    const unbounded = match("unbounded", "5.0m以上", 5, null);
    const finite = match("finite", "10.0m以上20.0m未満", 10, 20);
    expect(selectMaxFloodMatch([unbounded, finite])).toEqual(unbounded);
  });

  it("どちらも上限なしなら下限が大きい区分を優先する", () => {
    const lower = match("lower", "5.0m以上", 5, null);
    const higher = match("higher", "10.0m以上", 10, null);
    expect(selectMaxFloodMatch([higher, lower])).toEqual(higher);
    expect(selectMaxFloodMatch([lower, higher])).toEqual(higher);
  });

  it("入力の先頭が最大区分でも主結果にする", () => {
    const deep = match("deep", "3.0m以上5.0m未満", 3, 5);
    const shallow = match("shallow", "0.5m以上3.0m未満", 0.5, 3);
    expect(selectMaxFloodMatch([deep, shallow])).toEqual(deep);
  });

  it("一致がなければ主結果を返さない", () => {
    expect(selectMaxFloodMatch([])).toBeUndefined();
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
