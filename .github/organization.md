# Organization & Structure

## Directory Placement

NEVER place files in root. Always use these structured locations:

```
/apps          - Applications (frontend, api, worker, infrastructure)
/libs          - Shared libraries (ui, platform, infrastructure, shared)
/tools         - Build tools and utilities
/docs          - Comprehensive documentation
/scripts       - Automation scripts (with subdirectories)
/ai-learning   - AI training patterns
/ai-cache      - AI cache data
/ai-metrics    - AI performance metrics
.github/       - GitHub workflows and configs
```

Exceptions to root placement
While most project contents must live under structured directories, common top-level files required by standard tools and discoverability are excepted:

- `/README.md`, `/LICENSE`, `/CHANGELOG.md`, `/CONTRIBUTING.md`
- `/package.json`, `/pnpm-workspace.yaml`, `/nx.json`, `/tsconfig.base.json`
- `/.editorconfig`, `/.gitignore`, `/.gitattributes`
- `/.github/` (workflows, templates)

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

Before creating new code:

1. Search for existing implementations
2. Consolidate shared logic to `/libs/shared`
3. Use single-source-of-truth for configs
4. Reference (don't duplicate) documentation
5. Suggest refactoring when duplication found

## TODO Management (Single Source of Truth)

Maintain ONE consolidated TODO list at `/docs/TODO.md`:

- Categorize tasks by priority and functional area
- Include completed tasks with dates for traceability
- Update `/docs/TODO.md` for ALL changes (code, docs, infrastructure)
- AI assistants must reference `/docs/TODO.md` exclusively
- No fragmented TODO-\*.md files in subdirectories
- **NEVER overwrite the TODO list** - only add new items or mark existing ones as completed
- Organize by practice area (e.g., Organization, Quality, Security, AI Governance, Testing, Compliance, UX/Accessibility, Operations, Strategy)

## Separation of Concerns

Maintain clear boundaries:

- Domain logic ≠ Infrastructure code
- UI components ≠ Business logic
- External integrations isolated
- Respect Nx module boundaries (enforced)
- Apply Domain-Driven Design bounded contexts

## Lifecycle Indicators

Mark file lifecycle explicitly:

- **Active** → Standard structure, no prefix
- **Experimental** → `/apps/dev/` or `*.experimental.*`
- **Deprecated** → `*.deprecated.*` + deprecation notice
- **Internal** → `*.internal.*` or `/internal/` subdirectory

## Structural Consistency

Apply parallel patterns across:

- Code, docs, infrastructure, AI assets
- NO divergent organizational schemes
- Consistent naming everywhere
- Unified versioning and metadata approach

## Access Boundaries

Protect sensitive assets:

- Secrets → `/apps/infrastructure/secrets` (encrypted)
- Core logic → Protected by module boundaries
- Internal APIs → Clearly marked
- Environment configs → Segregated by environment
- Prevent accidental exposure via policies

## Scalability

Design for growth:

- Modular, extensible structure
- Avoid deep nesting (max 4-5 levels)
- Support horizontal scaling (features, services, teams)
- Support vertical scaling (complexity, load)
- Zero structural technical debt

---

**Last updated**: 2025-01-10
**Version**: 1.3.2
**Owned by**: Technical Governance Committee
**Review cycle**: Quarterly
