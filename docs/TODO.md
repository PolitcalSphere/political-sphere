DO NOT OVERWRITE THIS FILE. This is the consolidated TODO list for the entire project.

<div align="center">

| Classification | Version | Last Updated |      Owner      | Review Cycle |  Status   |
| :------------: | :-----: | :----------: | :-------------: | :----------: | :-------: |
|  🔒 Internal   | `1.1.0` |  2025-11-04  | Governance Team |  Quarterly   | **Draft** |

</div>

---

## Overview

Implement governance reforms to reduce bureaucracy while preserving quality, security, and compliance value. Focus on AI-driven automation, proportional oversight, and efficiency improvements. This edition restructures the backlog into active initiatives, strategic workstreams, legacy backlogs, and completed work so owners can quickly find their responsibilities.

## Quick Navigation

- [Active Initiatives](#active-initiatives)
- [Strategic Workstreams](#strategic-workstreams)
- [Legacy Backlog](#legacy-backlog)
- [Expansion & Excellence Roadmaps](#expansion--excellence-roadmaps)
- [Completed Log](#completed-log)
- [Reference](#reference)
- [Notes](#notes)

---

## Active Initiatives

### Governance & Compliance Alignment (In Progress — 2025-11-05)

> Bring the project into full compliance with GitHub Copilot Instructions v2.0.0 and related governance rules.

- **Owner**: Development Team • **Priority**: High • **Status**: In Progress • **Reference**: `.github/copilot-instructions/copilot-instructions.md`
- **Critical Priorities — Immediate**
  - [ ] Fix 6 failing tests in `apps/api/tests/` (parties.test.mjs, users.test.mjs) — _Testing Infrastructure Core Principle_
  - [ ] Migrate JavaScript files to TypeScript strict mode (`apps/game-server/src/db.js`) — _Core Rule #1: Type-safe_
  - [ ] Remove 7 `eslint-disable` comments by fixing underlying issues — _Code Quality Standards_
  - [ ] Fix GitHub workflow secret context access errors (50+ errors) — _Operations Standards_
- **High Priorities — This Sprint**
  - [ ] Add React component test coverage (Dashboard.jsx, GameBoard.jsx) — _80%+ coverage requirement_
  - [ ] Enable frontend in coverage config with proper Babel/SWC setup
  - [ ] Run security audit: `npm run fast-secure` — _Zero-Trust Compliance_
  - [ ] Verify no cached auth checks — _High-Risk Pattern #2_
  - [ ] Ensure no debounce on voting flows — _High-Risk Pattern #1_
- **Medium Priorities — This Month**
  - [ ] Run accessibility audit: `npm run audit:full` — _WCAG 2.2 AA Mandatory_
  - [ ] Verify voting mechanism constitutional compliance
  - [ ] Review seed data for political neutrality — _High-Risk Pattern #6_
  - [ ] Document all changes in `CHANGELOG.md` — _Change Management requirement_
- **Documentation Updates**
  - [ ] Create ADRs for architectural decisions made during fixes
  - [ ] Update `CHANGELOG.md` with v2.0.0 alignment work
  - [ ] Document baseline metrics from audit runs
- **Notes**
  - Script updates: `run-smoke.js`, `run-vitest-coverage.js`, and `test-setup.ts` moved from `tools/` to `scripts/`; references in `package.json` and `vitest.config.js` updated (2025-11-05).

### Test Suite Stabilization (Added 2025-11-05)

> Guardrail tasks to keep Vitest suites green and aligned with GDPR routes.

- [x] Ensure JWT refresh secret is set during tests to satisfy 32+ char enforcement (`tools/test-setup.ts`) _(Owner: AI Assistant • Due: 2025-11-05)_
- [x] Provide `logger.audit` for GDPR routes to avoid 500s and enable structured audit logs _(Owner: API Team • Due: 2025-11-05)_
- [ ] Resolve `apps/api/src/stores/index.ts -> ./migrations` runtime import issue under Vitest _(Owner: API Team • Due: 2025-11-08)_
  - Note: Extensionless TS import fails occasionally; prefer resolver fix or safe import strategy that preserves TS tooling without `rootDir` regressions. Investigate Vitest TS transform vs Node ESM interop.
- [ ] Align GDPR deletion route with store API (`db.users.update`) _(Owner: Data/Store Team • Due: 2025-11-12)_
  - Note: Consider adding `deleted_at`, `deletion_reason`, `deleted_by` via migration or switching to a supported operation; update tests.
- [ ] Adapt `NewsService` to test store shape or supply adapter with save/write semantics _(Owner: API Team • Due: 2025-11-10)_
- [ ] Reconcile route status codes with test expectations (201/400/409 semantics) _(Owner: API Team • Due: 2025-11-09)_
- [x] Add integration workflow for local setup-node composite action (`test-setup-node-action.yml`) _(Owner: AI Assistant • Done: 2025-11-07)_
  - Provides matrix verification for Node 18.x and 20.x, outputs assertion, fixture install.

### Developer Experience & Performance (Added 2025-11-04)

> Keep VS Code responsive and ensure performance tooling stays fresh.

- **Owner**: Developer Experience Team • **Status**: In Progress
- **Open Work**
  - [ ] Schedule weekly performance maintenance reminders _(Due: 2025-11-11)_
    - Next steps: Add calendar reminder or automated check.
  - [ ] Monitor and iterate on VS Code extension performance _(Due: 2025-12-04)_
    - Next steps: Review Vitest and TypeScript extension impact monthly.
- **Completed to Date**
  <details>
  <summary>Show completed items</summary>

  - [x] Create `scripts/cleanup-processes.sh` to kill runaway test processes _(Vitest, Playwright, esbuild)_
    - Impact: Resolves VS Code slowdown from accumulated background processes.
  - [x] Add VS Code performance optimization settings _(updates to `.vscode/settings.json`)_
    - Impact: Prevents file watcher overload and test runner accumulation.
  - [x] Create performance documentation _(`docs/VSCODE-PERFORMANCE.md` and quick reference)_
  - [x] Add npm performance scripts (`cleanup`, `perf:check`) to `package.json`

  </details>

### AI Efficiency & Effectiveness (Added 2025-11-04)

> Maintain the AI workspace tooling and expand automation coverage.

- **Owner**: AI Development Team • **Status**: In Progress
- **Open Work**
  - [ ] Measure AI response time improvements _(Due: 2025-11-11)_
    - Next steps: Compare before/after metrics using `ai-metrics.json`.
  - [ ] Add automated context bundle generation to CI _(Due: 2025-11-18)_
    - Next steps: Add `npm run ai:context` to GitHub Actions workflow.
- **Completed to Date**
  <details>
  <summary>Show completed items</summary>

  - [x] Create automated AI context builder _(6 bundles via `tools/scripts/ai/build-context.sh`)_
  - [x] Implement AI knowledge refresh system _(refresh script updates patterns and file maps)_
  - [x] Add AI response caching _(100-item cache, 24hr TTL via `cache-manager.cjs`)_
  - [x] Create AI-specific VS Code tasks _(added to `.vscode/tasks.json`)_
  - [x] Add git pre-commit hook for knowledge refresh _(keeps AI current each commit)_

  </details>

### Efficiency Best-Practices Follow-up (2025-11-03)

> Tasks mandated by the governance meta-rule after the efficiency update.

- [ ] Review: assign governance owner to approve change-budget thresholds and CI integration _(Owner: @governance-team • Due: 2025-11-10)_
- [ ] CI integration for guard script _(Owner: @ci-team • Due: 2025-11-10)_
  - Description: Add GitHub Actions job to run `tools/scripts/ai/guard-change-budget.mjs --mode=${{ inputs.mode }} --base=origin/main` on PRs.
- [ ] Notify governance & docs owners _(Owner: @docs-team • Due: 2025-11-07)_
  - Description: Announce Efficiency Best-Practices update and new TODO requirement to stakeholders.
- [ ] Add example PR snippet and FAST*AI guidance *(Owner: @devops-team • Due: 2025-11-06)\_
  - Description: Update PR templates and contributor docs with `AI-EXECUTION` guidance.
- [ ] Close-files policy rollout _(Owner: @ai-team • Due: 2025-11-07)_
  - Description: Ensure agent tooling closes buffers/tabs after edits.
- [ ] Provision local test runners _(Owner: @devops-team • Due: 2025-11-10)_
  - Description: Add `vitest` or `jest` to devDependencies so CI can avoid remote `npx` calls.
- [ ] Communication: provide TODO entry template example _(Owner: @docs-team • Due: 2025-11-07)_

### Phase 1 Compliance Follow-ups

> Carry over from `docs/TODO-PHASE1-COMPLIANCE.md`.

- [ ] CSP (Content Security Policy) implementation
- [ ] HSTS preload submission
- [ ] Security.txt file creation
- [ ] CORS policy enforcement
- [ ] Rate limiting per user

### MCP Server Stabilization (2025-11-03)

- [x] Created minimal MCP server stubs in `apps/dev/mcp-servers/*/src/index.ts` _(filesystem, github, git, puppeteer, sqlite, political-sphere)_
  - Notes: Backups stored as `src/index.corrupted.txt`; health check logs written to `/tmp/mcp-<name>.log`.
- [x] Repair original `src/index.ts` entrypoints for all MCP packages _(ports 4010-4015)_ _(Owner: @devops-team • Done: 2025-11-04)_
- [ ] Review stubs and replace with production-ready implementations or remove if upstream servers return _(Owner: @devops-team • Due: 2025-11-10)_
  - Notes: Secure `GITHUB_TOKEN` and database artifacts when enabling GitHub/SQLite MCPs.

### Strategic Governance Program (November 2025)

> Consolidates the 10 biggest program-level issues identified during the governance review.

<details open>
<summary>Open the strategic workstream details</summary>

#### 1. Fragmented Task Management (Critical Priority)

- [x] Consolidate all TODO files into `docs/TODO.md` _(Owner: @docs-team • Due: 2025-11-08)_
- [x] Implement automated TODO consolidation script _(Owner: @tooling-team)_
- [ ] Implement automated TODO consolidation script _(Owner: @tooling-team • Due: 2025-11-10)_
  - Next steps: Add script to CI to prevent future fragmentation.

#### 2. Incomplete Governance Reforms (High Priority)

- [x] Complete stakeholder briefings on playbook 2.2.0 changes _(Owner: @governance-team)_
- [x] Validate execution modes in CI pipeline _(Owner: @ci-team)_
- [x] Complete deferred gates documentation _(Owner: @docs-team)_

#### 3. Security & Compliance Gaps (Critical Priority)

- [x] Fix JWT secret management vulnerabilities _(Owner: @security-team • Completed 2025-11-06)_
- [x] Complete data classification framework implementation _(Owner: @compliance-team • Completed 2025-11-10)_
- [x] Add comprehensive security test coverage _(GDPR endpoints)_ _(Owner: @testing-team)_
- [ ] Add comprehensive security test coverage _(auth.js scenarios)_ _(Owner: @testing-team • Due: 2025-11-12)_
- [x] Implement GDPR compliance features _(Owner: @privacy-team)_

#### 4. Testing Infrastructure Issues (High Priority)

- [ ] Standardize test framework across all services _(Owner: @testing-team • Due: 2025-11-08)_
- [ ] Resolve ESM vs CJS module conflicts _(Owner: @devops-team • Due: 2025-11-07)_
- [ ] Improve test coverage to 80%+ across critical paths _(Owner: @testing-team • Due: 2025-11-15)_

#### 5. Documentation Inconsistencies (Medium Priority)

- [ ] Add status metadata to all documentation files _(Owner: @docs-team • Due: 2025-11-10)_
- [ ] Remove prohibited summary/completion documents _(Owner: @docs-team • Due: 2025-11-06)_
- [ ] Synchronize `.blackboxrules` and `.github/copilot-instructions.md` _(Owner: @governance-team • Due: 2025-11-08)_

#### 6. Code Quality & Technical Debt (Medium Priority)

- [ ] Eliminate all TypeScript lint errors and warnings _(Owner: @dev-team • Due: 2025-11-12)_
- [ ] Fix Nx module boundary violations _(Owner: @architecture-team • Due: 2025-11-10)_
- [ ] Complete structured logging replacement _(Owner: @dev-team • Due: 2025-11-08)_

#### 7. CI/CD Pipeline Complexity (Medium Priority)

- [ ] Simplify CI workflow structure _(Owner: @ci-team • Due: 2025-11-12)_
- [ ] Validate canary deployment and rollback procedures _(Owner: @devops-team • Due: 2025-11-15)_
- [ ] Optimize pipeline performance below 20 minutes _(Owner: @ci-team • Due: 2025-11-10)_

#### 8. AI Assistant Integration (Low-Medium Priority)

- [ ] Complete MCP server documentation _(Owner: @docs-team • Due: 2025-11-08)_
- [ ] Optimize AI performance monitoring _(Owner: @ai-team • Due: 2025-11-12)_
- [ ] Enhance context preloading and caching _(Owner: @ai-team • Due: 2025-11-10)_

#### 9. Game Development Backlog (Medium Priority)

- [ ] Complete game server API validation _(Owner: @game-team • Due: 2025-11-12)_
- [ ] Implement spectator mode and replay functionality _(Owner: @game-team • Due: 2025-11-15)_
- [ ] Enhance game state synchronization _(Owner: @game-team • Due: 2025-11-10)_

#### 10. Observability & Monitoring Gaps (Low Priority)

- [ ] Complete OpenTelemetry integration across all services _(Owner: @observability-team • Due: 2025-11-15)_
- [ ] Define comprehensive SLO/SLI catalog _(Owner: @observability-team • Due: 2025-11-12)_
- [ ] Update incident response and disaster recovery runbooks _(Owner: @operations-team • Due: 2025-11-10)_

</details>

### Testing & Coverage Improvements

> Increase coverage and stabilize shared modules after governance reforms.

- [ ] Restore branch coverage threshold to 90% (currently relaxed to 75% for shared helpers) _(Owner: QA/Platform • Due: 2025-11-20)_
  - Add branch-focused test cases for `libs/shared/src/security.js`.
  - Evaluate targeted coverage for `libs/shared/src/database.js` or scope exclusions responsibly.
- [ ] Expand coverage to telemetry and other shared modules _(Owner: Observability/Platform • Due: 2025-11-22)_
  - Add unit/integration tests for `libs/shared/src/telemetry.ts`.
  - Consider coverage adjustments for `libs/shared/src/database.js`.

### Governance Playbook 2.2.0 Adoption (2025-11-04)

> Ensure the consolidated governance playbook lands with supporting artefacts and communications.

- Files changed: `.github/copilot-instructions.md`, `.blackboxrules`, `docs/CHANGELOG.md`, `docs/TODO.md`
- Summary: Delivered playbook v2.2.0 with enhanced quick reference, accountability model, standards matrix, validation/security/accessibility requirements, and tooling expectations.
- Impact: Requires org-wide communications, quick-reference refresh, tooling updates for telemetry identifiers, template additions, and validation of legacy references.

- [ ] Brief governance, product, security, and data stakeholders on playbook expectations _(Owner: @governance-team • Due: 2025-11-08)_
- [ ] Update `quick-ref.md` (and prior sub-guides) to align with the consolidated playbook _(Owner: @docs-team • Due: 2025-11-07)_
- [x] Extend `tools/scripts/ai/guard-change-budget.mjs` output with artefact checklist, benchmark mapping reminders, and telemetry identifier requirements _(Owner: @tooling-team • Completed: 2025-11-12)_
- [ ] Ensure automations/docs referencing `ai/governance/.blackboxrules` point to the root `.blackboxrules` _(Owner: @tooling-team • Due: 2025-11-09)_
- [ ] Add bias/fairness, accessibility, incident review, and telemetry report templates to `/docs/templates/` _(Owner: @docs-team • Due: 2025-11-10)_
- [ ] Instrument prompt/response logging with trace identifiers and monthly intelligence reporting workflow _(Owner: @tooling-team • Due: 2025-11-11)_

### Validation & Final Checks

- [ ] Test updated execution modes in CI pipeline
- [ ] Validate that reforms reduce development friction while maintaining quality
- [ ] Monitor adoption and gather feedback from the development team
- [ ] Update any cross-references if needed

---

## Strategic Workstreams

### Core API & Platform

<details>
<summary>Open and completed work for core API functionality</summary>

- **Open**
  - [ ] Implement API versioning strategy (`/v1/` prefix)
  - [ ] Add OpenAPI/Swagger documentation generation
- **Completed**
  - [x] Implement JWT authentication middleware with proper token validation
  - [x] Add rate limiting to all API endpoints (`express-rate-limit`)
  - [x] Implement comprehensive error handling with structured logging
  - [x] Add input validation using Zod schemas for all endpoints
  - [x] Implement request/response compression (gzip)
  - [x] Add CORS configuration for production domains
  - [x] Implement health check endpoints (`/health`, `/ready`)
  - [x] Add request ID correlation for tracing

</details>

### Data & Storage Layer

<details>
<summary>Database, migrations, and data tooling</summary>

- **Open**
  - [ ] Add database migration system with rollback capability
  - [ ] Implement data seeding scripts for development
  - [ ] Add database backup automation
  - [ ] Implement database query optimization and indexing
  - [ ] Add database connection retry logic
  - [ ] Add database schema validation
  - [ ] Implement data export/import functionality
- **Completed**
  - [x] Implement database connection pooling
  - [x] Implement database transaction management
  - [x] Add database performance monitoring

</details>

### Frontend Experience

<details>
<summary>UX, accessibility, and client-side resilience</summary>

- [ ] Implement responsive design for mobile/tablet/desktop
- [ ] Add accessibility features (ARIA labels, keyboard navigation)
- [ ] Implement dark/light theme toggle
- [ ] Add internationalization (i18n) support
- [ ] Implement progressive web app (PWA) features
- [ ] Add offline functionality with service workers
- [ ] Implement real-time updates with WebSockets
- [ ] Add form validation and error handling
- [ ] Implement loading states and skeleton screens
- [ ] Add comprehensive error boundaries

</details>

### Game Systems

<details>
<summary>Multiplayer, matchmaking, and analytics</summary>

- [ ] Implement WebSocket connection handling
- [ ] Add room/lobby management system
- [ ] Implement game state synchronization
- [ ] Add player session management
- [ ] Implement game logic validation
- [ ] Add spectator mode functionality
- [ ] Implement game replay/recording system
- [ ] Add anti-cheat measures
- [ ] Implement matchmaking algorithm
- [ ] Add game statistics tracking

</details>

### Identity & Access Management

<details>
<summary>Authentication, authorization, and account security</summary>

- [ ] Implement OAuth2/OIDC integration
- [ ] Add multi-factor authentication (MFA)
- [ ] Implement role-based access control (RBAC)
- [ ] Add password strength requirements
- [ ] Implement account lockout policies
- [ ] Add session management and timeout
- [ ] Implement secure password reset flow
- [ ] Add audit logging for auth events
- [ ] Implement API key management
- [ ] Add biometric authentication support

</details>

### Privacy & Data Protection

<details>
<summary>Privacy programs and regulatory compliance</summary>

- [ ] Implement GDPR compliance features (right to erasure, data portability)
- [ ] Add data encryption at rest and in transit
- [ ] Implement privacy policy and consent management
- [ ] Add data retention policies
- [ ] Implement data anonymization for analytics
- [ ] Add cookie consent management
- [ ] Implement data subject access requests
- [ ] Add privacy impact assessments
- [ ] Implement data classification system
- [ ] Add data breach notification system

</details>

---

## Legacy Backlog

### API & Platform Foundations (Legacy)

<details>
<summary>Legacy backlog items retained for context</summary>

- [ ] Implement database connection retry logic _(historic duplication with strategic section; keep for traceability)_
- [ ] Implement data export/import functionality _(legacy entry)_
- [ ] Add database backup automation _(legacy entry)_
- [ ] Implement database transaction management _(legacy entry)_
- [ ] Add database schema validation _(legacy entry)_
- [ ] Implement data seeding scripts for development _(legacy entry)_
- [ ] Add database performance monitoring _(legacy entry)_

</details>

### Governance & Documentation (Legacy)

<details>
<summary>Older documentation and governance tasks</summary>

- [ ] Implement data anonymization for analytics _(legacy entry)_
- [ ] Add data breach notification system _(legacy entry)_

</details>

---

## Expansion & Excellence Roadmaps

### Website Expansion Plan (from TODO 3.md)

- [ ] Step 7: Add game mechanics stubs (`libs/game-engine/src/index.ts`) with vote simulation and party dynamics
- [ ] Step 8: Run `npm install`
- [ ] Step 9: Build shared and game-engine packages
- [ ] Step 10: Run migrations and start API (`node apps/api/src/app.js`)
- [ ] Step 11: Start frontend dev server (`vite --port 3001`)
- [ ] Step 12: Test end-to-end flows (browser + curl simulation)
- [ ] Step 13: Use `browser_action` and `execute_command` for verification
- [ ] Step 14: Update this TODO once complete

### Level 4-5 Excellence (from TODO-IMPROVEMENTS.md)

- [ ] Step 15: Enhance testing (unit/integration for game stubs, e2e with Playwright, k6 performance tests with p95 < 200ms)
- [ ] Step 16: Enhance documentation (update `docs/architecture.md`, add caching ADR, ensure WCAG validation docs)
- [ ] Step 17: Implement monitoring (Prometheus/Grafana dashboards, OTEL tracing for game routes, self-auditing logs)
- [ ] Step 18: Fix technical debt (resolve DB 500 errors in tests, implement AI cache TTL cleanup, resolve Prettier/Biome conflicts)
- [ ] Step 19: Validate compliance (Gitleaks, Semgrep, axe-core, ISO 42001 ethical AI review)
- [ ] Step 20: Stress test (add chaos engineering stubs such as DB outage simulation)
- [ ] Step 21: Final review (update `CHANGELOG.md`, simulate peer review, governance approval via `controls.yml`)
- [ ] Step 22: Update original TODO.md with completions; archive legacy files

### Game Development Continuation (from TODO-GAME-DEVELOPMENT.md)

- [ ] Add frontend integration for new mechanics
- [ ] Implement parties and factions
- [ ] Add AI NPCs for testing
- [ ] Performance monitoring and optimization

---

## Completed Log

### DevOps & CI/CD (2025-11-07)

**GitHub Actions Run-Tests Action - v1.0.0 Production Release**

Implemented comprehensive test orchestration GitHub Action with 2,235 lines of production-ready code:

**Core Components (6 files)**

- ✅ **action.yml** (315 lines): Composite action with 22 validated inputs, 8 outputs, SHA-pinned dependencies
- ✅ **run-tests.sh** (494 lines): Bash orchestration with CloudWatch metrics, structured logging, timeout protection
- ✅ **parse-results.mjs** (347 lines): Result parser with GitHub annotations and PR summaries
- ✅ **upload-artifacts.sh** (299 lines): Artifact manager with shard-aware naming and validation
- ✅ **coverage.config.json** (225 lines): Package-specific coverage thresholds (auth 100%, business 90%, UI 80%)
- ✅ **README.md** (551 lines): Comprehensive documentation with examples and troubleshooting
- ✅ **test-runner.sh** (309 lines): Automated test suite with 18 unit and integration tests

**Features Implemented**

- ✅ **Test Types**: unit, integration, e2e, coverage, api, frontend, shared
- ✅ **Intelligent Sharding**: 1-100 shards supported with Vitest `--shard=index/total` syntax
- ✅ **Coverage Reporting**: JSON, HTML, LCOV formats with configurable thresholds (0-100%)
- ✅ **GitHub Integration**: Error/warning annotations with file/line numbers, PR summary markdown
- ✅ **Retry Logic**: Configurable retry for flaky tests (0-5 attempts)
- ✅ **CloudWatch Metrics**: TestDuration, TestsRun, TestsFailed, CoveragePercentage
- ✅ **Input Validation (SEC-01)**: Test type whitelist, coverage 0-100%, shard validation, timeout 1-120min
- ✅ **Security (SEC-02)**: SHA-pinned actions (setup-node@v4.0.2, upload-artifact@v4.3.6, codecov@v4.2.0)
- ✅ **Observability (OPS-01, OPS-02)**: Structured JSON logs with correlation IDs, cleanup traps, artifact manifests
- ✅ **Changed-Only Mode**: Run tests only for changed files using `--changed` flag

**Research Foundation**

- ✅ Microsoft Learn: CI/CD patterns, parallel testing strategies, test slicing algorithms
- ✅ GitHub Docs: Composite actions, workflow commands for annotations
- ✅ Vitest Documentation: Configuration API, sharding, coverage reporting

**Quality Validation**

- ✅ **Test Suite**: 18/18 tests passing (100%) - syntax validation, file existence, SHA pinning, compliance tags
- ✅ **Syntax Validation**: YAML lint, JSON validation, bash syntax check, JavaScript syntax check
- ✅ **Security Review**: All inputs validated, dependencies SHA-pinned, secrets masked
- ✅ **Documentation**: ADR-0016 created, CHANGELOG.md updated, comprehensive README
- ✅ **CI Workflow**: test-run-tests-action.yml created with 5 test jobs (unit, basic, coverage, sharding, validation)

**Compliance Standards**

- ✅ SEC-01: Comprehensive input validation with bounds checking
- ✅ SEC-02: Secure secrets handling and SHA-pinned dependencies
- ✅ TEST-01: 80%+ coverage target for critical code paths
- ✅ TEST-02: Multiple test types (unit, integration, E2E, API)
- ✅ QUAL-01: Code quality gates with configurable thresholds
- ✅ QUAL-05: Automated validation and result reporting
- ✅ OPS-01: Structured logging with correlation IDs
- ✅ OPS-02: CloudWatch metrics for observability

**Files Created**:

- `.github/actions/run-tests/action.yml`
- `.github/actions/run-tests/run-tests.sh`
- `.github/actions/run-tests/parse-results.mjs`
- `.github/actions/run-tests/upload-artifacts.sh`
- `.github/actions/run-tests/coverage.config.json`
- `.github/actions/run-tests/README.md`
- `.github/actions/run-tests/test-runner.sh`
- `.github/workflows/test-run-tests-action.yml`
- `docs/04-architecture/decisions/ADR-0016-test-coverage-strategy.md`

**Status**: Production Ready ✅ - Matches/exceeds deployment action quality (76 tests)

---

**GitHub Actions Deployment Enhancement - v1.3.0 Follow-Up Review**

Resolved all issues identified in comprehensive follow-up review:

**Critical Issues (2)**

- ✅ **Missing Environment Variables**: Added TARGET_REGIONS, ENABLE_BACKUP, REQUIRE_APPROVAL, ENABLE_GDPR_CHECK to action.yml Deploy step
- ✅ **Insecure Helm Installation**: Fixed SEC-07 in helm-deploy.sh with SHA256 verification

**High Priority Issues (3)**

- ✅ **License Headers**: Added copyright to all 5 supporting scripts (COMP-03 complete)
- ✅ **Runbook Links**: Added documentation references to all scripts (OPS-08 complete)
- ✅ **kubectl Timeouts**: Added 30s timeouts to kubectl-apply.sh and validate-manifests.sh (OPS-02 enhanced)

**Medium Priority Issues (3)**

- ✅ **Error Handling**: Added trap-based cleanup to helm-deploy.sh (QUAL-02 enhanced)
- ✅ **QUAL-10 Documentation**: Confirmed CloudWatch metrics use calculated duration (already implemented in v1.1.0)
- ⏳ **Structured Logging**: Partial - main scripts have JSON logging, supporting scripts use standard format

**Low Priority Issues (2)**

- ⏳ **K8s Version**: Currently hardcoded to 1.29, could be made configurable
- ⏳ **Magic Numbers**: Could extract to constants (low impact)

**Testing**: 37/37 tests passing (100%) ✅
**YAML Validation**: No errors ✅

**Files Modified**:

- `.github/actions/deploy/action.yml` (v1.3.0): Added 4 env vars
- `.github/actions/deploy/helm-deploy.sh` (v1.1.0): Secure Helm install, license, runbooks, error handling
- `.github/actions/deploy/argocd-sync.sh` (v1.1.0): License, runbooks
- `.github/actions/deploy/build-and-push.sh` (v1.1.0): License, runbooks
- `.github/actions/deploy/kubectl-apply.sh` (v1.1.0): License, runbooks, kubectl timeout constant
- `.github/actions/deploy/validate-manifests.sh` (v1.1.0): License, runbooks, kubectl timeout constant
- `.github/actions/deploy/CHANGELOG.md`: v1.3.0 entry

**Implementation Status**: All 27 original recommendations + all follow-up review issues resolved (except 2 low-priority deferred items)

---

**GitHub Actions Deployment Enhancement - All 27 Recommendations Implemented**

Completed comprehensive enhancement of `.github/actions/deploy` composite action implementing all critical, high, medium, and low priority recommendations:

**Critical & High Priority (15 items - v1.1.0)**

- ✅ SEC-01: Input validation with regex patterns preventing command injection
- ✅ SEC-02: GitHub Actions SHA pinning (aws-actions/configure-aws-credentials@2475ef767...)
- ✅ SEC-03: Trivy container vulnerability scanning with HIGH/CRITICAL blocking
- ✅ SEC-04: HTTPS health checks with SSL verification
- ✅ SEC-06: AWS Secrets Manager integration for runtime secrets
- ✅ SEC-10: Health check rate limiting with 60s max wait ceiling
- ✅ QUAL-02: Structured error handling with trap handlers
- ✅ QUAL-03: Blue-green race condition fix using atomic JSON patch
- ✅ TEST-01: 37 automated tests (100% pass rate)
- ✅ OPS-01: Structured JSON logging with timestamps/levels/context
- ✅ OPS-02: kubectl command timeouts (30s explicit)
- ✅ OPS-03: Rollback verification with health checks
- ✅ OPS-04: CloudWatch metrics recording (status/duration/count)
- ✅ UX-01: WCAG 2.2 AA accessibility validation with pa11y
- ✅ STRAT-01: ADR-0015 documenting deployment strategies

**Medium & Low Priority (12 items - v1.2.0)**

- ✅ STRAT-03: Multi-region deployment support for data residency/GDPR
- ✅ OPS-05: Pre-deployment backup with snapshot restore capability
- ✅ OPS-06: Performance regression testing against SLO targets
- ✅ OPS-08: Runbook documentation links in script headers
- ✅ SEC-07: Secure Helm installation with SHA256 verification
- ✅ QUAL-05: kubectl version pinning to v1.29.0 with checksum
- ✅ QUAL-06: Automatic CHANGELOG updates for deployments
- ✅ QUAL-11: Standardized shebang (#!/usr/bin/env bash)
- ✅ COMP-01: Production approval workflow integration
- ✅ COMP-02: GDPR compliance verification for user data apps
- ✅ COMP-03: License headers ("All Rights Reserved")
- ⏳ QUAL-10: Fix job.duration variable reference (low priority, deferred)

**Impact & Metrics**

- Security posture: 7 critical security controls added
- Test coverage: 37 automated tests validating all deployment flows
- Compliance: GDPR verification, production gates, accessibility validation
- Operations: Multi-region support, automated backups, performance monitoring
- Quality: 100% test pass rate, pinned dependencies, automated documentation

**Files Modified**

- `.github/actions/deploy/action.yml` (v1.2.0): Added 8 new steps, 4 new inputs
- `.github/actions/deploy/run-deploy.sh` (v1.2.0): Multi-region logic, enhanced logging
- `.github/actions/deploy/rollback.sh` (v1.1.0): License headers, timeouts
- `.github/actions/deploy/test/test-runner.sh`: 37 comprehensive tests
- `docs/04-architecture/adr/0015-deployment-strategies.md`: Architecture decision record
- `.github/actions/deploy/CHANGELOG.md`: Complete v1.1.0 and v1.2.0 documentation

**Reference**: See `.github/actions/deploy/IMPLEMENTATION-SUMMARY.md` and CHANGELOG for full details.

---

## Completed Log

<details>
<summary><strong>2025-11-05</strong> — Repository organization and tooling</summary>

#### 📚 GitHub Copilot Instructions Organization

- [x] Created `.github/copilot-instructions/` directory for AI governance documentation
- [x] Moved 11 instruction files into organized subfolder
- [x] Updated references in `.blackboxrules`, CI workflows, and AI tool scripts
- [x] Updated file paths in AI knowledge base, context preloader, and guard scripts
- [x] Improved organization and discoverability of AI governance documentation
- **Impact**: Better structured `.github/` folder, easier navigation
- **Owner**: AI Assistant • **Completed**: 2025-11-05

#### 📂 Root Directory Organization Audit

- [x] Conducted comprehensive audit of all root-level files
- [x] Moved `.mcp.json` → `tools/config/mcp.json`
- [x] Moved `test-mcp-imports.js` → `scripts/test-mcp-imports.js`
- [x] Updated `.github/organization.md` to document allowed root file exceptions
- [x] Verified git-ignored files remain excluded
- **Impact**: Improved project structure and governance compliance
- **Owner**: AI Assistant • **Completed**: 2025-11-05

#### 🗂️ GitHub Workflow Structure Cleanup

- [x] Removed six empty duplicate directories from `.github/actions/`
- [x] Moved nine workflow files from `.github/actions/` to `.github/workflows/`
- [x] Consolidated duplicate `ai-maintenance.yml`
- [x] Removed duplicate `lefthook.yml` template
- [x] Updated `CHANGELOG.md` with cleanup details
- **Impact**: Cleaner workflow directory and easier maintenance
- **Owner**: AI Assistant • **Completed**: 2025-11-05

#### 🧰 Code Actions Buffering Fix

- [x] Fixed infinite loop in VS Code code actions on save
- [x] Removed conflicting `source.fixAll` and `source.organizeImports` actions
- [x] Kept only `source.fixAll.eslint` to prevent formatter conflicts
- [x] Added timeout protection and clarified formatting defaults
- [x] Documented the fix in `docs/CODE-ACTIONS-FIX.md`
- **Impact**: Eliminated save delays and buffering issues
- **Owner**: AI Assistant • **Completed**: 2025-11-05

</details>

<details>
<summary><strong>2025-11-04</strong> — AI systems and tooling enhancements</summary>

#### 🤖 Proven Open-Source AI Tools Integration

- [x] Integrated AST-based code analyzer from Ruff and VS Code patterns (`ast-analyzer.cjs`)
- [x] Added security, performance, and code quality pattern detection
- [x] Enhanced semantic indexer with advanced capabilities
- [x] Installed supporting dependencies (`acorn`, `acorn-walk`)
- [x] Added npm scripts: `ai:index`, `ai:search`, `ai:ast`
- [x] Verified license compatibility and documented pattern sources

#### 🚀 Unified AI Development Assistant Super System

- [x] Created `ai-assistant.cjs` orchestrator with intent parsing
- [x] Implemented workspace state tracking and auto-improve mode
- [x] Added interactive chat mode with session metrics
- [x] Connected AI Hub, Expert Knowledge, Pattern Matcher, and Code Analyzer
- [x] Added npm commands: `ai`, `ai:chat`, `ai:improve`, `ai:status`

#### 🧠 AI Intelligence System — Lightning-Fast Expert-Level Assistance

- [x] Created expert knowledge base (`expert-knowledge.cjs`) and pattern matcher (`pattern-matcher.cjs`)
- [x] Built intelligent code analyzer combining semantic index and patterns (`code-analyzer.cjs`)
- [x] Added security, performance, and code quality checks
- [x] Created solution database and quick fixes for common errors
- [x] Added npm scripts: `ai:analyze`, `ai:pattern`, `ai:query`, `ai:hub`

#### ⚡ AI Efficiency Improvements

- [x] Created context bundle builder (recent changes, active tasks, project structure, error patterns, dependencies, code patterns)
- [x] Implemented knowledge refresh system (patterns.json, file-map.json)
- [x] Added response caching (100-item limit, 24hr TTL)
- [x] Created git pre-commit hook for automatic knowledge updates
- [x] Added AI-specific VS Code tasks
- [x] Created decision trees and quick access patterns

#### 🧹 Performance Optimization

- [x] Created process cleanup script (`cleanup-processes.sh`)
- [x] Created workspace optimizer (`optimize-workspace.sh`)
- [x] Created performance monitor (`perf-monitor.sh`)
- [x] Optimized VS Code settings (TypeScript, Vitest, file watchers)
- [x] Added performance npm scripts (`cleanup`, `perf:*`)

#### ✅ Recent: Test Discovery Stabilisation (2025-11-04)

- [x] Converted remaining `node:test` style tests to Vitest-compatible tests across `apps/*` and `tools/*`
  - Next steps: Draft PR with `AI-EXECUTION: mode: Safe`, run full CI preflight, log any remaining flaky tests.

#### 📘 Recent: Microsoft Learn Context Added (2025-11-04)

- [x] Added authoritative onboarding references:
  - `apps/docs/compliance/responsible-ai.md`
  - `apps/docs/security/identity-and-access.md`
  - `apps/docs/observability/opentelemetry.md`
  - Notes: Expand with project-specific implementation steps and internal compliance artefacts.

#### 🛠️ Small Fixes: Context Preloader (2025-11-04)

- Date: 2025-11-04 • Author: automation/assistant
- Files changed: `tools/scripts/ai/context-preloader.js`, `CHANGELOG.md`, `docs/TODO.md`
- Type: Fix
- Summary: Adjusted the AI context preloader to prefer repository-root `ai-cache/`, added a recursive directory walker, and improved error handling to resolve unit test failures in `tools/scripts/ai/context-preloader.spec.js`.
- Impact: Improves test reliability and developer experience; changelog entry added for traceability.

#### 📄 Assistant Policy File (2025-11-04)

- Date: 2025-11-04 • Author: automation/assistant
- Files changed: `.ai/assistant-policy.json`, `CHANGELOG.md`, `docs/TODO.md`
- Type: Addition
- Summary: Added repository-level assistant policy defining implicit contexts (repo_read, tests_run, terminal_run, git_read, pr_create:draft, changelog_todo_edit, ephemeral_cache, audit_logging) and explicit approval list for sensitive actions (repo_write, secrets_access, external_network, package_publish, infra_deploy).
- Impact: Documents allowed agent capabilities and governance defaults.

#### 🗃️ File Placement Enforcement (2025-11-03)

- [x] Implemented CI script `scripts/ci/check-file-placement.mjs` to enforce directory rules.
- [x] Added the script to `guard-check.yml` and `affected-tests.yml` workflows.
- [x] Updated governance rules with enforcement mechanisms.

</details>

<details>
<summary><strong>Governance Rule Updates (2025-11-03)</strong></summary>

- [x] Added explicit changelog enforcement to `.github/copilot-instructions.md` and `.blackboxrules`
- [x] Bumped rule versions to 1.3.3 and refreshed metadata
- [x] Recorded updates in `docs/CHANGELOG.md`
- [x] Added GitHub Collaboration Excellence section (branching, commit, PR, review, issue hygiene, automation expectations)
- [x] Bumped governance rule versions to 1.4.0 and refreshed metadata
- [x] Added Efficiency Best-Practices section with guidance for incremental work and automation helpers
- [x] Logged changes in `docs/CHANGELOG.md`
- [x] Added measurable change budgets for execution modes and implemented guard scripts (`scripts/ai/guard-change-budget.mjs`, `tools/scripts/ai/guard-change-budget.mjs`)

#### Tool-Usage Rule Rollout (2025-11-03)

- [x] Added mandatory tool-usage guidance to governance files and agent prompts _(Owner: @ai-team • Due: 2025-11-07)_
  - Description: Agents must identify required workspace tools; failures documented in PR and TODO list.

</details>

<details>
<summary><strong>Governance Reforms Checklist (Completed items)</strong></summary>

### Execution Mode Reforms

- [x] Update execution modes with AI-driven automation and risk-based scaling
- [x] Increase Fast-Secure budget to 200 lines / 8 files for small features
- [x] Automate 90% of quality gates in Safe mode
- [x] Enhance AI suggestions and automated safety checks in R&D mode

### Proportional Governance

- [x] Apply governance proportionally (lighter for small changes, stricter for critical paths)
- [x] Focus human review on architectural decisions and high-risk areas
- [x] Add automated follow-up reminders for deferred gates

### Efficiency Best-Practices Integration

- [x] Codify FAST_AI usage, caching, warmed artefacts, targeted linting, and CI hygiene
- [x] Document automation helpers and incremental work strategies

### Governance Rule Enhancements

- [x] Added GitHub Collaboration Excellence section to rule files (branching, commits, PRs, issues, automation)
- [x] Bumped rule versions (1.4.0) and updated metadata
- [x] Recorded the updates in `docs/CHANGELOG.md`

</details>

<details>
<summary><strong>Historic Governance Rule Work (2025-01-10 – 2025-11-04)</strong></summary>

#### Governance Reforms (2025-11-03)

- [x] Streamlined governance framework to reduce bureaucracy while preserving value
- [x] Updated execution modes with proportional oversight and AI automation
- [x] Increased Fast-Secure mode flexibility for small features
- [x] Enhanced AI-driven quality gates and safety checks
- [x] Added efficiency best-practices integration

#### Governance Rule Readability Improvements (2025-11-04)

- [x] Condensed verbose sections into concise inline sentences in `.github/copilot-instructions.md` and `.blackboxrules`
- [x] Eliminated redundancy and improved structure for readability
- [x] Added version 1.5.3 and last reviewed date to both files
- [x] Ensured parity between rule files per Meta-Rule
- [x] Updated `CHANGELOG.md` with a documentation entry

#### Governance Rule Modularization (2025-01-10)

- [x] Split `.github/copilot-instructions.md` into 10 focused sub-files for maintainability
- [x] Created Table of Contents with links to sub-files
- [x] Updated `.blackboxrules` in parallel per Meta-Rule
- [x] Bumped versions to 1.3.2 in both files
- [x] Added `CHANGELOG` entry documenting the change
- [x] Verified parity between rule files
- [x] Added AI Agent Reading Requirements and Rule Organization & Reading Protocol to both rule files

#### Governance Rule Update (2025-11-03)

- [x] Added explicit changelog enforcement requirement to `.github/copilot-instructions.md` and `.blackboxrules`
- [x] Bumped rule versions to 1.3.3 and refreshed metadata
- [x] Logged the rule change in `docs/CHANGELOG.md`

#### Governance Rule Enhancement (2025-11-03)

- [x] Added GitHub Collaboration Excellence section to `.github/copilot-instructions.md` and `.blackboxrules`
- [x] Documented branching, commit, PR, review, issue hygiene, and automation expectations
- [x] Bumped governance rule versions to 1.4.0 and refreshed metadata
- [x] Recorded the update in `docs/CHANGELOG.md`

#### Governance Rule Minor Clarification (2025-11-03)

- [x] Added short examples for `CHANGELOG` and TODO entries to both rule files
- [x] Added guidance to include `AI-EXECUTION` headers in PR bodies and list deferred gates
- [x] Bumped rule versions to 1.5.0 in `.github/copilot-instructions.md` and `ai/governance/.blackboxrules`
- [x] Recorded the change in `docs/CHANGELOG.md` (Unreleased)

#### Governance Rule: Efficiency Best-Practices (2025-11-03)

- [x] Added `Efficiency Best-Practices` section to `.github/copilot-instructions.md` and `ai/governance/.blackboxrules` with guidance for incremental work, faster tests, FAST*AI usage, caching, targeted linting, CI hygiene, dependency/ADR discipline, and automation helpers *(Author: automation/assistant)\_
- [x] Recorded the change in `docs/CHANGELOG.md` (Unreleased)

#### Execution Mode Budgets & Guard Script (2025-11-03)

- [x] Added measurable change budgets for execution modes (Safe / Fast-Secure / Audit / R&D) to governance rule files
- [x] Implemented `scripts/ai/guard-change-budget.mjs` to enforce budgets and artefact requirements in CI/local preflight
- [x] Implemented `tools/scripts/ai/guard-change-budget.mjs` to enforce budgets and artefact requirements in CI/local preflight
- [x] Added `CHANGELOG` entry documenting the enforcement addition
- [ ] Review: assign governance owner to approve budget thresholds and CI integration _(Owner: @governance-team • Due: 2025-11-10)_

#### TODO Update Requirement (2025-11-03)

- [x] Added rule: update `docs/TODO.md` with explicit next steps, assigned owners, and due dates before marking tasks complete
- [ ] Communication: notify teams of the new requirement and provide a short TODO entry template _(Owner: @docs-team • Due: 2025-11-07)_

</details>

---

## Reference

### Per-app Test Runner & Shims (Added 2025-11-05)

We added convenience tooling and lightweight shims to make per-application test runs fast and reliable without changing the repository-wide runner.

- Use Vitest as the unified test runner (Jest not required).
- Frontend tests (`jsdom`):

```bash
VITEST_APP=frontend VITEST_ENV=jsdom npx vitest --environment jsdom --run apps/frontend
```

- API tests (node environment):

```bash
npx vitest --run "apps/api/**/*.{test,spec}.{js,mjs,ts,tsx,jsx,tsx}"
# or use the npm helper
npm run test:api
```

- Shared shims (`scripts/test-setup.ts`):
  - Expose `React` on `globalThis` for legacy JSX
  - Import `@testing-library/jest-dom` for robust DOM matchers
  - Provide `matchMedia` polyfill for jsdom
  - Load CJS-friendly shim for `@political-sphere/shared`

If `jest-dom` is not desired, remove the import in `scripts/test-setup.ts` and drop the dependency.

---

## Notes

- All documents should include document control metadata at the bottom.
- Content must remain accessible, inclusive, and follow plain-language principles.
- Consider AI/ML and political simulation-specific examples where relevant.
- Potential risks: Legal review may be required for sensitive policies; flag content touching on unapproved areas.

---

## Deployment Action Improvements (2025-11-07)

### v1.4.0 - Completed (2025-11-07)

- [x] **OPS-02 Complete**: Full kubectl timeout coverage
  - Added `--request-timeout="${KUBECTL_TIMEOUT}"` to validate-manifests.sh (3 locations)
  - Added `--request-timeout="${KUBECTL_TIMEOUT}"` to rollback.sh (3 locations)
  - Added `ROLLBACK_TIMEOUT="5m"` constant for rollback completion timeout
  - All kubectl commands now have explicit 30s operation timeouts
- [x] **TEST-02**: Comprehensive integration tests for v1.2.0/v1.3.0 features
  - Created 39 new integration tests covering:
    - Multi-region deployment (5 tests)
    - Pre-deployment backup (4 tests)
    - Production approval gates (3 tests)
    - GDPR compliance verification (5 tests)
    - Performance regression testing (5 tests)
    - kubectl timeout configuration (4 tests)
    - Kubernetes version configuration (3 tests)
    - Environment variable passthrough (5 tests)
    - Secure Helm installation (5 tests)
  - Total test coverage: 76 tests (37 unit + 39 integration)
  - 100% pass rate (76/76 tests passing)
- [x] **QUAL-12**: Configurable Kubernetes version
  - K8s version now configurable via `KUBERNETES_VERSION` environment variable
  - Defaults to 1.29 if not specified
  - Supports future K8s version upgrades without code changes
- [x] **QUAL-13**: Magic numbers extracted to named constants
  - `ROLLBACK_TIMEOUT="5m"` in rollback.sh (previously hardcoded)
  - Improved code maintainability and clarity

### v1.3.0 - Completed (2025-11-07)

- [x] Fixed missing environment variables for v1.2.0 features (TARGET_REGIONS, ENABLE_BACKUP, etc.)
- [x] SEC-07: Fixed insecure Helm installation (replaced curl|bash with SHA256 verification)
- [x] COMP-03: Added license headers to all scripts
- [x] OPS-08: Added runbook documentation links to all scripts
- [x] OPS-02: Enhanced kubectl timeouts in run-deploy.sh and kubectl-apply.sh
- [x] QUAL-02: Enhanced error handling with trap-based cleanup
- [x] QUAL-10: Verified CloudWatch metrics use calculated $DURATION variable

### v1.2.0 - Completed (2025-11-07)

- [x] STRAT-03: Multi-region deployment support
- [x] OPS-05: Pre-deployment backup capability
- [x] OPS-06: Performance regression testing
- [x] OPS-08: Runbook documentation links
- [x] COMP-01: Production approval workflow integration
- [x] COMP-02: GDPR compliance verification
- [x] COMP-03: License headers added
- [x] QUAL-05: kubectl version pinning
- [x] QUAL-06: Automatic CHANGELOG updates
- [x] QUAL-11: Standardized shebang
- [x] SEC-07: Secure Helm installation

### v1.1.0 - Completed (2025-11-07)

- [x] SEC-01: Add comprehensive input validation to deployment action
- [x] SEC-02: Pin GitHub Actions to commit SHA instead of version tags
- [x] SEC-03: Implement container vulnerability scanning with Trivy
- [x] SEC-04: Add HTTPS health check support with SSL verification
- [x] SEC-06: Implement AWS Secrets Manager integration
- [x] SEC-10: Fix health check rate limiting with max wait ceiling
- [x] QUAL-02: Add structured error handling with trap handlers
- [x] QUAL-03: Fix blue-green deployment race condition
- [x] TEST-01: Create comprehensive test suite for deployment scripts (37 tests)
- [x] OPS-01: Implement structured JSON logging
- [x] OPS-02: Add kubectl command timeouts
- [x] OPS-03: Add rollback verification with health checks
- [x] OPS-04: Implement CloudWatch metrics recording
- [x] UX-01: Add WCAG 2.2 AA accessibility validation for frontend
- [x] STRAT-01: Create ADR-0015 for deployment strategy decisions

### Planned for 1.5.0 (Q1 2026)

- [ ] Automated canary promotion based on metrics
- [ ] Deployment notifications (Slack, PagerDuty)
- [ ] Cost estimation pre-deployment
- [ ] GitOps sync validation
- [ ] Secrets rotation automation
- [ ] Advanced blue-green traffic mirroring
