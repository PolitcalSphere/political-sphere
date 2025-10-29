# Incident Response Runbook

This runbook provides a structured approach for responding to platform incidents affecting Political Sphere environments.

## Detection

Incidents can be triggered by:

- Alertmanager notifications (PagerDuty once integrated, currently Slack `#platform-alerts`).
- Argo CD sync failures.
- Grafana alerts (SLO violations, error rate spikes).
- Manual reports from engineers or stakeholders.

## Triage

1. **Acknowledge** the alert in Slack and assign an incident lead (IL) and communications lead (CL).
2. **Classify** severity:
   - SEV0 – Production outage or data loss.
   - SEV1 – Critical functionality impaired, workaround unavailable.
   - SEV2 – Degraded performance or partial outage with workaround.
   - SEV3 – Non-urgent issues (track via normal backlog).
3. **Open Timeline** – Start documenting events in `#incidents` channel with timestamps.
4. **Create Incident Issue** – Use GitHub template `docs/templates/incident-issue.md` (to be added) or create a new GitHub issue tagged `incident`.

## Investigation Checklist

- Check Argo CD application status: `argocd app list` / `argocd app get <app>`.
- Inspect Kubernetes cluster health: `kubectl get nodes`, `kubectl get pods -A`.
- Review logs in Loki (`kubectl logs`, Grafana > Explore > Loki).
- Check Prometheus alerts (`/alertmanager` UI).
- Validate AWS service status (CloudWatch events, RDS, EKS console).

## Common Runbooks

### Service Deployment Failure

1. Identify failing Argo CD sync.
2. `kubectl describe` failing resources for validation errors/policy denials.
3. Roll back to last healthy revision (`argocd app rollback <app> <revision>`).
4. Coordinate with owning team to patch chart/manifests.

### RDS Connectivity Issues

1. Verify RDS status in AWS console (look for failovers or maintenance).
2. Check network paths: security groups, route tables, NAT gateways.
3. Validate application connection strings and secrets.
4. If necessary, failover or restore from snapshot (escalate to SRE lead for approval).

### API Latency Spike

1. Examine Grafana dashboards for CPU/memory, request latency, error rate.
2. Check HPA scaling events (`kubectl describe hpa <service>`).
3. Inspect downstream dependencies (Redis, external APIs).
4. Apply mitigation (scale up manually, revert recent changes, enable feature flag). Document each action.

## Communication

- Provide updates every 15 minutes in Slack `#incidents` during active response.
- For SEV0/SEV1 incidents, notify leadership via `@here` and email `exec@political-sphere.example`.
- Post-incident summary should include timeline, root cause, remediation steps, follow-up tasks.

## Post-Incident

1. **Stop the clock** – confirm systems are stable and services meet SLOs.
2. **Document** – create a postmortem doc (use template under `docs/templates/postmortem.md` once available).
3. **Action Items** – file follow-up tasks with owners; track in the backlog with due dates.
4. **Review** – hold blameless postmortem review within 5 business days.

## Automation & Tooling Backlog

- [ ] Automate incident issue creation from Slack via Bot.
- [ ] Integrate PagerDuty and run weekly on-call drills.
- [ ] Build Grafana dashboard for incident metrics (MTTA/MTTR).
- [ ] Script to collect diagnostic bundle (logs, events, metrics snapshots).

## Contact List

| Role             | Primary                                 | Backup                |
| ---------------- | --------------------------------------- | --------------------- |
| Platform Lead    | Jordan Smith (@jordans)                 | Priya Patel (@priyap) |
| SRE On-Call      | Defined in PagerDuty schedule (pending) | n/a                   |
| Security Liaison | Alex Rivera (@arivera)                  | Morgan Lee (@morglee) |

Keep this document updated as processes evolve.
