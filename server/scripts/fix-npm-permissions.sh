#!/usr/bin/env bash
# Fix root-owned node_modules after accidental `sudo npm install` / `sudo npm run build`.
# Usage: bash scripts/fix-npm-permissions.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OWNER="${SUDO_USER:-$(whoami)}"

echo "==> Fixing ownership of $ROOT to $OWNER"
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Re-run with sudo: sudo bash scripts/fix-npm-permissions.sh"
  exit 1
fi

chown -R "$OWNER:$OWNER" "$ROOT/node_modules" "$ROOT/dist" "$ROOT/src/generated" 2>/dev/null || true
echo "Done. Build as $OWNER without sudo: npm run build"
