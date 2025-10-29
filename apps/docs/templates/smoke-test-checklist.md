# Smoke Test Checklist

Use this checklist after each deployment or disaster recovery exercise to ensure core Political Sphere functionality works.

## Environment

- [ ] Environment: **\*\*\*\***\_\_\_**\*\*\*\***
- [ ] Date: **\*\*\*\***\_\_\_**\*\*\*\***
- [ ] Tester: **\*\*\*\***\_\_\_**\*\*\*\***

## Infrastructure

- [ ] `kubectl get nodes` reports Ready status for all nodes.
- [ ] `kubectl get pods -n dev` shows all workloads running.
- [ ] External DNS records resolve correctly.

## Application

- [ ] Frontend homepage loads: https://**\*\*\*\***\_\_\_\_**\*\*\*\***
- [ ] API `/healthz` endpoint returns 200.
- [ ] Authentication login flow succeeds with test account.
- [ ] Worker queue processes a sample job (verify via logs).

## Data

- [ ] Database migrations applied successfully.
- [ ] Sample query returns expected results.
- [ ] Cache responses appear (Redis keys present).

## Observability

- [ ] Grafana reachable and dashboards display data.
- [ ] Alertmanager shows no active critical alerts.
- [ ] Loki log search returns recent logs for api, frontend, worker.

## Post-Test

- [ ] Create GitHub issue for any failures or follow-ups.
- [ ] Notify `#platform` channel that smoke test completed.
