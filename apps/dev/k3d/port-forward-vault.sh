#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=${1:-vault-dev}
POD_LABEL=${2:-app.kubernetes.io/name=vault}
LOCAL_PORT=${3:-8200}
REMOTE_PORT=${4:-8200}

# Find Vault pod
POD=$(kubectl -n ${NAMESPACE} get pods -l ${POD_LABEL} -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
if [[ -z "$POD" ]]; then
  echo "No Vault pod found in namespace '${NAMESPACE}' with label '${POD_LABEL}'." >&2
  echo "Run 'kubectl -n ${NAMESPACE} get pods' to inspect." >&2
  exit 1
fi

echo "Port-forwarding pod ${POD} -> localhost:${LOCAL_PORT}:${REMOTE_PORT} (ctrl-c to stop)"
kubectl -n ${NAMESPACE} port-forward ${POD} ${LOCAL_PORT}:${REMOTE_PORT}
