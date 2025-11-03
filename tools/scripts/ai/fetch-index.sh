#!/bin/bash
# Fetch warmed index from CI cache branch
# Usage: ./scripts/ai/fetch-index.sh

set -e

BRANCH="ai-index-cache"
INDEX_DIR="ai-index"

echo "Fetching warmed index from $BRANCH branch..."

# Check if branch exists
if ! git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  echo "Cache branch $BRANCH not found. Building fresh index..."
  node scripts/ai/code-indexer.js build
  exit 0
fi

# Fetch and checkout the cache branch temporarily
git fetch origin "$BRANCH"
git checkout "origin/$BRANCH" -- "$INDEX_DIR"

echo "Index cache restored from $BRANCH"

# Return to original branch
git checkout - >/dev/null 2>&1

# Verify index integrity
if [ -f "$INDEX_DIR/codebase-index.json" ]; then
  INDEX_SIZE=$(stat -f%z "$INDEX_DIR/codebase-index.json" 2>/dev/null || stat -c%s "$INDEX_DIR/codebase-index.json" 2>/dev/null || echo "0")
  if [ "$INDEX_SIZE" -gt 1000 ]; then
    echo "Index verified (size: $INDEX_SIZE bytes)"
  else
    echo "Index appears corrupted, rebuilding..."
    node scripts/ai/code-indexer.js build
  fi
else
  echo "Index file missing, rebuilding..."
  node scripts/ai/code-indexer.js build
fi

echo "Ready to use cached index"
