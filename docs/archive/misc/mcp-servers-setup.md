# MCP Servers Setup & Usage

| Classification | Version | Last Updated | Owner | Review Cycle | Status |
| :------------: | :-----: | :----------: | :---: | :----------: | :----: |
| 🔒 Internal | `0.3.0` | 2025-11-04 | Platform Engineering | Quarterly | **Active** |

---

## Overview

Political Sphere ships a curated suite of MCP (Model Context Protocol) servers to supercharge day-to-day development. Each server is exposed as an STDIO process and offers focused tooling for code navigation, governance, data insights, or external lookups.

All servers are available via `npm run mcp:<name>` (repository root) and through `.mcp.json` for IDE integrations. They share a few guarantees:

- **Safe defaults** – repository-root sandboxing, read-only DB access, and rate-limited external calls.
- **Stateless execution** – everything runs on demand and exits cleanly; no background daemons left behind.
- **Rich telemetry** – every server emits a single `... ready on STDIO` line on stderr to simplify health checks.

### Server Catalog

| Script | Description | Highlights |
| --- | --- | --- |
| `mcp:filesystem` | Introspect repository structure | `list_directory`, `read_file`, `search_text` |
| `mcp:git` | Local Git analytics | `git_status`, `git_log`, `git_diff`, `git_show` |
| `mcp:github` | GitHub metadata (requires `GITHUB_TOKEN`) | `repo_overview`, `list_pull_requests`, `search_issues` |
| `mcp:sqlite` | Read-only SQLite queries | Auto-discovers `.db` files, enforces SELECT-only |
| `mcp:puppeteer` | Lightweight web automation | `fetch_dom`, `screenshot` with headless Chrome |
| `mcp:political-sphere` | Domain knowledge surface | Document catalogues, governance TODO extraction |
| `mcp:ai-assistant` | In-repo AI co-pilot | Code generation, review, testing heuristics |
| `mcp:microsoft-learn` | Offline Microsoft Learn index | Curated training catalog & skill recommendations |
| `mcp:duckduckgo` | HTTP stub for quick search | `/health` + `/search?q=` proxy to Instant Answer API |
| `mcp:playwright` | Official Playwright MCP | Browser automation from Microsoft (external dependency) |
| `mcp:chrome-devtools` | Chrome DevTools bridge | Performance & debugging tooling |
| `mcp:filesystem-official` | Reference filesystem MCP | Direct from MCP SDK authors |
| `mcp:time` | Time utilities | Standard MCP time helpers |

## Prerequisites

1. **Node.js ≥ 18** – MCP servers rely on native `fetch`, async/await, and top-level `await`.
2. **Dependencies installed** – run `npm install` (repository root).
3. **Optional tokens** – set `GITHUB_TOKEN` for GitHub API access; other servers run without credentials.
4. **Chromium availability** – the Puppeteer MCP uses `puppeteer`, which bundles Chromium automatically. If the binary is missing, run `npx puppeteer browsers install chrome`.

## Quick Start

```bash
# Start a server manually (terminate with Ctrl+C)
npm run mcp:filesystem

# Launch multiple servers for an IDE in separate terminals
npm run mcp:filesystem &
npm run mcp:git &
npm run mcp:political-sphere &
```

IDE/agent clients can point at `.mcp.json` (root) which defines all servers with their corresponding scripts.

## Capability Reference

### Filesystem MCP

- **Tools**: `list_directory`, `read_file`, `search_text`
- **Safety**: repository-root sandbox, 512 KB file limit, 20-result search cap
- **When to use**: quick file previews, doc lookup, lightweight text search without shell access

### Git MCP

- **Tools**: `git_status`, `git_log`, `git_diff`, `git_show`
- **Implementation**: wraps native `git` under the hood – no extra dependencies
- **Tips**: combine with Filesystem MCP to stage a review-ready context for pull requests

### GitHub MCP

- **Tools**: `github_repo_overview`, `github_list_pull_requests`, `github_search_issues`
- **Configuration**: detects repository from `GITHUB_REPOSITORY` or local `origin` remote. Provide `GITHUB_TOKEN` to avoid rate limits.
- **Error handling**: meaningful diagnostics returned on auth failures or API errors

### SQLite MCP

- **Tools**: `sqlite_list_tables`, `sqlite_table_info`, `sqlite_query`
- **Safeguards**: read-only connections, `SELECT`-only enforcement, 100-row cap
- **Discovery**: auto-scans `data/`, `apps/api`, `apps/worker`, `reports/`, and root for `.db` files

### Puppeteer MCP

- **Tools**: `puppeteer_fetch_dom`, `puppeteer_screenshot`
- **Behaviour**: launches a fresh headless Chrome per request with `--no-sandbox` for local compatibility
- **Outputs**: DOM is truncated to 50k chars; screenshots returned as base64 JSON payloads

### Political Sphere MCP

- **Tools**: `ps_list_documents`, `ps_preview_document`, `ps_search_topics`, `ps_governance_tasks`
- **Use cases**: summarise governance docs, surface current TODO owners, attach domain context to AI prompts

### Microsoft Learn MCP

- **Tools**: `learn_search`, `learn_topic`, `learn_recommend_for_skill`
- **Dataset**: curated offline index stored in `apps/dev/mcp-servers/microsoft-learn/topics.json`
- **Scenario**: suggest training modules for newcomers or targeted up-skilling

### AI Assistant MCP

- **Location**: `apps/dev/ai/ai-assistant`
- **Tools**: `generate_code`, `review_code`, `optimize_performance`, `generate_tests`, `simulate_scenario`
- **Note**: ships compiled output in `dist/index.js`—no build step needed to run

## Health Checks

- All STDIO servers emit `"<name> MCP server ready on STDIO"` on startup.
- The DuckDuckGo HTTP stub exposes `/health` returning `{ status: "ok" }`.
- Use `npm run mcp:<name> & sleep 1; pkill -f <name>` in scripts to run smoke checks without hanging.

## Troubleshooting

- **`Server does not support tools`**: ensure you’re running the updated code (capabilities are negotiated automatically).
- **GitHub rate limits**: set `export GITHUB_TOKEN=...` before launching the GitHub MCP.
- **Chromium launch failures**: run `npx puppeteer browsers install chrome` and retry `mcp:puppeteer`.
- **SQLite missing database**: add your `.db` file under `data/` or run `sqlite_list_tables` to see discovered paths.

## Roadmap

- Add streaming support for large file reads in Filesystem MCP.
- Expand Political Sphere MCP with scenario simulation hooks from the game server.
- Introduce persistence-aware caching for Puppeteer sessions to accelerate repeat fetches.

For feedback or feature requests, open an issue tagged `mcp` or ping #platform-engineering.
