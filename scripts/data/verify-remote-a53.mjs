import { deserialize } from "flatgeobuf/lib/mjs/geojson.js";

const defaultBaseUrl = "https://pub-bc1c84661928416fbcde6535c9039c50.r2.dev/risk-data/v1/";
const baseUrl = process.env.RISK_DATA_BASE_URL ?? defaultBaseUrl;
const manifestUrl = new URL("manifest.json", baseUrl);
const coverageUrl = new URL("coverage.json", baseUrl);
const artifactUrl = new URL("query/a53/010/kanto.fgb", baseUrl).toString();
const rect = {
  minX: 140.4,
  minY: 36.47,
  maxX: 140.62,
  maxY: 36.61,
};

const [manifestResponse, coverageResponse] = await Promise.all([
  fetch(manifestUrl),
  fetch(coverageUrl),
]);
if (!manifestResponse.ok || !coverageResponse.ok) {
  throw new Error("remote A53 metadata is unavailable");
}

const manifest = await manifestResponse.json();
const coverage = await coverageResponse.json();
const a53Datasets = manifest.datasets?.filter(
  ({ indicator }) => indicator === "a53-frequency-flood-depth",
);
if (a53Datasets?.length !== 6) {
  throw new Error(`expected 6 remote A53 datasets, found ${a53Datasets?.length ?? 0}`);
}
if (Object.keys(coverage.a53?.basins ?? {}).length !== 7) {
  throw new Error("remote A53 coverage does not contain 7 basins");
}

const originalFetch = globalThis.fetch;
const requestedRanges = [];
globalThis.fetch = (input, init = {}) => {
  const headers = new Headers(init.headers);
  const range = headers.get("Range");
  if (range) requestedRanges.push(range);
  return originalFetch(input, init);
};

let featureCount = 0;
for await (const feature of deserialize(artifactUrl, rect, undefined, true)) {
  const properties = feature.properties;
  if (
    !properties ||
    typeof properties.basin_code !== "string" ||
    typeof properties.basin_name !== "string" ||
    typeof properties.depth_code !== "number" ||
    typeof properties.depth_label !== "string" ||
    properties.rainfall_denominator !== 10
  ) {
    throw new Error("remote FlatGeobuf contains an invalid A53 feature");
  }
  featureCount += 1;
}

if (featureCount === 0) {
  throw new Error("remote A53 bbox query returned no features");
}
if (requestedRanges.length === 0) {
  throw new Error("remote A53 bbox query did not make HTTP Range requests");
}

console.log(
  `verified remote A53: 6 datasets, 7 basins, ${featureCount} bbox candidates, ${requestedRanges.length} Range requests`,
);
