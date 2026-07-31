import { z } from "zod";

import type { GeoPoint } from "../../gis/geometry";

const YAHOO_GEOCODER_URL = "https://map.yahooapis.jp/geocode/V1/geoCoder";
const YAHOO_REVERSE_GEOCODER_URL = "https://map.yahooapis.jp/geoapi/V1/reverseGeoCoder";

export interface AddressCandidate {
  id: string;
  address: string;
  point: GeoPoint;
  prefectureCode: string;
  addressMatchingLevel: number | null;
}

export interface ReverseGeocodedAddress {
  address: string;
  prefectureCode: string;
}

const yahooFeatureSchema = z.object({
  Id: z.union([z.string(), z.number()]).transform(String),
  Name: z.string().min(1),
  Geometry: z.object({
    Type: z.literal("point"),
    Coordinates: z.string().min(1),
  }),
  Property: z.object({
    Address: z.string().min(1),
    GovernmentCode: z.union([z.string(), z.number()]).transform(String),
    AddressMatchingLevel: z.union([z.string(), z.number()]).transform(Number).nullable().optional(),
  }),
});

const yahooResponseSchema = z.object({
  Feature: z.union([yahooFeatureSchema, z.array(yahooFeatureSchema)]).optional(),
});

const yahooReverseFeatureSchema = z.object({
  Property: z.object({
    Address: z.string().min(1),
    AddressElement: z
      .array(
        z.object({
          Level: z.string(),
          Code: z.union([z.string(), z.number()]).transform(String).optional(),
          Name: z.string(),
        }),
      )
      .optional(),
  }),
});

const yahooReverseResponseSchema = z.object({
  Feature: z.union([yahooReverseFeatureSchema, z.array(yahooReverseFeatureSchema)]).optional(),
});

export type GeocodingErrorCode =
  | "invalid-query"
  | "not-configured"
  | "not-found"
  | "upstream-unavailable"
  | "invalid-response";

export class GeocodingError extends Error {
  constructor(readonly code: GeocodingErrorCode) {
    super(code);
    this.name = "GeocodingError";
  }
}

function coordinates(value: string): GeoPoint {
  const [longitudeText, latitudeText] = value.split(",");
  const longitude = Number(longitudeText);
  const latitude = Number(latitudeText);
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new GeocodingError("invalid-response");
  }
  return { longitude, latitude };
}

export function normalizeYahooGeocoderResponse(value: unknown): readonly AddressCandidate[] {
  const parsed = yahooResponseSchema.safeParse(value);
  if (!parsed.success) throw new GeocodingError("invalid-response");
  const features = parsed.data.Feature
    ? Array.isArray(parsed.data.Feature)
      ? parsed.data.Feature
      : [parsed.data.Feature]
    : [];

  return features.map((feature) => ({
    id: feature.Id,
    address: feature.Property.Address || feature.Name,
    point: coordinates(feature.Geometry.Coordinates),
    prefectureCode: feature.Property.GovernmentCode.slice(0, 2),
    addressMatchingLevel: feature.Property.AddressMatchingLevel ?? null,
  }));
}

export function normalizeYahooReverseGeocoderResponse(value: unknown): ReverseGeocodedAddress {
  const parsed = yahooReverseResponseSchema.safeParse(value);
  if (!parsed.success) throw new GeocodingError("invalid-response");
  const feature = Array.isArray(parsed.data.Feature) ? parsed.data.Feature[0] : parsed.data.Feature;
  if (!feature) throw new GeocodingError("not-found");

  const prefecture = feature.Property.AddressElement?.find(
    (element) => element.Level === "prefecture",
  );
  const prefectureCode = prefecture?.Code?.slice(0, 2);
  if (!prefectureCode) throw new GeocodingError("invalid-response");

  return {
    address: feature.Property.Address,
    prefectureCode,
  };
}

export async function searchYahooAddresses({
  query,
  clientId,
  fetcher = fetch,
  signal,
}: {
  query: string;
  clientId: string | undefined;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}): Promise<readonly AddressCandidate[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2 || normalizedQuery.length > 200) {
    throw new GeocodingError("invalid-query");
  }
  if (!clientId) throw new GeocodingError("not-configured");

  const url = new URL(YAHOO_GEOCODER_URL);
  url.searchParams.set("appid", clientId);
  url.searchParams.set("query", normalizedQuery);
  url.searchParams.set("output", "json");
  url.searchParams.set("datum", "wgs");
  url.searchParams.set("results", "5");
  url.searchParams.set("recursive", "true");
  url.searchParams.set("sort", "score");

  let response: Response;
  try {
    response = await fetcher(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: signal ?? AbortSignal.timeout(8_000),
    });
  } catch {
    throw new GeocodingError("upstream-unavailable");
  }
  if (!response.ok) throw new GeocodingError("upstream-unavailable");

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new GeocodingError("invalid-response");
  }
  return normalizeYahooGeocoderResponse(json);
}

export async function reverseYahooAddress({
  point,
  clientId,
  fetcher = fetch,
  signal,
}: {
  point: GeoPoint;
  clientId: string | undefined;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}): Promise<ReverseGeocodedAddress> {
  if (!clientId) throw new GeocodingError("not-configured");

  const url = new URL(YAHOO_REVERSE_GEOCODER_URL);
  url.searchParams.set("appid", clientId);
  url.searchParams.set("lat", String(point.latitude));
  url.searchParams.set("lon", String(point.longitude));
  url.searchParams.set("output", "json");
  url.searchParams.set("datum", "wgs");

  let response: Response;
  try {
    response = await fetcher(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: signal ?? AbortSignal.timeout(8_000),
    });
  } catch {
    throw new GeocodingError("upstream-unavailable");
  }
  if (!response.ok) throw new GeocodingError("upstream-unavailable");

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new GeocodingError("invalid-response");
  }
  return normalizeYahooReverseGeocoderResponse(json);
}
