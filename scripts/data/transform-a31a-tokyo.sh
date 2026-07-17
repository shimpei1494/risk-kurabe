#!/usr/bin/env bash

set -euo pipefail
export LC_ALL=C

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORK_DIR="${RISK_DATA_WORK_DIR:-"$ROOT_DIR/.data"}"
ARCHIVE_PATH="$WORK_DIR/source/A31a-25_13_10_GEOJSON.zip"
EXTRACT_DIR="$WORK_DIR/extracted/a31a-tokyo"
INTERMEDIATE_DIR="$WORK_DIR/intermediate"
VERSION_DIR="$WORK_DIR/output/risk-data/v1"
FGB_PATH="$VERSION_DIR/query/a31a/tokyo.fgb"
PMTILES_PATH="$VERSION_DIR/map/a31a.pmtiles"
GPKG_PATH="$INTERMEDIATE_DIR/a31a-tokyo.gpkg"
MBTILES_PATH="$INTERMEDIATE_DIR/a31a-tokyo.mbtiles"
ENTRY_LIST="$INTERMEDIATE_DIR/a31a-tokyo-entries.txt"
DATASET_ID="a31a-2025-tokyo-managed-rivers"

bash "$ROOT_DIR/scripts/data/download-a31a-tokyo.sh"

rm -rf "$EXTRACT_DIR"
rm -f "$GPKG_PATH" "$MBTILES_PATH" "$FGB_PATH" "$PMTILES_PATH"
mkdir -p "$EXTRACT_DIR" "$INTERMEDIATE_DIR" "$(dirname "$FGB_PATH")" "$(dirname "$PMTILES_PATH")"

unzip -Z1 "$ARCHIVE_PATH" |
  grep 'A31a-20-.*\.geojson$' |
  sed 's/.*\\//' >"$ENTRY_LIST"
ENTRY_COUNT="$(wc -l <"$ENTRY_LIST" | tr -d ' ')"
if [[ "$ENTRY_COUNT" -ne 7 ]]; then
  echo "expected 7 maximum-scale GeoJSON files, found $ENTRY_COUNT" >&2
  exit 1
fi

IS_FIRST=1
while IFS= read -r file_name; do
  layer_name="${file_name%.geojson}"
  extracted_path="$EXTRACT_DIR/$file_name"

  unzip -p "$ARCHIVE_PATH" "*$file_name" >"$extracted_path"

  sql="
    SELECT
      *,
      '$DATASET_ID' AS dataset_id,
      '$file_name' AS source_file,
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
    FROM \"$layer_name\"
  "

  if [[ "$IS_FIRST" -eq 1 ]]; then
    ogr2ogr \
      -f GPKG \
      "$GPKG_PATH" \
      "$extracted_path" \
      -nln a31a \
      -dialect SQLite \
      -sql "$sql" \
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
      "$extracted_path" \
      -nln a31a \
      -dialect SQLite \
      -sql "$sql" \
      -makevalid \
      -nlt MULTIPOLYGON \
      -t_srs EPSG:4326
  fi
done <"$ENTRY_LIST"

ogr2ogr \
  -f FlatGeobuf \
  "$FGB_PATH" \
  "$GPKG_PATH" \
  a31a \
  -nln a31a \
  -select dataset_id,source_file,river_id,river_name,manager_code,manager_name,depth_code,depth_label,depth_min_m,depth_max_m \
  -lco SPATIAL_INDEX=YES

tippecanoe \
  -o "$MBTILES_PATH" \
  -l a31a \
  -Z8 \
  -z16 \
  --force \
  --no-feature-limit \
  --no-tile-size-limit \
  -y depth_code \
  "$FGB_PATH"

pmtiles convert "$MBTILES_PATH" "$PMTILES_PATH"

bash "$ROOT_DIR/scripts/data/validate-a31a-tokyo.sh"

FGB_SHA256="$(shasum -a 256 "$FGB_PATH" | awk '{print $1}')"
FGB_SIZE="$(wc -c <"$FGB_PATH" | tr -d ' ')"
PMTILES_SHA256="$(shasum -a 256 "$PMTILES_PATH" | awk '{print $1}')"
PMTILES_SIZE="$(wc -c <"$PMTILES_PATH" | tr -d ' ')"

jq -n \
  --arg fgb_sha256 "$FGB_SHA256" \
  --argjson fgb_size "$FGB_SIZE" \
  --arg pmtiles_sha256 "$PMTILES_SHA256" \
  --argjson pmtiles_size "$PMTILES_SIZE" \
  '{
    schemaVersion: 1,
    dataVersion: "risk-data-v1",
    logicVersion: "flood-evaluator-v1",
    datasets: [
      {
        id: "a31a-2025-tokyo-managed-rivers",
        indicator: "a31a-maximum-flood-depth",
        name: "洪水浸水想定区域（想定最大規模）",
        provider: "国土交通省",
        referencePeriod: "2025年度",
        acquiredAt: "2026-07-17",
        license: "CC BY 4.0",
        sourceUrl: "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A31a-2025.html",
        prefectures: ["13"],
        artifact: {
          path: "query/a31a/tokyo.fgb",
          contentType: "application/flatgeobuf",
          size: $fgb_size,
          sha256: $fgb_sha256
        },
        mapArtifact: {
          path: "map/a31a.pmtiles",
          contentType: "application/vnd.pmtiles",
          size: $pmtiles_size,
          sha256: $pmtiles_sha256
        }
      }
    ]
  }' >"$VERSION_DIR/manifest.json"

jq -n \
  '{
    schemaVersion: 1,
    dataVersion: "risk-data-v1",
    a31a: {
      prefectures: {
        "13": {
          status: "partial",
          datasetIds: ["a31a-2025-tokyo-managed-rivers"],
          includedRiverCategories: ["洪水予報河川・水位周知河川"],
          excludedRiverCategories: ["その他の河川"]
        }
      }
    }
  }' >"$VERSION_DIR/coverage.json"

jq -n \
  --arg fgb_sha256 "$FGB_SHA256" \
  --argjson fgb_size "$FGB_SIZE" \
  --arg pmtiles_sha256 "$PMTILES_SHA256" \
  --argjson pmtiles_size "$PMTILES_SIZE" \
  '{
    schemaVersion: 1,
    files: {
      "query/a31a/tokyo.fgb": {
        size: $fgb_size,
        sha256: $fgb_sha256
      },
      "map/a31a.pmtiles": {
        size: $pmtiles_size,
        sha256: $pmtiles_sha256
      }
    }
  }' >"$VERSION_DIR/checksums.json"

echo "created: $FGB_PATH"
echo "sha256: $FGB_SHA256"
echo "size: $FGB_SIZE bytes"
echo "created: $PMTILES_PATH"
echo "sha256: $PMTILES_SHA256"
echo "size: $PMTILES_SIZE bytes"
