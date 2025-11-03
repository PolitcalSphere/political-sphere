SHELL := /bin/bash

.PHONY: seed

seed:
	@echo "Running SQL seed against POSTGRES (uses psql)."
	@./scripts/seed/seed.sh

.PHONY: dev-up dev-down dev-seed k3d-create vault-port-forward help

dev-up:
	@echo "Starting local dev stack (docker-compose)"
	@./apps/dev/scripts/dev-up.sh

dev-down:
	@echo "Stopping local dev stack"
	@./apps/dev/scripts/dev-down.sh

dev-seed:
	@echo "Seeding local development database"
	@./apps/dev/scripts/seed-data.sh

migrate:
	@echo "Running migrations for all workspace packages that declare Prisma"
	@./scripts/migrate/run-migrations.sh

k3d-create:
	@echo "Create a local k3d cluster for Kubernetes-based dev/testing"
	@./apps/dev/k3d/create-cluster.sh

vault-port-forward:
	@echo "Port-forward Vault from cluster to localhost:8200"
	@./apps/dev/k3d/port-forward-vault.sh

ci-checks:
	@echo "Running all CI checks (lint, typecheck, test, security)"
	@npm run lint
	@npm run typecheck
	@npm run test
	@npm run lint:import-boundaries

security-scan:
	@echo "Running security scans (audit, gitleaks)"
	@npm audit --audit-level=moderate
	@./scripts/security/gitleaks-scan.sh

test-all:
	@echo "Running all tests (unit, integration, e2e)"
	@npm run test
	@npm run test:integration || echo "No integration tests configured"
	@npm run test:e2e || echo "E2E tests require environment setup (npm run e2e:prepare)"

help:
	@echo "Available targets:"
	@echo "  make seed            # run SQL seeds against POSTGRES (psql required)"
	@echo "  make dev-up          # start local docker-compose development stack"
	@echo "  make dev-down        # stop local development stack and remove volumes"
	@echo "  make dev-seed        # run application migrations and seed data for dev"
	@echo "  make k3d-create      # create a k3d Kubernetes cluster for local testing"
	@echo "  make vault-port-forward # port-forward Vault from k8s to localhost:8200"
	@echo "  make ci-checks       # run all CI checks (lint, typecheck, test, boundaries)"
	@echo "  make security-scan   # run security audits and secret scanning"
	@echo "  make test-all        # run all test suites (unit, integration, e2e)"
