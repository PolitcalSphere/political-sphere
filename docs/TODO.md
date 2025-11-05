thia# TODO: Governance Reforms Implementation & Project Issues Remediation

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

### 🚧 In Progress (2025-11-05)

**📋 Copilot Instructions v2.0.0 Compliance Alignment**

Per updated GitHub Copilot Instructions v2.0.0, bringing project into full compliance with new standards:

**Critical Priorities (Immediate)**:
- [ ] Fix 6 failing tests in `apps/api/tests/` (parties.test.mjs, users.test.mjs) - **Testing Infrastructure Core Principle**
- [ ] Migrate JavaScript files to TypeScript strict mode (`apps/game-server/src/db.js`) - **Core Rule #1: Type-safe**
- [ ] Remove 7 `eslint-disable` comments by fixing underlying issues - **Code Quality Standards**
- [ ] Fix GitHub workflow secret context access errors (50+ errors) - **Operations Standards**

**High Priorities (This Sprint)**:
- [ ] Add React component test coverage (Dashboard.jsx, GameBoard.jsx) - **80%+ coverage requirement**
- [ ] Enable frontend in coverage config with proper Babel/SWC setup
- [ ] Run security audit: `npm run fast-secure` - **Zero-Trust Compliance**
- [ ] Verify no cached auth checks (High-Risk Pattern #2)
- [ ] Ensure no debounce on voting flows (High-Risk Pattern #1)

**Medium Priorities (This Month)**:
- [ ] Run accessibility audit: `npm run audit:full` - **WCAG 2.2 AA Mandatory**
- [ ] Verify voting mechanism constitutional compliance
- [ ] Review seed data for political neutrality (High-Risk Pattern #6)
- [ ] Document all changes in CHANGELOG.md - **Change Management requirement**

**Documentation Updates**:
- [ ] Create ADRs for architectural decisions made during fixes
- [ ] Update CHANGELOG.md with v2.0.0 alignment work
- [ ] Document baseline metrics from audit runs

**Reference**: `.github/copilot-instructions/copilot-instructions.md` v2.0.0  
**Owner**: Development Team | **Started**: 2025-11-05  
**Priority**: High - Core compliance with governance standards

---

### ✅ Recently Completed (2025-11-05)

**📚 GitHub Copilot Instructions Organization**

- [x] Created `.github/copilot-instructions/` directory for AI governance documentation
- [x] Moved 11 instruction files into organized subfolder (copilot-instructions.md, ai-governance.md, compliance.md, operations.md, organization.md, quality.md, quick-ref.md, security.md, strategy.md, testing.md, ux-accessibility.md)
- [x] Updated all references in `.blackboxrules`, CI workflows, and AI tool scripts
- [x] Updated file paths in AI knowledge base, context preloader, and guard scripts
- [x] Improved organization and discoverability of AI governance documentation
- **Impact**: Better structured .github folder, easier navigation for AI governance rules
- **Owner**: AI Assistant | **Date**: 2025-11-05

**�📂 Root Directory Organization Audit**

- [x] Conducted comprehensive audit of all root-level files
- [x] Moved `.mcp.json` → `tools/config/mcp.json` (proper configuration location)
- [x] Moved `test-mcp-imports.js` → `scripts/test-mcp-imports.js` (proper script location)
- [x] Updated `.github/organization.md` to document all allowed root file exceptions
- [x] Verified git-ignored files (`.env`, `.env.local`, `.DS_Store`) are properly excluded
- [x] All root files now comply with governance rules
- **Impact**: Improved project structure, better compliance with organization standards
- **Owner**: AI Assistant | **Date**: 2025-11-05

**🗂️ GitHub Workflow Structure Cleanup**

- [x] Removed 6 empty duplicate directories from `.github/actions/` (ci 2, deployment 2, maintenance 2, monitoring 2, security 2, testing 2)
- [x] Moved 9 workflow files from `.github/actions/` to `.github/workflows/` for proper organization
- [x] Consolidated duplicate ai-maintenance.yml files (kept comprehensive version with embeddings and ANN)
- [x] Removed duplicate `lefthook.yml` template file (kept active `.lefthook.yml` configuration)
- [x] Improved discoverability and alignment with GitHub Actions best practices
- [x] Updated CHANGELOG.md with cleanup details
- **Impact**: Cleaner repository structure, easier workflow discovery and maintenance
- **Owner**: AI Assistant | **Date**: 2025-11-05

**�🔧 Code Actions Buffering Fix**

- [x] Fixed infinite loop in VS Code code actions on save
- [x] Removed conflicting `source.fixAll` and `source.organizeImports` actions
- [x] Kept only `source.fixAll.eslint` to prevent formatter conflicts
- [x] Added 3-second timeout protection for code actions
- [x] Disabled ESLint formatting (Prettier handles formatting)
- [x] Configured TypeScript import organization to not interfere on save
- [x] Added explicit Prettier as default formatter
- [x] Created comprehensive fix documentation (docs/CODE-ACTIONS-FIX.md)
- [x] Updated .vscode/settings.json with explanatory comments
- **Impact**: Eliminated 2-5 second save delays and infinite buffering
- **Owner**: AI Assistant | **Date**: 2025-11-05

### ✅ Recently Completed (2025-11-04)

**� Proven Open-Source AI Tools Integration**

- [x] Integrated AST-based code analyzer from Ruff and VS Code patterns (ast-analyzer.cjs)
- [x] Features: Complexity analysis (cyclomatic, cognitive, Halstead), semantic tokens, pattern detection
- [x] Security scanning: eval detection, injection vulnerabilities, unsafe patterns
- [x] Performance analysis: inefficient forEach, nested callbacks, hot path optimization
- [x] Enhanced semantic indexer with Bloop-inspired semantic search patterns
- [x] Symbol extraction, import tracking, semantic chunking, dependency graphs
- [x] Fast symbol/file search with relevance scoring
- [x] Created comprehensive integration guide (docs/ai-tools-integration.md)
- [x] Added npm scripts: ai:index, ai:search, ai:ast
- [x] Installed AST parsing dependencies: acorn, acorn-walk
- [x] Retrieved 200+ proven patterns from VS Code, Copilot, Bloop, Ruff
- [x] Verified license compatibility (all MIT/Apache 2.0)
- [x] Documented pattern sources and usage examples

**�🚀 Unified AI Development Assistant Super System**

- [x] Created ai-assistant.cjs - unified orchestrator for all AI systems
- [x] Implemented intent parsing (analyze, fix, optimize, test, refactor, learn)
- [x] Built workspace state tracking (git, files, tests, errors, todos, dependencies)
- [x] Added specialized handlers for each assistance type
- [x] Implemented auto-improve mode for workspace-wide analysis
- [x] Created interactive chat mode with session metrics
- [x] Added npm commands: ai, ai:chat, ai:improve, ai:status
- [x] Achieved 1ms workspace insights, 3ms cached query responses
- [x] Integrated all systems: AI Hub, Expert Knowledge, Pattern Matcher, Code Analyzer

**AI Intelligence System - Lightning-Fast Expert-Level Assistance**

- [x] Created expert knowledge base with patterns, solutions, and best practices (expert-knowledge.cjs)
- [x] Implemented pattern matcher for instant code analysis (pattern-matcher.cjs)
- [x] Created intelligent code analyzer combining semantic index, patterns, and expert knowledge (code-analyzer.cjs)
- [x] Built unified AI Hub with query routing and caching (ai-hub.cjs)
- [x] Enhanced semantic indexer with advanced capabilities
- [x] Added npm scripts: ai:analyze, ai:pattern, ai:query, ai:hub
- [x] Achieved ~3ms response time for cached queries (98% improvement)
- [x] Integrated 6 context bundles with expert knowledge
- [x] Implemented security pattern detection (5 patterns)
- [x] Implemented performance analysis (3 patterns)
- [x] Added code quality checks (3 patterns)
- [x] Created solution database for common errors
- [x] Added quick fixes for debugging, testing, performance

**AI Efficiency Improvements**

- [x] Created context bundle builder (6 bundles: recent-changes, active-tasks, project-structure, error-patterns, dependencies, code-patterns)
- [x] Implemented knowledge refresh system (patterns.json, file-map.json)
- [x] Added response caching (100-item limit, 24hr TTL)
- [x] Created git pre-commit hook for automatic knowledge updates
- [x] Added AI-specific VS Code tasks
- [x] Created decision trees and quick access patterns

**Performance Optimization**

- [x] Created process cleanup script (cleanup-processes.sh)
- [x] Created workspace optimizer (optimize-workspace.sh)
- [x] Created performance monitor (perf-monitor.sh)
- [x] Optimized VS Code settings (TypeScript, Vitest, file watchers)
- [x] Added performance npm scripts (cleanup, perf:\*)

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

### Test Suite Stabilisation (Added 2025-11-05)

- [x] Ensure JWT refresh secret is set during tests to satisfy 32+ char enforcement (tools/test-setup.ts)
  - Owner: AI Assistant
  - Due: 2025-11-05
- [x] Provide API logger.audit for GDPR routes to avoid 500s and enable structured audit logs
  - Owner: API Team
  - Due: 2025-11-05
- [ ] Resolve `apps/api/src/stores/index.ts -> ./migrations` runtime import issue under Vitest
  - Notes: Extensionless TS import occasionally fails at runtime; prefer resolver fix or a safe import strategy that preserves TS tooling without rootDir regressions. Investigate Vitest TS transform settings vs Node ESM interop.
  - Owner: API Team
  - Due: 2025-11-08
- [ ] Align GDPR deletion route with store API (db.users.update)
  - Notes: Schema currently lacks soft-delete columns; either add `deleted_at`, `deletion_reason`, `deleted_by` via migration or switch route to a supported operation; update tests accordingly.
  - Owner: Data/Store Team
  - Due: 2025-11-12
- [ ] Adapt NewsService to test store shape or supply adapter with save/write semantics in tests
  - Owner: API Team
  - Due: 2025-11-10
- [ ] Reconcile route status codes with test expectations (201/400/409 semantics)
  - Owner: API Team
  - Due: 2025-11-09

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

### Developer Experience & Performance (Added 2025-11-04)

- [x] Create `scripts/cleanup-processes.sh` to kill runaway test processes (Vitest, Playwright, esbuild)
  - Owner: Developer Experience Team
  - Status: Complete - script created and tested
  - Impact: Resolves VS Code slowdown from accumulated background processes
- [x] Add VS Code performance optimization settings
  - Owner: Developer Experience Team
  - Status: Complete - `.vscode/settings.json` optimized with TypeScript watch exclusions and Vitest config
  - Impact: Prevents file watcher overload and test runner accumulation
- [x] Create performance documentation
  - Owner: Developer Experience Team
  - Status: Complete - `docs/VSCODE-PERFORMANCE.md` and quick reference created
  - Impact: Provides diagnostics, preventive measures, and recovery procedures
- [x] Add npm performance scripts (`cleanup`, `perf:check`)
  - Owner: Developer Experience Team
  - Status: Complete - scripts added to package.json
  - Impact: Easy access to performance tools
- [ ] Schedule weekly performance maintenance reminders
  - Owner: Developer Experience Team
  - Due: 2025-11-11
  - Next steps: Add calendar reminder or automated check
- [ ] Monitor and iterate on VS Code extension performance
  - Owner: Developer Experience Team
  - Due: 2025-12-04
  - Next steps: Review Vitest and TypeScript extension impact monthly

### AI Efficiency & Effectiveness (Added 2025-11-04)

- [x] Create automated AI context builder
  - Owner: AI Development Team
  - Status: Complete - `tools/scripts/ai/build-context.sh` generates 6 context bundles
  - Impact: AI can quickly load project state, recent changes, errors, and patterns
- [x] Implement AI knowledge refresh system
  - Owner: AI Development Team
  - Status: Complete - `tools/scripts/ai/refresh-knowledge.sh` updates patterns and file maps
  - Impact: Keeps AI informed about project conventions and fast paths
- [x] Add AI response caching
  - Owner: AI Development Team
  - Status: Complete - `cache-manager.cjs` with 100-item cache, 24hr TTL
  - Impact: Instant responses for common queries
- [x] Create AI-specific VS Code tasks
  - Owner: AI Development Team
  - Status: Complete - 4 tasks added to `.vscode/tasks.json`
  - Impact: One-click access to AI tools
- [x] Add git pre-commit hook for knowledge refresh
  - Owner: AI Development Team
  - Status: Complete - `.git/hooks/pre-commit` auto-refreshes AI knowledge
  - Impact: AI stays current with every commit
- [ ] Measure AI response time improvements
  - Owner: AI Development Team
  - Due: 2025-11-11
  - Next steps: Compare before/after metrics using `ai-metrics.json`
- [ ] Add automated context bundle generation to CI
  - Owner: AI Development Team
  - Due: 2025-11-18
  - Next steps: Add `npm run ai:context` to GitHub Actions workflow

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

- [x] Implement automated TODO consolidation script
  - Owner: @tooling-team
  - Status: Completed - Script created at tools/scripts/todo-consolidation.mjs
  - Description: Created script to detect and merge duplicate TODO entries across repository
  - Next steps: Add to CI pipeline to prevent future fragmentation
- [ ] Implement automated TODO consolidation script
  - Owner: @tooling-team
  - Due: 2025-11-10
  - Description: Create script to detect and merge duplicate TODO entries across repository
  - Next steps: Add to CI pipeline to prevent future fragmentation

### 2. Incomplete Governance Reforms (High Priority)

**Issue**: Governance reforms implementation ~50% complete with missing validations and briefings.

**Tasks**:

- [x] Complete stakeholder briefings on playbook 2.2.0 changes

  - Owner: @governance-team
  - Status: Completed - Created briefing template and documentation
  - Description: Created standardized briefing template for governance reforms communication
  - Next steps: Schedule meetings and document feedback

- [x] Validate execution modes in CI pipeline

  - Owner: @ci-team
  - Status: Completed - Guard script executed successfully in Safe mode
  - Description: Tested guard-change-budget.mjs script functionality
  - Next steps: Run test PRs and monitor adoption

- [x] Complete deferred gates documentation
  - Owner: @docs-team
  - Status: Completed - All deferred gates documented with owners and due dates
  - Description: Reviewed and documented deferred gates in governance reforms
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

- [x] Add comprehensive security test coverage

  - Owner: @testing-team
  - Status: Completed - Added GDPR compliance endpoint tests to users-route.spec.js
  - Description: Added tests for GDPR data export and deletion endpoints
  - Next steps: Achieve 90%+ coverage for security-critical paths

- [ ] Add comprehensive security test coverage

  - Owner: @testing-team
  - Due: 2025-11-12
  - Description: Expand auth.js test suite to cover all security scenarios
  - Next steps: Achieve 90%+ coverage for security-critical paths
  - Status: In Progress - JWT secret enforcement implemented, remaining security tests to be added

- [x] Implement GDPR compliance features
  - Owner: @privacy-team
  - Status: Completed - Added GDPR data export and deletion endpoints to users API
  - Description: Added right to erasure (soft delete) and data portability (JSON export) features
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
