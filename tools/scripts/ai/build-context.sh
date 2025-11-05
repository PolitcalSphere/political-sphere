#!/bin/bash
# AI Context Builder - Automatically generates focused context for AI assistants
# Runs on-demand or as part of git hooks to keep AI informed about project state

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CONTEXT_DIR="$PROJECT_ROOT/ai/context-bundles"
KNOWLEDGE_BASE="$PROJECT_ROOT/ai/ai-knowledge/knowledge-base.json"

# Ensure directories exist
mkdir -p "$CONTEXT_DIR"
mkdir -p "$PROJECT_ROOT/ai/ai-knowledge"

echo "🤖 Building AI Context..."

# 1. Generate recent changes context
echo "  📝 Recent changes..."
cat > "$CONTEXT_DIR/recent-changes.md" << EOF
# Recent Changes Context
Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Last 10 Commits
\`\`\`
$(git log -10 --oneline --no-decorate 2>/dev/null || echo "No git history available")
\`\`\`

## Changed Files (Last 24 Hours)
\`\`\`
$(find . -type f -mtime -1 -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" 2>/dev/null | head -20)
\`\`\`

## Current Branch Status
\`\`\`
$(git status --short 2>/dev/null || echo "No git status available")
\`\`\`
EOF

# 2. Generate active tasks context
echo "  📋 Active tasks..."
if [ -f "$PROJECT_ROOT/docs/TODO.md" ]; then
    cat > "$CONTEXT_DIR/active-tasks.md" << EOF
# Active Tasks Context
Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Current TODO Items
$(grep -E "^- \[ \]" "$PROJECT_ROOT/docs/TODO.md" | head -20 || echo "No active tasks found")

## Recently Completed
$(grep -E "^- \[x\]" "$PROJECT_ROOT/docs/TODO.md" | head -10 || echo "No completed tasks found")
EOF
fi

# 3. Generate project structure snapshot
echo "  📁 Project structure..."
cat > "$CONTEXT_DIR/project-structure.md" << EOF
# Project Structure Context
Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Key Directories
\`\`\`
$(tree -L 2 -d -I 'node_modules|dist|coverage|.git' 2>/dev/null || find . -maxdepth 2 -type d -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" | head -30)
\`\`\`

## Package Locations
\`\`\`
$(find apps libs -name package.json 2>/dev/null | head -20)
\`\`\`

## Configuration Files
\`\`\`
$(find . -maxdepth 2 -type f \( -name "*.config.js" -o -name "*.config.ts" -o -name "tsconfig*.json" \) -not -path "*/node_modules/*" 2>/dev/null | head -15)
\`\`\`
EOF

# 4. Generate error patterns context (from logs)
echo "  ⚠️  Error patterns..."
cat > "$CONTEXT_DIR/error-patterns.md" << EOF
# Error Patterns Context
Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Recent Errors in Logs
\`\`\`
$(grep -r "ERROR\|Error\|error" logs/ 2>/dev/null | tail -20 || echo "No recent errors in logs")
\`\`\`

## Common Test Failures
\`\`\`
$(find . -name "*.log" -type f -not -path "*/node_modules/*" -exec grep -l "FAIL\|failed" {} \; 2>/dev/null | head -10 || echo "No test failure logs found")
\`\`\`
EOF

# 5. Generate dependencies snapshot
echo "  📦 Dependencies..."
cat > "$CONTEXT_DIR/dependencies.md" << EOF
# Dependencies Context
Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Top-Level Dependencies
\`\`\`json
$(node -e "const pkg = require('./package.json'); console.log(JSON.stringify({dependencies: Object.keys(pkg.dependencies || {}), devDependencies: Object.keys(pkg.devDependencies || {}).slice(0, 10)}, null, 2))" 2>/dev/null || echo "{}")
\`\`\`

## Workspace Structure
\`\`\`
$(npm list --depth=0 2>/dev/null | head -20 || echo "No workspace info available")
\`\`\`
EOF

# 6. Generate architectural patterns (from existing code)
echo "  🏗️  Code patterns..."
cat > "$CONTEXT_DIR/code-patterns.md" << EOF
# Code Patterns Context
Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Common Imports (Most Used)
\`\`\`
$(grep -r "^import\|^const.*require" apps/*/src libs/*/src 2>/dev/null | \
  sed 's/.*import/import/' | sed 's/.*const/const/' | \
  sort | uniq -c | sort -rn | head -15 || echo "No import patterns found")
\`\`\`

## Error Handling Patterns
\`\`\`
$(grep -r "try\|catch\|throw" apps/*/src libs/*/src 2>/dev/null | wc -l | awk '{print "Error handlers found: " $1}')
\`\`\`

## Test File Count
\`\`\`
$(find . -name "*.test.js" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | wc -l | awk '{print "Test files: " $1}')
\`\`\`
EOF

# 7. Create context index
echo "  📚 Creating index..."
cat > "$CONTEXT_DIR/INDEX.md" << EOF
# AI Context Index
Last Updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Available Context Bundles

1. **recent-changes.md** - Git history, modified files, branch status
2. **active-tasks.md** - TODO items from docs/TODO.md
3. **project-structure.md** - Directory layout, packages, configs
4. **error-patterns.md** - Recent errors and test failures
5. **dependencies.md** - npm dependencies and workspace info
6. **code-patterns.md** - Common imports and patterns

## How to Use

AI assistants should read these files before:
- Making architectural changes
- Debugging issues
- Understanding recent work
- Proposing new features

## Refresh

Run: \`npm run ai:context\` or \`./tools/scripts/ai/build-context.sh\`
EOF

# 8. Update knowledge base with current state
echo "  🧠 Updating knowledge base..."
if [ -f "$KNOWLEDGE_BASE" ]; then
    # Update lastUpdated timestamp in knowledge base and bump patch version semver-style
    node -e "
    const fs = require('fs');
    const path = '$KNOWLEDGE_BASE';
    const kb = JSON.parse(fs.readFileSync(path, 'utf8'));
    const now = new Date().toISOString();

    const coerceVersion = (input) => {
      const normalized = String(input ?? '').trim();
      const semverMatch = normalized.match(/^(\d+)\.(\d+)\.(\d+)$/);
      if (!semverMatch) return { major: 1, minor: 0, patch: 0 };
      return {
        major: Number.parseInt(semverMatch[1], 10),
        minor: Number.parseInt(semverMatch[2], 10),
        patch: Number.parseInt(semverMatch[3], 10),
      };
    };

    const nextPatch = ({ major, minor, patch }) => \`\${major}.\${minor}.\${patch + 1}\`;

    kb.lastUpdated = now;
    kb.version = nextPatch(coerceVersion(kb.version));

    fs.writeFileSync(path, JSON.stringify(kb, null, 2));
    " 2>/dev/null || echo "  (Knowledge base update skipped)"
fi

echo ""
echo "✅ AI Context built successfully!"
echo "📂 Context bundles: $CONTEXT_DIR"
echo ""
echo "💡 AI assistants can now:"
echo "   - Read recent-changes.md for git context"
echo "   - Check active-tasks.md for current work"
echo "   - Review error-patterns.md for debugging"
echo "   - Reference code-patterns.md for consistency"
