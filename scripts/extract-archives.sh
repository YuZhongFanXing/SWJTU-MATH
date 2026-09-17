#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

ARCHIVE_PATHS=(
  "$ROOT_DIR/复变函数.zip"
  "$ROOT_DIR/20级2024届各学院保研名单通知.rar"
  "$ROOT_DIR/大物实验题库.zip"
  "$ROOT_DIR/常微分/2019-常微分方程-期末考试试卷(B)等13个文件.zip"
  "$ROOT_DIR/常微分/半期.zip"
  "$ROOT_DIR/常微分/期末.zip"
  "$ROOT_DIR/政策文件整理.zip"
  "$ROOT_DIR/数分高代解几.zip"
  "$ROOT_DIR/数院往年考试题.zip"
  "$ROOT_DIR/考研真题/考研数一真题/考研真题.zip"
)

ARCHIVES=()
for archive in "${ARCHIVE_PATHS[@]}"; do
  if [[ -f "$archive" ]]; then
    ARCHIVES+=("$archive")
  fi
done

if ((${#ARCHIVES[@]} == 0)); then
  echo "No ZIP/RAR archives found."
  exit 0
fi

for archive in "${ARCHIVES[@]}"; do
  archive_name="$(basename "$archive")"
  archive_stem="${archive_name%.*}"
  destination="$(dirname "$archive")/$archive_stem"
  listing="$TMP_DIR/$(printf '%s' "$archive" | sha256sum | cut -d' ' -f1).list"

  if [[ -e "$destination" ]]; then
    echo "Refusing to overwrite existing destination: ${destination#$ROOT_DIR/}" >&2
    exit 1
  fi

  bsdtar --options hdrcharset=CP936 -tf "$archive" > "$listing"
  if sed 's#\\#/#g' "$listing" | rg -n '(^/|^[[:alpha:]]:/|(^|/)\.\.?(/|$))' >/dev/null; then
    echo "Unsafe path found in archive: ${archive#$ROOT_DIR/}" >&2
    exit 1
  fi

  if bsdtar --options hdrcharset=CP936 -tvf "$archive" | awk '$1 ~ /^[lh]/ { found = 1 } END { exit !found }'; then
    echo "Refusing symlink or hardlink entries in archive: ${archive#$ROOT_DIR/}" >&2
    exit 1
  fi

  expected_files="$(bsdtar --options hdrcharset=CP936 -tvf "$archive" | awk '$1 ~ /^-/ { count++ } END { print count + 0 }')"
  if [[ "$expected_files" == "0" ]]; then
    echo "Archive contains no regular files: ${archive#$ROOT_DIR/}" >&2
    exit 1
  fi

  mkdir -p "$destination"
  bsdtar --keep-old-files --no-same-owner --no-same-permissions --options hdrcharset=CP936 -xf "$archive" -C "$destination"
  actual_files="$(find "$destination" -type f | wc -l | tr -d ' ')"

  if [[ "$expected_files" != "$actual_files" ]]; then
    echo "File count mismatch for ${archive#$ROOT_DIR/}: expected ${expected_files}, got ${actual_files}" >&2
    exit 1
  fi

  empty_directories="$(find "$destination" -type d -empty | wc -l | tr -d ' ')"
  echo "Extracted ${archive#$ROOT_DIR/} -> ${destination#$ROOT_DIR/} (${actual_files} files, ${empty_directories} empty directories)"
done

echo "All archives extracted successfully. Review the extracted files before removing the original archives."
