# AI Infrastructure Upgrade Plan

**Version:** 1.0.0  
**Date:** 2025-11-05  
**Owner:** AI Governance Committee  
**Execution Mode:** Safe (T0 + T1 + T2)  
**Status:** Draft

---

## Executive Summary

This plan upgrades Political Sphere's AI infrastructure using proven, battle-tested open-source technologies from GitHub's ecosystem. All proposed tools have millions of users, active maintenance, and compatible licenses (MIT/Apache 2.0).

**Key Goals:**

- **10x faster** semantic code search with local embeddings
- **Multi-language** AST parsing beyond JavaScript/TypeScript
- **Real-time** incremental indexing (no full rebuilds)
- **Graph-based** code analysis for impact assessment
- **Automated** code review with actionable feedback
- **Zero external APIs** - all processing local and privacy-safe

**Expected Impact:**

- Response time: 100ms → 10ms (semantic search)
- Index rebuild: 30s → 100ms (incremental)
- Language support: 2 → 20+ languages
- Code insights: Basic → Production-grade

---

## Current State Analysis

### ✅ Existing Strengths

**Well-designed foundation:**

- `ast-analyzer.cjs` - Acorn-based complexity analysis
- `semantic-indexer.cjs` - Symbol extraction and search
- `ai-assistant.cjs` - Unified orchestration layer
- `expert-knowledge.cjs` - Pattern database
- `ai-hub.cjs` - Query routing and caching

**Good patterns already in place:**

- Modular architecture with clear separation of concerns
- npm script integration for easy invocation
- JSON-based knowledge persistence
- Governance-first approach with auditability

### ⚠️ Current Limitations

1. **JavaScript-only AST parsing** (Acorn doesn't support Python, Rust, Go, etc.)
2. **Keyword-based search** (no semantic similarity)
3. **Full index rebuilds** (no incremental updates)
4. **Flat file structure** (hard to query relationships)
5. **Manual pattern detection** (no automated learning)
6. **Limited test coverage** (tools lack comprehensive tests)

---

## Proposed Improvements

### 🚀 Phase 1: Foundation Enhancement (Week 1)

#### 1.1 Tree-sitter Integration

**Technology:** [tree-sitter](https://github.com/tree-sitter/tree-sitter) (MIT)  
**Stars:** 17.5k+ | **Used by:** GitHub, Neovim, Atom, Zed  
**Purpose:** Multi-language AST parsing

**Capabilities:**

- Parse 40+ languages (JS, TS, Python, Rust, Go, Java, C++, etc.)
- Incremental parsing (only re-parse changed sections)
- Precise syntax highlighting
- Error-tolerant parsing (works with incomplete code)

**Implementation:**

```bash
npm install tree-sitter tree-sitter-javascript tree-sitter-typescript \
  tree-sitter-python tree-sitter-go tree-sitter-rust
```

**New file:** `tools/scripts/ai/tree-sitter-parser.cjs`

**Integration points:**

- Replace Acorn in `ast-analyzer.cjs` for multi-language support
- Use for `semantic-indexer.cjs` to index non-JS files
- Enable polyglot code navigation

**Estimated effort:** 2-3 days  
**Risk:** Low (well-documented, stable API)

---

#### 1.2 Transformers.js for Local Embeddings

**Technology:** [@xenova/transformers](https://github.com/xenova/transformers.js) (Apache 2.0)  
**Stars:** 13k+ | **Downloads:** 1M+/month  
**Purpose:** Local semantic embeddings without API calls

**Capabilities:**

- Run transformer models in Node.js (ONNX Runtime)
- Generate semantic embeddings for code/text
- Privacy-safe (100% local, no external APIs)
- Small models (~25MB) with excellent performance

**Recommended model:** `Xenova/all-MiniLM-L6-v2`

- Size: 23MB
- Speed: ~50ms per embedding
- Quality: 93% accuracy on semantic similarity tasks

**Implementation:**

```bash
npm install @xenova/transformers
```

**New file:** `tools/scripts/ai/embedding-engine.cjs`

**Features:**

- Generate embeddings for code snippets
- Semantic similarity search (cosine distance)
- Cache embeddings for fast retrieval
- Batch processing for efficiency

**Integration points:**

- Enhance `semantic-indexer.cjs` with vector search
- Power intelligent code search (beyond keywords)
- Enable "find similar code" functionality

**Estimated effort:** 2-3 days  
**Risk:** Low (simple API, well-documented)

---

#### 1.3 Incremental Indexing with Chokidar

**Technology:** [chokidar](https://github.com/paulmillr/chokidar) (MIT)  
**Stars:** 10.5k+ | **Used by:** Webpack, Vite, Rollup, Next.js  
**Purpose:** Efficient file watching for real-time updates

**Capabilities:**

- Watch file system changes (add/modify/delete)
- Cross-platform (macOS, Linux, Windows)
- Efficient (native fs.watch with fallback)
- Handles large codebases (10k+ files)

**Implementation:**

```bash
npm install chokidar
```

**New file:** `tools/scripts/ai/incremental-indexer.cjs` (enhance existing)

**Features:**

- Watch project files for changes
- Update index incrementally (only changed files)
- Debounce rapid changes (avoid thrashing)
- Graceful shutdown on errors

**Performance improvement:**

- Full rebuild: ~30s → Incremental update: ~100ms
- Memory usage: Constant (no full re-scan)

**Integration points:**

- Replace full index rebuilds in `semantic-indexer.cjs`
- Auto-update on file save (VS Code integration)
- Keep AI context fresh without manual rebuilds

**Estimated effort:** 1-2 days  
**Risk:** Low (simple integration, well-tested)

---

### 🎯 Phase 2: Advanced Capabilities (Week 2)

#### 2.1 LanceDB for Vector Storage

**Technology:** [LanceDB](https://github.com/lancedb/lancedb) (Apache 2.0)  
**Stars:** 4.5k+ | **Used by:** Production ML systems  
**Purpose:** Persistent vector database for semantic search

**Capabilities:**

- Store embeddings with metadata
- Fast ANN (Approximate Nearest Neighbor) search
- Disk-based (no memory limits)
- SQL-like queries on vector data
- Zero-copy reads (memory-mapped files)

**Implementation:**

```bash
npm install vectordb
```

**New file:** `tools/scripts/ai/vector-store.cjs`

**Schema:**

```javascript
{
  id: string,           // unique identifier
  path: string,         // file path
  symbol: string,       // function/class name
  code: string,         // code snippet
  embedding: float[],   // 384-dim vector from all-MiniLM-L6-v2
  metadata: {
    type: string,       // 'function' | 'class' | 'type'
    language: string,   // 'typescript' | 'javascript' | etc.
    complexity: number,
    lastModified: number
  }
}
```

**Features:**

- Store ~100k code embeddings (~50MB)
- Sub-10ms similarity search
- Persist across sessions
- Version snapshots

**Integration points:**

- Backend for semantic search in `ai-assistant.cjs`
- Enable "find similar implementations"
- Power automated refactoring suggestions

**Estimated effort:** 2-3 days  
**Risk:** Medium (new technology, but good docs)

---

#### 2.2 Code Graph Database with Memgraph

**Technology:** [Memgraph](https://github.com/memgraph/memgraph) (BSL)  
**Alternative:** [Neo4j Community](https://github.com/neo4j/neo4j) (GPL) or [ArangoDB](https://github.com/arangodb/arangodb) (Apache 2.0)  
**Purpose:** Query code relationships with graph semantics

**Note:** For compatibility with project governance, we'll use **ArangoDB** (Apache 2.0 license).

**Capabilities:**

- Model code as graph (files → functions → dependencies)
- Cypher/AQL queries for complex relationships
- Call graph analysis
- Impact analysis (what breaks if I change X?)
- Dead code detection

**Implementation:**

```bash
# Docker-based for simplicity
docker pull arangodb/arangodb:latest
# Or embedded: npm install arangojs
```

**New file:** `tools/scripts/ai/code-graph.cjs`

**Graph schema:**

```
Nodes:
  File { path, language, lastModified }
  Function { name, complexity, lines }
  Class { name, methods[] }
  Type { name, properties[] }

Edges:
  IMPORTS { from: File, to: File }
  CALLS { from: Function, to: Function }
  IMPLEMENTS { from: Class, to: Interface }
  DEPENDS_ON { from: Module, to: Module }
```

**Example queries:**

```javascript
// Find all functions that call `authenticateUser`
MATCH (caller:Function)-[:CALLS]->(callee:Function {name: 'authenticateUser'})
RETURN caller.name, caller.path

// Impact analysis: what's affected by changing this function?
MATCH (f:Function {name: 'validateInput'})-[:CALLS*1..3]->(downstream)
RETURN downstream.name, downstream.path

// Find circular dependencies
MATCH (f1:File)-[:IMPORTS*]->(f2:File)-[:IMPORTS*]->(f1)
RETURN f1.path, f2.path
```

**Integration points:**

- Power "find all usages" in AI assistant
- Enable refactoring impact analysis
- Visualize code architecture

**Estimated effort:** 3-4 days  
**Risk:** Medium (requires Docker setup + learning AQL)

---

#### 2.3 Custom ESLint Plugin for AI Rules

**Technology:** [ESLint](https://github.com/eslint/eslint) (MIT)  
**Stars:** 25k+ | **Industry standard**  
**Purpose:** Enforce project-specific AI-detected patterns

**Capabilities:**

- Create custom rules based on AST patterns
- Auto-fix violations
- Integrate with CI/CD
- IDE integration (instant feedback)

**Implementation:**

```bash
npm install eslint @eslint/js
```

**New file:** `tools/eslint-plugin-political-sphere/index.js`

**Custom rules:**

```javascript
module.exports = {
  rules: {
    "no-unhandled-promises": require("./rules/no-unhandled-promises"),
    "require-error-logging": require("./rules/require-error-logging"),
    "enforce-wcag-aria": require("./rules/enforce-wcag-aria"),
    "no-hardcoded-secrets": require("./rules/no-hardcoded-secrets"),
    "require-audit-trail": require("./rules/require-audit-trail"),
  },
};
```

**Example rule implementation:**

```javascript
// rules/require-error-logging.js
module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Require error logging in catch blocks" },
    fixable: "code",
  },
  create(context) {
    return {
      CatchClause(node) {
        const hasLogging = node.body.body.some(
          (stmt) =>
            stmt.type === "ExpressionStatement" &&
            stmt.expression.callee?.object?.name === "console"
        );

        if (!hasLogging) {
          context.report({
            node,
            message: "Catch block must log errors for auditability",
            fix(fixer) {
              const param = node.param?.name || "error";
              return fixer.insertTextAfter(
                node.body.body[0],
                `\nconsole.error('Error:', ${param});`
              );
            },
          });
        }
      },
    };
  },
};
```

**Integration points:**

- Run in CI to enforce governance rules
- Auto-fix common violations
- Train AI on project-specific patterns

**Estimated effort:** 2-3 days  
**Risk:** Low (familiar technology, good docs)

---

### 🏆 Phase 3: Intelligence Layer (Week 3)

#### 3.1 AI-Powered Code Review Bot

**Technology:** Combination of existing + new tools  
**Purpose:** Automated PR review with actionable feedback

**Components:**

1. Tree-sitter parser (multi-language AST)
2. Complexity analyzer (existing `ast-analyzer.cjs`)
3. Vector similarity (detect duplicates)
4. Graph queries (impact analysis)
5. ESLint rules (style/safety checks)

**New file:** `tools/scripts/ai/code-reviewer.cjs`

**Features:**

```javascript
{
  complexity: {
    high: ['calculateTax() - cyclomatic: 25 (limit: 15)'],
    medium: ['processPayment() - cognitive: 18 (limit: 20)']
  },
  security: {
    critical: ['Hardcoded API key in config.js:45'],
    warnings: ['Unvalidated user input in auth-controller.ts:123']
  },
  accessibility: {
    errors: ['Button missing aria-label (component.tsx:89)']
  },
  duplicates: {
    similar: [
      { file1: 'user-service.ts', file2: 'admin-service.ts', similarity: 0.87 }
    ]
  },
  impact: {
    filesAffected: 12,
    testsRequired: ['test/auth/*.spec.ts'],
    breakingChanges: false
  }
}
```

**Integration:**

- GitHub Actions workflow (`.github/workflows/ai-review.yml`)
- Comment on PRs with findings
- Block merge on critical issues

**Estimated effort:** 3-4 days  
**Risk:** Medium (integration complexity)

---

#### 3.2 Clone Detection Engine

**Technology:** [jscpd](https://github.com/kucherenko/jscpd) (MIT) + custom AST comparison  
**Stars:** 1.8k+ | **Purpose:** Find duplicated code

**Implementation:**

```bash
npm install jscpd
```

**New file:** `tools/scripts/ai/clone-detector.cjs`

**Algorithms:**

1. **Token-based:** Exact token sequence matching (fast, strict)
2. **AST-based:** Structural similarity (slower, catches refactored clones)
3. **Semantic:** Embedding similarity (catches functional clones)

**Features:**

- Configurable thresholds (e.g., 80% similarity over 10 lines)
- Exclude expected duplicates (config files, tests)
- Suggest refactoring opportunities
- Track clone evolution over time

**Output:**

```json
{
  "clones": [
    {
      "type": "type-2",
      "lines": 45,
      "similarity": 0.92,
      "locations": [
        {
          "file": "libs/platform/auth/user-service.ts",
          "start": 120,
          "end": 165
        },
        {
          "file": "libs/platform/auth/admin-service.ts",
          "start": 89,
          "end": 134
        }
      ],
      "suggestion": "Extract common logic into shared/auth-helpers.ts"
    }
  ]
}
```

**Integration points:**

- Run weekly in CI (`ai-maintenance.yml`)
- Add to code review bot
- Track technical debt metrics

**Estimated effort:** 2-3 days  
**Risk:** Low (proven library + custom enhancements)

---

#### 3.3 Universal Ctags Integration

**Technology:** [universal-ctags](https://github.com/universal-ctags/ctags) (GPL)  
**Alternative:** [ctags-js](https://www.npmjs.com/package/ctags) (MIT wrapper)  
**Purpose:** Fast, language-agnostic symbol extraction

**Capabilities:**

- 50+ language support
- Lightning-fast (written in C)
- Industry-standard tag format
- Used by vim, emacs, VS Code

**Implementation:**

```bash
# macOS
brew install universal-ctags

# Or Node.js wrapper
npm install ctags
```

**New file:** `tools/scripts/ai/ctags-indexer.cjs`

**Features:**

- Generate tags for all project files (~100ms)
- Parse tags into queryable format
- Augment existing semantic index
- Enable jump-to-definition

**Integration points:**

- Complement tree-sitter for rapid indexing
- Provide fallback for unsupported languages
- Power "go to symbol" in AI assistant

**Estimated effort:** 1-2 days  
**Risk:** Low (mature technology, simple integration)

---

## Implementation Strategy

### Execution Mode: **Safe** (T0 + T1 + T2)

All changes will follow governance requirements:

✅ **Tier 0 (Constitutional):**

- No ethical/safety/privacy violations
- All tools respect zero-trust principles
- Local-first processing (no data leakage)

✅ **Tier 1 (Mandatory):**

- Secret scanning (no API keys in code)
- Security review (all dependencies audited)
- License compliance (MIT/Apache 2.0 only)
- Tests for all new tools

✅ **Tier 2 (Best Practice):**

- Linting/formatting
- Documentation updates
- Accessibility (CLI output readable)
- CHANGELOG.md entries

### Rollout Plan

**Week 1: Foundation**

- Days 1-3: Tree-sitter + Transformers.js
- Days 4-5: Incremental indexing

**Week 2: Advanced**

- Days 1-2: LanceDB vector store
- Days 3-4: ArangoDB code graph
- Day 5: ESLint plugin

**Week 3: Intelligence**

- Days 1-2: Code review bot
- Days 3-4: Clone detection
- Day 5: Ctags + final integration

### Success Metrics

| Metric                   | Current | Target | Measurement             |
| ------------------------ | ------- | ------ | ----------------------- |
| Semantic search speed    | 500ms   | 10ms   | Benchmark query         |
| Index rebuild time       | 30s     | 100ms  | Time incremental update |
| Language support         | 2       | 20+    | Count supported parsers |
| Code review coverage     | 0%      | 80%    | % of checks automated   |
| Test coverage (AI tools) | ~30%    | 80%+   | Jest coverage report    |

### Risk Mitigation

1. **Backward compatibility:** All new tools are additive (don't break existing)
2. **Gradual rollout:** Each phase independently testable
3. **Fallback paths:** Keep existing tools working during migration
4. **Feature flags:** Enable new capabilities progressively
5. **Documentation:** Update guides as features are added

---

## Dependencies & Licenses

All proposed tools use permissive licenses compatible with project governance:

| Tool                 | License    | Stars | Maintainer           |
| -------------------- | ---------- | ----- | -------------------- |
| tree-sitter          | MIT        | 17.5k | GitHub               |
| @xenova/transformers | Apache 2.0 | 13k   | Xenova               |
| chokidar             | MIT        | 10.5k | paulmillr            |
| LanceDB              | Apache 2.0 | 4.5k  | LanceDB Inc.         |
| ArangoDB             | Apache 2.0 | 13.5k | ArangoDB GmbH        |
| ESLint               | MIT        | 25k   | OpenJS Foundation    |
| jscpd                | MIT        | 1.8k  | kucherenko           |
| universal-ctags      | GPL        | 6.5k  | Universal Ctags Team |

**Note:** universal-ctags (GPL) will be called as external tool (not linked), maintaining license compatibility.

---

## Next Steps

1. **Review & approval:** Technical Governance Committee
2. **Create implementation branch:** `feature/ai-infrastructure-upgrade`
3. **Weekly demos:** Show progress to stakeholders
4. **Documentation:** Update as features land
5. **Training:** Help team use new capabilities

---

## Appendix: Code Examples

### A1: Tree-sitter Parser Wrapper

```javascript
// tools/scripts/ai/tree-sitter-parser.cjs
const Parser = require("tree-sitter");
const JavaScript = require("tree-sitter-javascript");
const TypeScript = require("tree-sitter-typescript").typescript;
const Python = require("tree-sitter-python");

class MultiLanguageParser {
  constructor() {
    this.parsers = new Map();
    this.initParsers();
  }

  initParsers() {
    const languages = {
      js: JavaScript,
      ts: TypeScript,
      py: Python,
      // Add more as needed
    };

    for (const [ext, language] of Object.entries(languages)) {
      const parser = new Parser();
      parser.setLanguage(language);
      this.parsers.set(ext, parser);
    }
  }

  parse(code, extension) {
    const parser = this.parsers.get(extension);
    if (!parser) {
      throw new Error(`Unsupported language: ${extension}`);
    }
    return parser.parse(code);
  }

  extractSymbols(tree) {
    const symbols = [];

    function traverse(node) {
      if (
        node.type === "function_declaration" ||
        node.type === "class_declaration"
      ) {
        symbols.push({
          type: node.type.replace("_declaration", ""),
          name: node.childForFieldName("name")?.text,
          startPosition: node.startPosition,
          endPosition: node.endPosition,
        });
      }

      for (const child of node.children) {
        traverse(child);
      }
    }

    traverse(tree.rootNode);
    return symbols;
  }
}

module.exports = MultiLanguageParser;
```

### A2: Embedding Engine

```javascript
// tools/scripts/ai/embedding-engine.cjs
const { pipeline } = require("@xenova/transformers");

class EmbeddingEngine {
  constructor() {
    this.pipe = null;
    this.cache = new Map();
  }

  async initialize() {
    console.log("Loading embedding model (one-time setup)...");
    this.pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("Model loaded!");
  }

  async embed(text) {
    // Check cache
    const hash = this.hash(text);
    if (this.cache.has(hash)) {
      return this.cache.get(hash);
    }

    // Generate embedding
    const output = await this.pipe(text, {
      pooling: "mean",
      normalize: true,
    });

    const embedding = Array.from(output.data);
    this.cache.set(hash, embedding);
    return embedding;
  }

  cosineSimilarity(a, b) {
    let dot = 0,
      magA = 0,
      magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  hash(text) {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }
}

module.exports = EmbeddingEngine;
```

---

**Document version:** 1.0.0  
**Last updated:** 2025-11-05  
**Next review:** After Phase 1 completion
