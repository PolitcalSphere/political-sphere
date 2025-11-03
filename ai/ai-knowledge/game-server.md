# Game Server Quick Reference

**Entry Points**
- `apps/game-server/src/index.js` – Express app, in-memory state, moderation hooks.
- `apps/game-server/src/db.js` – SQLite persistence helpers.
- `libs/game-engine/src/engine.ts` – Turn advancement logic.

**Compliance Scripts**
```bash
node apps/game-server/scripts/testComplianceLogging.js
node apps/game-server/scripts/testModeration.js
node apps/game-server/scripts/testAgeVerification.js
```

**Operational Notes**
- Default moderation endpoint configurable via `MODERATION_API_KEY` / `API_BASE_URL`.
- Persisted games live alongside the API database; ensure migration parity.
- Compliance events are logged through `src/complianceClient`.
