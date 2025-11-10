#!/usr/bin/env bash
# Game Server Audit - Real-time game logic checks
set -euo pipefail

export APP_NAME="game-server"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
APP_DIR="${PROJECT_ROOT}/apps/${APP_NAME}"
AUDIT_DIR="${PROJECT_ROOT}/reports/app-audit/${APP_NAME}"

source "${SCRIPT_DIR}/app-audit-base.sh"

phase7_game_server_specific() {
    log_section "Phase 7: Game Server-Specific Checks"
    
    # 7.1 WebSocket/Real-time
    grep -rq "ws\|socket\.io\|websocket" "${APP_DIR}" 2>/dev/null && log_pass "WebSocket library" || log_high "No WebSocket support"
    
    # 7.2 Game State Management
    grep -rq "state\|redux\|zustand" "${APP_DIR}/src" 2>/dev/null && log_pass "State management" || log_medium "No state management"
    
    # 7.3 Validation & Anti-cheat
    grep -rq "validate\|sanitize\|verify" "${APP_DIR}/src" 2>/dev/null && log_pass "Validation found" || log_high "No validation (cheat risk)"
    
    # 7.4 Rate Limiting (critical for game servers)
    grep -rq "ratelimit\|throttle" "${APP_DIR}/src" 2>/dev/null && log_pass "Rate limiting" || log_critical "No rate limiting (DoS risk)"
    
    # 7.5 Session Management
    grep -rq "session\|connection" "${APP_DIR}/src" 2>/dev/null && log_pass "Session handling" || log_medium "No session management"
}

main_game_server() {
    print_header
    phase1_app_structure || true
    phase2_code_quality || true
    phase3_security || true
    phase4_testing || true
    phase5_dependencies || true
    phase6_configuration || true
    phase7_game_server_specific || true
    generate_report
}

main_game_server
