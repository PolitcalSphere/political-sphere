# Copilot Prompt Primer

This primer keeps GitHub Copilot grounded in Political Sphere standards. Keep it open in your editor so Copilot inherits the right patterns for every suggestion.

## System Context

- **Platform:** Nx-managed monorepo (TypeScript-first) with Node.js services, React frontends, and worker jobs.
- **Runtime Baseline:** Node 20 LTS, ESM modules, strict TypeScript configuration (`noImplicitAny`, `strictNullChecks`).
- **Security:** GDPR + EU AI Act obligations, zero tolerance for secrets, OWASP Top 10 guarded, transport encryption mandatory.
- **Observability:** Structured logging via `libs/shared/logging`, metrics through Prometheus exporters, tracing via OpenTelemetry.
- **Testing:** Node test runner for unit/integration, Playwright for E2E, `npm run guard:blackbox` as the minimum local gate.

## Coding North Star

1. **Architecture alignment**
   - Follow existing domain boundaries (see `libs/` for shared utilities, `apps/` for deployment targets).
   - Prefer composition over inheritance; inject dependencies explicitly.
   - Keep business logic pure; isolate I/O and side effects.
2. **Error handling**
   - Bubble domain errors using typed error classes from `libs/shared/errors`.
   - Always include contextual metadata in logs; never log secrets or PII.
   - Emit user-friendly messages + machine-readable codes for APIs.
3. **Resilience & performance**
   - Guard external calls with timeouts, retries, and circuit breakers (`libs/shared/resilience`).
   - Assume horizontal scale: avoid in-memory global state for shared data.
   - Leverage streaming/batched operations for large payloads.
4. **Security posture**
   - Validate and sanitize all inputs at trust boundaries.
   - Enforce role-based access with helpers in `libs/shared/authz`.
   - Default to principle of least privilege for service integrations.

## Implementation Checklist

- Declare precise types; narrow `unknown` early, avoid `any`.
- Add unit tests alongside code; target 80%+ coverage for new modules.
- Update docs (`docs/` or feature ADR) when introducing new behaviors or APIs.
- Wire up telemetry: log info-level for success, warn/error with correlation ids for failures.
- Run `npm run guard:blackbox` before staging changes.

## Prompt Snippets

### Feature Development

```
You are an expert TypeScript engineer contributing to Political Sphere.

Goal: <feature goal>
Current module: <path>
Architectural notes: Nx workspace, strict typing, shared libs under libs/.
Non-negotiables: instrument with shared logger, wrap external calls with resilience helpers, provide unit tests.
Acceptance: tests cover happy + failure paths, docs updated, guard script passes.
```

### Refactor / Cleanup

```
You are refactoring legacy Political Sphere code for maintainability.

Context: ESM modules, dependency injection, avoid mutable singletons.
Targets: remove duplication, improve naming, keep API contract stable.
Quality gates: preserve current tests, add regression tests if missing, run guard script.
```

### Bug Fix

```
You are fixing a production bug in Political Sphere.

Bug summary: <description>
Diagnostics: <logs/tests>
Expectations: build failing test first, implement narrow fix, add regression coverage, document risk in CHANGELOG if high impact.
```

Keep this file authoritative—update it whenever architecture or standards evolve so Copilot remains a force multiplier instead of a liability.
