import { deserialize } from "flatgeobuf/lib/mjs/geojson.js";

const defaultUrl =
  "https://pub-693bf287b1de440db5698e0b65ff13c7.r2.dev/risk-data/v1/query/a31a/tokyo.fgb";
const url = process.env.RISK_DATA_A31A_URL ?? defaultUrl;
const rect = {
  minX: 139.69,
  minY: 35.56,
  maxX: 139.71,
  maxY: 35.58,
};

const originalFetch = globalThis.fetch;
const requestedRanges = [];

globalThis.fetch = (input, init = {}) => {
  const headers = new Headers(init.headers);
  const range = headers.get("Range");
  if (range) requestedRanges.push(range);
  return originalFetch(input, init);
};

let featureCount = 0;
for await (const feature of deserialize(url, rect, undefined, true)) {
  const properties = feature.properties;
  if (
    !properties ||
    typeof properties.river_id !== "string" ||
    typeof properties.river_name !== "string" ||
    typeof properties.depth_code !== "number" ||
    typeof properties.depth_label !== "string"
  ) {
    throw new Error("remote FlatGeobuf contains an invalid A31a feature");
  }
  featureCount += 1;
}

if (featureCount === 0) {
  throw new Error("bbox query returned no A31a features");
}
if (requestedRanges.length === 0) {
  throw new Error("bbox query did not make any HTTP Range requests");
}

console.log(
  `verified remote bbox query: ${featureCount} candidate features, ${requestedRanges.length} Range requests`,
);
