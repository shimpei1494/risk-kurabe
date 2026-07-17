import { deserialize } from "flatgeobuf/lib/mjs/geojson.js";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { z } from "zod";

import type { A31aFeature, A31aProperties } from "./a31a-evaluator";
import { bboxAroundPoint, type GeoPoint } from "./geometry";

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
