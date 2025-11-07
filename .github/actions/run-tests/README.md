# Run Tests GitHub Action

**Version:** 1.0.0  
**Status:** Production Ready  
**Compliance:** SEC-01, SEC-02, TEST-01, TEST-02, QUAL-01, QUAL-05, OPS-01, OPS-02

## Overview

This composite GitHub Action provides enterprise-grade test orchestration for the Political Sphere monorepo. It supports multiple test types, intelligent sharding, coverage reporting, and comprehensive observability.

### Key Features

- ✅ **Multiple Test Types**: Unit, integration, E2E, API, frontend, shared library tests
- ✅ **Intelligent Sharding**: Parallel test execution with shard-aware artifact management
- ✅ **Coverage Reporting**: Istanbul/V8 coverage with configurable thresholds
- ✅ **GitHub Integration**: Annotations, PR summaries, and artifact uploads
- ✅ **Retry Logic**: Automatic retry of flaky tests (configurable)
- ✅ **CloudWatch Metrics**: Optional metric emission for observability
- ✅ **Security Validated**: Comprehensive input validation and secure defaults

## Quick Start

### Basic Usage

```yaml
- name: Run Tests
  uses: ./.github/actions/run-tests
  with:
    test-type: "unit"
    coverage-enabled: "true"
    coverage-threshold: 80
```

### Sharded Execution

```yaml
strategy:
  matrix:
    shard: [1, 2, 3]

steps:
  - name: Run Tests (Shard ${{ matrix.shard }})
    uses: ./.github/actions/run-tests
    with:
      test-type: "unit"
      shard-index: ${{ matrix.shard }}
      shard-total: 3
      coverage-enabled: "true"
```

### Custom Test Command

```yaml
- name: Run Custom Tests
  uses: ./.github/actions/run-tests
  with:
    test-command: "npm run test:custom -- --coverage"
    timeout-minutes: 30
```

## Inputs

### Required Inputs

None. All inputs have sensible defaults.

### Test Configuration

| Input          | Description                               | Default | Values                                                                |
| -------------- | ----------------------------------------- | ------- | --------------------------------------------------------------------- |
| `test-type`    | Type of tests to run                      | `unit`  | `unit`, `integration`, `e2e`, `coverage`, `api`, `frontend`, `shared` |
| `test-command` | Custom test command (overrides test-type) | `''`    | Any valid shell command                                               |

### Coverage Configuration

| Input                | Description                 | Default | Validation      |
| -------------------- | --------------------------- | ------- | --------------- |
| `coverage-enabled`   | Enable coverage reporting   | `false` | `true`/`false`  |
| `coverage-threshold` | Minimum coverage percentage | `0`     | 0-100           |
| `coverage-config`    | Path to coverage config     | `''`    | Valid file path |

### Sharding Configuration

| Input         | Description                   | Default | Validation        |
| ------------- | ----------------------------- | ------- | ----------------- |
| `shard-index` | Current shard index (1-based) | `1`     | 1 ≤ index ≤ total |
| `shard-total` | Total number of shards        | `1`     | 1-100             |

### Execution Configuration

| Input                | Description                      | Default | Validation     |
| -------------------- | -------------------------------- | ------- | -------------- |
| `timeout-minutes`    | Test execution timeout           | `15`    | 1-120 minutes  |
| `max-workers`        | Maximum parallel workers         | `2`     | 1-16           |
| `changed-only`       | Run tests only for changed files | `false` | `true`/`false` |
| `fail-fast`          | Stop on first test failure       | `false` | `true`/`false` |
| `retry-failed-tests` | Retry failed tests               | `false` | `true`/`false` |
| `retry-count`        | Number of retry attempts         | `2`     | 0-5            |

### Artifact Configuration

| Input                     | Description                      | Default | Validation     |
| ------------------------- | -------------------------------- | ------- | -------------- |
| `upload-results`          | Upload test results as artifacts | `true`  | `true`/`false` |
| `upload-coverage`         | Upload coverage reports          | `true`  | `true`/`false` |
| `artifact-retention-days` | Artifact retention period        | `30`    | 1-90 days      |

### Integration Configuration

| Input           | Description                | Default               | Required           |
| --------------- | -------------------------- | --------------------- | ------------------ |
| `codecov-token` | Codecov upload token       | `''`                  | For Codecov upload |
| `github-token`  | GitHub token for API calls | `${{ github.token }}` | Auto-provided      |

### Observability Configuration

| Input                  | Description               | Default                    | Values          |
| ---------------------- | ------------------------- | -------------------------- | --------------- |
| `enable-metrics`       | Enable CloudWatch metrics | `false`                    | `true`/`false`  |
| `cloudwatch-namespace` | CloudWatch namespace      | `PoliticalSphere/CI/Tests` | Valid namespace |

## Outputs

| Output                      | Description                    | Type    | Example                              |
| --------------------------- | ------------------------------ | ------- | ------------------------------------ |
| `tests-passed`              | Whether all tests passed       | boolean | `true`                               |
| `tests-run`                 | Total tests executed           | number  | `150`                                |
| `tests-failed`              | Number of failed tests         | number  | `3`                                  |
| `coverage-percentage`       | Coverage percentage            | number  | `85.4`                               |
| `coverage-passed-threshold` | Whether coverage met threshold | boolean | `true`                               |
| `result-path`               | Path to test results           | string  | `./test-output/results/results.json` |
| `coverage-path`             | Path to coverage reports       | string  | `./test-output/coverage`             |
| `duration-seconds`          | Test execution duration        | number  | `127`                                |

## Examples

### Unit Tests with Coverage

```yaml
- name: Run Unit Tests
  id: unit-tests
  uses: ./.github/actions/run-tests
  with:
    test-type: "unit"
    coverage-enabled: "true"
    coverage-threshold: 80
    upload-coverage: "true"
    codecov-token: ${{ secrets.CODECOV_TOKEN }}

- name: Check Results
  if: steps.unit-tests.outputs.tests-passed == 'false'
  run: |
    echo "Tests failed: ${{ steps.unit-tests.outputs.tests-failed }} failures"
    exit 1
```

### Integration Tests with Sharding

```yaml
jobs:
  integration-tests:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - uses: actions/checkout@v4.2.2

      - name: Run Integration Tests
        uses: ./.github/actions/run-tests
        with:
          test-type: "integration"
          shard-index: ${{ matrix.shard }}
          shard-total: 4
          timeout-minutes: 30
          max-workers: 4
```

### E2E Tests with Retry

```yaml
- name: Run E2E Tests
  uses: ./.github/actions/run-tests
  with:
    test-type: "e2e"
    retry-failed-tests: "true"
    retry-count: 3
    timeout-minutes: 60
    fail-fast: false
```

### Changed Files Only (Fast CI)

```yaml
- name: Run Tests for Changed Files
  uses: ./.github/actions/run-tests
  with:
    test-type: "unit"
    changed-only: "true"
    timeout-minutes: 10
```

### API Tests with Metrics

```yaml
- name: Run API Tests
  uses: ./.github/actions/run-tests
  with:
    test-type: "api"
    coverage-enabled: "true"
    enable-metrics: "true"
    cloudwatch-namespace: "PoliticalSphere/Production/Tests"
```

## Architecture

### Components

1. **action.yml** - Composite action definition with input validation
2. **run-tests.sh** - Bash orchestration script for test execution
3. **parse-results.mjs** - Node.js script for result parsing and GitHub annotations
4. **upload-artifacts.sh** - Artifact preparation and validation
5. **coverage.config.json** - Coverage threshold policies by package

### Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Validate Inputs (SEC-01)                                 │
│    ✓ Test type, thresholds, shard config, timeouts          │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ 2. Setup Environment                                         │
│    ✓ Install Node.js, dependencies                          │
│    ✓ Create output directories                              │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ 3. Execute Tests (run-tests.sh)                             │
│    ✓ Build Vitest command                                   │
│    ✓ Apply sharding, coverage, timeout                      │
│    ✓ Structured logging with correlation IDs                │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ 4. Parse Results (parse-results.mjs)                        │
│    ✓ Extract test counts, coverage percentages              │
│    ✓ Create GitHub annotations for errors                   │
│    ✓ Generate PR summary markdown                           │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ 5. Upload Artifacts                                          │
│    ✓ Test results (JSON, JUnit XML)                         │
│    ✓ Coverage reports (HTML, LCOV, JSON)                    │
│    ✓ Shard-aware naming                                     │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ 6. Upload to Codecov (Optional)                             │
│    ✓ Coverage trend tracking                                │
│    ✓ PR comments with coverage delta                        │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ 7. Check Test Status                                         │
│    ✓ Exit with failure if tests failed                      │
│    ✓ Export outputs for downstream jobs                     │
└─────────────────────────────────────────────────────────────┘
```

### Observability

#### Structured Logging

All scripts emit structured JSON logs to `stderr`:

```json
{
  "timestamp": "2025-01-11T10:30:45Z",
  "level": "INFO",
  "message": "Tests completed in 127 seconds",
  "correlation_id": "12345-1-1736594445",
  "script": "run-tests.sh",
  "version": "1.0.0"
}
```

#### CloudWatch Metrics

When `enable-metrics: true`, the action emits:

- `TestDuration` (Seconds) - Total test execution time
- `TestsRun` (Count) - Number of tests executed
- `TestsFailed` (Count) - Number of test failures
- `CoveragePercentage` (Percent) - Code coverage percentage

Metrics are tagged with:

- `Environment` - CI environment (ci, staging, production)
- `TestType` - Type of tests executed

#### GitHub Annotations

Failed tests appear as annotations in the PR:

```
::error file=libs/shared/utils/validators.test.ts,line=42::Test failed: should validate email format
Expected: true
Received: false
```

## Security

### Input Validation (SEC-01)

All inputs are validated before execution:

- ✅ Test type must be in allowed list
- ✅ Coverage threshold: 0-100
- ✅ Shard config: index ≤ total, both ≥ 1
- ✅ Timeout: 1-120 minutes
- ✅ Max workers: 1-16
- ✅ Retry count: 0-5

### Secrets Management (SEC-02)

- ✅ Codecov token marked as secret (masked in logs)
- ✅ No secrets in environment variables
- ✅ Secure token handling in scripts

### Dependency Pinning

All actions use SHA-pinned versions:

```yaml
- uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
- uses: actions/upload-artifact@0b2256b8c012f0828dc542b3febcab082c67f72b # v4.3.6
- uses: codecov/codecov-action@5ecb98a3c6b747ed38dc09f787459979aebb39be # v4.2.0
```

## Performance

### Sharding Strategy

Based on Microsoft Learn research, the action supports:

1. **Simple Sharding** - Distribute T/N tests per shard
2. **Time-Based Sharding** - Equal duration based on historical data (future)
3. **Assembly-Based Sharding** - Keep related tests together (future)

Current implementation uses simple sharding with Vitest's `--shard` flag.

### Optimization Tips

**Reduce Execution Time:**

- Use `changed-only: true` for PR validation
- Increase `shard-total` for parallel execution
- Set `max-workers` based on runner capacity
- Enable `fail-fast: true` for quick feedback

**Reduce Artifact Size:**

- Disable HTML coverage reports for non-default branch
- Use `artifact-retention-days: 7` for PR builds
- Upload coverage only from one shard

**Reduce Costs:**

- Use `changed-only` to minimize test execution
- Skip coverage for draft PRs
- Cache npm dependencies between runs

## Troubleshooting

### Tests Timeout

**Symptom:** Tests killed after timeout period  
**Solution:** Increase `timeout-minutes` or optimize slow tests

```yaml
- uses: ./.github/actions/run-tests
  with:
    timeout-minutes: 30 # Increase from default 15
```

### Insufficient Coverage

**Symptom:** Coverage below threshold  
**Solution:** Review `coverage.config.json` for package-specific thresholds

### Shard Failures

**Symptom:** Some shards fail, others pass  
**Solution:** Check shard balance and test isolation

```bash
# Check test distribution per shard
npx vitest --shard=1/3 --run --reporter=verbose
```

### Artifact Upload Failures

**Symptom:** Artifacts not appearing in workflow  
**Solution:** Check artifact size (<100MB recommended)

```yaml
- uses: ./.github/actions/run-tests
  with:
    upload-results: "true"
    artifact-retention-days: 30
```

### Missing Dependencies

**Symptom:** Module import errors  
**Solution:** Ensure dependencies installed before action

```yaml
- uses: actions/setup-node@v4.0.2
  with:
    node-version: "20"
    cache: "npm"

- run: npm ci # Install dependencies

- uses: ./.github/actions/run-tests
```

## CI Integration

### Complete Workflow Example

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  test:
    strategy:
      matrix:
        test-type: ["unit", "integration"]
        shard: [1, 2, 3]

    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4.2.2
        with:
          fetch-depth: 0 # For changed-only detection

      - uses: actions/setup-node@v4.0.2
        with:
          node-version: "20"
          cache: "npm"

      - name: Install Dependencies
        run: npm ci

      - name: Run Tests
        id: test
        uses: ./.github/actions/run-tests
        with:
          test-type: ${{ matrix.test-type }}
          shard-index: ${{ matrix.shard }}
          shard-total: 3
          coverage-enabled: "true"
          coverage-threshold: 80
          codecov-token: ${{ secrets.CODECOV_TOKEN }}
          enable-metrics: ${{ github.ref == 'refs/heads/main' }}

      - name: Upload Coverage
        if: always()
        uses: codecov/codecov-action@v4.2.0
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ${{ steps.test.outputs.coverage-path }}/lcov.info
          flags: ${{ matrix.test-type }}-shard-${{ matrix.shard }}
```

## Compliance

### Standards Implemented

- **SEC-01**: Comprehensive input validation with bounds checking
- **SEC-02**: Secure secrets handling and masking
- **TEST-01**: 80%+ coverage target for critical code paths
- **TEST-02**: Multiple test types (unit, integration, E2E, API)
- **QUAL-01**: Code quality gates with configurable thresholds
- **QUAL-05**: Automated validation and result reporting
- **OPS-01**: Structured logging with correlation IDs
- **OPS-02**: CloudWatch metrics for observability

### Audit Trail

All test executions create tamper-evident audit trails:

- Structured JSON logs with timestamps and correlation IDs
- Test results with full stack traces
- Coverage reports with line-by-line analysis
- GitHub annotations for failures
- CloudWatch metrics for trend analysis

## Maintenance

### Version Updates

When updating this action:

1. Increment version in all component files
2. Update CHANGELOG.md
3. Test in staging environment first
4. Update documentation with new features
5. Announce breaking changes to team

### Monitoring

Track these metrics:

- Test execution duration (target: <5 minutes for unit tests)
- Failure rate (target: <1% flaky test rate)
- Coverage trends (target: 80%+ critical code)
- Artifact sizes (target: <100MB per artifact)

## Support

### Documentation

- **Quick Reference**: `docs/quick-ref.md`
- **Testing Strategy**: `docs/05-engineering-and-devops/development/testing.md`
- **Coverage Improvement Plan**: `docs/testing/coverage-improvement-plan.md`

### Contact

- **Issues**: GitHub Issues
- **Questions**: Team Slack #engineering
- **Security**: security@political-sphere.com

## License

See repository LICENSE file.

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-11  
**Maintainer:** Engineering Team  
**Review Cycle:** Quarterly
