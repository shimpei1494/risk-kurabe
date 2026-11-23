import { describe, expect, it } from "vite-plus/test";

import {
  DEFAULT_MAP_SELECTION,
  isMapIndicator,
  MAP_INDICATOR_OPTIONS,
  mapFeatureValueLabel,
  mapSelectionLabel,
} from "./map-selection";

describe("mapSelectionLabel", () => {
  it("東京都の指標名を返す", () => {
    expect(mapSelectionLabel({ indicator: "building-collapse" })).toBe("建物倒壊危険度");
    expect(mapSelectionLabel({ indicator: "tokyo-overall" })).toBe("東京都・地震時の総合危険度");
  });

  it("地図上の値を元データの階級ラベルへ変換する", () => {
    expect(mapFeatureValueLabel(DEFAULT_MAP_SELECTION, 2)).toBe("0.5〜3m");
    expect(mapFeatureValueLabel({ indicator: "tokyo-overall" }, 4)).toBe("ランク4 / 5");
    expect(mapFeatureValueLabel({ indicator: "fire" }, 8)).toBeUndefined();
  });
});

describe("mapFeatureValueLabel", () => {
  it.each([
    [1, "0〜0.5m"],
    [2, "0.5〜3m"],
    [3, "3〜5m"],
    [4, "5〜10m"],
    [5, "10〜20m"],
    [6, "20m以上"],
  ])("最大浸水深の区分%iを%sと表示する", (value, label) => {
    expect(mapFeatureValueLabel(DEFAULT_MAP_SELECTION, value)).toBe(label);
  });

  it("東京都の指標はランク1〜5だけを表示し、範囲外は表示しない", () => {
    const fire = { indicator: "fire" } as const;
    expect(mapFeatureValueLabel(fire, 1)).toBe("ランク1 / 5");
    expect(mapFeatureValueLabel(fire, 5)).toBe("ランク5 / 5");
    expect(mapFeatureValueLabel(fire, 0)).toBeUndefined();
    expect(mapFeatureValueLabel(fire, 6)).toBeUndefined();
  });

  it("地図タイルの文字列値も数値として扱い、整数以外は表示しない", () => {
    const fire = { indicator: "fire" } as const;
    expect(mapFeatureValueLabel(fire, "3")).toBe("ランク3 / 5");
    expect(mapFeatureValueLabel(fire, 2.5)).toBeUndefined();
    expect(mapFeatureValueLabel(fire, "abc")).toBeUndefined();
  });
});

describe("MAP_INDICATOR_OPTIONS", () => {
  it("各指標に重複しない表示名と短縮名がある", () => {
    expect(
      MAP_INDICATOR_OPTIONS.map(({ value }) => mapSelectionLabel({ indicator: value })),
    ).toEqual(["最大浸水深", "東京都・地震時の総合危険度", "建物倒壊危険度", "火災危険度"]);
    expect(MAP_INDICATOR_OPTIONS.map(({ shortLabel }) => shortLabel)).toEqual([
      "最大浸水",
      "地震総合",
      "建物倒壊",
      "火災",
    ]);
  });
});

describe("isMapIndicator", () => {
  it("URLで利用できる指標だけを受け付ける", () => {
    expect(isMapIndicator("maximum-flood")).toBe(true);
    expect(isMapIndicator("fire")).toBe(true);
    expect(isMapIndicator("unknown")).toBe(false);
    expect(isMapIndicator(1)).toBe(false);
  });
});
