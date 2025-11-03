#!/usr/bin/env bash
# Host system validation script for DevContainer
# Runs on the host machine before container creation

set -euo pipefail

echo "🔍 Validating host system requirements..."

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop or Docker Engine."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running. Please start Docker Desktop or Docker service."
    exit 1
fi

echo "✅ Docker is available"

# Check Docker Compose version
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not available. Please ensure Docker Compose V2 is installed."
    exit 1
fi

COMPOSE_VERSION=$(docker compose version 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
echo "✅ Docker Compose available (version: $COMPOSE_VERSION)"

# Check available resources
echo "📊 Checking system resources..."

# Get available memory in GB
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    AVAILABLE_MEMORY=$(echo "$(sysctl -n hw.memsize) / 1024 / 1024 / 1024" | bc 2>/dev/null || echo "8")
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    AVAILABLE_MEMORY=$(free -g | awk 'NR==2{printf "%.0f", $2}' 2>/dev/null || echo "8")
else
    AVAILABLE_MEMORY=8  # Default assumption for other systems
fi

echo "💾 Available memory: ${AVAILABLE_MEMORY}GB"

if [ "$AVAILABLE_MEMORY" -lt 6 ]; then
    echo "⚠️  Warning: Only ${AVAILABLE_MEMORY}GB memory available. Recommended: 8GB+"
    echo "   The devcontainer may run slowly or fail to start."
fi

# Get CPU count
CPU_COUNT=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "4")
echo "🖥️  Available CPUs: $CPU_COUNT"

if [ "$CPU_COUNT" -lt 2 ]; then
    echo "⚠️  Warning: Only $CPU_COUNT CPU(s) available. Recommended: 2+ CPUs"
    echo "   The devcontainer may run slowly."
fi

# Check available disk space (in GB)
if [[ "$OSTYPE" == "darwin"* ]]; then
    AVAILABLE_DISK=$(df -h . | awk 'NR==2{print $4}' | sed 's/G//' 2>/dev/null || echo "50")
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    AVAILABLE_DISK=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//' 2>/dev/null || echo "50")
else
    AVAILABLE_DISK=50
fi

echo "💿 Available disk space: ${AVAILABLE_DISK}GB"

# Fix: Remove non-numeric characters before integer comparison
DISK_NUMERIC=$(echo "$AVAILABLE_DISK" | tr -dc '0-9')

if [ "$DISK_NUMERIC" -lt 16 ]; then
    echo "⚠️  Warning: Only ${AVAILABLE_DISK}GB disk space available. Recommended: 32GB+"
    echo "   The devcontainer may fail to build or run out of space."
fi

# Check if required ports are available (optional check)
echo "🔌 Checking port availability..."

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -i :"$port" &>/dev/null; then
        echo "⚠️  Port $port is already in use. This may cause conflicts."
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Check some key ports (non-blocking)
check_port 3000 || true
check_port 4000 || true
check_port 5432 || true  # Note: PostgreSQL may be running locally

echo ""
echo "✅ Host system validation complete!"
echo "ℹ️  If you see warnings above, consider addressing them for optimal performance."
