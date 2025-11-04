# Improvements Plan to Reach Level 4-5 Excellence

## Current Status (from original TODO.md)

- [x] Initial plan approved by user.
- [x] Detailed expansion plan approved by user.
- [x] Step 1: Fix DB migrations by editing migrations/index.js to skip or fix validateSchema (comment foreign_key_check, ensure db open).
- [x] Step 2: Add sample data insert migration.
- [x] Step 3: Build shared lib: Add build script to libs/shared/package.json, run tsc to generate dist.
- [x] Step 4: Install React deps: npm install react react-dom @vitejs/plugin-react --save; update root package.json scripts for vite build/serve.
- [x] Step 5: Create full API routes: Edit apps/api/src/app.js to include news routes from news-service.js; replace mock-server with full Express server on port 4000.
- [x] Step 6: Refactor frontend to React: Create Vite config in apps/frontend/vite.config.js; move dashboard to React components (Dashboard.jsx using useEffect for API fetch); update server.js to serve Vite dev server or built assets.

## Pending Original Steps

- [ ] Step 7: Add game mechanics stubs: Create libs/game-engine/src/index.ts with stubs for vote simulation, party dynamics; export and use in API/UI.
- [ ] Step 8: Run npm install.
- [ ] Step 9: Build shared and game-engine.
- [ ] Step 10: Run migrations and start API (node apps/api/src/app.js).
- [ ] Step 11: Start frontend dev server (vite --port 3001).
- [ ] Step 12: Test: Browser to localhost:3001, curl API endpoints, verify data flow and game stubs (e.g., simulate vote).
- [ ] Step 13: Use browser_action to verify UI, execute_command for curl tests.
- [ ] Step 14: Update TODO.md with completion.

## New Improvement Steps for Level 4-5

- [ ] Step 15: Enhance testing: Add unit/integration tests for game stubs; implement e2e with Playwright; add performance tests with k6 (p95 < 200ms for API).
- [ ] Step 16: Enhance documentation: Update docs/architecture.md with game engine details; add ADR for caching improvements; ensure WCAG validation docs.
- [ ] Step 17: Implement monitoring: Configure Prometheus/Grafana dashboards for API metrics; add OTEL tracing for game routes; self-auditing logs.
- [ ] Step 18: Fix technical debt: Resolve DB 500 errors in tests; implement AI cache TTL cleanup; resolve Prettier/Biome conflicts.
- [ ] Step 19: Validate compliance: Run full security scans (Gitleaks, Semgrep); accessibility tests (axe-core); ethical AI review per ISO 42001.
- [ ] Step 20: Stress test: Add chaos engineering stubs (e.g., simulate DB outage); validate resilience.
- [ ] Step 21: Final review: Update CHANGELOG.md; simulate peer review; governance approval via controls.yml.
- [ ] Step 22: Update original TODO.md with all completions; archive this file.

## Notes

- Priority: Complete original steps 7-14 first, then new steps 15-22.
- Testing: Ensure >95% coverage, zero serious accessibility violations.
- Monitoring: Respect performance budgets in apps/\*/budgets.json.
- Validation: Run npm run controls:run after each major step.
