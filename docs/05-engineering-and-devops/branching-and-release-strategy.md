# Branching and Release Strategy

<div align="center">

| Classification | Version | Last Updated |       Owner        | Review Cycle |   Status   |
| :------------: | :-----: | :----------: | :----------------: | :----------: | :--------: |
|  🔒 Internal   | `1.0.0` |  2025-11-05  | Documentation Team |  Quarterly   | **Active** |

</div>

---

## Overview

This document outlines the branching and release strategy for the Political Sphere project, a democratically-governed multiplayer political simulation game. The strategy emphasizes security, testing, accessibility, and governance compliance as per the project's constitutional requirements.

## Branching Model

### Main Branch (`main`)

- **Purpose**: Production-ready code, deployed to production.
- **Protection**: Strict branch protection rules enforced.
- **Merges**: Only via approved pull requests.
- **Deployments**: Automatic on merge (staging) and manual (production).

### Development Branch (`dev`)

- **Purpose**: Integration branch for new features.
- **Protection**: Moderate protection, requires CI checks.
- **Merges**: Regular merges from feature branches.

### Feature Branches (`feature/*`)

- **Naming**: `feature/descriptive-name` (e.g., `feature/add-voting-system`).
- **Purpose**: Development of new features or bug fixes.
- **Lifetime**: Short-lived, merged via PR to `dev` or `main`.
- **Protection**: None, but CI runs on push.

### Release Branches (`release/*`)

- **Naming**: `release/v1.2.3` (semantic versioning).
- **Purpose**: Preparation for production releases.
- **Protection**: Strict, requires full testing suite.

### Hotfix Branches (`hotfix/*`)

- **Naming**: `hotfix/critical-bug-fix`.
- **Purpose**: Urgent fixes for production issues.
- **Merges**: Directly to `main` and `dev`.

## Branch Protection Rules

### Main Branch Protection - Sovereign Grade

Applied to `main` branch to ensure constitutional compliance and quality.

#### Required Reviews

- **Pull request reviews**: At least 1 approving review required.
- **Dismiss stale approvals**: Enabled (new commits require re-approval).
- **Code Owners review**: Required for sensitive files (enforces CODEOWNERS).

#### Status Checks

All must pass before merging:

- `lint-and-typecheck`: Code quality and type safety.
- `test`: Unit tests (80%+ coverage required).
- `coverage-aggregation`: Combined test coverage verification.
- `build`: Application builds successfully.
- `security-scan`: Security vulnerabilities check.
- `integration-test`: Service integration tests.
- `e2e-test`: End-to-end user journey tests.
- `accessibility-test`: WCAG 2.2 AA compliance.
- `Semgrep Security Scan`: Static application security testing (SAST).

#### Merge Controls

- **Require branches to be up to date**: Enabled (prevents outdated merges).
- **Require linear history**: Enabled (no merge commits).
- **Restrict pushes**: Enabled, only administrators and platform-engineering team.

#### Additional Settings

- **Include administrators**: Disabled (rules apply to all).
- **Allow force pushes**: Disabled.
- **Allow deletions**: Disabled.

## Commit Conventions

Follow conventional commits for automated changelog generation and semantic versioning.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat: add real-time voting system
fix(api): resolve authentication timeout issue
docs: update branching strategy guide
```

## Release Process

### Semantic Versioning

- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### Release Steps

1. Create release branch from `main`: `release/v1.2.3`
2. Final testing and validation on release branch
3. Merge to `main` with version bump
4. Tag release: `git tag v1.2.3`
5. Deploy to production
6. Update CHANGELOG.md

### Automated Releases

- CI/CD pipeline handles builds and deployments
- GitHub releases created automatically on `main` merges
- Changelog generated from conventional commits

## Governance Compliance

### Constitutional Requirements

- **Political Neutrality**: No manipulation of outcomes
- **Security**: Zero-trust, input validation, encryption
- **Privacy**: GDPR/CCPA compliance, minimal data collection
- **Accessibility**: WCAG 2.2 AA mandatory
- **Testing**: 80%+ coverage, comprehensive automated tests

### Audit Trail

- All changes tracked via Git history
- Branch protection logs access and approvals
- CI/CD artifacts retained for compliance

## Tools and Automation

### Git Hooks

- Pre-commit: Linting, type checking, tests
- Pre-push: Full CI simulation, security scans
- Lefthook configuration in `.lefthook.yml`

### CI/CD Pipeline

- GitHub Actions workflows in `.github/workflows/`
- Nx monorepo support for affected builds
- Parallel testing and caching

### Branch Management

- Automated branch cleanup (merged branches)
- Protected branch monitoring
- CODEOWNERS enforcement

## Risk Mitigation

### Branch Protection Benefits

- Prevents unauthorized changes to production code
- Ensures quality gates pass before deployment
- Maintains audit trail for governance

### Contingency Plans

- Hotfix process for critical issues
- Rollback procedures via Git tags
- Emergency access protocols for admins

## References

- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/managing-a-branch-protection-rule)
- [Conventional Commits](https://conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- Project .blackboxrules for governance requirements
- CI/CD Architecture: `docs/05-engineering-and-devops/ci-cd-architecture.md`
