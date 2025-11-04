# TODO: Governance Reforms Implementation & Project Issues Remediation

<div align="center">

| Classification | Version | Last Updated |      Owner      | Review Cycle |  Status   |
| :------------: | :-----: | :----------: | :-------------: | :----------: | :-------: |
|  🔒 Internal   | `1.1.0` |  2025-11-04  | Governance Team |  Quarterly   | **Draft** |

</div>

---

## Overview

Implement governance reforms to reduce bureaucracy while preserving quality, security, and compliance value. Focus on AI-driven automation, proportional oversight, and efficiency improvements.

## Project Issues Remediation Plan

This section addresses the 10 biggest issues identified across the project, prioritized by impact and urgency.

## Consolidated Legacy TODO Items

### From TODO.md (Root)

- [ ] Implement JWT authentication middleware with proper token validation
- [ ] Add rate limiting to all API endpoints (express-rate-limit)
- [ ] Implement comprehensive error handling with structured logging
- [ ] Add input validation using Zod schemas for all endpoints
- [ ] Implement API versioning strategy (/v1/ prefix)
- [ ] Add OpenAPI/Swagger documentation generation
- [ ] Implement request/response compression (gzip)
- [ ] Add CORS configuration for production domains
- [ ] Implement health check endpoints (/health, /ready)
- [ ] Add request ID correlation for tracing
- [ ] Implement database connection pooling
- [ ] Add database migration system with rollback capability
- [ ] Implement data seeding scripts for development
- [ ] Add database backup automation
- [ ] Implement database query optimization and indexing
- [ ] Add database connection retry logic
- [ ] Implement database transaction management
- [ ] Add database schema validation
- [ ] Implement data export/import functionality
- [ ] Add database performance monitoring
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

### From TODO 3.md (Expansion Plan)

- [ ] Step 7: Add game mechanics stubs: Create libs/game-engine/src/index.ts with stubs for vote simulation, party dynamics; export and use in API/UI.
- [ ] Step 8: Run npm install.
- [ ] Step 9: Build shared and game-engine.
- [ ] Step 10: Run migrations and start API (node apps/api/src/app.js).
- [ ] Step 11: Start frontend dev server (vite --port 3001).
- [ ] Step 12: Test: Browser to localhost:3001, curl API endpoints, verify data flow and game stubs (e.g., simulate vote).
- [ ] Step 13: Use browser_action to verify UI, execute_command for curl tests.
- [ ] Step 14: Update TODO.md with completion.

### From TODO-IMPROVEMENTS.md (Level 4-5 Excellence)

- [ ] Step 15: Enhance testing: Add unit/integration tests for game stubs; implement e2e with Playwright; add performance tests with k6 (p95 < 200ms for API).
- [ ] Step 16: Enhance documentation: Update docs/architecture.md with game engine details; add ADR for caching improvements; ensure WCAG validation docs.
- [ ] Step 17: Implement monitoring: Configure Prometheus/Grafana dashboards for API metrics; add OTEL tracing for game routes; self-auditing logs.
- [ ] Step 18: Fix technical debt: Resolve DB 500 errors in tests; implement AI cache TTL cleanup; resolve Prettier/Biome conflicts.
- [ ] Step 19: Validate compliance: Run full security scans (Gitleaks, Semgrep); accessibility tests (axe-core); ethical AI review per ISO 42001.
- [ ] Step 20: Stress test: Add chaos engineering stubs (e.g., simulate DB outage); validate resilience.
- [ ] Step 21: Final review: Update CHANGELOG.md; simulate peer review; governance approval via controls.yml.
- [ ] Step 22: Update original TODO.md with all completions; archive this file.

### From TODO-GAME-DEVELOPMENT.md (Game Development Continuation)

- [ ] Add frontend integration for new mechanics
- [ ] Implement parties and factions
- [ ] Add AI NPCs for testing
- [ ] Performance monitoring and optimization

### From docs/TODO-PHASE1-COMPLIANCE.md (Phase 1 Compliance)

- [ ] CSP (Content Security Policy) implementation
- [ ] HSTS preload submission
- [ ] Security.txt file creation
- [ ] CORS policy enforcement
- [ ] Rate limiting per user

## Consolidated Development Tasks

This section consolidates all fragmented TODO files into a single source of truth, organized by functional area and priority.

### High Priority Development Tasks

#### 1. Core API Development

- [x] Implement JWT authentication middleware with proper token validation
- [x] Add rate limiting to all API endpoints (express-rate-limit)
- [x] Implement comprehensive error handling with structured logging
- [x] Add input validation using Zod schemas for all endpoints
- [ ] Implement API versioning strategy (/v1/ prefix)
- [ ] Add OpenAPI/Swagger documentation generation
- [x] Implement request/response compression (gzip)
- [x] Add CORS configuration for production domains
- [x] Implement health check endpoints (/health, /ready)
- [x] Add request ID correlation for tracing

#### 2. Database & Data Layer

- [x] Implement database connection pooling
- [ ] Add database migration system with rollback capability
- [ ] Implement data seeding scripts for development
- [ ] Add database backup automation
- [ ] Implement database query optimization and indexing
- [ ] Add database connection retry logic
- [x] Implement database transaction management
- [ ] Add database schema validation
- [ ] Implement data export/import functionality
- [x] Add database performance monitoring

#### 3. Frontend Development

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

#### 4. Game Server Development

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

### Security & Compliance Tasks

#### 5. Authentication & Authorization

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

#### 6. Data Protection & Privacy

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

### Website Expansion Plan (from TODO 3.md)

### 1. Fragmented Task Management (Critical Priority)

**Issue**: Multiple TODO files scattered across repository violating single source of truth requirement.

**Tasks**:

- [x] Consolidate all TODO files (TODO.md, TODO-IMPROVEMENTS.md, TODO-GAME-DEVELOPMENT.md, etc.) into docs/TODO.md

  - Owner: @docs-team
  - Due: 2025-11-08
  - Description: Merge all fragmented TODO files into single source of truth, deduplicate entries, and archive old files
  - Next steps: Update all references in README and documentation to point to docs/TODO.md
  - Status: Completed - All legacy TODO files consolidated and archived in docs/archive/

- [ ] Implement automated TODO consolidation script
  - Owner: @tooling-team
  - Due: 2025-11-10
  - Description: Create script to detect and merge duplicate TODO entries across repository
  - Next steps: Add to CI pipeline to prevent future fragmentation

### 2. Incomplete Governance Reforms (High Priority)

**Issue**: Governance reforms implementation ~50% complete with missing validations and briefings.

**Tasks**:

- [ ] Complete stakeholder briefings on playbook 2.2.0 changes

  - Owner: @governance-team
  - Due: 2025-11-08
  - Description: Brief governance, product, security, and data stakeholders on new operating framework
  - Next steps: Schedule meetings and document feedback

- [ ] Validate execution modes in CI pipeline

  - Owner: @ci-team
  - Due: 2025-11-12
  - Description: Test Fast-Secure and Audit modes, ensure guard script works correctly
  - Next steps: Run test PRs and monitor adoption

- [ ] Complete deferred gates documentation
  - Owner: @docs-team
  - Due: 2025-11-07
  - Description: Document all deferred gates with owners and due dates in TODO
  - Next steps: Review and assign accountability

### 3. Security & Compliance Gaps (Critical Priority)

**Issue**: Only 40% compliance with governance standards, 10 critical issues identified.

**Tasks**:

- [x] Fix JWT secret management vulnerabilities

  - Owner: @security-team
  - Due: 2025-11-06
  - Description: Remove dangerous fallbacks, add validation, require minimum 32-character secrets
  - Next steps: Update SECURITY.md and environment validation
  - Status: Completed - Enforced 32-character minimum for JWT secrets in all environments

- [x] Complete data classification framework implementation

  - Owner: @compliance-team
  - Due: 2025-11-10
  - Description: Implement field-level classifications and encryption guidelines
  - Next steps: Update docs/03-legal-and-compliance/data-classification.md
  - Status: Completed - Comprehensive data classification framework already exists with field-level classifications, protection requirements, and implementation guidelines

- [ ] Add comprehensive security test coverage

  - Owner: @testing-team
  - Due: 2025-11-12
  - Description: Expand auth.js test suite to cover all security scenarios
  - Next steps: Achieve 90%+ coverage for security-critical paths
  - Status: In Progress - JWT secret enforcement implemented, remaining security tests to be added

- [ ] Implement GDPR compliance features
  - Owner: @privacy-team
  - Due: 2025-11-15
  - Description: Add right to erasure, data portability, and consent management
  - Next steps: Update privacy policy and data subject rights procedures

### 4. Testing Infrastructure Issues (High Priority)

**Issue**: Mixed test frameworks and ESM/CJS conflicts causing instability.

**Tasks**:

- [ ] Standardize test framework across all services

  - Owner: @testing-team
  - Due: 2025-11-08
  - Description: Choose single framework (Jest or Vitest), migrate all tests consistently
  - Next steps: Update all jest.config.cjs and package.json test scripts

- [ ] Resolve ESM vs CJS module conflicts

  - Owner: @devops-team
  - Due: 2025-11-07
  - Description: Fix import/export issues in test suites, ensure consistent module handling
  - Next steps: Update tsconfig.json and build configurations

- [ ] Improve test coverage to 80%+ across all critical paths
  - Owner: @testing-team
  - Due: 2025-11-15
  - Description: Add missing tests for API endpoints, game logic, and error scenarios
  - Next steps: Implement coverage reporting and enforcement in CI

### 5. Documentation Inconsistencies (Medium Priority)

**Issue**: Missing status metadata, prohibited summary documents, and unsynchronized rule files.

**Tasks**:

- [ ] Add status metadata to all documentation files

  - Owner: @docs-team
  - Due: 2025-11-10
  - Description: Systematically add Status column to metadata tables in all 216 docs
  - Next steps: Create automation script for status assignment

- [ ] Remove prohibited summary/completion documents

  - Owner: @docs-team
  - Due: 2025-11-06
  - Description: Delete IMPLEMENTATION-SUMMARY.md, CHANGES-SUMMARY.md, etc. per governance rules
  - Next steps: Update CHANGELOG.md with removal entries

- [ ] Synchronize .blackboxrules and .github/copilot-instructions.md
  - Owner: @governance-team
  - Due: 2025-11-08
  - Description: Ensure parity between rule files, update versions consistently
  - Next steps: Implement automated parity checking in CI

### 6. Code Quality & Technical Debt (Medium Priority)

**Issue**: Linting errors, TypeScript violations, and inconsistent logging.

**Tasks**:

- [ ] Eliminate all TypeScript lint errors and warnings

  - Owner: @dev-team
  - Due: 2025-11-12
  - Description: Fix 66 remaining warnings, enable strict mode compliance
  - Next steps: Update tsconfig.base.json and enforce in CI

- [ ] Fix Nx module boundary violations

  - Owner: @architecture-team
  - Due: 2025-11-10
  - Description: Enforce strict module boundaries, fix import violations
  - Next steps: Update nx.json configuration

- [ ] Complete structured logging replacement
  - Owner: @dev-team
  - Due: 2025-11-08
  - Description: Replace remaining console.log statements with structured logger
  - Next steps: Audit all services and update telemetry module

### 7. CI/CD Pipeline Complexity (Medium Priority)

**Issue**: Recent overhaul improved speed but introduced complexity and untested procedures.

**Tasks**:

- [ ] Simplify CI workflow structure

  - Owner: @ci-team
  - Due: 2025-11-12
  - Description: Reduce duplication, consolidate composite actions
  - Next steps: Test simplified workflows in staging

- [ ] Validate canary deployment and rollback procedures

  - Owner: @devops-team
  - Due: 2025-11-15
  - Description: Test progressive rollout (5%→100%) and automatic rollback triggers
  - Next steps: Implement in staging environment

- [ ] Optimize pipeline performance further
  - Owner: @ci-team
  - Due: 2025-11-10
  - Description: Implement better caching, reduce build times below 20 minutes
  - Next steps: Monitor and iterate on performance metrics

### 8. AI Assistant Integration (Low-Medium Priority)

**Issue**: MCP servers implemented but not fully integrated with workflows.

**Tasks**:

- [ ] Complete MCP server documentation

  - Owner: @docs-team
  - Due: 2025-11-08
  - Description: Update docs/mcp-servers-setup.md with integration examples
  - Next steps: Add VSCode configuration examples

- [ ] Optimize AI performance monitoring

  - Owner: @ai-team
  - Due: 2025-11-12
  - Description: Implement competence tracking and performance metrics
  - Next steps: Update ai-metrics.json and ai-learning/patterns.json

- [ ] Enhance context preloading and caching
  - Owner: @ai-team
  - Due: 2025-11-10
  - Description: Optimize for common development use cases
  - Next steps: Test FAST_AI mode performance improvements

### 9. Game Development Backlog (Medium Priority)

**Issue**: Core mechanics implemented but testing and features incomplete.

**Tasks**:

- [ ] Complete game server API validation

  - Owner: @game-team
  - Due: 2025-11-12
  - Description: Test all endpoints (debate, economy, spectator mode)
  - Next steps: Add integration tests

- [ ] Implement spectator mode and replay functionality

  - Owner: @game-team
  - Due: 2025-11-15
  - Description: Add real-time spectator features and game recording
  - Next steps: Update game server API documentation

- [ ] Enhance game state synchronization
  - Owner: @game-team
  - Due: 2025-11-10
  - Description: Improve WebSocket handling and state consistency
  - Next steps: Add performance monitoring

### 10. Observability & Monitoring Gaps (Low Priority)

**Issue**: OpenTelemetry integration started but incomplete across services.

**Tasks**:

- [ ] Complete OpenTelemetry integration across all services

  - Owner: @observability-team
  - Due: 2025-11-15
  - Description: Add instrumentation to remaining services and endpoints
  - Next steps: Configure exporters and dashboards

- [ ] Define comprehensive SLO/SLI catalog

  - Owner: @observability-team
  - Due: 2025-11-12
  - Description: Document service-level objectives and indicators
  - Next steps: Update docs/09-observability-and-ops/

- [ ] Update incident response and disaster recovery runbooks
  - Owner: @operations-team
  - Due: 2025-11-10
  - Description: Incorporate recent changes and test procedures
  - Next steps: Schedule disaster recovery drills

## Tasks

### 1. Execution Mode Reforms

- [x] Update execution modes with AI-driven automation and risk-based scaling
- [x] Increase Fast-Secure budget to 200 lines/8 files for small features
- [x] Automate 90% of quality gates in Safe mode
- [x] Enhance AI suggestions and automated safety checks in R&D mode

### 2. Proportional Governance

- [x] Apply governance proportionally - lighter for small changes, stricter for critical paths
- [x] Focus human review on architectural decisions and high-risk areas
- [x] Add automated follow-up reminders for deferred gates

### 3. Efficiency Best-Practices Integration

- [x] Embed efficiency patterns directly into workflows to reduce friction
- [x] Use AI to suggest optimal approaches rather than enforcing rigid rules
- [x] Provide smart defaults for common development tasks

### 4. Documentation Updates

- [x] Update CHANGELOG.md with governance reforms
- [x] Update rule files with new execution modes and budgets
- [x] Ensure parity between .blackboxrules and copilot-instructions.md

### 5. Testing & Coverage Improvements

- [ ] Restore branch coverage threshold to 90% (currently relaxed to 75% for shared helpers)
  - Add branch-focused test cases for `libs/shared/src/security.js`
  - Evaluate adding file-specific thresholds or broader suite coverage to avoid narrowing include surface
  - Owner: QA/Platform — Due: 2025-11-20
- [ ] Expand coverage to telemetry and other shared modules
  - Add safe unit/integration tests for `libs/shared/src/telemetry.ts`
  - Consider targeted tests for `libs/shared/src/database.js` or exclude from coverage if out-of-scope
  - Owner: Observability/Platform — Due: 2025-11-22

### 5. Small fixes: Context Preloader (2025-11-04)

- Date: 2025-11-04
- Author: automation/assistant
- Files changed: `tools/scripts/ai/context-preloader.js`, `CHANGELOG.md`, `docs/TODO.md`
- Type: Fixed
- Summary: Adjusted the AI context preloader to prefer and create repository-root `ai-cache/`, added a robust recursive directory walker and improved error handling. This resolves unit test failures in `tools/scripts/ai/context-preloader.spec.js` that expected `ai-cache/context-cache.json` at the repo root.
- Impact: Non-breaking; improves test reliability and developer experience. Added changelog entry and marked TODO for traceability.

### 6. Add assistant policy file (2025-11-04)

- Date: 2025-11-04
- Author: automation/assistant
- Files changed: `.ai/assistant-policy.json`, `CHANGELOG.md`, `docs/TODO.md`
- Type: Added
- Summary: Add a repository-level assistant policy file with recommended implicit contexts (repo_read, tests_run, terminal_run, git_read, pr_create:draft, changelog_todo_edit, ephemeral_cache, audit_logging) and explicit approval list for sensitive actions (repo_write, secrets_access, external_network, package_publish, infra_deploy).
- Impact: Non-breaking; documents allowed agent capabilities and governance defaults. Commit added on `fix/context-preloader` branch.

### 7. Governance Playbook 2.2.0 Adoption (2025-11-04)

- Date: 2025-11-04
- Author: BlackboxAI
- Files changed: `.github/copilot-instructions.md`, `.blackboxrules`, `docs/CHANGELOG.md`, `docs/TODO.md`
- Type: Changed
- Summary: Delivered single-source governance playbook v2.2.0 with enhanced quick reference, accountability model, standards matrix, validation/security/accessibility requirements, and tooling expectations.
- Impact: Requires organisation-wide comms, quick-reference refresh, tooling updates for telemetry identifiers, template additions, and validation of legacy references.
- [ ] Brief governance, product, security, and data stakeholders on playbook 2.2.0 expectations (`@governance-team`; due: 2025-11-08)
- [ ] Update `quick-ref.md` (and any prior sub-guides) to align with the consolidated playbook and link to new sections (`@docs-team`; due: 2025-11-07)
- [x] Extend `tools/scripts/ai/guard-change-budget.mjs` output with artefact checklist, benchmark mapping reminders, and telemetry identifier requirements (`@tooling-team`; due: 2025-11-12)
- [ ] Ensure automations/docs referencing `ai/governance/.blackboxrules` point to the root `.blackboxrules` (`@tooling-team`; due: 2025-11-09)
- [ ] Add bias/fairness, accessibility, incident review, and telemetry report templates to `/docs/templates/` and reference them in the playbook (`@docs-team`; due: 2025-11-10)
- [ ] Instrument prompt/response logging with trace identifiers and monthly intelligence reporting workflow (`@tooling-team`; due: 2025-11-11)

### 5. Validation and Final Checks

- [ ] Test updated execution modes in CI pipeline
- [ ] Validate that reforms reduce development friction while maintaining quality
- [ ] Monitor adoption and gather feedback from development team
- [ ] Update any cross-references if needed

## Completed Tasks

### Governance Reforms (2025-11-03)

- [x] Streamlined governance framework to reduce bureaucracy while preserving value
- [x] Updated execution modes with proportional oversight and AI automation
- [x] Increased Fast-Secure mode flexibility for small features
- [x] Enhanced AI-driven quality gates and safety checks
- [x] Added efficiency best-practices integration

### Governance Rule Readability Improvements (2025-11-04)

- [x] Condensed verbose sections into concise inline sentences in `.github/copilot-instructions.md` and `.blackboxrules`
- [x] Eliminated redundancy and improved structure for better readability
- [x] Added version 1.5.3 and last reviewed date to both files
- [x] Ensured parity between rule files per Meta-Rule
- [x] Updated CHANGELOG.md with entry documenting the changes

## Completed Tasks

### Governance Rule Modularization (2025-01-10)

- [x] Split `.github/copilot-instructions.md` into 10 focused sub-files for maintainability
- [x] Created Table of Contents with links to sub-files
- [x] Updated `.blackboxrules` in parallel per Meta-Rule
- [x] Bumped versions to 1.3.2 in both files
- [x] Added CHANGELOG entry documenting the change
- [x] Verified parity between rule files
- [x] Added AI Agent Reading Requirements and Rule Organization & Reading Protocol to both rule files

### Governance Rule Update (2025-11-03)

- [x] Added explicit changelog enforcement requirement to `.github/copilot-instructions.md` and `.blackboxrules`
- [x] Bumped rule versions to 1.3.3 and refreshed metadata
- [x] Logged the rule change in `docs/CHANGELOG.md`

### Governance Rule Enhancement (2025-11-03)

- [x] Added GitHub Collaboration Excellence section to `.github/copilot-instructions.md` and `.blackboxrules`
- [x] Documented branching, commit, PR, review, issue hygiene, and automation expectations
- [x] Bumped governance rule versions to 1.4.0 and refreshed metadata
- [x] Recorded the update in `docs/CHANGELOG.md`

### Governance Rule Minor Clarification (2025-11-03)

- [x] Added short examples for CHANGELOG and TODO entries to both rule files
- [x] Added guidance to include `AI-EXECUTION` header in PR bodies and list deferred gates
- [x] Bumped rule versions to 1.5.0 in `.github/copilot-instructions.md` and `ai/governance/.blackboxrules`
- [x] Recorded the change in `docs/CHANGELOG.md` (Unreleased)

### Governance Rule: Efficiency Best-Practices (2025-11-03)

- [x] Added `Efficiency Best-Practices` section to `.github/copilot-instructions.md` and `ai/governance/.blackboxrules` with concrete guidance for incremental work, faster tests, FAST_AI usage, caching/warmed artifacts, targeted linting, CI hygiene, dependency/ADR discipline, and automation helpers. (Author: automation/assistant)
- [x] Recorded the change in `docs/CHANGELOG.md` under Unreleased. (Date: 2025-11-03)

### Execution Mode Budgets & Guard Script (2025-11-03)

- [x] Added measurable change budgets for Execution Modes (Safe / Fast-Secure / Audit / R&D) to governance rule files
- [x] Implemented `scripts/ai/guard-change-budget.mjs` to enforce budgets and artefact requirements in CI/local preflight
- [x] Implemented `tools/scripts/ai/guard-change-budget.mjs` to enforce budgets and artefact requirements in CI/local preflight
- [x] Added CHANGELOG entry documenting the enforcement addition
- [ ] Review: assign governance owner to approve budget thresholds and CI integration (owner: @governance-team; due: 2025-11-10)

### TODO Update Requirement (2025-11-03)

- [x] Added rule: update `/docs/TODO.md` with explicit next steps, assigned owners, and due dates before marking tasks completed or merging changes
- [ ] Communication: notify teams of the new requirement and provide a short example TODO entry template (owner: @docs-team; due: 2025-11-07)

## Notes

- All documents should include document control metadata at the bottom.
- Content should be accessible, inclusive, and follow plain language principles.
- Consider AI/ML and political simulation specific examples where relevant.
- Potential risks: Legal review may be needed for sensitive policies; flag if content touches on unapproved areas.

## Recommended next steps for Efficiency Best-Practices

These next steps are required per the governance Meta-Rule (add TODO entries with owners and due dates). Please complete or reassign as needed.

1. CI integration for guard script

   - Owner: @ci-team
   - Due: 2025-11-10
   - Description: Add a GitHub Actions job to run `tools/scripts/ai/guard-change-budget.mjs --mode=${{ inputs.mode }} --base=origin/main` on PRs and pre-merge checks. Validate on a draft PR and ensure clear diagnostics on failure.

2. Notify governance & docs owners

   - Owner: @docs-team
   - Due: 2025-11-07
   - Description: Announce the Efficiency Best-Practices update and the new TODO update requirement to governance owners and the `#governance` channel. Provide an example TODO entry and explain `FAST_AI` behaviour.

3. Add example PR snippet and FAST_AI guidance

   - Owner: @devops-team
   - Due: 2025-11-06
   - Description: Add a short example to the PR templates and contributor docs showing how to declare `AI-EXECUTION` headers, list deferred gates, and indicate when `FAST_AI=1` was used for development runs.

4. Close-files policy rollout

   - Owner: @ai-team
   - Due: 2025-11-07
   - Description: Ensure agent tooling and editor snippets instruct agents to close files after edits (close buffers/tabs). Update agent wrappers and automation to close editor files or log file handles after use.

   ## MCP Stubs Added (2025-11-03)

   - [x] Created minimal MCP server stubs in `apps/dev/mcp-servers/*/src/index.ts` for: filesystem, github, git, puppeteer, sqlite, political-sphere. These are simple HTTP servers exposing `/health` and `/info` to validate local MCP wiring and VSCode/Client integration during development and testing.

   Owner: @devops-team
   Due: 2025-11-10
   Description: Review these stubs and replace with production MCP implementations or remove if upstream servers are restored. Ensure `GITHUB_TOKEN` and database artifacts are secured when enabling GitHub/SQLite MCPs in CI/dev environments.

   Notes:

   - Backups of the original, corrupted entrypoints were saved alongside the sources as `src/index.corrupted.txt` in each affected package.
   - Ephemeral runtime artifacts (logs and PID files) were written to `/tmp/mcp-<name>.log` and `/tmp/mcp-<name>.pid` during the verification run. These can be used to reproduce the quick health checks performed during the session.

   - [x] Repair original `src/index.ts` entrypoints and restore canonical implementations (or formally adopt the `src/dev-server.ts` dev entrypoints):

     - Owner: @devops-team
     - Done: 2025-11-04
     - Description: Repaired `src/index.ts` for the following MCP packages and restored the `dev` script to run `src/index.ts`:
       - `filesystem` (port 4010)
       - `github` (port 4011)
       - `git` (port 4012)
       - `puppeteer` (port 4013)
       - `sqlite` (port 4014)
       - `political-sphere` (port 4015)
     - Notes: Backups kept at `src/index.corrupted.txt`. Ephemeral logs and PIDs are in `/tmp/mcp-<name>.log` and `/tmp/mcp-<name>.pid`.

5. Provision local test runners

   - Owner: @devops-team
   - Due: 2025-11-10
   - Description: Add `vitest` or `jest` to devDependencies in `package.json` and ensure CI images run `npm ci`. This enables `tools/scripts/ci/check-tools.mjs` to detect the runner locally and avoids requiring networked `npx` checks in CI.

### Tool-usage rule rollout (2025-11-03)

- [x] Add mandatory tool-usage guidance to governance files and agent prompts
  - Owner: @ai-team
  - Due: 2025-11-07
  - Description: Require agents to identify and invoke appropriate workspace tools for a task (code search, semantic search, `read_file`, test runners, linters, guard script, indexers). If a required tool is unavailable, agents must document the failure in the PR and create a `/docs/TODO.md` entry. Updated `.vscode/agent-prompts.md`, `.github/copilot-instructions.md`, and `ai/governance/.blackboxrules`.

## Recent: Test discovery stabilisation (2025-11-04)

- [x] Converted remaining `node:test` style tests to Vitest-compatible tests (used `vitest` imports and `expect`) across `apps/*` and mirrored `tools/*` test folders. This resolves Vitest test discovery failures and multiple flaky suites caused by Node test harness usage.

Owner: @devs-team
Status: Completed (2025-11-04)
Next steps:

- Open a draft PR with these changes and include `AI-EXECUTION: mode: Safe` header; assign reviewers from core-maintainers and testing owners.
- Run full CI preflight on the PR (ensure guard-change-budget script passes) and address any lint/type warnings that appear.
- If any remaining flakiness is observed in CI, add specific flaky test entries to this TODO list with owner and due date.

## Recent: Microsoft Learn context added (2025-11-04)

- Files added by assistant to provide authoritative context and onboarding references:
  - `apps/docs/compliance/responsible-ai.md` — Responsible AI references and checklist (Microsoft Learn links)
  - `apps/docs/security/identity-and-access.md` — Microsoft Entra (Azure AD), RBAC guidance and practical recommendations
  - `apps/docs/observability/opentelemetry.md` — Azure Monitor OpenTelemetry quickstart and guidance

Owner: @docs-team
Status: Completed (drafts)
Notes: These are initial, curated references sourced from Microsoft Learn. Review and expand the content to include project-specific implementation steps and internal compliance artefacts where needed.

### File placement enforcement (2025-11-03)

- [x] Implement CI script to validate directory placements
  - Owner: @ci-team
  - Due: 2025-11-10
  - Description: Created `tools/scripts/ci/check-file-placement.mjs` to enforce governance directory rules. Added to guard-check.yml and affected-tests.yml workflows. Updated governance rules with enforcement mechanisms.
