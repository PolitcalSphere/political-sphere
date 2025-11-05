# AI Context Bundles

Pre-generated, high-signal context packs that AI assistants can load quickly without scanning the entire repository. Two generators maintain the catalogue:

- `tools/scripts/ai/build-context.sh` – Produces operational context (recent changes, active tasks, structure, error patterns, dependencies, code patterns, and an index).
- `tools/scripts/ai/build-context-bundles.js` – Curates deep dives for the core services (core project, API, game server, frontend).

Current bundles include:

- `core.md` – Project overview, TODOs, governance controls.
- `api-service.md` – API service entry points, migrations, testing notes.
- `game-server.md` – Game server workflows, compliance scripts, moderation hooks.
- `frontend.md` – Frontend server behaviour, accessibility guidance.
- `recent-changes.md` – The latest high-impact modifications (populated by automation).
- `active-tasks.md` – Top TODO items and recently completed work.
- `project-structure.md` – Directory tree, package locations, configuration files.
- `error-patterns.md` – Recent errors and failing test hints.
- `dependencies.md` – Dependency snapshot and workspace view.
- `code-patterns.md` – Common imports and testing footprint.
- `INDEX.md` – Directory of available bundles and usage pointers.

Regenerate bundles after significant documentation or service updates:

```bash
# Operational bundles (recommended before large sessions)
bash tools/scripts/ai/build-context.sh

# Curated service snapshots
node tools/scripts/ai/build-context-bundles.js
```

For a full AI refresh (pre-cache, metrics, recent changes), run:

```bash
tools/scripts/ai/refresh-ai-state.sh
```

> Bundles are intentionally concise; keep the input file lists in both generator scripts up to date.
