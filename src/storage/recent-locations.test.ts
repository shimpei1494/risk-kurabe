import { describe, expect, it } from "vite-plus/test";

import {
  clearRecentLocations,
  loadRecentLocations,
  rememberLocation,
  removeRecentLocation,
} from "./recent-locations";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("recent locations", () => {
  it("新しい順で最大10件を保存し、同じ座標は更新する", () => {
    const storage = memoryStorage();
    const now = new Date("2026-07-18T00:00:00.000Z");
    for (let index = 0; index < 11; index += 1) {
      rememberLocation(
        storage,
        {
          address: `地点${index}`,
          point: { longitude: 139 + index / 100, latitude: 35 },
        },
        new Date(now.getTime() + index),
      );
    }
    const stored = loadRecentLocations(storage, now);
    expect(stored).toHaveLength(10);
    expect(stored[0]?.address).toBe("地点10");

    rememberLocation(
      storage,
      { address: "更新地点", point: stored[1]!.point },
      new Date("2026-07-18T01:00:00.000Z"),
    );
    expect(loadRecentLocations(storage)[0]?.address).toBe("更新地点");
  });

  it("90日を過ぎた地点と破損値を復元しない", () => {
    const storage = memoryStorage();
    rememberLocation(
      storage,
      { address: "期限切れ", point: { longitude: 139.7, latitude: 35.6 } },
      new Date("2026-01-01T00:00:00.000Z"),
    );
    expect(loadRecentLocations(storage, new Date("2026-07-18T00:00:00.000Z"))).toEqual([]);

    storage.setItem("risk-kurabe:recent-locations:v1", "{broken");
    expect(loadRecentLocations(storage)).toEqual([]);
  });

  it("個別削除と一括削除ができる", () => {
    const storage = memoryStorage();
    const point = { longitude: 139.7, latitude: 35.6 };
    rememberLocation(storage, { address: "地点", point });
    expect(removeRecentLocation(storage, point)).toEqual([]);

    rememberLocation(storage, { address: "地点", point });
    clearRecentLocations(storage);
    expect(loadRecentLocations(storage)).toEqual([]);
  });
});
