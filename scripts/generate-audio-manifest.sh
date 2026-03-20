#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

output="assets/audio-manifest.json"
tmp="$(mktemp)"
tracks=()

while IFS= read -r -d '' file; do
  tracks+=("${file#./}")
done < <(find assets/audio -maxdepth 1 -type f -name '*.mp3' -print0 | sort -z)

{
  printf "{\n"
  printf "  \"tracks\": [\n"
  if [ "${#tracks[@]}" -gt 0 ]; then
    for index in "${!tracks[@]}"; do
      track="${tracks[$index]}"
      printf "    \"%s\"" "${track//\"/\\\"}"
      if [ "$index" -lt "$((${#tracks[@]} - 1))" ]; then
        printf ","
      fi
      printf "\n"
    done
  fi
  printf "  ]\n"
  printf "}\n"
} > "$tmp"

if [ "${1:-}" = "--check" ]; then
  if [ ! -f "$output" ] || ! cmp -s "$output" "$tmp"; then
    echo "audio manifest is out of date: $output"
    echo "run ./scripts/generate-audio-manifest.sh"
    rm -f "$tmp"
    exit 1
  fi
  echo "audio manifest is up to date"
  rm -f "$tmp"
  exit 0
fi

mv "$tmp" "$output"
echo "wrote $output (${#tracks[@]} tracks)"
