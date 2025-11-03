# Political Sphere Project Context

## Overview
Political Sphere is a democratically-governed political simulation platform. The current codebase focuses on a lightweight gameplay loop, compliance tooling, and auditing of AI interventions. The repository is organised as a multi-package workspace with a mixture of JavaScript and TypeScript services rather than a fully-generated Nx environment.

## Active Components
- **API Service (`apps/api`)**  
  Plain Node.js HTTP server that exposes JSON endpoints for political entities (users, parties, bills, votes). Persistence relies on SQLite via `better-sqlite3`, with hand-written migration files.
- **Game Server (`apps/game-server`)**  
  Express application that maintains in-memory game state, persists snapshots to SQLite, and brokers content moderation/age verification flows.
- **Frontend Shell (`apps/frontend`)**  
  Static-serving Node.js server that renders a React dashboard from prebuilt assets in `apps/frontend/public`, enriching the template with live API data at request time.

## Supporting Libraries
- **`libs/shared`** – Precompiled CommonJS utilities (logging, security helpers, telemetry adapters) consumed by the runtime services.
- **`libs/game-engine`** – Turn progression helpers referenced by the game server.
- Additional libraries (`libs/platform`, `libs/ui`, …) are in-progress scaffolding and may contain TypeScript sources that are not part of the active runtime.

## Data & Storage
- Primary store: SQLite databases that live under `apps/api/data/` and `apps/game-server/data/`.
- Migrations: `apps/api/src/migrations/` contains sequential SQL/JS migration scripts plus validation helpers.
- Observability: Structured logging funnels through `libs/shared/logger`. No central metrics stack is wired up yet; AI-facing metrics are JSON files under `ai/`.

## Tooling & Build
- **Runtime**: Node.js ≥ 18 with ECMAScript modules enabled for most services.
- **Package management**: Root `package-lock.json` pins dependencies; many packages are marked `extraneous`, so prefer `npm install` at the repository root to hydrate `node_modules/`.
- **Nx configuration**: `tools/config/nx.json` exists for future modular orchestration, but the current workflow relies on direct `node` invocations and a handful of ad-hoc scripts.
- **Testing**: Jest-style unit tests and Node test runners are present but not yet wired into a single command. Accessibility tests use Playwright under `apps/frontend/tests/`.

## Governance & Compliance
- `.blackboxrules` (under `ai/governance/`) and `.github/copilot-instructions.md` define binding AI behaviour.
- Compliance scripts under `apps/game-server/scripts/` exercise age verification, logging, and moderation flows.
- `ai-controls.json` at the repository root centralises rate limits, quality gates, and monitoring expectations for AI automation.
- Audit trails and interaction logs belong in `ai/history/` (see README and templates).

## Key Directories
- `ai/` – AI-facing documentation, indexes, patterns, and governance rules.
- `ai/context-bundles/` – Auto-generated, high-signal context packs for rapid loading.
- `apps/` – Runtime services (`api`, `frontend`, `game-server`) plus scaffolding for dev tooling.
- `libs/` – Shared runtime logic; many packages export transpiled JS alongside TypeScript sources.
- `docs/` – Authoritative policies, controls, and architecture notes.
- `tools/` – Automation scripts, CI helpers, and the dormant Nx configuration.

## AI Assistant Expectations
- Load this context together with `ai/ai-knowledge/architecture-overview.md` before making changes.
- Work within zero-trust, accessibility-first constraints; never bypass `.blackboxrules`.
- Prefer small, auditable changes; document non-obvious decisions in `ai/history/`.
- Start from the relevant quick reference (`ai/ai-knowledge/api-service.md`, etc.) or context bundle before diving into source.
- Raise a TODO in `docs/TODO.md` if you defer required gates or discover gaps that need human follow-up.

For deeper architectural questions, inspect the service-specific READMEs or architectural ADRs under `docs/architecture/`.
