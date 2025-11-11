# TODO.md - Political Sphere Development Tasks

## Linting & Code Quality (Completed 2025-11-11)

### Phase 1: ESLint Configuration & Prettier Auto-fixes ✅ COMPLETE

- [x] Add CommonJS override to eslint.config.js for `/apps/api/**/*.js` files
- [x] Apply Prettier auto-fixes across all API files (single quotes, formatting)
- [x] Reduce errors from 21,000+ to 27 (99.87% improvement)
- [x] Verify test suite passing after changes

### Phase 2: Manual ESLint Error Fixes ✅ COMPLETE

- [x] Fix 8 unused variable errors in moderationService.js
- [x] Fix 2 unused catch parameters in auth.js
- [x] Fix 1 unused catch parameter in middleware/auth.js
- [x] Remove unused fs/path imports from bill-store.js and vote-store.js
- [x] Fix 2 unused catch parameters in useLocalStorage.js
- [x] Fix filePath scope issue in database-seeder.js
- [x] Fix empty catch block in database-seeder.js
- [x] Fix unused error parameter in http-utils.js
- [x] Create ADR documenting hybrid CommonJS/ESM strategy
- [x] Revert .lefthook.yml to strict `--max-warnings 0`
- [x] Update CHANGELOG.md with Phase 2 completion
- [x] Mark Phase 2 complete in TODO.md

**Results**: All 9 target files passing ESLint, 0 errors in originally failing files, CI/CD unblocked

## ESM Migration Tracker

**Goal**: Incrementally convert `/apps/api/**/*.js` files from CommonJS to ESM
**Strategy**: See ADR [docs/architecture/decisions/0001-esm-migration-strategy.md](docs/architecture/decisions/0001-esm-migration-strategy.md)
**Target Completion**: Q1 2026

### Priority 1: Utilities (Low dependency)

- [x] `/apps/api/src/utils/http-utils.js` → `.mjs` (Converted 2025-11-11)
- [ ] `/apps/api/src/utils/log-sanitizer.js` (Blocked: consumed by CommonJS app.js)
- [ ] `/apps/api/src/utils/config.js`
- [ ] `/apps/api/src/utils/database-connection.js`
- [ ] `/apps/api/src/utils/database-performance-monitor.js`

### Priority 2: Stores (Medium dependency)

- [ ] `/apps/api/src/stores/user-store.js`
- [ ] `/apps/api/src/stores/party-store.js`
- [ ] `/apps/api/src/stores/bill-store.js`
- [ ] `/apps/api/src/stores/vote-store.js`

### Priority 3: Middleware & Routes (High dependency)

- [ ] `/apps/api/src/middleware/auth.js`
- [ ] `/apps/api/src/middleware/csrf.js`
- [ ] `/apps/api/src/middleware/request-id.js`
- [ ] `/apps/api/src/routes/auth.js`
- [ ] `/apps/api/src/routes/users.js`
- [ ] `/apps/api/src/routes/parties.js`
- [ ] `/apps/api/src/routes/bills.js`
- [ ] `/apps/api/src/routes/votes.js`

### Priority 4: Core Application (Final)

- [ ] `/apps/api/src/app.js`
- [ ] `/apps/api/src/server.js`
- [ ] `/apps/api/src/index.js`

### Conversion Checklist (per file)

1. Change `const x = require('y')` → `import x from 'y'`
2. Change `module.exports = x` → `export default x` or `export { x }`
3. Update `package.json` with `"type": "module"` (when entire app converted)
4. Run tests for converted file
5. Check all imports of this file are updated
6. Mark item complete above with current date

## E2E Testing Infrastructure (Completed 2025-11-11)

### Completed

- [x] Visual regression testing infrastructure (21 tests)
- [x] Performance and load testing (15+ tests with Web Vitals)
- [x] Enhanced voting flow tests (30+ tests, expanded from 8)
- [x] Test sharding configuration and documentation
- [x] E2E README updated with comprehensive test coverage
- [x] Playwright configuration optimized for visual regression
- [x] Multi-browser testing enabled (Chromium, Firefox, WebKit)
- [x] Responsive design testing (mobile, tablet, desktop)
- [x] Dark mode testing integrated
- [x] Update CHANGELOG.md with E2E enhancements

**Final E2E Test Suite:**

- Total tests: 126+ (from 68, +85% increase)
- Browser coverage: 3 browsers
- Viewport coverage: 3 responsive breakpoints
- Theme coverage: Light and dark modes
- CI/CD optimization: 7-10 min → 1-2 min with sharding

## API Security Improvements (Completed 2025-11-11)

### Completed

- [x] Add stricter rate limiting for auth endpoints (5 attempts/15min)
- [x] Verify JWT secrets validation (no fallbacks, fail-fast)
- [x] Verify password hashing in POST /users route (bcrypt with 10 rounds)
- [x] Fix GitHub Actions JWT secrets context warnings
- [x] Remove insecure inline secret fallbacks in e2e.yml workflow
- [x] Replace console.log/error with structured logger in bills.js and votes.js

## Documentation and Standards

### Completed (2025-11-11)

- [x] Establish comprehensive coding standards adapted to project requirements
- [x] Integrate security, accessibility, testing, and political neutrality principles
- [x] Update CHANGELOG.md with coding standards addition
- [x] Update CHANGELOG.md with E2E enhancements
- [x] Update CHANGELOG.md with security improvements

## Security Vulnerabilities Fix (apps/api) - In Progress

### Remaining Tasks

- [ ] Update users.test.mjs to include login flows and auth tokens
- [ ] Update bills.test.mjs to include auth tokens
- [ ] Update votes.test.mjs to include auth tokens
- [ ] Audit input validation schemas across all routes (users, bills, votes, parties, moderation)
- [ ] Confirm auth bypass only active in NODE_ENV=test; verify production enforcement
- [ ] Add validation tests for edge cases and malicious inputs

### High Issues (1 remaining)

- [ ] Ensure comprehensive input validation and sanitization in all routes

### Followup Steps

- [ ] Run tests to verify auth works (expect 289 tests, previously 24 failed)
- [ ] Run linting (fix 801 errors, 1518 warnings)
- [ ] Run type-checking (fix 123 errors in 25 files)
- [ ] Re-run security audit to confirm fixes
- [ ] Update CHANGELOG.md with security fixes

## Dependency Alignment - Zod (Added 2025-11-11)

### Completed

- [x] Immediate CI unblocker: add `--legacy-peer-deps` to npm ci steps in service Dockerfiles (api, web, worker, game-server)
- [x] Align workspace to Zod v3: set `zod` to `^3.25.6` in root and tools/config package.json
- [x] Add npm `overrides` in root to enforce consistent Zod version
- [x] Validate with targeted tests (vitest --changed)

### Next Steps

- [ ] Track upstream support for Zod v4 in `@langchain/*` and `zod-to-json-schema`
- [ ] Plan upgrade path back to Zod v4 when all peers officially support it (ADR + test pass)
- [ ] Re-run Docker builds in CI to confirm fix (monitor `Docker Build and Publish` workflow)

### Notes

- Tests failing due to 401 on auth routes (users, parties, bills, votes) as tests lack tokens
- Ownership checks added to users.js, but tests need auth
- No parties.test.mjs exists
- Linting issues in tools/scripts, docs, etc. (not core API)
- Type-checking: import extensions, JWT secrets undefined, type mismatches in stores/services
