#!/usr/bin/env bash
set -euo pipefail

# Fetch warmed AI index from ai-index-cache branch and copy to local ai/index/
# Usage: ./tools/scripts/ai/fetch-index.sh [remote]
REMOTE=${1:-origin}
BRANCH=ai-index-cache

echo "Fetching warmed AI index from ${REMOTE}/${BRANCH}..."

git fetch ${REMOTE} ${BRANCH} --no-tags || { echo "Branch ${BRANCH} not found on remote ${REMOTE}"; exit 1; }

# Create temporary work tree
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Checkout the ai-index directory from the remote branch
git --work-tree="$TMPDIR" checkout ${REMOTE}/${BRANCH} -- ai-index || { echo "No ai-index artifacts in branch"; exit 1; }

mkdir -p ai/index
rsync -a --delete "$TMPDIR/ai-index/" ai/index/

echo "ai/index fetched and populated. Size:" 
du -sh ai/index || true
