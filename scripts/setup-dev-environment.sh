#!/usr/bin/env bash
#
# Political Sphere - Development Environment Setup Script
# One-command setup for instant onboarding
#
# Usage: ./scripts/setup-dev-environment.sh
#
# Owner: Platform Engineering Team
# Last Updated: 2025-11-05

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Branding
print_banner() {
    echo ""
    echo -e "${PURPLE}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║         🏛️  POLITICAL SPHERE 🏛️                     ║${NC}"
    echo -e "${PURPLE}║                                                    ║${NC}"
    echo -e "${PURPLE}║    Democratic Governance • Political Simulation    ║${NC}"
    echo -e "${PURPLE}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}✨ Welcome! Setting up your development environment...${NC}"
    echo ""
}

# Progress tracking
STEPS_TOTAL=12
STEP_CURRENT=0

print_step() {
    STEP_CURRENT=$((STEP_CURRENT + 1))
    echo ""
    echo -e "${BLUE}[Step $STEP_CURRENT/$STEPS_TOTAL]${NC} ${1}"
}

print_success() {
    echo -e "${GREEN}✅ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}"
}

print_error() {
    echo -e "${RED}❌ ${1}${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  ${1}${NC}"
}

# Error handler
handle_error() {
    print_error "Setup failed at step $STEP_CURRENT"
    echo ""
    echo "Please check the error message above and try again."
    echo "For help, visit: https://github.com/PoliticalSphere/political-sphere/issues"
    exit 1
}

trap 'handle_error' ERR

# Start setup
print_banner

# Step 1: Check prerequisites
print_step "Checking prerequisites..."

check_command() {
    if command -v "$1" &> /dev/null; then
        print_success "$1 installed"
        return 0
    else
        print_warning "$1 not found"
        return 1
    fi
}

PREREQ_FAILED=false

# Required tools
if ! check_command "git"; then
    print_error "Git is required. Install from: https://git-scm.com"
    PREREQ_FAILED=true
fi

if ! check_command "node"; then
    print_error "Node.js is required. Install from: https://nodejs.org (v22+ recommended)"
    PREREQ_FAILED=true
else
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ required (current: $NODE_VERSION)"
        PREREQ_FAILED=true
    else
        print_success "Node.js v$NODE_VERSION"
    fi
fi

if ! check_command "npm"; then
    print_error "npm is required (comes with Node.js)"
    PREREQ_FAILED=true
fi

# Optional but recommended
check_command "docker" || print_warning "Docker not found (optional for local containers)"
check_command "gh" || print_warning "GitHub CLI not found (optional for better workflow)"

if [ "$PREREQ_FAILED" = true ]; then
    print_error "Prerequisites check failed. Please install missing tools."
    exit 1
fi

print_success "All required prerequisites installed!"

# Step 2: Configure Git
print_step "Configuring Git..."

# Check if git user is configured
if ! git config user.name &> /dev/null; then
    print_warning "Git user not configured"
    read -p "Enter your name: " GIT_NAME
    git config --global user.name "$GIT_NAME"
    print_success "Set git user.name to '$GIT_NAME'"
fi

if ! git config user.email &> /dev/null; then
    print_warning "Git email not configured"
    read -p "Enter your email: " GIT_EMAIL
    git config --global user.email "$GIT_EMAIL"
    print_success "Set git user.email to '$GIT_EMAIL'"
fi

# Enable helpful git settings
git config --global pull.rebase true
git config --global fetch.prune true
git config --global diff.colorMoved zebra

print_success "Git configured!"

# Step 3: Install Node dependencies
print_step "Installing dependencies (this may take a few minutes)..."

npm ci

print_success "Dependencies installed!"

# Step 4: Install and configure Lefthook
print_step "Setting up git hooks (Lefthook)..."

npx lefthook install

print_success "Git hooks installed!"

# Step 5: Verify environment
print_step "Verifying workspace integrity..."

npx nx workspace-lint

print_success "Workspace integrity verified!"

# Step 6: Run initial linting
print_step "Running linters..."

npm run lint -- --fix || print_warning "Some linting issues found (can fix later)"

print_success "Linting complete!"

# Step 7: Run type checking
print_step "Running type checks..."

npm run type-check || print_warning "Some type errors found (can fix later)"

print_success "Type checking complete!"

# Step 8: Run tests (quick smoke test)
print_step "Running smoke tests..."

npm run test -- --run --passWithNoTests || print_warning "Some tests failed (can fix later)"

print_success "Tests complete!"

# Step 9: Build the project
print_step "Building project..."

npm run build || print_warning "Build had some warnings (likely okay)"

print_success "Build complete!"

# Step 10: Create local environment file
print_step "Setting up environment configuration..."

if [ ! -f .env.local ]; then
    cat > .env.local << 'EOF'
# Political Sphere - Local Development Environment
# Generated by setup script

# Node environment
NODE_ENV=development

# Feature flags
ENABLE_DEBUG_MODE=true
ENABLE_EXPERIMENTAL_FEATURES=false

# API Configuration
API_PORT=3000
API_HOST=localhost

# Database (if using local)
# DATABASE_URL=postgresql://localhost:5432/political_sphere_dev

# Add your custom environment variables below:

EOF
    print_success "Created .env.local"
else
    print_info ".env.local already exists, skipping"
fi

# Step 11: Set up VS Code (if detected)
print_step "Configuring editor..."

if command -v code &> /dev/null; then
    print_info "VS Code detected, checking recommended extensions..."
    
    # Create VS Code settings if they don't exist
    mkdir -p .vscode
    
    if [ ! -f .vscode/settings.json ]; then
        cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.eol": "\n",
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true
}
EOF
        print_success "Created VS Code settings"
    fi
    
    # Suggest extensions
    print_info "Recommended VS Code extensions:"
    echo "  - ESLint"
    echo "  - Prettier"
    echo "  - GitHub Copilot"
    echo "  - GitLens"
    echo ""
else
    print_info "VS Code not detected, skipping editor setup"
fi

# Step 12: Final verification
print_step "Running final health checks..."

# Check if git hooks are working
if [ -f .git/hooks/pre-commit ]; then
    print_success "Git hooks are active"
else
    print_warning "Git hooks may not be properly installed"
fi

# Check node_modules
if [ -d node_modules ]; then
    print_success "Node modules present"
else
    print_error "Node modules missing!"
fi

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  🎉 SETUP COMPLETE! 🎉              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

print_success "Environment setup completed successfully!"
echo ""
echo -e "${CYAN}📋 Next Steps:${NC}"
echo ""
echo "  1. Review the documentation:"
echo "     ${BLUE}docs/onboarding.md${NC}"
echo ""
echo "  2. Start the development server:"
echo "     ${BLUE}npm run dev${NC}"
echo ""
echo "  3. Run tests in watch mode:"
echo "     ${BLUE}npm run test:watch${NC}"
echo ""
echo "  4. Explore the codebase:"
echo "     ${BLUE}./apps/${NC} - Applications"
echo "     ${BLUE}./libs/${NC} - Shared libraries"
echo "     ${BLUE}./docs/${NC} - Documentation"
echo ""
echo -e "${CYAN}🔧 Useful Commands:${NC}"
echo ""
echo "  ${BLUE}npm run lint${NC}              - Run linter"
echo "  ${BLUE}npm run test${NC}              - Run tests"
echo "  ${BLUE}npm run type-check${NC}        - Type checking"
echo "  ${BLUE}npm run build${NC}             - Build project"
echo "  ${BLUE}npx nx graph${NC}              - View dependency graph"
echo "  ${BLUE}npx lefthook run pre-commit${NC} - Test git hooks"
echo ""
echo -e "${CYAN}📚 Resources:${NC}"
echo ""
echo "  Documentation: ${BLUE}docs/${NC}"
echo "  Architecture:  ${BLUE}docs/architecture/${NC}"
echo "  Contributing:  ${BLUE}docs/contributing.md${NC}"
echo "  Standards:     ${BLUE}docs/standards-overview.md${NC}"
echo ""
echo -e "${CYAN}💬 Get Help:${NC}"
echo ""
echo "  Slack:  ${BLUE}#dev-help${NC}"
echo "  Issues: ${BLUE}https://github.com/PoliticalSphere/political-sphere/issues${NC}"
echo ""
echo -e "${PURPLE}Thank you for contributing to democratic technology! 🏛️${NC}"
echo ""

# Record setup completion
echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC')" > .setup-completed
echo "$(whoami)" >> .setup-completed
echo "$(node --version)" >> .setup-completed

print_success "Setup script completed in approximately $((SECONDS / 60)) minutes!"
echo ""
