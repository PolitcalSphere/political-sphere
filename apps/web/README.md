# Frontend Shell

The frontend service renders a dashboard-backed HTML page, embedding live data from the API summary endpoints while still keeping dependencies intentionally lightweight.

## Features

- Serves `apps/frontend/public/index.html`, injecting the API base URL and initial data payload.
- Fetches `/api/news` and `/metrics/news` at request time to pre-render the latest dataset.
- Exposes `GET /healthz` for monitoring and `/` for the dashboard.
- Auto-reloads the HTML template when a POST to `/__reload` is received (handy for future tooling).

## Running locally

```bash
npm run start:frontend
# or
npx nx serve frontend
```

By default the dashboard listens on `FRONTEND_PORT` (3000) and queries `API_BASE_URL`, which should match the API container URL inside Docker Compose (`http://api:4000`). If the API is unavailable, the service renders an empty dashboard with a warning banner.

## Follow-up ideas

- Replace the hard-coded HTML with a real React/Next.js host once the Module Federation plan is finalized.
- Add smoke tests that confirm the rendered markup includes the latest policy signals.
- Integrate with the design system from `libs/ui` when it becomes available.
