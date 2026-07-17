#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOCK_FILE="$ROOT_DIR/data-manifest/sources.lock.json"
WORK_DIR="${RISK_DATA_WORK_DIR:-"$ROOT_DIR/.data"}"
VERSION_DIR="$WORK_DIR/output/risk-data/v1"
PMTILES_PATH="$VERSION_DIR/map/a31a.pmtiles"
EXPECTED_FIELDS="dataset_id,prefecture_code,source_file,river_id,river_name,manager_code,manager_name,depth_code,depth_label,depth_min_m,depth_max_m"

if [[ ! -f "$PMTILES_PATH" ]]; then
  echo "PMTiles not found: $PMTILES_PATH" >&2
  exit 1
fi

TOTAL_FEATURE_COUNT=0
while IFS= read -r source_json; do
  PREFECTURE_NAME="$(jq -r '.prefectureName' <<<"$source_json")"
  PREFECTURE_SLUG="$(jq -r '.prefectureSlug' <<<"$source_json")"
  FGB_PATH="$VERSION_DIR/query/a31a/$PREFECTURE_SLUG.fgb"

  if [[ ! -f "$FGB_PATH" ]]; then
    echo "FlatGeobuf not found: $FGB_PATH" >&2
    exit 1
  fi

  SUMMARY="$(ogrinfo -json -so -al "$FGB_PATH")"
  DRIVER="$(jq -r '.driverShortName' <<<"$SUMMARY")"
  FEATURE_COUNT="$(jq -r '.layers[0].featureCount' <<<"$SUMMARY")"
  GEOMETRY_TYPE="$(jq -r '.layers[0].geometryFields[0].type' <<<"$SUMMARY")"
  EPSG_CODE="$(jq -r '.layers[0].geometryFields[0].coordinateSystem.projjson.id.code' <<<"$SUMMARY")"
  FIELD_NAMES="$(jq -r '.layers[0].fields[].name' <<<"$SUMMARY" | paste -sd ',' -)"

  if [[ "$DRIVER" != "FlatGeobuf" ]]; then
    echo "unexpected driver for $PREFECTURE_NAME: $DRIVER" >&2
    exit 1
  fi
  if [[ "$FEATURE_COUNT" -le 0 ]]; then
    echo "no features found for $PREFECTURE_NAME" >&2
    exit 1
  fi
  if [[ "$GEOMETRY_TYPE" != "MultiPolygon" ]]; then
    echo "unexpected geometry type for $PREFECTURE_NAME: $GEOMETRY_TYPE" >&2
    exit 1
  fi
  if [[ "$EPSG_CODE" != "4326" ]]; then
    echo "unexpected CRS for $PREFECTURE_NAME: EPSG:$EPSG_CODE" >&2
    exit 1
  fi
  if [[ "$FIELD_NAMES" != "$EXPECTED_FIELDS" ]]; then
    echo "unexpected fields for $PREFECTURE_NAME: $FIELD_NAMES" >&2
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
    echo "invalid depth features for $PREFECTURE_NAME: $INVALID_DEPTH_COUNT" >&2
    exit 1
  fi

  TOTAL_FEATURE_COUNT=$((TOTAL_FEATURE_COUNT + FEATURE_COUNT))
  echo "validated $PREFECTURE_NAME: $FEATURE_COUNT features"
done < <(jq -c '.sources[] | select(.dataset == "A31a")' "$LOCK_FILE")

MANIFEST_DATASET_COUNT="$(jq '.datasets | length' "$VERSION_DIR/manifest.json")"
COVERAGE_PREFECTURE_COUNT="$(jq '.a31a.prefectures | length' "$VERSION_DIR/coverage.json")"
CHECKSUM_FILE_COUNT="$(jq '.files | length' "$VERSION_DIR/checksums.json")"

if [[ "$MANIFEST_DATASET_COUNT" -ne 7 ]]; then
  echo "unexpected manifest dataset count: $MANIFEST_DATASET_COUNT" >&2
  exit 1
fi
if [[ "$COVERAGE_PREFECTURE_COUNT" -ne 7 ]]; then
  echo "unexpected coverage prefecture count: $COVERAGE_PREFECTURE_COUNT" >&2
  exit 1
fi
if [[ "$CHECKSUM_FILE_COUNT" -ne 8 ]]; then
  echo "unexpected checksum file count: $CHECKSUM_FILE_COUNT" >&2
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

echo "validated A31a: $TOTAL_FEATURE_COUNT features across 7 prefectures"
echo "validated PMTiles: $PMTILES_TYPE, zoom $PMTILES_MIN_ZOOM-$PMTILES_MAX_ZOOM"
