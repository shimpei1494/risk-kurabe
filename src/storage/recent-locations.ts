import { z } from "zod";

import { KANTO_PREFECTURE_CODES } from "../domain/investigation-adapter";
import { prefectureCodeFromAddress } from "../domain/location";
import type { GeoPoint } from "../gis/geometry";

const STORAGE_KEY = "risk-kurabe:recent-locations:v1";
const MAX_RECENT_LOCATIONS = 10;
const EXPIRATION_MS = 90 * 24 * 60 * 60 * 1000;

const recentLocationSchema = z.object({
  address: z.string().min(1).max(300),
  point: z.object({
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
  }),
  lastUsedAt: z.iso.datetime(),
});

const storedRecentLocationsSchema = z.object({
  schemaVersion: z.literal(1),
  locations: z.array(recentLocationSchema).max(MAX_RECENT_LOCATIONS),
});

export interface RecentLocation {
  address: string;
  point: GeoPoint;
  lastUsedAt: string;
}

type LocalStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

function locationKey({ point }: Pick<RecentLocation, "point">): string {
  return `${point.longitude.toFixed(6)}:${point.latitude.toFixed(6)}`;
}

function isSupportedLocation({ address }: Pick<RecentLocation, "address">): boolean {
  return KANTO_PREFECTURE_CODES.has(prefectureCodeFromAddress(address));
}

export function loadRecentLocations(
  storage: LocalStorage,
  now = new Date(),
): readonly RecentLocation[] {
  try {
    const serialized = storage.getItem(STORAGE_KEY);
    if (!serialized) return [];
    const parsed = storedRecentLocationsSchema.safeParse(JSON.parse(serialized));
    if (!parsed.success) {
      storage.removeItem(STORAGE_KEY);
      return [];
    }
    const minimumTime = now.getTime() - EXPIRATION_MS;
    const available = parsed.data.locations.filter(
      (location) =>
        new Date(location.lastUsedAt).getTime() >= minimumTime && isSupportedLocation(location),
    );
    if (available.length !== parsed.data.locations.length) {
      saveAll(storage, available);
    }
    return available;
  } catch {
    return [];
  }
}

function saveAll(storage: LocalStorage, locations: readonly RecentLocation[]): void {
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({ schemaVersion: 1, locations: [...locations] } satisfies z.input<
      typeof storedRecentLocationsSchema
    >),
  );
}

export function rememberLocation(
  storage: LocalStorage,
  location: Omit<RecentLocation, "lastUsedAt">,
  now = new Date(),
): readonly RecentLocation[] {
  if (!isSupportedLocation(location)) {
    return loadRecentLocations(storage, now);
  }
  const nextLocation = { ...location, lastUsedAt: now.toISOString() };
  const key = locationKey(nextLocation);
  const next = [
    nextLocation,
    ...loadRecentLocations(storage, now).filter((item) => locationKey(item) !== key),
  ].slice(0, MAX_RECENT_LOCATIONS);
  try {
    saveAll(storage, next);
  } catch {
    // localStorageが利用不可でも地点調査は継続する。
  }
  return next;
}

export function removeRecentLocation(
  storage: LocalStorage,
  point: GeoPoint,
): readonly RecentLocation[] {
  const key = locationKey({ point });
  const next = loadRecentLocations(storage).filter((item) => locationKey(item) !== key);
  try {
    saveAll(storage, next);
  } catch {
    // localStorageが利用不可でもUI操作は継続する。
  }
  return next;
}

export function clearRecentLocations(storage: LocalStorage): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // localStorageが利用不可でもUI操作は継続する。
  }
}
