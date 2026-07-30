#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORK_DIR="${RISK_DATA_WORK_DIR:-"$ROOT_DIR/.data"}"
VERSION_DIR="$WORK_DIR/output/risk-data/v1"
RETURN_PERIODS=(010 030 050 100 150 200)
EXPECTED_FIELDS="dataset_id,source_file,basin_code,basin_name,depth_code_3,depth_code_6,depth_scale,depth_code,depth_label,depth_min_m,depth_max_m,rainfall_denominator"
TOTAL_FEATURE_COUNT=0

for return_period in "${RETURN_PERIODS[@]}"; do
  RETURN_PERIOD_NUMBER=$((10#$return_period))
  FGB_PATH="$VERSION_DIR/query/a53/$return_period/kanto.fgb"
  PMTILES_PATH="$VERSION_DIR/map/a53/$return_period.pmtiles"

  if [[ ! -f "$FGB_PATH" ]]; then
    echo "FlatGeobuf not found: $FGB_PATH" >&2
    exit 1
  fi
  if [[ ! -f "$PMTILES_PATH" ]]; then
    echo "PMTiles not found: $PMTILES_PATH" >&2
    exit 1
  fi

  SUMMARY="$(ogrinfo -json -so -al "$FGB_PATH")"
  DRIVER="$(jq -r '.driverShortName' <<<"$SUMMARY")"
  FEATURE_COUNT="$(jq -r '.layers[0].featureCount' <<<"$SUMMARY")"
  GEOMETRY_TYPE="$(jq -r '.layers[0].geometryFields[0].type' <<<"$SUMMARY")"
  EPSG_CODE="$(jq -r '.layers[0].geometryFields[0].coordinateSystem.projjson.id.code' <<<"$SUMMARY")"
  FIELD_NAMES="$(jq -r '.layers[0].fields[].name' <<<"$SUMMARY" | paste -sd ',' -)"

  if [[ "$DRIVER" != "FlatGeobuf" ]]; then
    echo "unexpected driver for A53 1/$RETURN_PERIOD_NUMBER: $DRIVER" >&2
    exit 1
  fi
  if [[ "$FEATURE_COUNT" -le 0 ]]; then
    echo "no features found for A53 1/$RETURN_PERIOD_NUMBER" >&2
    exit 1
  fi
  if [[ "$GEOMETRY_TYPE" != "MultiPolygon" ]]; then
    echo "unexpected geometry type for A53 1/$RETURN_PERIOD_NUMBER: $GEOMETRY_TYPE" >&2
    exit 1
  fi
  if [[ "$EPSG_CODE" != "4326" ]]; then
    echo "unexpected CRS for A53 1/$RETURN_PERIOD_NUMBER: EPSG:$EPSG_CODE" >&2
    exit 1
  fi
  if [[ "$FIELD_NAMES" != "$EXPECTED_FIELDS" ]]; then
    echo "unexpected fields for A53 1/$RETURN_PERIOD_NUMBER: $FIELD_NAMES" >&2
    exit 1
  fi

  INVALID_FEATURE_COUNT="$(
    ogrinfo \
      -json \
      -features \
      -ro \
      -dialect SQLite \
      -sql "SELECT COUNT(*) AS invalid_count FROM a53 WHERE basin_code IS NULL OR basin_name IS NULL OR depth_code NOT BETWEEN 1 AND 6 OR depth_label IS NULL OR depth_min_m IS NULL OR rainfall_denominator != $RETURN_PERIOD_NUMBER" \
      "$FGB_PATH" |
      jq -r '.layers[0].features[0].properties.invalid_count'
  )"
  if [[ "$INVALID_FEATURE_COUNT" -ne 0 ]]; then
    echo "invalid features for A53 1/$RETURN_PERIOD_NUMBER: $INVALID_FEATURE_COUNT" >&2
    exit 1
  fi

  PMTILES_HEADER="$(pmtiles show "$PMTILES_PATH" --header-json)"
  PMTILES_TYPE="$(jq -r '.tile_type' <<<"$PMTILES_HEADER")"
  PMTILES_MIN_ZOOM="$(jq -r '.minzoom' <<<"$PMTILES_HEADER")"
  PMTILES_MAX_ZOOM="$(jq -r '.maxzoom' <<<"$PMTILES_HEADER")"
  if [[ "$PMTILES_TYPE" != "mvt" ]]; then
    echo "unexpected PMTiles type for A53 1/$RETURN_PERIOD_NUMBER: $PMTILES_TYPE" >&2
    exit 1
  fi
  if [[ "$PMTILES_MIN_ZOOM" -ne 8 || "$PMTILES_MAX_ZOOM" -ne 16 ]]; then
    echo "unexpected PMTiles zoom for A53 1/$RETURN_PERIOD_NUMBER" >&2
    exit 1
  fi
  pmtiles verify "$PMTILES_PATH"

  TOTAL_FEATURE_COUNT=$((TOTAL_FEATURE_COUNT + FEATURE_COUNT))
  echo "validated A53 1/$RETURN_PERIOD_NUMBER: $FEATURE_COUNT features"
done

A53_DATASET_COUNT="$(
  jq '[.datasets[] | select(.indicator == "a53-frequency-flood-depth")] | length' \
    "$VERSION_DIR/manifest.json"
)"
A53_BASIN_COUNT="$(jq '.a53.basins | length' "$VERSION_DIR/coverage.json")"
A53_CHECKSUM_COUNT="$(
  jq '[.files | keys[] | select(startswith("query/a53/") or startswith("map/a53/"))] | length' \
    "$VERSION_DIR/checksums.json"
)"
UNMATCHED_BASIN_COUNT="$(
  jq '[.a53.basins[] | select(.a31aLinkStatus == "unmatched")] | length' \
    "$VERSION_DIR/coverage.json"
)"

if [[ "$A53_DATASET_COUNT" -ne 6 ]]; then
  echo "unexpected A53 dataset count: $A53_DATASET_COUNT" >&2
  exit 1
fi
if [[ "$A53_BASIN_COUNT" -ne 7 ]]; then
  echo "unexpected A53 basin count: $A53_BASIN_COUNT" >&2
  exit 1
fi
if [[ "$A53_CHECKSUM_COUNT" -ne 12 ]]; then
  echo "unexpected A53 checksum count: $A53_CHECKSUM_COUNT" >&2
  exit 1
fi

echo "validated A53: $TOTAL_FEATURE_COUNT features, 7 basins, 6 return periods"
echo "A53 basins unmatched to A31a: $UNMATCHED_BASIN_COUNT"
