## Module Federation (Module Federation / Microfrontends)

This document explains the recommended conventions and a small starter scaffold for using Webpack Module Federation in this monorepo.

Goals
- Encapsulate frontend features as remotes that the host app can load at runtime.
- Share runtime dependencies (React, ReactDOM) as singletons to avoid duplicate instances.
- Keep strict import boundaries for libs (see ESLint enforce-module-boundaries rule).

Quick start
1. Run `node tools/module-federation/generate.js` to generate example webpack configs in `tools/module-federation/generated`.
2. Copy `host.webpack.config.js` into your host application's webpack (or adjust the build tool config) and `remote.webpack.config.js` into the remote app's webpack.
3. Expose components from the remote via the `exposes` field and reference them from the host via the `remotes` field.
4. Ensure shared libs (React, ReactDOM) are listed as singletons and align versions across apps.

ESLint and import boundaries
- This repo enforces `@nrwl/nx/enforce-module-boundaries` in `.eslintrc.json`. Projects should be tagged in `nx.json` and libs should have appropriate tags in their project.json so the rule can verify allowed dependencies.
- To run linting focused on boundaries: `npm run lint:boundaries`.

Conventions
- Tag UI libraries with `ui` and platform/core libs with `platform` or `shared` in `project.json` (or `nx.json` project entries).
- Remotes should only depend on `shared`/`ui` libs; hosts may depend on `platform` + `ui`.

Notes
- This is intentionally lightweight: for full Nx generators consider creating an Nx plugin or generator that wires into your app build system (Vite/Angular/React/Next.js) to inject MF configs automatically.
