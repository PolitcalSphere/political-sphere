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
> - Services rely on shared utilities inside `libs/shared`. Keep the root `node_modules/` hydrated so `@political-sphere/shared` resolves correctly.
> - Load curated bundles from `ai/context-bundles/` or service quick references before scanning the repo.

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
- Consult `ai-controls.json` for the current AI rate limits, quality gates, and fast-mode behaviour.
- Review `ai/ai-metrics/analytics.db` (or fallback JSONL) after automation runs to spot slow scripts.
- Record substantial automation or findings in `ai/history/` (see `templates/` in that directory).
- Update `docs/TODO.md` when deferring required gates (tests, accessibility, security scans).
- Accessibility is mandatory: run the Playwright accessibility test after UI changes.

_Last updated: 2025-11-03_
