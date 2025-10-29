Monitoring (dev) — Prometheus, Grafana, Loki, Jaeger
==================================================

This folder explains the lightweight, development-only observability setup we use:

- `platform/argo-apps/monitoring-stack-dev.yaml` — installs Prometheus + Grafana (kube-prometheus-stack Helm chart).
- `platform/argo-apps/jaeger-dev.yaml` — installs Jaeger all-in-one for tracing.
- `grafana-dashboard-api.json` — example Grafana dashboard for the API service (import into Grafana UI).

Usage (dev):
1. Create a k3d cluster (optional):

   make k3d-create

2. Deploy Argo apps (or apply Helm locally):

   # If you have ArgoCD installed and pointed to the cluster
   kubectl apply -f platform/argo-apps/monitoring-stack-dev.yaml
   kubectl apply -f platform/argo-apps/jaeger-dev.yaml

3. Port-forward Grafana (dev):

   kubectl -n monitoring port-forward svc/monitoring-stack-grafana 3000:80
   # Then open http://localhost:3000 (admin / changeme)

OpenTelemetry (instrumentation notes)
-------------------------------------
We recommend instrumenting the `api` service with OpenTelemetry SDK (Node.js example in `otel-instrumentation.md`). Configure the exporter to send traces to Jaeger and metrics to Prometheus.

Security caveats
----------------
- All manifests and defaults here are dev-only. Do not use the Grafana admin password or Jaeger all-in-one in production.
- Store production credentials in Vault and wire them into ArgoCD via sealed secrets or external secret operator.
