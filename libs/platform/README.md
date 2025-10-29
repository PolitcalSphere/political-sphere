# Political Sphere Platform

Kubernetes platform assets for Political Sphere, including Helm charts for cluster add-ons, application workloads, and Argo CD GitOps definitions.

## Layout

- `charts/platform-core/` – umbrella chart wrapping ingress, cert-manager, external-dns, Argo CD, observability, and logging add-ons plus default namespaces, quotas, and issuers.
- `charts/api/`, `charts/frontend/`, `charts/worker/`, `charts/auth/`, `charts/db-proxy/` – application charts with sensible defaults for deployments, autoscaling, ingress, and configuration.
- `argo-apps/` – Argo CD `Application` and `AppProject` manifests to drive GitOps workflows across environments.
- `namespaces/` – Namespace bootstrap manifests for Argo CD or manual application in air-gapped clusters.

## Getting Started

1. Package dependencies for `platform-core`:
   ```bash
   helm dependency update charts/platform-core
   ```
2. Install platform components in a cluster (example for dev):
   ```bash
   helm upgrade --install platform-core charts/platform-core -n platform --create-namespace \
     --set global.defaultIssuerName=letsencrypt-staging
   ```
3. Sync application charts through Argo CD using the manifests in `argo-apps/`.

## GitOps Flow

1. Commit chart changes.
2. Update the corresponding Argo CD Application manifest (`argo-apps/*`).
3. Push to the Git repository tracked by Argo CD; the controller will reconcile into the cluster.

See the `docs/` repository for higher-level architecture, runbooks, and operational procedures.
