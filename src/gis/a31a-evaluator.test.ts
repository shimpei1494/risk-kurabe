import { describe, expect, it } from "vite-plus/test";

import {
  evaluateA31aAtPoint,
  hasA31aBoundaryWarning,
  type A31aFeature,
  type A31aProperties,
} from "./a31a-evaluator";

function properties(
  depthCode: number,
  depthLabel: string,
  depthMin: number,
  depthMax: number | null,
  riverId = "river-1",
): A31aProperties {
  return {
    dataset_id: "a31a-test",
    source_file: `${riverId}.geojson`,
    river_id: riverId,
    river_name: `河川${riverId}`,
    manager_code: "13",
    manager_name: "東京都",
    depth_code: depthCode,
    depth_label: depthLabel,
    depth_min_m: depthMin,
    depth_max_m: depthMax,
  };
}

function square(
  center: [number, number],
  halfSizeDegrees: number,
  featureProperties: A31aProperties,
): A31aFeature {
  const [longitude, latitude] = center;
  return {
    type: "Feature",
    properties: featureProperties,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [longitude - halfSizeDegrees, latitude - halfSizeDegrees],
          [longitude + halfSizeDegrees, latitude - halfSizeDegrees],
          [longitude + halfSizeDegrees, latitude + halfSizeDegrees],
          [longitude - halfSizeDegrees, latitude + halfSizeDegrees],
          [longitude - halfSizeDegrees, latitude - halfSizeDegrees],
        ],
      ],
    },
  };
}

const tokyoPoint = { longitude: 139.7, latitude: 35.6 };

describe("evaluateA31aAtPoint", () => {
  it("bbox候補のうち正確に地点を含むポリゴンだけを採用する", () => {
    const inside = square([139.7, 35.6], 0.001, properties(2, "0.5m以上3.0m未満", 0.5, 3));
    const bboxOnly = square(
      [139.702, 35.6],
      0.0002,
      properties(5, "10.0m以上20.0m未満", 10, 20, "river-outside"),
    );

    const result = evaluateA31aAtPoint(tokyoPoint, [inside, bboxOnly], "available");

    expect(result.state).toBe("value");
    expect(result.primary?.riverOrBasinId).toBe("river-1");
    expect(result.primary?.depth.sourceLabel).toBe("0.5m以上3.0m未満");
  });

  it("重複する河川では最大区分を主結果にし全根拠を残す", () => {
    const shallow = square([139.7, 35.6], 0.001, properties(2, "0.5m以上3.0m未満", 0.5, 3));
    const deep = square(
      [139.7, 35.6],
      0.001,
      properties(4, "5.0m以上10.0m未満", 5, 10, "river-deep"),
    );

    const result = evaluateA31aAtPoint(tokyoPoint, [shallow, deep], "available");

    expect(result.primary?.riverOrBasinId).toBe("river-deep");
    expect(result.evidences).toHaveLength(2);
  });

  it("収録済みカバレッジでポリゴン未一致なら区域外にする", () => {
    expect(evaluateA31aAtPoint(tokyoPoint, [], "available").state).toBe("outOfArea");
  });
});

describe("hasA31aBoundaryWarning", () => {
  it("25m以内で主結果が変わる境界があれば警告する", () => {
    const nearBoundary = square([139.7, 35.6], 0.0002, properties(2, "0.5m以上3.0m未満", 0.5, 3));
    const pointNearEastEdge = { longitude: 139.7001, latitude: 35.6 };

    expect(hasA31aBoundaryWarning(pointNearEastEdge, [nearBoundary], "available")).toBe(true);
  });

  it("25mより遠い境界では警告しない", () => {
    const largeArea = square([139.7, 35.6], 0.001, properties(2, "0.5m以上3.0m未満", 0.5, 3));

    expect(hasA31aBoundaryWarning(tokyoPoint, [largeArea], "available")).toBe(false);
  });

  it("内側のポリゴンを越えても重複領域が同じ主結果を保つ場合は警告しない", () => {
    const inner = square([139.7, 35.6], 0.0002, properties(2, "0.5m以上3.0m未満", 0.5, 3));
    const outer = square(
      [139.7, 35.6],
      0.001,
      properties(2, "0.5m以上3.0m未満", 0.5, 3, "river-outer"),
    );
    const pointNearInnerEdge = { longitude: 139.7001, latitude: 35.6 };

    expect(hasA31aBoundaryWarning(pointNearInnerEdge, [inner, outer], "available")).toBe(false);
  });

  it("境界上の地点は警告する", () => {
    const area = square([139.7, 35.6], 0.0002, properties(2, "0.5m以上3.0m未満", 0.5, 3));
    const pointOnBoundary = { longitude: 139.7002, latitude: 35.6 };

    expect(hasA31aBoundaryWarning(pointOnBoundary, [area], "available")).toBe(true);
  });
});
