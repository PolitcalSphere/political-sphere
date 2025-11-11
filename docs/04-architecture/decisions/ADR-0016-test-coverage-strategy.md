# ADR-0016: Test Orchestration and Coverage Strategy

**Status:** Accepted  
**Date:** 2025-11-07  
**Deciders:** Engineering Team  
**Related:** ADR-0015 (Deployment Strategy)

## Context

Political Sphere requires a robust, scalable test orchestration system to maintain code quality across a monorepo with multiple applications and libraries. The project needs:

1. **Multiple test types:** Unit, integration, E2E, API, frontend, and shared library tests
2. **Parallel execution:** Sharding support to reduce CI time
3. **Coverage tracking:** Package-specific thresholds with enforcement policies
4. **GitHub integration:** Annotations, PR summaries, and artifact management
5. **Observability:** Structured logging and metrics for test execution monitoring

## Decision

We will implement a custom GitHub Actions composite action (`run-tests`) based on Vitest with the following components:

### 1. Test Orchestration Architecture

**Components:**

- `action.yml`: Composite action with 22 validated inputs and 8 outputs
- `run-tests.sh`: Bash orchestration script (494 lines)
- `parse-results.mjs`: Node.js result parser with GitHub annotations (347 lines)
- `upload-artifacts.sh`: Artifact manager with shard-aware naming (299 lines)
- `coverage.config.json`: Package-specific coverage policies (225 lines)

**Research Foundation:**

- Microsoft Learn: CI/CD patterns, parallel testing strategies, test slicing algorithms
- GitHub Docs: Composite actions, workflow commands, annotation syntax
- Vitest Documentation: Configuration API, sharding, coverage providers

### 2. Coverage Threshold Strategy

**Package-Specific Thresholds:**

| Package          | Coverage Target | Rationale                                      |
| ---------------- | --------------- | ---------------------------------------------- |
| Authentication   | 100%            | Security-critical, complete coverage mandatory |
| Business Logic   | 90%             | Core functionality, high reliability required  |
| API Endpoints    | 85%             | Contract validation essential                  |
| Shared Utilities | 90%             | Wide usage impact, bugs propagate              |
| UI Components    | 80%             | Visual testing supplements automated tests     |
| Infrastructure   | 70%             | Integration tests provide coverage             |
| Experimental     | 0%              | Non-production code, rapid iteration           |

**Global Defaults:**

- Lines: 0% (current), target 80%
- Functions: 0% (current), target 80%
- Branches: 0% (current), target 75%
- Statements: 0% (current), target 80%

**Enforcement Policy:**

- Warn-only mode until 2025-06-01
- Blocking enforcement after June 2025
- Allow up to 2% regression for refactoring
- No PR blocking during initial rollout

### 3. Test Sharding Strategy

**Approach:** Simple sharding (T/N tests per shard) using Vitest's native `--shard` flag

**Syntax:** `vitest --shard=1/3` (shard 1 of 3 total)

**Benefits:**

- Linear scalability (3 shards ≈ 3x faster)
- Even distribution across runners
- Native Vitest support, no custom logic

**Future Enhancements:**

- Time-based sharding (equal duration based on history)
- Assembly-based sharding (group related tests)

### 4. Test Type Categorization

**Supported Types:**

- `unit`: Fast, isolated tests with mocked dependencies
- `integration`: Service interactions, database operations
- `e2e`: Critical user journeys, full stack
- `coverage`: All tests with coverage reporting
- `api`: API-specific tests (apps/api)
- `frontend`: Frontend tests (apps/frontend)
- `shared`: Shared library tests (libs/shared)

### 5. Observability and Metrics

**Structured Logging:**

```json
{
  "timestamp": "2025-11-07T15:30:00Z",
  "level": "INFO",
  "message": "Tests completed",
  "correlation_id": "12345-1-1699368600",
  "script": "run-tests.sh",
  "context": {}
}
```

**CloudWatch Metrics:**

- `TestDuration` (Seconds)
- `TestsRun` (Count)
- `TestsFailed` (Count)
- `CoveragePercentage` (Percent)

**GitHub Integration:**

- Error annotations: `::error file={},line={}::{message}`
- PR summaries: Markdown via `GITHUB_STEP_SUMMARY`
- Artifacts: Shard-aware naming (`test-results-shard-1-of-3`)

### 6. Security Measures

**Input Validation (SEC-01):**

- Test type: Whitelist validation
- Coverage threshold: 0-100 range
- Shard config: index ≤ total, both ≥ 1
- Timeout: 1-120 minutes
- Max workers: 1-16

**Dependency Pinning (SEC-02):**

- All GitHub Actions pinned to SHA commits
- Codecov token masked with `::add-mask::`
- No secrets in environment variables

## Consequences

### Positive

1. **Scalability:** Sharding enables parallel execution, reducing CI time
2. **Quality Gates:** Package-specific thresholds ensure critical code is well-tested
3. **Flexibility:** Multiple test types support different testing strategies
4. **Observability:** Structured logs and metrics enable debugging and monitoring
5. **GitHub Integration:** Annotations and PR summaries improve developer experience
6. **Security:** Input validation and SHA pinning prevent attacks
7. **Maintainability:** Modular design allows independent component updates

### Negative

1. **Complexity:** Multiple components increase maintenance burden
2. **Learning Curve:** Developers must understand sharding and coverage policies
3. **CI Time:** Initial setup requires configuring sharding and thresholds
4. **Dependencies:** Relies on Vitest, GitHub Actions, and CloudWatch

### Risks and Mitigations

| Risk                   | Impact | Likelihood | Mitigation                                        |
| ---------------------- | ------ | ---------- | ------------------------------------------------- |
| Flaky tests in shards  | High   | Medium     | Implement retry logic (0-5 attempts configurable) |
| Coverage regression    | Medium | Medium     | 2% regression allowance, warn before blocking     |
| Shard imbalance        | Low    | Medium     | Monitor test distribution, adjust shard count     |
| GitHub Actions changes | Medium | Low        | SHA pinning prevents breaking changes             |

## Alternatives Considered

### Alternative 1: Use Pre-built Test Action (e.g., codecov/test-results-action)

**Pros:**

- Less maintenance burden
- Community support
- Proven reliability

**Cons:**

- Limited customization
- No package-specific thresholds
- No CloudWatch integration
- May not support Vitest sharding

**Rejected:** Insufficient flexibility for monorepo needs

### Alternative 2: Separate Actions per Test Type

**Pros:**

- Simpler individual actions
- Easier to understand

**Cons:**

- Code duplication
- Inconsistent behavior across types
- More maintenance overhead

**Rejected:** Violates DRY principle, increases complexity

### Alternative 3: Jest Instead of Vitest

**Pros:**

- More mature ecosystem
- Wider community adoption

**Cons:**

- Slower execution
- Less modern ESM support
- No native sharding

**Rejected:** Vitest provides better performance and ESM support

## Implementation

**Version:** 1.0.0  
**Implementation Date:** 2025-11-07  
**Test Results:** 18/18 tests passing  
**Total Lines of Code:** 2,235

**Files:**

- `.github/actions/run-tests/action.yml` (315 lines)
- `.github/actions/run-tests/run-tests.sh` (494 lines)
- `.github/actions/run-tests/parse-results.mjs` (347 lines)
- `.github/actions/run-tests/upload-artifacts.sh` (299 lines)
- `.github/actions/run-tests/coverage.config.json` (225 lines)
- `.github/actions/run-tests/README.md` (551 lines)
- `.github/actions/run-tests/test-runner.sh` (309 lines)

**Compliance:** SEC-01, SEC-02, TEST-01, TEST-02, QUAL-01, QUAL-05, OPS-01, OPS-02

## References

- [Microsoft Learn: CI/CD Patterns](https://learn.microsoft.com/en-us/azure/devops/pipelines/)
- [GitHub Actions: Composite Actions](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)
- [Vitest Documentation](https://vitest.dev/)
- [OWASP ASVS 4.0.3](https://owasp.org/www-project-application-security-verification-standard/)
- [Keep a Changelog](https://keepachangelog.com/)

## Review Schedule

**Next Review:** 2026-02-07 (Quarterly)  
**Owner:** Engineering Team  
**Stakeholders:** CTO, Security Team, QA Team
