# Changelog - quality-checks

All notable changes to the quality-checks composite action will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-07

### Added

- Initial release of quality-checks composite action
- Integrated linting with npm run lint
- Type checking with npm run type-check
- Format validation with npm run format:check
- Support for optional commands (graceful handling when scripts don't exist)
- Comprehensive error reporting with exit code propagation
- Detailed step outputs for debugging and monitoring

### Features

- **Linting**: ESLint execution with configurable rulesets
- **Type Checking**: TypeScript strict mode validation
- **Format Validation**: Prettier/Biome format verification
- **Fail-fast**: Stops on first error for rapid feedback
- **CI Integration**: Designed for GitHub Actions workflows

### Documentation

- Complete README.md with usage examples
- Input/output specifications
- Integration patterns with other actions
- Troubleshooting guide

### Security

- No secrets handling (operates on source code only)
- Read-only permissions sufficient
- All scripts run in isolated environment

---

## Release Notes

### Version 1.0.0

This is the initial stable release of the quality-checks action. It has been tested across multiple workflows in the Political Sphere monorepo and is ready for production use.

**Compatibility**: Requires Node.js 18+ and npm 9+

**Dependencies**:

- setup-node-deps action (for Node.js environment)
- Project must have npm scripts: lint, type-check, format:check

**Migration**: This action consolidates three previously separate workflow steps into a single reusable composite action.
