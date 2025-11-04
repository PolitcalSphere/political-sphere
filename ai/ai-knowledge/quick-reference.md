# AI Quick Reference Guide

## Core Commands

```bash
# Install root dependencies (required before any service can run)
npm install

# Start the API service (custom HTTP server)
node apps/api/src/server.js

# Start the gameplay service (Express)
node apps/game-server/src/index.js

# Start the frontend shell
node apps/frontend/src/server.js

# Run accessibility smoke test (Playwright)
npx playwright test apps/frontend/tests/accessibility.test.js

# Execute compliance scripts
node apps/game-server/scripts/testComplianceLogging.js
node apps/game-server/scripts/testModeration.js
```

> Tips:
>
> - Services rely on shared utilities inside `libs/shared`. Keep the root `node_modules/` hydrated so `@political-sphere/shared` resolves correctly.
> - Load curated bundles from `ai/context-bundles/` or service quick references before scanning the repo.
> - Use Node.js 22.x locally and in CI (`nvm use` respects `.nvmrc`; workflows install Node 22).

## Frequently Touched Paths

```
apps/api/src/server.js           # API bootstrap and routing
apps/api/src/routes/*.js         # REST handlers
apps/api/src/migrations/*.js     # SQLite schema migrations
apps/game-server/src/index.js    # Express entry point
apps/game-server/src/db.js       # Persistence helpers
apps/frontend/src/server.js      # SSR-ish static host
apps/frontend/src/components/    # React components
libs/shared/src/logger.ts        # Structured logging
ai/ai-knowledge/*.md             # AI-facing documentation
ai/patterns/*.json               # Reusable implementation patterns
```

## Execution Modes & Change Budgets

- Safe: ≤300 lines / 12 files; new dependencies require an ADR in the change set.
- Fast-Secure: ≤200 lines / 8 files; record every deferred gate with owner + due date in `docs/TODO.md`.
- Audit: Ensure SBOM/provenance artefacts are present and capture supporting test evidence when feasible.
- R&D: Advisory only; mark outputs `experimental` and schedule a Safe-mode rerun before protected merges.

## Troubleshooting Cheatsheet

- **`MODULE_NOT_FOUND: @political-sphere/shared`**  
  Run `npm install` (root) and ensure `libs/shared` has been built—precompiled files live under `libs/shared/src`.

- **SQLite lock or missing tables**  
  Delete the local DB under `apps/api/data/` or rerun migrations via `node apps/api/src/migrations/index.js` helper methods.

- **Moderation API failures**  
  Check environment variables consumed in `apps/game-server/src/index.js` (`API_MODERATION_URL`, `MODERATION_API_KEY`). Compliance logs end up under `reports/` if the scripts are executed.

- **Frontend shows “Template missing.”**  
  Confirm `apps/frontend/public/index.html` exists and rerun the server; `src/server.js` reloads templates when `/__reload` is posted.

## Governance Reminders

- Always read `.blackboxrules` and `.github/copilot-instructions.md` before significant work.
- Treat the repository-root `.blackboxrules` as the single source of truth; update any automation that still references legacy paths.
- Consult `ai-controls.json` for the current AI rate limits, quality gates, and fast-mode behaviour.
- Review `ai/ai-metrics/analytics.db` (or fallback JSONL) after automation runs to spot slow scripts.
- Record substantial automation or findings in `ai/history/` (see `templates/` in that directory).
- Update `docs/TODO.md` when deferring required gates (tests, accessibility, security scans).
- Accessibility is mandatory: run the Playwright accessibility test after UI changes.
- Guard change budget output now includes artefact checklists, benchmark mapping reminders, and telemetry requirements—confirm these items when preparing PR notes.
- Include trace or telemetry identifiers in automation outputs per Governance Playbook 2.2.0.

## Operating Loop & Validation Protocol

1. **Calibrate context** — Re-read the request, `/docs/TODO.md`, relevant ADRs, and linked issues; restate objectives and constraints.
2. **Assess constraints** — Confirm data classification, policy requirements, and choose an Execution Mode; identify blockers or missing inputs before coding.
3. **Plan deliberately** — Outline the approach, validation steps, and rollback strategy; sequence work into smallest valuable increments.
4. **Execute safely** — Reuse proven patterns, respect module boundaries, keep diffs minimal, and guard integrations with explicit interfaces.
5. **Validate relentlessly** — Run or describe required tests, security checks, linting, accessibility, and performance validations appropriate to the change.
6. **Document & hand off** — Update CHANGELOG/TODO entries, capture follow-ups with owners and due dates, and codify new heuristics into both rule files per the Meta-Rule.

**Validation Protocol:**

- Run unit tests, linters, and secret scan according to the Execution Mode.
- Update CHANGELOG.md and TODO.md for all changes.
- Ensure parity between .blackboxrules and .github/copilot-instructions.md
- Test changes in CI pipeline.
- Gather feedback from development team.

_Last updated: 2025-11-05_
