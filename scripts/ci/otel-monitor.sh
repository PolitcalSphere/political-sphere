#!/usr/bin/env bash
# Enhanced CI/CD Pipeline Monitoring
# Integrates OpenTelemetry for traces, metrics, and logs

set -euo pipefail

# Configuration
OTEL_COLLECTOR_ENDPOINT="${OTEL_COLLECTOR_ENDPOINT:-http://localhost:4318}"
SERVICE_NAME="github-actions-pipeline"
ENVIRONMENT="${GITHUB_ENV:-development}"
PIPELINE_RUN_ID="${GITHUB_RUN_ID:-unknown}"
PIPELINE_RUN_NUMBER="${GITHUB_RUN_NUMBER:-0}"
WORKFLOW_NAME="${GITHUB_WORKFLOW:-unknown}"
REPOSITORY="${GITHUB_REPOSITORY:-unknown}"
COMMIT_SHA="${GITHUB_SHA:-unknown}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Generate trace ID (128-bit hex)
generate_trace_id() {
    echo "$(openssl rand -hex 16)"
}

# Generate span ID (64-bit hex)
generate_span_id() {
    echo "$(openssl rand -hex 8)"
}

# Get current timestamp in nanoseconds
get_timestamp_ns() {
    echo "$(date +%s%N)"
}

# Send trace span to OpenTelemetry collector
send_trace_span() {
    local trace_id="$1"
    local span_id="$2"
    local parent_span_id="$3"
    local span_name="$4"
    local start_time="$5"
    local end_time="$6"
    local status_code="${7:-0}"  # 0=OK, 1=ERROR
    local attributes="${8:-{}}"
    
    local payload
    payload=$(cat <<EOF
{
  "resourceSpans": [{
    "resource": {
      "attributes": [
        {"key": "service.name", "value": {"stringValue": "${SERVICE_NAME}"}},
        {"key": "deployment.environment", "value": {"stringValue": "${ENVIRONMENT}"}},
        {"key": "ci.pipeline.id", "value": {"stringValue": "${PIPELINE_RUN_ID}"}},
        {"key": "ci.pipeline.number", "value": {"intValue": ${PIPELINE_RUN_NUMBER}}},
        {"key": "ci.workflow.name", "value": {"stringValue": "${WORKFLOW_NAME}"}},
        {"key": "vcs.repository", "value": {"stringValue": "${REPOSITORY}"}},
        {"key": "vcs.commit.sha", "value": {"stringValue": "${COMMIT_SHA}"}}
      ]
    },
    "scopeSpans": [{
      "scope": {"name": "ci-pipeline"},
      "spans": [{
        "traceId": "${trace_id}",
        "spanId": "${span_id}",
        "parentSpanId": "${parent_span_id}",
        "name": "${span_name}",
        "kind": 1,
        "startTimeUnixNano": "${start_time}",
        "endTimeUnixNano": "${end_time}",
        "status": {"code": ${status_code}},
        "attributes": ${attributes}
      }]
    }]
  }]
}
EOF
)
    
    curl -s -X POST "${OTEL_COLLECTOR_ENDPOINT}/v1/traces" \
        -H "Content-Type: application/json" \
        -d "${payload}" || log_warn "Failed to send trace span"
}

# Send metric to OpenTelemetry collector
send_metric() {
    local metric_name="$1"
    local metric_value="$2"
    local metric_type="${3:-gauge}"  # gauge, counter, histogram
    local attributes="${4:-{}}"
    
    local timestamp
    timestamp=$(get_timestamp_ns)
    
    local payload
    payload=$(cat <<EOF
{
  "resourceMetrics": [{
    "resource": {
      "attributes": [
        {"key": "service.name", "value": {"stringValue": "${SERVICE_NAME}"}},
        {"key": "deployment.environment", "value": {"stringValue": "${ENVIRONMENT}"}},
        {"key": "ci.pipeline.id", "value": {"stringValue": "${PIPELINE_RUN_ID}"}}
      ]
    },
    "scopeMetrics": [{
      "scope": {"name": "ci-pipeline"},
      "metrics": [{
        "name": "${metric_name}",
        "${metric_type}": {
          "dataPoints": [{
            "timeUnixNano": "${timestamp}",
            "asDouble": ${metric_value},
            "attributes": ${attributes}
          }]
        }
      }]
    }]
  }]
}
EOF
)
    
    curl -s -X POST "${OTEL_COLLECTOR_ENDPOINT}/v1/metrics" \
        -H "Content-Type: application/json" \
        -d "${payload}" || log_warn "Failed to send metric"
}

# Send structured log
send_log() {
    local severity="$1"  # INFO, WARN, ERROR
    local message="$2"
    local attributes="${3:-{}}"
    
    local timestamp
    timestamp=$(get_timestamp_ns)
    
    local severity_number
    case "$severity" in
        INFO) severity_number=9 ;;
        WARN) severity_number=13 ;;
        ERROR) severity_number=17 ;;
        *) severity_number=9 ;;
    esac
    
    local payload
    payload=$(cat <<EOF
{
  "resourceLogs": [{
    "resource": {
      "attributes": [
        {"key": "service.name", "value": {"stringValue": "${SERVICE_NAME}"}},
        {"key": "deployment.environment", "value": {"stringValue": "${ENVIRONMENT}"}},
        {"key": "ci.pipeline.id", "value": {"stringValue": "${PIPELINE_RUN_ID}"}}
      ]
    },
    "scopeLogs": [{
      "scope": {"name": "ci-pipeline"},
      "logRecords": [{
        "timeUnixNano": "${timestamp}",
        "severityNumber": ${severity_number},
        "severityText": "${severity}",
        "body": {"stringValue": "${message}"},
        "attributes": ${attributes}
      }]
    }]
  }]
}
EOF
)
    
    curl -s -X POST "${OTEL_COLLECTOR_ENDPOINT}/v1/logs" \
        -H "Content-Type: application/json" \
        -d "${payload}" || log_warn "Failed to send log"
}

# Track deployment event
track_deployment() {
    local deployment_id="$1"
    local environment="$2"
    local status="$3"  # started, completed, failed, rolled_back
    local duration_ms="${4:-0}"
    
    log_info "Tracking deployment: ${deployment_id} (${status})"
    
    # Send deployment metric
    send_metric "ci.deployment.count" 1 "counter" \
        "[{\"key\":\"deployment.id\",\"value\":{\"stringValue\":\"${deployment_id}\"}},{\"key\":\"environment\",\"value\":{\"stringValue\":\"${environment}\"}},{\"key\":\"status\",\"value\":{\"stringValue\":\"${status}\"}}]"
    
    # Send deployment duration (if completed/failed)
    if [[ "$status" == "completed" || "$status" == "failed" ]]; then
        send_metric "ci.deployment.duration_ms" "${duration_ms}" "histogram" \
            "[{\"key\":\"deployment.id\",\"value\":{\"stringValue\":\"${deployment_id}\"}},{\"key\":\"environment\",\"value\":{\"stringValue\":\"${environment}\"}},{\"key\":\"status\",\"value\":{\"stringValue\":\"${status}\"}}]"
    fi
    
    # Send deployment log
    send_log "INFO" "Deployment ${status}: ${deployment_id}" \
        "[{\"key\":\"deployment.id\",\"value\":{\"stringValue\":\"${deployment_id}\"}},{\"key\":\"environment\",\"value\":{\"stringValue\":\"${environment}\"}},{\"key\":\"status\",\"value\":{\"stringValue\":\"${status}\"}}]"
}

# Track pipeline stage
track_pipeline_stage() {
    local stage_name="$1"
    local status="$2"  # started, completed, failed
    local duration_ms="${3:-0}"
    
    log_info "Tracking pipeline stage: ${stage_name} (${status})"
    
    # Send stage metric
    send_metric "ci.pipeline.stage.count" 1 "counter" \
        "[{\"key\":\"stage\",\"value\":{\"stringValue\":\"${stage_name}\"}},{\"key\":\"status\",\"value\":{\"stringValue\":\"${status}\"}}]"
    
    # Send stage duration
    if [[ "$status" == "completed" || "$status" == "failed" ]]; then
        send_metric "ci.pipeline.stage.duration_ms" "${duration_ms}" "histogram" \
            "[{\"key\":\"stage\",\"value\":{\"stringValue\":\"${stage_name}\"}},{\"key\":\"status\",\"value\":{\"stringValue\":\"${status}\"}}]"
    fi
}

# Track test results
track_test_results() {
    local test_type="$1"  # unit, integration, e2e, accessibility
    local total_tests="$2"
    local passed_tests="$3"
    local failed_tests="$4"
    local skipped_tests="${5:-0}"
    local duration_ms="${6:-0}"
    
    log_info "Tracking test results: ${test_type} (${passed_tests}/${total_tests} passed)"
    
    # Send test count metrics
    send_metric "ci.tests.total" "${total_tests}" "gauge" \
        "[{\"key\":\"test.type\",\"value\":{\"stringValue\":\"${test_type}\"}}]"
    
    send_metric "ci.tests.passed" "${passed_tests}" "gauge" \
        "[{\"key\":\"test.type\",\"value\":{\"stringValue\":\"${test_type}\"}}]"
    
    send_metric "ci.tests.failed" "${failed_tests}" "gauge" \
        "[{\"key\":\"test.type\",\"value\":{\"stringValue\":\"${test_type}\"}}]"
    
    send_metric "ci.tests.skipped" "${skipped_tests}" "gauge" \
        "[{\"key\":\"test.type\",\"value\":{\"stringValue\":\"${test_type}\"}}]"
    
    # Send test duration
    send_metric "ci.tests.duration_ms" "${duration_ms}" "histogram" \
        "[{\"key\":\"test.type\",\"value\":{\"stringValue\":\"${test_type}\"}}]"
    
    # Calculate success rate
    if [[ $total_tests -gt 0 ]]; then
        local success_rate
        success_rate=$(awk "BEGIN {printf \"%.2f\", (${passed_tests}/${total_tests})*100}")
        send_metric "ci.tests.success_rate" "${success_rate}" "gauge" \
            "[{\"key\":\"test.type\",\"value\":{\"stringValue\":\"${test_type}\"}}]"
    fi
}

# Track security scan results
track_security_scan() {
    local scan_type="$1"  # secrets, vulnerabilities, sast, container
    local critical_count="$2"
    local high_count="$3"
    local medium_count="$4"
    local low_count="$5"
    
    log_info "Tracking security scan: ${scan_type} (Critical: ${critical_count}, High: ${high_count})"
    
    # Send vulnerability counts
    send_metric "ci.security.vulnerabilities" "${critical_count}" "gauge" \
        "[{\"key\":\"scan.type\",\"value\":{\"stringValue\":\"${scan_type}\"}},{\"key\":\"severity\",\"value\":{\"stringValue\":\"critical\"}}]"
    
    send_metric "ci.security.vulnerabilities" "${high_count}" "gauge" \
        "[{\"key\":\"scan.type\",\"value\":{\"stringValue\":\"${scan_type}\"}},{\"key\":\"severity\",\"value\":{\"stringValue\":\"high\"}}]"
    
    send_metric "ci.security.vulnerabilities" "${medium_count}" "gauge" \
        "[{\"key\":\"scan.type\",\"value\":{\"stringValue\":\"${scan_type}\"}},{\"key\":\"severity\",\"value\":{\"stringValue\":\"medium\"}}]"
    
    send_metric "ci.security.vulnerabilities" "${low_count}" "gauge" \
        "[{\"key\":\"scan.type\",\"value\":{\"stringValue\":\"${scan_type}\"}},{\"key\":\"severity\",\"value\":{\"stringValue\":\"low\"}}]"
    
    # Send alert if critical or high vulnerabilities found
    if [[ $critical_count -gt 0 || $high_count -gt 0 ]]; then
        send_log "ERROR" "Security scan found ${critical_count} critical and ${high_count} high severity vulnerabilities" \
            "[{\"key\":\"scan.type\",\"value\":{\"stringValue\":\"${scan_type}\"}},{\"key\":\"critical\",\"value\":{\"intValue\":${critical_count}}},{\"key\":\"high\",\"value\":{\"intValue\":${high_count}}}]"
    fi
}

# Track build metrics
track_build() {
    local status="$1"  # success, failure
    local duration_ms="$2"
    local artifact_size_bytes="${3:-0}"
    
    log_info "Tracking build: ${status} (duration: ${duration_ms}ms)"
    
    # Send build count
    send_metric "ci.build.count" 1 "counter" \
        "[{\"key\":\"status\",\"value\":{\"stringValue\":\"${status}\"}}]"
    
    # Send build duration
    send_metric "ci.build.duration_ms" "${duration_ms}" "histogram" \
        "[{\"key\":\"status\",\"value\":{\"stringValue\":\"${status}\"}}]"
    
    # Send artifact size
    if [[ $artifact_size_bytes -gt 0 ]]; then
        send_metric "ci.build.artifact_size_bytes" "${artifact_size_bytes}" "gauge" \
            "[{\"key\":\"status\",\"value\":{\"stringValue\":\"${status}\"}}]"
    fi
}

# Main execution
main() {
    local command="${1:-help}"
    
    case "$command" in
        deployment)
            track_deployment "${@:2}"
            ;;
        stage)
            track_pipeline_stage "${@:2}"
            ;;
        tests)
            track_test_results "${@:2}"
            ;;
        security)
            track_security_scan "${@:2}"
            ;;
        build)
            track_build "${@:2}"
            ;;
        help|*)
            cat <<EOF
Usage: $0 <command> [args...]

Commands:
  deployment <id> <env> <status> [duration_ms]
  stage <name> <status> [duration_ms]
  tests <type> <total> <passed> <failed> [skipped] [duration_ms]
  security <scan_type> <critical> <high> <medium> <low>
  build <status> <duration_ms> [artifact_size_bytes]
  help - Show this help message

Examples:
  $0 deployment deploy-abc123 production started
  $0 stage "Build & Test" completed 12000
  $0 tests unit 150 148 2 0 5000
  $0 security vulnerabilities 0 2 5 10
  $0 build success 8000 102400000

Environment Variables:
  OTEL_COLLECTOR_ENDPOINT - OpenTelemetry collector endpoint (default: http://localhost:4318)
  GITHUB_RUN_ID - GitHub Actions run ID
  GITHUB_RUN_NUMBER - GitHub Actions run number
  GITHUB_WORKFLOW - GitHub Actions workflow name
  GITHUB_REPOSITORY - GitHub repository
  GITHUB_SHA - Git commit SHA
EOF
            ;;
    esac
}

main "$@"
