# Organization & Structure

## Directory Placement

NEVER place files in root. Always use these structured locations:

```
/apps          - Applications (frontend, api, worker, infrastructure)
/libs          - Shared libraries (ui, platform, infrastructure, shared)
/tools         - Build tools and utilities
/docs          - Comprehensive documentation
/scripts       - Automation scripts (with subdirectories)
/ai            - All AI-related assets and configurations
  /cache       - AI cache data
  /context-bundles - AI context bundles
  /governance  - AI governance rules
  /history     - AI development history
  /index       - AI codebase index
  /knowledge   - AI knowledge base
  /learning    - AI learning patterns
  /metrics     - AI performance metrics
  /patterns    - AI code patterns
  /prompts     - AI prompts and templates
/assets        - Static assets
/reports       - Reports and metrics
```

Exceptions to root placement
While most project contents must live under structured directories, common top-level files required by standard tools and discoverability are excepted:

- `/README.md`, `/LICENSE`, `/CHANGELOG.md`, `/CONTRIBUTING.md`
- `/package.json`, `/pnpm-workspace.yaml`, `/nx.json`, `/tsconfig.base.json`
- `/.editorconfig`, `/.gitignore`, `/.gitattributes`
- `/.github/` (workflows, templates)
- `/.vscode/` (IDE settings)
- `/.lefthook/` (git hooks)
- `/ai-controls.json`, `/ai-metrics.json` (legacy, to be moved to `/ai/`)
- `/TODO-STEPS.md`, `/TODO.md` (project management)

Rationale: These exceptions align with tooling expectations and improve discoverability across developer tools and CI.

## Naming Conventions (Strict)

Apply consistently across ALL files:

- `kebab-case` → files, directories: `user-management.ts`, `api-client/`
- `PascalCase` → classes, components: `UserProfile`, `ApiClient`
- `camelCase` → functions, variables: `getUserProfile`, `apiClient`
- `SCREAMING_SNAKE_CASE` → constants: `MAX_RETRY_COUNT`, `API_BASE_URL`

Use descriptive names. Avoid abbreviations unless domain-standard (e.g., `API`, `HTTP`).

## File Responsibilities

Every file MUST:

1. Have single, focused purpose
2. Include ownership (CODEOWNERS or inline comment)
3. Use intention-revealing name
4. Include header metadata if appropriate (see `metadata-header-template.md`)

## Discoverability Requirements

- Add README to every significant directory
- Limit hierarchy depth to 4-5 levels
- Group related files logically
- Create index files for easier imports
- Cross-reference documentation

## Prevent Duplication

Before creating new code, search for existing implementations. Consolidate shared logic to `/libs/shared`. Use single-source-of-truth for configs. Reference (don't duplicate) documentation. Suggest refactoring when duplication is found.

## Enforce Directory Placement

Ensure files are placed correctly per governance rules.

- **CI Enforcement**: `tools/scripts/ci/check-file-placement.mjs` validates placements in PR workflows.
- **Pre-commit Hook**: Use Husky or Lefthook for local enforcement.
- **IDE Guidance**: VS Code settings warn on incorrect placements.
- **Code Review**: Reviewers verify compliance.

Violations fail CI with remediation messages.

## TODO Management (Single Source of Truth)

Maintain ONE consolidated TODO list at `/docs/TODO.md`. Categorize by priority and functional area. Include completed tasks with dates for traceability. Update for ALL changes (code, docs, infrastructure). AI assistants reference `/docs/TODO.md` exclusively. No fragmented TODO-\*.md files in subdirectories. **NEVER overwrite the list**—only add items or mark as completed. Organize by practice area (e.g., Organization, Quality, Security).

Before marking tasks complete or merging, add explicit next steps, owners, and due dates for auditability.

## Separation of Concerns

Maintain clear boundaries: Domain logic ≠ Infrastructure code. UI components ≠ Business logic. Isolate external integrations. Respect Nx module boundaries (enforced). Apply Domain-Driven Design bounded contexts.

## Lifecycle Indicators

Mark file lifecycle explicitly: **Active** (standard structure, no prefix), **Experimental** (`/apps/dev/` or `*.experimental.*`), **Deprecated** (`*.deprecated.*` + notice), **Internal** (`*.internal.*` or `/internal/` subdirectory).

## Structural Consistency

Apply parallel patterns across code, docs, infrastructure, and AI assets. Avoid divergent schemes. Use consistent naming. Follow unified versioning and metadata.

## Access Boundaries

Protect sensitive assets: Secrets in `/apps/infrastructure/secrets` (encrypted). Core logic protected by module boundaries. Mark internal APIs clearly. Segregate environment configs. Prevent accidental exposure via policies.

## Scalability

Design for growth: Use modular, extensible structure. Avoid deep nesting (max 4-5 levels). Support horizontal scaling (features, services, teams) and vertical scaling (complexity, load). Maintain zero structural technical debt.
