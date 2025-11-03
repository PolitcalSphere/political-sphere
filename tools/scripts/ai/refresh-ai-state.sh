#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "🔄 Refreshing AI state (cache, metrics, recent changes)..."
node tools/scripts/ai/pre-cache.js
node tools/scripts/ai/performance-monitor.js
echo "✅ AI state refreshed. Context bundles and metrics are up to date."
