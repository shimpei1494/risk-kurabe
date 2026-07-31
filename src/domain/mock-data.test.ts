import { describe, expect, it } from "vite-plus/test";

import { investigate } from "./mock-data";

describe("investigate", () => {
  it("公式洪水データをUIモデルへ変換する", () => {
    const result = investigate(1);

    expect(result.maxFloodDepth).toMatchObject({
      state: "value",
      category: "3〜5m",
      boundaryWarning: true,
    });
  });

  it("収録済みカバレッジで未一致なら区域外にする", () => {
    expect(investigate(2).maxFloodDepth.state).toBe("outOfArea");
  });
});
