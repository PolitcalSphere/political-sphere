#!/usr/bin/env bash
# Start API, Frontend, and Worker processes inside the Dev Container
# without building Docker images. Uses tmux to run them detached.
set -euo pipefail

ROOT_DIR=$(pwd)
SESSION_NAME="apps"

# Ensure dependencies are installed (fast path if already present)
if [ ! -d "$ROOT_DIR/node_modules" ] || [ "$(ls -1 "$ROOT_DIR/node_modules" | wc -l | tr -d ' ')" -lt 100 ]; then
  echo "📦 Installing node dependencies before starting apps..."
  npm install --no-audit --prefer-offline
fi

# Ensure tmux exists
if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required inside the dev container but was not found." >&2
  exit 1
fi

# Create or reuse a tmux session
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "ℹ️  Reusing existing tmux session '$SESSION_NAME'"
else
  echo "🧪 Creating tmux session '$SESSION_NAME' for app processes"
  tmux new-session -d -s "$SESSION_NAME" -n api "npm run start:api"
  tmux new-window -t "$SESSION_NAME":2 -n frontend "npm run start:frontend"
  tmux new-window -t "$SESSION_NAME":3 -n worker "npm run start:worker"
fi

# Show helpful status
cat <<INFO
✅ App processes started in tmux session '$SESSION_NAME'

Attach to the session to watch logs:
  tmux attach -t $SESSION_NAME

List tmux sessions:
  tmux ls

Stop processes by closing panes/windows, or kill the session:
  tmux kill-session -t $SESSION_NAME
INFO
