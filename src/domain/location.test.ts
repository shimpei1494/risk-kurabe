import { describe, expect, it } from "vite-plus/test";

import type { ComparisonLocation } from "./location";
import { resequenceLocations } from "./location";

describe("resequenceLocations", () => {
  it("削除後の地点番号と固定名を1から振り直す", () => {
    const locations = [
      { id: "a", order: 1, name: "地点1" },
      { id: "c", order: 3, name: "地点3" },
    ] as ComparisonLocation[];

    expect(resequenceLocations(locations)).toMatchObject([
      { id: "a", order: 1, name: "地点1" },
      { id: "c", order: 2, name: "地点2" },
    ]);
  });
});
