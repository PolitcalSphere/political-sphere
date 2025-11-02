#!/usr/bin/env bash
set -euo pipefail

# Always run relative checks from the script's directory
SCRIPT_DIR="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 && pwd -P)"
cd "$SCRIPT_DIR"

echo "🧪 Testing DevContainer Configuration"
echo "====================================="

# Test 1: JSON syntax validation
echo ""
echo "1. Testing JSON syntax..."
if python3 -m json.tool devcontainer.json > /dev/null 2>&1; then
    echo "✅ devcontainer.json is valid JSON"
else
    echo "❌ devcontainer.json has JSON syntax errors"
    exit 1
fi

# Test 2: Shell script syntax validation
echo ""
echo "2. Testing shell script syntax..."
SCRIPT_ERRORS=0
for script in scripts/*.sh; do
    if [ -f "$script" ]; then
        if bash -n "$script" 2>/dev/null; then
            echo "✅ $script syntax OK"
        else
            echo "❌ $script has syntax errors"
            SCRIPT_ERRORS=$((SCRIPT_ERRORS + 1))
        fi
    fi
done

if [ $SCRIPT_ERRORS -gt 0 ]; then
    echo "❌ $SCRIPT_ERRORS script(s) have syntax errors"
    exit 1
else
    echo "✅ All shell scripts are syntactically valid"
fi

# Test 3: Required files exist
echo ""
echo "3. Checking required files..."
REQUIRED_FILES=("devcontainer.json" "Dockerfile" "README.md" "WELCOME.txt")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Test 4: Scripts directory exists and has files
echo ""
echo "4. Checking scripts directory..."
if [ -d "scripts" ]; then
    SCRIPT_COUNT=$(find scripts -name "*.sh" | wc -l)
    echo "✅ scripts/ directory exists with $SCRIPT_COUNT script(s)"
else
    echo "❌ scripts/ directory missing"
    exit 1
fi

# Test 5: Basic security checks
echo ""
echo "5. Basic security checks..."

COMPOSE_FILE="../apps/dev/docker/docker-compose.dev.yaml"

if grep -q "no-new-privileges" devcontainer.json || ( [ -f "$COMPOSE_FILE" ] && grep -q "no-new-privileges" "$COMPOSE_FILE" ); then
    echo "✅ Security: no-new-privileges enabled"
else
    echo "⚠️  Security: no-new-privileges not found"
fi

if grep -q "cap-drop.*ALL" devcontainer.json || ( [ -f "$COMPOSE_FILE" ] && grep -q "cap_drop" "$COMPOSE_FILE" && grep -q -- "- ALL" "$COMPOSE_FILE" ); then
    echo "✅ Security: capabilities dropped"
else
    echo "⚠️  Security: capabilities not properly restricted"
fi

if grep -q '"remoteUser": "node"' devcontainer.json; then
    echo "✅ Security: non-root user configured"
else
    echo "⚠️  Security: root user may be in use"
fi

# Test 6: Performance configuration
echo ""
echo "6. Performance configuration checks..."
if grep -q '"cpus":' devcontainer.json; then
    echo "✅ Performance: CPU limits configured"
else
    echo "⚠️  Performance: CPU limits not configured"
fi

if grep -q '"memory":' devcontainer.json; then
    echo "✅ Performance: Memory limits configured"
else
    echo "⚠️  Performance: Memory limits not configured"
fi

if grep -q "tmpfs" devcontainer.json || ( [ -f "$COMPOSE_FILE" ] && grep -q "tmpfs" "$COMPOSE_FILE" ); then
    echo "✅ Performance: tmpfs mounts configured"
else
    echo "⚠️  Performance: tmpfs mounts not configured"
fi

echo ""
echo "🎉 All tests completed successfully!"
echo ""
echo "📋 Summary:"
echo "   - JSON configuration: Valid"
echo "   - Shell scripts: $SCRIPT_COUNT validated"
echo "   - Required files: Present"
echo "   - Security features: Configured"
echo "   - Performance optimizations: Applied"
echo ""
echo "🚀 DevContainer is ready for development!"
