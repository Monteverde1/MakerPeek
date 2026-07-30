#!/usr/bin/env bash
# Rasterize makerpeek-landing/favicon.svg → extension PNG icons.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$DIR/generate-icons.mjs"
