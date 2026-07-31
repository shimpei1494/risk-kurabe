import { z } from "zod";

import type { InvestigationResult } from "../domain/risk";
import type { GeoPoint } from "../gis/geometry";

const dataStateSchema = z.enum([
  "value",
  "outOfArea",
  "unpublished",
  "notApplicable",
  "undetermined",
]);
const floodCategorySchema = z.enum([
  "0.5m未満",
  "0.5〜3m",
  "3〜5m",
  "5〜10m",
  "10〜20m",
  "20m以上",
]);
const floodValueSchema = z.object({
  state: dataStateSchema,
  category: floodCategorySchema.optional(),
  sourceLabel: z.string().optional(),
  boundaryWarning: z.boolean().optional(),
});
const regionalRiskSchema = z.object({
  state: dataStateSchema,
  rank: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  score: z.number().optional(),
  order: z.number().int().positive().optional(),
  boundaryWarning: z.boolean().optional(),
  municipalityName: z.string().optional(),
  townName: z.string().optional(),
});
const problemSchema = z.object({
  code: z.enum([
    "catalog-unavailable",
    "official-flood-tile-unavailable",
    "tokyo-regional-risk-artifact-unavailable",
  ]),
});
const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  referencePeriod: z.string(),
  acquiredAt: z.string(),
  license: z.string(),
  sourceUrl: z.url(),
});

const investigationResultSchema: z.ZodType<InvestigationResult> = z.object({
  maxFloodDepth: floodValueSchema,
  tokyoEarthquakeRisk: regionalRiskSchema.extend({
    activityDifficulty: z.number().optional(),
    groundClassification: z.string().optional(),
  }),
  buildingCollapseRisk: regionalRiskSchema,
  fireRisk: regionalRiskSchema,
  dataVersion: z.string().optional(),
  logicVersion: z.string().optional(),
  problems: z.array(problemSchema),
  sources: z.array(sourceSchema),
  aiSummary: z.string(),
});

const cacheEntrySchema = z.object({
  schemaVersion: z.literal(3),
  result: investigationResultSchema,
});

export interface InvestigationCacheIdentity {
  location: GeoPoint;
  prefectureCode: string;
  dataVersion: string;
  logicVersion: string;
}

type CacheStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function investigationCacheKey({
  location,
  prefectureCode,
  dataVersion,
  logicVersion,
}: InvestigationCacheIdentity): string {
  return [
    "risk-kurabe:investigation:v3",
    dataVersion,
    logicVersion,
    prefectureCode,
    location.longitude.toFixed(6),
    location.latitude.toFixed(6),
  ].join(":");
}

export function readInvestigationCache(
  storage: CacheStorage,
  identity: InvestigationCacheIdentity,
): InvestigationResult | null {
  const key = investigationCacheKey(identity);
  try {
    const serialized = storage.getItem(key);
    if (!serialized) return null;
    const parsed = cacheEntrySchema.safeParse(JSON.parse(serialized));
    if (parsed.success) return parsed.data.result;
  } catch {
    // 破損値は下で削除する。
  }
  try {
    storage.removeItem(key);
  } catch {
    // sessionStorageが利用不可でも地点判定は継続する。
  }
  return null;
}

export function writeInvestigationCache(
  storage: CacheStorage,
  identity: InvestigationCacheIdentity,
  result: InvestigationResult,
): void {
  if (result.problems.length > 0) return;
  try {
    storage.setItem(
      investigationCacheKey(identity),
      JSON.stringify({ schemaVersion: 3, result } satisfies z.input<typeof cacheEntrySchema>),
    );
  } catch {
    // 容量超過・プライベートモードでも地点判定自体は成功させる。
  }
}
