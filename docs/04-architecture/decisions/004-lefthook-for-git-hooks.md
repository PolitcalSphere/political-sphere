# 004. Lefthook for Git Hooks Management

Date: 2025-11-05  
Status: Accepted  
Deciders: Platform Engineering Team, DX Working Group  
Technical Story: Developer experience and quality gate automation

## Context and Problem Statement

We need a git hooks management solution that provides fast, reliable pre-commit and pre-push checks while maintaining excellent developer experience. The solution must work consistently across different operating systems and development environments.

Key question: How do we manage git hooks to ensure quality gates are enforced locally without frustrating developers?

## Decision Drivers

- **Performance**: Hooks must run quickly to avoid slowing down commits
- **Developer Experience**: Easy to install, skip, and understand
- **Cross-platform**: Works on macOS, Linux, Windows
- **Parallel Execution**: Run independent checks concurrently
- **Configuration**: Simple, readable configuration format
- **Flexibility**: Allow developers to skip hooks when needed
- **Consistency**: Same behavior across all developers' machines
- **Maintenance**: Easy to update and version control

## Considered Options

- **Option 1**: Lefthook
- **Option 2**: Husky + lint-staged
- **Option 3**: Pre-commit framework (Python-based)
- **Option 4**: Custom shell scripts
- **Option 5**: Git hooks only (no framework)

## Decision Outcome

Chosen option: "Lefthook", because it provides the best combination of speed, developer experience, and cross-platform support with minimal dependencies.

### Positive Consequences

- **Blazing Fast**: Written in Go, parallel execution, minimal overhead
- **Zero Dependencies**: Single binary, no Node.js/Python runtime needed
- **Simple Config**: YAML configuration is clear and maintainable
- **Parallel by Default**: Runs checks concurrently for speed
- **Skip Flags**: Easy to skip checks with environment variables
- **Cross-platform**: Works identically on macOS, Linux, Windows
- **Rich Output**: Beautiful, informative console output with branding
- **Low Maintenance**: Stable, actively maintained, few breaking changes
- **Git Integration**: Tight integration with git internals

### Negative Consequences

- **Less Ecosystem**: Smaller community compared to Husky
- **YAML Configuration**: Some developers prefer package.json scripts
- **Go Binary**: Requires binary distribution (managed via npm for convenience)
- **Learning Curve**: New developers need to learn Lefthook syntax

## Pros and Cons of the Options

### Lefthook

- Good, because extremely fast (Go binary, parallel execution)
- Good, because zero runtime dependencies
- Good, because simple YAML configuration
- Good, because works across all platforms identically
- Good, because beautiful console output
- Good, because easy skip flags (`LEFTHOOK=0`, `SKIP_TESTS=1`)
- Good, because integrates well with lint-staged
- Bad, because smaller community than Husky
- Bad, because configuration not in package.json
- Bad, because requires understanding YAML syntax

### Husky + lint-staged

- Good, because very popular in JavaScript ecosystem
- Good, because configuration in package.json
- Good, because large community and examples
- Good, because npm scripts integration
- Bad, because Node.js dependency required
- Bad, because slower than Lefthook
- Bad, because configuration can become complex
- Bad, because Windows support historically problematic

### Pre-commit Framework

- Good, because powerful multi-language support
- Good, because large plugin ecosystem
- Good, because works well for polyglot projects
- Good, because declarative configuration
- Bad, because Python dependency required
- Bad, because slower startup time
- Bad, because overkill for primarily JavaScript project
- Bad, because less JavaScript ecosystem integration

### Custom Shell Scripts

- Good, because maximum flexibility
- Good, because no dependencies
- Good, because simple to understand
- Bad, because hard to maintain across platforms
- Bad, because no parallel execution
- Bad, because reinventing the wheel
- Bad, because poor error handling
- Bad, because no skip functionality

### Git Hooks Only

- Good, because no external dependencies
- Good, because maximum control
- Bad, because manual installation required
- Bad, because no version control
- Bad, because inconsistent across developers
- Bad, because no parallel execution
- Bad, because hard to maintain

## Implementation Notes

### Configuration Structure

```yaml
# .lefthook.yml
pre-commit:
  parallel: true
  commands:
    lint-staged:
      run: npx lint-staged
    cspell:
      run: npx cspell {staged_files}
      files: git diff --name-only --cached
    a11y:
      run: bash scripts/ci/a11y-check.sh
      files: git diff --name-only --cached -- '*.tsx' '*.jsx'

pre-push:
  commands:
    integrity:
      run: npx nx workspace-lint
    test-affected:
      run: npx nx affected -t test
      env:
        SKIP: $SKIP_TESTS
```

### Developer Experience Features

1. **Branded Output**: Custom ASCII art and context-aware messages
2. **File Counts**: Shows how many files of each type are being checked
3. **Skip Flags**: `SKIP_TESTS=1`, `SKIP_LINT=1`, `LEFTHOOK=0`
4. **Detailed README**: Clear documentation in `.lefthook/README.md`
5. **GitHub Actions Status**: Shows CI status before push

### Installation

```bash
# Automatic via npm
npm install

# Manual
npx lefthook install
```

## Monitoring and Success Criteria

- ✅ Pre-commit hooks run in < 30 seconds (P95)
- ✅ Pre-push hooks run in < 2 minutes (P95)
- ✅ Zero hook installation issues in past 90 days
- ✅ Developer satisfaction with hooks ≥ 4.0/5.0
- ✅ 100% of commits have pre-commit checks run
- 🟡 Skip flags used < 5% of the time (indicates good performance)

### Current Performance

- **Pre-commit**: ~15-30 seconds (depends on staged files)
- **Pre-push**: ~1-2 minutes (depends on affected projects)
- **Installation**: < 10 seconds
- **Skip rate**: ~2% (acceptable emergency usage)

## Links

- Related to [ADR-001](001-github-actions-as-ci-platform.md) - CI/CD platform
- Complements [ADR-003](003-composite-actions-for-reusability.md) - Quality checks

## Review Schedule

Next review: 2026-05-05 (Semi-annual)

**Review Triggers:**

- Significant performance degradation
- New git hooks framework with clear advantages
- Developer satisfaction drops below 3.5/5.0
- Cross-platform issues emerge
