# CI Automation Project

This Nx project provides centralized CI/CD automation targets for the Political Sphere monorepo.

## Purpose

The `ci` project acts as a convenience wrapper for running CI checks, security scans, and validation tasks. It provides Nx-compatible targets that can be invoked via `nx run ci:<target>` or as part of dependency graphs.

## Available Targets

- **lint**: Run ESLint across the codebase
- **typecheck**: Run TypeScript type checking
- **test**: Run all unit tests
- **lint-boundaries**: Check for import boundary violations
- **security-scan**: Run security audits and secret scanning
- **ci-checks**: Run all CI checks (depends on lint, typecheck, test, lint-boundaries)

## Usage

```bash
# Run all CI checks
nx run ci:ci-checks

# Run individual checks
nx run ci:lint
nx run ci:typecheck
nx run ci:test
nx run ci:lint-boundaries
nx run ci:security-scan
```

## Makefile Integration

For developer convenience, these targets are also exposed via the root `Makefile`:

```bash
make ci-checks      # Runs all CI checks
make security-scan  # Runs security audits
make test-all       # Runs all test suites
```

## GitHub Actions Integration

CI workflows in `.github/workflows/` use composite actions located in `.github/actions/` to avoid duplication:

- **setup-node-deps**: Sets up Node.js and installs dependencies
- **quality-checks**: Runs lint, typecheck, and boundary checks

See `docs/05-engineering-and-devops/ci-cd/README.md` for complete CI/CD documentation.

---

**Last updated**: 2025-10-29
**Maintainer**: Platform Team
