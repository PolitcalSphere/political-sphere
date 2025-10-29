# Dev Autopilot

This document explains the automated development workflow implemented for the Political Sphere monorepo. All tools are free/open-source and maximize GitHub's free tier benefits.

## Overview

The Dev Autopilot provides end-to-end automation for:

- Code quality (linting, formatting, type-checking)
- Security scanning (secrets, vulnerabilities, compliance)
- Testing (unit, e2e, flaky test detection)
- Documentation (linting, inclusive language)
- Dependency management (automated updates)
- Release management (semantic versioning, changelogs)
- Local AI-assisted development (commit messages, PR reviews)

## CI/CD Pipeline

### Quality Gate (`.github/workflows/ci.yml`)

Runs on every PR and push to main:

1. **Linting & Formatting**
   - ESLint with TypeScript support
   - Prettier for consistent formatting
   - Commit message linting (Conventional Commits)

2. **Type Checking**
   - TypeScript compilation check

3. **Testing**
   - Unit tests with Jest
   - E2E tests with Playwright (sharded)
   - Retry failed tests once

4. **Documentation**
   - Markdown linting
   - Prose linting (Vale)
   - Spelling check (cspell)

5. **Security**
   - Gitleaks for secret detection
   - Conftest for policy enforcement (Kubernetes manifests)

### Security Scanning (`.github/workflows/security-scan.yml`)

Weekly scheduled scans:

- SBOM generation (Syft)
- Vulnerability scanning (Trivy, Grype)

### CodeQL (`.github/workflows/codeql.yml`)

Automated security analysis for JavaScript/TypeScript code.

### Release Automation (`.github/workflows/release.yml`)

- Semantic versioning with release-please
- Automated changelog generation
- GitHub releases on main branch pushes

### Dependency Updates (`.github/workflows/renovate.yml`)

- Weekly Renovate runs
- Grouped PRs for related updates
- Auto-merge for patch/minor updates

## PR Management

### Auto-labeling (`.github/labeler.yml`)

Labels PRs based on changed files:

- `ci`, `dev`, `docs`, `infrastructure`, `platform`
- `dependencies`, `github`

### PR Size (`.github/pr-size.yml`)

Categorizes PRs by line count:

- XS (<10 lines), S (<100), M (<500), L (<1000), XL (≥1000)

### Stale Management (`.github/stale.yml`)

Automatically marks issues/PRs as stale after 30 days.

## Local Development

### Git Hooks (`.lefthook.yml`)

Pre-commit hooks ensure code quality:

- Run lint-staged on changed files
- Validate commit messages

### AI-Assisted Development

#### Commit Message Helper (`dev/ai/commit-msg.mjs`)

Generate Conventional Commit messages using local Ollama:

```bash
npm run ai:commit
```

Requires Ollama with llama3 model installed locally.

#### PR Review Helper (`dev/ai/review-pr.mjs`)

Local static analysis with optional AI hints.

## Required Checks to Merge

PRs must pass all these checks:

- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Tests (Jest + Playwright)
- ✅ Documentation linting
- ✅ Gitleaks (secrets)
- ✅ Conftest (policies)
- ✅ CodeQL (security)

## Policies & Guardrails

### OPA Policies (`policies/`)

- Deny `:latest` image tags
- Deny privileged security contexts
- Deny hostPath volume mounts

### Conventional Commits

All commits must follow the format:

```
type(scope): description

[body]

[footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

## Secrets Policy

- No secrets in code
- Gitleaks blocks merges with detected secrets
- Use GitHub secrets for CI/CD

## Local AI Usage

1. Install Ollama: https://ollama.ai/
2. Pull llama3 model: `ollama pull llama3`
3. Use AI helpers: `npm run ai:commit` or `npm run ai:review`

AI runs locally only - no network calls or paid APIs.

## Troubleshooting

### Lefthook Not Working

Run `npm run prepare` to install git hooks.

### Tests Failing

- Check for flaky tests (CI retries once)
- Run locally: `npm test`

### Renovate Not Creating PRs

- Check `.github/renovate.json` configuration
- Ensure repository allows Renovate app

### CodeQL Not Running

- Enable in repository settings → Security → Code scanning

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.
