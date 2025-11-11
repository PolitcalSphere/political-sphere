#!/usr/bin/env bash
# Aggressive cleanup script for VS Code performance optimization
# Kills resource-intensive processes and cleans temporary files
# Use this when VS Code or AI assistants become slow

set -e

echo "🧹 Starting aggressive performance cleanup..."

# Count processes before cleanup
before=$(ps aux | grep -E "(vitest|playwright|esbuild|index-server|tsserver)" | grep -v grep | wc -l | tr -d ' ')
echo "Found $before resource-intensive processes"

# Kill ALL Vitest processes (workers and main processes)
echo "🔍 Killing Vitest processes..."
pkill -9 -f "vitest" 2>/dev/null && echo "✅ Killed Vitest processes" || echo "ℹ️  No Vitest processes found"

# Kill ALL Playwright processes
echo "🔍 Killing Playwright processes..."
pkill -9 -f "playwright" 2>/dev/null && echo "✅ Killed Playwright processes" || echo "ℹ️  No Playwright processes found"

# Kill ALL esbuild processes
echo "🔍 Killing esbuild processes..."
pkill -9 -f "esbuild" 2>/dev/null && echo "✅ Killed esbuild processes" || echo "ℹ️  No esbuild processes found"

# Kill AI index server processes
echo "🔍 Killing AI index server..."
pkill -9 -f "index-server" 2>/dev/null && echo "✅ Killed AI index server" || echo "ℹ️  No AI index server found"

# Kill orphaned TypeScript server processes (use with caution - VS Code will restart them)
echo "🔍 Killing orphaned TypeScript servers..."
pkill -9 -f "tsserver.*--cancellationPipeName" 2>/dev/null && echo "✅ Killed orphaned TypeScript servers" || echo "ℹ️  No orphaned TypeScript servers found"

# Clean up test database files cluttering the workspace
echo "🔍 Cleaning test database files..."
deleted_dbs=$(find . -maxdepth 1 -name "test-*.db*" -type f 2>/dev/null | wc -l | tr -d ' ')
find . -maxdepth 1 -name "test-*.db*" -type f -delete 2>/dev/null && echo "✅ Cleaned $deleted_dbs test database files" || echo "ℹ️  No test databases found"

# Clean up log files in root
echo "🔍 Cleaning root log files..."
deleted_logs=$(find . -maxdepth 1 -name "*.log" -type f 2>/dev/null | wc -l | tr -d ' ')
find . -maxdepth 1 -name "*.log" -type f -delete 2>/dev/null && echo "✅ Cleaned $deleted_logs log files" || echo "ℹ️  No log files found"

# Clean up old coverage data
echo "🔍 Cleaning coverage data..."
if [ -d "coverage" ]; then
  rm -rf coverage/ && echo "✅ Cleaned coverage directory"
else
  echo "ℹ️  No coverage directory found"
fi

# Clean up .vitest cache
echo "🔍 Cleaning Vitest cache..."
if [ -d ".vitest" ]; then
  rm -rf .vitest/ && echo "✅ Cleaned Vitest cache"
else
  echo "ℹ️  No Vitest cache found"
fi

# Optional: Clean up Nx cache (can free significant space)
# Uncomment to enable
# echo "🔍 Cleaning Nx cache..."
# if [ -d ".nx/cache" ]; then
#   rm -rf .nx/cache && echo "✅ Cleaned Nx cache"
# fi

# Wait for cleanup to complete
sleep 1

# Count processes after cleanup
after=$(ps aux | grep -E "(vitest|playwright|esbuild|index-server|tsserver)" | grep -v grep | wc -l | tr -d ' ')
echo ""
echo "✅ Cleanup complete!"
echo "📊 Killed $((before - after)) resource-intensive processes"

# Show current system resources
vscode_processes=$(ps aux | grep -E "(Code Helper|Electron)" | grep -v grep | wc -l | tr -d ' ')
node_processes=$(ps aux | grep node | grep -v grep | wc -l | tr -d ' ')
echo "📊 VS Code processes: $vscode_processes"
echo "📊 Node processes: $node_processes"
echo ""
echo "📈 System load:"
uptime
echo ""
echo "� Disk space saved: ~$(du -sh coverage .vitest test-*.db* *.log 2>/dev/null | awk '{sum+=$1} END {print sum}')MB"

echo ""
echo "🎯 Next steps for maximum performance:"
echo "   1. Reload VS Code window: Cmd+Shift+P → 'Developer: Reload Window'"
echo "   2. Restart TypeScript server: Cmd+Shift+P → 'TypeScript: Restart TS Server'"
echo "   3. Close unused editor tabs (aim for < 10 open)"
echo "   4. Disable unused extensions temporarily"
echo ""
echo "💡 Run 'npm run cleanup' anytime VS Code feels slow"
echo "⚡ Run 'npm run perf:monitor' to watch resource usage in real-time"
echo "   4. Restart VS Code completely"
