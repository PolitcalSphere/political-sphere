# Secrets Inventory

## Current Secrets

### GitHub Repository Secrets

- AWS_ACCESS_KEY_ID: AWS credentials for ECR access
- AWS_SECRET_ACCESS_KEY: AWS credentials for ECR access
- DOCKERHUB_TOKEN: Docker Hub authentication
- NPM_TOKEN: NPM publishing token

### Environment Variables

- DATABASE_URL: PostgreSQL connection string
- JWT_SECRET: JWT signing secret
- API_KEY: External API authentication

## Migration Plan

### Phase 1: Infrastructure Setup

- Deploy Vault cluster
- Configure OIDC authentication
- Set up secret engines (KV, database, AWS)

### Phase 2: Application Updates

- Update CI/CD workflows to use Vault
- Modify application code for Vault integration
- Implement secret rotation

### Phase 3: Production Migration

- Migrate production secrets
- Update deployment pipelines
- Enable audit logging
