import { describe, expect, it } from "vite-plus/test";

import type { BasinCoverage, FloodPolygonMatch } from "../domain/flood-evaluator";
import {
  evaluateA53AtPoint,
  hasA53BoundaryWarning,
  type A53Feature,
  type A53Properties,
} from "./a53-evaluator";

const location = { longitude: 139.7, latitude: 35.6 };

const a31aMatches: FloodPolygonMatch[] = [
  {
    datasetId: "a31a-test",
    featureId: "a31a-1",
    riverOrBasinId: "830301",
    riverOrBasinName: "利根川",
    depth: {
      sourceCode: "2",
      sourceLabel: "0.5m以上3.0m未満",
      minMeters: 0.5,
      maxMeters: 3,
    },
  },
];
const availableCoverage: BasinCoverage[] = [{ riverOrBasinId: "830301", status: "available" }];

function properties({
  basinCode = "830301",
  depthCode = 2,
  depthLabel = "0.5m以上3.0m未満",
  depthMin = 0.5,
  depthMax = 3,
}: {
  basinCode?: string;
  depthCode?: number;
  depthLabel?: string;
  depthMin?: number;
  depthMax?: number | null;
} = {}): A53Properties {
  return {
    dataset_id: "a53-test-030",
    source_file: `${basinCode}.geojson`,
    basin_code: basinCode,
    basin_name: `水系${basinCode}`,
    depth_code_3: Math.min(depthCode, 3),
    depth_code_6: depthCode,
    depth_scale: "six-level",
    depth_code: depthCode,
    depth_label: depthLabel,
    depth_min_m: depthMin,
    depth_max_m: depthMax,
    rainfall_denominator: 30,
  };
}

function square(
  center: [number, number],
  halfSizeDegrees: number,
  featureProperties: A53Properties,
): A53Feature {
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

describe("evaluateA53AtPoint", () => {
  it("正確な面照合後、A31a一致水系だけから最大区分と全根拠を返す", () => {
    const shallow = square([139.7, 35.6], 0.001, properties());
    const deep = square(
      [139.7, 35.6],
      0.001,
      properties({
        depthCode: 4,
        depthLabel: "5.0m以上10.0m未満",
        depthMin: 5,
        depthMax: 10,
      }),
    );
    const unrelated = square(
      [139.7, 35.6],
      0.001,
      properties({
        basinCode: "830302",
        depthCode: 6,
        depthLabel: "20.0m以上",
        depthMin: 20,
        depthMax: null,
      }),
    );

    const result = evaluateA53AtPoint({
      location,
      candidates: [shallow, deep, unrelated],
      a31aMatches,
      basinCoverage: availableCoverage,
    });

    expect(result.state).toBe("value");
    expect(result.primary?.depth.sourceLabel).toBe("5.0m以上10.0m未満");
    expect(result.evidences).toHaveLength(2);
    expect(result.evidences.every(({ riverOrBasinId }) => riverOrBasinId === "830301")).toBe(true);
  });

  it("収録済み水系で面が一致しなければ区域外にする", () => {
    const result = evaluateA53AtPoint({
      location,
      candidates: [],
      a31aMatches,
      basinCoverage: availableCoverage,
    });
    expect(result.state).toBe("outOfArea");
  });

  it("A31a一致水系が未公開なら未公開にする", () => {
    const result = evaluateA53AtPoint({
      location,
      candidates: [],
      a31aMatches,
      basinCoverage: [{ riverOrBasinId: "830301", status: "unpublished" }],
    });
    expect(result.state).toBe("unpublished");
  });
});

describe("hasA53BoundaryWarning", () => {
  it("25m以内で主結果が変わる境界を警告する", () => {
    const area = square([139.7, 35.6], 0.0002, properties());
    expect(
      hasA53BoundaryWarning({
        location: { longitude: 139.7001, latitude: 35.6 },
        candidates: [area],
        a31aMatches,
        basinCoverage: availableCoverage,
      }),
    ).toBe(true);
  });
});
