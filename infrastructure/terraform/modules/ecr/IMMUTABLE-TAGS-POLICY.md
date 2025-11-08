# ECR Module - Immutable Image Tags Policy

## Security Change (2025-11-08)

**Issue**: `image_tag_mutability = "MUTABLE"` allowed image tags to be overwritten, enabling potential supply chain attacks where compromised images could replace trusted ones.

**Fix**: Changed default to `image_tag_mutability = "IMMUTABLE"`.

**Impact**: Image tags can NO LONGER be overwritten once pushed. You must use unique tags for each build.

---

## Why Immutable Tags Are Critical

### Attack Scenario (Mutable Tags)

```bash
# Day 1: Developer pushes legitimate image
docker tag myapp:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0

# Day 30: Attacker gains temporary access and overwrites the tag
docker tag malicious-image:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0  # ✅ Succeeds with MUTABLE

# Result: Production pulls "v1.0.0" and gets compromised image
```

### Protection (Immutable Tags)

```bash
# Attacker attempts overwrite
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0
# ❌ Error: Tag v1.0.0 is immutable and cannot be overwritten

# Image integrity is preserved
```

---

## Recommended Tagging Strategy

### ✅ Best Practice: Unique Tags

Use **git SHA** or **semantic version + build number** for unique, immutable tags:

```bash
# Option 1: Git SHA (Recommended)
GIT_SHA=$(git rev-parse --short HEAD)
docker tag myapp:latest ${ECR_REPO}:${GIT_SHA}
docker tag myapp:latest ${ECR_REPO}:main-${GIT_SHA}

# Option 2: Semantic Version + Build
VERSION="1.2.3"
BUILD_NUMBER="42"
docker tag myapp:latest ${ECR_REPO}:${VERSION}-${BUILD_NUMBER}

# Option 3: Timestamp + SHA
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
docker tag myapp:latest ${ECR_REPO}:${VERSION}-${TIMESTAMP}-${GIT_SHA}
```

### ✅ Good: Multi-Tag Strategy

Push the same image with multiple tags for different purposes:

```bash
GIT_SHA=$(git rev-parse --short HEAD)
VERSION="1.2.3"

# Immutable tags (never change)
docker tag myapp:latest ${ECR_REPO}:${GIT_SHA}
docker tag myapp:latest ${ECR_REPO}:${VERSION}-${GIT_SHA}

# Environment promotion tags (updated via new pushes)
docker tag myapp:latest ${ECR_REPO}:dev-latest
docker tag myapp:latest ${ECR_REPO}:staging-${VERSION}

docker push ${ECR_REPO} --all-tags
```

### ❌ Anti-Patterns

```bash
# Bad: Generic "latest" tag only
docker tag myapp:latest ${ECR_REPO}:latest  # ❌ Not reproducible

# Bad: Reusing semantic versions
docker tag myapp:latest ${ECR_REPO}:v1.0.0  # ❌ Can't update if immutable

# Bad: Environment-only tags
docker tag myapp:latest ${ECR_REPO}:production  # ❌ No version tracking
```

---

## CI/CD Pipeline Examples

### GitHub Actions

```yaml
name: Build and Push to ECR

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: myapp
        run: |
          GIT_SHA=$(git rev-parse --short HEAD)
          VERSION=$(cat VERSION)  # e.g., "1.2.3"

          # Build image
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$GIT_SHA .

          # Tag with multiple immutable tags
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$GIT_SHA \
                     $ECR_REGISTRY/$ECR_REPOSITORY:$VERSION-$GIT_SHA

          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$GIT_SHA \
                     $ECR_REGISTRY/$ECR_REPOSITORY:main-latest

          # Push all tags
          docker push $ECR_REGISTRY/$ECR_REPOSITORY --all-tags

          # Output for deployment
          echo "image_tag=$GIT_SHA" >> $GITHUB_OUTPUT
```

### GitLab CI

```yaml
build-image:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - apk add --no-cache aws-cli
    - aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
  script:
    - export GIT_SHA=$(git rev-parse --short HEAD)
    - export VERSION=$(cat VERSION)
    - docker build -t $ECR_REGISTRY/myapp:$GIT_SHA .
    - docker tag $ECR_REGISTRY/myapp:$GIT_SHA $ECR_REGISTRY/myapp:$VERSION-$GIT_SHA
    - docker tag $ECR_REGISTRY/myapp:$GIT_SHA $ECR_REGISTRY/myapp:$CI_COMMIT_REF_NAME-latest
    - docker push $ECR_REGISTRY/myapp --all-tags
```

---

## Kubernetes Deployment

Always reference images by **digest** or **immutable tag** in production:

### ✅ Recommended: Image Digest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: myapp
          # Use digest for guaranteed immutability
          image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp@sha256:abc123...
          # Or use immutable tag
          # image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:a1b2c3d
```

### Get Image Digest

```bash
# After pushing
docker inspect --format='{{index .RepoDigests 0}}' ${ECR_REPO}:${TAG}

# Or from AWS CLI
aws ecr describe-images \
  --repository-name myapp \
  --image-ids imageTag=a1b2c3d \
  --query 'imageDetails[0].imageDigest' \
  --output text
```

---

## Lifecycle Management

With immutable tags, use lifecycle policies to clean up old images:

```hcl
# In terraform/modules/ecr/main.tf
resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

---

## Rollback Strategy

With immutable tags, rollback is straightforward:

```bash
# List available versions
aws ecr describe-images \
  --repository-name myapp \
  --query 'sort_by(imageDetails,& imagePushedAt)[-10:].[imageTags[0]]' \
  --output table

# Rollback: Update Kubernetes deployment to previous immutable tag
kubectl set image deployment/myapp \
  myapp=123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:previous-sha

# Or update via digest
kubectl set image deployment/myapp \
  myapp=123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp@sha256:previous-digest
```

---

## Exception: Development Repositories

If you absolutely need mutable tags for development (NOT recommended for production):

```hcl
# In terraform.tfvars
repositories = {
  "myapp-dev" = {
    image_tag_mutability = "MUTABLE"  # Explicit override for dev only
    scan_on_push         = true
  }

  "myapp-prod" = {
    image_tag_mutability = "IMMUTABLE"  # Default, production-safe
    scan_on_push         = true
  }
}
```

**Warning**: Even for development, consider using unique tags instead of mutable ones.

---

## Migration Guide

### For Existing Repositories

1. **Audit current tags**:

   ```bash
   aws ecr describe-images --repository-name myapp \
     --query 'imageDetails[*].[imageTags[0], imagePushedAt]' \
     --output table
   ```

2. **Update CI/CD pipelines**: Implement unique tag strategy (git SHA)

3. **Test with new tags**: Verify builds work with immutable tags

4. **Apply Terraform change**:

   ```bash
   terraform plan
   terraform apply
   ```

5. **Existing tags remain**: Already-pushed tags are unaffected

6. **New pushes require unique tags**: Subsequent pushes must use new tags

---

## Compliance & References

- **CIS AWS Foundations Benchmark**: Container image integrity
- **OWASP Container Security**: Prevent image tampering
- **NIST SP 800-190**: Application Container Security Guide
- **Supply Chain Levels for Software Artifacts (SLSA)**: Build provenance
- **AWS ECR Best Practices**: Immutable tags for production workloads

---

## Verification

Check if a repository has immutable tags enabled:

```bash
aws ecr describe-repositories \
  --repository-names myapp \
  --query 'repositories[0].imageTagMutability' \
  --output text
```

Expected output: `IMMUTABLE`

---

## Questions?

See `docs/06-security-and-risk/infrastructure-security.md` for infrastructure security guidelines.
