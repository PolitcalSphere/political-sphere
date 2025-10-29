#!/usr/bin/env bash
set -euo pipefail

# Secrets management preparation script
# Prepares for Vault integration by identifying and documenting secrets usage

echo "🔐 Secrets Management Assessment"
echo "================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# Find potential secrets in code
echo "Scanning for potential secrets in codebase..."

# Look for common secret patterns
echo "🔍 Checking for hardcoded secrets..."
grep -r -i "password\|secret\|key\|token" --include="*.js" --include="*.ts" --include="*.json" --include="*.yaml" --include="*.yml" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.nx \
  | grep -v "node_modules\|.git\|test\|example\|sample\|placeholder\|CHANGELOG\|README" \
  | head -20 || echo "No obvious hardcoded secrets found"

echo ""
echo "📋 Current Secrets Usage:"
echo "- GitHub Secrets: Used in CI/CD workflows"
echo "- Environment Variables: API keys, DB credentials"
echo "- Docker Secrets: Not currently implemented"

echo ""
echo "🚀 Migration Path to Vault:"
echo "1. Deploy HashiCorp Vault in infrastructure/"
echo "2. Create Vault policies for different environments"
echo "3. Update CI/CD to authenticate with Vault"
echo "4. Replace GitHub secrets with Vault paths"
echo "5. Implement secret rotation policies"

echo ""
echo "⚠️  Immediate Actions Required:"
echo "- Install Vault GitHub App for OIDC auth"
echo "- Create Vault configuration in IaC"
echo "- Update workflows to use vault-action"

echo ""
echo "For production deployment, ensure:"
echo "- Vault is highly available"
echo "- Backup and recovery procedures"
echo "- Audit logging enabled"
echo "- Access controls configured"

# Create a secrets inventory file
cat > docs/secrets-inventory.md << 'EOF'
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
EOF

echo "📄 Secrets inventory created at docs/secrets-inventory.md"