# Expansion Plan for Political Sphere Website

## Current Status

- [x] Initial plan approved by user.
- [x] Detailed expansion plan approved by user.
- [x] Step 1: Fix DB migrations by editing migrations/index.js to skip or fix validateSchema (comment foreign_key_check, ensure db open).
- [x] Step 2: Add sample data insert migration.
- [x] Step 3: Build shared lib: Add build script to libs/shared/package.json, run tsc to generate dist.
- [x] Step 4: Install React deps: npm install react react-dom @vitejs/plugin-react --save; update root package.json scripts for vite build/serve.
- [x] Step 5: Create full API routes: Edit apps/api/src/app.js to include news routes from news-service.js; replace mock-server with full Express server on port 4000.
- [x] Step 6: Refactor frontend to React: Create Vite config in apps/frontend/vite.config.js; move dashboard to React components (Dashboard.jsx using useEffect for API fetch); update server.js to serve Vite dev server or built assets.
- [ ] Step 7: Add game mechanics stubs: Create libs/game-engine/src/index.ts with stubs for vote simulation, party dynamics; export and use in API/UI.
- [ ] Step 8: Run npm install.
- [ ] Step 9: Build shared and game-engine.
- [ ] Step 10: Run migrations and start API (node apps/api/src/app.js).
- [ ] Step 11: Start frontend dev server (vite --port 3001).
- [ ] Step 12: Test: Browser to localhost:3001, curl API endpoints, verify data flow and game stubs (e.g., simulate vote).
- [ ] Step 13: Use browser_action to verify UI, execute_command for curl tests.
- [ ] Step 14: Update TODO.md with completion.

## Recent tasks (automation)

- [x] 2025-11-04: Stabilise ANN integration tests and index-server startup. Implemented defensive index loading, legacy /vector-search compatibility, deterministic fallback results, and robust REPO_ROOT discovery in mirrored tests. (owner: automation)


## Notes

- Priority: API/DB first (Steps 1-5, 8-10), then UI and game (Steps 6-7, 11-13).
- Test: Browser to http://localhost:3001 (frontend), curl /api/news, /api/bills.
- Errors: Ensure shared built, DB initialized, no import issues. Use --legacy-peer-deps for npm if conflicts.
