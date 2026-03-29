#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
required=(
  "index.html"
  "site.webmanifest"
  "assets/styles.css"
  "examples/index.html"
  "guides/index.html"
  "guides/first-5-minutes/index.html"
  "guides/random-workflow/index.html"
  "guides/export-activation/index.html"
  "legal/privacy.html"
  "legal/terms.html"
  "legal/license.html"
)

for file in "${required[@]}"; do
  if [ ! -f "$file" ]; then
    echo "missing required file: $file"
    exit 1
  fi
done

./scripts/generate-audio-manifest.sh --check

if ! grep -q 'id="buy"' index.html; then
  echo "checkout block (#buy) is missing in index.html"
  exit 1
fi

if ! grep -q 'assets/checkout.js' index.html; then
  echo "checkout script include is missing in index.html"
  exit 1
fi

echo "validation ok"
