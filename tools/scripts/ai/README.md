# AI tooling helpers

This folder contains local helper scripts used to improve assistant responsiveness and competence by building a codebase index, pre-caching common queries, and pre-loading useful contexts.

Environment variables and tuning:

- FAST_AI=1
  - When enabled, the scripts run a light-weight, fast mode (fewer files scanned, fewer lines per file). Use for quick local iterations where you prioritise speed over completeness.

- INDEXER_CONCURRENCY (default: 50)
  - Controls the max number of parallel workers used by `code-indexer.js build`. Lower this on low-memory CI runners.

- PRE_CACHE_MAX_ENTRIES (default: 200)
  - Maximum number of cached query entries stored by `pre-cache.js`.

- PRE_CACHE_TTL_MS (default: 86400000)
  - TTL in milliseconds for cached entries (default 24 hours). Expired entries are removed on save.

Usage examples:

```bash
# full run (default, production-like)
node ./scripts/ai/code-indexer.js build
node ./scripts/ai/pre-cache.js
node ./scripts/ai/context-preloader.js preload

# fast iteration
FAST_AI=1 node ./scripts/ai/pre-cache.js
FAST_AI=1 node ./scripts/ai/context-preloader.js preload

# tune concurrency
INDEXER_CONCURRENCY=30 node ./scripts/ai/code-indexer.js build
```

Notes:

- The CI workflow `.github/workflows/ai-maintenance.yml` runs these scripts nightly and on pushes to `main`, and uploads `ai-cache/` and `ai-index/` as artifacts.
- For improved semantic relevance, consider adding an embeddings/vector store step and optional vector DB (Milvus, Weaviate, or SQLite + open-source vector libraries) — this is a recommended next step.

- Fast local search server: start a small in-memory index server to avoid repeated disk reads and speed up interactive queries:

```bash
# starts HTTP server on port 3030 by default
node ./scripts/ai/index-server.js 3030
# then query: http://localhost:3030/search?q=new+component&limit=5
```

## Persistent index cache

The CI workflow stores the generated index in a dedicated branch `ai-index-cache`. To fetch the warmed index locally without rebuilding, run:

```bash
./scripts/ai/fetch-index.sh
# or to overwrite local index
./scripts/ai/fetch-index.sh --force
```

This requires the repository to be a git checkout with `origin` available.

## Smoke tests

Run a quick smoke test that builds the index, populates the cache, pre-loads contexts and runs the competence and performance monitors:

```bash
./scripts/ai/smoke.sh
```

## Prometheus metrics

When the in-memory index server is running (`node ./scripts/ai/index-server.js`), you can scrape metrics at:

```
http://localhost:3030/metrics
```
