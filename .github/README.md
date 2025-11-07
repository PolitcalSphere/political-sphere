# GitHub CI/CD map for Political Sphere

This document explains the CI/CD triggers, key jobs, ownership, and how to run workflows locally.

## Triggers → Jobs → Required Checks

- `verify-github-config` (manual / PRs touching `.github/`) — validates GHA linting, naming conventions, and single dependency bot.
- `verify-github-config` job runs: `actionlint`, `yamllint`, `scripts/ci/verify-github-config.mjs`.
- `verify-ci` (main CI) — comprehensive pipeline: pre-flight checks, lint/typecheck, tests, security scans, build, integration/e2e.

## Who owns what

- Platform engineering (`@political-sphere/platform-team`) owns GitHub workflows and `.github/actions`.
- Infrastructure team owns IaC and `apps/infrastructure`.
- Security team owns security scans and `SECURITY.md`.

## Running checks locally

Prereqs: `node` and `npm` or `pnpm` installed. For local run of GHA lints you can use `npx` or install tools globally.

Run the GitHub Actions lints and custom checks locally:

```bash
# From repository root
npm run ci:lint-gha
```

To run workflows locally you can use `act` (https://github.com/nektos/act). Example:

```bash
act workflow_dispatch -W .github/workflows/verify-github-config.yml
```

Note: `act` may not support all actions and service containers exactly as GitHub-hosted runners do. Use it for lightweight checks only.

## Available Composite Actions

### setup-node-deps

Sets up Node.js and installs dependencies with caching.

```yaml
- uses: ./.github/actions/setup-node-deps
  with:
    node-version: "22" # default: '22'
    cache: "npm" # default: 'npm'
    install-command: "npm ci" # default: 'npm ci'
```

### setup-node

Sets up Node.js with optional package manager caching (no installation).

```yaml
- uses: ./.github/actions/setup-node
  with:
    node-version: "20"
    cache: "npm" # npm|yarn|pnpm|none
```

### quality-checks

Runs linting, type checking, and format validation.

```yaml
- uses: ./.github/actions/quality-checks
  with:
    run-lint: "true" # default: 'true'
    run-typecheck: "true" # default: 'true'
    run-format-check: "true" # default: 'true'
```

### run-tests

Orchestrates test execution with coverage and sharding support.

```yaml
- uses: ./.github/actions/run-tests
  with:
    test-type: "unit" # unit|integration|e2e|coverage
    coverage-enabled: "true"
    coverage-threshold: 80
```

### deploy

Handles deployment to various environments (staging, production).

See [actions/deploy/README.md](actions/deploy/README.md) for details.

## Conventions

- Workflow files must use kebab-case filenames and start with a verb token (e.g., `run-tests.yml`, `publish-release.yml`). This repo includes an automated check `verify-github-config` - it warns on violations.
- Composite actions in `.github/actions/*` must include `action.yml` and `README.md` with inputs/outputs and an explicit changelog section.
- Single source of truth for dependency automation: dependabot.yml is used for this repo.

### Local prerequisites for full validation

To run the full validation locally (including `actionlint`), install the following locally:

```bash
# install actionlint locally (recommended for full checks)
npm install -D actionlint || pnpm add -D actionlint

# yamllint is a Python tool; install via pip if you want YAML validation locally
python3 -m pip install --user yamllint
```

After installing, `npm run ci:lint-gha` will run the verifier and `actionlint` locally.

## Contacts & Escalation

If a workflow or action causes incidents, tag `@political-sphere/platform-team` and open an incident in `reports/`.
