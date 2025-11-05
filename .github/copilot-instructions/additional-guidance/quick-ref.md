# Quick Reference Guide

**Version:** 2.0.0  
**Last Updated:** 2025-11-05  
**Applies To:** All development work - use this for fast lookups

---

## Compliance Checklist for Suggestions

Before suggesting code, infrastructure, or configuration changes, verify all requirements:

| Category         | Requirements         |
| ---------------- | -------------------- |
| Organization     | ORG-01 to ORG-10     |
| Quality          | QUAL-01 to QUAL-09   |
| Security         | SEC-01 to SEC-10     |
| AI Governance    | AIGOV-01 to AIGOV-07 |
| Testing          | TEST-01 to TEST-06   |
| Compliance       | COMP-01 to COMP-05   |
| UX/Accessibility | UX-01 to UX-05       |
| Operations       | OPS-01 to OPS-05     |
| Strategy         | STRAT-01 to STRAT-05 |

> Full rule definitions live in `docs/06-security-and-risk/audits/END-TO-END-AUDIT-2025-10-29.md`. At a glance: **ORG** covers directory/ownership structure, **QUAL** enforces testing and quality gates, **SEC** locks down zero-trust controls, **AIGOV** governs neutrality and explainability, **TEST** mandates coverage and validation evidence, **COMP** maps to GDPR/CCPA duties, **UX** enforces WCAG 2.2 AA+, **OPS** handles observability/incident response, and **STRAT** aligns work with the roadmap and ADRs.

## Emergency Guidance

If a suggestion would:

- **Compromise security**: Strongly warn and propose secure alternative
- **Break accessibility**: Block suggestion, provide accessible approach
- **Violate privacy**: Flag issue, suggest privacy-preserving method
- **Enable manipulation**: Reject, explain risks, offer neutral design
- **Introduce critical risk**: Escalate to human review

## Anti-Patterns to Avoid

- ❌ Hardcoded secrets or credentials
- ❌ God classes/functions (> 300 lines)
- ❌ Tight coupling between modules
- ❌ Inconsistent error handling
- ❌ Missing accessibility attributes
- ❌ Blocking operations without timeouts
- ❌ Unbounded data structures
- ❌ Direct DOM manipulation (use React)
- ❌ Synchronous file I/O in production
- ❌ Ignoring edge cases

## Technology Stack Awareness

**Frontend**: React 19, TypeScript, Vite, CSS modules/design tokens. **Backend**: Node.js microservices built on Express 5 with Redis/SQLite integrations. **Testing**: Vitest (primary runner), Playwright, Testing Library. **Infrastructure**: Docker, Kubernetes, Terraform. **CI/CD**: GitHub Actions, Nx. **Monitoring**: OpenTelemetry, Grafana, Prometheus.

## Code Suggestion Guidelines

### When suggesting code:

**Structure**: Follow existing patterns, respect module boundaries. **Style**: Match project conventions (Prettier, ESLint, Biome). **Testing**: Include test suggestions with implementation. **Documentation**: Add JSDoc/TSDoc comments for public APIs. **Security**: Apply secure coding practices. **Accessibility**: Include ARIA labels, semantic HTML. **Performance**: Consider algorithmic efficiency, avoid premature optimization. **Observability**: Add logging, metrics, tracing where appropriate.

## Efficiency Best-Practices (preserve quality)

- Prefer incremental work: Keep PRs small and focused (minimal diff). Use the guard-change-budget checks to validate budgets. Make focused commits: one logical change per commit; keep commit messages clear and reference issues/ADRs.
- Faster tests and local feedback: Prefer running unit tests only for changed files/packages (e.g., Vitest `--changed` or targeted `npm run test:changed`). Use `npx` to run local tools (`npx vitest`) so contributors needn't install global tooling. Use watch modes for iterative work (`vitest --watch`) and VS Code test tasks that prefer `--changed` to limit CPU usage.
- Safe fast-mode for development: Use the `FAST_AI=1` local flag for quick, lower-rigor iterations. Always unset or override for `Safe`/`Audit` CI runs. Document FAST_AI usage in `/docs/` and ensure CI explicitly sets `FAST_AI=0` for gating workflows.
- Caching and warmed artifacts: Use warmed AI-index artifacts (e.g., `ai-index-cache` branch) and persisted SBOMs in CI to reduce repeated heavy work. Cache package manager installs and build artifacts in CI where possible.
- Targeted linting & preflight: Run linters and typechecks only on affected packages/files where feasible (use `nx affected:*` or similar tools) to shorten feedback loops. Always run `tools/scripts/ai/guard-change-budget.mjs` (or its shim) during preflight; fail early on budget or artifact violations.
- CI hygiene for speed: Parallelise jobs where safe (unit tests, linters, build matrix). Use `--changed`/affected strategies to avoid full-suite runs on small PRs. Rerun failing tests selectively rather than rerunning entire pipelines; quarantine flaky tests and add TODOs to fix them.
- Dependency & ADR discipline (efficiency + safety): Adding runtime/build dependencies must include an ADR and justification; prefer reusing existing libs to avoid dependency churn.
- Small automation helpers: Provide short, reusable scripts (e.g., `npm run test:changed`, `npm run lint:staged`) and VS Code tasks so contributors can do the right thing quickly.

Rationale: these steps reduce iteration time while preserving the governance requirements around security, testing, and auditability. Any deviation must be documented in the PR's `AI-EXECUTION` header and justified in the PR body.
