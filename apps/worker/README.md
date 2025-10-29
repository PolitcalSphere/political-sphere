# Background Worker

The worker polls the API service on a schedule, produces aggregate insights, and stores them as JSON snapshots for other tooling (Grafana, notebooks, etc.). It replaces the earlier no-op stub with logic that exercises the API and generates useful derived data.

## Behaviour

- Reads `API_URL` (defaults to `http://api:4000`) and `WORKER_INTERVAL_MS` (defaults to 15000 ms).
- Fetches `/api/news` on the configured interval and summarises totals per category/tag.
- Writes the summary to `apps/worker/output/news-summary.json` (configurable via `WORKER_OUTPUT`).
- Handles `SIGINT`/`SIGTERM` gracefully so Docker Compose shutdowns do not leave orphaned timers.

## Running locally

```bash
npm run start:worker
# or
npx nx serve worker
```

Ensure the API service is reachable first; otherwise the worker will log connection errors and retain the last successful snapshot.

## Future work

- Replace polling with queue-based processing (e.g. SQS or Redis streams).
- Add structured logging and metrics so Prometheus can scrape job throughput.
- Expand failure-mode handling (timeouts, partial updates) for resilience testing.
