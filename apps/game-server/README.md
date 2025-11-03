# Game Server (scaffold)

This is a minimal scaffold for the Political Sphere game server used for local development and early integration tests.

Purpose:
- Provide a tiny HTTP API to create/join games and submit player actions.
- Use an in-memory store for rapid iteration. Replace with a database in later iterations.

Quick start:

```bash
cd apps/game-server
npm ci
npm start
```

Endpoints:
- `GET /healthz` — health check
- `POST /games` — create a game `{ name }`
- `POST /games/:id/join` — join with `{ displayName }`
- `GET /games/:id/state` — current game state
- `POST /games/:id/action` — submit action `{ action: { type, payload } }`

Notes:
- This is intentionally lightweight. Follow repo conventions for packaging and tests when promoting to production.
