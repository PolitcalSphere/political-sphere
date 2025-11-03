#!/usr/bin/env bash
# test-functions.sh - Unit tests for DevContainer script functions

set -euo pipefail

# Source the common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Test logging functions
test_logging() {
    echo "Testing logging functions..."

    # Capture output to verify logging works
    local output
    output=$(log_info "Test info message" 2>&1)
    if echo "$output" | grep -q "ℹ️  Test info message"; then
        echo "✅ log_info works"
    else
        echo "❌ log_info failed"
        return 1
    fi

    output=$(log_success "Test success message" 2>&1)
    if echo "$output" | grep -q "✅ Test success message"; then
        echo "✅ log_success works"
    else
        echo "❌ log_success failed"
        return 1
    fi

    output=$(log_warning "Test warning message" 2>&1)
    if echo "$output" | grep -q "⚠️  Test warning message"; then
        echo "✅ log_warning works"
    else
        echo "❌ log_warning failed"
        return 1
    fi

    output=$(log_error "Test error message" 2>&1)
    if echo "$output" | grep -q "❌ Test error message"; then
        echo "✅ log_error works"
    else
        echo "❌ log_error failed"
        return 1
    fi
}

# Test command requirement checking
test_require_command() {
    echo "Testing require_command function..."

    # Test with existing command
    if require_command "bash" 2>/dev/null; then
        echo "✅ require_command works for existing command"
    else
        echo "❌ require_command failed for existing command"
        return 1
    fi

    # Test with non-existing command (should fail)
    if require_command "nonexistent_command_12345" 2>/dev/null; then
        echo "❌ require_command should have failed for non-existing command"
        return 1
    else
        echo "✅ require_command correctly failed for non-existing command"
    fi
}

# Test environment variable requirement
test_require_env() {
    echo "Testing require_env function..."

    # Set a test environment variable
    export TEST_VAR="test_value"

    if require_env "TEST_VAR" 2>/dev/null; then
        echo "✅ require_env works for set variable"
    else
        echo "❌ require_env failed for set variable"
        return 1
    fi

    # Test with unset variable (should fail)
    unset TEST_VAR
    if require_env "TEST_VAR" 2>/dev/null; then
        echo "❌ require_env should have failed for unset variable"
        return 1
    else
        echo "✅ require_env correctly failed for unset variable"
    fi
}

# Test safe_mkdir function
test_safe_mkdir() {
    echo "Testing safe_mkdir function..."

    local test_dir="/tmp/test_devcontainer_dir_$$"

    # Clean up any existing test directory
    rm -rf "$test_dir"

    if safe_mkdir "$test_dir" 2>/dev/null && [ -d "$test_dir" ]; then
        echo "✅ safe_mkdir created directory successfully"
        rm -rf "$test_dir"
    else
        echo "❌ safe_mkdir failed to create directory"
        return 1
    fi

    # Test with existing directory (should not fail)
    mkdir -p "$test_dir"
    if safe_mkdir "$test_dir" 2>/dev/null; then
        echo "✅ safe_mkdir works with existing directory"
        rm -rf "$test_dir"
    else
        echo "❌ safe_mkdir failed with existing directory"
        rm -rf "$test_dir"
        return 1
    fi
}

# Test workspace root detection
test_get_workspace_root() {
    echo "Testing get_workspace_root function..."

    local workspace_root
    workspace_root=$(get_workspace_root)

    if [ -n "$workspace_root" ] && [ -d "$workspace_root" ]; then
        echo "✅ get_workspace_root returned valid directory: $workspace_root"
    else
        echo "❌ get_workspace_root failed to return valid directory"
        return 1
    fi
}

# Run all tests
echo "🧪 Running DevContainer Function Tests"
echo "======================================"

failed_tests=0

test_logging || ((failed_tests++))
test_require_command || ((failed_tests++))
test_require_env || ((failed_tests++))
test_safe_mkdir || ((failed_tests++))
test_get_workspace_root || ((failed_tests++))

echo ""
if [ $failed_tests -eq 0 ]; then
    echo "🎉 All function tests passed!"
    exit 0
else
    echo "❌ $failed_tests test(s) failed"
    exit 1
fi
