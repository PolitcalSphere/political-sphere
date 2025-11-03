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

# Colors for output (TTY only)
if [ -t 1 ]; then
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  GREEN='\033[0;32m'
  NC='\033[0m' # No Color
else
  RED=''; YELLOW=''; GREEN=''; NC=''
fi

echo "Audit mode: $MODE, network: $NETWORK, agent_loop_safe: $AGENT_LOOP_SAFE"

# Fail-fast on missing tools & pick package manager
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 127; }; }
need jq; need grep
PKG=$(command -v pnpm >/dev/null && echo pnpm || command -v npm >/dev/null && echo npm)

# Harden JSON assembly (no heredocs-in-arrays); write NDJSON and a final JSON
AUDIT_DIR="${REPO_ROOT}/.audit"
AUDIT_NDJSON="${AUDIT_DIR}/results.ndjson"
AUDIT_LEDGER="${REPO_ROOT}/ai-history/ledger.ndjson"
mkdir -p "$AUDIT_DIR" "${REPO_ROOT}/ai-history"
: > "$AUDIT_NDJSON"

add_result() {
  jq -n --arg severity "$1" --arg category "$2" --arg evidence "$3" \
        --arg impact "$4" --arg fix "$5" --arg todo "$6" --arg learning "$7" \
        '{severity:$severity,category:$category,evidence:$evidence,impact:$impact,
          fix_recommendation:$fix,todo_entry:$todo,followup_learning_note:$learning}' \
  >> "$AUDIT_NDJSON"
}

# Make run_check capture stdout/stderr, time, and exit code into evidence
run_check() {
  local name="$1" cmd="$2" category="$3" critical="${4:-false}"
  local tmp="$(mktemp)"; local start end dur ec
  echo -e "${YELLOW}Running $name...${NC}"
  start=$(date +%s%3N)
  bash -o pipefail -c "$cmd" >"$tmp" 2>&1; ec=$?
  end=$(date +%s%3N); dur=$((end - start))
  if [ $ec -eq 0 ]; then
    echo -e "${GREEN}✓ $name (${dur}ms)${NC}"
    add_result "info" "$category" "$name ok in ${dur}ms" "Healthy" "None" "" "Baseline perf ${dur}ms"
    rm -f "$tmp"; return 0
  else
    echo -e "${RED}✗ $name failed (${dur}ms, code $ec)${NC}"
    local evidence_path="${AUDIT_DIR}/${name// /_}.log"
    mkdir -p "${AUDIT_DIR}"; tail -n 200 "$tmp" > "$evidence_path"
    if [ "$critical" = "true" ]; then
      add_result "blocker" "$category" "see:$evidence_path" "Breaks integrity" \
        "Fix $name (exit $ec)" "URGENT: Investigate $name" "Failure after ${dur}ms"
      rm -f "$tmp"; return 1
    else
      add_result "warning" "$category" "see:$evidence_path" "Quality risk" \
        "Review $name (exit $ec)" "TODO: Review $name" "Failure after ${dur}ms"
      rm -f "$tmp"; return 0
    fi
  fi
}

# Constitution/governance checks should be deterministic, not substring greps
check_constitution() {
  local rules="${REPO_ROOT}/.blackboxrules"
  if [ ! -f "$rules" ]; then
    add_result "blocker" "governance" "missing:.blackboxrules" "No constitutional safeguards" \
      "Add .blackboxrules with neutrality/anti-manipulation clauses" \
      "Create rules file" "Constitution absent"
    return
  fi
  # Require both neutrality & anti-manipulation keywords (case-insensitive)
  if grep -Eiq '(neutralit(y|ies))' "$rules" && grep -Eiq 'anti[- ]?manipulation|manipulation\s*prohibit' "$rules"; then
    add_result "info" "governance" "$rules" "Safeguards declared" "None" "" "Ensure CI enforces"
  else
    add_result "blocker" "governance" "$rules" "Safeguards incomplete" \
      "Add explicit neutrality + anti-manipulation sections" \
      "Extend rules per template" "Tighten constitutional coverage"
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

# Prove "demonstrably used by Copilot/Blackbox" (your requirement)
check_ai_asset_use() {
  local manifest="${REPO_ROOT}/ai-assets.json"
  if [ -f "$manifest" ]; then
    # Check if assets are referenced in code or docs
    if grep -r "ai-assets.json" docs/ apps/ libs/ scripts/ >/dev/null 2>&1; then
      add_result "info" "ai-governance" "ai-assets.json referenced in codebase" "Demonstrates AI integration" "None" "" "Verify asset usage in production"
    else
      add_result "warning" "ai-governance" "ai-assets.json not referenced" "Potential unused AI assets" "Integrate assets into workflows" "Review AI asset usage" "Ensure active AI tooling"
    fi
  else
    add_result "warning" "ai-governance" "Missing ai-assets.json" "No AI asset manifest" "Create ai-assets.json with used assets" "Document AI assets" "Establish AI asset tracking"
  fi
}

# Use MODE to choose package scripts; detect npm/pnpm and skip unavailable tasks
has_script() { jq -r --arg k "$1" '.scripts[$k] // empty' package.json 2>/dev/null | grep -q .; }
run_pkg()   { $PKG run "$1"; }

# Main audit function
run_full_audit() {
    echo "Starting full universal audit..."

    # Code Quality
    has_script lint && run_check "ESLint" "$PKG run lint" "code-quality" true \
      || add_result "warning" "code-quality" "package.json:scripts.lint missing" "Lint not configured" \
         "Add eslint + script" "Add lint task" "Enable quality gate"
    has_script typecheck && run_check "TypeScript Typecheck" "$PKG run typecheck" "code-quality" true \
      || add_result "warning" "code-quality" "package.json:scripts.typecheck missing" "Typecheck not configured" \
         "Add typescript + script" "Add typecheck task" "Enable type safety"
  run_check "Import Boundaries" "node scripts/ci/check-import-boundaries.mjs" "architecture" true

    # Testing
    has_script test && run_check "Unit Tests" "$PKG run test" "testing" true \
      || add_result "warning" "testing" "package.json:scripts.test missing" "Tests not configured" \
         "Add test framework + script" "Add test task" "Enable test coverage"
    has_script "test:a11y" && run_check "Accessibility Tests" "$PKG run test:a11y" "accessibility" true \
      || add_result "warning" "accessibility" "package.json:scripts.test:a11y missing" "A11y tests not configured" \
         "Add playwright-accessibility + script" "Add a11y test task" "Enable accessibility gate"

    # Security
  run_check "Secret Scanning" "bash scripts/security/gitleaks-scan.sh" "security" true
  run_check "Novelty Guard" "node scripts/novelty-guard.js --min-novelty 0.2" "ai-governance" false

    # Documentation
  has_script "docs:lint" && run_check "Documentation Lint" "$PKG run docs:lint" "documentation" false \
      || add_result "info" "documentation" "package.json:scripts.docs:lint missing" "Docs lint not configured" \
         "Add markdownlint + script" "Add docs lint task" "Enable docs quality gate"

    # Environment Validation
  run_check "Environment Validation" "node scripts/validate-env.js" "configuration" true

    # Controls
  # Use package script to ensure TS is executed via tsx
  if has_script "controls:run"; then
    run_check "Controls Runner" "$PKG run controls:run" "compliance" true
  else
    run_check "Controls Runner" "node scripts/controls-runner.ts" "compliance" true
  fi

    # Constitutional Compliance
    check_constitution

    # AI Governance
    check_ai_governance
    check_ai_asset_use

    # Infrastructure (if offline mode, skip network checks)
    if [ "$NETWORK" = "online" ]; then
        run_check "Dependency Audit" "$PKG audit" "dependencies" false
    else
        echo "Skipping dependency audit (offline mode)"
    fi

    # Observability
    if [ -d "${REPO_ROOT}/monitoring" ]; then
        add_result "info" "observability" "Monitoring stack configured" "Enables system observability" "No action needed" "" "Verify monitoring effectiveness"
    else
        add_result "warning" "observability" "Missing monitoring configuration" "Limited system visibility" "Implement observability stack" "Set up monitoring infrastructure" "Design comprehensive observability strategy"
    fi

    # Add lightweight perf and scalability probes (no placeholders)
    # Micro perf: build hot package if present
    has_script "build" && run_check "Build" "$PKG run build --filter=apps/*" "performance" true

    # k6 smoke (optional, skip offline)
    [ "$NETWORK" = "online" ] && [ -f "scripts/perf/smoke.js" ] && \
      run_check "k6 smoke" "k6 run --vus 5 --duration 10s scripts/perf/smoke.js" "performance" false

    # Game Simulation Logic Validation
    check_game_simulation_logic

    # Performance Benchmarking & SLO Validation
    check_performance_slos

    # AI Neutrality & Fairness Audit
    check_ai_neutrality_fairness

    # Privacy Impact Assessment
    check_privacy_impact

    # Anti-Manipulation Detection
    check_anti_manipulation

    # Community Safety & Content Moderation
    check_community_safety

    # FOSS Replacement Opportunities
    check_foss_replacements

    # Legacy Debt & Zombie Code Detection
    check_legacy_debt

    # Enhanced Governance Checks
    check_architecture_compliance
    check_security_posture
    check_accessibility_compliance
    check_operational_readiness
    check_compliance_traceability

    # Evidence & Provenance Checks
    check_evidence_integrity
    check_provenance_chain

    # Code Intelligence Checks
    check_code_indexing
    check_semantic_search
    check_context_gateway

    # Static Quality Gates
    check_static_analysis
    check_type_safety
    check_boundary_compliance
    check_duplication_detection
    check_complexity_limits

    # Security & Privacy Gates
    check_secret_scanning
    check_dependency_security
    check_sast_scanning
    check_threat_modeling
    check_dpia_compliance
    check_pii_redaction
    check_crypto_policy
    check_zero_trust

    # Testing Strategy Checks
    check_unit_test_coverage
    check_integration_tests
    check_contract_tests
    check_e2e_tests
    check_property_based_tests
    check_fuzz_testing
    check_accessibility_testing
    check_security_testing

    # Performance & Resilience
    check_performance_budgets
    check_load_testing
    check_database_performance
    check_chaos_engineering

    # Observability Checks
    check_structured_logging
    check_metrics_coverage
    check_tracing_setup
    check_runbook_completeness
    check_sli_definitions

    # Documentation Checks
    check_docs_build
    check_readme_completeness
    check_changelog_maintenance
    check_onboarding_docs

    # AI Governance Checks
    check_meta_rule_parity
    check_novelty_guard
    check_ai_asset_usage
    check_mode_declaration
    check_self_critique

    # Game-Domain Integrity
    check_neutrality_enforcement
    check_manipulation_resistance
    check_fairness_mechanisms
    check_abuse_prevention
    check_content_provenance
    check_appeals_process

    # Compliance & Licensing
    check_licenses_compliance
    check_ropa_maintenance
    check_retention_policies
    check_export_controls

    # Automation & CI/CD
    check_lefthook_configuration
    check_workflow_automation
    check_policy_gates
    check_nightly_audits

    # Reporting & Scoring
    check_unified_schema
    check_scorecard_generation
    check_trend_analysis
    check_routing_automation

    # Refactor & Debt Management
    check_dead_code_detection
    check_diff_splitting
    check_migration_safety
    check_deprecation_warnings

    echo "Full audit completed."
}

run_short_audit() {
    echo "Running short everyday audit..."

    # Essential checks only
    has_script lint && run_check "ESLint" "$PKG run lint" "code-quality" true \
      || add_result "warning" "code-quality" "package.json:scripts.lint missing" "Lint not configured" \
         "Add eslint + script" "Add lint task" "Enable quality gate"
    has_script typecheck && run_check "TypeScript Typecheck" "$PKG run typecheck" "code-quality" true \
      || add_result "warning" "code-quality" "package.json:scripts.typecheck missing" "Typecheck not configured" \
         "Add typescript + script" "Add typecheck task" "Enable type safety"
    has_script test && run_check "Unit Tests" "$PKG run test" "testing" true \
      || add_result "warning" "testing" "package.json:scripts.test missing" "Tests not configured" \
         "Add test framework + script" "Add test task" "Enable test coverage"
  run_check "Secret Scanning" "bash scripts/security/gitleaks-scan.sh" "security" true
  if has_script "controls:run"; then
    run_check "Controls Runner" "$PKG run controls:run" "compliance" true
  else
    run_check "Controls Runner" "node scripts/controls-runner.ts" "compliance" true
  fi

    check_constitution
    check_ai_governance
    check_ai_asset_use

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
  if has_script "controls:run"; then
    run_check "Controls Runner" "$PKG run controls:run" "compliance" true
  else
    run_check "Controls Runner" "node scripts/controls-runner.ts" "compliance" true
  fi

    check_constitution
    check_ai_governance

    echo "CI-safe audit completed."
}

run_offline_audit() {
    echo "Running offline audit..."

    # No network-dependent checks
    has_script lint && run_check "ESLint" "$PKG run lint" "code-quality" true \
      || add_result "warning" "code-quality" "package.json:scripts.lint missing" "Lint not configured" \
         "Add eslint + script" "Add lint task" "Enable quality gate"
    has_script typecheck && run_check "TypeScript Typecheck" "$PKG run typecheck" "code-quality" true \
      || add_result "warning" "code-quality" "package.json:scripts.typecheck missing" "Typecheck not configured" \
         "Add typescript + script" "Add typecheck task" "Enable type safety"
    has_script test && run_check "Unit Tests" "$PKG run test" "testing" true \
      || add_result "warning" "testing" "package.json:scripts.test missing" "Tests not configured" \
         "Add test framework + script" "Add test task" "Enable test coverage"
  run_check "Secret Scanning" "bash scripts/security/gitleaks-scan.sh" "security" true
  run_check "Import Boundaries" "node scripts/ci/check-import-boundaries.mjs" "architecture" true
  if has_script "controls:run"; then
    run_check "Controls Runner" "$PKG run controls:run" "compliance" true
  else
    run_check "Controls Runner" "node scripts/controls-runner.ts" "compliance" true
  fi

    check_constitution
    check_ai_governance
    check_ai_asset_use

    echo "Offline audit completed."
}

run_agent_loop_safe_audit() {
    echo "Running agent-loop-safe audit..."

    # Deterministic, no loops, fast checks
    has_script lint && run_check "ESLint" "$PKG run lint" "code-quality" true \
      || add_result "warning" "code-quality" "package.json:scripts.lint missing" "Lint not configured" \
         "Add eslint + script" "Add lint task" "Enable quality gate"
    has_script typecheck && run_check "TypeScript Typecheck" "$PKG run typecheck" "code-quality" true \
      || add_result "warning" "code-quality" "package.json:scripts.typecheck missing" "Typecheck not configured" \
         "Add typescript + script" "Add typecheck task" "Enable type safety"
  run_check "Secret Scanning" "bash scripts/security/gitleaks-scan.sh" "security" true
  if has_script "controls:run"; then
    run_check "Controls Runner" "$PKG run controls:run" "compliance" true
  else
    run_check "Controls Runner" "node scripts/controls-runner.ts" "compliance" true
  fi

    check_constitution
    check_ai_asset_use

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

# At the end:
jq -s --arg mode "$MODE" --arg network "$NETWORK" --arg agent_loop_safe "$AGENT_LOOP_SAFE" \
  '{timestamp: (now | todate), mode:$mode, network:$network, agent_loop_safe:$agent_loop_safe, results:.}' \
  "$AUDIT_NDJSON" > "$OUTPUT_FILE"

# Append to audit ledger for provenance
jq --arg mode "$MODE" --arg network "$NETWORK" --arg agent_loop_safe "$AGENT_LOOP_SAFE" \
  '{timestamp: (now | todate), mode:$mode, network:$network, agent_loop_safe:$agent_loop_safe, results:.}' \
  "$OUTPUT_FILE" >> "$AUDIT_LEDGER"

# Emit SARIF (for PR annotations) alongside JSON
SARIF_FILE="${AUDIT_DIR}/audit-results.sarif"
jq -n --slurpfile r "$OUTPUT_FILE" '
  {
    "$schema":"https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json",
    "version":"2.1.0",
    "runs":[{"tool":{"driver":{"name":"ps-audit"}},"results":($r[0].results | map({
      "level": (if .severity=="blocker" then "error" elif .severity=="warning" then "warning" else "note" end),
      "message": {"text": (.category + ": " + .impact)},
      "properties": .
    }))}]
  }' > "$SARIF_FILE"

echo "Audit results saved to $OUTPUT_FILE and $SARIF_FILE"

# Tighten exit criteria
# Fail if any critical check fails or governance is missing.
BLOCKERS=$(jq '[.results[] | select(.severity == "blocker")] | length' "$OUTPUT_FILE")
WARNINGS=$(jq '[.results[] | select(.severity == "warning")] | length' "$OUTPUT_FILE")
NOTES=$(jq '[.results[] | select(.severity == "info" or .severity == "note")] | length' "$OUTPUT_FILE")

echo "Summary: $BLOCKERS blockers, $WARNINGS warnings, $NOTES notes"

if [ "$BLOCKERS" -gt 0 ]; then
    echo -e "${RED}Audit FAILED: $BLOCKERS blocker(s) found. Review $OUTPUT_FILE${NC}"
    exit 1
else
    echo -e "${GREEN}Audit PASSED: No blockers found.${NC}"
fi

# Guard against set -e + eval edge cases
# You already use set -euo pipefail; good. Wrap risky lines in bash -o pipefail -c (done above).
# Avoid eval unless expanding variables inside; we switched to bash -c.

# Small correctness nits
# Colour codes: fine in TTY; consider if [ -t 1 ] to disable in CI logs. (done)
# MODE/NETWORK/AGENT_LOOP_SAFE: print them at start; right now only used at the end and in one branch. (done)
# npm audit is noisy and network-bound; keep it behind NETWORK=online (you did at the end; extend to all failures). (done)
# Store logs under .audit/ (you did at the end; extend to all failures). (done)
# Consider shellcheck on this script and add a run_check "shellcheck" ... to self-audit.

# Add shellcheck self-audit
command -v shellcheck >/dev/null 2>&1 && run_check "Shellcheck Self-Audit" "shellcheck scripts/universal-audit.sh" "code-quality" false

# Implement missing check functions for comprehensive audit

# Game Simulation Logic Validation
check_game_simulation_logic() {
  echo "Auditing game simulation logic integrity..."
  # Check for political simulation specific logic
  if grep -r "political.*simulation\|election.*logic\|democracy.*mechanics" apps/ libs/ >/dev/null 2>&1; then
    add_result "info" "game-logic" "Political simulation logic detected" "Core game mechanics present" "None" "" "Verify simulation accuracy"
  else
    add_result "warning" "game-logic" "No political simulation logic found" "Missing core game features" "Implement political simulation mechanics" "Add election and democracy logic" "Ensure game logic integrity"
  fi

  # Check for balanced mechanics
  if grep -r "balance.*check\|fairness.*algorithm" apps/ libs/ >/dev/null 2>&1; then
    add_result "info" "game-logic" "Balance and fairness checks present" "Prevents game manipulation" "None" "" "Test balance under load"
  else
    add_result "warning" "game-logic" "Missing balance/fairness checks" "Potential for unfair gameplay" "Add balance validation algorithms" "Implement fairness checks" "Audit game balance"
  fi
}

# Performance Benchmarking & SLO Validation
check_performance_slos() {
  echo "Validating performance SLOs..."
  # Check for SLO definitions
  if [ -f "docs/observability-and-ops/slos.md" ] || grep -r "SLO\|latency.*target\|availability.*target" docs/ >/dev/null 2>&1; then
    add_result "info" "performance" "SLOs defined" "Performance targets established" "None" "" "Monitor SLO compliance"
  else
    add_result "warning" "performance" "No SLO definitions found" "Undefined performance targets" "Define SLOs for latency/availability" "Document performance targets" "Establish SLO monitoring"
  fi

  # Check for performance benchmarks
  if [ -f "scripts/perf/benchmarks.js" ] || grep -r "benchmark\|performance.*test" scripts/ >/dev/null 2>&1; then
    add_result "info" "performance" "Performance benchmarks present" "Measurable performance standards" "None" "" "Run regular benchmarks"
  else
    add_result "warning" "performance" "Missing performance benchmarks" "No performance validation" "Create performance benchmark suite" "Implement benchmark scripts" "Establish performance baselines"
  fi
}

# AI Neutrality & Fairness Audit
check_ai_neutrality_fairness() {
  echo "Auditing AI neutrality and fairness..."
  # Check for bias detection
  if grep -r "bias.*detection\|fairness.*check\|neutrality.*audit" apps/ libs/ ai/ >/dev/null 2>&1; then
    add_result "info" "ai-fairness" "Bias detection mechanisms present" "AI fairness safeguards active" "None" "" "Regular bias audits"
  else
    add_result "blocker" "ai-fairness" "No bias detection found" "AI may exhibit unfair behavior" "Implement bias detection algorithms" "Add fairness validation" "Conduct AI fairness audit"
  fi

  # Check for political neutrality
  if grep -r "political.*neutral\|non-partisan\|impartial" .blackboxrules ai-controls.json >/dev/null 2>&1; then
    add_result "info" "ai-fairness" "Political neutrality enforced" "Prevents political bias" "None" "" "Monitor neutrality compliance"
  else
    add_result "blocker" "ai-fairness" "Political neutrality not enforced" "Risk of political manipulation" "Add neutrality constraints" "Implement political bias checks" "Audit AI for political neutrality"
  fi
}

# Privacy Impact Assessment
check_privacy_impact() {
  echo "Conducting privacy impact assessment..."
  # Check for PII handling
  if grep -r "GDPR\|CCPA\|personal.*data\|PII" docs/ apps/ >/dev/null 2>&1; then
    add_result "info" "privacy" "Privacy compliance documented" "Data protection measures in place" "None" "" "Review privacy controls"
  else
    add_result "blocker" "privacy" "No privacy compliance found" "Potential data privacy violations" "Conduct privacy impact assessment" "Implement GDPR/CCPA compliance" "Document data handling practices"
  fi

  # Check for data minimization
  if grep -r "data.*minimization\|least.*data\|minimal.*collection" apps/ docs/ >/dev/null 2>&1; then
    add_result "info" "privacy" "Data minimization practiced" "Reduces privacy risks" "None" "" "Audit data collection"
  else
    add_result "warning" "privacy" "Data minimization not evident" "Potential over-collection of data" "Implement data minimization" "Review data collection policies" "Minimize personal data usage"
  fi
}

# Anti-Manipulation Detection
check_anti_manipulation() {
  echo "Auditing anti-manipulation safeguards..."
  # Check for manipulation detection
  if grep -r "manipulation.*detection\|tamper.*check\|integrity.*verification" apps/ libs/ >/dev/null 2>&1; then
    add_result "info" "anti-manipulation" "Manipulation detection active" "Prevents system tampering" "None" "" "Test manipulation scenarios"
  else
    add_result "blocker" "anti-manipulation" "No manipulation detection" "Vulnerable to tampering" "Implement manipulation detection" "Add integrity checks" "Conduct security audit for manipulation"
  fi

  # Check for coordinated attack prevention
  if grep -r "coordinated.*attack\|sybil.*detection\|bot.*prevention" apps/ libs/ >/dev/null 2>&1; then
    add_result "info" "anti-manipulation" "Coordinated attack prevention" "Resists large-scale manipulation" "None" "" "Monitor for attack patterns"
  else
    add_result "warning" "anti-manipulation" "No coordinated attack prevention" "Vulnerable to organized manipulation" "Implement sybil detection" "Add bot prevention measures" "Enhance manipulation resistance"
  fi
}

# Community Safety & Content Moderation
check_community_safety() {
  echo "Auditing community safety measures..."
  # Check for content moderation
  if grep -r "content.*moderation\|toxic.*detection\|hate.*speech" apps/ libs/ >/dev/null 2>&1; then
    add_result "info" "community-safety" "Content moderation present" "Protects community health" "None" "" "Review moderation effectiveness"
  else
    add_result "blocker" "community-safety" "No content moderation" "Community exposed to harmful content" "Implement content moderation" "Add toxicity detection" "Establish community safety protocols"
  fi

  # Check for user safety features
  if grep -r "user.*safety\|harassment.*prevention\|abuse.*detection" apps/ docs/ >/dev/null 2>&1; then
    add_result "info" "community-safety" "User safety features active" "Prevents user harm" "None" "" "Monitor safety metrics"
  else
    add_result "warning" "community-safety" "Limited user safety features" "Users may face harassment" "Add harassment prevention" "Implement abuse detection" "Enhance user protection measures"
  fi
}

# FOSS Replacement Opportunities
check_foss_replacements() {
  echo "Analyzing FOSS replacement opportunities..."
  # Check for proprietary dependencies
  if grep -r "proprietary\|commercial.*license\|paid.*service" package.json apps/ >/dev/null 2>&1; then
    add_result "warning" "foss-compliance" "Proprietary dependencies detected" "May limit FOSS compliance" "Identify FOSS alternatives" "Replace proprietary components" "Maximize open source usage"
  else
    add_result "info" "foss-compliance" "No proprietary dependencies found" "Fully FOSS compliant" "None" "" "Maintain FOSS commitment"
  fi

  # Check for vendor lock-in
  if grep -r "vendor.*lock.*in\|single.*vendor\|monopoly.*service" docs/ apps/ >/dev/null 2>&1; then
    add_result "warning" "foss-compliance" "Potential vendor lock-in" "Reduces flexibility" "Diversify service providers" "Implement multi-vendor strategy" "Avoid single points of failure"
  else
    add_result "info" "foss-compliance" "No vendor lock-in detected" "Maintains independence" "None" "" "Monitor for lock-in risks"
  fi
}

# Legacy Debt & Zombie Code Detection
check_legacy_debt() {
  echo "Detecting legacy debt and zombie code..."
  # Check for deprecated code
  if grep -r "TODO.*remove\|FIXME.*legacy\|deprecated" apps/ libs/ >/dev/null 2>&1; then
    add_result "warning" "legacy-debt" "Deprecated code markers found" "Accumulating technical debt" "Address deprecated code" "Remove legacy components" "Refactor technical debt"
  else
    add_result "info" "legacy-debt" "No deprecated code markers" "Clean codebase maintained" "None" "" "Regular debt assessment"
  fi

  # Check for unused code
  if [ -f "scripts/find-unused.sh" ]; then
    run_check "Unused Code Detection" "bash scripts/find-unused.sh" "legacy-debt" false
  else
    add_result "info" "legacy-debt" "No unused code detection script" "Cannot verify code cleanliness" "Create unused code detector" "Implement dead code removal" "Establish code maintenance practices"
  fi
}

# Enhanced Governance Checks

# Architecture Compliance
check_architecture_compliance() {
  echo "Checking architecture compliance..."
  # Check for bounded contexts
  if grep -r "bounded.*context\|domain.*boundary" docs/ apps/ >/dev/null 2>&1; then
    add_result "info" "architecture" "Bounded contexts defined" "Maintains architectural integrity" "None" "" "Verify context boundaries"
  else
    add_result "warning" "architecture" "No bounded contexts" "Risk of architectural drift" "Define domain boundaries" "Implement bounded contexts" "Establish architectural governance"
  fi

  # Check for Nx workspace compliance
  if [ -f "nx.json" ] && grep -r "nx.*workspace\|project.*configuration" nx.json >/dev/null 2>&1; then
    add_result "info" "architecture" "Nx workspace configured" "Enforces architectural rules" "None" "" "Review Nx configuration"
  else
    add_result "warning" "architecture" "Nx workspace not optimized" "Weak architectural enforcement" "Configure Nx properly" "Add project boundaries" "Strengthen architectural controls"
  fi
}

# Security Posture
check_security_posture() {
  echo "Assessing security posture..."
  # Check for security headers
  if grep -r "helmet\|security.*headers\|CSP\|HSTS" apps/ libs/ >/dev/null 2>&1; then
    add_result "info" "security" "Security headers configured" "Basic web security in place" "None" "" "Audit security headers"
  else
    add_result "warning" "security" "Missing security headers" "Vulnerable to common attacks" "Implement security headers" "Add CSP and HSTS" "Enhance web security"
  fi

  # Check for rate limiting
  if grep -r "rate.*limit\|throttle\|DDoS.*protection" apps/ libs/ >/dev/null 2>&1; then
    add_result "info" "security" "Rate limiting implemented" "Prevents abuse and DoS" "None" "" "Test rate limiting"
  else
    add_result "warning" "security" "No rate limiting" "Susceptible to abuse" "Implement rate limiting" "Add DDoS protection" "Protect against abuse"
  fi
}

# Accessibility Compliance
check_accessibility_compliance() {
  echo "Verifying accessibility compliance..."
  # Check for WCAG compliance
  if grep -r "WCAG\|accessibility\|a11y\|ARIA" apps/ docs/ >/dev/null 2>&1; then
    add_result "info" "accessibility" "Accessibility considerations present" "Inclusive design practices" "None" "" "Conduct accessibility audit"
  else
    add_result "blocker" "accessibility" "No accessibility measures" "Excludes users with disabilities" "Implement WCAG 2.2 AA+" "Add accessibility testing" "Ensure inclusive design"
  fi

  # Check for screen reader support
  if grep -r "screen.*reader\|NVDA\|JAWS\|VoiceOver" apps/ tests/ >/dev/null 2>&1; then
    add_result "info" "accessibility" "Screen reader support verified" "Accessible to assistive tech" "None" "" "Test with screen readers"
  else
    add_result "warning" "accessibility" "Screen reader support unverified" "May not work with assistive tech" "Test screen reader compatibility" "Add accessibility tests" "Verify assistive technology support"
  fi
}

# Operational Readiness
check_operational_readiness() {
  echo "Checking operational readiness..."
  # Check for monitoring
  if [ -d "monitoring/" ] && grep -r "prometheus\|grafana\|otel" monitoring/ >/dev/null 2>&1; then
    add_result "info" "operations" "Monitoring stack deployed" "Operational visibility enabled" "None" "" "Verify monitoring coverage"
  else
    add_result "warning" "operations" "Limited monitoring" "Poor operational visibility" "Implement monitoring stack" "Add observability tools" "Establish operational dashboards"
  fi

  # Check for incident response
  if [ -f "docs/incident-response-plan.md" ] || grep -r "incident.*response\|runbook" docs/ >/dev/null 2>&1; then
    add_result "info" "operations" "Incident response planned" "Prepared for incidents" "None" "" "Test incident procedures"
  else
    add_result "warning" "operations" "No incident response plan" "Unprepared for incidents" "Create incident response plan" "Develop runbooks" "Establish incident management"
  fi
}

# Compliance Traceability
check_compliance_traceability() {
  echo "Auditing compliance traceability..."
  # Check for audit trails
  if grep -r "audit.*trail\|traceability\|compliance.*log" apps/ libs/ >/dev/null 2>&1; then
    add_result "info" "compliance" "Audit trails implemented" "Actions are traceable" "None" "" "Review audit logs"
  else
    add_result "warning" "compliance" "No audit trails" "Cannot verify compliance" "Implement audit logging" "Add traceability features" "Establish compliance monitoring"
  fi
