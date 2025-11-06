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
  - [ ] Fix 6 failing tests in `apps/api/tests/` (parties.test.mjs, users.test.mjs) — *Testing Infrastructure Core Principle*
  - [ ] Migrate JavaScript files to TypeScript strict mode (`apps/game-server/src/db.js`) — *Core Rule #1: Type-safe*
  - [ ] Remove 7 `eslint-disable` comments by fixing underlying issues — *Code Quality Standards*
  - [ ] Fix GitHub workflow secret context access errors (50+ errors) — *Operations Standards*
- **High Priorities — This Sprint**
  - [ ] Add React component test coverage (Dashboard.jsx, GameBoard.jsx) — *80%+ coverage requirement*
  - [ ] Enable frontend in coverage config with proper Babel/SWC setup
  - [ ] Run security audit: `npm run fast-secure` — *Zero-Trust Compliance*
  - [ ] Verify no cached auth checks — *High-Risk Pattern #2*
  - [ ] Ensure no debounce on voting flows — *High-Risk Pattern #1*
- **Medium Priorities — This Month**
  - [ ] Run accessibility audit: `npm run audit:full` — *WCAG 2.2 AA Mandatory*
  - [ ] Verify voting mechanism constitutional compliance
  - [ ] Review seed data for political neutrality — *High-Risk Pattern #6*
  - [ ] Document all changes in `CHANGELOG.md` — *Change Management requirement*
- **Documentation Updates**
  - [ ] Create ADRs for architectural decisions made during fixes
  - [ ] Update `CHANGELOG.md` with v2.0.0 alignment work
  - [ ] Document baseline metrics from audit runs
- **Notes**
  - Script updates: `run-smoke.js`, `run-vitest-coverage.js`, and `test-setup.ts` moved from `tools/` to `scripts/`; references in `package.json` and `vitest.config.js` updated (2025-11-05).

### Test Suite Stabilization (Added 2025-11-05)

> Guardrail tasks to keep Vitest suites green and aligned with GDPR routes.

- [x] Ensure JWT refresh secret is set during tests to satisfy 32+ char enforcement (`tools/test-setup.ts`) *(Owner: AI Assistant • Due: 2025-11-05)*
- [x] Provide `logger.audit` for GDPR routes to avoid 500s and enable structured audit logs *(Owner: API Team • Due: 2025-11-05)*
- [ ] Resolve `apps/api/src/stores/index.ts -> ./migrations` runtime import issue under Vitest *(Owner: API Team • Due: 2025-11-08)*
  - Note: Extensionless TS import fails occasionally; prefer resolver fix or safe import strategy that preserves TS tooling without `rootDir` regressions. Investigate Vitest TS transform vs Node ESM interop.
- [ ] Align GDPR deletion route with store API (`db.users.update`) *(Owner: Data/Store Team • Due: 2025-11-12)*
  - Note: Consider adding `deleted_at`, `deletion_reason`, `deleted_by` via migration or switching to a supported operation; update tests.
- [ ] Adapt `NewsService` to test store shape or supply adapter with save/write semantics *(Owner: API Team • Due: 2025-11-10)*
- [ ] Reconcile route status codes with test expectations (201/400/409 semantics) *(Owner: API Team • Due: 2025-11-09)*

### Developer Experience & Performance (Added 2025-11-04)

> Keep VS Code responsive and ensure performance tooling stays fresh.

- **Owner**: Developer Experience Team • **Status**: In Progress
- **Open Work**
  - [ ] Schedule weekly performance maintenance reminders *(Due: 2025-11-11)*
    - Next steps: Add calendar reminder or automated check.
  - [ ] Monitor and iterate on VS Code extension performance *(Due: 2025-12-04)*
    - Next steps: Review Vitest and TypeScript extension impact monthly.
- **Completed to Date**
  <details>
  <summary>Show completed items</summary>

  - [x] Create `scripts/cleanup-processes.sh` to kill runaway test processes *(Vitest, Playwright, esbuild)*
    - Impact: Resolves VS Code slowdown from accumulated background processes.
  - [x] Add VS Code performance optimization settings *(updates to `.vscode/settings.json`)*
    - Impact: Prevents file watcher overload and test runner accumulation.
  - [x] Create performance documentation *(`docs/VSCODE-PERFORMANCE.md` and quick reference)*
  - [x] Add npm performance scripts (`cleanup`, `perf:check`) to `package.json`

  </details>

### AI Efficiency & Effectiveness (Added 2025-11-04)

> Maintain the AI workspace tooling and expand automation coverage.

- **Owner**: AI Development Team • **Status**: In Progress
- **Open Work**
  - [ ] Measure AI response time improvements *(Due: 2025-11-11)*
    - Next steps: Compare before/after metrics using `ai-metrics.json`.
  - [ ] Add automated context bundle generation to CI *(Due: 2025-11-18)*
    - Next steps: Add `npm run ai:context` to GitHub Actions workflow.
- **Completed to Date**
  <details>
  <summary>Show completed items</summary>

  - [x] Create automated AI context builder *(6 bundles via `tools/scripts/ai/build-context.sh`)*
  - [x] Implement AI knowledge refresh system *(refresh script updates patterns and file maps)*
  - [x] Add AI response caching *(100-item cache, 24hr TTL via `cache-manager.cjs`)*
  - [x] Create AI-specific VS Code tasks *(added to `.vscode/tasks.json`)*
  - [x] Add git pre-commit hook for knowledge refresh *(keeps AI current each commit)*

  </details>

### Efficiency Best-Practices Follow-up (2025-11-03)

> Tasks mandated by the governance meta-rule after the efficiency update.

- [ ] Review: assign governance owner to approve change-budget thresholds and CI integration *(Owner: @governance-team • Due: 2025-11-10)*
- [ ] CI integration for guard script *(Owner: @ci-team • Due: 2025-11-10)*
  - Description: Add GitHub Actions job to run `tools/scripts/ai/guard-change-budget.mjs --mode=${{ inputs.mode }} --base=origin/main` on PRs.
- [ ] Notify governance & docs owners *(Owner: @docs-team • Due: 2025-11-07)*
  - Description: Announce Efficiency Best-Practices update and new TODO requirement to stakeholders.
- [ ] Add example PR snippet and FAST_AI guidance *(Owner: @devops-team • Due: 2025-11-06)*
  - Description: Update PR templates and contributor docs with `AI-EXECUTION` guidance.
- [ ] Close-files policy rollout *(Owner: @ai-team • Due: 2025-11-07)*
  - Description: Ensure agent tooling closes buffers/tabs after edits.
- [ ] Provision local test runners *(Owner: @devops-team • Due: 2025-11-10)*
  - Description: Add `vitest` or `jest` to devDependencies so CI can avoid remote `npx` calls.
- [ ] Communication: provide TODO entry template example *(Owner: @docs-team • Due: 2025-11-07)*

### Phase 1 Compliance Follow-ups

> Carry over from `docs/TODO-PHASE1-COMPLIANCE.md`.

- [ ] CSP (Content Security Policy) implementation
- [ ] HSTS preload submission
- [ ] Security.txt file creation
- [ ] CORS policy enforcement
- [ ] Rate limiting per user

### MCP Server Stabilization (2025-11-03)

- [x] Created minimal MCP server stubs in `apps/dev/mcp-servers/*/src/index.ts` *(filesystem, github, git, puppeteer, sqlite, political-sphere)*
  - Notes: Backups stored as `src/index.corrupted.txt`; health check logs written to `/tmp/mcp-<name>.log`.
- [x] Repair original `src/index.ts` entrypoints for all MCP packages *(ports 4010-4015)* *(Owner: @devops-team • Done: 2025-11-04)*
- [ ] Review stubs and replace with production-ready implementations or remove if upstream servers return *(Owner: @devops-team • Due: 2025-11-10)*
  - Notes: Secure `GITHUB_TOKEN` and database artifacts when enabling GitHub/SQLite MCPs.

### Strategic Governance Program (November 2025)

> Consolidates the 10 biggest program-level issues identified during the governance review.

<details open>
<summary>Open the strategic workstream details</summary>

#### 1. Fragmented Task Management (Critical Priority)

- [x] Consolidate all TODO files into `docs/TODO.md` *(Owner: @docs-team • Due: 2025-11-08)*
- [x] Implement automated TODO consolidation script *(Owner: @tooling-team)*
- [ ] Implement automated TODO consolidation script *(Owner: @tooling-team • Due: 2025-11-10)*
  - Next steps: Add script to CI to prevent future fragmentation.

#### 2. Incomplete Governance Reforms (High Priority)

- [x] Complete stakeholder briefings on playbook 2.2.0 changes *(Owner: @governance-team)*
- [x] Validate execution modes in CI pipeline *(Owner: @ci-team)*
- [x] Complete deferred gates documentation *(Owner: @docs-team)*

#### 3. Security & Compliance Gaps (Critical Priority)

- [x] Fix JWT secret management vulnerabilities *(Owner: @security-team • Completed 2025-11-06)*
- [x] Complete data classification framework implementation *(Owner: @compliance-team • Completed 2025-11-10)*
- [x] Add comprehensive security test coverage *(GDPR endpoints)* *(Owner: @testing-team)*
- [ ] Add comprehensive security test coverage *(auth.js scenarios)* *(Owner: @testing-team • Due: 2025-11-12)*
- [x] Implement GDPR compliance features *(Owner: @privacy-team)*

#### 4. Testing Infrastructure Issues (High Priority)

- [ ] Standardize test framework across all services *(Owner: @testing-team • Due: 2025-11-08)*
- [ ] Resolve ESM vs CJS module conflicts *(Owner: @devops-team • Due: 2025-11-07)*
- [ ] Improve test coverage to 80%+ across critical paths *(Owner: @testing-team • Due: 2025-11-15)*

#### 5. Documentation Inconsistencies (Medium Priority)

- [ ] Add status metadata to all documentation files *(Owner: @docs-team • Due: 2025-11-10)*
- [ ] Remove prohibited summary/completion documents *(Owner: @docs-team • Due: 2025-11-06)*
- [ ] Synchronize `.blackboxrules` and `.github/copilot-instructions.md` *(Owner: @governance-team • Due: 2025-11-08)*

#### 6. Code Quality & Technical Debt (Medium Priority)

- [ ] Eliminate all TypeScript lint errors and warnings *(Owner: @dev-team • Due: 2025-11-12)*
- [ ] Fix Nx module boundary violations *(Owner: @architecture-team • Due: 2025-11-10)*
- [ ] Complete structured logging replacement *(Owner: @dev-team • Due: 2025-11-08)*

#### 7. CI/CD Pipeline Complexity (Medium Priority)

- [ ] Simplify CI workflow structure *(Owner: @ci-team • Due: 2025-11-12)*
- [ ] Validate canary deployment and rollback procedures *(Owner: @devops-team • Due: 2025-11-15)*
- [ ] Optimize pipeline performance below 20 minutes *(Owner: @ci-team • Due: 2025-11-10)*

#### 8. AI Assistant Integration (Low-Medium Priority)

- [ ] Complete MCP server documentation *(Owner: @docs-team • Due: 2025-11-08)*
- [ ] Optimize AI performance monitoring *(Owner: @ai-team • Due: 2025-11-12)*
- [ ] Enhance context preloading and caching *(Owner: @ai-team • Due: 2025-11-10)*

#### 9. Game Development Backlog (Medium Priority)

- [ ] Complete game server API validation *(Owner: @game-team • Due: 2025-11-12)*
- [ ] Implement spectator mode and replay functionality *(Owner: @game-team • Due: 2025-11-15)*
- [ ] Enhance game state synchronization *(Owner: @game-team • Due: 2025-11-10)*

#### 10. Observability & Monitoring Gaps (Low Priority)

- [ ] Complete OpenTelemetry integration across all services *(Owner: @observability-team • Due: 2025-11-15)*
- [ ] Define comprehensive SLO/SLI catalog *(Owner: @observability-team • Due: 2025-11-12)*
- [ ] Update incident response and disaster recovery runbooks *(Owner: @operations-team • Due: 2025-11-10)*

</details>

### Testing & Coverage Improvements

> Increase coverage and stabilize shared modules after governance reforms.

- [ ] Restore branch coverage threshold to 90% (currently relaxed to 75% for shared helpers) *(Owner: QA/Platform • Due: 2025-11-20)*
  - Add branch-focused test cases for `libs/shared/src/security.js`.
  - Evaluate targeted coverage for `libs/shared/src/database.js` or scope exclusions responsibly.
- [ ] Expand coverage to telemetry and other shared modules *(Owner: Observability/Platform • Due: 2025-11-22)*
  - Add unit/integration tests for `libs/shared/src/telemetry.ts`.
  - Consider coverage adjustments for `libs/shared/src/database.js`.

### Governance Playbook 2.2.0 Adoption (2025-11-04)

> Ensure the consolidated governance playbook lands with supporting artefacts and communications.

- Files changed: `.github/copilot-instructions.md`, `.blackboxrules`, `docs/CHANGELOG.md`, `docs/TODO.md`
- Summary: Delivered playbook v2.2.0 with enhanced quick reference, accountability model, standards matrix, validation/security/accessibility requirements, and tooling expectations.
- Impact: Requires org-wide communications, quick-reference refresh, tooling updates for telemetry identifiers, template additions, and validation of legacy references.

- [ ] Brief governance, product, security, and data stakeholders on playbook expectations *(Owner: @governance-team • Due: 2025-11-08)*
- [ ] Update `quick-ref.md` (and prior sub-guides) to align with the consolidated playbook *(Owner: @docs-team • Due: 2025-11-07)*
- [x] Extend `tools/scripts/ai/guard-change-budget.mjs` output with artefact checklist, benchmark mapping reminders, and telemetry identifier requirements *(Owner: @tooling-team • Completed: 2025-11-12)*
- [ ] Ensure automations/docs referencing `ai/governance/.blackboxrules` point to the root `.blackboxrules` *(Owner: @tooling-team • Due: 2025-11-09)*
- [ ] Add bias/fairness, accessibility, incident review, and telemetry report templates to `/docs/templates/` *(Owner: @docs-team • Due: 2025-11-10)*
- [ ] Instrument prompt/response logging with trace identifiers and monthly intelligence reporting workflow *(Owner: @tooling-team • Due: 2025-11-11)*

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

- [ ] Implement database connection retry logic *(historic duplication with strategic section; keep for traceability)*
- [ ] Implement data export/import functionality *(legacy entry)*
- [ ] Add database backup automation *(legacy entry)*
- [ ] Implement database transaction management *(legacy entry)*
- [ ] Add database schema validation *(legacy entry)*
- [ ] Implement data seeding scripts for development *(legacy entry)*
- [ ] Add database performance monitoring *(legacy entry)*

</details>

### Governance & Documentation (Legacy)

<details>
<summary>Older documentation and governance tasks</summary>

- [ ] Implement data anonymization for analytics *(legacy entry)*
- [ ] Add data breach notification system *(legacy entry)*

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

- [x] Implemented CI script `tools/scripts/ci/check-file-placement.mjs` to enforce directory rules.
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

- [x] Added mandatory tool-usage guidance to governance files and agent prompts *(Owner: @ai-team • Due: 2025-11-07)*
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

- [x] Added `Efficiency Best-Practices` section to `.github/copilot-instructions.md` and `ai/governance/.blackboxrules` with guidance for incremental work, faster tests, FAST_AI usage, caching, targeted linting, CI hygiene, dependency/ADR discipline, and automation helpers *(Author: automation/assistant)*
- [x] Recorded the change in `docs/CHANGELOG.md` (Unreleased)

#### Execution Mode Budgets & Guard Script (2025-11-03)

- [x] Added measurable change budgets for execution modes (Safe / Fast-Secure / Audit / R&D) to governance rule files
- [x] Implemented `scripts/ai/guard-change-budget.mjs` to enforce budgets and artefact requirements in CI/local preflight
- [x] Implemented `tools/scripts/ai/guard-change-budget.mjs` to enforce budgets and artefact requirements in CI/local preflight
- [x] Added `CHANGELOG` entry documenting the enforcement addition
- [ ] Review: assign governance owner to approve budget thresholds and CI integration *(Owner: @governance-team • Due: 2025-11-10)*

#### TODO Update Requirement (2025-11-03)

- [x] Added rule: update `docs/TODO.md` with explicit next steps, assigned owners, and due dates before marking tasks complete
- [ ] Communication: notify teams of the new requirement and provide a short TODO entry template *(Owner: @docs-team • Due: 2025-11-07)*

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
