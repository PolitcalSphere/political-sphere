# AI Tools Quick Reference

## 🚀 Commands

### AST Code Analysis
```bash
# Analyze a single file
npm run ai:ast <file-path>

# Example
npm run ai:ast tools/scripts/ai/pattern-matcher.cjs
```

**What you get:**
- Complexity metrics (cyclomatic, cognitive, Halstead)
- Semantic token counts
- Security issues
- Performance problems
- Anti-patterns

### Semantic Code Search

```bash
# Build/update index (do this first)
npm run ai:index

# Search for anything
npm run ai:search "<query>"

# Examples
npm run ai:search "authentication"
npm run ai:search "UserProfile"
npm run ai:search "validateInput"
```

**What you get:**
- Symbol locations (functions, classes, types)
- Relevance scores
- File paths with line numbers
- Fast results (~200ms)

## 📊 Real Examples

### Example 1: Analyze Code Quality
```bash
$ npm run ai:ast libs/platform/auth/auth-service.ts

📊 AST Analysis Report: auth-service.ts

Complexity Metrics:
  Cyclomatic: 12
  Cognitive: 8
  Max Nesting: 3
  Halstead Volume: 542.12
  Halstead Difficulty: 15.30

✅ No issues found
```

### Example 2: Find All Authentication Code
```bash
$ npm run ai:search "auth"

🔍 Search results for "auth":

1. [symbol] authenticateUser (score: 1.00)
   libs/platform/auth/auth-service.ts:45
   libs/platform/auth/auth-controller.ts:23

2. [symbol] AuthenticationError (score: 0.95)
   libs/shared/errors/auth-errors.ts:12

3. [file] auth-middleware.ts (score: 0.80)
```

## 🎯 Common Use Cases

### Use Case 1: Pre-Commit Quality Check
```bash
# Check files you're about to commit
git diff --name-only | grep -E '\.(js|ts)$' | xargs -I {} npm run ai:ast {}
```

### Use Case 2: Find Similar Implementations
```bash
# Find all implementations of a pattern
npm run ai:search "validation"
npm run ai:search "error handling"
npm run ai:search "database connection"
```

### Use Case 3: Complexity Audit
```bash
# Find complex files that need refactoring
find libs -name "*.ts" | xargs -I {} npm run ai:ast {} | grep "Cyclomatic:" | sort -t: -k2 -n
```

### Use Case 4: Security Scan
```bash
# Scan for potential security issues
npm run ai:ast <file> | grep -A5 "Security Issues"
```

## 🔧 Integration with AI Assistant

The tools integrate seamlessly with the AI assistant:

```bash
# Use AI assistant with AST analysis
npm run ai "analyze complexity of auth-service.ts"

# Use AI assistant with semantic search
npm run ai "find all authentication implementations"
```

## 📈 Performance Tips

1. **Build index regularly:** Run `npm run ai:index` after pulling changes
2. **Use specific queries:** More specific = better results
3. **Check complexity early:** Analyze files before they get too complex
4. **Leverage caching:** First search is slow, subsequent ones are fast

## 🎓 Pattern Detection

The AST analyzer detects these patterns:

**Anti-Patterns:**
- Callback hell (nested callbacks >3 deep)
- God functions (>300 lines)
- Deep nesting (>4 levels)

**Security Issues:**
- eval() usage
- Unsafe regex
- Missing input validation

**Performance Problems:**
- forEach in hot paths
- Unbounded arrays
- Blocking operations

## 🚦 Complexity Thresholds

| Metric | Low | Medium | High | Critical |
|--------|-----|--------|------|----------|
| Cyclomatic | <10 | 10-20 | 20-30 | >30 |
| Cognitive | <15 | 15-25 | 25-40 | >40 |
| Nesting | <3 | 3-4 | 4-5 | >5 |

## 📝 Tips & Tricks

1. **Pipe to grep for specific info:**
   ```bash
   npm run ai:ast file.js | grep "Complexity"
   ```

2. **Compare complexity across files:**
   ```bash
   for f in libs/**/*.ts; do npm run ai:ast "$f"; done | grep "Cyclomatic"
   ```

3. **Find all security issues:**
   ```bash
   npm run ai:ast file.js | grep -A10 "Security Issues"
   ```

4. **Export results:**
   ```bash
   npm run ai:ast file.js > analysis-report.txt
   ```

## 🔗 Learn More

- Full guide: `docs/ai-tools-integration.md`
- Summary: `docs/AI-TOOLS-SUMMARY.md`
- Source code: `tools/scripts/ai/`

---

**Quick Start:** Run `npm run ai:index` once, then use `npm run ai:search <query>` and `npm run ai:ast <file>` anytime.
