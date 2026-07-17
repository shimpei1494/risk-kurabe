import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon } from "geojson";

import {
  evaluateFloodMatches,
  type EvaluatedFloodResult,
  type FloodCoverageStatus,
  type FloodPolygonMatch,
} from "../domain/flood-evaluator";
import { nearestPolygonBoundaryPoint, pointBeyondBoundary, type GeoPoint } from "./geometry";

export interface A31aProperties {
  dataset_id: string;
  source_file: string;
  river_id: string;
  river_name: string;
  manager_code: string;
  manager_name: string;
  depth_code: number;
  depth_label: string;
  depth_min_m: number;
  depth_max_m: number | null;
}

export type A31aFeature = Feature<Polygon | MultiPolygon, A31aProperties>;

function featureId(feature: A31aFeature, index: number): string {
  return feature.id === undefined
    ? `${feature.properties.source_file}:${index}`
    : String(feature.id);
}

function matchingA31aFeatures(
  location: GeoPoint,
  candidates: readonly A31aFeature[],
): readonly A31aFeature[] {
  const locationPoint = turfPoint([location.longitude, location.latitude]);
  return candidates.filter((candidate) =>
    booleanPointInPolygon(locationPoint, candidate, { ignoreBoundary: false }),
  );
}

function a31aFeatureToMatch(feature: A31aFeature, index: number): FloodPolygonMatch {
  const properties = feature.properties;
  return {
    datasetId: properties.dataset_id,
    featureId: featureId(feature, index),
    riverOrBasinId: properties.river_id,
    riverOrBasinName: properties.river_name,
    depth: {
      sourceCode: String(properties.depth_code),
      sourceLabel: properties.depth_label,
      minMeters: properties.depth_min_m,
      maxMeters: properties.depth_max_m,
    },
  };
}

export function evaluateA31aAtPoint(
  location: GeoPoint,
  candidates: readonly A31aFeature[],
  coverageStatus: FloodCoverageStatus,
): EvaluatedFloodResult {
  const matches = matchingA31aFeatures(location, candidates).map(a31aFeatureToMatch);
  return evaluateFloodMatches(matches, coverageStatus);
}

function resultKey(result: EvaluatedFloodResult): string {
  if (result.state !== "value" || !result.primary) return result.state;
  const depth = result.primary.depth;
  return `value:${depth.sourceLabel}:${depth.minMeters}:${depth.maxMeters ?? "infinity"}`;
}

/**
 * 候補ポリゴンの境界を25m以内で探し、その境界をわずかに越えた点で
 * 指標全体の主結果が変わる場合だけ警告する。重複ポリゴンが同じ判定を
 * 維持する場合は警告しない。
 */
export function hasA31aBoundaryWarning(
  location: GeoPoint,
  candidates: readonly A31aFeature[],
  coverageStatus: FloodCoverageStatus,
  radiusMeters = 25,
): boolean {
  const currentKey = resultKey(evaluateA31aAtPoint(location, candidates, coverageStatus));

  for (const candidate of candidates) {
    const boundary = nearestPolygonBoundaryPoint(location, candidate);
    if (boundary.distanceMeters > radiusMeters) continue;
    if (boundary.distanceMeters <= 0.001) return true;

    const remainingDistance = radiusMeters - boundary.distanceMeters;
    const stepMeters = Math.max(0.001, Math.min(0.05, remainingDistance / 2));
    const otherSide = pointBeyondBoundary(location, boundary, stepMeters);
    const otherKey = resultKey(evaluateA31aAtPoint(otherSide, candidates, coverageStatus));
    if (otherKey !== currentKey) return true;
  }

  return false;
}
