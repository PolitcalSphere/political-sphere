# TODO.md - Political Sphere Development Tasks

## Linting & Code Quality (Completed 2025-11-11)

### Phase 1: ESLint Configuration & Prettier Auto-fixes ✅ COMPLETE

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| CommonJS override for `eslint.config.js` | Add `/apps/api/**/*.js` override so ESLint inspects CommonJS files. | High | ✅ Complete |
| Prettier auto-fixes across API files | Apply formatting (single quotes, spacing) to stabilize lint output. | Medium | ✅ Complete |
| Reduce ESLint errors from 21k+ to 27 | Shrink error volume by 99.87% to unblock CI signal. | High | ✅ Complete |
| Verify test suite after lint updates | Ensure linting changes introduce no regressions. | High | ✅ Complete |

### Phase 2: Manual ESLint Error Fixes ✅ COMPLETE

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| Clean up `moderationService.js` | Remove 8 unused variables uncovered by ESLint. | High | ✅ Complete |
| Prune unused catches in `auth.js` | Drop 2 unused catch parameters to silence warnings. | Medium | ✅ Complete |
| Tidy `middleware/auth.js` | Remove the last unused catch parameter. | Medium | ✅ Complete |
| Remove unused imports in stores | Delete stray `fs/path` imports from bill and vote stores. | Medium | ✅ Complete |
| Fix catches in `useLocalStorage.js` | Remove 2 unused catch parameters introduced by hooks. | Low | ✅ Complete |
| Repair `filePath` scope in seeder | Ensure `database-seeder.js` uses the correct variable scope. | High | ✅ Complete |
| Fill empty catch block | Provide handling inside `database-seeder.js` catch. | Medium | ✅ Complete |
| Remove unused error param | Clean `http-utils.js` to reduce noise. | Low | ✅ Complete |
| Document hybrid module strategy | Publish ADR covering CommonJS/ESM coexistence. | Medium | ✅ Complete |
| Reinstate strict Lefthook config | Revert `.lefthook.yml` to enforce `--max-warnings 0`. | Medium | ✅ Complete |
| Update `CHANGELOG.md` for Phase 2 | Capture the manual lint fixes in release notes. | Low | ✅ Complete |
| Mark TODO as complete | Record Phase 2 completion here. | Low | ✅ Complete |

**Results**: All 9 target files passing ESLint, 0 errors in originally failing files, CI/CD unblocked

## ESM Migration Tracker

**Goal**: Incrementally convert `/apps/api/**/*.js` files from CommonJS to ESM  
**Strategy**: See ADR [docs/architecture/decisions/0001-esm-migration-strategy.md](docs/architecture/decisions/0001-esm-migration-strategy.md)  
**Target Completion**: Q1 2026

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| `/apps/api/src/utils/http-utils.js` | Converted to `.mjs` on 2025-11-11 (commit dcb2e46). | Low | ✅ Complete |
| `/apps/api/src/utils/database-connection.js` | Migrated to `.mjs` on 2025-11-12 (commit b52aa33). | Low | ✅ Complete |
| `/apps/api/src/utils/database-transactions.js` | Migrated to `.mjs` on 2025-11-12 (commit b52aa33). | Low | ✅ Complete |
| `/apps/api/src/utils/database-export-import.js` | Migrated to `.mjs` on 2025-11-12 (commit b52aa33). | Low | ✅ Complete |
| `/apps/api/src/utils/database-performance-monitor.js` | Migrated to `.mjs` on 2025-11-12 (commit b52aa33). | Low | ✅ Complete |
| `/apps/api/src/utils/log-sanitizer.js` | Conversion ready but blocked by CommonJS `app.js` consumer. | Low | ⛔ Blocked |
| `/apps/api/src/utils/config.js` | Already ESM; just track for parity with other utilities. | Low | ✅ Complete |

### Priority 2: Stores (Medium dependency)

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| `/apps/api/src/stores/user-store.js` | Convert store and consuming routes to ESM syntax. | Medium | ⏳ Pending |
| `/apps/api/src/stores/party-store.js` | Convert store helpers plus downstream imports. | Medium | ⏳ Pending |
| `/apps/api/src/stores/bill-store.js` | Convert module and ensure seeder/tests follow. | Medium | ⏳ Pending |
| `/apps/api/src/stores/vote-store.js` | Convert module and align worker usage. | Medium | ⏳ Pending |

### Priority 3: Middleware & Routes (High dependency)

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| `/apps/api/src/middleware/auth.js` | Convert middleware and confirm JWT helpers interop. | High | ⏳ Pending |
| `/apps/api/src/middleware/csrf.js` | Convert CSRF middleware and test across routes. | High | ⏳ Pending |
| `/apps/api/src/middleware/request-id.js` | Convert request ID middleware and logger hook. | High | ⏳ Pending |
| `/apps/api/src/routes/auth.js` | Convert auth routes plus shared validators. | High | ⏳ Pending |
| `/apps/api/src/routes/users.js` | Convert user routes and watchers. | High | ⏳ Pending |
| `/apps/api/src/routes/parties.js` | Convert party routes including SSE handlers. | High | ⏳ Pending |
| `/apps/api/src/routes/bills.js` | Convert bill routes and ensure tests still pass. | High | ⏳ Pending |
| `/apps/api/src/routes/votes.js` | Convert vote routes and audit imports. | High | ⏳ Pending |

### Priority 4: Core Application (Final)

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| `/apps/api/src/app.js` | Finalize main app bootstrap in ESM once dependencies ready. | Critical | ⏳ Pending |
| `/apps/api/src/server.js` | Convert server startup flow after `app.js` flips. | Critical | ⏳ Pending |
| `/apps/api/src/index.js` | Convert primary entry point when upstream modules are ESM. | Critical | ⏳ Pending |

### Conversion Checklist (per file)

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| Update import style | Replace `require` with `import` syntax. | High | ♻️ Repeat per file |
| Update export style | Replace `module.exports` with `export` keywords. | High | ♻️ Repeat per file |
| Set package type | Add `"type": "module"` once the whole app converts. | Medium | ♻️ Repeat per file |
| Run targeted tests | Execute relevant suites after each conversion. | High | ♻️ Repeat per file |
| Update downstream imports | Ensure all callers reference the new `.mjs` module. | High | ♻️ Repeat per file |
| Record completion | Mark the tracker entry with the date/commit. | Medium | ♻️ Repeat per file |

## E2E Testing Infrastructure (Completed 2025-11-11)

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| Visual regression testing | Add 21 screenshot-based checks for key flows. | High | ✅ Complete |
| Performance & load testing | Run Web Vitals-driven load tests (15+ scenarios). | High | ✅ Complete |
| Enhanced voting flow tests | Expand from 8 to 30+ tests covering edge cases. | High | ✅ Complete |
| Test sharding setup | Document and enable sharded execution in CI. | Medium | ✅ Complete |
| Update E2E README | Capture coverage, setup, and troubleshooting steps. | Medium | ✅ Complete |
| Optimize Playwright config | Tune settings specifically for visual regression. | Medium | ✅ Complete |
| Enable multi-browser coverage | Validate Chromium, Firefox, and WebKit runs. | High | ✅ Complete |
| Responsive design testing | Validate mobile, tablet, and desktop breakpoints. | Medium | ✅ Complete |
| Integrate dark mode coverage | Exercise light and dark themes within suites. | Medium | ✅ Complete |
| Record CHANGELOG updates | Note the infra enhancements in `CHANGELOG.md`. | Low | ✅ Complete |

**Final E2E Test Suite:**

- Total tests: 126+ (from 68, +85% increase)
- Browser coverage: 3 browsers
- Viewport coverage: 3 responsive breakpoints
- Theme coverage: Light and dark modes
- CI/CD optimization: 7-10 min → 1-2 min with sharding

## API Security Improvements (Completed 2025-11-11)

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| Tighten auth rate limits | Enforce 5 attempts / 15 minutes on auth endpoints. | High | ✅ Complete |
| Harden JWT secret validation | Fail fast when secrets are missing or invalid. | High | ✅ Complete |
| Verify password hashing | Confirm `/users` route uses bcrypt with 10 rounds. | Medium | ✅ Complete |
| Fix GitHub Actions JWT context | Resolve workflow warnings tied to JWT secrets. | Medium | ✅ Complete |
| Remove inline secret fallbacks | Clean insecure environment defaults in `e2e.yml`. | High | ✅ Complete |
| Replace console logging | Move bills/votes logging to structured logger. | Medium | ✅ Complete |

## Documentation and Standards (Completed 2025-11-11)

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| Establish coding standards | Create project-wide standards tuned for requirements. | Medium | ✅ Complete |
| Integrate guardrails | Bake in security, accessibility, testing, neutrality principles. | High | ✅ Complete |
| Update CHANGELOG for standards | Note standards addition in release notes. | Low | ✅ Complete |
| Update CHANGELOG for E2E | Capture E2E enhancement details. | Low | ✅ Complete |
| Update CHANGELOG for security | Document related improvements. | Low | ✅ Complete |

## Security Vulnerabilities Fix (apps/api) - In Progress

### Remaining Tasks

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| Update `users.test.mjs` | Add login flows plus auth token handling. | High | 🚧 In Progress |
| Update `bills.test.mjs` | Ensure tests request and attach auth tokens. | High | ⏳ Pending |
| Update `votes.test.mjs` | Cover auth tokens plus voting edge cases. | High | ⏳ Pending |
| Audit validation schemas | Review inputs for users, bills, votes, parties, moderation. | Critical | ⏳ Pending |
| Confirm auth bypass gating | Make sure bypass only exists under `NODE_ENV=test`. | High | ⏳ Pending |
| Add validation tests | Introduce malicious input coverage and regression tests. | Critical | ⏳ Pending |

### High Issues (1 remaining)

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| Comprehensive input validation | Ensure every route sanitizes and validates payloads. | Critical | 🚧 In Progress |

### Followup Steps

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| Run full test suite | Expect ~289 tests; verify auth failures resolved. | High | ⏳ Pending |
| Run linting | Fix the remaining 801 errors / 1518 warnings. | Medium | ⏳ Pending |
| Run type-checking | Resolve ~123 TS errors across 25 files. | Medium | ⏳ Pending |
| Re-run security audit | Confirm no regressions after fixes. | High | ⏳ Pending |
| Update CHANGELOG for security fixes | Document improvements once merged. | Medium | ⏳ Pending |

## Dependency Alignment - Zod (Added 2025-11-11)

### Completed

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| Add `--legacy-peer-deps` in Dockerfiles | Ensure npm CI commands succeed for api/web/worker/game-server. | High | ✅ Complete |
| Pin Zod to v3 workspace-wide | Set `zod` to `^3.25.6` in root and tooling packages. | Medium | ✅ Complete |
| Enforce overrides | Use npm `overrides` to keep all packages on the same Zod version. | Medium | ✅ Complete |
| Validate with targeted tests | Run `vitest --changed` to confirm the alignment. | Medium | ✅ Complete |

### Next Steps

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| Track Zod v4 support | Follow `@langchain/*` and `zod-to-json-schema` readiness. | Medium | ⏳ Pending |
| Plan upgrade path | Draft ADR plus testing approach for returning to Zod v4. | Medium | ⏳ Pending |
| Re-run Docker builds | Watch the `Docker Build and Publish` workflow for regressions. | Low | ⏳ Pending |

### Notes

| Task | Concise Description | Urgency | Status |
| --- | --- | --- | --- |
| Auth tests failing due to 401 | Tests lack tokens for users/parties/bills/votes routes. | High | 🚧 In Progress |
| Users ownership checks | Additional auth required for new ownership logic. | Medium | ⏳ Pending |
| Missing `parties.test.mjs` | No test file exists; consider creating coverage. | Medium | ⏳ Pending |
| Non-core linting noise | Tools/scripts/docs still contain lint issues. | Low | ⏳ Pending |
| Type-checking gaps | TS errors: missing extensions, undefined JWT secrets, store mismatches. | Medium | ⏳ Pending |
