# Architecture Overview for AI Assistants

## Snapshot
Political Sphere currently runs as a collection of hand-crafted Node.js services backed by SQLite. The repository is organised as a workspace, but the legacy Nx automation is largely dormant. Understanding the live entry points matters more than memorising generator conventions.

```
apps/
  api/           ← JSON API over HTTP (custom server)
  game-server/   ← Express gameplay service + compliance hooks
  frontend/      ← Static renderer that calls the API on demand
libs/
  shared/        ← Prebuilt logging, security, and telemetry helpers
  game-engine/   ← Game state transitions consumed by game-server
ai/              ← Governance docs, indexes, patterns, learning artefacts
docs/            ← Policies, ADRs, TODO source of truth
tools/           ← Automation scripts and dormant Nx config
```

## Technology Stack
- **Runtime**: Node.js ≥ 18, mix of ESM and CommonJS modules.
- **API (`apps/api`)**: Custom HTTP server (no Express) that wires domain stores to SQLite via `better-sqlite3`. Routes live in `apps/api/src/routes/`.
- **Game server (`apps/game-server`)**: Express service persisting game state snapshots and delegating moderation/age-verification through helper scripts.
- **Frontend (`apps/frontend`)**: Node HTTP server that streams a React-powered dashboard built in plain JavaScript; assets live under `public/`.
- **Shared utilities**: `libs/shared` ships compiled JS bundles that expose logging, security headers, and telemetry helpers.
- **Data**: SQLite databases under each service’s `data/` folder with migrations in `apps/api/src/migrations/`.
- **Testing & QA**: A mix of Node test files, Jest configs, and Playwright accessibility tests (see `apps/frontend/tests/accessibility.test.js`).

## Service Highlights
### API Flow (`apps/api`)
1. `src/server.js` bootstraps the HTTP listener, wiring security headers, rate limiting, and routing.
2. Route modules (e.g. `src/routes/users.js`) call domain services under `src/domain/`.
3. Domain services talk to thin store layers (`src/stores/*`) that wrap SQLite queries.
4. `src/migrations/index.js` ensures schema alignment on boot and exposes helper APIs for tests.

Data flow summary:
```
HTTP request → route handler → domain service → store (SQLite) → response
                      ↓
               structured logging via libs/shared
```

### Game Server (`apps/game-server`)
- Entry point: `src/index.js` (Express app).
- Maintains in-memory `Map` of games plus SQLite persistence through `src/db.js`.
- Integrates with moderation and compliance clients under `src/`.
- Provides scripts in `apps/game-server/scripts/` to exercise compliance scenarios.

### Frontend (`apps/frontend`)
- `src/server.js` renders `public/index.html`, injecting API data from `/api/news` and `/metrics/news`.
- Security headers are enforced manually; CSP defaults live inside the server file.
- UI components (React) live under `src/components/` and are written in `.jsx` with matching CSS modules.

## Tooling Notes
- Nx remains configured in `tools/config/nx.json`, but core workflows call scripts directly (e.g. `node apps/api/src/server.js`). Treat Nx metadata as advisory until the tooling is revived.
- `node_modules/` at the repository root contains dependencies for the whole workspace via `package-lock.json`; some packages appear as `extraneous` because they are managed outside of `package.json`.
- `tools/scripts/` contains automation for indexing, compliance controls, and environment bootstrap. AI-related scripts live under `tools/scripts/ai/`.

## Observability & Compliance
- Logging uses `getLogger` from `@political-sphere/shared`; services log JSON with context metadata.
- No central metrics backend exists. AI metrics are captured as JSON files in `ai/ai-metrics/` and at the repository root (`ai-metrics.json`).
- Script executions also write to `ai/ai-metrics/analytics.db` (SQLite) for trend analysis; JSONL fallback is created if SQLite is unavailable.
- Compliance and governance requirements are codified in `.blackboxrules`, `.github/copilot-instructions.md`, and `docs/controls.yml`.
- Interaction and decision logs belong in `ai/history/`; add a new entry whenever you perform non-trivial automation.

## Working as an AI Assistant
1. Read `project-context.md` (this directory) and service-specific READMEs before edits.
2. Use existing patterns in `ai/patterns/` and `libs/shared` to stay consistent.
3. Prefer ESM (`import`) when extending services that already use it; mind CommonJS in compiled shared libs.
4. Validate SQLite changes against migration helpers and consider seed/test data impact.
5. Document findings or deferred work in `docs/TODO.md` and `ai/history/` per governance rules.

_Last updated: 2025-11-03_
