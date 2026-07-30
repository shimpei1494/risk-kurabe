import { describe, expect, it } from "vite-plus/test";

import { mapSelectionLabel } from "./map-selection";

describe("mapSelectionLabel", () => {
  it("東京都の指標名を返す", () => {
    expect(mapSelectionLabel({ indicator: "building-collapse" })).toBe("建物倒壊危険度");
  });
});
