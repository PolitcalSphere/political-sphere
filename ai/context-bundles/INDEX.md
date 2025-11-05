# AI Context Index
Last Updated: 2025-11-05T14:57:37Z

## Available Context Bundles

1. **recent-changes.md** - Git history, modified files, branch status
2. **active-tasks.md** - TODO items from docs/TODO.md
3. **project-structure.md** - Directory layout, packages, configs
4. **error-patterns.md** - Recent errors and test failures
5. **dependencies.md** - npm dependencies and workspace info
6. **code-patterns.md** - Common imports and patterns

## How to Use

AI assistants should read these files before:
- Making architectural changes
- Debugging issues
- Understanding recent work
- Proposing new features

## Refresh

Run: `npm run ai:context` or `./tools/scripts/ai/build-context.sh`
