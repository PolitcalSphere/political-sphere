#!/usr/bin/env bash
set -euo pipefail

# Create a k3d cluster tuned for an Intel MacBook Pro (6-core, 16GB)
# Adjust node counts and memory according to your machine.

CLUSTER_NAME=${1:-political-dev}
NODE_COUNT=${2:-1}
CPU_LIMIT=${3:-2}
MEMORY_LIMIT=${4:-4096} # MB per node

echo "Creating k3d cluster '${CLUSTER_NAME}' with ${NODE_COUNT} worker node(s)"

# Ensure k3d and kubectl installed
if ! command -v k3d >/dev/null 2>&1; then
  echo "k3d not found. Install from https://k3d.io/" >&2
  exit 1
fi

# Create cluster with a single server + worker nodes
k3d cluster create ${CLUSTER_NAME} \
  --servers 1 \
  --agents ${NODE_COUNT} \
  --k3s-arg "--no-deploy=traefik@server:0" \
  --wait

# Optional: label nodes and adjust resources via docker if needed

echo "k3d cluster '${CLUSTER_NAME}' created. You can use 'kubectl cluster-info' to verify."

echo "Tip: Use 'make k3d-create <name> <nodes>' to customize the cluster name and node count."
