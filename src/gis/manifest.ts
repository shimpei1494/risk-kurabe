import { z } from "zod";

import type { FloodCoverageStatus } from "../domain/flood-evaluator";

const artifactSchema = z.object({
  path: z.string().min(1),
  contentType: z.literal("application/flatgeobuf"),
  size: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

const datasetSchema = z.object({
  id: z.string().min(1),
  indicator: z.literal("a31a-maximum-flood-depth"),
  name: z.string().min(1),
  provider: z.string().min(1),
  referencePeriod: z.string().min(1),
  acquiredAt: z.iso.date(),
  license: z.string().min(1),
  sourceUrl: z.url(),
  prefectures: z.array(z.string().regex(/^\d{2}$/)).min(1),
  artifact: artifactSchema,
});

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
  a31a: z.object({
    prefectures: z.record(
      z.string().regex(/^\d{2}$/),
      z.object({
        status: coverageStatusSchema,
        datasetIds: z.array(z.string().min(1)),
        includedRiverCategories: z.array(z.string().min(1)),
        excludedRiverCategories: z.array(z.string().min(1)),
      }),
    ),
  }),
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

export function a31aArtifactUrl({
  baseUrl,
  manifest,
  prefectureCode,
}: {
  baseUrl: string;
  manifest: RiskDataManifest;
  prefectureCode: string;
}): string | undefined {
  const dataset = manifest.datasets.find(
    ({ indicator, prefectures }) =>
      indicator === "a31a-maximum-flood-depth" && prefectures.includes(prefectureCode),
  );
  return dataset ? urlFromBase(baseUrl, dataset.artifact.path) : undefined;
}
