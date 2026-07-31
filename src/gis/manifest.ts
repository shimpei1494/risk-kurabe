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

const a31aDatasetSchema = datasetBaseSchema.extend({
  indicator: z.literal("a31a-maximum-flood-depth"),
  prefectures: z.array(z.string().regex(/^\d{2}$/)).min(1),
  artifact: artifactSchema,
  mapArtifact: mapArtifactSchema.optional(),
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

const datasetSchema = z.discriminatedUnion("indicator", [
  a31aDatasetSchema,
  tokyoRegionalRiskDatasetSchema,
]);

export const riskDataManifestSchema = z.object({
  schemaVersion: z.literal(1),
  dataVersion: z.string().min(1),
  logicVersion: z.string().min(1),
  datasets: z.array(datasetSchema),
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
  a31a: z
    .object({
      prefectures: z.record(
        z.string().regex(/^\d{2}$/),
        z.object({
          status: coverageStatusSchema,
          datasetIds: z.array(z.string().min(1)),
          includedRiverCategories: z.array(z.string().min(1)),
          excludedRiverCategories: z.array(z.string().min(1)),
        }),
      ),
    })
    .optional(),
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
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
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

type A31aDataset = Extract<
  RiskDataManifest["datasets"][number],
  { indicator: "a31a-maximum-flood-depth" }
>;

function a31aDatasetForPrefecture(
  manifest: RiskDataManifest,
  prefectureCode: string,
): A31aDataset | undefined {
  return manifest.datasets.find(
    (dataset): dataset is A31aDataset =>
      dataset.indicator === "a31a-maximum-flood-depth" &&
      dataset.prefectures.includes(prefectureCode),
  );
}

export function a31aArtifactUrl({
  baseUrl,
  manifest,
  prefectureCode,
}: {
  baseUrl: string;
  manifest: RiskDataManifest;
  prefectureCode: string;
}): string | undefined {
  const dataset = a31aDatasetForPrefecture(manifest, prefectureCode);
  return dataset ? urlFromBase(baseUrl, dataset.artifact.path) : undefined;
}

export function a31aMapArtifactUrl({
  baseUrl,
  manifest,
  prefectureCode,
}: {
  baseUrl: string;
  manifest: RiskDataManifest;
  prefectureCode: string;
}): string | undefined {
  const dataset = a31aDatasetForPrefecture(manifest, prefectureCode);
  return dataset?.mapArtifact ? urlFromBase(baseUrl, dataset.mapArtifact.path) : undefined;
}

type TokyoRegionalRiskDataset = Extract<
  RiskDataManifest["datasets"][number],
  { indicator: "tokyo-regional-risk" }
>;

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
