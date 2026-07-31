import { describe, expect, it } from "vite-plus/test";

import { bboxAroundPoint, distanceBetweenPointsMeters } from "./geometry";

describe("bboxAroundPoint", () => {
  it("東京付近で指定半径を囲むbboxを作る", () => {
    const bbox = bboxAroundPoint({ longitude: 139.7, latitude: 35.6 }, 25);

    expect(bbox.minX).toBeLessThan(139.7);
    expect(bbox.maxX).toBeGreaterThan(139.7);
    expect(bbox.minY).toBeLessThan(35.6);
    expect(bbox.maxY).toBeGreaterThan(35.6);
    expect(bbox.maxY - bbox.minY).toBeCloseTo(0.00045, 4);
    expect(bbox.maxX - bbox.minX).toBeCloseTo(0.00055, 4);
  });
});

describe("distanceBetweenPointsMeters", () => {
  it("近距離の2地点間をメートルで返す", () => {
    const distance = distanceBetweenPointsMeters(
      { longitude: 139.767_125, latitude: 35.681_236 },
      { longitude: 139.767_125, latitude: 35.690_23 },
    );

    expect(distance).toBeCloseTo(1_000, -1);
  });
});
