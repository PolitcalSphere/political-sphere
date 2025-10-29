# Political Sphere Dev Platform

This workspace hosts the reference implementation for Political Sphere's multi-environment development platform. The stack is split into logical repositories housed in sibling directories:

- `infrastructure/`: Terraform modules and environment overlays for AWS.
- `platform/`: Kubernetes Helm charts, GitOps manifests, and cluster add-ons.
- `ci/`: Reusable GitHub Actions workflows and automation tooling.
- `dev/`: Local development tooling, Docker Compose stacks, and onboarding scripts.
- `docs/`: Architecture references, runbooks, security guides, and delivery reports.

Each directory is intended to be published as its own Git repository under the `political-sphere` GitHub organization. From this mono-workspace you can iterate locally, then mirror changes into their respective repos.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Docker & Docker Compose
- (Optional) PostgreSQL client for local DB access

### Bootstrap

Run the bootstrap script to set up your development environment:

```bash
npm run bootstrap
```

This will:

- Install dependencies
- Set up pre-commit hooks
- Start the dev stack (Docker Compose)
- Seed the database
- Build documentation

### Development

Start all services:

```bash
npm run dev:all
```

Or start individual services:

```bash
npm run dev:api
npm run dev:frontend
npm run dev:worker
```

### Testing

Run unit tests:

```bash
npm run test
```

Run end-to-end tests:

```bash
npm run e2e:prepare  # Start stack and seed DB
npm run test:e2e
```

### Documentation

Build and serve docs locally:

```bash
npm run docs:build
# Open docs/.vitepress/dist/index.html
```
