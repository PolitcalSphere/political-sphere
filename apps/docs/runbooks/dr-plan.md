# Disaster Recovery Plan

This DR plan outlines how to recover Political Sphere infrastructure and applications in the event of catastrophic failure or data loss.

## Objectives

- **RTO** (Recovery Time Objective): 4 hours for critical services (API, frontend, auth).
- **RPO** (Recovery Point Objective): 15 minutes for databases (RDS PITR) and 1 hour for object storage (S3 versioning).

## Assumptions

- Terraform remote state persists in S3 bucket with versioning.
- RDS automated backups and manual snapshots are available.
- ECR stores current container images.
- Helm charts and manifests remain in Git (GitOps source of truth).

## Recovery Phases

### 1. Assess Impact

- Identify failed region/service. Determine whether failover to another AWS region or account is required.
- Validate health checks: Argo CD, Prometheus, Grafana, RDS, Redis.

### 2. Failover Decision

- If single component failure (e.g., RDS), perform same-region restore.
- If regional outage, initiate cross-region recovery using Terraform environment overlays targeting secondary region.

### 3. Infrastructure Restoration

1. Clone infrastructure repo; checkout last known good tag.
2. Update backend config to point to recovery state bucket/table if original is compromised.
3. Apply Terraform in desired environment:
   ```bash
   cd infrastructure/envs/<env>
   terraform init -reconfigure
   terraform apply
   ```
4. For RDS, choose restore method:
   - **Point-in-Time Restore**: create new instance from latest snapshot; update Terraform variables with new identifier.
   - **Cross-Region Restore**: use snapshot copy in target region, update DNS cutover once ready.
5. Restore Redis cache (if needed) from snapshot or allow to warm up from application.
6. Validate Route53 records, ACM certificates (reissue if region changed).

### 4. Application Deployment

- Argo CD: update cluster credentials/OIDC if EKS changed, then sync `platform-core` and workloads.
- Verify namespaces, network policies, and RBAC enforcement.
- Ensure secrets are restored (Vault/Secrets Manager). If secrets were lost, re-bootstrap via `scripts/bootstrap-vault.sh` (future work).

### 5. Data Validation

- Run application smoke tests (see `docs/templates/smoke-test-checklist.md`).
- Validate database integrity (run migrations, sample queries).
- Confirm S3 objects accessible (spot-check critical assets).

### 6. Cutover

- Update DNS records or load balancer targets to point to recovered environment.
- Inform stakeholders that services are back online; monitor metrics for 1 hour before standing down.

## Backups & Testing

- **RDS**: Automated backups daily; keep last 7 days (dev) / 35 days (prod). Schedule quarterly restore drills.
- **S3**: Enable versioning + lifecycle policies (already configured in Terraform). Quarterly restore test.
- **Terraform State**: S3 bucket uses versioning; DynamoDB lock table ensures consistency.
- **Artifacts**: ECR retain 150 image versions; consider replicating to disaster region (set `ecr_replication_rules`).

## Communication

- Use `#incidents` channel for coordination.
- Escalate to leadership for SEV0/SEV1 events.
- Provide recovery ETA updates every 30 minutes.

## Follow-Up

- Document DR activation in postmortem.
- Update DR plan with lessons learned.
- File action items for missing automation (e.g., automated DNS failover, cross-region replication).
