#!/usr/bin/env bash

set -euo pipefail
export LC_ALL=C
shopt -s nullglob

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORK_DIR="${RISK_DATA_WORK_DIR:-"$ROOT_DIR/.data"}"
SOURCE_DIR="$WORK_DIR/source"
ARCHIVE_PATH="$SOURCE_DIR/A53-25_83_GEOJSON.zip"
EXTRACT_DIR="$WORK_DIR/extracted/a53-kanto"
INTERMEDIATE_DIR="$WORK_DIR/intermediate"
VERSION_DIR="$WORK_DIR/output/risk-data/v1"
DATASETS_NDJSON="$INTERMEDIATE_DIR/a53-datasets.ndjson"
CHECKSUMS_NDJSON="$INTERMEDIATE_DIR/a53-checksums.ndjson"
COVERAGE_NDJSON="$INTERMEDIATE_DIR/a53-coverage.ndjson"
A31A_BASIN_CODES="$INTERMEDIATE_DIR/a31a-basin-codes.txt"
A53_COVERAGE_JSON="$INTERMEDIATE_DIR/a53-coverage.json"
RETURN_PERIODS=(010 030 050 100 150 200)
PREFECTURES_JSON='["08","09","10","11","12","13","14"]'

bash "$ROOT_DIR/scripts/data/download-sources.sh" A53

if [[ ! -f "$VERSION_DIR/manifest.json" || ! -f "$VERSION_DIR/coverage.json" || ! -f "$VERSION_DIR/checksums.json" ]]; then
  echo "A31a metadata is required; run: vp run data:a31a:build" >&2
  exit 1
fi

rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR" "$INTERMEDIATE_DIR"
: >"$DATASETS_NDJSON"
: >"$CHECKSUMS_NDJSON"
: >"$COVERAGE_NDJSON"
: >"$A31A_BASIN_CODES"

ENTRY_INDEX=0
while IFS= read -r entry_name; do
  if [[ "$entry_name" != *.geojson ]]; then
    continue
  fi
  if [[ ! "$entry_name" =~ ^A53-25_([0-9]{6})_.*_83_([0-9]{3})\.geojson$ ]]; then
    echo "unexpected A53 entry name: $entry_name" >&2
    exit 1
  fi

  BASIN_CODE="${BASH_REMATCH[1]}"
  RETURN_PERIOD="${BASH_REMATCH[2]}"
  ENTRY_INDEX=$((ENTRY_INDEX + 1))
  printf -v SAFE_NAME "a53-%03d-%s-%s.geojson" "$ENTRY_INDEX" "$BASIN_CODE" "$RETURN_PERIOD"
  unzip -p "$ARCHIVE_PATH" "$entry_name" >"$EXTRACT_DIR/$SAFE_NAME"
done < <(unzip -Z1 "$ARCHIVE_PATH")

if [[ "$ENTRY_INDEX" -ne 42 ]]; then
  echo "expected 42 A53 GeoJSON files, found $ENTRY_INDEX" >&2
  exit 1
fi

for a31a_fgb in "$VERSION_DIR"/query/a31a/*.fgb; do
  ogrinfo \
    -json \
    -features \
    -ro \
    -dialect SQLite \
    -sql 'SELECT DISTINCT SUBSTR(river_id, 1, 6) AS basin_code FROM a31a WHERE LENGTH(river_id) >= 6' \
    "$a31a_fgb" |
    jq -r '.layers[0].features[].properties.basin_code' >>"$A31A_BASIN_CODES"
done
sort -u -o "$A31A_BASIN_CODES" "$A31A_BASIN_CODES"

for return_period in "${RETURN_PERIODS[@]}"; do
  RETURN_PERIOD_NUMBER=$((10#$return_period))
  DATASET_ID="a53-2025-kanto-$return_period"
  GPKG_PATH="$INTERMEDIATE_DIR/a53-kanto-$return_period.gpkg"
  MBTILES_PATH="$INTERMEDIATE_DIR/a53-kanto-$return_period.mbtiles"
  FGB_PATH="$VERSION_DIR/query/a53/$return_period/kanto.fgb"
  PMTILES_PATH="$VERSION_DIR/map/a53/$return_period.pmtiles"
  SOURCE_FILES=("$EXTRACT_DIR"/*-"$return_period".geojson)

  if [[ "${#SOURCE_FILES[@]}" -eq 0 ]]; then
    echo "no A53 files found for return period: $return_period" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$FGB_PATH")" "$(dirname "$PMTILES_PATH")"
  IS_FIRST=1
  for source_path in "${SOURCE_FILES[@]}"; do
    SOURCE_FILE="$(basename "$source_path")"
    LAYER_NAME="$(ogrinfo -json -so -al "$source_path" | jq -r '.layers[0].name')"
    SQL="
      SELECT
        *,
        '$DATASET_ID' AS dataset_id,
        '$SOURCE_FILE' AS source_file,
        A53_001 AS basin_code,
        A53_002 AS basin_name,
        A53_003 AS depth_code_3,
        A53_004 AS depth_code_6,
        CASE
          WHEN A53_004 BETWEEN 1 AND 6 THEN 'six-level'
          ELSE 'three-level'
        END AS depth_scale,
        COALESCE(A53_004, A53_003) AS depth_code,
        CASE
          WHEN A53_004 = 1 OR (A53_004 IS NULL AND A53_003 = 1) THEN '0m以上0.5m未満'
          WHEN A53_004 = 2 OR (A53_004 IS NULL AND A53_003 = 2) THEN '0.5m以上3.0m未満'
          WHEN A53_004 = 3 THEN '3.0m以上5.0m未満'
          WHEN A53_004 = 4 THEN '5.0m以上10.0m未満'
          WHEN A53_004 = 5 THEN '10.0m以上20.0m未満'
          WHEN A53_004 = 6 THEN '20.0m以上'
          WHEN A53_004 IS NULL AND A53_003 = 3 THEN '3.0m以上'
        END AS depth_label,
        CASE
          WHEN A53_004 = 1 OR (A53_004 IS NULL AND A53_003 = 1) THEN 0.0
          WHEN A53_004 = 2 OR (A53_004 IS NULL AND A53_003 = 2) THEN 0.5
          WHEN A53_004 = 3 OR (A53_004 IS NULL AND A53_003 = 3) THEN 3.0
          WHEN A53_004 = 4 THEN 5.0
          WHEN A53_004 = 5 THEN 10.0
          WHEN A53_004 = 6 THEN 20.0
        END AS depth_min_m,
        CASE
          WHEN A53_004 = 1 OR (A53_004 IS NULL AND A53_003 = 1) THEN 0.5
          WHEN A53_004 = 2 OR (A53_004 IS NULL AND A53_003 = 2) THEN 3.0
          WHEN A53_004 = 3 THEN 5.0
          WHEN A53_004 = 4 THEN 10.0
          WHEN A53_004 = 5 THEN 20.0
          ELSE NULL
        END AS depth_max_m,
        A53_005 AS rainfall_denominator
      FROM \"$LAYER_NAME\"
    "

    if [[ "$IS_FIRST" -eq 1 ]]; then
      ogr2ogr \
        -f GPKG \
        -overwrite \
        "$GPKG_PATH" \
        "$source_path" \
        -nln a53 \
        -dialect SQLite \
        -sql "$SQL" \
        -makevalid \
        -nlt MULTIPOLYGON \
        -t_srs EPSG:4326
      IS_FIRST=0
    else
      ogr2ogr \
        -f GPKG \
        -update \
        -append \
        "$GPKG_PATH" \
        "$source_path" \
        -nln a53 \
        -dialect SQLite \
        -sql "$SQL" \
        -makevalid \
        -nlt MULTIPOLYGON \
        -t_srs EPSG:4326
    fi
  done

  EMPTY_GEOMETRY_COUNT="$(
    ogrinfo \
      -json \
      -features \
      -ro \
      -dialect SQLite \
      -sql 'SELECT COUNT(*) AS empty_count FROM a53 WHERE GEOMETRY IS NULL OR ST_IsEmpty(GEOMETRY)' \
      "$GPKG_PATH" |
      jq -r '.layers[0].features[0].properties.empty_count'
  )"

  rm -f "$FGB_PATH"
  ogr2ogr \
    -f FlatGeobuf \
    "$FGB_PATH" \
    "$GPKG_PATH" \
    -nln a53 \
    -dialect SQLite \
    -sql 'SELECT dataset_id, source_file, basin_code, basin_name, depth_code_3, depth_code_6, depth_scale, depth_code, depth_label, depth_min_m, depth_max_m, rainfall_denominator, GEOMETRY FROM a53 WHERE GEOMETRY IS NOT NULL AND NOT ST_IsEmpty(GEOMETRY)' \
    -lco SPATIAL_INDEX=YES

  FGB_SHA256="$(shasum -a 256 "$FGB_PATH" | awk '{print $1}')"
  FGB_SIZE="$(wc -c <"$FGB_PATH" | tr -d ' ')"
  BASIN_CODES_JSON="$(
    ogrinfo \
      -json \
      -features \
      -ro \
      -dialect SQLite \
      -sql 'SELECT DISTINCT basin_code FROM a53 ORDER BY basin_code' \
      "$FGB_PATH" |
      jq -c '[.layers[0].features[].properties.basin_code]'
  )"

  rm -f "$MBTILES_PATH" "$PMTILES_PATH"
  tippecanoe \
    -o "$MBTILES_PATH" \
    -l a53 \
    -Z8 \
    -z16 \
    --force \
    --no-feature-limit \
    --no-tile-size-limit \
    -y depth_code \
    -y basin_code \
    "$FGB_PATH"
  pmtiles convert "$MBTILES_PATH" "$PMTILES_PATH"

  PMTILES_SHA256="$(shasum -a 256 "$PMTILES_PATH" | awk '{print $1}')"
  PMTILES_SIZE="$(wc -c <"$PMTILES_PATH" | tr -d ' ')"

  jq -cn \
    --arg id "$DATASET_ID" \
    --arg return_period "$return_period" \
    --argjson rainfall_denominator "$RETURN_PERIOD_NUMBER" \
    --argjson prefectures "$PREFECTURES_JSON" \
    --argjson basin_codes "$BASIN_CODES_JSON" \
    --arg fgb_sha256 "$FGB_SHA256" \
    --argjson fgb_size "$FGB_SIZE" \
    --arg pmtiles_sha256 "$PMTILES_SHA256" \
    --argjson pmtiles_size "$PMTILES_SIZE" \
    --argjson empty_geometry_count "$EMPTY_GEOMETRY_COUNT" \
    '{
      id: $id,
      indicator: "a53-frequency-flood-depth",
      name: ("洪水浸水想定区域（年超過確率1/" + ($rainfall_denominator | tostring) + "）"),
      provider: "国土交通省",
      referencePeriod: "2025年度",
      acquiredAt: "2026-07-17",
      license: "CC BY 4.0",
      sourceUrl: "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A53-2025.html",
      prefectures: $prefectures,
      basinCodes: $basin_codes,
      rainfallDenominator: $rainfall_denominator,
      validation: {
        excludedEmptyGeometryCount: $empty_geometry_count
      },
      artifact: {
        path: ("query/a53/" + $return_period + "/kanto.fgb"),
        contentType: "application/flatgeobuf",
        size: $fgb_size,
        sha256: $fgb_sha256
      },
      mapArtifact: {
        path: ("map/a53/" + $return_period + ".pmtiles"),
        contentType: "application/vnd.pmtiles",
        size: $pmtiles_size,
        sha256: $pmtiles_sha256
      }
    }' >>"$DATASETS_NDJSON"

  jq -cn \
    --arg path "query/a53/$return_period/kanto.fgb" \
    --arg sha256 "$FGB_SHA256" \
    --argjson size "$FGB_SIZE" \
    '{key: $path, value: {size: $size, sha256: $sha256}}' >>"$CHECKSUMS_NDJSON"
  jq -cn \
    --arg path "map/a53/$return_period.pmtiles" \
    --arg sha256 "$PMTILES_SHA256" \
    --argjson size "$PMTILES_SIZE" \
    '{key: $path, value: {size: $size, sha256: $sha256}}' >>"$CHECKSUMS_NDJSON"

  ogrinfo \
    -json \
    -features \
    -ro \
    -dialect SQLite \
    -sql 'SELECT DISTINCT basin_code, basin_name FROM a53 ORDER BY basin_code' \
    "$FGB_PATH" |
    jq -c \
      --arg dataset_id "$DATASET_ID" \
      --argjson rainfall_denominator "$RETURN_PERIOD_NUMBER" \
      '.layers[0].features[].properties | {
        basinCode: .basin_code,
        name: .basin_name,
        rainfallDenominator: $rainfall_denominator,
        datasetId: $dataset_id
      }' >>"$COVERAGE_NDJSON"

  echo "created A53 1/$RETURN_PERIOD_NUMBER: $FGB_PATH and $PMTILES_PATH"
done

jq -s \
  --rawfile linked_codes "$A31A_BASIN_CODES" \
  '($linked_codes | split("\n") | map(select(length > 0))) as $linked
  | ["10", "30", "50", "100", "150", "200"] as $periods
  | (
      group_by(.basinCode)
      | map(
          . as $basin
          | {
              key: $basin[0].basinCode,
              value: {
                name: $basin[0].name,
                a31aLinkStatus: (
                  if $linked | index($basin[0].basinCode) then "linked" else "unmatched" end
                ),
                a31aLinkReason: (
                  if $linked | index($basin[0].basinCode) then
                    null
                  else
                    "A31a管理河川データに同一水系コードなし"
                  end
                ),
                returnPeriods: (
                  reduce $periods[] as $period (
                    {};
                    .[$period] = (
                      [$basin[] | select((.rainfallDenominator | tostring) == $period)][0] as $entry
                      | if $entry then
                          {status: "available", datasetId: $entry.datasetId}
                        else
                          {status: "unpublished"}
                        end
                    )
                  )
                )
              }
            }
        )
      | from_entries
    )' "$COVERAGE_NDJSON" >"$A53_COVERAGE_JSON"

jq \
  --slurpfile a53_datasets "$DATASETS_NDJSON" \
  '.datasets = (
    [.datasets[] | select(.indicator != "a53-frequency-flood-depth")]
    + $a53_datasets
  )' \
  "$VERSION_DIR/manifest.json" >"$VERSION_DIR/manifest.json.tmp"
mv "$VERSION_DIR/manifest.json.tmp" "$VERSION_DIR/manifest.json"

jq \
  --slurpfile a53_coverage "$A53_COVERAGE_JSON" \
  '.a53 = {basins: $a53_coverage[0]}' \
  "$VERSION_DIR/coverage.json" >"$VERSION_DIR/coverage.json.tmp"
mv "$VERSION_DIR/coverage.json.tmp" "$VERSION_DIR/coverage.json"

jq -s '{files: from_entries}' "$CHECKSUMS_NDJSON" >"$INTERMEDIATE_DIR/a53-checksums.json"
jq \
  --slurpfile a53_checksums "$INTERMEDIATE_DIR/a53-checksums.json" \
  '.files = (
    .files
    | with_entries(select(.key | startswith("query/a53/") or startswith("map/a53/") | not))
  ) + $a53_checksums[0].files' \
  "$VERSION_DIR/checksums.json" >"$VERSION_DIR/checksums.json.tmp"
mv "$VERSION_DIR/checksums.json.tmp" "$VERSION_DIR/checksums.json"

bash "$ROOT_DIR/scripts/data/validate-a53-kanto.sh"
