#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Validating host system requirements..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop."
    exit 1
fi

# Check Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose V2 is not available. Please update Docker Desktop."
    exit 1
fi

# Check available resources
AVAILABLE_CPUS=$(docker info --format '{{.NCPU}}' 2>/dev/null || echo "0")
AVAILABLE_MEMORY=$(docker info --format '{{.MemTotal}}' 2>/dev/null || echo "0")

if [ "$AVAILABLE_CPUS" -lt 4 ]; then
    echo "⚠️  Warning: Only ${AVAILABLE_CPUS} CPUs available. Recommended: 4+ CPUs"
fi

if [ "$AVAILABLE_MEMORY" -lt 8589934592 ]; then  # 8GB in bytes
    MEMORY_GB=$((AVAILABLE_MEMORY / 1073741824))
    echo "⚠️  Warning: Only ${MEMORY_GB}GB memory available. Recommended: 8GB+"
fi

echo "✅ Host system validation passed"
echo "   - Docker: $(docker --version)"
echo "   - Docker Compose: $(docker compose version)"
echo "   - CPUs: ${AVAILABLE_CPUS}"
echo "   - Memory: $((AVAILABLE_MEMORY / 1073741824))GB"
