#!/usr/bin/env bash
# Archive Docker-related files into archive/docker-removal-<timestamp>
# Safe: uses git mv when available; falls back to mv.
# Usage: bash scripts/remove-docker-artifacts.sh
set -euo pipefail

TS=$(date +"%Y%m%d%H%M%S")
ARCHIVE_DIR="archive/docker-removal-${TS}"
mkdir -p "$ARCHIVE_DIR"

# Candidate paths to archive (pattern list). Edit this list if you need to include/exclude paths.
paths=(
  ".devcontainer"
  ".devcontainer/Dockerfile"
  ".devcontainer/README.md"
  ".devcontainer/FIXES.md"
  ".devcontainer/QUICK-START.md"
  ".devcontainer/scripts/validate-host.sh"
  ".devcontainer/scripts/setup-env.sh"
  ".devcontainer/scripts/status-check.sh"
  ".devcontainer/scripts/docker-socket-perms.sh"
  "apps/dev/docker"
  "apps/dev/docker/docker-compose.dev.yaml"
  "monitoring"
  "apps/api/Dockerfile"
  "apps/frontend/Dockerfile"
  "apps/worker/Dockerfile"
  ".dockerignore"
  "scripts/docker-helper.sh"
  "scripts/container-fix-summary.sh"
  "scripts/bootstrap-dev.sh"
  "scripts/bootstrap-fullstack-dev.sh"
  "apps/dev/scripts/dev-up.sh"
  "apps/dev/scripts/dev-down.sh"
  "apps/dev/scripts/dev-service.sh"
)

moved=()

for p in "${paths[@]}"; do
  if [ -e "$p" ]; then
    dest="${ARCHIVE_DIR}/${p}"
    mkdir -p "$(dirname "$dest")"
    # If the file is tracked by git, use git mv to preserve history; otherwise fallback to mv
    if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git ls-files --error-unmatch "$p" >/dev/null 2>&1; then
      echo "[GIT] mv $p -> $dest"
      git mv "$p" "$dest"
    else
      echo "[FS] mv $p -> $dest"
      mv "$p" "$dest"
    fi
    moved+=("$p")
  else
    echo "[SKIP] $p (not present)"
  fi
done

if [ ${#moved[@]} -eq 0 ]; then
  echo "No Docker-related files found to archive."
  exit 0
fi

# Record changelog and TODO entries for traceability
CHANGELOG="docs/CHANGELOG.md"
TODO="TODO.md"
now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

changelog_entry="\n### Archived Docker artefacts - ${now}\n\n- Archived Docker-related files and directories to \`${ARCHIVE_DIR}/\` for repository reset/rehabilitation.\n\nFiles archived:\n"
for f in "${moved[@]}"; do
  changelog_entry+="- ${f}\n"
done
changelog_entry+="\n"

todo_entry="\n- [ ] Review archived Docker artefacts in \`${ARCHIVE_DIR}/\` and commit or permanently delete (archived: ${now})\n"

# Append changelog/TODO if files exist; create if not.
if [ -f "$CHANGELOG" ]; then
  printf "%b" "$changelog_entry" >> "$CHANGELOG"
  echo "[INFO] Appended changelog entry to $CHANGELOG"
else
  printf "# Changelog\n\n%b" "$changelog_entry" > "$CHANGELOG"
  echo "[INFO] Created $CHANGELOG with entry"
fi

if [ -f "$TODO" ]; then
  printf "%b" "$todo_entry" >> "$TODO"
  echo "[INFO] Appended TODO entry to $TODO"
else
  printf "%b" "$todo_entry" > "$TODO"
  echo "[INFO] Created $TODO with entry"
fi

echo ""
echo "Archived files:"
for f in "${moved[@]}"; do
  echo " - $f"
done

echo ""
echo "Archive path: $ARCHIVE_DIR"
echo "Next steps:"
echo "  1) Inspect the archive directory and verify contents."
echo "  2) Run tests / linters to ensure nothing breaks."
echo "  3) Commit the changes: git add -A && git commit -m \"chore: archive docker artefacts for reset (${TS})\""
echo ""
exit 0
