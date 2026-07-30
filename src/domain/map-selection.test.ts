import { describe, expect, it } from "vite-plus/test";

import { mapSelectionLabel } from "./map-selection";

describe("mapSelectionLabel", () => {
  it("頻度別浸水は選択中の降雨規模を含める", () => {
    expect(mapSelectionLabel({ indicator: "frequency-flood", rainfallDenominator: 100 })).toBe(
      "100年に1回程度の浸水深",
    );
  });

  it("東京都の指標名を返す", () => {
    expect(mapSelectionLabel({ indicator: "building-collapse", rainfallDenominator: 30 })).toBe(
      "建物倒壊危険度",
    );
  });
});
