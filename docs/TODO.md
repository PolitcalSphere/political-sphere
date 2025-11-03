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

5. Provision local test runners

   - Owner: @devops-team
   - Due: 2025-11-10
   - Description: Add `vitest` or `jest` to devDependencies in `package.json` and ensure CI images run `npm ci`. This enables `tools/scripts/ci/check-tools.mjs` to detect the runner locally and avoids requiring networked `npx` checks in CI.

### Tool-usage rule rollout (2025-11-03)

- [x] Add mandatory tool-usage guidance to governance files and agent prompts
  - Owner: @ai-team
  - Due: 2025-11-07
  - Description: Require agents to identify and invoke appropriate workspace tools for a task (code search, semantic search, `read_file`, test runners, linters, guard script, indexers). If a required tool is unavailable, agents must document the failure in the PR and create a `/docs/TODO.md` entry. Updated `.vscode/agent-prompts.md`, `.github/copilot-instructions.md`, and `ai/governance/.blackboxrules`.

### File placement enforcement (2025-11-03)

- [x] Implement CI script to validate directory placements
  - Owner: @ci-team
  - Due: 2025-11-10
  - Description: Created `tools/scripts/ci/check-file-placement.mjs` to enforce governance directory rules. Added to guard-check.yml and affected-tests.yml workflows. Updated governance rules with enforcement mechanisms.
