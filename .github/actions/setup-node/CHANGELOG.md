# Changelog - setup-node

All notable changes to the setup-node composite action will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-11-07

### Added

- Optional dependency caching with `actions/cache@v4.3.0` (pinned SHA) for npm, yarn, and pnpm.
- New inputs: `cache`, `cache-dependency-path`, `package-manager-cache`.
- Auto-detection of package manager from `package.json` when `cache=none` and autodetection enabled.
- New output: `cache-hit` to surface whether a cache was restored.
- Integration workflow updated to seed and verify an npm cache across jobs.
- Windows runner support: toolcache path resolution using `AGENT_TOOLSDIRECTORY` with fallback; README updated accordingly.

### Security

- Pinned `actions/cache` to commit SHA `0057852bfaa89a56745cba8c7296529d2fc39830` (v4.3.0).

## [0.1.0] - 2025-11-07

### Added

- Initial release of internal composite action that activates Node.js from the GitHub runner toolcache.
- Inputs:
  - `node-version` (required): Accepts `MAJOR.x` (e.g., `18.x`, `20.x`) and resolves to the highest available patch for that major.
  - `cache` (optional): Reserved for future package manager caching; currently a no-op.
- Outputs:
  - `resolved-version`: The concrete Node version activated (e.g., `20.11.1`).
- Behavior:
  - Validates input format and fails fast on invalid versions.
  - Locates `/opt/hostedtoolcache/node/<version>/<arch>/bin` and prepends it to `PATH` via `$GITHUB_PATH`.
  - Chooses `x64` first, falling back to `arm64` when needed.

### Security & Compliance

- No external actions used inside the composite (reduces supply chain risk).
- Fails closed when toolcache/path is missing.
- Aligned with project rules: QUAL-01 (deterministic behavior), SEC-02 (avoid unpinned deps internally), OPS-01 (clear logging), TEST-01 (integration workflow).

### Testing

- Integration workflow: `.github/workflows/test-setup-node-action.yml` runs on ubuntu-latest with Node `18.x` and `20.x` matrices.
- Asserts major version alignment and performs a minimal `npm install` to verify functional runtime.

---

[0.1.0]: https://github.com/PoliticalSphere/political-sphere/commits/main

## [0.2.0] - 2025-11-07

### Added

- Optional dependency caching with `actions/cache@v4.3.0` (pinned SHA) for npm, yarn, and pnpm.
- New inputs: `cache`, `cache-dependency-path`, `package-manager-cache`.
- Auto-detection of package manager from `package.json` when `cache=none` and autodetection enabled.
- New output: `cache-hit` to surface whether a cache was restored.
- Integration workflow updated to seed and verify an npm cache across jobs.
- Windows runner support: toolcache path resolution using `AGENT_TOOLSDIRECTORY` with fallback; README updated accordingly.

### Security

- Pinned `actions/cache` to commit SHA `0057852bfaa89a56745cba8c7296529d2fc39830` (v4.3.0).

### Notes

- Linux/macOS cache paths supported out of the box. Windows paths implemented and now exercised in CI but may require refinement for self-hosted environments.

[0.2.0]: https://github.com/PoliticalSphere/political-sphere/commits/main
