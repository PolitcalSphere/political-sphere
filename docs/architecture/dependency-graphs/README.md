# Project Dependency Graph

**Last Updated:** 2025-11-10  
**Total Projects:** 35

## Overview

This document provides an overview of the Political Sphere project structure and dependencies.

## Interactive Visualization

To view the interactive dependency graph:

```bash
npx nx graph
```

This will open a browser window with an interactive visualization of all project dependencies.

## Project Structure

### Applications (7)

- `apps/api`
- `apps/feature-auth-remote`
- `apps/feature-dashboard-remote`
- `apps/game-server`
- `apps/shell`
- `apps/web`
- `apps/worker`

### Libraries (28)

- `libs/data-game-state/src`
- `libs/data-game-state/tests`
- `libs/data-user/src`
- `libs/data-user/tests`
- `libs/domain-election/src`
- `libs/domain-election/tests`
- `libs/domain-governance/src`
- `libs/domain-governance/tests`
- `libs/domain-legislation/src`
- `libs/domain-legislation/tests`
- `libs/feature-flags/src`
- `libs/feature-flags/tests`
- `libs/game-engine/scripts`
- `libs/game-engine/src`
- `libs/i18n/src`
- `libs/i18n/tests`
- `libs/observability/src`
- `libs/observability/tests`
- `libs/platform/argo-apps`
- `libs/platform/charts`
- `libs/platform/namespaces`
- `libs/platform/policies`
- `libs/shared/src`
- `libs/shared/tests`
- `libs/shared/types`
- `libs/testing/factories`
- `libs/testing/src`
- `libs/testing/tests`

## Dependency Rules

### Module Boundaries

Nx enforces module boundaries to maintain clean architecture:

1. **Apps cannot depend on other apps**
   - Each app is independently deployable
   - Shared code must go in libs

2. **Libs can depend on other libs**
   - Must respect layer boundaries (see below)
   - Circular dependencies are prevented

3. **Layer Architecture**
   ```
   apps/
     └─> libs/platform/    (Platform services)
           └─> libs/shared/  (Shared utilities)
   ```

### Allowed Dependencies

- ✅ Apps → Platform libs
- ✅ Apps → Shared libs
- ✅ Platform libs → Shared libs
- ❌ Shared libs → Platform libs
- ❌ Apps → Apps
- ❌ Circular dependencies

## Checking Dependencies

### List All Dependencies

```bash
npx nx graph
```

### Check Specific Project

```bash
npx nx show project <project-name> --web
```

### Validate Boundaries

```bash
npm run lint
```

Nx will report any boundary violations during linting.

## Dependency Analysis Tools

### Nx Graph Commands

```bash
# Interactive graph
npx nx graph

# Show affected projects
npx nx affected:graph

# Export graph data
npx nx graph --file=graph.json

# Focus on specific project
npx nx graph --focus=<project-name>
```

### CI Integration

Dependency graphs are automatically validated in CI:

- Pull requests check for circular dependencies
- Boundary violations block merges
- Affected project analysis optimizes test runs

## Maintenance

### Adding New Projects

When adding new apps or libs:

1. Follow directory structure conventions
2. Update `nx.json` if needed
3. Define clear module boundaries in `project.json`
4. Run `npx nx graph` to verify structure

### Refactoring Dependencies

Before major refactoring:

1. Review current dependency graph
2. Plan new structure
3. Update incrementally
4. Validate with `npm run lint`

## Related Documentation

- [Architecture Overview](../architecture.md)
- [Nx Configuration](../nx-configuration.md)
- [Module Boundaries](../../00-foundation/organization.md)
