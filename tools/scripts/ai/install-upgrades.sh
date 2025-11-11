#!/usr/bin/env bash
#
# AI Infrastructure Upgrade - Installation Script
# Installs dependencies and sets up new AI capabilities
#

set -e  # Exit on error

echo "🚀 AI Infrastructure Upgrade - Installation"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📋 Checking prerequisites..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Error: Node.js 18+ required (current: $(node -v))"
  exit 1
fi

echo "${GREEN}✅ Node.js $(node -v)${NC}"
echo ""

# Phase 1: Core Dependencies
echo "📦 Phase 1: Installing core dependencies..."
echo "   - tree-sitter (multi-language AST parsing)"
echo "   - @xenova/transformers (local AI embeddings)"
echo ""

npm install --save-dev \
  tree-sitter@0.21.0 \
  tree-sitter-javascript@0.21.0 \
  tree-sitter-typescript@0.21.0 \
  tree-sitter-python@0.21.0 \
  @xenova/transformers@2.9.0

echo ""
echo "${GREEN}✅ Phase 1 complete${NC}"
echo ""

# Optional Phase 2 confirmation
echo "${YELLOW}📦 Phase 2 (Optional): Advanced capabilities${NC}"
echo "   This includes:"
echo "   - chokidar (file watching for incremental indexing)"
echo "   - vectordb (LanceDB for vector storage)"
echo ""
read -p "Install Phase 2 dependencies? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  npm install --save-dev chokidar@3.5.3 vectordb@0.4.0
  echo ""
  echo "${GREEN}✅ Phase 2 complete${NC}"
else
  echo "⏭️  Skipping Phase 2 (can install later)"
fi

echo ""
echo "🧪 Running tests..."
echo ""

# Test tree-sitter parser
echo "Testing tree-sitter parser..."
if node tools/scripts/ai/tree-sitter-parser.cjs list > /dev/null 2>&1; then
  echo "${GREEN}✅ Tree-sitter parser working${NC}"
else
  echo "${YELLOW}⚠️  Tree-sitter test failed (dependencies may still be installing)${NC}"
fi

# Test embedding engine (this will download the model ~23MB on first run)
echo ""
echo "Testing embedding engine (first run downloads ~23MB model)..."
echo "This may take 30-60 seconds..."
if timeout 90s node tools/scripts/ai/embedding-engine.cjs test > /dev/null 2>&1; then
  echo "${GREEN}✅ Embedding engine working${NC}"
else
  echo "${YELLOW}⚠️  Embedding test timed out or failed${NC}"
  echo "   Run manually: node tools/scripts/ai/embedding-engine.cjs test"
fi

echo ""
echo "✨ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Test new tools:"
echo "     npm run ai:parse tools/scripts/ai/ast-analyzer.cjs"
echo "     node tools/scripts/ai/embedding-engine.cjs test"
echo ""
echo "  2. Read upgrade plan:"
echo "     cat docs/AI-INFRASTRUCTURE-UPGRADE.md"
echo ""
echo "  3. Review implementation summary:"
echo "     cat docs/AI-IMPLEMENTATION-SUMMARY.md"
echo ""
echo "For help, see: docs/AI-INFRASTRUCTURE-UPGRADE.md"
