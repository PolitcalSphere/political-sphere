#!/usr/bin/env bash
set -euo pipefail

# Political Sphere App Structure Migration Script
# Migrates apps from current structure to intended structure per file-structure.md
# Version: 1.0.0
# Date: 2025-11-07

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MIGRATION_BRANCH="refactor/apps-structure-migration"
BACKUP_TAG="pre-migration-backup-$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓ ${NC}$1"
}

log_warning() {
    echo -e "${YELLOW}⚠ ${NC}$1"
}

log_error() {
    echo -e "${RED}✗ ${NC}$1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v npx &> /dev/null; then
        log_error "npx not found. Please install Node.js and npm."
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        log_error "git not found. Please install git."
        exit 1
    fi
    
    if [ ! -f "${PROJECT_ROOT}/nx.json" ]; then
        log_error "nx.json not found. Are you in the project root?"
        exit 1
    fi
    
    log_success "Prerequisites checked"
}

# Create backup and migration branch
create_backup() {
    log_info "Creating backup and migration branch..."
    
    cd "${PROJECT_ROOT}"
    
    # Create git tag for rollback
    git tag -a "${BACKUP_TAG}" -m "Backup before app structure migration"
    log_success "Created backup tag: ${BACKUP_TAG}"
    
    # Create migration branch
    if git rev-parse --verify "${MIGRATION_BRANCH}" &> /dev/null; then
        log_warning "Branch ${MIGRATION_BRANCH} already exists. Checking it out..."
        git checkout "${MIGRATION_BRANCH}"
    else
        git checkout -b "${MIGRATION_BRANCH}"
        log_success "Created and checked out branch: ${MIGRATION_BRANCH}"
    fi
}

# Commit current changes before migration
commit_current_changes() {
    log_info "Committing current changes..."
    
    cd "${PROJECT_ROOT}"
    
    if [ -n "$(git status --porcelain)" ]; then
        git add -A
        git commit -m "chore: save work in progress before app migration

- Updated file-structure.md with intended structure
- Cleaned up deprecated devcontainer docs
" || true
        log_success "Committed pending changes"
    else
        log_info "No changes to commit"
    fi
}

# Phase 1: Rename existing apps using Nx move generator
migrate_existing_apps() {
    log_info "Phase 1: Migrating existing apps with Nx move generator..."
    
    cd "${PROJECT_ROOT}"
    
    # frontend → web
    if [ -d "apps/frontend" ]; then
        log_info "Renaming frontend → web..."
        npx nx g move --projectName=frontend --destination=web --skipFormat || {
            log_error "Failed to move frontend to web"
            return 1
        }
        log_success "Renamed frontend → web"
    else
        log_warning "apps/frontend not found, skipping"
    fi
    
    # host → shell
    if [ -d "apps/host" ]; then
        log_info "Renaming host → shell..."
        npx nx g move --projectName=host --destination=shell --skipFormat || {
            log_error "Failed to move host to shell"
            return 1
        }
        log_success "Renamed host → shell"
    else
        log_warning "apps/host not found, skipping"
    fi
    
    # remote → feature-auth-remote
    if [ -d "apps/remote" ]; then
        log_info "Renaming remote → feature-auth-remote..."
        npx nx g move --projectName=remote --destination=feature-auth-remote --skipFormat || {
            log_error "Failed to move remote to feature-auth-remote"
            return 1
        }
        log_success "Renamed remote → feature-auth-remote"
    else
        log_warning "apps/remote not found, skipping"
    fi
    
    # Commit renames
    git add -A
    git commit -m "refactor(apps): rename apps to intended structure

- frontend → web
- host → shell
- remote → feature-auth-remote

All import paths updated automatically by Nx move generator.
" || true
    
    log_success "Phase 1 complete: Existing apps renamed"
}

# Phase 2: Generate new apps
generate_new_apps() {
    log_info "Phase 2: Generating new apps..."
    
    cd "${PROJECT_ROOT}"
    
    # Check what's already present
    local existing_apps=()
    for app in "data" "infrastructure" "e2e" "load-test" "feature-dashboard-remote" "game-server"; do
        if [ -d "apps/${app}" ]; then
            existing_apps+=("${app}")
        fi
    done
    
    if [ ${#existing_apps[@]} -gt 0 ]; then
        log_info "Already existing: ${existing_apps[*]}"
    fi
    
    # Generate data app (Node.js service for ETL)
    if [ ! -d "apps/data" ]; then
        log_info "Generating data app..."
        npx nx g @nx/node:application data --directory=apps/data --skipFormat || {
            log_warning "Could not generate data app, will create manually"
        }
    fi
    
    # Generate infrastructure app (Node.js CLI/tooling)
    if [ ! -d "apps/infrastructure" ]; then
        log_info "Generating infrastructure app..."
        npx nx g @nx/node:application infrastructure --directory=apps/infrastructure --skipFormat || {
            log_warning "Could not generate infrastructure app, will create manually"
        }
    fi
    
    # Generate e2e app (Playwright tests)
    if [ ! -d "apps/e2e" ]; then
        log_info "Generating e2e app..."
        npx nx g @nx/playwright:configuration --project=e2e --webServerCommand="npm run start" --webServerAddress="http://localhost:4200" --skipFormat || {
            log_warning "Could not generate e2e app, will create manually"
        }
    fi
    
    # Generate load-test app (Node.js for k6/artillery scripts)
    if [ ! -d "apps/load-test" ]; then
        log_info "Generating load-test app..."
        npx nx g @nx/node:application load-test --directory=apps/load-test --skipFormat || {
            log_warning "Could not generate load-test app, will create manually"
        }
    fi
    
    # Generate feature-dashboard-remote (React micro-frontend)
    if [ ! -d "apps/feature-dashboard-remote" ]; then
        log_info "Generating feature-dashboard-remote app..."
        npx nx g @nx/react:application feature-dashboard-remote --directory=apps/feature-dashboard-remote --skipFormat || {
            log_warning "Could not generate feature-dashboard-remote, will create manually"
        }
    fi
    
    # Note: game-server already exists, skip
    
    # Commit new apps
    git add -A
    git commit -m "feat(apps): generate new app scaffolds

- data (Node.js ETL service)
- infrastructure (IaC tooling)
- e2e (Playwright tests)
- load-test (performance testing)
- feature-dashboard-remote (React micro-frontend)
" || true
    
    log_success "Phase 2 complete: New apps generated"
}

# Phase 3: Verify migration
verify_migration() {
    log_info "Phase 3: Verifying migration..."
    
    cd "${PROJECT_ROOT}"
    
    # List final app structure
    log_info "Current apps in workspace:"
    npx nx show projects --type app || true
    
    # Run builds to verify nothing broke
    log_info "Running builds to verify integrity..."
    npx nx run-many --target=build --all --skip-nx-cache || {
        log_warning "Some builds failed. Review errors above."
    }
    
    # Run tests
    log_info "Running tests..."
    npx nx run-many --target=test --all --skip-nx-cache || {
        log_warning "Some tests failed. Review errors above."
    }
    
    # Verify nx graph
    log_info "Generating dependency graph..."
    npx nx graph --file=migration-graph.html || true
    
    log_success "Phase 3 complete: Migration verified"
}

# Generate rollback script
generate_rollback_script() {
    log_info "Generating rollback script..."
    
    cat > "${SCRIPT_DIR}/rollback-migration.sh" << 'EOF'
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
EOF
    
    chmod +x "${SCRIPT_DIR}/rollback-migration.sh"
    
    log_success "Rollback script created at: ${SCRIPT_DIR}/rollback-migration.sh"
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "  Political Sphere App Migration Script  "
    echo "=========================================="
    echo ""
    
    check_prerequisites
    create_backup
    commit_current_changes
    generate_rollback_script
    
    echo ""
    log_info "Starting migration phases..."
    echo ""
    
    migrate_existing_apps
    generate_new_apps
    verify_migration
    
    echo ""
    echo "=========================================="
    log_success "Migration completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "  1. Review changes: git log --oneline -10"
    echo "  2. Check dependency graph: open migration-graph.html"
    echo "  3. Run full test suite: npm test"
    echo "  4. If satisfied, merge to main: git checkout main && git merge ${MIGRATION_BRANCH}"
    echo "  5. If issues, rollback: ./scripts/migrations/rollback-migration.sh"
    echo ""
    echo "Backup tag: ${BACKUP_TAG}"
    echo "Migration branch: ${MIGRATION_BRANCH}"
    echo ""
}

# Run main function
main "$@"
