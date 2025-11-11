#!/bin/bash
# Performance monitoring script for Political Sphere workspace
# Tracks resource usage and alerts on performance issues

set -e

echo "📊 Political Sphere Performance Monitor"
echo "========================================"
echo ""

# Check for problematic processes
VITEST_COUNT=$(ps aux | grep -E "vitest.*worker" | grep -v grep | wc -l | tr -d ' ')
PLAYWRIGHT_COUNT=$(ps aux | grep -E "playwright.*test-server" | grep -v grep | wc -l | tr -d ' ')
ESBUILD_COUNT=$(ps aux | grep -E "esbuild.*--service" | grep -v grep | wc -l | tr -d ' ')
INDEX_SERVER=$(ps aux | grep -E "index-server\.js" | grep -v grep | wc -l | tr -d ' ')

# Total problematic processes
TOTAL=$((VITEST_COUNT + PLAYWRIGHT_COUNT + ESBUILD_COUNT + INDEX_SERVER))

echo "🔍 Resource-Heavy Processes:"
echo "   Vitest workers:        $VITEST_COUNT"
echo "   Playwright servers:    $PLAYWRIGHT_COUNT"
echo "   esbuild services:      $ESBUILD_COUNT"
echo "   AI index servers:      $INDEX_SERVER"
echo "   ────────────────────────────"
echo "   Total:                 $TOTAL"
echo ""

# Warning thresholds
if [ $VITEST_COUNT -gt 2 ]; then
  echo "⚠️  WARNING: Too many Vitest workers ($VITEST_COUNT). Run cleanup script."
fi

if [ $PLAYWRIGHT_COUNT -gt 1 ]; then
  echo "⚠️  WARNING: Multiple Playwright servers ($PLAYWRIGHT_COUNT). Run cleanup script."
fi

if [ $ESBUILD_COUNT -gt 2 ]; then
  echo "⚠️  WARNING: Multiple esbuild services ($ESBUILD_COUNT). Run cleanup script."
fi

if [ $INDEX_SERVER -gt 1 ]; then
  echo "⚠️  WARNING: Multiple AI index servers ($INDEX_SERVER). Run cleanup script."
fi
