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
