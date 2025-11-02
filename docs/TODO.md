# Consolidated TODO List - Political Sphere

## Completed Tasks

- [x] Fixed strict TypeScript errors uncovered by `exactOptionalPropertyTypes`:
  - OTEL exporter URL conditional assignment
  - Playwright e2e config shard set to `null` when disabled
  - GitHub MCP server validates `GITHUB_REPOSITORY` and guards owner/repo
  - AI Assistant rate limiter loop avoids undefined element access
  - Controls runner unknown-type branch no longer references unreachable properties
  - Context switch tracker avoids assigning `undefined` to optional property (2025-11-02)

- [x] Standardised on Lefthook for Git hooks; removed Husky and enhanced hook output (staged overview, timings, robust base detection, SKIP_A11Y) (2025-11-01)
- [x] Removed invalid NX_CLOUD_ACCESS_TOKEN from CI workflow
- [x] Renamed files to follow kebab-case naming convention (newsService.js → news-service.js, httpUtils.js → http-utils.js)
- [x] Cleaned up unused code in news-service.js (removed NEWS_ALLOWED_STATUSES import, normalizeStatus function)
- [x] Updated TypeScript config to resolve deprecation warnings (moduleResolution to "bundler", added ignoreDeprecations)
- [x] Updated import paths in dependent files (server.js, index.js)
- [x] Added Status metadata to all 216 documentation files (2025-10-30)
- [x] Enhanced setup.sh script with security, reliability, and maintainability improvements (2025-10-30)
- [x] Added advanced features to setup.sh: CLI options, configurable URLs, container detection, enhanced logging, dry-run mode, Node.js version validation, progress indicators, retry logic, and configuration file support (2025-10-30)
- [x] Moved misplaced root assets to correct locations: documentation files to /docs/, AI assets to /ai-learning/ and /ai-metrics/ (2025-10-30)
- [x] Consolidated all TODO lists into single categorized document (2025-10-30)
- [x] Fixed critical JSON syntax error in .devcontainer/devcontainer.json (duplicate postCreateCommand block) (2025-11-01)
- [x] Enhanced .devcontainer security: improved password generation with high entropy, added security warnings, fixed Redis password handling (2025-11-01)
- [x] Improved .devcontainer script reliability: enhanced error handling in validate-host.sh, wait-for-services.sh, and status-check.sh (2025-11-01)
- [x] Optimized .devcontainer performance: reduced resource allocation (2 CPUs/4GB), added tmpfs mounts, implemented read-only filesystem (2025-11-01)
- [x] Updated .devcontainer documentation: enhanced README.md and WELCOME.txt with performance and security details (2025-11-01)
- [x] Created comprehensive .devcontainer tests: test-devcontainer.sh validates JSON, scripts, security, and performance configurations (2025-11-01)
- [x] Consolidated duplicate TypeScript configs for MCP servers under `apps/dev/mcp-servers/tsconfig.base.json` and updated package tsconfig files to extend it (2025-11-01)
- [x] Removed duplicate LICENSE files from `libs/infrastructure` and `libs/platform` in favor of repository root LICENSE (2025-11-01)
- [x] Fixed missing domain type exports from `@political-sphere/shared` library - added export of User, Party, Bill, Vote types and Zod schemas (2025-11-01)
- [x] Fixed TypeScript build configuration for shared library to generate proper dist structure (2025-11-01)
- [x] Updated Jest configuration to support TypeScript and resolve shared library imports (2025-11-01)
- [x] Resolved 66 TypeScript compilation errors across API stores, services, and routes (2025-11-01)
- [x] Fixed Playwright a11y config naming to comply with ESLint regex; removed duplicate configs and updated script reference (2025-11-02)
- [x] Fixed all 6 TypeScript lint errors (inferrable types, non-null assertions) - reduced from 72 to 65 warnings (2025-11-02)
- [x] Updated README.md with comprehensive CI/CD documentation: security scanning, supply-chain, observability, performance budgets, controls system, AI features, workflow badges, and troubleshooting (2025-11-02)
- [x] Fixed controls runner by switching from ts-node/esm to tsx; all governance gates now execute properly (2025-11-02)
- [x] Removed explicit `any` types in GitHub MCP server; added safe narrowing for tool args and Octokit params (2025-11-02)
- [x] Reduced ESLint warnings across custom MCP servers (filesystem, political-sphere, puppeteer, sqlite) by removing explicit `any`, adding precise request param types, safe `unknown` error handling, and structural `.connect(...)` typing; lint now passes with zero warnings (2025-11-02)
- [x] DevContainer maintenance: Switched mkcert feature from deprecated `devcontainers-contrib` to `devcontainers-extra`; removed unsupported `runArgs` in Compose-based setup (follow-up: move constraints to docker-compose). JSON check passes. (2025-11-02)

## Foundation & Strategy (High Priority)

### Foundation Documents Completion

- [x] Edit docs/00-foundation/README.md - Add comprehensive overview of the foundation section
- [x] Edit docs/00-foundation/vision-mission.md - Define clear vision statement for Political Sphere
- [x] Edit docs/00-foundation/core-values-ethics.md - Define core company values and ethical framework
- [x] Edit docs/00-foundation/business-model-overview.md - Describe revenue streams and business model
- [ ] Edit docs/00-foundation/product-principles.md - Establish product development principles
- [ ] Edit docs/00-foundation/success-metrics-north-star.md - Define north star metric and KPIs
- [ ] Edit docs/00-foundation/personas-and-use-cases.md - Define user personas and use cases
- [ ] Edit docs/00-foundation/stakeholder-map.md - Map key stakeholders and engagement strategies
- [ ] Edit docs/00-foundation/market-brief.md - Analyze target market and competitive landscape
- [ ] Edit docs/00-foundation/glossary-domain-concepts.md - Create comprehensive glossary

### Strategy Documents Updates

- [x] Update docs/01-strategy/README.md with comprehensive overview
- [x] Populate docs/01-strategy/product-strategy.md with core vision and mission
- [x] Populate docs/01-strategy/objectives-and-key-results-okrs.md with detailed OKRs
- [x] Populate docs/01-strategy/risked-assumptions-and-bets.md with challenges and risks
- [x] Populate internationalization-localization-strategy.md with i18n plans
- [x] Populate partnerships-and-education-strategy.md with potential frameworks
- [x] Populate platform-strategy-multiplayer-simulation.md with technical details
- [x] Populate pricing-and-packaging-strategy.md with monetization model
- [x] Populate strategic-roadmap-03-12-36-months.md with phased milestones
- [x] Update `docs/01-strategy/ai-strategy-and-differentiation.md` with audience, regulatory, data policy, governance (appeals SLAs), explainability & audit logging schema, and operational guidance (2025-11-01)

## AI Intelligence & Speed Enhancement (Critical Priority)

### Completed AI Performance Improvements

- [x] Implemented async code-indexer with bounded concurrency and inverted semantic map (2025-11-01)
- [x] Added simhash-based approximate candidate narrowing with prefix buckets (2025-11-01)
- [x] Built incremental indexer using git diff for delta updates (2025-11-01)
- [x] Created lightweight TF-hashing embeddings (128-dim) and semantic-vectors.json (2025-11-01)
- [x] Implemented in-memory index server with /vector-search endpoint (2025-11-01)
- [x] Built Python HNSW ANN microservice for fast approximate nearest neighbor search (2025-11-01)
- [x] Integrated ANN backend into index-server with graceful fallback and Prometheus metrics (2025-11-01)
- [x] Hardened ANN service output: clamped distances, normalized scores, ensured finite values (2025-11-01)
- [x] Created comprehensive ANN service documentation (README.md) (2025-11-01)
- [x] Updated CI workflow for ANN index build and artifact caching (2025-11-01)
- [x] Validated full integration: 100% ANN success rate, finite scores, clean logs (2025-11-01)
- [x] Optimize AI code indexer with incremental builds based on git commits (2025-11-01)
- [x] Improve AI cache management with better TTL and LRU eviction (2025-11-01)
- [x] Add parallelism to AI context preloader for faster initialization (2025-11-01)
- [x] Integrate AI tooling initialization into bootstrap process (2025-11-01)
- [x] Enhance environment validation with AI-specific checks (2025-11-01)
- [x] Upgrade smoke tests with comprehensive error handling and validation (2025-11-01)
- [x] Add performance tuning controls to ai-controls.json (2025-11-01)
- [x] Implement resource monitoring to prevent development resource hogs (2025-11-01)

### Pending AI Improvements

- [x] Add unit tests for ANN integration (compare recall vs brute-force) — implemented `apps/dev/tests/integration/ann-recall.test.mjs` with optional ANN-backed comparison, fallback and metrics checks (2025-11-01)
- [ ] Implement Grafana dashboards for vector-search latency and ANN metrics
- [ ] Create production deployment guide for ANN service (systemd, gunicorn, health checks)
- [ ] Explore higher-quality embeddings (sentence-transformers, OpenAI embeddings) for improved recall
- [ ] Add CI/CD metrics collection for AI performance tracking
- [ ] Implement automated rule updates and compliance checks
- [ ] Create dashboards for AI competence and system health monitoring

## Architecture & Implementation (Critical Priority)

### Core Domain Implementation

- [ ] Implement parliamentary domain rules (calendar/sessions, bill lifecycle, debate states, divisions, FPTP elections)
- [ ] Implement tenancy and data partitioning with row-level tenancy using tenant_id and RLS policies
- [ ] Implement data models and aggregates (User, PlayerProfile, Party, MP, Debate, Vote, AuditEvent)
- [ ] Implement API surface with GraphQL queries/mutations/subscriptions and REST endpoints
- [ ] Implement realtime and eventing using WS transport, NATS domain events, and outbox pattern
- [ ] Implement NPC/AI simulation layer with tick loop, agent policies, deterministic core + stochastic LLM planner
- [ ] Implement caching and performance optimizations with Redis read-through cache

### Module Boundaries & Type Safety (New)

- [x] Enforce Nx module boundaries in `nx.json` and ESLint with `@nx/enforce-module-boundaries` (2025-11-02)
- [x] Enable strict TypeScript options globally in `tsconfig.base.json` (2025-11-02)
- [ ] Remediate any new lint/type errors surfaced by the stricter rules (owners: all code areas)

### Security & Compliance (Critical Priority)

- [ ] Implement secure secret management using KMS/SM for all sensitive data
- [ ] Add GDPR compliance checks for AI features, telemetry, and data processing
- [ ] Enforce RBAC/ABAC policy matrix in the policy layer with server-side evaluation
- [ ] Implement safety and moderation workflow with classifier signals, triage SLA, and appeals process
- [ ] Establish security threat model mitigations (OIDC/MFA, input validation, audit logging, rate limiting)

## Assistant Tooling & Performance (Medium Priority)

### Assistant Tooling Enhancements

- [x] Implement telemetry dashboard for AI suggestions metrics (acceptance rate, edit distance, time-to-merge)
- [x] Set up structured logging for Copilot experiments with monthly summaries
- [x] Add guard script extensions with static analysis (npm run lint:boundaries) gated behind GUARD_MODE=strict
- [x] Enable Nx target graphs for affected tests and connect Nx Cloud remote cache
- [x] Implement fast-mode cache fast-path in local Blackbox assistant and telemetry capture (2025-11-01)
- [x] Seed AI pre-cache from README and package.json scripts to improve cache hit rate (2025-11-01)
- [x] Update governance rule sets to include AI indexing & warm-start operational guidance, FAST_AI recommendations, in-memory index server, CI warmed-index persistence and helper scripts; bumped rule versions to 1.2.3 (2025-11-01)

### Governance Controls (New)

- [x] Add machine-checkable controls catalogue at `docs/controls.yml` (2025-11-02)
- [x] Implement `scripts/controls-runner.ts` to parse and execute controls with CI-friendly output (2025-11-02)
- [x] Add `.github/workflows/controls.yml` to run controls on PR and push to main (2025-11-02)

### Performance & Infrastructure

- [x] Address high CPU usage patterns in microservices with optimization strategies
- [x] Implement auto-scaling configurations with resource limits and scaling triggers
- [x] Optimize resource usage across services with efficient resource management
- [x] Set up performance monitoring and alerts with dashboards and alerting

### IDE Performance & Developer Experience

- [x] Reduce VS Code load by excluding heavy generated folders from search and file watchers (`playwright-report/`, `artifacts/`, `ai-metrics/`, `test-results/`, `monitoring/data/`, `data/`) (2025-11-01)
- [x] Add `scripts/dev/kill-resource-hogs.sh` and npm scripts (`dev:clean:processes`, `dev:reset-performance`) to quickly kill runaway Nx/Playwright processes and reset Nx cache (2025-11-01)
- [ ] Investigate Nx Console extension auto-running `nx run-many` tasks on workspace open; document recommended settings or disable-by-default guidance (owner: Platform Eng)
- [ ] Evaluate `.mcp.json` server list for minimal default footprint; consider sample config enabling only filesystem by default and document opt-in for others

## Developer Experience & Quality (Medium Priority)

### Testing & Validation

- [ ] Standardize testing framework with Jest, factories, contract tests, Playwright E2E, load testing with k6, a11y checks
- [ ] Implement proper database layer with PostgreSQL, migrations, indexes, N+1 avoidance using GraphQL dataloaders
- [ ] Implement Redis for rate limiting, caching, and session management
- [ ] Remove duplicate exports and consolidate utilities following naming conventions

### Follow-ups

- [ ] Rename CI helper scripts from `husky-lefthook-*.mjs` to `git-hooks-*.mjs` for clarity (non-functional change)

### Documentation & Onboarding

- [ ] Enhance documentation and onboarding guides with ADR template usage and glossary expansion
- [ ] Simplify npm scripts organization and integrate Biome into linting pipeline
- [ ] Add markdown and documentation linting to pre-commit hooks

## CI/CD & Operations (Medium Priority)

### CI/CD Implementation

- [ ] Implement CI/CD workflows with GitHub Actions for lint, typecheck, unit, build, e2e, security scans, releases
- [ ] Implement selective CI triggers based on changed files and add Docker build caching/optimization
- [ ] Optimize workflow concurrency, resource allocation, and implement cost guardrails

- [x] Add AI maintenance workflow to run code-indexer, pre-cache, and context preloader on push to `main` and nightly schedule; upload artifacts (ai-index, ai-cache). (2025-11-01)

### Recent governance updates (completed)

- [x] Add CI parity check to enforce that edits to `.github/copilot-instructions.md` and `.blackboxrules` are made together (2025-11-01)
- [x] Add `.github/PULL_REQUEST_TEMPLATE/rule-update.md` and update governance guidance to require CHANGELOG and TODO updates for rule edits (2025-11-01)
- [x] Update `.github/copilot-instructions.md` and `.blackboxrules` with Core Engineering Behaviour (AI MUST), Self-Audit Protocol, Technical Guardrails, Testing Doctrine, Security Protocol, Observability & maintainability, Failure Mode Behaviour, Continuous Improvement Loop, and Operational Output Format; bumped versions to 1.3.0 (2025-11-02)

### Operations & Reliability

- [ ] Implement backup and DR with PITR, versioning, and tested restores
- [ ] Implement migration and compatibility with safe DB migrations and API deprecations
- [ ] Implement observability with OpenTelemetry tracing, structured logging, dashboards, SLO alerting

## Recovery & Maintenance (Low Priority)

### File Recovery

- [ ] Apply remaining stashes: stash@{7} (528 files), stash@{5} (309 files), stash@{4} (309 files), stash@{2} (160 files), stash@{0} (4 files), stash@{6} (1 file)
- [ ] Resolve merge conflicts and commit applied changes
- [ ] Verify all files are present and test project functionality
- [ ] Clean up stashes after successful recovery

## Project Alignment & Structure (Completed)

### Directory Structure & Naming

- [x] Audit directory structure and identify misalignments
- [x] Add structured metadata header to key files (governance.js, package.json)
- [x] Enforce naming schema across project (kebab-case for files/directories)
- [x] Review and enforce hierarchical clarity with modular structure
- [x] Enhance CI/CD configs for integrity enforcement
- [x] Update docs/architecture.md with formal documentation of conventions

## Notes

- This consolidated TODO list replaces all individual TODO-\*.md files for better organization and discoverability
- Tasks are categorized by priority and area for focused execution
- All changes must comply with .blackboxrules (security, GDPR, EU AI Act)
- Critical security and compliance tasks take precedence
- Foundation documents provide strategic direction for implementation
- Assistant tooling improvements enhance development efficiency
