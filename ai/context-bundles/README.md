# AI Context Bundles

Pre-generated, high-signal context packs that AI assistants can load quickly without scanning the entire repository.

Bundles are produced by `tools/scripts/ai/build-context-bundles.js` and stored as Markdown so they are easy to diff and inspect.

Current bundles:

- `core.md` – Project overview, TODOs, governance controls.
- `api-service.md` – API service entry points, migrations, testing notes.
- `game-server.md` – Game server workflows, compliance scripts, moderation hooks.
- `frontend.md` – Frontend server behaviour, accessibility guidance.
- `recent-changes.md` – The latest high-impact modifications (populated by automation).

Regenerate bundles after significant documentation or service updates:

```bash
node tools/scripts/ai/build-context-bundles.js
```

For a full AI refresh (pre-cache, metrics, recent changes), run:

```bash
tools/scripts/ai/refresh-ai-state.sh
```

> Bundles are intentionally concise; keep the input file list in the generator script up to date.
