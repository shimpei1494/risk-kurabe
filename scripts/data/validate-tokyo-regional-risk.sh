#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORK_DIR="${RISK_DATA_WORK_DIR:-"$ROOT_DIR/.data"}"
VERSION_DIR="$WORK_DIR/output/risk-data/v3"
FGB_PATH="$VERSION_DIR/query/tokyo/regional-risk.fgb"
BUILDING_PMTILES_PATH="$VERSION_DIR/map/tokyo-building-collapse.pmtiles"
OVERALL_PMTILES_PATH="$VERSION_DIR/map/tokyo-overall-risk.pmtiles"
FIRE_PMTILES_PATH="$VERSION_DIR/map/tokyo-fire.pmtiles"
EXPECTED_FIELDS="dataset_id,source_id,town_key,municipality_name,town_name,ground_classification,building_collapse_score,building_collapse_order,building_collapse_rank,fire_score,fire_order,fire_rank,activity_difficulty,overall_score,overall_order,overall_rank"

for artifact_path in "$FGB_PATH" "$OVERALL_PMTILES_PATH" "$BUILDING_PMTILES_PATH" "$FIRE_PMTILES_PATH"; do
  if [[ ! -f "$artifact_path" ]]; then
    echo "artifact not found: $artifact_path" >&2
    exit 1
  fi
done

SUMMARY="$(ogrinfo -json -so -al "$FGB_PATH")"
DRIVER="$(jq -r '.driverShortName' <<<"$SUMMARY")"
FEATURE_COUNT="$(jq -r '.layers[0].featureCount' <<<"$SUMMARY")"
GEOMETRY_TYPE="$(jq -r '.layers[0].geometryFields[0].type' <<<"$SUMMARY")"
EPSG_CODE="$(jq -r '.layers[0].geometryFields[0].coordinateSystem.projjson.id.code' <<<"$SUMMARY")"
FIELD_NAMES="$(jq -r '.layers[0].fields[].name' <<<"$SUMMARY" | paste -sd ',' -)"

if [[ "$DRIVER" != "FlatGeobuf" ]]; then
  echo "unexpected driver: $DRIVER" >&2
  exit 1
fi
if [[ "$FEATURE_COUNT" -ne 5192 ]]; then
  echo "unexpected town count: $FEATURE_COUNT" >&2
  exit 1
fi
if [[ "$GEOMETRY_TYPE" != "MultiPolygon" ]]; then
  echo "unexpected geometry type: $GEOMETRY_TYPE" >&2
  exit 1
fi
if [[ "$EPSG_CODE" != "4326" ]]; then
  echo "unexpected CRS: EPSG:$EPSG_CODE" >&2
  exit 1
fi
if [[ "$FIELD_NAMES" != "$EXPECTED_FIELDS" ]]; then
  echo "unexpected fields: $FIELD_NAMES" >&2
  exit 1
fi

INVALID_COUNT="$(
  ogrinfo \
    -json \
    -features \
    -ro \
    -dialect SQLite \
    -sql 'SELECT COUNT(*) AS invalid_count FROM regional_risk WHERE town_key IS NULL OR municipality_name IS NULL OR town_name IS NULL OR ground_classification IS NULL OR building_collapse_rank NOT BETWEEN 1 AND 5 OR fire_rank NOT BETWEEN 1 AND 5 OR building_collapse_score IS NULL OR fire_score IS NULL' \
    "$FGB_PATH" |
    jq -r '.layers[0].features[0].properties.invalid_count'
)"
UNIQUE_TOWN_COUNT="$(
  ogrinfo \
    -json \
    -features \
    -ro \
    -dialect SQLite \
    -sql 'SELECT COUNT(DISTINCT town_key) AS town_count FROM regional_risk' \
    "$FGB_PATH" |
    jq -r '.layers[0].features[0].properties.town_count'
)"

if [[ "$INVALID_COUNT" -ne 0 ]]; then
  echo "invalid regional risk features: $INVALID_COUNT" >&2
  exit 1
fi
if [[ "$UNIQUE_TOWN_COUNT" -ne 5192 ]]; then
  echo "town keys are not unique: $UNIQUE_TOWN_COUNT" >&2
  exit 1
fi

for pmtiles_path in "$OVERALL_PMTILES_PATH" "$BUILDING_PMTILES_PATH" "$FIRE_PMTILES_PATH"; do
  PMTILES_HEADER="$(pmtiles show "$pmtiles_path" --header-json)"
  PMTILES_TYPE="$(jq -r '.tile_type' <<<"$PMTILES_HEADER")"
  PMTILES_MIN_ZOOM="$(jq -r '.minzoom' <<<"$PMTILES_HEADER")"
  PMTILES_MAX_ZOOM="$(jq -r '.maxzoom' <<<"$PMTILES_HEADER")"
  if [[ "$PMTILES_TYPE" != "mvt" ]]; then
    echo "unexpected PMTiles type: $PMTILES_TYPE" >&2
    exit 1
  fi
  if [[ "$PMTILES_MIN_ZOOM" -ne 8 || "$PMTILES_MAX_ZOOM" -ne 16 ]]; then
    echo "unexpected PMTiles zoom: $PMTILES_MIN_ZOOM-$PMTILES_MAX_ZOOM" >&2
    exit 1
  fi
  pmtiles verify "$pmtiles_path"
done

TOKYO_DATASET_COUNT="$(
  jq '[.datasets[] | select(.indicator == "tokyo-regional-risk")] | length' \
    "$VERSION_DIR/manifest.json"
)"
DATA_VERSION="$(jq -r '.dataVersion' "$VERSION_DIR/manifest.json")"
LEGACY_A31A_DATASET_COUNT="$(
  jq '[.datasets[] | select(.indicator == "a31a-maximum-flood-depth")] | length' \
    "$VERSION_DIR/manifest.json"
)"
LEGACY_A31A_FILE_COUNT="$(
  jq '[.files | keys[] | select(startswith("query/a31a/") or . == "map/a31a.pmtiles")] | length' \
    "$VERSION_DIR/checksums.json"
)"
TOKYO_CHECKSUM_COUNT="$(
  jq '[
    .files
    | keys[]
    | select(
        . == "query/tokyo/regional-risk.fgb"
        or . == "map/tokyo-overall-risk.pmtiles"
        or . == "map/tokyo-building-collapse.pmtiles"
        or . == "map/tokyo-fire.pmtiles"
      )
  ] | length' \
    "$VERSION_DIR/checksums.json"
)"
COVERAGE_TOWN_COUNT="$(jq '.tokyoRegionalRisk.townCount' "$VERSION_DIR/coverage.json")"

if [[ "$TOKYO_DATASET_COUNT" -ne 1 ]]; then
  echo "unexpected Tokyo dataset count: $TOKYO_DATASET_COUNT" >&2
  exit 1
fi
if [[ "$DATA_VERSION" != "v3" ]]; then
  echo "unexpected data version: $DATA_VERSION" >&2
  exit 1
fi
if [[ "$LEGACY_A31A_DATASET_COUNT" -ne 0 || "$LEGACY_A31A_FILE_COUNT" -ne 0 ]]; then
  echo "legacy A31a artifacts must not be included in v3" >&2
  exit 1
fi
if [[ "$TOKYO_CHECKSUM_COUNT" -ne 4 ]]; then
  echo "unexpected Tokyo checksum count: $TOKYO_CHECKSUM_COUNT" >&2
  exit 1
fi
if [[ "$COVERAGE_TOWN_COUNT" -ne 5192 ]]; then
  echo "unexpected Tokyo coverage town count: $COVERAGE_TOWN_COUNT" >&2
  exit 1
fi

echo "validated Tokyo regional risk: 5192 towns, 51 municipalities"
