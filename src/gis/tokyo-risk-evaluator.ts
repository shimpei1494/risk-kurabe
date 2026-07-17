import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon } from "geojson";

import type { FloodCoverageStatus } from "../domain/flood-evaluator";
import type { DataStateKind, RegionalRiskRank } from "../domain/risk";
import { nearestPolygonBoundaryPoint, pointBeyondBoundary, type GeoPoint } from "./geometry";

export interface TokyoRegionalRiskProperties {
  dataset_id: string;
  source_id: number;
  town_key: string;
  municipality_name: string;
  town_name: string;
  ground_classification: string;
  building_collapse_score: number;
  building_collapse_order: number;
  building_collapse_rank: RegionalRiskRank;
  fire_score: number;
  fire_order: number;
  fire_rank: RegionalRiskRank;
  activity_difficulty: number;
  overall_score: number;
  overall_order: number;
  overall_rank: RegionalRiskRank;
}

export type TokyoRegionalRiskFeature = Feature<Polygon | MultiPolygon, TokyoRegionalRiskProperties>;

export interface EvaluatedTokyoRegionalRisk {
  state: Extract<
    DataStateKind,
    "value" | "outOfArea" | "unpublished" | "notApplicable" | "undetermined"
  >;
  primary?: TokyoRegionalRiskProperties;
  evidences: readonly TokyoRegionalRiskProperties[];
}

export interface TokyoBoundaryWarnings {
  buildingCollapse: boolean;
  fire: boolean;
}

function matchesAtPoint(
  location: GeoPoint,
  candidates: readonly TokyoRegionalRiskFeature[],
): readonly TokyoRegionalRiskFeature[] {
  const locationPoint = turfPoint([location.longitude, location.latitude]);
  return candidates.filter((candidate) =>
    booleanPointInPolygon(locationPoint, candidate, { ignoreBoundary: false }),
  );
}

function sortedProperties(
  features: readonly TokyoRegionalRiskFeature[],
): readonly TokyoRegionalRiskProperties[] {
  return features
    .map(({ properties }) => properties)
    .sort((a, b) => a.town_key.localeCompare(b.town_key) || a.source_id - b.source_id);
}

export function evaluateTokyoRegionalRiskAtPoint({
  location,
  candidates,
  coverageStatus,
  isTokyo,
}: {
  location: GeoPoint;
  candidates: readonly TokyoRegionalRiskFeature[];
  coverageStatus: FloodCoverageStatus;
  isTokyo: boolean;
}): EvaluatedTokyoRegionalRisk {
  if (!isTokyo) return { state: "notApplicable", evidences: [] };

  const evidences = sortedProperties(matchesAtPoint(location, candidates));
  const primary = evidences[0];
  if (primary) return { state: "value", primary, evidences };

  const stateByCoverage = {
    available: "outOfArea",
    failed: "undetermined",
    partial: "undetermined",
    unknown: "undetermined",
    unpublished: "unpublished",
  } as const satisfies Record<
    FloodCoverageStatus,
    Exclude<EvaluatedTokyoRegionalRisk["state"], "value" | "notApplicable">
  >;
  return { state: stateByCoverage[coverageStatus], evidences };
}

function riskKey(
  result: EvaluatedTokyoRegionalRisk,
  indicator: "buildingCollapse" | "fire",
): string {
  if (result.state !== "value" || !result.primary) return result.state;
  const rank =
    indicator === "buildingCollapse"
      ? result.primary.building_collapse_rank
      : result.primary.fire_rank;
  return `value:${rank}`;
}

export function tokyoBoundaryWarnings({
  location,
  candidates,
  coverageStatus,
  radiusMeters = 25,
}: {
  location: GeoPoint;
  candidates: readonly TokyoRegionalRiskFeature[];
  coverageStatus: FloodCoverageStatus;
  radiusMeters?: number;
}): TokyoBoundaryWarnings {
  const evaluate = (point: GeoPoint) =>
    evaluateTokyoRegionalRiskAtPoint({
      location: point,
      candidates,
      coverageStatus,
      isTokyo: true,
    });
  const current = evaluate(location);
  const warnings: TokyoBoundaryWarnings = { buildingCollapse: false, fire: false };

  for (const candidate of candidates) {
    const boundary = nearestPolygonBoundaryPoint(location, candidate);
    if (boundary.distanceMeters > radiusMeters) continue;
    if (boundary.distanceMeters <= 0.001) {
      return { buildingCollapse: true, fire: true };
    }

    const remainingDistance = radiusMeters - boundary.distanceMeters;
    const stepMeters = Math.max(0.001, Math.min(0.05, remainingDistance / 2));
    const other = evaluate(pointBeyondBoundary(location, boundary, stepMeters));
    if (riskKey(other, "buildingCollapse") !== riskKey(current, "buildingCollapse")) {
      warnings.buildingCollapse = true;
    }
    if (riskKey(other, "fire") !== riskKey(current, "fire")) warnings.fire = true;
    if (warnings.buildingCollapse && warnings.fire) return warnings;
  }

  return warnings;
}
