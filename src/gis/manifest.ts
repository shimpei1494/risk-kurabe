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

const a53DatasetSchema = datasetBaseSchema.extend({
  indicator: z.literal("a53-frequency-flood-depth"),
  prefectures: z.array(z.string().regex(/^\d{2}$/)).min(1),
  basinCodes: z.array(z.string().regex(/^\d{6}$/)).min(1),
  rainfallDenominator: z.number().int().positive(),
  artifact: artifactSchema,
  mapArtifact: mapArtifactSchema,
});

const datasetSchema = z.discriminatedUnion("indicator", [a31aDatasetSchema, a53DatasetSchema]);

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
  a53: z
    .object({
      basins: z.record(
        z.string().regex(/^\d{6}$/),
        z.object({
          name: z.string().min(1),
          a31aLinkStatus: z.enum(["linked", "unmatched"]),
          a31aLinkReason: z.string().min(1).nullable().optional(),
          returnPeriods: z.record(
            z.string().regex(/^\d+$/),
            z.object({
              status: coverageStatusSchema,
              datasetId: z.string().min(1).optional(),
            }),
          ),
        }),
      ),
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

export function a31aMapArtifactUrl({
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
  return dataset?.mapArtifact ? urlFromBase(baseUrl, dataset.mapArtifact.path) : undefined;
}

type A53Dataset = Extract<
  RiskDataManifest["datasets"][number],
  { indicator: "a53-frequency-flood-depth" }
>;

function a53DatasetForReturnPeriod(
  manifest: RiskDataManifest,
  rainfallDenominator: number,
): A53Dataset | undefined {
  return manifest.datasets.find(
    (dataset): dataset is A53Dataset =>
      dataset.indicator === "a53-frequency-flood-depth" &&
      dataset.rainfallDenominator === rainfallDenominator,
  );
}

export function a53ArtifactUrl({
  baseUrl,
  manifest,
  rainfallDenominator,
}: {
  baseUrl: string;
  manifest: RiskDataManifest;
  rainfallDenominator: number;
}): string | undefined {
  const dataset = a53DatasetForReturnPeriod(manifest, rainfallDenominator);
  return dataset ? urlFromBase(baseUrl, dataset.artifact.path) : undefined;
}

export function a53MapArtifactUrl({
  baseUrl,
  manifest,
  rainfallDenominator,
}: {
  baseUrl: string;
  manifest: RiskDataManifest;
  rainfallDenominator: number;
}): string | undefined {
  const dataset = a53DatasetForReturnPeriod(manifest, rainfallDenominator);
  return dataset ? urlFromBase(baseUrl, dataset.mapArtifact.path) : undefined;
}
