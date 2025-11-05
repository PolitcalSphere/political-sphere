# API Service Quick Reference

**Entry Points**

- `apps/api/src/server.js` – HTTP bootstrap, rate limiting, routing.
- `apps/api/src/routes/` – REST handlers grouped by resource.
- `apps/api/src/domain/` – Business logic orchestrators.
- `apps/api/src/stores/` – SQLite data access layers.

**Key Commands**

```bash
node apps/api/src/server.js          # Start service
node tools/scripts/ai/pre-cache.js   # Warm AI context cache
node --test apps/api/tests/**/*.js   # Run Node test suites
```

**Testing & Migrations**

- Migrations live in `apps/api/src/migrations/`. Call `initializeDatabase()` before tests.
- Smoke tests rely on the SQLite file under `apps/api/data/`. Delete it for a clean start.

**Common Pitfalls**

- Keep store methods synchronous—`better-sqlite3` is blocking.
- Update `ai/ai-learning/patterns.json` when new store patterns emerge.
- Record schema changes in `docs/04-architecture/decisions/`.
