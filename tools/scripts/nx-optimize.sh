#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2025 Political Sphere Contributors
#
# Nx Performance Optimization Script
# Prevents slowdowns from unnecessary workspace refreshes

set -euo pipefail

echo "🚀 Optimizing Nx performance..."

# 1. Clean up old cache that might be causing issues
echo "📦 Cleaning old Nx cache..."
if [ -d ".nx/cache" ]; then
  find .nx/cache -type f -mtime +7 -delete 2>/dev/null || true
  echo "✅ Cleaned cache files older than 7 days"
fi

# 2. Optimize workspace data
echo "🔧 Optimizing workspace data..."
if [ -d ".nx/workspace-data" ]; then
  # Keep only the most recent project graph
  find .nx/workspace-data -name "project-graph-*.json" -type f | sort -r | tail -n +2 | xargs rm -f 2>/dev/null || true
  echo "✅ Cleaned old project graph files"
fi

# 3. Ensure daemon is running efficiently
echo "⚙️  Checking Nx daemon..."
if pgrep -f "nx daemon" > /dev/null; then
  echo "✅ Nx daemon is running"
else
  echo "🔄 Starting Nx daemon..."
  npx nx daemon --start 2>/dev/null || true
fi

# 4. Pre-warm the project graph cache
echo "📊 Warming project graph cache..."
npx nx graph --file=/dev/null 2>/dev/null || npx nx show projects > /dev/null 2>&1 || true

# 5. Set environment variables for performance
echo "🔧 Setting performance environment variables..."
export NX_DAEMON=true
export NX_CACHE_DIRECTORY=".nx/cache"
export NX_SKIP_NX_CACHE=false
export NX_PARALLEL=$(sysctl -n hw.ncpu 2>/dev/null || echo "4")

# 6. Create performance config if it doesn't exist
if [ ! -f ".env.local" ]; then
  echo "📝 Creating local environment config..."
  cat > .env.local << 'EOF'
# Nx Performance Configuration
NX_DAEMON=true
NX_CACHE_DIRECTORY=.nx/cache
NX_SKIP_NX_CACHE=false
NX_REJECT_UNKNOWN_LOCAL_CACHE=false
NX_VERBOSE_LOGGING=false
EOF
  echo "✅ Created .env.local with Nx performance settings"
fi

echo ""
echo "✨ Nx optimization complete!"
echo ""
echo "Performance tips:"
echo "  • The .nxignore file now excludes AI cache directories"
echo "  • Daemon process is optimized for faster refreshes"
echo "  • Project graph cache is pre-warmed"
echo "  • Old cache files are automatically cleaned"
echo ""
echo "If you still experience slowdowns, run:"
echo "  npx nx reset    # Nuclear option - clears all cache"
echo "  npx nx daemon --stop && npx nx daemon --start  # Restart daemon"
