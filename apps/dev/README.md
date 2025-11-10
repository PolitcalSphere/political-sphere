# Political Sphere Local Development

This directory contains tooling to spin up a production-parity developer environment using Docker Compose and Nx. The stack mirrors the Kubernetes deployment layout (api, frontend, worker, auth, db-proxy) and provisions backing services (PostgreSQL, Redis, MailHog, localstack) so engineers can iterate without touching cloud resources.

## Prerequisites

- Docker Desktop 4.x or compatible Docker Engine
- Node.js 20.x + npm (or pnpm) for Nx commands
- Optional: Tilt v0.33+ if you prefer live-reload orchestration (see `Tiltfile`)

## Quick Start

```bash
# copy environment templates
cp apps/dev/templates/.env.example .env
cp apps/dev/templates/.env.local.example .env.local

# start local stack
./apps/dev/scripts/dev-up.sh

# run Nx dev servers with hot reload
npm install
npm run dev:all
```

The compose stack exposes core ports:

| Service         | URL                                                                   |
| --------------- | --------------------------------------------------------------------- |
| Frontend        | http://localhost:3000                                                 |
| API             | http://localhost:4000                                                 |
| Auth (Keycloak) | http://localhost:8080                                                 |
| MailHog UI      | http://localhost:8025                                                 |
| pgAdmin         | http://localhost:5050 (optional login: `admin@example.com` / `admin`) |

## Scripts

- `dev-up.sh` – builds images (if needed) and starts docker-compose in detached mode.
- `dev-down.sh` – stops and removes containers, networks, volumes.
- `seed-data.sh` – applies Prisma migrations (or equivalent) and loads sample fixtures.
- `dev-service.sh` – convenience wrapper used by `npm run dev:*` scripts to start individual services.

All scripts respect `.env` for shared settings. Override service-specific values in `.env.local`.

## Tilt (Opt-in)

The provided `Tiltfile` (optional) watches source directories and live-builds containers when files change. Launch with:

```bash
tilt up
```

## Kubernetes (k3d) — optional local Kubernetes cluster

If you want to test against a local Kubernetes cluster, `k3d` is lightweight and recommended on macOS.

1. Install: https://k3d.io/
2. Create a cluster (example):

```bash
make k3d-create
# or customize: ./apps/dev/k3d/create-cluster.sh mycluster 2
```

3. Deploy ArgoCD / dev apps and port-forward Vault when needed:

```bash
# port-forward Vault (if using vault-dev Argo app)
make vault-port-forward
```

Notes:

- k3d is tuned in `apps/dev/k3d/create-cluster.sh` for small dev machines. Adjust memory/CPU in the script or pass custom args.

## Testing Locally

Use Nx targets to trigger tests against the compose stack:

```bash
npx nx test api
npx nx e2e frontend-e2e --configuration=local
```

Refer to `apps/dev/templates` for environment examples and `docs/onboarding.md` for in-depth onboarding instructions.

> **Heads-up:** The compose stack only starts application containers (`api`, `frontend`, `worker`) when their corresponding Dockerfiles (e.g. `apps/api/Dockerfile`) exist. Until those services are scaffolded, the helper scripts will skip them and start shared infrastructure only.
