#!/bin/bash

# AI Performance Optimization Script
# @fileoverview Comprehensive script to optimize AI assistant performance

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 Starting AI Performance Optimization..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed. Please install Node.js first."
    exit 1
fi

cd "$PROJECT_ROOT"

print_status "Running pre-cache script..."
if node tools/scripts/ai/pre-cache.js; then
    print_success "Pre-cache completed successfully"
else
    print_warning "Pre-cache script failed, but continuing..."
fi

print_status "Running performance monitor..."
if node tools/scripts/ai/performance-monitor.js; then
    print_success "Performance analysis completed"
else
    print_warning "Performance monitor failed, but continuing..."
fi

print_status "Checking AI controls configuration..."
if [ -f "ai-controls.json" ]; then
    FAST_MODE=$(node -p "JSON.parse(require('fs').readFileSync('ai-controls.json', 'utf8')).fastMode.enabled")
    if [ "$FAST_MODE" = "true" ]; then
        print_success "Fast mode is enabled"
    else
        print_warning "Fast mode is disabled. Set FAST_AI=1 to enable fast mode"
    fi
else
    print_error "ai-controls.json not found"
fi

print_status "Checking cache status..."
if [ -f "ai-cache/cache.json" ]; then
    CACHE_SIZE=$(node -p "Object.keys(JSON.parse(require('fs').readFileSync('ai-cache/cache.json', 'utf8')).queries).length")
    print_success "Cache contains $CACHE_SIZE queries"
else
    print_warning "Cache file not found"
fi

print_status "Checking metrics..."
if [ -f "ai-metrics.json" ]; then
    AVG_RESPONSE_TIME=$(node -p "JSON.parse(require('fs').readFileSync('ai-metrics.json', 'utf8')).averageResponseTime")
    if [ "$AVG_RESPONSE_TIME" != "0" ]; then
        print_success "Average response time: ${AVG_RESPONSE_TIME}ms"
    else
        print_warning "No response time data available yet"
    fi
else
    print_warning "Metrics file not found"
fi

print_status "Optimization recommendations:"
echo "  • Run 'FAST_AI=1 <command>' for faster responses during development"
echo "  • Use 'node tools/scripts/ai/pre-cache.js' to populate cache with common queries"
echo "  • Monitor performance with 'node tools/scripts/ai/performance-monitor.js'"
echo "  • Review ai-learning/patterns.json for optimization tips"
echo "  • Check ai-metrics.json for performance trends"

print_success "AI Performance Optimization completed!"
echo ""
echo "To enable fast mode for the current session:"
echo "  export FAST_AI=1"
echo ""
echo "To run this optimization script again:"
echo "  ./tools/scripts/ai/optimize-ai.sh"
