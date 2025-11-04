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
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules

## Related Issues

Closes # (issue number)

## Testing

Describe how you tested these changes.

## Screenshots (if applicable)

Add screenshots to help explain your changes.
