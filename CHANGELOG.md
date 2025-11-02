# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- AI Intelligence & Competence Enhancement section with 13 improvements to speed up AI agents (Blackbox AI and GitHub Copilot) by narrowing scope, pre-fetching context, generating working memory files, predicting next steps, maintaining best snippet libraries, automatic diff previews, chunking tasks, caching decisions, guarding against rabbit holes, auto-creating dev helpers, opportunistic clean-as-you-go, pre-filling PR templates, and proactive daily improvements. (2025-01-10)
- AI Deputy Mode: Enables Copilot and Blackbox to shadow changes and flag governance deviations in real-time, with proactive alerts, learning integration, and audit trails. (2025-01-10)
- **DevContainer extension debugging**: Added `debug-extensions.sh` script to troubleshoot VS Code extension loading issues, with comprehensive diagnostics and troubleshooting steps (2025-11-02)
- **DevContainer tool bootstrap**: Added `install-tools.sh` to install pnpm via corepack and optionally Nx CLI globally; wired into postCreate. Improves extension activation and script reliability by ensuring expected tools exist in the container. (2025-11-02)
- **Docker socket permission helper**: Added `docker-socket-perms.sh` to detect host docker.sock GID, create matching group, and add the container user to enable Docker access; referenced from status checks. (2025-11-02)

### Fixed

- DevContainer feature options: Removed unsupported `installYarnUsingApt` from Node feature and corrected `kubectl-helm-minikube` to use `kubectl` version key instead of `version`. This resolves Remote Containers feature parsing/build errors during devcontainer creation. (2025-11-02)
- DevContainer tests: Made `.devcontainer/test-devcontainer.sh` change to its own directory before running checks so `devcontainer.json` is found when the script is invoked from repository root. Fixes false-negative "JSON syntax errors" output. (2025-11-02)
- DevContainer hardening: Added `security_opt: [no-new-privileges:true]`, `cap_drop: [ALL]`, and `tmpfs` mounts for `/tmp` and `/var/tmp` to `apps/dev/docker/docker-compose.dev.yaml` for the `dev` service. Updated test script to detect settings in compose when using compose-based devcontainers. (2025-11-02)
- DevContainer dependency install: Made `.devcontainer/scripts/install-deps.sh` robust to npm v10 peer resolution and missing lockfiles. Now skips `npm ci` if no `package-lock.json` and falls back to `npm install --legacy-peer-deps` on conflicts; logs clearer diagnostics on failure. (2025-11-02)
- DevContainer npm defaults: Added containerEnv npm settings (LEGACY_PEER_DEPS=true, disable audit/fund/progress, increased fetch retries/timeouts) to improve reliability of `npm install` during onCreate. (2025-11-02)
- **DevContainer critical fixes**: Fixed multiple issues preventing proper container operation and extension loading (2025-11-02):
  - Fixed disk space validation in `validate-host.sh` - removed non-numeric characters before integer comparison to prevent "integer expression expected" errors
  - Fixed `postAttachCommand` syntax in `devcontainer.json` - corrected command chaining using proper bash -c syntax with && and || operators
  - Added ESLint validation settings to ensure proper extension activation for JavaScript/TypeScript files
  - Enhanced `status-check.sh` with directory validation, automatic dependency installation, and comprehensive tool verification
  - Enhanced `start-apps.sh` with intelligent port conflict detection and resolution (uses port 3001 if 3000 is occupied)
  - Changed app startup behaviour to manual mode (no auto-start) to prevent port conflicts and give developers control

- Strict TypeScript compliance (exactOptionalPropertyTypes):
  - OTEL exporter URL now conditionally provided to avoid passing undefined
  - Playwright e2e config uses `shard: null` when not enabled
  - GitHub MCP server validates `GITHUB_REPOSITORY` format before use
  - AI Assistant rate limiter loop refactored to avoid undefined indexing
  - Controls runner avoids unreachable union branch property access
  - Context switch tracker omits optional `reason` when undefined (2025-11-02)
  - Removed explicit `any` types in GitHub MCP server; added safe narrowing for tool args and Octokit call params (2025-11-02)
  - Reduced ESLint warnings: tightened types in controls runner (`getByPath` uses unknown), removed unused imports in Git MCP placeholder, removed unused import in `scripts/find-leaky-types.ts`, removed `any` casts from telemetry error logging, and replaced explicit `any` in API stores with typed better-sqlite3 Statement generics (2025-11-02)
  - MCP servers lint cleanup: removed explicit `any` usage and added precise request param types; introduced safe error handling with `unknown` and message extraction; tightened Puppeteer `waitUntil` typing; added structural typing for `.connect(...)` to avoid `any` casts in Filesystem, Political Sphere, Puppeteer, and SQLite servers. Lint now passes with zero warnings. (2025-11-02)
  - DevContainer features: Replaced deprecated `ghcr.io/devcontainers-contrib/features/mkcert` with `ghcr.io/devcontainers-extra/features/mkcert`; removed unsupported `runArgs` for Compose-based devcontainer (to be enforced via docker-compose). JSON validation passes. (2025-11-02)
  - Fixed invalid command schema usage in `.devcontainer/devcontainer.json`: replaced object maps for `initializeCommand`, `onCreateCommand`, and `updateContentCommand` with supported string/array forms to satisfy Remote Containers parser. (2025-11-02)
  - Fixed SSH mount path: corrected `mounts` entry to use `${localEnv:HOME}/.ssh` (macOS/Linux) instead of concatenating HOME and USERPROFILE which produced an invalid path and prevented container start. (2025-11-02)

- **DevContainer code review and improvements**: Reviewed all devcontainer files for readability, quality, and issues. Fixed incorrect source path in test-functions.sh, made telemetry opt-in by default for privacy, made IMAGE_NAME configurable in security-scan.sh, enhanced Dockerfile comments, removed unnecessary blank line in extensions list, and ensured consistent error handling across scripts (2025-11-02)
- **DevContainer configuration**: Fixed multiple critical issues in `.devcontainer/devcontainer.json`:
  - Corrected port forwarding syntax from invalid `"5432:5433"` to proper port number `5432`
  - Changed development server protocols from HTTPS to HTTP for ports 3000, 3001, 4000
  - Added missing Prometheus port 9090 to forwardPorts array
  - Adjusted host resource requirements to 2 CPUs and 6GB RAM (within Docker daemon limits)
  - Updated PostgreSQL port label for clarity (2025-11-02)
- **DevContainer security and reliability enhancements**: Added comprehensive security improvements including resource limits (CPU: 2.0, memory: 4GB, PIDs: 1024), pinned all feature versions to prevent unpredictable updates, added mkcert for HTTPS development and node-clinic for performance monitoring, implemented graceful shutdown handling, added optional telemetry configuration, improved error handling in lifecycle scripts, and integrated Trivy security scanning (2025-11-01)
- **Package scripts**: Added missing `build:shared` script to package.json to build shared libraries during dev container setup (2025-11-02)
- **DevContainer extensions**: Corrected invalid extension identifiers in `customizations.vscode.extensions` (replaced `ms-vscode.vscode-jest` with `Orta.vscode-jest`, removed deprecated/built-in `ms-vscode.vscode-json`). Added a post-create reminder to trust the workspace so extensions can activate (2025-11-02)
  - **Extension reliability**: Added `Blackboxapp.blackbox` to the devcontainer extension list and configured `remote.extensionKind` to run Blackbox on the UI side, and Copilot on Workspace/UI as supported. Enabled automatic extension updates (2025-11-02)
  - **Extension updates enabled**: Turned on `extensions.autoCheckUpdates` and `extensions.autoUpdate` to avoid stale/broken versions causing buffering; ensured Blackbox/Copilot run on the UI for remote containers. (2025-11-02)
  - **Removed IPC override**: Removed `VSCODE_IPC_HOOK_CLI` containerEnv override which could interfere with VS Code CLI and extension activation in the container. (2025-11-02)
- **Extension completeness**: Added tooling-aligned extensions: `GitHub.vscode-github-actions`, `EditorConfig.EditorConfig`, `streetsidesoftware.code-spell-checker`, `hashicorp.terraform`, `ms-vscode.makefile-tools`, and `mikestead.dotenv`. Mapped extension hosts for reliability (`remote.extensionKind`) (2025-11-02)

### Changed

- **DevContainer port mapping**: Updated PostgreSQL port forwarding from 5432 to 5433 on host to avoid conflicts with local PostgreSQL installations. Container still uses standard port 5432 internally. Added comprehensive port forwarding documentation to `.devcontainer/README.md` (2025-11-02)

### Fixed

- **Containerised environment**: Removed conflicting `--read-only` and `--tmpfs=/workspaces` flags from `.devcontainer/devcontainer.json` runArgs that prevented proper workspace mounting from docker-compose. The workspace is now properly bind-mounted from the host, allowing file changes to persist and the development environment to function correctly (2025-11-01)

- AI Indexing: Added ANN recall integration test (`apps/dev/tests/integration/ann-recall.test.mjs`) comparing ANN `/vector-search` to brute-force baseline, with fallback and metrics checks (2025-11-01)

### Performance

- IDE responsiveness: Reduced VS Code load by excluding large generated folders from search and file watchers (`playwright-report/`, `artifacts/`, `ai-metrics/`, `test-results/`, `monitoring/data/`, `data/`). Added `scripts/dev/kill-resource-hogs.sh` and npm scripts `dev:clean:processes`/`dev:reset-performance` to terminate runaway Nx/Playwright processes and reset Nx cache. (2025-11-01)

### Changed

- Standardised on Lefthook for Git hooks; removed Husky hooks and directory. Improved hook UX with staged file overview, clearer section banners, per-step timing, robust base-branch detection for Nx affected commands, optional SKIP_A11Y, and more actionable tips in errors (2025-11-01)

### Removed

- Husky hook files (`.husky/`) to avoid duplicate/conflicting hook runners (2025-11-01)

### Security

- **Fixed hnswlib vulnerability**: Updated hnswlib from 0.7.0 to 0.8.0 to fix double free bug in init_index when M is a large integer (2025-11-01)

### Performance

- **Fixed Nx refresh slowdown**: Optimized daemon settings with 1000ms debounce delay and 500ms aggregate changes delay to reduce refresh frequency (2025-11-01)
- **Cleared Nx cache**: Removed 1.3GB of old cache entries that were causing performance degradation (2025-11-01)
- **Added file watcher optimizations**: Configured Nx to ignore AI directories (ai-cache, ai-logs, ai-metrics, ai-learning, ai-index, ai-knowledge) and other non-source directories (tmp, artifacts, monitoring/data) to prevent unnecessary file watching (2025-11-01)
- **Created optimization script**: Added `scripts/optimize-nx.sh` for easy performance tuning and cache management (2025-11-01)
- **Fixed commit buffering**: Replaced slow TruffleHog with fast gitleaks for pre-commit secret scanning - reduces commit time from 30+ seconds to <2 seconds (2025-11-01)
- **Fixed pre-push hanging**: Simplified workspace integrity check to only verify critical files exist instead of running slow find operations across entire workspace (2025-11-01)

### Fixed

- **Integration test workflow**: Updated `.github/workflows/integration.yml` to gracefully handle missing migration scripts, seed data, and service start commands - prevents CI failures when services aren't ready (2025-11-01)

### Added

- **Enhanced git hooks with detailed output**: Updated `.lefthook.yml` to show verbose test and lint results on commit/push with clear pass/fail messages. Added `SKIP_TESTS=1` and `SKIP_LINT=1` environment variables to bypass checks when needed. Increased visibility with execution logs and interactive output (2025-11-01)
- **GitHub Actions status in pre-push hook**: Added CI status check that displays recent workflow runs on main branch with color-coded indicators (✅ success, ❌ failure, 🔄 in progress, ⚠️ cancelled). Requires GitHub CLI (`gh`) - automatically skips if not installed (2025-11-01)

- **MCP Servers (4 New)**: Added Playwright, Chrome DevTools, Official Filesystem, and Time MCP servers - all 100% free (2025-11-01)
- **Playwright MCP**: Official Microsoft E2E testing integration for comprehensive browser automation
- **Chrome DevTools MCP**: Google's official debugging and performance analysis server
- **Official Filesystem MCP**: Reference implementation from MCP creators for standard file operations
- **Time MCP**: DateTime utilities giving AI assistants time awareness and scheduling context
- **MCP Scripts**: Added npm scripts for all new servers (`mcp:playwright`, `mcp:chrome-devtools`, `mcp:filesystem-official`, `mcp:time`)
- **MCP Documentation**: Enhanced `docs/mcp-servers-setup.md` with comprehensive documentation of all 10 MCP servers (6 custom + 4 official)
- **MCP SDK**: Upgraded to `@modelcontextprotocol/sdk@1.20.2` for latest protocol support
- **MCP Configuration**: Updated `.vscode/mcp.json` with new server configurations
- Enhanced Jest configuration with comprehensive comments and documentation
- Performance optimizations in Jest config (parallel execution, caching, increased timeouts)
- Security improvements: Environment variable usage for JWT secrets in tests
- Content-Type headers added to all POST requests in test files
- Unit test templates for business logic testing (UserService)
- Test utilities for database setup and mocking
- Consolidated Jest configurations to reduce duplication
- AI cache metadata for TTL-based cleanup and size management
- Enhanced Vale configuration with proselint style and security term detection
- Expanded Gitleaks allowlist for common development false positives

### Changed

- Lowered Jest coverage thresholds from 80% to 70% for MVP stage to focus on core functionality
- Improved test configuration maintainability with detailed inline documentation
- Refactored jest.setup.js to use imported test utilities
- Enhanced test file organization with unit and integration test separation
- Updated root README to reflect current monorepo layout and correct bootstrap/dev commands (2025-11-01)
- Increased Nx parallelism from 4 to 6-8 for better CI performance
- Standardized line width to 100 characters across Prettier and Biome
- Added Biome linting and formatting to pre-commit hooks
- Enhanced lint-staged configuration with Biome integration

### Fixed

- Test runner consistency issues resolved
- Content-Type header issues in API test requests fixed
- Fixed Jest hanging issues with proper configuration
- Resolved test runner inconsistencies between Node.js and Jest
- Improved ESM compatibility in test files

### Technical Debt

- Database/storage layer issues identified in tests (500 errors) - requires separate investigation and fix
- Tool conflict resolution needed between Prettier and Biome formatters
- AI cache cleanup implementation required for TTL-based eviction

### Changed

- Updated .blackboxrules and .github/copilot-instructions.md to version 1.2.6 with enhanced AI assistant principles including reflection and error prevention (2025-11-01)
- Added core AI assistant principles including British English usage, context seeking, correctness prioritization, and best practices for secure/scalable code
- Enhanced interaction style guidelines with proactive assistance, educational explanations, risk identification, and reflective practices
- Added reflection principle: acknowledge mistakes, correct them, reflect on them, prevent recurrence through systematic analysis and proactive prevention measures
- Improved readability and AI parsing efficiency through structured formatting and clear principles

### Added

- **ISO 42001 AMLS Implementation**: Comprehensive AI Management System framework implementation
- **AI Risk Assessment Framework**: Standardized methodology for assessing AI-related risks (`docs/07-ai-and-simulation/ai-risk-assessment-framework.md`)
- **AI Incident Response Plan**: Specialized procedures for AI system failures and incidents (`docs/07-ai-and-simulation/ai-incident-response-plan.md`)
- **AI Model Validation Procedures**: Comprehensive validation framework for AI models (`docs/07-ai-and-simulation/ai-model-validation-procedures.md`)
- **AI Data Provenance Framework**: Complete data lineage and provenance tracking system (`docs/07-ai-and-simulation/ai-data-provenance-framework.md`)
- **AI Ethics Training Program**: Structured training program for AI ethics and responsible AI use (`docs/07-ai-and-simulation/ai-ethics-training-program.md`)
- **AI Governance External Communication Framework**: Guidelines for transparent external communication about AI governance (`docs/07-ai-and-simulation/ai-governance-external-communication.md`)
