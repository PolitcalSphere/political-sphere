# Quick Reference

## Execution Modes
- **Safe** (default) → T0 + T1 + T2
- **Fast-Secure** → T0 + T1 only; deferred gates recorded in `/docs/TODO.md`
- **Audit** → T0 + T1 + T2 + T3 + full artefact capture
- **R&D** → T0 + minimal T1; outputs marked `experimental`; no production merges without Safe re-run

## Rule Tiers
- **T0** → Constitutional: Ethics, safety, privacy, anti-manipulation
- **T1** → Operational Mandatory: Secret detection, security scans, license checks, basic tests, critical CI gates
- **T2** → Best-Practice Defaults: Linting, formatting, coverage thresholds, docs updates, accessibility checks
- **T3** → Advisory Optimisation: Performance tuning, large refactors, non-blocking improvements

## Key Principles
- **Zero-Trust Security**: Never assume trust; always verify
- **WCAG 2.2 AA+ Accessibility**: Mandatory for all UI
- **Political Neutrality**: No AI manipulation of outcomes
- **Single Source of Truth**: One TODO list at `/docs/TODO.md`
- **Quality is Architectural**: Design quality upfront

## Directory Structure
- `/apps` → Applications
- `/libs` → Shared libraries
- `/tools` → Build tools
- `/docs` → Documentation
- `/scripts` → Automation
- `/.github/` → Workflows and configs

## Naming Conventions
- Files/Directories: `kebab-case`
- Classes/Components: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`

## Definition of Done
- ✅ Implementation complete
- ✅ Unit tests written + passing
- ✅ Integration tests (if external dependencies)
- ✅ Documentation updated
- ✅ Accessibility verified (UI changes)
- ✅ Performance validated (critical paths)
- ✅ Security reviewed (sensitive data handling)
- ✅ Error handling implemented
- ✅ Observability instrumented

## Data Classification
- **Public**: Docs, public APIs
- **Internal**: Source code, internal docs
- **Confidential**: User data, analytics
- **Restricted**: Credentials, PII, political preferences

## AI Oversight Checkpoints
Require human approval for:
- Publishing political content
- Accessing user data
- Changing policies
- High-stakes decisions

---

**Last updated**: 2025-01-10
**Version**: 1.3.2
**Owned by**: Technical Governance Committee
**Review cycle**: Quarterly
