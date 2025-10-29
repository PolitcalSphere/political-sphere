Playwright e2e baseline

This folder contains a minimal Playwright configuration and a smoke test that verifies the frontend responds at the configured `E2E_BASE_URL` (defaults to `http://localhost:3000`).

Run locally:

```bash
# start local stack (dev/docker/docker-compose.dev.yaml)
npm run e2e:prepare

# run tests
npm run test:e2e
```

CI command uses `npm run test:ci` which installs Playwright browsers then runs tests with one retry and produces an HTML report at `dev/e2e/playwright-report`.
