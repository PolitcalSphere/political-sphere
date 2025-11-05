# Copilot Instructions

This directory contains all AI assistant governance rules and instructions for the Political Sphere project.

## Overview

These files guide AI assistants (GitHub Copilot, BlackBox AI, and others) in maintaining code quality, security, and compliance standards throughout the development process.

## Files

- **`copilot-instructions.md`** - Main governance file with meta-rules, execution modes, and update protocols (pairs with `/.blackboxrules`)
- **`ai-governance.md`** - AI ethics, safety, and governance principles
- **`compliance.md`** - Legal compliance, GDPR, accessibility, and regulatory requirements
- **`operations.md`** - CI/CD, deployment, monitoring, and operational standards
- **`organization.md`** - File placement, directory structure, and naming conventions
- **`quality.md`** - Code quality, testing, and documentation standards
- **`quick-ref.md`** - Quick reference guide for common tasks and patterns
- **`security.md`** - Security practices, threat modeling, and vulnerability management
- **`strategy.md`** - Product strategy, roadmap, and architectural decisions
- **`testing.md`** - Testing strategies, coverage requirements, and test patterns
- **`ux-accessibility.md`** - UX design principles and accessibility standards

## Usage

AI assistants automatically load these files to:

- Understand project structure and conventions
- Apply appropriate quality gates based on execution mode
- Maintain consistency across the codebase
- Follow security and compliance requirements

## Maintenance

**CRITICAL**: When updating governance rules:

1. Update BOTH `copilot-instructions.md` AND `/.blackboxrules` simultaneously
2. Increment version numbers in both files
3. Add entry to `/CHANGELOG.md` under `Unreleased` section
4. Update `/docs/TODO.md` with change details
5. Use the `rule-update` PR template
6. Require review from governance team

CI enforces parity via `.github/actions/ci/rule-parity-check.yml`.

## Version

Current Version: 1.5.0
Last Updated: 2025-11-05
