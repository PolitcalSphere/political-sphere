#!/bin/bash
# Advanced workspace optimization script
# Cleans caches, optimizes Git, and improves file system performance

set -e

echo "🚀 Political Sphere Workspace Optimizer"
echo "========================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track space saved
SPACE_BEFORE=$(du -sk . 2>/dev/null | cut -f1)

echo -e "${BLUE}1. Cleaning Node.js caches...${NC}"
# Clean npm cache (safe operation)
npm cache clean --force 2>/dev/null || echo "  No npm cache to clean"

# Clean pnpm cache if exists
if command -v pnpm &> /dev/null; then
    pnpm store prune 2>/dev/null || echo "  No pnpm cache to prune"
fi

# Clean node_modules caches
find node_modules -type d -name ".cache" -exec rm -rf {} + 2>/dev/null || true
echo -e "${GREEN}  ✓ Node.js caches cleaned${NC}"

echo ""
echo -e "${BLUE}2. Cleaning build artifacts...${NC}"
# Remove dist/build directories
find . -type d -name "dist" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "build" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "out" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
echo -e "${GREEN}  ✓ Build artifacts cleaned${NC}"

echo ""
echo -e "${BLUE}3. Cleaning test artifacts...${NC}"
# Remove coverage reports (can be regenerated)
rm -rf coverage reports/*.json 2>/dev/null || true
# Clean Vitest cache
find . -type d -name ".vitest" -exec rm -rf {} + 2>/dev/null || true
# Clean Playwright cache
find . -type d -name ".playwright" -exec rm -rf {} + 2>/dev/null || true
echo -e "${GREEN}  ✓ Test artifacts cleaned${NC}"

echo ""
echo -e "${BLUE}4. Cleaning AI caches...${NC}"
# Clean AI index and cache (safe - will be regenerated)
rm -rf ai-cache ai-index ai/cache 2>/dev/null || true
# Keep ai/ai-cache and ai/ai-index but clean old entries
find ai/ai-cache -type f -mtime +7 -delete 2>/dev/null || true
find ai/ai-index -type f -mtime +7 -delete 2>/dev/null || true
echo -e "${GREEN}  ✓ AI caches cleaned${NC}"

echo ""
echo -e "${BLUE}5. Cleaning log files...${NC}"
# Remove old log files (keep last 7 days)
find logs -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true
# Truncate large log files
find logs -type f -name "*.log" -size +10M -exec sh -c 'tail -n 1000 "$1" > "$1.tmp" && mv "$1.tmp" "$1"' _ {} \; 2>/dev/null || true
echo -e "${GREEN}  ✓ Log files cleaned${NC}"

echo ""
echo -e "${BLUE}6. Optimizing Git repository...${NC}"
# Clean up Git loose objects and optimize
git gc --auto --quiet 2>/dev/null || echo "  Skipping Git optimization"
# Clean up unreachable commits
git prune --expire=now 2>/dev/null || true
# Remove Git index lock files if stuck
rm -f .git/index.lock 2>/dev/null || true
echo -e "${GREEN}  ✓ Git repository optimized${NC}"

echo ""
echo -e "${BLUE}7. Cleaning temporary files...${NC}"
# Remove temp directories
rm -rf tmp temp .cache 2>/dev/null || true
# Remove macOS specific files
find . -name ".DS_Store" -delete 2>/dev/null || true
# Remove editor swap files
find . -name "*.swp" -delete 2>/dev/null || true
find . -name "*~" -delete 2>/dev/null || true
echo -e "${GREEN}  ✓ Temporary files cleaned${NC}"

echo ""
echo -e "${BLUE}8. Cleaning Nx cache...${NC}"
# Clean Nx cache (safe - will be regenerated)
rm -rf .nx/cache 2>/dev/null || true
# Keep workspace data but clean old task results
find .nx -type f -name "*.hash" -mtime +14 -delete 2>/dev/null || true
echo -e "${GREEN}  ✓ Nx cache cleaned${NC}"

echo ""
echo -e "${BLUE}9. Optimizing TypeScript...${NC}"
# Clean TypeScript build info files
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete 2>/dev/null || true
echo -e "${GREEN}  ✓ TypeScript optimized${NC}"

echo ""
echo -e "${BLUE}10. Creating .gitignore optimizations...${NC}"
# Ensure .gitignore excludes performance-impacting files
cat >> .gitignore << 'EOF' 2>/dev/null || true

# Performance optimization ignores
*.tsbuildinfo
.vitest/
.playwright/
*.log
.cache/
EOF
echo -e "${GREEN}  ✓ .gitignore optimized${NC}"

# Calculate space saved
SPACE_AFTER=$(du -sk . 2>/dev/null | cut -f1)
SPACE_SAVED=$((SPACE_BEFORE - SPACE_AFTER))
SPACE_SAVED_MB=$((SPACE_SAVED / 1024))

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Optimization Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "💾 Disk space saved: ${YELLOW}${SPACE_SAVED_MB} MB${NC}"
echo ""
echo -e "${BLUE}📊 Current workspace status:${NC}"
du -sh node_modules .git .nx 2>/dev/null | awk '{print "  " $2 ": " $1}'

echo ""
echo -e "${YELLOW}💡 Recommended next steps:${NC}"
echo "  1. Run 'npm install' if you notice any missing dependencies"
echo "  2. Rebuild your project: 'npm run build'"
echo "  3. Restart TypeScript server in VS Code"
echo "  4. Run 'npm run cleanup' if VS Code feels slow"
echo ""
echo -e "${BLUE}🔄 Run this script monthly or when workspace feels sluggish${NC}"
