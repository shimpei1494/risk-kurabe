import { describe, expect, it } from "vite-plus/test";

import {
  evaluateFloodMatches,
  evaluateFrequencyFloodMatches,
  selectMaxFloodMatch,
  type BasinCoverage,
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
    depth: {
      sourceCode: `depth-${featureId}`,
      sourceLabel,
      minMeters,
      maxMeters,
    },
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
    expect(evaluateFloodMatches([], coverage)).toEqual({
      state: expectedState,
      evidences: [],
    });
  });
});

describe("evaluateFrequencyFloodMatches", () => {
  const a31aBasinA = match("a31a-a", "3.0m以上5.0m未満", 3, 5);
  const a31aBasinB = match("a31a-b", "0.5m以上3.0m未満", 0.5, 3);
  const availableCoverage: BasinCoverage[] = [
    { riverOrBasinId: a31aBasinA.riverOrBasinId, status: "available" },
  ];

  it("A31aに一致する水系がなければA53を独立探索しない", () => {
    const unrelatedA53 = match("unrelated", "5.0m以上", 5, null);

    expect(
      evaluateFrequencyFloodMatches({
        a31aMatches: [],
        a53Matches: [unrelatedA53],
        basinCoverage: [{ riverOrBasinId: unrelatedA53.riverOrBasinId, status: "available" }],
      }),
    ).toEqual({
      state: "undetermined",
      evidences: [],
      candidateBasinIds: [],
      unpublishedBasinIds: [],
    });
  });

  it("収録済み候補水系の一致地物だけから主結果を選ぶ", () => {
    const matchingA53 = {
      ...match("a53-a", "0.5m以上3.0m未満", 0.5, 3),
      riverOrBasinId: a31aBasinA.riverOrBasinId,
    };
    const unrelatedA53 = match("unrelated", "5.0m以上", 5, null);

    const result = evaluateFrequencyFloodMatches({
      a31aMatches: [a31aBasinA],
      a53Matches: [unrelatedA53, matchingA53],
      basinCoverage: availableCoverage,
    });

    expect(result.state).toBe("value");
    expect(result.primary).toEqual(matchingA53);
    expect(result.evidences).toEqual([matchingA53]);
  });

  it("収録済み水系に地物が一致しなければ区域外を返す", () => {
    expect(
      evaluateFrequencyFloodMatches({
        a31aMatches: [a31aBasinA],
        a53Matches: [],
        basinCoverage: availableCoverage,
      }).state,
    ).toBe("outOfArea");
  });

  it("候補水系がすべて未公開なら未公開を返す", () => {
    expect(
      evaluateFrequencyFloodMatches({
        a31aMatches: [a31aBasinA, a31aBasinB],
        a53Matches: [],
        basinCoverage: [
          { riverOrBasinId: a31aBasinA.riverOrBasinId, status: "unpublished" },
          { riverOrBasinId: a31aBasinB.riverOrBasinId, status: "unpublished" },
        ],
      }).state,
    ).toBe("unpublished");
  });

  it("収録済みと未公開が混在すると収録済み側を判定し未公開水系も残す", () => {
    const result = evaluateFrequencyFloodMatches({
      a31aMatches: [a31aBasinA, a31aBasinB],
      a53Matches: [],
      basinCoverage: [
        { riverOrBasinId: a31aBasinA.riverOrBasinId, status: "available" },
        { riverOrBasinId: a31aBasinB.riverOrBasinId, status: "unpublished" },
      ],
    });

    expect(result.state).toBe("outOfArea");
    expect(result.unpublishedBasinIds).toEqual([a31aBasinB.riverOrBasinId]);
  });

  it("候補水系のカバレッジが欠落または失敗なら判定不能を返す", () => {
    expect(
      evaluateFrequencyFloodMatches({
        a31aMatches: [a31aBasinA],
        a53Matches: [],
        basinCoverage: [],
      }).state,
    ).toBe("undetermined");

    expect(
      evaluateFrequencyFloodMatches({
        a31aMatches: [a31aBasinA],
        a53Matches: [],
        basinCoverage: [{ riverOrBasinId: a31aBasinA.riverOrBasinId, status: "failed" }],
      }).state,
    ).toBe("undetermined");
  });
});
