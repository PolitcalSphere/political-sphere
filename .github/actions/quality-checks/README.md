# Quality Checks

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** 2025-11-07

Composite action that runs code quality checks including linting, type checking, and formatting validation.

## Purpose

Provides a unified interface for running all code quality checks in CI workflows.

## Inputs

| Input                  | Description                  | Required | Default                |
| ---------------------- | ---------------------------- | -------- | ---------------------- |
| `run-lint`             | Run linting checks           | No       | `true`                 |
| `run-typecheck`        | Run TypeScript type checking | No       | `true`                 |
| `run-format-check`     | Check code formatting        | No       | `true`                 |
| `lint-command`         | Command to run linting       | No       | `npm run lint`         |
| `typecheck-command`    | Command to run type checking | No       | `npm run type-check`   |
| `format-check-command` | Command to check formatting  | No       | `npm run format:check` |

## Outputs

| Output             | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `lint-passed`      | Whether linting passed (passed/failed/skipped)         |
| `typecheck-passed` | Whether type checking passed (passed/failed/skipped)   |
| `format-passed`    | Whether format checking passed (passed/failed/skipped) |

## Usage

### Run All Checks

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: ./.github/actions/setup-node-deps
    with:
      node-version: "22"

  - uses: ./.github/actions/quality-checks
```

### Run Specific Checks

```yaml
steps:
  - uses: ./.github/actions/quality-checks
    with:
      run-lint: "true"
      run-typecheck: "true"
      run-format-check: "false"
```

### Custom Commands

```yaml
steps:
  - uses: ./.github/actions/quality-checks
    with:
      lint-command: "npx eslint . --max-warnings 0"
      typecheck-command: "npx tsc --noEmit"
```

## Changelog

### 1.0.0 (2025-11-07)

- Initial release
- Supports linting, type checking, and format validation
- Configurable commands
- Summary output to GitHub step summary
