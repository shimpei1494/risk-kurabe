#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOCK_FILE="$ROOT_DIR/data-manifest/sources.lock.json"
WORK_DIR="${RISK_DATA_WORK_DIR:-"$ROOT_DIR/.data"}"
SOURCE_DIR="$WORK_DIR/source"
DATASET_FILTER="${1:-}"

mkdir -p "$SOURCE_DIR"

verify_source() {
  local archive_path="$1"
  local expected_size="$2"
  local expected_sha256="$3"
  local actual_size
  local actual_sha256

  actual_size="$(wc -c <"$archive_path" | tr -d ' ')"
  if [[ "$actual_size" != "$expected_size" ]]; then
    echo "size mismatch: $archive_path" >&2
    echo "expected: $expected_size" >&2
    echo "actual:   $actual_size" >&2
    return 1
  fi

  actual_sha256="$(shasum -a 256 "$archive_path" | awk '{print $1}')"
  if [[ "$actual_sha256" != "$expected_sha256" ]]; then
    echo "checksum mismatch: $archive_path" >&2
    echo "expected: $expected_sha256" >&2
    echo "actual:   $actual_sha256" >&2
    return 1
  fi
}

SOURCE_COUNT=0
while IFS= read -r source_json; do
  FILE_NAME="$(jq -r '.fileName' <<<"$source_json")"
  SOURCE_URL="$(jq -r '.url' <<<"$source_json")"
  EXPECTED_SIZE="$(jq -r '.fileSize' <<<"$source_json")"
  EXPECTED_SHA256="$(jq -r '.sha256' <<<"$source_json")"
  SOURCE_PATH="$SOURCE_DIR/$FILE_NAME"

  if [[ ! -f "$SOURCE_PATH" ]]; then
    TEMP_PATH="$SOURCE_PATH.part"
    curl --fail --location "$SOURCE_URL" --output "$TEMP_PATH"
    mv "$TEMP_PATH" "$SOURCE_PATH"
  fi

  verify_source "$SOURCE_PATH" "$EXPECTED_SIZE" "$EXPECTED_SHA256"
  echo "verified source: $SOURCE_PATH"
  SOURCE_COUNT=$((SOURCE_COUNT + 1))
done < <(
  jq -c \
    --arg dataset "$DATASET_FILTER" \
    '.sources[] | select($dataset == "" or .dataset == $dataset)' \
    "$LOCK_FILE"
)

if [[ "$SOURCE_COUNT" -eq 0 ]]; then
  echo "no sources matched dataset: $DATASET_FILTER" >&2
  exit 1
fi

echo "verified $SOURCE_COUNT source files"
