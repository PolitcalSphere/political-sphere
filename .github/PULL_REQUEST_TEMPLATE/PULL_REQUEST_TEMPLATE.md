# Pull Request Template v2.1.0 (Aligned with .blackboxrules v2.0.0)

AI-EXECUTION:
mode: Safe | Fast-Secure | Audit | R&D
controls: [SEC-01, SEC-05, QUAL-02, TEST-03, A11Y-01]
deferred: []
rationale: <1–2 lines>

ASSUMPTIONS:

- <explicit assumption 1>
- <explicit assumption 2>
  CONFIDENCE:
  self_estimate: 0.84
  high_risk_areas: [example-area]

OUTPUT:

- type: unified-diff
- includes: tests, rollback steps

## Example Usage

For Fast-Secure mode with deferred gates:

```
AI-EXECUTION:
mode: Fast-Secure
controls: [SEC-01, QUAL-02]
deferred: [TEST-03, A11Y-01]
rationale: Urgent security fix, deferring full test suite to reduce CI time.

ASSUMPTIONS:
- No breaking changes to public APIs
- Existing tests cover critical paths

CONFIDENCE:
self_estimate: 0.9
high_risk_areas: []

OUTPUT:
- type: unified-diff
- includes: tests, rollback steps
```

For R&D mode (experimental):

```
AI-EXECUTION:
mode: R&D
controls: [SEC-01]
deferred: [QUAL-02, TEST-03, A11Y-01]
rationale: Experimental feature, requires Safe re-run before merge.

ASSUMPTIONS:
- Feature flagged off by default
- No production impact

CONFIDENCE:
self_estimate: 0.7
high_risk_areas: [new-feature]

OUTPUT:
- type: unified-diff
- includes: tests, rollback steps
```

## Description

Brief description of the changes made in this PR.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactor (no functional changes)
- [ ] Test update
- [ ] Other (please describe):

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works (unit, integration, E2E as needed; 80%+ coverage for critical paths)
- [ ] New and existing unit tests pass locally with my changes
- [ ] Integration tests pass (if applicable)
- [ ] E2E tests pass (if applicable)
- [ ] Any dependent changes have been merged and published in downstream modules
- [ ] Security scans (SAST, dependency checks) pass; no secrets committed
- [ ] Dependencies are license-compatible and no new vulnerabilities introduced
- [ ] Accessibility verified (WCAG 2.2 AA compliance, especially for UI changes)
- [ ] CHANGELOG.md updated
- [ ] docs/TODO.md updated
- [ ] All automated checks (linting, type-check, tests) pass in CI/CD
- [ ] Observability added (logs, metrics, traces) if applicable

## Constitutional Check (if applicable)

For changes affecting voting, speech, moderation, power, or policy:

Affects: [voting/speech/moderation/power/policy]
Principles: [cite docs/governance/]
Compliant: [Yes/No + explanation]

## Audit Readiness (for high-risk changes)

For election logic, schema migrations, or data integrity changes:

- [ ] Audit trail linked (tamper-evident logs)
- [ ] DPIA conducted (if user data impacted)
- [ ] Performance benchmarks met (API p95 <200ms, etc.)
- [ ] GDPR/CCPA compliance verified (ROPA updated, lawful basis cited)

## Related Issues

Closes # (issue number)

## Testing

Describe how you tested these changes. Include unit, integration, and E2E tests as applicable.

## Screenshots (if applicable)

Add screenshots to help explain your changes.

```

```
