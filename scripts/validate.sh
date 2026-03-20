#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
required=(
  "index.html"
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

if ! grep -q "github.com/masterpieceGenerator/generator_release/releases/latest/download/generator-linux-x86_64.tar.gz" index.html; then
  echo "missing linux download link in index.html"
  exit 1
fi

echo "validation ok"
