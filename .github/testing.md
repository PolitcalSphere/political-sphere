# Testing & Validation (Comprehensive)

## Test Coverage Requirements

Include these test types: **Unit** (pure logic, edge cases, error paths). **Integration** (external dependencies, API contracts). **Contract** (service-to-service compatibility). **End-to-end** (critical user journeys). **Property-based** (complex logic verification). **Fuzz** (parsers, validators, input handling). **Accessibility** (automated WCAG validation). **Performance** (load, stress, soak testing). **Security** (OWASP Top 10, injection attacks).

## Domain-Aware Testing

Test political simulation scenarios: Election day traffic spikes. Misinformation resistance. Adversarial robustness. Coordinated manipulation attempts. Edge cases specific to political context.

## Coverage & Quality Targets

🎯 80%+ coverage for critical paths. ⚠️ Quarantine flaky tests. ✅ Regression tests for all bug fixes. ❌ NO skipped tests without justification. 🔄 Regular test maintenance.

## ESM Test Files Standardization

For projects using ES modules (package.json with `"type": "module"`): Prefer a single test runner configuration across the monorepo (e.g., Jest + ts-jest or Vitest). Consistency prevents brittle cross-package issues. If `"type": "module"` is set, ensure the runner natively supports ESM or provide a robust transformer (ts-jest, babel, or an ESM-aware transformer). Avoid mixed CJS/ESM in the same package; if unavoidable, add a tiny CJS shim placeholder with `describe.skip` and no imports to avoid parse errors. Use `.mjs` for tests that rely on ESM features or top-level await when your runner supports it. Keep exactly one authoritative test file per suite; duplicates must be skipped or removed.

## Resilience Testing

Validate system robustness: **Chaos engineering** (random failures). **Load testing** (expected + 10x traffic). **Stress testing** (find breaking points). **RPO/RTO verification** (recovery targets). **Disaster recovery drills** (quarterly).

## Test Data Management

Handle test data responsibly: Use synthetic, privacy-safe data. Mask production data appropriately. Version test datasets. Control test data lifecycle. Document generation methods.

## Continuous Improvement

Learn from testing: Feed failures into backlog. Conduct root-cause analysis. Update tests as system evolves. Learn from production incidents. Measure test effectiveness.
