# Vault deployment (OSS) — guidance & templates

Purpose
-------
Provide a safe, reproducible path to deploy HashiCorp Vault OSS for development and production (self-hosted, free). This file contains step-by-step instructions, a small dev-mode Helm command for local clusters, an Argo CD Application template, and GitHub Actions notes for OIDC/GitHub integration. Use these templates as a starting point — do not apply them blindly in production.

Why Vault?
-----------
- Centralized secret storage, dynamic secrets, and built-in rotation primitives.
- OSS edition is free and sufficient for development and early staging environments.

Official docs
-------------
- Vault Helm chart: https://github.com/hashicorp/vault-helm
- Vault project: https://www.vaultproject.io/docs
- GitHub Actions OIDC (recommended for short-lived CI credentials): https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect

Local dev (k3d / kind / minikube)
--------------------------------
1. Ensure you have a local Kubernetes cluster (k3d is recommended for Mac dev): https://k3d.io/
2. Add HashiCorp helm repo and install Vault in "dev" mode (single pod, not for prod):

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
# dev-mode: single server, unsealed, and useful for local development only
helm install vault-dev hashicorp/vault --set "server.dev.enabled=true" --namespace vault --create-namespace
```

3. Verify:

```bash
kubectl get pods -n vault
kubectl logs -n vault -l app.kubernetes.io/name=vault
```

Production (high-level)
-----------------------
- Use the official Helm chart with a supported storage backend (Consul, k8s PVs, or cloud KMS). Do not use `server.dev` in prod.
- Configure TLS, storage, HA mode, and proper auto-unseal (key management) using a cloud KMS or integrated auto-unseal mechanisms.
- Carefully plan backup and restore of the storage backend and the auto-unseal keys.

Argo CD Application template (example)
-------------------------------------
Use this template to create an Argo CD Application that deploys the official Vault Helm chart. Replace placeholders before use.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: vault-oss
  namespace: argocd
spec:
  project: platform
  source:
    repoURL: https://helm.releases.hashicorp.com
    chart: vault
    targetRevision: ""
    helm:
      values: |
        server:
          # For dev use only. REMOVE in prod
          dev:
            enabled: false
        # Example: tune storage / tls / unseal here
  destination:
    server: https://kubernetes.default.svc
    namespace: vault
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true

# Notes:
# - Set `targetRevision` to a specific chart version (recommended). See https://github.com/hashicorp/vault-helm/releases
# - Provide production-grade Helm `values` for storage, HA, and auto-unseal.
```

CI / GitHub Actions: short-lived tokens and OIDC
------------------------------------------------
- Prefer GitHub Actions OIDC to mint short-lived cloud credentials rather than long-lived secrets in GitHub.
- For Vault, a common pattern is: bootstrapped Vault auth backend + role that permits CI to request a short-lived Vault token. Use OIDC to authenticate the runner to a cloud identity provider if you need cloud-managed KMS for auto-unseal.
- Circle back here if you want a small GitHub Actions workflow template that uses OIDC to fetch a Vault token during deploys.

Checklist & next steps
----------------------
- [ ] Decide initial environment to host Vault (k8s-on-cloud, self-hosted k3d dev, or managed provider).
- [ ] If using k8s, prepare Helm values for storage and auto-unseal (document which KMS you'll use).
- [ ] Add an Argo CD Application (template above) to `platform/argo-apps/` once Helm values are validated.
- [ ] Add a small GitHub Actions step that reads secrets from Vault using short-lived tokens (avoid writing tokens to logs).

Security caveats
----------------
- Do not enable dev mode in staging/production.
- Protect access to the Vault unseal keys and auto-unseal configuration.
- Document and test your secret-rotation/runbook in `docs/runbooks/`.

If you want, I can now:
- create `platform/argo-apps/vault-dev.yaml` as a safe Argo Application using the template above (marked dev-only),
- or add a GitHub Actions workflow snippet to fetch secrets from Vault during deploys.
