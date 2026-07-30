#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORK_DIR="${RISK_DATA_WORK_DIR:-"$ROOT_DIR/.data"}"
VERSION_DIR="$WORK_DIR/output/risk-data/v1"
BUCKET_NAME="${RISK_DATA_BUCKET:-risk-kurabe-data}"

bash "$ROOT_DIR/scripts/data/validate-tokyo-regional-risk.sh"

while IFS= read -r artifact_path; do
  case "$artifact_path" in
    *.fgb)
      CONTENT_TYPE="application/flatgeobuf"
      ;;
    *.pmtiles)
      CONTENT_TYPE="application/vnd.pmtiles"
      ;;
    *)
      echo "unsupported artifact type: $artifact_path" >&2
      exit 1
      ;;
  esac

  vp exec wrangler r2 object put \
    "$BUCKET_NAME/risk-data/v1/$artifact_path" \
    --file "$VERSION_DIR/$artifact_path" \
    --content-type "$CONTENT_TYPE" \
    --cache-control 'public, max-age=31536000, immutable' \
    --remote \
    --force
done < <(
  jq -r \
    '.files | keys[] | select(
      . == "query/tokyo/regional-risk.fgb"
      or . == "map/tokyo-building-collapse.pmtiles"
      or . == "map/tokyo-fire.pmtiles"
    )' \
    "$VERSION_DIR/checksums.json"
)

for metadata_file in manifest.json coverage.json checksums.json; do
  vp exec wrangler r2 object put \
    "$BUCKET_NAME/risk-data/v1/$metadata_file" \
    --file "$VERSION_DIR/$metadata_file" \
    --content-type application/json \
    --cache-control 'public, max-age=300' \
    --remote \
    --force
done

echo "uploaded Tokyo regional risk artifacts to R2 bucket: $BUCKET_NAME"
