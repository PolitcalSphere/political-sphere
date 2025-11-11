#!/usr/bin/env bash
# Worker App Audit - Background job processing checks
set -euo pipefail

export APP_NAME="worker"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
APP_DIR="${PROJECT_ROOT}/apps/${APP_NAME}"
AUDIT_DIR="${PROJECT_ROOT}/app-audit/${APP_NAME}"

source "${SCRIPT_DIR}/app-audit-base.sh"

phase7_worker_specific() {
    log_section "Phase 7: Worker-Specific Checks"
    
    # 7.1 Queue/Job Libraries
    grep -rq "bull\|bee-queue\|agenda\|rabbitmq" "${APP_DIR}" 2>/dev/null && log_pass "Job queue library" || log_high "No job queue"
    
    # 7.2 Error Handling & Retry
    grep -rq "retry\|maxAttempts" "${APP_DIR}/src" 2>/dev/null && log_pass "Retry logic found" || log_medium "No retry logic"
    
    # 7.3 Graceful Shutdown
    grep -rq "SIGTERM\|SIGINT\|graceful" "${APP_DIR}/src" 2>/dev/null && log_pass "Graceful shutdown" || log_medium "No graceful shutdown"
    
    # 7.4 Job Monitoring
    grep -rq "metrics\|prometheus\|statsd" "${APP_DIR}/src" 2>/dev/null && log_pass "Metrics collection" || log_low "No metrics"
}

main_worker() {
    print_header
    phase1_app_structure || true
    phase2_code_quality || true
    phase3_security || true
    phase4_testing || true
    phase5_dependencies || true
    phase6_configuration || true
    phase7_worker_specific || true
    generate_report
}

main_worker
