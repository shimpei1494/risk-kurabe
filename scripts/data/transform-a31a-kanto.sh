#!/usr/bin/env bash

set -euo pipefail
export LC_ALL=C

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOCK_FILE="$ROOT_DIR/data-manifest/sources.lock.json"
WORK_DIR="${RISK_DATA_WORK_DIR:-"$ROOT_DIR/.data"}"
SOURCE_DIR="$WORK_DIR/source"
EXTRACT_ROOT="$WORK_DIR/extracted/a31a"
INTERMEDIATE_DIR="$WORK_DIR/intermediate"
VERSION_DIR="$WORK_DIR/output/risk-data/v1"
A31A_QUERY_DIR="$VERSION_DIR/query/a31a"
PMTILES_PATH="$VERSION_DIR/map/a31a.pmtiles"
MBTILES_PATH="$INTERMEDIATE_DIR/a31a-kanto.mbtiles"
DATASETS_NDJSON="$INTERMEDIATE_DIR/a31a-datasets.ndjson"
CHECKSUMS_NDJSON="$INTERMEDIATE_DIR/a31a-checksums.ndjson"

bash "$ROOT_DIR/scripts/data/download-sources.sh" A31a

mkdir -p "$EXTRACT_ROOT" "$INTERMEDIATE_DIR" "$A31A_QUERY_DIR" "$(dirname "$PMTILES_PATH")"
: >"$DATASETS_NDJSON"
: >"$CHECKSUMS_NDJSON"

FGB_PATHS=()
while IFS= read -r source_json; do
  PREFECTURE_CODE="$(jq -r '.prefectureCode' <<<"$source_json")"
  PREFECTURE_NAME="$(jq -r '.prefectureName' <<<"$source_json")"
  PREFECTURE_SLUG="$(jq -r '.prefectureSlug' <<<"$source_json")"
  FILE_NAME="$(jq -r '.fileName' <<<"$source_json")"
  ARCHIVE_PATH="$SOURCE_DIR/$FILE_NAME"
  DATASET_ID="a31a-2025-$PREFECTURE_SLUG-managed-rivers"
  EXTRACT_DIR="$EXTRACT_ROOT/$PREFECTURE_SLUG"
  ENTRY_LIST="$INTERMEDIATE_DIR/a31a-$PREFECTURE_SLUG-entries.txt"
  GPKG_PATH="$INTERMEDIATE_DIR/a31a-$PREFECTURE_SLUG.gpkg"
  FGB_PATH="$A31A_QUERY_DIR/$PREFECTURE_SLUG.fgb"

  mkdir -p "$EXTRACT_DIR"
  unzip -Z1 "$ARCHIVE_PATH" |
    grep -a 'A31a-20-.*\.geojson$' |
    sed 's/.*\\//' >"$ENTRY_LIST"

  ENTRY_COUNT="$(wc -l <"$ENTRY_LIST" | tr -d ' ')"
  if [[ "$ENTRY_COUNT" -le 0 ]]; then
    echo "no maximum-scale GeoJSON files found: $ARCHIVE_PATH" >&2
    exit 1
  fi

  IS_FIRST=1
  while IFS= read -r geojson_name; do
    LAYER_NAME="${geojson_name%.geojson}"
    EXTRACTED_PATH="$EXTRACT_DIR/$geojson_name"
    unzip -p "$ARCHIVE_PATH" "*$geojson_name" >"$EXTRACTED_PATH"

    SQL="
      SELECT
        *,
        '$DATASET_ID' AS dataset_id,
        '$PREFECTURE_CODE' AS prefecture_code,
        '$geojson_name' AS source_file,
        A31a_201 AS river_id,
        A31a_202 AS river_name,
        A31a_203 AS manager_code,
        A31a_204 AS manager_name,
        A31a_205 AS depth_code,
        CASE A31a_205
          WHEN 1 THEN '0m以上0.5m未満'
          WHEN 2 THEN '0.5m以上3.0m未満'
          WHEN 3 THEN '3.0m以上5.0m未満'
          WHEN 4 THEN '5.0m以上10.0m未満'
          WHEN 5 THEN '10.0m以上20.0m未満'
          WHEN 6 THEN '20.0m以上'
        END AS depth_label,
        CASE A31a_205
          WHEN 1 THEN 0.0
          WHEN 2 THEN 0.5
          WHEN 3 THEN 3.0
          WHEN 4 THEN 5.0
          WHEN 5 THEN 10.0
          WHEN 6 THEN 20.0
        END AS depth_min_m,
        CASE A31a_205
          WHEN 1 THEN 0.5
          WHEN 2 THEN 3.0
          WHEN 3 THEN 5.0
          WHEN 4 THEN 10.0
          WHEN 5 THEN 20.0
          ELSE NULL
        END AS depth_max_m
      FROM \"$LAYER_NAME\"
    "

    if [[ "$IS_FIRST" -eq 1 ]]; then
      ogr2ogr \
        -f GPKG \
        -overwrite \
        "$GPKG_PATH" \
        "$EXTRACTED_PATH" \
        -nln a31a \
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
        "$EXTRACTED_PATH" \
        -nln a31a \
        -dialect SQLite \
        -sql "$SQL" \
        -makevalid \
        -nlt MULTIPOLYGON \
        -t_srs EPSG:4326
    fi
  done <"$ENTRY_LIST"

  EMPTY_GEOMETRY_COUNT="$(
    ogrinfo \
      -json \
      -features \
      -ro \
      -dialect SQLite \
      -sql 'SELECT COUNT(*) AS empty_count FROM a31a WHERE GEOMETRY IS NULL OR ST_IsEmpty(GEOMETRY)' \
      "$GPKG_PATH" |
      jq -r '.layers[0].features[0].properties.empty_count'
  )"

  rm -f "$FGB_PATH"
  ogr2ogr \
    -f FlatGeobuf \
    -overwrite \
    "$FGB_PATH" \
    "$GPKG_PATH" \
    -nln a31a \
    -dialect SQLite \
    -sql 'SELECT dataset_id, prefecture_code, source_file, river_id, river_name, manager_code, manager_name, depth_code, depth_label, depth_min_m, depth_max_m, GEOMETRY FROM a31a WHERE GEOMETRY IS NOT NULL AND NOT ST_IsEmpty(GEOMETRY)' \
    -lco SPATIAL_INDEX=YES

  FGB_SHA256="$(shasum -a 256 "$FGB_PATH" | awk '{print $1}')"
  FGB_SIZE="$(wc -c <"$FGB_PATH" | tr -d ' ')"

  jq -cn \
    --arg id "$DATASET_ID" \
    --arg prefecture_code "$PREFECTURE_CODE" \
    --arg prefecture_name "$PREFECTURE_NAME" \
    --arg prefecture_slug "$PREFECTURE_SLUG" \
    --arg fgb_sha256 "$FGB_SHA256" \
    --argjson fgb_size "$FGB_SIZE" \
    --argjson empty_geometry_count "$EMPTY_GEOMETRY_COUNT" \
    '{
      id: $id,
      indicator: "a31a-maximum-flood-depth",
      name: ("洪水浸水想定区域（想定最大規模） " + $prefecture_name),
      provider: "国土交通省",
      referencePeriod: "2025年度",
      acquiredAt: "2026-07-17",
      license: "CC BY 4.0",
      sourceUrl: "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A31a-2025.html",
      prefectures: [$prefecture_code],
      validation: {
        excludedEmptyGeometryCount: $empty_geometry_count
      },
      artifact: {
        path: ("query/a31a/" + $prefecture_slug + ".fgb"),
        contentType: "application/flatgeobuf",
        size: $fgb_size,
        sha256: $fgb_sha256
      }
    }' >>"$DATASETS_NDJSON"

  jq -cn \
    --arg path "query/a31a/$PREFECTURE_SLUG.fgb" \
    --arg sha256 "$FGB_SHA256" \
    --argjson size "$FGB_SIZE" \
    '{key: $path, value: {size: $size, sha256: $sha256}}' >>"$CHECKSUMS_NDJSON"

  FGB_PATHS+=("$FGB_PATH")
  echo "created $PREFECTURE_NAME: $FGB_PATH ($FGB_SIZE bytes)"
done < <(jq -c '.sources[] | select(.dataset == "A31a")' "$LOCK_FILE")

tippecanoe \
  -o "$MBTILES_PATH" \
  -l a31a \
  -Z8 \
  -z16 \
  --force \
  --no-feature-limit \
  --no-tile-size-limit \
  -y depth_code \
  "${FGB_PATHS[@]}"

pmtiles convert "$MBTILES_PATH" "$PMTILES_PATH"

PMTILES_SHA256="$(shasum -a 256 "$PMTILES_PATH" | awk '{print $1}')"
PMTILES_SIZE="$(wc -c <"$PMTILES_PATH" | tr -d ' ')"

jq -cn \
  --arg path "map/a31a.pmtiles" \
  --arg sha256 "$PMTILES_SHA256" \
  --argjson size "$PMTILES_SIZE" \
  '{key: $path, value: {size: $size, sha256: $sha256}}' >>"$CHECKSUMS_NDJSON"

jq -s \
  --arg pmtiles_sha256 "$PMTILES_SHA256" \
  --argjson pmtiles_size "$PMTILES_SIZE" \
  '{
    schemaVersion: 1,
    dataVersion: "risk-data-v1",
    logicVersion: "flood-evaluator-v1",
    datasets: map(
      . + {
        mapArtifact: {
          path: "map/a31a.pmtiles",
          contentType: "application/vnd.pmtiles",
          size: $pmtiles_size,
          sha256: $pmtiles_sha256
        }
      }
    )
  }' "$DATASETS_NDJSON" >"$VERSION_DIR/manifest.json"

jq -n \
  --slurpfile sources "$LOCK_FILE" \
  '{
    schemaVersion: 1,
    dataVersion: "risk-data-v1",
    a31a: {
      prefectures: (
        $sources[0].sources
        | map(select(.dataset == "A31a"))
        | map({
            key: .prefectureCode,
            value: {
              status: "partial",
              datasetIds: [("a31a-2025-" + .prefectureSlug + "-managed-rivers")],
              includedRiverCategories: ["洪水予報河川・水位周知河川"],
              excludedRiverCategories: ["その他の河川"]
            }
          })
        | from_entries
      )
    }
  }' >"$VERSION_DIR/coverage.json"

jq -s \
  '{
    schemaVersion: 1,
    files: (from_entries)
  }' "$CHECKSUMS_NDJSON" >"$VERSION_DIR/checksums.json"

bash "$ROOT_DIR/scripts/data/validate-a31a-kanto.sh"

echo "created: $PMTILES_PATH"
echo "sha256: $PMTILES_SHA256"
echo "size: $PMTILES_SIZE bytes"
