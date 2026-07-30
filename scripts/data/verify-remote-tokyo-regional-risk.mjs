import { deserialize } from "flatgeobuf/lib/mjs/geojson.js";

const defaultBaseUrl = "https://pub-bc1c84661928416fbcde6535c9039c50.r2.dev/risk-data/v1/";
const baseUrl = process.env.RISK_DATA_BASE_URL ?? defaultBaseUrl;
const artifactUrl = new URL("query/tokyo/regional-risk.fgb", baseUrl).toString();
const rect = {
  minX: 139.74,
  minY: 35.695,
  maxX: 139.755,
  maxY: 35.71,
};

const [manifestResponse, coverageResponse] = await Promise.all([
  fetch(new URL("manifest.json", baseUrl)),
  fetch(new URL("coverage.json", baseUrl)),
]);
if (!manifestResponse.ok || !coverageResponse.ok) {
  throw new Error("remote Tokyo regional risk metadata is unavailable");
}

const manifest = await manifestResponse.json();
const coverage = await coverageResponse.json();
const dataset = manifest.datasets?.find(({ indicator }) => indicator === "tokyo-regional-risk");
if (!dataset || dataset.townCount !== 5192) {
  throw new Error("remote manifest does not contain 5192 Tokyo towns");
}
if (coverage.tokyoRegionalRisk?.status !== "available") {
  throw new Error("remote Tokyo regional risk coverage is unavailable");
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
    typeof properties.town_key !== "string" ||
    typeof properties.municipality_name !== "string" ||
    typeof properties.town_name !== "string" ||
    typeof properties.building_collapse_rank !== "number" ||
    typeof properties.fire_rank !== "number"
  ) {
    throw new Error("remote FlatGeobuf contains an invalid Tokyo regional risk feature");
  }
  featureCount += 1;
}

if (featureCount === 0) {
  throw new Error("remote Tokyo regional risk bbox query returned no features");
}
if (requestedRanges.length === 0) {
  throw new Error("remote Tokyo regional risk query did not make HTTP Range requests");
}

console.log(
  `verified remote Tokyo regional risk: 5192 towns, ${featureCount} bbox candidates, ${requestedRanges.length} Range requests`,
);
