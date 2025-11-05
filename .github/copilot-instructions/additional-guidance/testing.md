# Testing & Validation (Reference)

**Version:** 2.0.0  
**Last Updated:** 2025-11-05  
**Applies To:** All test files and test-related decisions

> **Note:** This file provides high-level testing guidance. For detailed patterns and code examples, see [testing.instructions.md](testing.instructions.md).

---

## Quick Reference

**Primary Testing Guidance:** [testing.instructions.md](testing.instructions.md) - Detailed patterns, AAA structure, mocking, accessibility

**Main Documentation:** [../copilot-instructions.md](../copilot-instructions.md#testing-infrastructure-core-principle) - Testing Infrastructure section

---

## Test Coverage Requirements

Include these test types in your testing strategy:

- **Unit** - Pure logic, edge cases, error paths
- **Integration** - External dependencies, API contracts
- **Contract** - Service-to-service compatibility
- **End-to-end** - Critical user journeys
- **Property-based** - Complex logic verification
- **Fuzz** - Parsers, validators, input handling
- **Accessibility** - Automated WCAG validation (see [testing.instructions.md](testing.instructions.md#accessibility-testing))
- **Performance** - Load, stress, soak testing
- **Security** - OWASP Top 10, injection attacks

## Coverage & Quality Targets

- 🎯 **80%+ coverage** for critical paths
- ⚠️ **Quarantine flaky tests** - Document in TODO.md
- ✅ **Regression tests** for all bug fixes
- ❌ **NO skipped tests** without justification (comment with ticket number)
- 🔄 **Regular test maintenance** - Remove obsolete tests

## Domain-Aware Testing

For political simulation scenarios, test:

- Election day traffic spikes
- Misinformation resistance
- Adversarial robustness
- Coordinated manipulation attempts
- Edge cases specific to political context

## Resilience Testing

Validate system robustness:

- **Chaos engineering** - Random failures, network partitions
- **Load testing** - Expected + 10x traffic
- **Stress testing** - Find breaking points
- **RPO/RTO verification** - Recovery targets met
- **Disaster recovery drills** - Quarterly exercises

## Test Data Management

Handle test data responsibly:

- Use **synthetic, privacy-safe data** - Never real user data
- **Mask production data** appropriately if used for testing
- **Version test datasets** - Track changes alongside code
- **Control test data lifecycle** - Clean up after tests
- **Document generation methods** - Reproducible test data

See [testing.instructions.md](testing.instructions.md#test-data) for code examples.

## Testing Doctrine

Default approach:

- **Test-first or test-alongside** implementation
- **Unit plus integration** when appropriate
- **Table-driven tests** where helpful (see [testing.instructions.md](testing.instructions.md#parameterized-tests))
- Include **negative paths, edge cases, and boundary conditions**
- **Meaningful assertion messages** - Failures should be self-explanatory
- **No flaky async tests** - Stabilize with proper waits and timeouts
- **Fake/mock external services** only at boundaries
- Recommend **property-based testing** where beneficial

**Goal:** Code that ships confidently, not hopefully.

---

For detailed implementation guidance, patterns, and code examples, see [testing.instructions.md](testing.instructions.md).
