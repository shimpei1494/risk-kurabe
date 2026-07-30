import { describe, expect, it } from "vite-plus/test";

import { investigate } from "./mock-data";

describe("investigate", () => {
  it("重複洪水データを純粋な判定ロジックからUIモデルへ変換する", () => {
    const result = investigate(1);

    expect(result.maxFloodDepth).toMatchObject({
      state: "value",
      category: "3〜5m",
      boundaryWarning: true,
      evidences: [
        { riverOrBasinName: "荒川", category: "3〜5m" },
        { riverOrBasinName: "芝川", category: "0.5〜3m" },
      ],
    });
  });

  it("収録済みカバレッジで未一致なら区域外にする", () => {
    expect(investigate(2).maxFloodDepth.state).toBe("outOfArea");
  });
});
