import { z } from "zod";

import type { FloodCoverageStatus } from "../domain/flood-evaluator";

const artifactSchema = z.object({
  path: z.string().min(1),
  contentType: z.literal("application/flatgeobuf"),
  size: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

const mapArtifactSchema = z.object({
  path: z.string().min(1),
  contentType: z.literal("application/vnd.pmtiles"),
  size: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

const datasetBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  referencePeriod: z.string().min(1),
  acquiredAt: z.iso.date(),
  license: z.string().min(1),
  sourceUrl: z.url(),
});

const tokyoRegionalRiskDatasetSchema = datasetBaseSchema.extend({
  indicator: z.literal("tokyo-regional-risk"),
  prefectures: z.tuple([z.literal("13")]),
  townCount: z.number().int().positive(),
  artifact: artifactSchema,
  mapArtifacts: z.object({
    overall: mapArtifactSchema,
    buildingCollapse: mapArtifactSchema,
    fire: mapArtifactSchema,
  }),
});

export const riskDataManifestSchema = z.object({
  schemaVersion: z.literal(1),
  dataVersion: z.string().min(1),
  logicVersion: z.string().min(1),
  datasets: z.array(tokyoRegionalRiskDatasetSchema),
});

const coverageStatusSchema = z.enum([
  "available",
  "partial",
  "unpublished",
  "failed",
  "unknown",
]) satisfies z.ZodType<FloodCoverageStatus>;

export const riskDataCoverageSchema = z.object({
  schemaVersion: z.literal(1),
  dataVersion: z.string().min(1),
  tokyoRegionalRisk: z
    .object({
      prefectureCode: z.literal("13"),
      status: coverageStatusSchema,
      datasetId: z.string().min(1),
      townCount: z.number().int().positive(),
      municipalityCount: z.number().int().positive(),
      excludedAreas: z.array(z.string().min(1)),
    })
    .optional(),
});

export type RiskDataManifest = z.infer<typeof riskDataManifestSchema>;
export type RiskDataCoverage = z.infer<typeof riskDataCoverageSchema>;

function urlFromBase(baseUrl: string, path: string): string {
  const normalizedBase = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const resolvedUrl = new URL(path, normalizedBase);
  if (!resolvedUrl.href.startsWith(normalizedBase.href)) {
    throw new Error("リスクデータの成果物パスが配信元の範囲外です");
  }
  return resolvedUrl.toString();
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`リスクデータの取得に失敗しました: ${response.status}`);
  return response.json();
}

export async function loadRiskDataCatalog(
  baseUrl: string,
  signal?: AbortSignal,
): Promise<{ manifest: RiskDataManifest; coverage: RiskDataCoverage }> {
  const [manifestJson, coverageJson] = await Promise.all([
    fetchJson(urlFromBase(baseUrl, "manifest.json"), signal),
    fetchJson(urlFromBase(baseUrl, "coverage.json"), signal),
  ]);
  const manifest = riskDataManifestSchema.parse(manifestJson);
  const coverage = riskDataCoverageSchema.parse(coverageJson);

  if (manifest.dataVersion !== coverage.dataVersion) {
    throw new Error("manifestとcoverageのデータ版が一致しません");
  }

  return { manifest, coverage };
}

type TokyoRegionalRiskDataset = RiskDataManifest["datasets"][number];

function tokyoRegionalRiskDataset(
  manifest: RiskDataManifest,
): TokyoRegionalRiskDataset | undefined {
  return manifest.datasets.find(
    (dataset): dataset is TokyoRegionalRiskDataset => dataset.indicator === "tokyo-regional-risk",
  );
}

export function tokyoRegionalRiskArtifactUrl({
  baseUrl,
  manifest,
}: {
  baseUrl: string;
  manifest: RiskDataManifest;
}): string | undefined {
  const dataset = tokyoRegionalRiskDataset(manifest);
  return dataset ? urlFromBase(baseUrl, dataset.artifact.path) : undefined;
}

export function tokyoRegionalRiskMapArtifactUrl({
  baseUrl,
  manifest,
  indicator,
}: {
  baseUrl: string;
  manifest: RiskDataManifest;
  indicator: "overall" | "building-collapse" | "fire";
}): string | undefined {
  const dataset = tokyoRegionalRiskDataset(manifest);
  if (!dataset) return undefined;
  const artifact = {
    overall: dataset.mapArtifacts.overall,
    "building-collapse": dataset.mapArtifacts.buildingCollapse,
    fire: dataset.mapArtifacts.fire,
  }[indicator];
  return urlFromBase(baseUrl, artifact.path);
}
