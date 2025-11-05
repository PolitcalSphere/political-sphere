#!/bin/bash
# Quick AI knowledge refresh - Updates project knowledge without heavy indexing
# Use this before asking AI for help on unfamiliar areas

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PATTERNS_FILE="$PROJECT_ROOT/ai/ai-learning/patterns.json"

mkdir -p "$PROJECT_ROOT/ai/ai-learning"

echo "🧠 Refreshing AI Knowledge..."

# Extract common patterns from recent successful operations
if [ ! -f "$PATTERNS_FILE" ]; then
    cat > "$PATTERNS_FILE" << 'EOF'
{
  "successfulPatterns": [],
  "commonIssues": [],
  "fastPaths": {},
  "lastUpdated": ""
}
EOF
fi

# Update patterns with current project insights
node -e "
const fs = require('fs');
const patterns = JSON.parse(fs.readFileSync('$PATTERNS_FILE', 'utf8'));

// Add fast paths for common operations
patterns.fastPaths = {
  'run_tests': 'npm run test:changed',
  'check_types': 'npm run type-check',
  'cleanup': 'npm run cleanup',
  'build': 'npm run build --if-present',
  'format': 'npm run format',
  'lint': 'npm run lint:fix'
};

// Track common file patterns
patterns.filePatterns = {
  'tests': '**/*.{test,spec}.{js,ts}',
  'configs': '**/*.config.{js,ts}',
  'source': 'apps/*/src/**/*.{js,ts}',
  'libs': 'libs/*/src/**/*.{js,ts}'
};

// Performance hints
patterns.performanceHints = [
  'Use npm run test:changed instead of full test suite',
  'Run npm run cleanup when VS Code feels slow',
  'Check ai/context-bundles/ before asking about project structure',
  'Read docs/TODO.md for current priorities'
];

patterns.lastUpdated = new Date().toISOString();

fs.writeFileSync('$PATTERNS_FILE', JSON.stringify(patterns, null, 2));
console.log('✓ Patterns updated');
" 2>/dev/null || echo "Node.js update skipped"

# Create quick reference for file locations
cat > "$PROJECT_ROOT/ai/ai-knowledge/file-map.json" << EOF
{
  "documentation": {
    "main": "docs/TODO.md",
    "architecture": "docs/architecture.md",
    "security": "docs/SECURITY.md",
    "changelog": "docs/CHANGELOG.md",
    "performance": "docs/VSCODE-PERFORMANCE.md"
  },
  "configuration": {
    "typescript": "tools/config/tsconfig.base.json",
    "vitest": "vitest.config.js",
    "vscode": ".vscode/settings.json",
    "ai": "ai-controls.json",
    "copilot": ".github/copilot-instructions/copilot-instructions.md"
  },
  "source": {
    "api": "apps/api/src",
    "frontend": "apps/frontend/src",
    "shared": "libs/shared/src",
    "tests": "**/__tests__"
  },
  "scripts": {
    "ai": "tools/scripts/ai",
    "performance": "scripts/cleanup-processes.sh",
    "optimization": "scripts/optimize-workspace.sh"
  }
}
EOF

echo "✅ AI knowledge refreshed!"
echo ""
echo "📚 Updated files:"
echo "   - ai/ai-learning/patterns.json"
echo "   - ai/ai-knowledge/file-map.json"
