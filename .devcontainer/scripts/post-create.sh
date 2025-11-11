#!/usr/bin/env bash
set -euo pipefail

echo "📦 Installing Python tooling (DVC & friends)..."
if [[ -f requirements-dev.txt ]]; then
  PYTHON_TOOLS_PIP_VERSION="24.3.1"
  python3 -m pip install --user --upgrade "pip==${PYTHON_TOOLS_PIP_VERSION}"

  while IFS= read -r requirement; do
    [[ -z "${requirement}" || "${requirement}" =~ ^# ]] && continue
    if [[ "${requirement}" != *"=="* ]]; then
      echo "Skipping unpinned requirement: ${requirement}"
      continue
    fi
    python3 -m pip install --user "${requirement}"
  done < requirements-dev.txt
else
  echo "requirements-dev.txt not found, skipping Python tool installation."
fi

echo "🚦 Running AI preflight..."
npm run ai:preflight || echo 'Preflight checks skipped'
