# AI on Dev: Local AI Helpers for Political Sphere

This document explains how to use the local AI-powered development tools in Political Sphere. All AI features run locally using Ollama and do not require any cloud APIs or paid services.

## Prerequisites

1. Install Ollama: https://ollama.ai/
2. Pull the Llama 3 model: `ollama pull llama3`

## Available AI Scripts

### Commit Message Generator (`npm run ai:commit`)

Generates Conventional Commit messages from your staged changes.

```bash
# Stage your changes
git add .

# Generate commit message
npm run ai:commit

# Copy the output and commit
git commit -m "feat: add new feature

Generated description..."
```

### PR Review Helper (`npm run ai:review`)

Performs a basic AI-powered code review on your changes. Falls back to linting if Ollama is not available.

```bash
# After making changes
npm run ai:review
```

## Copilot MCP Toolbelt

Use the free Model Context Protocol servers to feed Copilot richer, real-time context without cloud calls. Each server runs via a simple npm script and streams results back to your editor.

| Command                   | Purpose                                                                                     | Highlighted Tools                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `npm run mcp:code-intel`  | TypeScript language service wrapper for local code intelligence.                            | `codeintel_definition`, `codeintel_references`, `codeintel_quickinfo`                  |
| `npm run mcp:docs-search` | Ripgrep-backed search plus Markdown outline/excerpt helpers over `docs/`, apps, and config. | `docs_search`, `docs_outline`, `docs_excerpt`                                          |
| `npm run mcp:test-runner` | Runs vetted workflows like `lint:ci`, `test:fast`, or `vitest --run "<pattern>"`.           | `tests_run_task`, `tests_run_vitest_pattern`, `tests_list_tasks`                       |
| `npm run mcp:config`      | Safe access to `.env*.example` templates and `config/features/feature-flags.json`.          | `config_list_env_templates`, `config_read_env_template`, `config_feature_flag_details` |
| `npm run mcp:sqlite`      | Read-only SQLite queries plus dataset catalog lookups for `data/*.db`.                      | `sqlite_list_tables`, `sqlite_query`, `sqlite_dataset_metadata`                        |
| `npm run mcp:issues`      | Reads `data/issues/backlog.yml` so assistants can reference real backlog items.             | `issues_query`, `issues_get`, `issues_summary`                                         |

> Tip: launch whichever servers you need via `npm run mcp:<name>` and point your Copilot / MCP client at the resulting STDIO transport. The `docs_outline` and `tests_list_tasks` helpers were added as bonus utilities so assistants can quickly orient themselves even without a specific question.

## How It Works

- **Local Only**: All processing happens on your machine using Ollama
- **No Data Sent**: Code diffs are processed locally, never transmitted
- **Fallback Mode**: If Ollama isn't running, scripts fall back to standard linting
- **Zero Cost**: No API calls or subscription fees

## Installation

Ollama is optional for development. If not installed, the scripts will gracefully fall back to rule-based checks.

## Troubleshooting

- **Ollama not found**: Install Ollama and run `ollama pull llama3`
- **Model not available**: Ensure Llama 3 is pulled: `ollama pull llama3`
- **Slow performance**: AI processing may take time depending on your hardware

## Security Note

All AI processing is local. No code or diffs are sent to external services.
