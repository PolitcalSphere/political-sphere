# Changelog - run-tests

All notable changes to the run-tests composite action will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-07

### Added

- Initial production release of run-tests composite action
- Comprehensive test orchestration with 22 validated inputs and 8 outputs
- Multiple test type support: unit, integration, e2e, coverage, api, frontend, shared
- Intelligent sharding for parallel execution (1-100 shards with Vitest `--shard=index/total`)
- Coverage reporting with configurable thresholds (0-100%)
- Package-specific coverage thresholds: Authentication 100%, Business Logic 90%, UI 80%, API 85%, Shared 90%
- GitHub integration with error/warning annotations and PR summaries
- Retry logic for flaky tests (0-5 configurable attempts)
- CloudWatch metrics emission: TestDuration, TestsRun, TestsFailed, CoveragePercentage
- Timeout protection with configurable limits (1-120 minutes)
- Changed-only mode for running tests on modified files only
- Shard-aware artifact management with size validation (<100MB)

### Security

- **SEC-01**: Comprehensive input validation (test type whitelist, coverage 0-100%, shard validation, timeout 1-120min, workers 1-16)
- **SEC-02**: SHA-pinned GitHub Actions (setup-node@v4.0.2, upload-artifact@v4.3.6, codecov@v4.2.0)
- Codecov token masking for secure credential handling
- Input sanitization prevents injection attacks

### Testing

- **TEST-01**: Comprehensive test coverage validation
- **TEST-02**: Automated quality gates enforcement
- Multiple test formats: JSON, HTML, LCOV for coverage reports
- GitHub annotations with file/line numbers for failures

### Quality

- **QUAL-01**: Deterministic test execution
- **QUAL-05**: Performance benchmarking capabilities
- Structured JSON logging with correlation IDs
- Cleanup traps for reliable artifact management
- Artifact manifests for traceability

### Observability

- **OPS-01**: Structured logging for all operations
- **OPS-02**: Comprehensive error handling and timeout protection
- CloudWatch metrics with environment/test-type dimensions
- Detailed execution traces for debugging

### Components

- `action.yml` (315 lines): Composite action definition with full input/output specification
- `run-tests.sh` (494 lines): Test orchestration script with CloudWatch metrics and structured logging
- `parse-results.mjs` (347 lines): Result parser with GitHub annotations and PR summaries
- `upload-artifacts.sh` (299 lines): Artifact manager with shard-aware naming
- `coverage.config.json` (225 lines): Coverage configuration with package-specific thresholds
- `README.md` (556 lines): Comprehensive documentation with examples and troubleshooting

### Research-Based Implementation

- Test slicing strategies from Microsoft Learn
- GitHub workflow commands best practices (`::error::`, `::group::`, `::warning::`)
- Vitest configuration patterns from official documentation
- CloudWatch metrics emission patterns from AWS documentation

### Features

- **Test Type Support**: Flexible test execution for different testing scenarios
- **Intelligent Sharding**: Distribute tests across multiple runners for faster CI
- **Coverage Reporting**: Multi-format coverage with configurable thresholds per package
- **GitHub Integration**: Rich annotations, PR summaries, and artifact uploads
- **Retry Logic**: Automatic retry of flaky tests with configurable attempts
- **CloudWatch Metrics**: Optional metric emission for production observability
- **Timeout Protection**: Prevent hung test runs with configurable timeouts
- **Changed-Only Mode**: Run tests only for changed files to optimize CI time
- **Artifact Management**: Intelligent artifact naming, size validation, and manifest generation

### Compliance Tags

SEC-01, SEC-02, TEST-01, TEST-02, QUAL-01, QUAL-05, OPS-01, OPS-02

---

## Release Notes

### Version 1.0.0

This is the initial production-ready release of the run-tests action. It has been extensively tested across the Political Sphere monorepo and implements enterprise-grade test orchestration with comprehensive security, quality, and observability features.

**Compatibility**: Requires Node.js 18+ and Vitest as the test runner

**Dependencies**:

- setup-node-deps action (for Node.js environment)
- Vitest test runner
- Optional: AWS CloudWatch (for metrics)
- Optional: Codecov (for coverage reporting)

**Performance Impact**:

- Sharding can reduce test time by 60-80% with proper parallelization
- Changed-only mode reduces unnecessary test execution
- Coverage reporting adds 10-20% overhead to test execution time

**Migration**: This action provides a standardized interface for test execution across all packages in the monorepo, replacing ad-hoc test scripts in workflows.
