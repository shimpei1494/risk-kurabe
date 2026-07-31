#!/usr/bin/env bash

set -euo pipefail
export LC_ALL=C

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORK_DIR="${RISK_DATA_WORK_DIR:-"$ROOT_DIR/.data"}"
SOURCE_DIR="$WORK_DIR/source"
ARCHIVE_PATH="$SOURCE_DIR/tokyo-regional-risk-all2.zip"
CSV_SOURCE_PATH="$SOURCE_DIR/tokyo-regional-risk-all2.csv"
EXTRACT_DIR="$WORK_DIR/extracted/tokyo-regional-risk"
INTERMEDIATE_DIR="$WORK_DIR/intermediate"
VERSION_DIR="$WORK_DIR/output/risk-data/v3"
SHAPEFILE_PATH="$EXTRACT_DIR/regional-risk.shp"
CSV_PATH="$EXTRACT_DIR/regional-risk.csv"
GPKG_PATH="$INTERMEDIATE_DIR/tokyo-regional-risk.gpkg"
FGB_PATH="$VERSION_DIR/query/tokyo/regional-risk.fgb"
BUILDING_MBTILES_PATH="$INTERMEDIATE_DIR/tokyo-building-collapse.mbtiles"
BUILDING_PMTILES_PATH="$VERSION_DIR/map/tokyo-building-collapse.pmtiles"
OVERALL_MBTILES_PATH="$INTERMEDIATE_DIR/tokyo-overall-risk.mbtiles"
OVERALL_PMTILES_PATH="$VERSION_DIR/map/tokyo-overall-risk.pmtiles"
FIRE_MBTILES_PATH="$INTERMEDIATE_DIR/tokyo-fire.mbtiles"
FIRE_PMTILES_PATH="$VERSION_DIR/map/tokyo-fire.pmtiles"
DATASET_ID="tokyo-regional-risk-9"

bash "$ROOT_DIR/scripts/data/download-sources.sh" TokyoRegionalRisk

rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR" "$INTERMEDIATE_DIR" "$(dirname "$FGB_PATH")" "$VERSION_DIR/map"

if [[ ! -f "$VERSION_DIR/manifest.json" ]]; then
  cat >"$VERSION_DIR/manifest.json" <<'JSON'
{
  "schemaVersion": 1,
  "dataVersion": "v3",
  "logicVersion": "risk-evaluator-v5-official-flood-legend",
  "datasets": []
}
JSON
fi
if [[ ! -f "$VERSION_DIR/coverage.json" ]]; then
  cat >"$VERSION_DIR/coverage.json" <<'JSON'
{
  "schemaVersion": 1,
  "dataVersion": "v3",
  "tokyoRegionalRisk": null
}
JSON
fi
if [[ ! -f "$VERSION_DIR/checksums.json" ]]; then
  cat >"$VERSION_DIR/checksums.json" <<'JSON'
{
  "schemaVersion": 1,
  "dataVersion": "v3",
  "files": {}
}
JSON
fi
rm -f \
  "$GPKG_PATH" \
  "$FGB_PATH" \
  "$BUILDING_MBTILES_PATH" \
  "$BUILDING_PMTILES_PATH" \
  "$OVERALL_MBTILES_PATH" \
  "$OVERALL_PMTILES_PATH" \
  "$FIRE_MBTILES_PATH" \
  "$FIRE_PMTILES_PATH"

while IFS= read -r entry_name; do
  extension="${entry_name##*.}"
  case "$extension" in
    dbf | prj | shp | shx)
      unzip -p "$ARCHIVE_PATH" "$entry_name" >"$EXTRACT_DIR/regional-risk.$extension"
      ;;
  esac
done < <(unzip -Z1 "$ARCHIVE_PATH")

for extension in dbf prj shp shx; do
  if [[ ! -s "$EXTRACT_DIR/regional-risk.$extension" ]]; then
    echo "missing Shapefile component: $extension" >&2
    exit 1
  fi
done

iconv -f CP932 -t UTF-8 "$CSV_SOURCE_PATH" >"$CSV_PATH"

ogr2ogr \
  -f GPKG \
  -overwrite \
  "$GPKG_PATH" \
  "$SHAPEFILE_PATH" \
  -nln risk_shapes \
  -makevalid \
  -nlt MULTIPOLYGON \
  -t_srs EPSG:4326

ogr2ogr \
  -f GPKG \
  -update \
  "$GPKG_PATH" \
  "$CSV_PATH" \
  -nln risk_csv

SHAPE_COUNT="$(ogrinfo -json -so -al "$GPKG_PATH" risk_shapes | jq -r '.layers[0].featureCount')"
CSV_COUNT="$(ogrinfo -json -so -al "$GPKG_PATH" risk_csv | jq -r '.layers[0].featureCount')"
JOINED_COUNT="$(
  ogrinfo \
    -json \
    -features \
    -ro \
    -dialect SQLite \
    -sql 'SELECT COUNT(*) AS joined_count FROM risk_shapes s JOIN risk_csv c ON s."区市町村名" = c."区市町名" AND s."町丁目名" = c."町丁目名"' \
    "$GPKG_PATH" |
    jq -r '.layers[0].features[0].properties.joined_count'
)"

if [[ "$SHAPE_COUNT" -ne 5192 || "$CSV_COUNT" -ne 5192 || "$JOINED_COUNT" -ne 5192 ]]; then
  echo "unexpected Tokyo regional risk join: shapes=$SHAPE_COUNT csv=$CSV_COUNT joined=$JOINED_COUNT" >&2
  exit 1
fi

ogr2ogr \
  -f FlatGeobuf \
  "$FGB_PATH" \
  "$GPKG_PATH" \
  -nln regional_risk \
  -dialect SQLite \
  -sql "
    SELECT
      '$DATASET_ID' AS dataset_id,
      s.ID AS source_id,
      s.\"区市町村名\" || ':' || s.\"町丁目名\" AS town_key,
      s.\"区市町村名\" AS municipality_name,
      s.\"町丁目名\" AS town_name,
      c.\"地盤分類\" AS ground_classification,
      s.\"建物_危\" AS building_collapse_score,
      s.\"建物_順\" AS building_collapse_order,
      s.\"建物_ラ\" AS building_collapse_rank,
      s.\"火災_危\" AS fire_score,
      s.\"火災_順\" AS fire_order,
      s.\"火災_ラ\" AS fire_rank,
      s.\"災害_係\" AS activity_difficulty,
      s.\"総合_危\" AS overall_score,
      s.\"総合_順\" AS overall_order,
      s.\"総合_ラ\" AS overall_rank,
      s.geom
    FROM risk_shapes s
    JOIN risk_csv c
      ON s.\"区市町村名\" = c.\"区市町名\"
      AND s.\"町丁目名\" = c.\"町丁目名\"
  " \
  -lco SPATIAL_INDEX=YES

rm -f \
  "$BUILDING_MBTILES_PATH" \
  "$BUILDING_PMTILES_PATH" \
  "$OVERALL_MBTILES_PATH" \
  "$OVERALL_PMTILES_PATH" \
  "$FIRE_MBTILES_PATH" \
  "$FIRE_PMTILES_PATH"

tippecanoe \
  -o "$BUILDING_MBTILES_PATH" \
  -l tokyo_building_collapse \
  -Z8 \
  -z16 \
  --force \
  --no-feature-limit \
  --no-tile-size-limit \
  -y building_collapse_rank \
  "$FGB_PATH"
pmtiles convert "$BUILDING_MBTILES_PATH" "$BUILDING_PMTILES_PATH"

tippecanoe \
  -o "$OVERALL_MBTILES_PATH" \
  -l tokyo_overall_risk \
  -Z8 \
  -z16 \
  --force \
  --no-feature-limit \
  --no-tile-size-limit \
  -y overall_rank \
  "$FGB_PATH"
pmtiles convert "$OVERALL_MBTILES_PATH" "$OVERALL_PMTILES_PATH"

tippecanoe \
  -o "$FIRE_MBTILES_PATH" \
  -l tokyo_fire \
  -Z8 \
  -z16 \
  --force \
  --no-feature-limit \
  --no-tile-size-limit \
  -y fire_rank \
  "$FGB_PATH"
pmtiles convert "$FIRE_MBTILES_PATH" "$FIRE_PMTILES_PATH"

FGB_SHA256="$(shasum -a 256 "$FGB_PATH" | awk '{print $1}')"
FGB_SIZE="$(wc -c <"$FGB_PATH" | tr -d ' ')"
BUILDING_PMTILES_SHA256="$(shasum -a 256 "$BUILDING_PMTILES_PATH" | awk '{print $1}')"
BUILDING_PMTILES_SIZE="$(wc -c <"$BUILDING_PMTILES_PATH" | tr -d ' ')"
OVERALL_PMTILES_SHA256="$(shasum -a 256 "$OVERALL_PMTILES_PATH" | awk '{print $1}')"
OVERALL_PMTILES_SIZE="$(wc -c <"$OVERALL_PMTILES_PATH" | tr -d ' ')"
FIRE_PMTILES_SHA256="$(shasum -a 256 "$FIRE_PMTILES_PATH" | awk '{print $1}')"
FIRE_PMTILES_SIZE="$(wc -c <"$FIRE_PMTILES_PATH" | tr -d ' ')"

jq -n \
  --arg fgb_sha256 "$FGB_SHA256" \
  --argjson fgb_size "$FGB_SIZE" \
  --arg building_pmtiles_sha256 "$BUILDING_PMTILES_SHA256" \
  --argjson building_pmtiles_size "$BUILDING_PMTILES_SIZE" \
  --arg overall_pmtiles_sha256 "$OVERALL_PMTILES_SHA256" \
  --argjson overall_pmtiles_size "$OVERALL_PMTILES_SIZE" \
  --arg fire_pmtiles_sha256 "$FIRE_PMTILES_SHA256" \
  --argjson fire_pmtiles_size "$FIRE_PMTILES_SIZE" \
  '{
    id: "tokyo-regional-risk-9",
    indicator: "tokyo-regional-risk",
    name: "地震に関する地域危険度測定調査（第9回）",
    provider: "東京都都市整備局",
    referencePeriod: "2022年9月",
    acquiredAt: "2026-07-17",
    license: "CC BY 4.0",
    sourceUrl: "https://www.funenka.metro.tokyo.lg.jp/area-hazard-level/regional-risk-list/",
    prefectures: ["13"],
    townCount: 5192,
    artifact: {
      path: "query/tokyo/regional-risk.fgb",
      contentType: "application/flatgeobuf",
      size: $fgb_size,
      sha256: $fgb_sha256
    },
    mapArtifacts: {
      overall: {
        path: "map/tokyo-overall-risk.pmtiles",
        contentType: "application/vnd.pmtiles",
        size: $overall_pmtiles_size,
        sha256: $overall_pmtiles_sha256
      },
      buildingCollapse: {
        path: "map/tokyo-building-collapse.pmtiles",
        contentType: "application/vnd.pmtiles",
        size: $building_pmtiles_size,
        sha256: $building_pmtiles_sha256
      },
      fire: {
        path: "map/tokyo-fire.pmtiles",
        contentType: "application/vnd.pmtiles",
        size: $fire_pmtiles_size,
        sha256: $fire_pmtiles_sha256
      }
    }
  }' >"$INTERMEDIATE_DIR/tokyo-regional-risk-dataset.json"

jq \
  --slurpfile tokyo_dataset "$INTERMEDIATE_DIR/tokyo-regional-risk-dataset.json" \
  '.datasets = (
    [.datasets[] | select(.indicator != "tokyo-regional-risk")]
    + $tokyo_dataset
  )' \
  "$VERSION_DIR/manifest.json" >"$VERSION_DIR/manifest.json.tmp"
mv "$VERSION_DIR/manifest.json.tmp" "$VERSION_DIR/manifest.json"

jq \
  '.tokyoRegionalRisk = {
    prefectureCode: "13",
    status: "available",
    datasetId: "tokyo-regional-risk-9",
    townCount: 5192,
    municipalityCount: 51,
    excludedAreas: ["島しょ部"]
  }' \
  "$VERSION_DIR/coverage.json" >"$VERSION_DIR/coverage.json.tmp"
mv "$VERSION_DIR/coverage.json.tmp" "$VERSION_DIR/coverage.json"

jq \
  --arg fgb_sha256 "$FGB_SHA256" \
  --argjson fgb_size "$FGB_SIZE" \
  --arg building_pmtiles_sha256 "$BUILDING_PMTILES_SHA256" \
  --argjson building_pmtiles_size "$BUILDING_PMTILES_SIZE" \
  --arg overall_pmtiles_sha256 "$OVERALL_PMTILES_SHA256" \
  --argjson overall_pmtiles_size "$OVERALL_PMTILES_SIZE" \
  --arg fire_pmtiles_sha256 "$FIRE_PMTILES_SHA256" \
  --argjson fire_pmtiles_size "$FIRE_PMTILES_SIZE" \
  '.files = (
    .files
    | with_entries(
        select(
          (
            .key == "query/tokyo/regional-risk.fgb"
            or .key == "map/tokyo-overall-risk.pmtiles"
            or .key == "map/tokyo-building-collapse.pmtiles"
            or .key == "map/tokyo-fire.pmtiles"
          )
          | not
        )
      )
  ) + {
    "query/tokyo/regional-risk.fgb": {
      size: $fgb_size,
      sha256: $fgb_sha256
    },
    "map/tokyo-overall-risk.pmtiles": {
      size: $overall_pmtiles_size,
      sha256: $overall_pmtiles_sha256
    },
    "map/tokyo-building-collapse.pmtiles": {
      size: $building_pmtiles_size,
      sha256: $building_pmtiles_sha256
    },
    "map/tokyo-fire.pmtiles": {
      size: $fire_pmtiles_size,
      sha256: $fire_pmtiles_sha256
    }
  }' \
  "$VERSION_DIR/checksums.json" >"$VERSION_DIR/checksums.json.tmp"
mv "$VERSION_DIR/checksums.json.tmp" "$VERSION_DIR/checksums.json"

bash "$ROOT_DIR/scripts/data/validate-tokyo-regional-risk.sh"
