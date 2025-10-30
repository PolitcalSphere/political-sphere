# API Service

The API service exposes read/write endpoints for policy updates and provides analytics consumed by the worker and frontend. It is intentionally lightweight (vanilla Node.js) so it can run anywhere while the broader domain model evolves.

## Endpoints

- `GET /healthz` – readiness probe used by Docker Compose and monitoring.
- `GET /` – discovery document describing the available routes.
- `GET /api/news` – list policy stories with optional filtering (`category`, `tag`, `search`, `limit`).
- `POST /api/news` – create a new policy story (validates `title`, `excerpt`, `content`).
- `GET /api/news/{id}` – retrieve a single record.
- `PUT /api/news/{id}` – update an existing record.
- `GET /metrics/news` – analytics summary consumed by the worker and dashboard.

Because the server is built with native Node.js (`http` module), no additional dependencies or frameworks are required.

## Running locally

```bash
npm run start:api
# or, via Nx:
npx nx serve api
```

The service listens on `API_PORT` (default: `4000`) and binds to `0.0.0.0` so it is reachable from other containers.

Data is persisted to `apps/api/data/news.json`. The `JsonNewsStore` helper keeps the storage format simple while still supporting concurrent updates in tests.

## Testing

- Test suites are standardized on ES modules using `.mjs` files (Jest runner via Nx)
- Legacy `.js` test files remain only as skipped CommonJS placeholders to avoid ESM parse errors in mixed tooling; see `apps/api/tests/*.test.js`
- Run the suite:

```bash
npx nx test api --runInBand
```

Notes:
- Avoid top‑level await in `.js` tests; use async `beforeAll` or convert to `.mjs`
- Keep a single authoritative test per suite to prevent duplicate execution

## Next steps

- Replace the JSON storage layer with a real database module or service client.
- Implement authentication and authorization once the auth service lands.
- Extend the analytics endpoint with additional signals (tone, reach, velocity) as data sources come online.
