# Quality Standards

## Quality is Architectural

Design quality upfront, not as an afterthought. Propose testing strategies before implementation. Include error handling in initial design. Plan observability from the start. Consider performance early.

## Multi-Dimensional Assessment

Evaluate EVERY change against: **Correctness** (meets requirements accurately), **Reliability** (error handling, retries, fallbacks), **Performance** (efficient latency, throughput, resources), **Security** (no vulnerabilities, secure defaults, least privilege), **Usability** (intuitive APIs, clear error messages), **Accessibility** (WCAG 2.2 AA+ compliance—mandatory), **Resilience** (graceful degradation, circuit breakers), **Observability** (structured logs, metrics, traces), **Maintainability** (readable, modular, documented), **Evolvability** (extensible, backward compatible).

## Zero Quality Regression

Before suggesting changes: Check existing tests pass. Maintain/improve code coverage. Preserve performance budgets. Don't weaken security. Keep accessibility standards.

## Definition of Done (Required)

Mark work complete ONLY when: Implementation complete. Unit tests written and passing. Integration tests (if external dependencies). Documentation updated (comments, READMEs, API docs). Accessibility verified (UI changes). Performance validated (critical paths). Security reviewed (sensitive data handling). Error handling implemented. Observability instrumented.

## Validation Protocol

- State explicitly which tests, linters, scans (SAST/DAST/SCA), accessibility audits, and performance checks were run (or why they could not be run) and report their results with timestamps.
- Map validation evidence to relevant standards (OWASP ASVS requirement IDs, WCAG success criteria, NIST control families) in the PR description or accompanying artefacts.
- When execution is impossible (e.g., sandboxed), provide deterministic reproduction steps and expected outputs so humans can verify quickly.
- Capture residual risks, unresolved benchmarks, and remediation plans; add TODO entries with owners/dates when follow-up is required.
- Confirm changelog and documentation updates are complete and link gathered artefacts (logs, SBOMs, metrics dashboards) before handing work off.

### SLO/SLI Awareness

Design with service-level objectives: Consider latency impact (p50, p95, p99). Respect error budgets. Target 99.9%+ availability. Include monitoring and alerting suggestions. Validate accessibility conformance.

### Documentation Excellence

Keep docs synchronized with code. Write clear, actionable content. Include practical examples. Document assumptions and limitations. Maintain ADRs in `/docs/architecture/decisions`.

### Dependency Hygiene

When suggesting dependencies: Choose well-maintained, security-audited packages. Verify license compatibility. Minimize dependency count. Pin versions explicitly. Flag known vulnerabilities.

### Data & Model Quality

For AI/data work: Version datasets with provenance. Maintain reproducible pipelines. Monitor for drift. Document transformations. Validate quality assertions.

### Observability Integration

Instrument ALL critical operations: Use structured logging (JSON format). Apply OpenTelemetry traces (distributed). Include relevant metrics (counters, gauges, histograms). Link traces to business outcomes. Enable end-to-end traceability.
