# Documentation Structure

**Last Updated:** 2025-11-06

## Overview

This document outlines the organized structure of the Political Sphere documentation.

## Top-Level Categories

### 00-foundation/
Foundation documents defining the project's core identity and standards.

- **business/** - Business model, market analysis
  - `business-model-overview.md`
  - `market-brief.md`
- **product/** - Product principles and user research
  - `product-principles.md`
  - `personas-and-use-cases.md`
  - `stakeholder-map.md`
- **standards/** - Compliance and standards reference
  - `standards-overview.md`
  - `glossary-domain-concepts.md`
- Core files: `vision-mission.md`, `core-values-ethics.md`, `success-metrics-north-star.md`

### 01-strategy/
Strategic planning and roadmap documentation.

- **roadmap/** - Long-term planning and assumptions
  - `strategic-roadmap-03-12-36-months.md`
  - `risked-assumptions-and-bets.md`
- **partnerships/** - External relationships and internationalization
  - `partnerships-and-education-strategy.md`
  - `internationalization-localization-strategy.md`
- Core files: `product-strategy.md`, `objectives-and-key-results-okrs.md`, `ai-strategy-and-differentiation.md`

### 02-governance/
Governance framework and decision-making processes.

- **rfcs/** - Request for Comments documents
- Core files: `governance-charter.md`, `decision-rights-matrix.md`, `roles-and-responsibilities-raci.md`

### 03-legal-and-compliance/
Legal requirements, compliance, and data protection.

- **ai-compliance/** - AI-specific compliance requirements
- **data-protection/** - GDPR, privacy policies
- **licensing-and-ip/** - Intellectual property and licensing
- Core files: `compliance.md`, `privacy-policy.md`, `terms-of-service.md`

### 04-architecture/
System architecture and technical design.

- **api-architecture/** - API design and contracts
- **data-architecture/** - Database and data models
- **decisions/** - Architecture Decision Records (ADRs)
- Core files: `architecture.md`, `system-overview.md`, `domain-driven-design-map.md`

### 05-engineering-and-devops/
Engineering practices, development guides, and DevOps.

- **development/** - Development practices and patterns
  - `backend.md` - Backend/API development
  - `testing.md` - Testing strategies and patterns
  - `quality.md` - Code quality standards
- **languages/** - Language-specific guidance
  - `typescript.md` - TypeScript coding standards
  - `react.md` - React component patterns
- **ui/** - User interface and accessibility
  - `ux-accessibility.md` - WCAG compliance and UX
- **ci-cd/** - CI/CD pipelines and workflows
- **infrastructure-as-code/** - IaC and deployment
- **testing/** - Test infrastructure and frameworks

### 06-security-and-risk/
Security policies, risk management, and incident response.

- **audits/** - Security audits and assessments
- **incident-response/** - Security incident procedures
- Core files: `security.md`, `risk-register.md`, `threat-modeling-stride.md`

### 07-ai-and-simulation/
AI systems, governance, and simulation engine.

- **model-inventory-and-system-cards/** - AI model documentation
- Core files: `ai-governance.md`, `ai-governance-framework.md`, `multi-agent-orchestration.md`

### 08-game-design-and-mechanics/
Game design documentation and mechanics.

- **mechanics/** - Game mechanics and rules
  - `economy-and-budgets.md`
  - `elections-policy-and-mechanics.md`
  - `lawmaking-and-procedure-engine.md`
  - `media-press-and-public-opinion-system.md`
- **systems/** - Game systems and world design
  - `ai-npc-behaviours-and-tuning.md`
  - `parties-caucuses-and-factions.md`
  - `roles-and-progressions.md`
  - `world-and-institutions-blueprint.md`
- Core files: `game-design-document-gdd.md`, `content-moderation-and-enforcement.md`

### 09-observability-and-ops/
Operations, monitoring, and observability.

- Core files: `operations.md`, observability architecture, SLO definitions

## Root Documentation Files

- `README.md` - Documentation index and navigation
- `TODO.md` - Current work items and priorities
- `quick-ref.md` - Quick reference guide for developers

## Supporting Directories

- **archive/** - Historical and deprecated documentation
- **audit-trail/** - Audit logs and governance records
- **copilot-guidance/** - README for merged AI guidance (historical)
- **document-control/** - Document templates and version control
- **metrics/** - Metrics dashboards and KPIs
- **observability/** - Observability configuration and dashboards

## Navigation Tips

1. **For developers**: Start with `05-engineering-and-devops/` and `quick-ref.md`
2. **For governance**: Review `02-governance/` and `03-legal-and-compliance/`
3. **For strategy**: Check `01-strategy/` and `00-foundation/`
4. **For security**: See `06-security-and-risk/` and related ADRs in `04-architecture/decisions/`
5. **For AI work**: Reference `07-ai-and-simulation/` and AI compliance docs

## Maintenance

- Update this file when adding new top-level categories or major subdirectories
- Keep README files in each category up to date
- Archive deprecated documents to `archive/` with date stamps
- Follow naming conventions: `kebab-case` for all files and folders
