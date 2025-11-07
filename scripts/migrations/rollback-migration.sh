#!/usr/bin/env bash
set -euo pipefail

echo "Rolling back app structure migration..."

# Return to main branch
git checkout main

# Reset to backup tag
BACKUP_TAG=$(git tag | grep "pre-migration-backup" | tail -1)

if [ -z "${BACKUP_TAG}" ]; then
    echo "Error: No backup tag found"
    exit 1
fi

echo "Restoring to tag: ${BACKUP_TAG}"
git reset --hard "${BACKUP_TAG}"

# Delete migration branch
git branch -D refactor/apps-structure-migration || true

echo "Rollback complete. Migration branch deleted."
echo "To clean up backup tag: git tag -d ${BACKUP_TAG}"
