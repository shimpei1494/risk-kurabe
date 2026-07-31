import { describe, expect, it } from "vite-plus/test";

import { DEFAULT_MAP_SELECTION, mapFeatureValueLabel, mapSelectionLabel } from "./map-selection";

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
