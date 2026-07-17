#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOCK_FILE="$ROOT_DIR/data-manifest/sources.lock.json"
WORK_DIR="${RISK_DATA_WORK_DIR:-"$ROOT_DIR/.data"}"
SOURCE_DIR="$WORK_DIR/source"
SOURCE_ID="mlit-a31a-2025-tokyo-managed-rivers-geojson"

mkdir -p "$SOURCE_DIR"

SOURCE_JSON="$(jq -e --arg id "$SOURCE_ID" '.sources[] | select(.id == $id)' "$LOCK_FILE")"
FILE_NAME="$(jq -r '.fileName' <<<"$SOURCE_JSON")"
SOURCE_URL="$(jq -r '.url' <<<"$SOURCE_JSON")"
EXPECTED_SHA256="$(jq -r '.sha256' <<<"$SOURCE_JSON")"
ARCHIVE_PATH="$SOURCE_DIR/$FILE_NAME"

verify_checksum() {
  local actual_sha256
  actual_sha256="$(shasum -a 256 "$ARCHIVE_PATH" | awk '{print $1}')"
  if [[ "$actual_sha256" != "$EXPECTED_SHA256" ]]; then
    echo "checksum mismatch: $ARCHIVE_PATH" >&2
    echo "expected: $EXPECTED_SHA256" >&2
    echo "actual:   $actual_sha256" >&2
    return 1
  fi
}

if [[ -f "$ARCHIVE_PATH" ]]; then
  verify_checksum
  echo "verified existing source: $ARCHIVE_PATH"
  exit 0
fi

TEMP_PATH="$ARCHIVE_PATH.part"
curl --fail --location "$SOURCE_URL" --output "$TEMP_PATH"
mv "$TEMP_PATH" "$ARCHIVE_PATH"
verify_checksum

echo "downloaded and verified: $ARCHIVE_PATH"
