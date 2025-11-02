#!/bin/bash

# Universal Audit Command for Political Sphere
# Performs comprehensive audit across all project dimensions
# Output: Structured JSON with audit results

set -euo pipefail

# Configuration
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_FILE="${REPO_ROOT}/audit-results.json"
MODE="${1:-full}"
NETWORK="${2:-online}"
AGENT_LOOP_SAFE="${3:-true}"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Audit results array
AUDIT_RESULTS=()

# Structured output function
add_result() {
    local severity="$1"
    local category="$2"
    local evidence="$3"
    local impact="$4"
    local fix="$5"
    local todo="$6"
    local learning="$7"

    AUDIT_RESULTS+=("$(cat <<EOF
{
  "severity": "$severity",
  "category": "$category",
  "evidence": "$evidence",
  "impact": "$impact",
  "fix_recommendation": "$fix",
  "todo_entry": "$todo",
  "followup_learning_note": "$learning"
}
EOF
)")
}

# Run command and capture result
run_check() {
    local name="$1"
    local cmd="$2"
    local category="$3"
    local critical="${4:-false}"

    echo -e "${YELLOW}Running $name...${NC}"
    if eval "$cmd" 2>&1; then
        echo -e "${GREEN}✓ $name passed${NC}"
        return 0
    else
        local exit_code=$?
        echo -e "${RED}✗ $name failed (exit code: $exit_code)${NC}"

        if [ "$critical" = "true" ]; then
            add_result "blocker" "$category" "$name failed with exit code $exit_code" "Critical system integrity compromised" "Fix the underlying issue immediately" "URGENT: Resolve $name failure" "Investigate root cause and update failure handling"
            return 1
        else
            add_result "warning" "$category" "$name failed with exit code $exit_code" "Potential quality degradation" "Review and fix if possible" "Review $name failure" "Analyze failure patterns for prevention"
            return 0
        fi
    fi
}

# Constitutional compliance check
check_constitution() {
    echo "Checking constitutional compliance..."
    # Check for deviations from .blackboxrules and project constitution
    if grep -q "MANIPULATION" "${REPO_ROOT}/.blackboxrules" && grep -q "neutrality" "${REPO_ROOT}/.blackboxrules"; then
        add_result "info" "governance" "Constitutional safeguards present" "Maintains democratic integrity" "No action needed" "" "Reinforce constitutional checks in CI"
    else
        add_result "blocker" "governance" "Missing constitutional safeguards" "Risk of manipulation" "Add explicit anti-manipulation rules" "Add constitutional compliance checks" "Update governance rules for better coverage"
    fi
}

# AI governance check
check_ai_governance() {
    echo "Checking AI governance..."
    if [ -f "${REPO_ROOT}/ai-controls.json" ] && [ -f "${REPO_ROOT}/ai-metrics.json" ]; then
        add_result "info" "ai-governance" "AI controls and metrics present" "Maintains AI safety" "No action needed" "" "Expand AI audit coverage"
    else
        add_result "warning" "ai-governance" "Missing AI governance files" "Potential AI safety gaps" "Implement AI controls framework" "Implement AI governance monitoring" "Develop comprehensive AI audit suite"
    fi
}

# Main audit function
run_full_audit() {
    echo "Starting full universal audit..."

    # Code Quality
    run_check "ESLint" "npm run lint" "code-quality" true
    run_check "TypeScript Typecheck" "npm run typecheck" "code-quality" true
    run_check "Import Boundaries" "node scripts/ci/check-import-boundaries.mjs" "architecture" true

    # Testing
    run_check "Unit Tests" "npm run test" "testing" true
    run_check "Accessibility Tests" "npm run test:a11y" "accessibility" true

    # Security
    run_check "Secret Scanning" "bash scripts/security/gitleaks-scan.sh" "security" true
    run_check "Novelty Guard" "node scripts/novelty-guard.js --min-novelty 0.2" "ai-governance" false

    # Documentation
    run_check "Documentation Lint" "npm run docs:lint" "documentation" false

    # Environment Validation
    run_check "Environment Validation" "node scripts/validate-env.js" "configuration" true

    # Controls
    run_check "Controls Runner" "node scripts/controls-runner.ts" "compliance" true

    # Constitutional Compliance
    check_constitution

    # AI Governance
    check_ai_governance

    # Infrastructure (if offline mode, skip network checks)
    if [ "$NETWORK" = "online" ]; then
        run_check "Dependency Audit" "npm audit" "dependencies" false
    else
        echo "Skipping dependency audit (offline mode)"
    fi

    # Observability
    if [ -d "${REPO_ROOT}/monitoring" ]; then
        add_result "info" "observability" "Monitoring stack configured" "Enables system observability" "No action needed" "" "Verify monitoring effectiveness"
    else
        add_result "warning" "observability" "Missing monitoring configuration" "Limited system visibility" "Implement observability stack" "Set up monitoring infrastructure" "Design comprehensive observability strategy"
    fi

    # Game Simulation Logic (placeholder - would need specific checks)
    add_result "info" "game-logic" "Game simulation logic audit placeholder" "Ensures fair gameplay" "Implement specific logic checks" "Develop game logic validation suite" "Create automated fairness testing"

    # Performance (placeholder)
    add_result "info" "performance" "Performance audit placeholder" "Validates system performance" "Implement performance benchmarks" "Add performance monitoring" "Establish performance SLOs"

    # Scalability (placeholder)
    add_result "info" "scalability" "Scalability assessment placeholder" "Ensures system can scale" "Conduct load testing" "Plan scalability improvements" "Design for horizontal scaling"

    # Privacy (placeholder)
    add_result "info" "privacy" "Privacy audit placeholder" "Protects user data" "Implement privacy checks" "Add data protection measures" "Conduct privacy impact assessment"

    # Anti-manipulation (placeholder)
    add_result "info" "anti-manipulation" "Anti-manipulation checks placeholder" "Prevents political manipulation" "Implement manipulation detection" "Develop neutrality safeguards" "Create manipulation monitoring"

    # Community Safety (placeholder)
    add_result "info" "community-safety" "Community safety audit placeholder" "Ensures safe community" "Implement moderation checks" "Add content safety filters" "Design appeals pathways"

    # FOSS Replacement (placeholder)
    add_result "info" "foss" "FOSS replacement opportunities placeholder" "Maintains open-source integrity" "Audit proprietary dependencies" "Replace non-FOSS tools" "Identify FOSS alternatives"

    # Legacy Debt (placeholder)
    run_check "Unused Code Check" "node scripts/find-unused.sh" "maintainability" false

    echo "Full audit completed."
}

run_short_audit() {
    echo "Running short everyday audit..."

    # Essential checks only
    run_check "ESLint" "npm run lint" "code-quality" true
    run_check "TypeScript Typecheck" "npm run typecheck" "code-quality" true
    run_check "Unit Tests" "npm run test" "testing" true
    run_check "Secret Scanning" "bash scripts/security/gitleaks-scan.sh" "security" true
    run_check "Controls Runner" "node scripts/controls-runner.ts" "compliance" true

    check_constitution
    check_ai_governance

    echo "Short audit completed."
}

run_ci_safe_audit() {
    echo "Running CI-safe audit..."

    # Non-destructive checks suitable for CI
    run_check "ESLint" "npm run lint" "code-quality" true
    run_check "TypeScript Typecheck" "npm run typecheck" "code-quality" true
    run_check "Unit Tests" "npm run test" "testing" true
    run_check "Accessibility Tests" "npm run test:a11y" "accessibility" true
    run_check "Secret Scanning" "bash scripts/security/gitleaks-scan.sh" "security" true
    run_check "Import Boundaries" "node scripts/ci/check-import-boundaries.mjs" "architecture" true
    run_check "Controls Runner" "node scripts/controls-runner.ts" "compliance" true

    check_constitution
    check_ai_governance

    echo "CI-safe audit completed."
}

run_offline_audit() {
    echo "Running offline audit..."

    # No network-dependent checks
    run_check "ESLint" "npm run lint" "code-quality" true
    run_check "TypeScript Typecheck" "npm run typecheck" "code-quality" true
    run_check "Unit Tests" "npm run test" "testing" true
    run_check "Secret Scanning" "bash scripts/security/gitleaks-scan.sh" "security" true
    run_check "Import Boundaries" "node scripts/ci/check-import-boundaries.mjs" "architecture" true
    run_check "Controls Runner" "node scripts/controls-runner.ts" "compliance" true

    check_constitution
    check_ai_governance

    echo "Offline audit completed."
}

run_agent_loop_safe_audit() {
    echo "Running agent-loop-safe audit..."

    # Deterministic, no loops, fast checks
    run_check "ESLint" "npm run lint" "code-quality" true
    run_check "TypeScript Typecheck" "npm run typecheck" "code-quality" true
    run_check "Secret Scanning" "bash scripts/security/gitleaks-scan.sh" "security" true
    run_check "Controls Runner" "node scripts/controls-runner.ts" "compliance" true

    check_constitution

    echo "Agent-loop-safe audit completed."
}

# Main execution
case "$MODE" in
    full)
        run_full_audit
        ;;
    short)
        run_short_audit
        ;;
    ci-safe)
        run_ci_safe_audit
        ;;
    offline)
        run_offline_audit
        ;;
    agent-loop-safe)
        run_agent_loop_safe_audit
        ;;
    *)
        echo "Usage: $0 {full|short|ci-safe|offline|agent-loop-safe} [online|offline] [true|false]"
        exit 1
        ;;
esac

# Output results
echo "Generating audit report..."
jq -n --argjson results "$(printf '%s\n' "${AUDIT_RESULTS[@]}" | jq -s '.')" '{timestamp: now | strftime("%Y-%m-%dT%H:%M:%SZ"), mode: "'"$MODE"'", network: "'"$NETWORK"'", agent_loop_safe: "'"$AGENT_LOOP_SAFE"'", results: $results}' > "$OUTPUT_FILE"

echo "Audit results saved to $OUTPUT_FILE"

# Check for blockers
BLOCKERS=$(jq '[.results[] | select(.severity == "blocker")] | length' "$OUTPUT_FILE")
if [ "$BLOCKERS" -gt 0 ]; then
    echo -e "${RED}Audit FAILED: $BLOCKERS blocker(s) found. Review $OUTPUT_FILE${NC}"
    exit 1
else
    echo -e "${GREEN}Audit PASSED: No blockers found.${NC}"
fi
