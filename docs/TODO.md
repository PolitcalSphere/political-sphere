# TODO: Governance Reforms Implementation

<div align="center">

| Classification | Version | Last Updated |      Owner      | Review Cycle |  Status   |
| :------------: | :-----: | :----------: | :-------------: | :----------: | :-------: |
|  🔒 Internal   | `1.0.0` |  2025-11-03  | Governance Team |  Quarterly   | **Draft** |

</div>

---

## Overview

Implement governance reforms to reduce bureaucracy while preserving quality, security, and compliance value. Focus on AI-driven automation, proportional oversight, and efficiency improvements.

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

### 5. Small fixes: Context Preloader (2025-11-04)

- Date: 2025-11-04
- Author: automation/assistant
- Files changed: `tools/scripts/ai/context-preloader.js`, `CHANGELOG.md`, `docs/TODO.md`
- Type: Fixed
- Summary: Adjusted the AI context preloader to prefer and create repository-root `ai-cache/`, added a robust recursive directory walker and improved error handling. This resolves unit test failures in `tools/scripts/ai/context-preloader.spec.js` that expected `ai-cache/context-cache.json` at the repo root.
- Impact: Non-breaking; improves test reliability and developer experience. Added changelog entry and marked TODO for traceability.

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
