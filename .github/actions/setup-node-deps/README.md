# Setup Node.js with Dependencies

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** 2025-11-07

Composite action that sets up Node.js **and** installs dependencies with caching.

## Purpose

This action combines Node.js setup with dependency installation, providing a single step for common CI workflows. It wraps the `setup-node` action and adds dependency installation.

## Inputs

| Input             | Description                                       | Required | Default  |
| ----------------- | ------------------------------------------------- | -------- | -------- |
| `node-version`    | Node.js version to use                            | No       | `22`     |
| `cache`           | Enable dependency caching (npm\|yarn\|pnpm\|none) | No       | `npm`    |
| `install-command` | Command to install dependencies                   | No       | `npm ci` |

## Outputs

| Output         | Description                      |
| -------------- | -------------------------------- |
| `node-version` | Resolved Node.js version         |
| `cache-hit`    | Whether dependency cache was hit |

## Usage

### Basic Usage

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: ./.github/actions/setup-node-deps
    with:
      node-version: "20"
```

### Custom Install Command

```yaml
steps:
  - uses: ./.github/actions/setup-node-deps
    with:
      node-version: "22"
      install-command: "npm ci --prefer-offline"
```

### Skip Dependency Installation

If you only need Node.js without dependencies, use `./.github/actions/setup-node` instead.

## Changelog

### 1.0.0 (2025-11-07)

- Initial release
- Wraps actions/setup-node with dependency installation
- Supports npm, yarn, pnpm caching
- Configurable install command
