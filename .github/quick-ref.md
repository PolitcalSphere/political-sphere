# Quick Reference: Political Sphere Governance Rules

**Version**: 1.8.0 | **Last Reviewed**: 2025-11-05

## Core Principles

- Treat requests as production-grade: resilient, maintainable, democratic, ethical.
- Balance speed and governance: choose Execution Mode, state trade-offs, protect Tier 0/1.
- Be a trusted teammate: explain, surface assumptions, flag risks.
- Default to sustainable decisions: secure, accessible, observable.

## Execution Modes

- **Safe (default)**: T0 + T1 + T2. Budget ≤ 300 lines, ≤ 12 files. New deps require ADR.
- **Fast-Secure**: T0 + T1 only; deferred gates in `/docs/TODO.md`.
- **Audit**: T0 + T1 + T2 + T3 + full artefact capture.
- **R&D**: T0 + minimal T1; outputs marked `experimental`; no production merges without Safe re-run.

## Rule Tiers

- **Tier 0**: Constitutional (ethics, safety, privacy, anti-manipulation) — Never bypass.
- **Tier 1**: Operational Mandatory (secret detection, security scans, basic tests, critical CI gates).
- **Tier 2**: Best-Practice Defaults (linting, formatting, coverage thresholds, docs updates, accessibility checks).
- **Tier 3**: Advisory Optimisation (performance tuning, large refactors, non-blocking improvements).

## Key Checklists

### Before Code Changes

- [ ] Map change against OWASP ASVS, NIST SP 800-53, ISO/IEC 27001, SOC 2 CC, WCAG 2.2 AA+, NIST AI RMF, GDPR/CCPA.
- [ ] Document satisfaction or deviations; record mitigations.
- [ ] Maintain neutrality; prevent manipulation; evaluate bias.
- [ ] Ensure reversible decisions via ADRs.

### Definition of Done

- [ ] Implementation complete.
- [ ] Unit tests written and passing.
- [ ] Integration tests (if external dependencies).
- [ ] Documentation updated (comments, READMEs, API docs).
- [ ] Accessibility verified (UI changes).
- [ ] Performance validated (critical paths).
- [ ] Security reviewed (sensitive data handling).
- [ ] Error handling implemented.
- [ ] Observability instrumented.

### Compliance Checklist

- [ ] Organization: ORG-01 to ORG-10
- [ ] Quality: QUAL-01 to QUAL-09
- [ ] Security: SEC-01 to SEC-10
- [ ] AI Governance: AIGOV-01 to AIGOV-07
- [ ] Testing: TEST-01 to TEST-06
- [ ] Compliance: COMP-01 to COMP-05
- [ ] UX/Accessibility: UX-01 to UX-05
- [ ] Operations: OPS-01 to OPS-05
- [ ] Strategy: STRAT-01 to STRAT-05

## Mandatory Reading Triggers

- **Before any code changes**: Read `quality.md` and relevant domain file.
- **Before security-related work**: Read `security.md` and `compliance.md`.
- **Before AI/ML features**: Read `ai-governance.md` and `security.md`.
- **Before UI/UX changes**: Read `ux-accessibility.md`.
- **Before infrastructure changes**: Read `operations.md`.
- **Before testing**: Read `testing.md`.
- **For project structure changes**: Read `organization.md`.
- **For strategic decisions**: Read `strategy.md`.

## Emergency Guidance

If a suggestion would:

- **Compromise security**: Strongly warn and propose secure alternative.
- **Break accessibility**: Block suggestion, provide accessible approach.
- **Violate privacy**: Flag issue, suggest privacy-preserving method.
- **Enable manipulation**: Reject, explain risks, offer neutral design.
- **Introduce critical risk**: Escalate to human review.

## Meta-Rule

**CRITICAL**: Update BOTH rule sets simultaneously: `.blackboxrules` and `.github/copilot-instructions.md`.

- Update "Last updated" date and version in both files.
- Add CHANGELOG.md entry under `Unreleased`.
- Add TODO.md task.
- Use `rule-update` PR template.

**Owned by**: Technical Governance Committee | **Review cycle**: Quarterly
