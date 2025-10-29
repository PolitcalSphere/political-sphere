# Module Federation Tooling

This folder contains a generator and example webpack configs for Module Federation used in the monorepo.

## Overview

Module Federation allows you to dynamically load code from separate deployments at runtime. This setup includes:
- **Host app** (`apps/host`) — loads remote modules dynamically
- **Remote app** (`apps/remote`) — exposes modules for the host to consume
- **Generated configs** (`tools/module-federation/generated/`) — reusable Module Federation plugin configurations

## Quick Start

### 1. Generate example configs (one-time setup)

```bash
npm run mf:init
```

This creates:
- `tools/module-federation/generated/host.webpack.config.js` (ESM)
- `tools/module-federation/generated/remote.webpack.config.js` (ESM)
- Optional `.cjs` variants for CommonJS environments

### 2. Start the remote dev server

```bash
npm run dev:remote
```

The remote will serve on **http://localhost:3001** and expose `remoteEntry.js`.

### 3. Start the host dev server (in a separate terminal)

```bash
npm run dev:host
```

The host will serve on **http://localhost:3000** and dynamically load the remote's exposed module.

### 4. Verify the setup

```bash
npm run check:remote
```

This runs a smoke-check script that curls `http://localhost:3001/remoteEntry.js` and confirms it's available.

## Configuration Details

### Generated Configs

The generator creates **ESM** webpack configs in `tools/module-federation/generated/`:

- `host.webpack.config.js` — imports webpack and sets up the `remotes` field
- `remote.webpack.config.js` — imports webpack and sets up the `exposes` field with absolute paths

Both use `import webpack from 'webpack'` and access `webpack.container.ModuleFederationPlugin`.

### App-Specific Configs

- `apps/host/webpack.config.js` (ESM) — imports the generated host config and merges it with app-specific settings
- `apps/remote/webpack.config.js` (ESM) — imports the generated remote config and merges it with app-specific settings

Both configs:
- Use `process.cwd()` for deterministic absolute paths (avoids URL percent-encoding)
- Disable eval devtool (`devtool: false`) for smaller bundles
- Configure quiet dev servers (no browser auto-open, reduced logging)

### ESLint Note

The app webpack configs disable ESLint (`/* eslint-disable */`) because they intentionally use relative imports from `tools/module-federation/generated`, which violates the repository's `no-restricted-imports` rule. This is safe for tooling files.

## Notes & Troubleshooting

- **ESM by default**: The workspace uses `"type": "module"` in `package.json`, so `.js` files are treated as ESM. Generated configs and app configs use ESM `import`/`export`.
- **Nx project graph**: If you see "No cached ProjectGraph is available" during linting, warm the cache with `nx graph` or let the Nx daemon build the graph on first run.
- **CI smoke-check**: A GitHub Actions workflow (`.github/workflows/smoke-remote.yml`) starts the remote dev server and runs the smoke-check script to validate `remoteEntry.js` is served.

## Next Steps

- To expose additional modules from the remote, edit `tools/module-federation/generated/remote.webpack.config.js` and add entries to the `exposes` field.
- To consume additional remotes from the host, edit `tools/module-federation/generated/host.webpack.config.js` and add entries to the `remotes` field.
- For production builds, create separate webpack configs that set `mode: 'production'` and appropriate publicPath for your CDN or deployment environment.
