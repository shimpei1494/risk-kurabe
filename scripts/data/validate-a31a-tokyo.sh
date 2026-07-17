#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORK_DIR="${RISK_DATA_WORK_DIR:-"$ROOT_DIR/.data"}"
FGB_PATH="$WORK_DIR/output/risk-data/v1/query/a31a/tokyo.fgb"
PMTILES_PATH="$WORK_DIR/output/risk-data/v1/map/a31a.pmtiles"

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
EXPECTED_FIELDS="dataset_id,source_file,river_id,river_name,manager_code,manager_name,depth_code,depth_label,depth_min_m,depth_max_m"

if [[ "$DRIVER" != "FlatGeobuf" ]]; then
  echo "unexpected driver: $DRIVER" >&2
  exit 1
fi
if [[ "$FEATURE_COUNT" -le 0 ]]; then
  echo "no features found" >&2
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

INVALID_DEPTH_COUNT="$(
  ogrinfo \
    -json \
    -features \
    -ro \
    -dialect SQLite \
    -sql 'SELECT COUNT(*) AS invalid_count FROM a31a WHERE depth_code NOT BETWEEN 1 AND 6 OR depth_label IS NULL OR depth_min_m IS NULL' \
    "$FGB_PATH" |
    jq -r '.layers[0].features[0].properties.invalid_count'
)"

if [[ "$INVALID_DEPTH_COUNT" -ne 0 ]]; then
  echo "invalid depth features: $INVALID_DEPTH_COUNT" >&2
  exit 1
fi

PMTILES_HEADER="$(pmtiles show "$PMTILES_PATH" --header-json)"
PMTILES_TYPE="$(jq -r '.tile_type' <<<"$PMTILES_HEADER")"
PMTILES_MIN_ZOOM="$(jq -r '.minzoom' <<<"$PMTILES_HEADER")"
PMTILES_MAX_ZOOM="$(jq -r '.maxzoom' <<<"$PMTILES_HEADER")"

if [[ "$PMTILES_TYPE" != "mvt" ]]; then
  echo "unexpected PMTiles tile type: $PMTILES_TYPE" >&2
  exit 1
fi
if [[ "$PMTILES_MIN_ZOOM" -ne 8 || "$PMTILES_MAX_ZOOM" -ne 16 ]]; then
  echo "unexpected PMTiles zoom range: $PMTILES_MIN_ZOOM-$PMTILES_MAX_ZOOM" >&2
  exit 1
fi

pmtiles verify "$PMTILES_PATH"

echo "validated FlatGeobuf: $FEATURE_COUNT features, $GEOMETRY_TYPE, EPSG:$EPSG_CODE"
echo "validated PMTiles: $PMTILES_TYPE, zoom $PMTILES_MIN_ZOOM-$PMTILES_MAX_ZOOM"
