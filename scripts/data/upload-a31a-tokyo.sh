#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WORK_DIR="${RISK_DATA_WORK_DIR:-"$ROOT_DIR/.data"}"
VERSION_DIR="$WORK_DIR/output/risk-data/v1"
BUCKET_NAME="${RISK_DATA_BUCKET:-risk-kurabe-data}"

bash "$ROOT_DIR/scripts/data/validate-a31a-tokyo.sh"

vp exec wrangler r2 object put \
  "$BUCKET_NAME/risk-data/v1/query/a31a/tokyo.fgb" \
  --file "$VERSION_DIR/query/a31a/tokyo.fgb" \
  --content-type application/flatgeobuf \
  --cache-control 'public, max-age=31536000, immutable' \
  --remote \
  --force

for metadata_file in manifest.json coverage.json checksums.json; do
  vp exec wrangler r2 object put \
    "$BUCKET_NAME/risk-data/v1/$metadata_file" \
    --file "$VERSION_DIR/$metadata_file" \
    --content-type application/json \
    --cache-control 'public, max-age=300' \
    --remote \
    --force
done

echo "uploaded risk-data/v1 to R2 bucket: $BUCKET_NAME"
