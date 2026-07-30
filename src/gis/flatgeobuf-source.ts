import { deserialize } from "flatgeobuf/lib/mjs/geojson.js";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { z } from "zod";

import type { A31aFeature, A31aProperties } from "./a31a-evaluator";
import { bboxAroundPoint, type GeoPoint } from "./geometry";
import type { TokyoRegionalRiskFeature, TokyoRegionalRiskProperties } from "./tokyo-risk-evaluator";

const a31aPropertiesSchema = z.object({
  dataset_id: z.string().min(1),
  source_file: z.string().min(1),
  river_id: z.string().min(1),
  river_name: z.string().min(1),
  manager_code: z.string().min(1),
  manager_name: z.string().min(1),
  depth_code: z.number().int().min(1).max(6),
  depth_label: z.string().min(1),
  depth_min_m: z.number().nonnegative(),
  depth_max_m: z.number().positive().nullable(),
}) satisfies z.ZodType<A31aProperties>;

const regionalRiskRankSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const tokyoRegionalRiskPropertiesSchema = z.object({
  dataset_id: z.string().min(1),
  source_id: z.number().int().nonnegative(),
  town_key: z.string().min(1),
  municipality_name: z.string().min(1),
  town_name: z.string().min(1),
  ground_classification: z.string().min(1),
  building_collapse_score: z.number(),
  building_collapse_order: z.number().int().positive(),
  building_collapse_rank: regionalRiskRankSchema,
  fire_score: z.number(),
  fire_order: z.number().int().positive(),
  fire_rank: regionalRiskRankSchema,
  activity_difficulty: z.number(),
  overall_score: z.number(),
  overall_order: z.number().int().positive(),
  overall_rank: regionalRiskRankSchema,
}) satisfies z.ZodType<TokyoRegionalRiskProperties>;

function parseA31aFeature(feature: {
  id?: string | number;
  geometry: Feature["geometry"];
  properties: unknown;
}): A31aFeature {
  if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") {
    throw new Error(`A31aの形状が面ではありません: ${feature.geometry.type}`);
  }

  return {
    type: "Feature",
    id: feature.id,
    geometry: feature.geometry as Polygon | MultiPolygon,
    properties: a31aPropertiesSchema.parse(feature.properties),
  };
}

export async function fetchA31aCandidates({
  url,
  location,
  radiusMeters = 25,
  headers,
}: {
  url: string;
  location: GeoPoint;
  radiusMeters?: number;
  headers?: HeadersInit;
}): Promise<readonly A31aFeature[]> {
  const bbox = bboxAroundPoint(location, radiusMeters);
  const candidates: A31aFeature[] = [];

  for await (const feature of deserialize(url, bbox, undefined, false, headers)) {
    candidates.push(parseA31aFeature(feature));
  }

  return candidates;
}

function parsePolygonFeature<T>(
  feature: {
    id?: string | number;
    geometry: Feature["geometry"];
    properties: unknown;
  },
  datasetName: string,
  schema: z.ZodType<T>,
): Feature<Polygon | MultiPolygon, T> {
  if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") {
    throw new Error(`${datasetName}の形状が面ではありません: ${feature.geometry.type}`);
  }
  return {
    type: "Feature",
    id: feature.id,
    geometry: feature.geometry as Polygon | MultiPolygon,
    properties: schema.parse(feature.properties),
  };
}

async function fetchPolygonCandidates<T>({
  url,
  location,
  radiusMeters,
  headers,
  datasetName,
  schema,
}: {
  url: string;
  location: GeoPoint;
  radiusMeters: number;
  headers?: HeadersInit;
  datasetName: string;
  schema: z.ZodType<T>;
}): Promise<readonly Feature<Polygon | MultiPolygon, T>[]> {
  const bbox = bboxAroundPoint(location, radiusMeters);
  const candidates: Feature<Polygon | MultiPolygon, T>[] = [];
  for await (const feature of deserialize(url, bbox, undefined, false, headers)) {
    candidates.push(parsePolygonFeature(feature, datasetName, schema));
  }
  return candidates;
}

export function fetchTokyoRegionalRiskCandidates({
  url,
  location,
  radiusMeters = 25,
  headers,
}: {
  url: string;
  location: GeoPoint;
  radiusMeters?: number;
  headers?: HeadersInit;
}): Promise<readonly TokyoRegionalRiskFeature[]> {
  return fetchPolygonCandidates({
    url,
    location,
    radiusMeters,
    headers,
    datasetName: "東京都地域危険度",
    schema: tokyoRegionalRiskPropertiesSchema,
  });
}
