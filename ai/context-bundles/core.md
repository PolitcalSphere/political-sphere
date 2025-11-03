# Core Project Context

> Generated: 2025-11-03T19:06:07.576Z

## README.md

```
# Political Sphere — Monorepo (developer workspace)

[![Version](https://img.shields.io/badge/version-1.2.6-blue.svg)](CHANGELOG.md)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> A democratically-governed multiplayer political simulation game with strict constitutional governance. Built as a monorepo using Nx, featuring React frontend, Node.js/NestJS backend, comprehensive testing, and AI-assisted development tooling.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)

## Overview

Political Sphere is a multiplayer political simulation platform that enables democratic governance through technology. The project emphasizes ethical AI use, zero-trust security, and WCAG 2.2 AA+ accessibility compliance.

## Key Features

- **Democratic Governance**: Constitutional framework with transparent decision-making
- **Multiplayer Simulation**: Real-time political scenario modeling
- **Ethical AI Integration**: AI assistants with strict governance boundaries
- **Comprehensive Testing**: Unit, integration, e2e, accessibility, and security testing
- **Zero-Trust Security**: End-to-end encryption and auditability
- **Accessibility First**: WCAG 2.2 AA+ compliance across all interfaces

## Architecture

The project follows a modular monorepo architecture:

- **Frontend**: React with TypeScript, Tailwind CSS, Module Federation
- **Backend**: Node.js/NestJS with TypeScript, REST APIs
- **Infrastructure**: Docker, Kubernetes, Terraform for cloud deployment
- **Testing**: Jest, Playwright, comprehensive test automation
- **CI/CD**: GitHub Actions with security scanning, supply-chain hardening, and progressive delivery
- **AI Tooling**: Custom AI assistants for code review, performance monitoring, and governance
- **Observability**: OpenTelemetry instrumentation, structured logging, performance budgets
- **Security**: Gitleaks secret scanning, Semgrep SAST, optional CodeQL, SLSA provenance

## Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm (or compatible package manager)
- Docker & Docker Compose (recommended)

### Installation

```bash
npm ci
npm run bootstrap
```

### Development

```bash
npm run dev:all  # Start all services
# or individual services:
npm run dev:api
npm run dev:frontend
```

## Project Structure

```
apps/          # Applications (api, frontend, worker)
libs/          # Shared libraries (ui, platform, infrastructure, shared)
docs/          # Comprehensive documentation and ADRs
scripts/       # Automation scripts and utilities
ai-*           # AI tooling and assets (cache, learning, metrics)
tools/         # Build tools and utilities
.github/       # GitHub workflows and templates
```

## Development

### Available Commands

- `npm run lint` — ESLint across repo with Nx boundary checking
- `npm run format` — Prettier formatting with Biome integration
- `npm run test` — Jest unit tests with coverage reporting
- `npm run test:e2e` — Playwright end-to-end tests
- `npm run build` — Nx build with caching and parallelization
- `npm run typecheck` — TypeScript compilation checking

### Development Servers

- `npm run dev:api` — Start API server with hot reload
- `npm run dev:frontend` — Start frontend with webpack dev server
- `npm run dev:all` — Start all services with Docker Compose

### AI-Assisted Development

- `npm run ai:review` — AI code review and suggestions
- `npm run ai:blackbox` — Governance compliance checking
- `npm run ai:performance` — Performance monitoring and optimization

### Quality Gates & Governance

- `npm run controls:run` — Execute machine-checkable governance controls
- `npm run lint:boundaries` — Verify Nx module boundary compliance
- `npm run test:a11y` — WCAG 2.2 AA+ accessibility validation
- `npm run docs:lint` — Markdown and spelling checks

## CI/CD & Quality Infrastructure

[![Controls](https://github.com/PolitcalSphere/political-sphere/actions/workflows/controls.yml/badge.svg)](https://github.com/PolitcalSphere/political-sphere/actions/workflows/controls.yml)
[![Security Scan](https://github.com/PolitcalSphere/political-sphere/actions/workflows/security-scan.yml/badge.svg)](https://github.com/PolitcalSphere/political-sphere/actions/workflows/security-scan.yml)
[![Supply Chain](https://github.com/PolitcalSphere/political-sphere/actions/workflows/supply-chain.yml/badge.svg)](https://github.com/PolitcalSphere/political-sphere/actions/workflows/supply-chain.yml)

### Automated Quality Gates

The project enforces comprehensive quality standards through automated CI/CD pipelines:

#### **Governance Controls** (`.github/workflows/controls.yml`)

Machine-checkable rules defined in `docs/controls.yml`:

- ✅ PR mandatory headers validation
- ✅ ESLint zero-warning policy
- ✅ TypeScript strict typecheck
- ✅ Unit & integration tests
- ✅ Documentation linting
- ✅ Import boundary enforcement
- ✅ Accessibility validation
- ✅ Secret scanning

#### **Security Scanning** (`.github/workflows/security-scan.yml`)

Multi-layer security analysis:

- **Gitleaks**: Secret detection with redaction
- **Semgrep**: Custom SAST rules (console.log forbidden, ADR enforcement)
- **CodeQL**: Optional deep code analysis (main branch only)
- **SARIF Upload**: Security alerts integration

#### **Supply Chain Hardening** (`.github/workflows/supply-chain.yml`)

SLSA Level 2 provenance:

- **SBOM Generation**: CycloneDX bill of materials
- **Build Provenance**: Cryptographic attestation of build artifacts
- **Artifact Upload**: Versioned SBOM tracking

#### **Observability Verification** (`.github/workflows/observability-verify.yml`)

Runtime readiness checks:

- **OTEL Endpoint**: Validates observability configuration on main
- **Trace Instrumentation**: Ensures OpenTelemetry bootstrap present

#### **Performance Budgets** (`.github/workflows/performance.yml`)

k6 smoke tests with thresholds:

- **API**: p95 < 200ms, error rate < 1%
- **Frontend**: p95 < 500ms, cold start < 2s
- **Worker**: p95 < 100ms, error rate < 0.1%

### Required Secrets

Configure these in GitHub repository settings for full CI/CD functionality:

- `PERF_BASE_URL`: Performance testing endpoint (optional, skips if unset)
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OpenTelemetry collector endpoint (required for observability verification on main)

## Testing

The project maintains comprehensive test coverage across multiple dimensions:

- **Unit Tests**: Jest with 80%+ coverage target for critical paths
- **Integration Tests**: API and service interactions with real dependencies
- **E2E Tests**: Playwright for critical user journeys with visual regression
- **Accessibility Tests**: Automated WCAG 2.2 AA+ validation (zero serious+ violations policy)
- **Security Tests**: OWASP Top 10, secret detection, and dependency scanning
- **Performance Tests**: k6 smoke tests with p95 latency budgets

Run tests with:

```bash
npm run test              # Unit tests with coverage
npm run test:e2e          # End-to-end tests (Playwright)
npm run test:a11y         # Accessibility tests (axe-core)
npm run test:integration  # Integration test suite
```

### Test Configuration

- **Jest**: ESM-compatible with TypeScript transformation
- **Playwright**: Chromium engine for a11y tests (`playwright-accessibility-config.ts`)
- **Coverage**: NYC/Istanbul with branch and statement thresholds
- **Parallel Execution**: Nx affected tests with remote caching

## Contributing

See [Contributing Guide](docs/contributing.md) and [.blackboxrules](.blackboxrules) for governance rules.

### Development Workflow

1. Fork and create feature branch
2. Follow conventional commits
3. Ensure tests pass and coverage maintained
4. Run `npm run ai:review` for AI-assisted code review
5. Submit PR with comprehensive description

## Documentation

### Core Documentation

- [Architecture Decision Records](docs/architecture/decisions/) — Technical decisions with context and alternatives
- [API Documentation](docs/api.md) — REST and GraphQL endpoint references
- [Security Guidelines](docs/SECURITY.md) — Threat model, compliance, and reporting
- [Contributing Guide](docs/contributing.md) — Development workflow and standards

### Governance & Compliance

- [Controls Catalogue](docs/controls.yml) — Machine-checkable governance rules
- [Governance Rules](.blackboxrules) — AI assistant and developer governance
- [TODO List](docs/TODO.md) — Single source of truth for project tasks
- [CHANGELOG](docs/CHANGELOG.md) — Version history and notable changes

### Operations & Observability

- [Observability Guide](monitoring/otel-instrumentation.md) — OpenTelemetry setup
- [Performance Budgets](apps/*/budgets.json) — Service-level latency/error thresholds
- [Disaster Recovery](docs/DISASTER-RECOVERY-RUNBOOK.md) — Incident response procedures

## Troubleshooting

### Common Issues

**Build Failures**

- Ensure Node.js 18+ is installed
- Run `npm ci` to install dependencies
- Check Nx cache: `npx nx reset`

**Test Failures**

- Database issues: Ensure Docker services are running
- Coverage low: Focus on critical path tests first
- ESM issues: Check jest.config.cjs for module resolution

**AI Tooling Issues**

- Cache problems: Clear `ai-cache/` directory
- Performance slow: Enable FAST_AI mode with `FAST_AI=1`

**Pre-commit Hook Failures**

- Linting: Run `npm run lint` and fix issues
- Secrets: Remove any hardcoded credentials
- Boundaries: Check import paths follow Nx rules

**CI/CD Pipeline Failures**

- Controls failing: Review `docs/controls.yml` for specific requirements
- Security scan alerts: Check Gitleaks/Semgrep output, rotate exposed secrets immediately
- Build provenance: Ensure dist artifacts are generated before attestation
- Performance budget exceeded: Review k6 output and optimize hot paths

### AI Intelligence Features

The project includes advanced AI tooling for faster development:

- **Code Indexing**: Incremental semantic search with HNSW ANN (640-file corpus, 128-dim embeddings)
- **Context Preloading**: Pre-caches README, package.json, and common patterns
- **In-Memory Index Server**: Fast vector search at `/vector-search` endpoint
- **Novelty Guard**: Jaccard-based detection to prevent AI loops
- **Competence Monitoring**: Tracks AI suggestion quality and architectural decisions
- **Performance Monitoring**: Measures cache hit rates, response times, and recall metrics

Enable fast mode with `FAST_AI=1` for reduced latency during development.

### Getting Help

- Check [CHANGELOG.md](docs/CHANGELOG.md) for recent changes
- Review [TODO.md](docs/TODO.md) for known issues and planned work
- Run `npm run validate:env` to check environment setup
- Search [docs/](docs/) for specific topics or guidelines

---

_Last updated: 2025-11-02_
```

## docs/TODO.md

```
# TODO: Complete Document-Control Folder

<div align="center">

| Classification | Version | Last Updated |       Owner        | Review Cycle |  Status   |
| :------------: | :-----: | :----------: | :----------------: | :----------: | :-------: |
|  🔒 Internal   | `0.1.0` |  2025-10-30  | Documentation Team |  Quarterly   | **Draft** |

</div>

---

## Overview

Complete the document-control folder by filling in content for placeholder documents. The templates-index.md is already complete. All content must be production-grade, aligned with Political Sphere's context (political simulation, AI, microservices), and comply with .blackboxrules (security, GDPR, EU AI Act, etc.).

## Tasks

### 1. Edit docs/document-control/README.md

- [x] Add comprehensive overview of the document control system
- [x] Include purpose, scope, and key principles
- [x] Document control metadata and compliance notes

### 2. Edit docs/document-control/change-log.md

- [x] Create change log for document and template updates
- [x] Include version history, change descriptions, and impact
- [x] Add template for logging new changes

### 3. Edit docs/document-control/document-classification-policy.md

- [x] Define classification levels (Public, Internal, Confidential, Restricted)
- [x] Specify handling procedures for each level
- [x] Include examples relevant to Political Sphere (e.g., AI models, user data)

### 4. Edit docs/document-control/retention-and-archiving-policy.md

- [x] Define retention periods for different document types
- [x] Outline archiving procedures and media
- [x] Include compliance with GDPR and other regulations

### 5. Edit docs/document-control/review-and-approval-workflow.md

- [x] Describe review and approval processes
- [x] Define approval tiers and required reviewers
- [x] Include escalation procedures and timelines

### 6. Edit docs/document-control/versioning-policy.md

- [ ] Establish versioning rules for documents and templates
- [ ] Define semantic versioning (MAJOR.MINOR.PATCH)
- [ ] Include branching and tagging strategies

### 7. Validation and Final Checks

- [ ] Run linting on all edited files (markdownlint, etc.)
- [ ] Ensure all documents reference each other appropriately
- [ ] Verify compliance with .blackboxrules
- [ ] Update any cross-references if needed

## Completed Tasks

### Governance Rule Modularization (2025-01-10)

- [x] Split `.github/copilot-instructions.md` into 10 focused sub-files for maintainability
- [x] Created Table of Contents with links to sub-files
- [x] Updated `.blackboxrules` in parallel per Meta-Rule
- [x] Bumped versions to 1.3.2 in both files
- [x] Added CHANGELOG entry documenting the change
- [x] Verified parity between rule files
- [x] Added AI Agent Reading Requirements and Rule Organization & Reading Protocol to both rule files

## Notes

- All documents should include document control metadata at the bottom.
- Content should be accessible, inclusive, and follow plain language principles.
- Consider AI/ML and political simulation specific examples where relevant.
- Potential risks: Legal review may be needed for sensitive policies; flag if content touches on unapproved areas.
```

## docs/controls.yml

```
# Controls Catalogue for Political Sphere
# Typed source for governance controls - compiled to YAML

controls:
  # Foundation & Governance
  GOV-01:
    name: 'Constitutional Compliance'
    category: 'governance'
    severity: 'blocker'
    description: 'Project must comply with .blackboxrules constitution'
    evidence: '.blackboxrules exists and contains neutrality/anti-manipulation clauses'
    fix: 'Add missing constitutional safeguards'
    owner: 'Technical Governance Committee'

  GOV-02:
    name: 'Rule Parity'
    category: 'governance'
    severity: 'blocker'
    description: 'Changes to .blackboxrules must be mirrored in .github/copilot-instructions.md'
    evidence: 'Both files updated simultaneously with matching version/date'
    fix: 'Update both rule files and increment version'
    owner: 'Technical Governance Committee'

  # Security Controls
  SEC-01:
    name: 'Secret Scanning'
    category: 'security'
    severity: 'blocker'
    description: 'No secrets committed to repository'
    evidence: 'gitleaks scan passes'
    fix: 'Remove secrets and rotate if exposed'
    owner: 'Security Team'

  SEC-02:
    name: 'Dependency Vulnerabilities'
    category: 'security'
    severity: 'warning'
    description: 'No high/critical vulnerabilities in dependencies'
    evidence: 'pnpm audit/npm audit clean'
    fix: 'Update vulnerable packages'
    owner: 'Platform Team'

  SEC-03:
    name: 'SAST Scanning'
    category: 'security'
    severity: 'warning'
    description: 'No security issues in source code'
    evidence: 'Semgrep scan passes'
    fix: 'Fix identified security issues'
    owner: 'Development Teams'

  # Quality Controls
  QUAL-01:
    name: 'Code Linting'
    category: 'code-quality'
    severity: 'blocker'
    description: 'Code passes ESLint/Biome rules'
    evidence: 'Linting passes with zero errors'
    fix: 'Fix linting violations'
    owner: 'Development Teams'

  QUAL-02:
    name: 'Type Safety'
    category: 'code-quality'
    severity: 'blocker'
    description: 'TypeScript compilation succeeds'
    evidence: 'tsc --noEmit passes'
    fix: 'Fix type errors'
    owner: 'Development Teams'

  QUAL-03:
    name: 'Test Coverage'
    category: 'testing'
    severity: 'warning'
    description: 'Unit tests cover critical paths'
    evidence: 'Coverage meets thresholds'
    fix: 'Add missing test coverage'
    owner: 'Development Teams'

  # Accessibility Controls
  A11Y-01:
    name: 'WCAG Compliance'
    category: 'accessibility'
    severity: 'blocker'
    description: 'UI meets WCAG 2.2 AA standards'
    evidence: 'Automated a11y tests pass'
    fix: 'Fix accessibility violations'
    owner: 'UX Team'

  # AI Governance Controls
  AI-01:
    name: 'AI Neutrality'
    category: 'ai-governance'
    severity: 'blocker'
    description: 'AI systems maintain political neutrality'
    evidence: 'Neutrality tests pass'
    fix: 'Implement neutrality safeguards'
    owner: 'AI Governance Committee'

  AI-02:
    name: 'AI Fairness'
    category: 'ai-governance'
    severity: 'warning'
    description: 'AI outputs are fair and unbiased'
    evidence: 'Bias detection passes'
    fix: 'Address identified biases'
    owner: 'AI Governance Committee'

  # Privacy Controls
  PRIV-01:
    name: 'Data Minimization'
    category: 'privacy'
    severity: 'warning'
    description: 'Only necessary data collected'
    evidence: 'Privacy impact assessment completed'
    fix: 'Remove unnecessary data collection'
    owner: 'Privacy Officer'

  # Operational Controls
  OPS-01:
    name: 'Observability'
    category: 'operations'
    severity: 'warning'
    description: 'Systems are observable'
    evidence: 'Monitoring/logging/tracing implemented'
    fix: 'Add observability instrumentation'
    owner: 'Platform Team'

  OPS-02:
    name: 'Incident Response'
    category: 'operations'
    severity: 'info'
    description: 'Incident response procedures exist'
    evidence: 'Runbooks and playbooks documented'
    fix: 'Create incident response documentation'
    owner: 'Operations Team'

# Control Execution Modes
execution_modes:
  safe:
    controls: [GOV-01, GOV-02, SEC-01, QUAL-01, QUAL-02, A11Y-01, AI-01]
    description: 'Full compliance required'

  fast-secure:
    controls: [SEC-01, QUAL-02, AI-01]
    description: 'Security and types only, defer others to TODO'

  audit:
    controls:
      [
        GOV-01,
        GOV-02,
        SEC-01,
        SEC-02,
        SEC-03,
        QUAL-01,
        QUAL-02,
        QUAL-03,
        A11Y-01,
        AI-01,
        AI-02,
        PRIV-01,
        OPS-01,
        OPS-02,
      ]
    description: 'Comprehensive audit with full artefact capture'

  r-and-d:
    controls: [SEC-01, AI-01]
    description: 'Minimal controls for experimental work'
```

## ai/ai-knowledge/project-context.md

```
# Political Sphere Project Context

## Overview
Political Sphere is a democratically-governed political simulation platform. The current codebase focuses on a lightweight gameplay loop, compliance tooling, and auditing of AI interventions. The repository is organised as a multi-package workspace with a mixture of JavaScript and TypeScript services rather than a fully-generated Nx environment.

## Active Components
- **API Service (`apps/api`)**  
  Plain Node.js HTTP server that exposes JSON endpoints for political entities (users, parties, bills, votes). Persistence relies on SQLite via `better-sqlite3`, with hand-written migration files.
- **Game Server (`apps/game-server`)**  
  Express application that maintains in-memory game state, persists snapshots to SQLite, and brokers content moderation/age verification flows.
- **Frontend Shell (`apps/frontend`)**  
  Static-serving Node.js server that renders a React dashboard from prebuilt assets in `apps/frontend/public`, enriching the template with live API data at request time.

## Supporting Libraries
- **`libs/shared`** – Precompiled CommonJS utilities (logging, security helpers, telemetry adapters) consumed by the runtime services.
- **`libs/game-engine`** – Turn progression helpers referenced by the game server.
- Additional libraries (`libs/platform`, `libs/ui`, …) are in-progress scaffolding and may contain TypeScript sources that are not part of the active runtime.

## Data & Storage
- Primary store: SQLite databases that live under `apps/api/data/` and `apps/game-server/data/`.
- Migrations: `apps/api/src/migrations/` contains sequential SQL/JS migration scripts plus validation helpers.
- Observability: Structured logging funnels through `libs/shared/logger`. No central metrics stack is wired up yet; AI-facing metrics are JSON files under `ai/`.

## Tooling & Build
- **Runtime**: Node.js ≥ 18 with ECMAScript modules enabled for most services.
- **Package management**: Root `package-lock.json` pins dependencies; many packages are marked `extraneous`, so prefer `npm install` at the repository root to hydrate `node_modules/`.
- **Nx configuration**: `tools/config/nx.json` exists for future modular orchestration, but the current workflow relies on direct `node` invocations and a handful of ad-hoc scripts.
- **Testing**: Jest-style unit tests and Node test runners are present but not yet wired into a single command. Accessibility tests use Playwright under `apps/frontend/tests/`.

## Governance & Compliance
- `.blackboxrules` (under `ai/governance/`) and `.github/copilot-instructions.md` define binding AI behaviour.
- Compliance scripts under `apps/game-server/scripts/` exercise age verification, logging, and moderation flows.
- `ai-controls.json` at the repository root centralises rate limits, quality gates, and monitoring expectations for AI automation.
- Audit trails and interaction logs belong in `ai/history/` (see README and templates).

## Key Directories
- `ai/` – AI-facing documentation, indexes, patterns, and governance rules.
- `apps/` – Runtime services (`api`, `frontend`, `game-server`) plus scaffolding for dev tooling.
- `libs/` – Shared runtime logic; many packages export transpiled JS alongside TypeScript sources.
- `docs/` – Authoritative policies, controls, and architecture notes.
- `tools/` – Automation scripts, CI helpers, and the dormant Nx configuration.

## AI Assistant Expectations
- Load this context together with `ai/ai-knowledge/architecture-overview.md` before making changes.
- Work within zero-trust, accessibility-first constraints; never bypass `.blackboxrules`.
- Prefer small, auditable changes; document non-obvious decisions in `ai/history/`.
- Raise a TODO in `docs/TODO.md` if you defer required gates or discover gaps that need human follow-up.

For deeper architectural questions, inspect the service-specific READMEs or architectural ADRs under `docs/architecture/`.
```
