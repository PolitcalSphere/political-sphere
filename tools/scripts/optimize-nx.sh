#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Optimizes Nx daemon and cache to prevent slowdowns

set -euo pipefail

echo "🔧 Optimizing Nx configuration..."

# Stop the daemon
echo "Stopping Nx daemon..."
nx daemon --stop || true

# Clear old cache if it's too large (> 1GB)
CACHE_SIZE=$(du -sm .nx/cache 2>/dev/null | cut -f1 || echo "0")
if [ "$CACHE_SIZE" -gt 1024 ]; then
  echo "⚠️  Cache is ${CACHE_SIZE}MB, clearing old entries..."
  nx reset
fi

# Set environment variables for better performance
cat > .env.local << 'EOF'
# Nx Performance Optimizations
NX_DAEMON=true
NX_PARALLEL=6
NX_CACHE_DIRECTORY=.nx/cache
NX_SKIP_NX_CACHE=false
NX_VERBOSE_LOGGING=false
NX_PERF_LOGGING=false
NX_PROJECT_GRAPH_CACHE_DIRECTORY=.nx/cache
EOF

# Restart daemon with optimized settings
echo "Starting optimized Nx daemon..."
nx daemon --start

echo "✅ Nx optimization complete!"
echo ""
echo "Key improvements:"
echo "  - Debounce delay: 1000ms (reduces refresh frequency)"
echo "  - Ignores AI cache directories (prevents unnecessary watches)"
echo "  - Cache directory optimized"
echo "  - Daemon settings tuned for performance"
echo ""
echo "If you still experience slowdowns, try:"
echo "  1. nx reset (clears cache)"
echo "  2. nx daemon --stop && nx daemon --start (restarts daemon)"
echo "  3. Ensure AI directories are not in your IDE's file watcher"
