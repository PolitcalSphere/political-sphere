# Setup Node (local)

**Version:** 0.2.0  
**Status:** Production Ready  
**Last Updated:** 2025-11-07

> Locally resolves and activates Node.js from the GitHub runner toolcache and optionally restores package manager caches (npm, yarn, pnpm).

## What it does

- Resolves a concrete Node.js version (e.g., 20.11.1) from the runner toolcache based on a major request like `18.x` or `20.x` and adds it to `PATH`.
- Optionally restores dependency cache for npm/yarn/pnpm using lockfile-based keys.
- Avoids downloading Node or using external setup actions for deterministic, offline-friendly operation on GitHub-hosted runners.

## Why this exists

For many workflows, GitHub-hosted runners already ship multiple Node versions in the toolcache (`/opt/hostedtoolcache/node`). When you only need a standard LTS or current major, activating from toolcache is faster and removes a supply-chain dependency. For dependency caching, we use the official cache action with a pinned SHA.

> References:
>
> - GitHub Docs: Runner context (tool cache path) — shows `runner.tool_cache` and OS values.
> - actions/setup-node — official action capabilities and caching guidance (v6).
> - Dependency caching reference — cache keys, restore keys, and OS-specific considerations.

## Inputs

- `node-version` (required): Requested Node.js version. Supports `MAJOR`, `MAJOR.x`, or full semver.
- `cache` (optional, default: `none`): One of `npm`, `yarn`, `pnpm`, or `none`.
- `cache-dependency-path` (optional): Path or glob to lockfile(s) used for the cache key. If omitted, defaults per PM: `**/package-lock.json`, `**/yarn.lock`, `**/pnpm-lock.yaml`.
- `package-manager-cache` (optional, default: `true`): If `cache` is `none`, auto-detect PM from `package.json` (`packageManager` or `devEngines.packageManager`).

## Outputs

- `resolved-version`: The concrete activated Node version (e.g., `20.11.1`).
- `cache-hit`: `true` if a dependency cache was restored with an exact key match; empty if cache was skipped.

## Usage

Basic (toolcache only):

```yaml
- uses: ./.github/actions/setup-node
	with:
		node-version: 20.x
```

With npm cache and explicit lockfile path:

```yaml
- uses: ./.github/actions/setup-node
	id: setup
	with:
		node-version: 20.x
		cache: npm
		cache-dependency-path: apps/api/package-lock.json
- run: npm ci
```

Auto-detect PM (when `cache: none` and package.json contains `packageManager`):

```yaml
- uses: ./.github/actions/setup-node
	with:
		node-version: 18.x
		package-manager-cache: true
```

## OS support

Tested on:

- Linux (ubuntu-latest): toolcache path `/opt/hostedtoolcache/node/<version>/<arch>/bin`
- macOS (macos-latest): toolcache path `/opt/hostedtoolcache/node/<version>/<arch>/bin` (GitHub uses the same root symlink)
- Windows (windows-latest): toolcache path derived from `$AGENT_TOOLSDIRECTORY` (e.g. `C:\hostedtoolcache\windows\node\<version>\x64`)

Package manager cache paths:

- Linux/macOS:
  - npm: `~/.npm`
  - yarn: `~/.cache/yarn`
  - pnpm: `~/.pnpm-store`
- Windows:
  - npm: `%LOCALAPPDATA%/npm-cache`
  - yarn: `%LOCALAPPDATA%/Yarn/Cache`
  - pnpm: `%USERPROFILE%/pnpm-store`

If the OS isn’t recognized, caching is skipped with a notice; Node setup still proceeds. Windows support is now explicitly validated in CI.

## Security notes

- No external actions are used for Node activation.
- For caching, we pin `actions/cache@v4.3.0` by commit SHA to reduce supply-chain risk.
- Fails fast on invalid inputs, missing toolcache, or architecture directories.

See OWASP ASVS 4.0.3 recommendations for supply chain and input validation.

## Limitations

- This action relies on the pre-installed toolcache on GitHub-hosted runners. Self-hosted runners must provision Node under `$RUNNER_TOOL_CACHE/node` or set `AGENT_TOOLSDIRECTORY` appropriately for Windows.
- The action caches package manager global data (per official guidance), not `node_modules`.

## Development

- Resolver script: `setup-node.sh` (OPERATIONAL)
- Composite metadata: `action.yml`
- Integration tests: `.github/workflows/test-setup-node-action.yml`:
  - Activation matrix: Node 18.x & 20.x across Ubuntu and Windows
  - Cache verification jobs: npm, yarn (classic), pnpm — each seeds initial cache then asserts `cache-hit=true` on second run
  - Uses `corepack` to prepare Yarn and pnpm with pinned versions for reproducible lockfile formats
  - All jobs pin third-party actions by commit SHA (SEC-02)
  - CI proves cross-PM and cross-OS determinism (QUAL-01, TEST-01)

## License

Internal to this repository. See project root `LICENSE`.
