#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

# ── 0. Guard: verification / dev flags must be off before shipping ───────────
if grep -q "VERIFICATION_MODE = true" "$SCRIPT_DIR/lib/pro.js"; then
  echo "✗ BUILD BLOCKED: VERIFICATION_MODE is still true in extension/lib/pro.js — flip to false before building." >&2
  exit 1
fi
echo "✓ VERIFICATION_MODE is false"

if grep -q "DEV_MODE_ENABLED = true" "$SCRIPT_DIR/lib/pro.js"; then
  echo "✗ ERROR: DEV_MODE_ENABLED is still true in extension/lib/pro.js — flip to false before building." >&2
  exit 1
fi
echo "✓ DEV_MODE_ENABLED is false"

if grep -q "DEV_FORCE_PAID = true" "$SCRIPT_DIR/lib/pro.js"; then
  echo "✗ ERROR: DEV_FORCE_PAID is still true in extension/lib/pro.js — flip to false before building." >&2
  exit 1
fi
echo "✓ DEV_FORCE_PAID is false"

# ── 1. Validate manifest.json ────────────────────────────────────────────────
echo "→ Validating manifest.json…"
if ! python3 -c "import json,sys; json.load(open('$SCRIPT_DIR/manifest.json'))" 2>/dev/null; then
  echo "✗ manifest.json is not valid JSON" >&2
  exit 1
fi
echo "  ✓ manifest.json is valid"

# ── 2. Read version from manifest ───────────────────────────────────────────
VERSION=$(python3 -c "import json; print(json.load(open('$SCRIPT_DIR/manifest.json'))['version'])")
echo "  ✓ version: $VERSION"

# ── 3. Remove temp / OS files ────────────────────────────────────────────────
echo "→ Cleaning temp files…"
find "$SCRIPT_DIR" -name ".DS_Store" -delete
find "$SCRIPT_DIR" -name "Thumbs.db" -delete
find "$SCRIPT_DIR" -name "*.swp" -delete
echo "  ✓ done"

# ── 4. Create dist/ directory ────────────────────────────────────────────────
mkdir -p "$DIST_DIR"

ZIP_NAME="makerpeek-extension-v${VERSION}.zip"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"

# Remove any existing zip for this version
rm -f "$ZIP_PATH"

# ── 5. Zip extension contents (files at archive root, not in a subdirectory) ─
echo "→ Creating ${ZIP_NAME}..."
(
  cd "$SCRIPT_DIR"
  zip -r "$ZIP_PATH" . \
    --exclude "*.sh" \
    --exclude "dist/*" \
    --exclude "verification/*" \
    --exclude ".git/*" \
    --exclude "node_modules/*" \
    --exclude ".env" \
    --exclude ".env.*" \
    --exclude ".DS_Store" \
    --exclude "*.swp" \
    --exclude "*.bak" \
    --exclude "*.log" \
    --exclude "*.map" \
    --exclude "README.md" \
    --exclude "assets/generate-icons.*" \
    --exclude "assets/icon.svg"
)

# ── 6. Report ────────────────────────────────────────────────────────────────
if [ -f "$ZIP_PATH" ]; then
  SIZE=$(du -sh "$ZIP_PATH" | cut -f1)
  echo ""
  echo "✓ Built: $ZIP_PATH"
  echo "  Size:   $SIZE"
else
  echo "✗ Zip was not created" >&2
  exit 1
fi
