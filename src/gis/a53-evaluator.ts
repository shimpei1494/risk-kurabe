import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon } from "geojson";

import {
  evaluateFrequencyFloodMatches,
  type BasinCoverage,
  type EvaluatedFrequencyFloodResult,
  type FloodPolygonMatch,
} from "../domain/flood-evaluator";
import { nearestPolygonBoundaryPoint, pointBeyondBoundary, type GeoPoint } from "./geometry";

export interface A53Properties {
  dataset_id: string;
  source_file: string;
  basin_code: string;
  basin_name: string;
  depth_code_3: number;
  depth_code_6: number | null;
  depth_scale: "three-level" | "six-level";
  depth_code: number;
  depth_label: string;
  depth_min_m: number;
  depth_max_m: number | null;
  rainfall_denominator: number;
}

export type A53Feature = Feature<Polygon | MultiPolygon, A53Properties>;

function featureId(feature: A53Feature, index: number): string {
  return feature.id === undefined
    ? `${feature.properties.source_file}:${index}`
    : String(feature.id);
}

function matchingFeatures(
  location: GeoPoint,
  candidates: readonly A53Feature[],
): readonly A53Feature[] {
  const locationPoint = turfPoint([location.longitude, location.latitude]);
  return candidates.filter((candidate) =>
    booleanPointInPolygon(locationPoint, candidate, { ignoreBoundary: false }),
  );
}

function featureToMatch(feature: A53Feature, index: number): FloodPolygonMatch {
  const properties = feature.properties;
  return {
    datasetId: properties.dataset_id,
    featureId: featureId(feature, index),
    riverOrBasinId: properties.basin_code,
    riverOrBasinName: properties.basin_name,
    depth: {
      sourceCode: String(properties.depth_code),
      sourceLabel: properties.depth_label,
      minMeters: properties.depth_min_m,
      maxMeters: properties.depth_max_m,
    },
  };
}

export function evaluateA53AtPoint({
  location,
  candidates,
  a31aMatches,
  basinCoverage,
}: {
  location: GeoPoint;
  candidates: readonly A53Feature[];
  a31aMatches: readonly FloodPolygonMatch[];
  basinCoverage: readonly BasinCoverage[];
}): EvaluatedFrequencyFloodResult {
  const matches = matchingFeatures(location, candidates).map(featureToMatch);
  return evaluateFrequencyFloodMatches({ a31aMatches, a53Matches: matches, basinCoverage });
}

function resultKey(result: EvaluatedFrequencyFloodResult): string {
  if (result.state !== "value" || !result.primary) return result.state;
  const depth = result.primary.depth;
  return `value:${depth.sourceLabel}:${depth.minMeters}:${depth.maxMeters ?? "infinity"}`;
}

export function hasA53BoundaryWarning({
  location,
  candidates,
  a31aMatches,
  basinCoverage,
  radiusMeters = 25,
}: {
  location: GeoPoint;
  candidates: readonly A53Feature[];
  a31aMatches: readonly FloodPolygonMatch[];
  basinCoverage: readonly BasinCoverage[];
  radiusMeters?: number;
}): boolean {
  const evaluate = (point: GeoPoint) =>
    evaluateA53AtPoint({ location: point, candidates, a31aMatches, basinCoverage });
  const currentKey = resultKey(evaluate(location));

  for (const candidate of candidates) {
    const boundary = nearestPolygonBoundaryPoint(location, candidate);
    if (boundary.distanceMeters > radiusMeters) continue;
    if (boundary.distanceMeters <= 0.001) return true;

    const remainingDistance = radiusMeters - boundary.distanceMeters;
    const stepMeters = Math.max(0.001, Math.min(0.05, remainingDistance / 2));
    const otherKey = resultKey(evaluate(pointBeyondBoundary(location, boundary, stepMeters)));
    if (otherKey !== currentKey) return true;
  }

  return false;
}
