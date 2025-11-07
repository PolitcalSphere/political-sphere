political-sphere/
├── **.devcontainer/** # Development containers (at repo root)
│ ├── devcontainer.json
│ ├── Dockerfile
│ └── docker-compose.dev.yml
│
├── **.github/** # GitHub configuration
│ ├── **workflows/** # CI/CD pipelines
│ │ ├── **ci.yml**
│ │ ├── **release.yml**
│ │ ├── **security.yml**
│ │ ├── **test-run-tests-action.yml**
│ │ └── **test-setup-node-action.yml**
│ ├── **actions/** # Reusable actions
│ │ ├── **setup-node/**
│ │ │ ├── **action.yml**
│ │ │ ├── **setup-node.sh** # Basic node setup and validation
│ │ │ └── **README.md**
│ │ ├── **run-tests/**
│ │ │ ├── **action.yml** # Definition and logic
│ │ │ ├── **run-tests.sh** # Core runner script
│ │ │ ├── **parse-results.mjs** # parse & summarise test output
│ │ │ ├── **upload-artifacts.sh** # uploads coverage/test reports
│ │ │ ├── **coverage.config.json** # Shared coverage thresholds
│ │ │ └── **README.md**
│ │ ├── **setup-node-deps/** # Install dependencies (separate composite)
│ │ ├── **quality-checks/** # Linting/type/security meta action
│ │ └── **deploy/**
│ │ ├── **action.yml**
│ │ ├── **run-deploy.sh** # main, idempotent deploy orchestration script
│ │ ├── **build-and-push.sh** # build container images & push to registry
│ │ ├── **helm-deploy.sh** # deploy/upgrade Helm charts
│ │ ├── **kubectl-apply.sh** # apply k8s manifests / kustomize
│ │ ├── **argocd-sync.sh** # call ArgoCD API / CLI to sync apps
│ │ ├── **rollback.sh** # simple rollback helper
│ │ ├── **validate-manifests.sh** # linting + kubeval + yamllint
│ │ └── **README.md**
│ ├── **ISSUE_TEMPLATE/**
│ │ ├── **bug_report.yml**
│ │ ├── **feature_request.yml**
│ │ └── **security_report.yml**
│ ├── **PULL_REQUEST_TEMPLATE/**
│ │ └── **PULL_REQUEST.md**
│ ├── **SECURITY.md** # Security policy ✨ NEW
│ ├── **SUPPORT.md** # Support guidelines ✨ NEW
│ ├── **CODEOWNERS** # Code ownership ✨ NEW
│ ├── **FUNDING.yml** # Sponsorship info ✨ NEW
│ ├── **dependabot.yml** # Dependency updates ✨ NEW
│ ├── **copilot-instructions.md**
│ └── **README.md** # ✨ NEW
|
├── **.nx/** # Nx cache and workspace data
│ └── **workspace-data/** # Project graphs and dependency analysis
│ ├── **graphs/** # Project graph files
│ │ ├── **project-graph.json**
│ │ └── **project-graph.lock**
│ ├── **locks/** # Lockfile hash files
│ │ ├── **lockfile-dependencies.hash**
│ │ └── **lockfile-nodes.hash**
│ ├── **maps/** # Mapping files
│ │ ├── **file-map.json**
│ │ └── **source-maps.json**
│ ├── **parsed/** # Parsed lock files
│ │ ├── **parsed-lock-file.dependencies.json**
│ │ └── **parsed-lock-file.nodes.json**
│ ├── **db/** # Database files
│ │ └── **[UUID].db**
│ └── **other/** # Miscellaneous files
│ ├── **nx_files.nxt**
│ └── **d/**
│
├── **.vitest/** # Vitest cache (generated)
│ ├── **cache/**
│ │ └── **vitest/**
│ │ └── **[hash]/**
│ │ └── **results.json**
│ └── **cache-temp/**
│ └── **vitest/**
│ └── **[hash]/**
│ └── **results.json**
|
├── **.vscode/** # VS Code workspace settings
│ ├── **extensions.json**
│ ├── **settings.json**
│ ├── **tasks.json**
│ └── **launch.json**
│
├── apps/ # Application projects
│ ├── **api/** # Backend API service
│ │ ├── **src/**
│ │ │ ├── **modules/**
│ │ │ ├── **middleware/**
│ │ │ ├── **utils/**
│ │ │ └── server.ts
│ │ ├── **tests/**
│ │ │ ├── unit/
│ │ │ ├── integration/
│ │ │ └── fixtures/
│ │ ├── **openapi/** # OpenAPI specs ✨ NEW
│ │ │ ├── api.yaml
│ │ │ ├── schemas/
│ │ │ └── generated/
│ │ ├── **prisma/** # Database schemas ✨ NEW
│ │ │ ├── schema.prisma
│ │ │ ├── migrations/
│ │ │ └── seeds/
│ │ ├── project.json # With tags ⚡ ENHANCED
│ │ ├── tsconfig.json
│ │ ├── .env.example
│ │ └── README.md
│ │
│ ├── web/ # Main web application ⚡ RENAMED (was frontend)
│ │ ├── src/
│ │ │ ├── components/
│ │ │ ├── pages/
│ │ │ ├── hooks/
│ │ │ ├── utils/
│ │ │ ├── styles/
│ │ │ ├── assets/
│ │ │ └── main.tsx
│ │ ├── tests/
│ │ │ ├── unit/
│ │ │ ├── integration/
│ │ │ └── accessibility/
│ │ ├── public/
│ │ ├── project.json # With tags ⚡ ENHANCED
│ │ ├── vite.config.js
│ │ ├── .env.example
│ │ └── README.md
│ │
│ ├── game-server/ # Real-time game simulation
│ │ ├── src/
│ │ │ ├── engine/
│ │ │ ├── simulation/
│ │ │ ├── websocket/
│ │ │ └── server.ts
│ │ ├── tests/
│ │ ├── project.json # With tags ⚡ ENHANCED
│ │ ├── tsconfig.json
│ │ └── README.md
│ │
│ ├── worker/ # Background job processor
│ │ ├── src/
│ │ │ ├── jobs/
│ │ │ ├── queues/
│ │ │ └── worker.ts
│ │ ├── tests/
│ │ ├── project.json # With tags ⚡ ENHANCED
│ │ ├── tsconfig.json
│ │ └── README.md
│ │
│ ├── shell/ # Module federation shell ⚡ RENAMED (was host)
│ │ ├── src/
│ │ │ ├── bootstrap.tsx
│ │ │ └── remotes/
│ │ ├── project.json
│ │ ├── webpack.config.js
│ │ └── README.md
│ │
│ ├── feature-auth-remote/ # Auth micro-frontend ⚡ RENAMED (was remote)
│ │ ├── src/
│ │ │ ├── components/
│ │ │ └── index.tsx
│ │ ├── project.json
│ │ ├── webpack.config.js
│ │ └── README.md
│ │
│ ├── feature-dashboard-remote/ # Dashboard micro-frontend ✨ NEW
│ │ ├── src/
│ │ ├── project.json
│ │ └── README.md
│ │
│ ├── e2e/ # End-to-end tests ✨ NEW
│ │ ├── web/
│ │ │ ├── home.spec.ts
│ │ │ ├── login.spec.ts
│ │ │ ├── gameplay.spec.ts
│ │ │ └── admin.spec.ts
│ │ ├── api/
│ │ │ ├── health.spec.ts
│ │ │ ├── auth.spec.ts
│ │ │ └── game-actions.spec.ts
│ │ ├── fixtures/
│ │ ├── playwright.config.ts
│ │ ├── project.json
│ │ └── README.md
│ │
│ ├── load-test/ # Performance testing ✨ NEW
│ │ ├── scenarios/
│ │ │ ├── api-load.js
│ │ │ ├── game-simulation.js
│ │ │ ├── websocket-stress.js
│ │ │ └── concurrent-users.js
│ │ ├── k6.config.js
│ │ ├── artillery.yml
│ │ ├── project.json
│ │ └── README.md
│ │
│ ├── data/ # Data processing and ETL service
│ │ ├── src/
│ │ │ ├── pipelines/
│ │ │ │ ├── user-data-pipeline.ts
│ │ │ │ ├── analytics-pipeline.ts
│ │ │ │ └── game-state-sync.ts
│ │ │ ├── transformers/
│ │ │ │ ├── normalize-user-data.ts
│ │ │ │ ├── aggregate-metrics.ts
│ │ │ │ └── sanitize-inputs.ts
│ │ │ ├── connectors/
│ │ │ │ ├── database-connector.ts
│ │ │ │ ├── api-connector.ts
│ │ │ │ └── external-sources.ts
│ │ │ ├── jobs/
│ │ │ │ ├── scheduled-imports.ts
│ │ │ │ ├── data-cleanup.ts
│ │ │ │ └── export-reports.ts
│ │ │ └── server.ts
│ │ ├── tests/
│ │ │ ├── unit/
│ │ │ ├── integration/
│ │ │ └── fixtures/
│ │ ├── config/
│ │ │ ├── pipeline.config.json
│ │ │ └── sources.config.json
│ │ ├── project.json
│ │ ├── tsconfig.json
│ │ ├── .env.example
│ │ └── README.md
│ │
│ ├── dev/ # Development tools and experimental features
│ │ ├── src/
│ │ │ ├── experiments/
│ │ │ │ ├── feature-prototypes/
│ │ │ │ ├── ai-playground/
│ │ │ │ └── performance-tests/
│ │ │ ├── tools/
│ │ │ │ ├── data-generators/
│ │ │ │ ├── mock-servers/
│ │ │ │ └── test-harnesses/
│ │ │ ├── sandbox/
│ │ │ │ ├── component-demos/
│ │ │ │ ├── api-exploration/
│ │ │ │ └── integration-tests/
│ │ │ └── main.ts
│ │ ├── scripts/
│ │ │ ├── seed-dev-data.ts
│ │ │ ├── reset-environment.ts
│ │ │ └── benchmark-features.ts
│ │ ├── project.json
│ │ ├── tsconfig.json
│ │ └── README.md
│ │
│ ├── docs/ # Documentation site (Docusaurus/VitePress)
│ │ ├── docs/
│ │ │ ├── getting-started/
│ │ │ │ ├── introduction.md
│ │ │ │ ├── installation.md
│ │ │ │ └── quick-start.md
│ │ │ ├── guides/
│ │ │ │ ├── architecture.md
│ │ │ │ ├── development.md
│ │ │ │ ├── deployment.md
│ │ │ │ └── testing.md
│ │ │ ├── api/
│ │ │ │ ├── rest-api.md
│ │ │ │ ├── websocket-api.md
│ │ │ │ └── graphql-schema.md
│ │ │ ├── game/
│ │ │ │ ├── mechanics.md
│ │ │ │ ├── gameplay.md
│ │ │ │ └── rules.md
│ │ │ └── contributing/
│ │ │ ├── code-style.md
│ │ │ ├── pull-requests.md
│ │ │ └── security.md
│ │ ├── src/
│ │ │ ├── components/
│ │ │ ├── pages/
│ │ │ └── css/
│ │ ├── static/
│ │ │ ├── img/
│ │ │ └── files/
│ │ ├── docusaurus.config.js
│ │ ├── sidebars.js
│ │ ├── project.json
│ │ ├── package.json
│ │ └── README.md
│ │
│ ├── infrastructure/ # Infrastructure provisioning and management
│ │ ├── src/
│ │ │ ├── provisioning/
│ │ │ │ ├── aws-setup.ts
│ │ │ │ ├── kubernetes-bootstrap.ts
│ │ │ │ ├── database-init.ts
│ │ │ │ └── network-config.ts
│ │ │ ├── deployment/
│ │ │ │ ├── deploy-staging.ts
│ │ │ │ ├── deploy-production.ts
│ │ │ │ ├── rollback.ts
│ │ │ │ └── blue-green-switch.ts
│ │ │ ├── monitoring/
│ │ │ │ ├── setup-metrics.ts
│ │ │ │ ├── configure-alerts.ts
│ │ │ │ └── dashboard-builder.ts
│ │ │ ├── cli/
│ │ │ │ ├── commands/
│ │ │ │ ├── prompts/
│ │ │ │ └── index.ts
│ │ │ └── utils/
│ │ │ ├── aws-client.ts
│ │ │ ├── kubectl-wrapper.ts
│ │ │ └── terraform-runner.ts
│ │ ├── tests/
│ │ │ ├── unit/
│ │ │ └── integration/
│ │ ├── scripts/
│ │ │ ├── validate-config.sh
│ │ │ ├── smoke-tests.sh
│ │ │ └── disaster-recovery.sh
│ │ ├── project.json
│ │ ├── tsconfig.json
│ │ ├── .env.example
│ │ └── README.md
│ │
│ └── README.md
│
├── **data/** # Runtime data (databases, seeds, fixtures)
│ ├── **seeds/**
│ │ ├── **users.json**
│ │ ├── **parties.json**
│ │ └── **scenarios.json**
│ ├── **fixtures/**
│ │ ├── **test-users.json**
│ │ └── **test-scenarios.json**
│ ├── _ **.db** # SQLite databases (gitignored)
│ ├── _ **.db-shm** # SQLite shared memory (gitignored)
│ ├── **.db-wal** # SQLite write-ahead log (gitignored)
│ └── **README.md**
│
├── libs/ # Shared libraries
│ ├── shared/ # Common utilities
│ │ ├── src/
│ │ │ ├── utils/
│ │ │ ├── constants/
│ │ │ ├── types/
│ │ │ └── validators/
│ │ ├── tests/
│ │ ├── project.json # With tags ⚡ ENHANCED
│ │ ├── tsconfig.json
│ │ └── README.md
│ │
│ ├── ui/ # UI component library
│ │ ├── src/
│ │ │ ├── components/
│ │ │ ├── hooks/
│ │ │ ├── styles/
│ │ │ └── index.ts
│ │ ├── tests/
│ │ ├── storybook/
│ │ ├── project.json # With tags ⚡ ENHANCED
│ │ └── README.md
│ │
│ ├── platform/ # Platform services
│ │ ├── src/
│ │ │ ├── auth/
│ │ │ ├── storage/
│ │ │ └── config/
│ │ ├── tests/
│ │ ├── project.json # With tags ⚡ ENHANCED
│ │ └── README.md
│ │
│ ├── infrastructure/ # Infrastructure utilities
│ │ ├── src/
│ │ │ ├── database/
│ │ │ ├── cache/
│ │ │ └── messaging/
│ │ ├── project.json # With tags ⚡ ENHANCED
│ │ └── README.md
│ │
│ ├── game-engine/ # Game logic library
│ │ ├── src/
│ │ │ ├── core/
│ │ │ ├── mechanics/
│ │ │ ├── ai/
│ │ │ └── simulation/
│ │ ├── tests/
│ │ ├── project.json # With tags ⚡ ENHANCED
│ │ └── README.md
│ │
│ ├── testing/ # Shared test utilities
│ │ ├── src/
│ │ │ ├── fixtures/
│ │ │ │ ├── user-fixtures.ts
│ │ │ │ ├── game-state-fixtures.ts
│ │ │ │ ├── api-response-fixtures.ts
│ │ │ │ └── database-fixtures.ts
│ │ │ ├── mocks/
│ │ │ │ ├── api-mocks.ts
│ │ │ │ ├── service-mocks.ts
│ │ │ │ ├── websocket-mocks.ts
│ │ │ │ └── storage-mocks.ts
│ │ │ ├── helpers/
│ │ │ │ ├── test-environment.ts
│ │ │ │ ├── async-helpers.ts
│ │ │ │ ├── dom-helpers.ts
│ │ │ │ └── assertion-helpers.ts
│ │ │ ├── factories/
│ │ │ │ ├── user-factory.ts
│ │ │ │ ├── game-factory.ts
│ │ │ │ ├── event-factory.ts
│ │ │ │ └── entity-factory.ts
│ │ │ └── index.ts
│ │ ├── tests/
│ │ ├── project.json
│ │ ├── tsconfig.json
│ │ └── README.md
│ │
│ ├── observability/ # OpenTelemetry setup ✨ NEW
│ │ ├── src/
│ │ │ ├── tracing/
│ │ │ │ ├── tracer.ts
│ │ │ │ ├── span-processor.ts
│ │ │ │ ├── context-propagation.ts
│ │ │ │ └── instrumentation.ts
│ │ │ ├── metrics/
│ │ │ │ ├── meter.ts
│ │ │ │ ├── counters.ts
│ │ │ │ ├── gauges.ts
│ │ │ │ ├── histograms.ts
│ │ │ │ └── custom-metrics.ts
│ │ │ ├── logging/
│ │ │ │ ├── structured-logger.ts
│ │ │ │ ├── log-formatter.ts
│ │ │ │ ├── log-levels.ts
│ │ │ │ └── correlation.ts
│ │ │ ├── exporters/
│ │ │ │ ├── jaeger-exporter.ts
│ │ │ │ ├── prometheus-exporter.ts
│ │ │ │ ├── console-exporter.ts
│ │ │ │ └── otlp-exporter.ts
│ │ │ └── index.ts
│ │ ├── tests/
│ │ ├── project.json
│ │ ├── tsconfig.json
│ │ └── README.md
│ │
│ ├── feature-flags/ # Feature flag system ✨ NEW
│ │ ├── src/
│ │ │ ├── config/
│ │ │ │ ├── flag-definitions.ts
│ │ │ │ ├── environments.ts
│ │ │ │ └── default-flags.json
│ │ │ ├── providers/
│ │ │ │ ├── local-provider.ts
│ │ │ │ ├── remote-provider.ts
│ │ │ │ ├── launchdarkly-provider.ts
│ │ │ │ └── split-provider.ts
│ │ │ ├── hooks/
│ │ │ │ ├── use-feature-flag.ts
│ │ │ │ ├── use-flag-value.ts
│ │ │ │ └── use-variation.ts
│ │ │ ├── client/
│ │ │ │ ├── flag-client.ts
│ │ │ │ ├── cache.ts
│ │ │ │ └── evaluator.ts
│ │ │ └── index.ts
│ │ ├── tests/
│ │ ├── project.json
│ │ ├── tsconfig.json
│ │ └── README.md
│ │
│ ├── i18n/ # Internationalization ✨ NEW
│ │ ├── src/
│ │ │ ├── messages/
│ │ │ │ ├── en/
│ │ │ │ │ ├── common.json
│ │ │ │ │ ├── game.json
│ │ │ │ │ ├── auth.json
│ │ │ │ │ └── errors.json
│ │ │ │ ├── es/
│ │ │ │ │ ├── common.json
│ │ │ │ │ ├── game.json
│ │ │ │ │ ├── auth.json
│ │ │ │ │ └── errors.json
│ │ │ │ ├── fr/
│ │ │ │ │ ├── common.json
│ │ │ │ │ ├── game.json
│ │ │ │ │ ├── auth.json
│ │ │ │ │ └── errors.json
│ │ │ │ └── de/
│ │ │ │ ├── common.json
│ │ │ │ ├── game.json
│ │ │ │ ├── auth.json
│ │ │ │ └── errors.json
│ │ │ ├── locales/
│ │ │ │ ├── locale-config.ts
│ │ │ │ ├── date-formats.ts
│ │ │ │ ├── number-formats.ts
│ │ │ │ └── currency-formats.ts
│ │ │ ├── extraction/
│ │ │ │ ├── extract-messages.ts
│ │ │ │ ├── compile-messages.ts
│ │ │ │ └── validate-translations.ts
│ │ │ ├── hooks/
│ │ │ │ ├── use-translation.ts
│ │ │ │ ├── use-locale.ts
│ │ │ │ └── use-format.ts
│ │ │ └── index.ts
│ │ ├── tests/
│ │ ├── project.json
│ │ ├── tsconfig.json
│ │ └── README.md
│ │
│ ├── domain-governance/ # Governance domain ✨ NEW (vertical slice)
│ │ ├── src/
│ │ │ ├── entities/
│ │ │ │ ├── proposal.entity.ts
│ │ │ │ ├── vote.entity.ts
│ │ │ │ ├── committee.entity.ts
│ │ │ │ └── motion.entity.ts
│ │ │ ├── use-cases/
│ │ │ │ ├── create-proposal.use-case.ts
│ │ │ │ ├── cast-vote.use-case.ts
│ │ │ │ ├── tally-votes.use-case.ts
│ │ │ │ └── amend-proposal.use-case.ts
│ │ │ ├── repositories/
│ │ │ │ ├── proposal.repository.ts
│ │ │ │ ├── vote.repository.ts
│ │ │ │ └── committee.repository.ts
│ │ │ ├── value-objects/
│ │ │ │ ├── vote-count.vo.ts
│ │ │ │ ├── quorum.vo.ts
│ │ │ │ └── voting-period.vo.ts
│ │ │ └── index.ts
│ │ ├── tests/
│ │ │ ├── unit/
│ │ │ └── integration/
│ │ ├── project.json
│ │ ├── tsconfig.json
│ │ └── README.md
│ │
│ ├── domain-election/ # Election domain ✨ NEW (vertical slice)
│ │ ├── src/
│ │ │ ├── entities/
│ │ │ │ ├── election.entity.ts
│ │ │ │ ├── candidate.entity.ts
│ │ │ │ ├── ballot.entity.ts
│ │ │ │ └── constituency.entity.ts
│ │ │ ├── use-cases/
│ │ │ │ ├── create-election.use-case.ts
│ │ │ │ ├── register-candidate.use-case.ts
│ │ │ │ ├── cast-ballot.use-case.ts
│ │ │ │ ├── count-ballots.use-case.ts
│ │ │ │ └── certify-results.use-case.ts
│ │ │ ├── repositories/
│ │ │ │ ├── election.repository.ts
│ │ │ │ ├── candidate.repository.ts
│ │ │ │ └── ballot.repository.ts
│ │ │ ├── value-objects/
│ │ │ │ ├── electoral-system.vo.ts
│ │ │ │ ├── vote-share.vo.ts
│ │ │ │ └── term-length.vo.ts
│ │ │ └── index.ts
│ │ ├── tests/
│ │ │ ├── unit/
│ │ │ └── integration/
│ │ ├── project.json
│ │ ├── tsconfig.json
│ │ └── README.md
│ │
│ ├── domain-legislation/ # Legislation domain ✨ NEW (vertical slice)
│ │ ├── src/
│ │ │ ├── entities/
│ │ │ │ ├── bill.entity.ts
│ │ │ │ ├── law.entity.ts
│ │ │ │ ├── amendment.entity.ts
│ │ │ │ └── statute.entity.ts
│ │ │ ├── use-cases/
│ │ │ │ ├── draft-bill.use-case.ts
│ │ │ │ ├── propose-amendment.use-case.ts
│ │ │ │ ├── pass-legislation.use-case.ts
│ │ │ │ └── repeal-law.use-case.ts
│ │ │ ├── repositories/
│ │ │ │ ├── bill.repository.ts
│ │ │ │ ├── law.repository.ts
│ │ │ │ └── amendment.repository.ts
│ │ │ ├── value-objects/
│ │ │ │ ├── reading-stage.vo.ts
│ │ │ │ ├── legal-text.vo.ts
│ │ │ │ └── effective-date.vo.ts
│ │ │ └── index.ts
│ │ ├── tests/
│ │ │ ├── unit/
│ │ │ └── integration/
│ │ ├── project.json
│ │ ├── tsconfig.json
│ │ └── README.md
│ │ ├── tests/
│ │ ├── project.json
│ │ └── README.md
│ │
│ ├── data-user/ # User data layer ✨ NEW (vertical slice)
│ │ ├── src/
│ │ │ ├── repositories/
│ │ │ │ ├── user.repository.ts
│ │ │ │ ├── profile.repository.ts
│ │ │ │ ├── preferences.repository.ts
│ │ │ │ └── session.repository.ts
│ │ │ ├── models/
│ │ │ │ ├── user.model.ts
│ │ │ │ ├── profile.model.ts
│ │ │ │ ├── role.model.ts
│ │ │ │ └── permission.model.ts
│ │ │ ├── migrations/
│ │ │ │ ├── 001-create-users-table.ts
│ │ │ │ ├── 002-add-roles.ts
│ │ │ │ ├── 003-add-profiles.ts
│ │ │ │ └── index.ts
│ │ │ ├── queries/
│ │ │ │ ├── find-user-by-id.query.ts
│ │ │ │ ├── search-users.query.ts
│ │ │ │ └── get-user-stats.query.ts
│ │ │ └── index.ts
│ │ ├── tests/
│ │ │ ├── unit/
│ │ │ └── integration/
│ │ ├── project.json
│ │ ├── tsconfig.json
│ │ └── README.md
│ │
│ ├── data-game-state/ # Game state data ✨ NEW (vertical slice)
│ │ ├── src/
│ │ │ ├── repositories/
│ │ │ │ ├── game-state.repository.ts
│ │ │ │ ├── player-state.repository.ts
│ │ │ │ ├── world-state.repository.ts
│ │ │ │ └── event.repository.ts
│ │ │ ├── models/
│ │ │ │ ├── game-state.model.ts
│ │ │ │ ├── player-state.model.ts
│ │ │ │ ├── world-state.model.ts
│ │ │ │ └── snapshot.model.ts
│ │ │ ├── event-sourcing/
│ │ │ │ ├── event-store.ts
│ │ │ │ ├── event-handlers/
│ │ │ │ │ ├── player-action.handler.ts
│ │ │ │ │ ├── world-event.handler.ts
│ │ │ │ │ └── system-event.handler.ts
│ │ │ │ ├── projections/
│ │ │ │ │ ├── game-state.projection.ts
│ │ │ │ │ ├── player-stats.projection.ts
│ │ │ │ │ └── world-summary.projection.ts
│ │ │ │ ├── snapshots/
│ │ │ │ │ ├── snapshot-manager.ts
│ │ │ │ │ └── snapshot-strategy.ts
│ │ │ │ └── index.ts
│ │ │ ├── queries/
│ │ │ │ ├── get-game-state.query.ts
│ │ │ │ ├── replay-events.query.ts
│ │ │ │ └── aggregate-stats.query.ts
│ │ │ └── index.ts
│ │ ├── tests/
│ │ │ ├── unit/
│ │ │ └── integration/
│ │ ├── project.json
│ │ ├── tsconfig.json
│ │ └── README.md
│ │
│ └── README.md
│
├── docs/ # Documentation
│ ├── 00-foundation/
│ │ ├── business/
│ │ │ ├── business-model-overview.md
│ │ │ ├── market-brief.md
│ │ │ ├── revenue-streams.md
│ │ │ └── competitive-analysis.md
│ │ ├── product/
│ │ │ ├── product-principles.md
│ │ │ ├── personas-and-use-cases.md
│ │ │ ├── stakeholder-map.md
│ │ │ ├── user-journeys.md
│ │ │ └── value-proposition.md
│ │ ├── standards/
│ │ │ ├── standards-overview.md
│ │ │ ├── glossary-domain-concepts.md
│ │ │ ├── coding-standards.md
│ │ │ ├── accessibility-standards.md
│ │ │ └── security-standards.md
│ │ ├── vision-mission.md
│ │ ├── core-values-ethics.md
│ │ ├── success-metrics-north-star.md
│ │ └── README.md
│ │
│ ├── 01-strategy/
│ │ ├── roadmap/
│ │ │ ├── strategic-roadmap-03-12-36-months.md
│ │ │ ├── risked-assumptions-and-bets.md
│ │ │ ├── feature-prioritization.md
│ │ │ ├── technical-debt-strategy.md
│ │ │ └── innovation-backlog.md
│ │ ├── partnerships/
│ │ │ ├── partnerships-and-education-strategy.md
│ │ │ ├── internationalization-localization-strategy.md
│ │ │ ├── vendor-management.md
│ │ │ └── ecosystem-development.md
│ │ ├── market/
│ │ │ ├── go-to-market-strategy.md
│ │ │ ├── user-acquisition.md
│ │ │ └── growth-strategy.md
│ │ ├── product-strategy.md
│ │ ├── objectives-and-key-results-okrs.md
│ │ ├── ai-strategy-and-differentiation.md
│ │ └── README.md
│ │
│ ├── 02-governance/
│ │ ├── rfcs/
│ │ │ ├── template.md
│ │ │ ├── 001-feature-flags.md
│ │ │ └── index.md
│ │ ├── policies/
│ │ │ ├── code-review-policy.md
│ │ │ ├── change-management-policy.md
│ │ │ ├── incident-response-policy.md
│ │ │ └── data-governance-policy.md
│ │ ├── committees/
│ │ │ ├── technical-governance-committee.md
│ │ │ ├── security-council.md
│ │ │ └── architecture-review-board.md
│ │ ├── processes/
│ │ │ ├── decision-making-process.md
│ │ │ ├── escalation-procedures.md
│ │ │ └── approval-workflows.md
│ │ ├── governance-charter.md
│ │ ├── decision-rights-matrix.md
│ │ ├── roles-and-responsibilities-raci.md
│ │ └── README.md
│ │
│ ├── 03-legal-and-compliance/
│ │ ├── ai-compliance/
│ │ │ ├── ai-ethics-framework.md
│ │ │ ├── algorithmic-transparency.md
│ │ │ ├── bias-mitigation.md
│ │ │ └── ai-audit-requirements.md
│ │ ├── data-protection/
│ │ │ ├── gdpr-compliance.md
│ │ │ ├── ccpa-compliance.md
│ │ │ ├── privacy-by-design.md
│ │ │ ├── data-minimization.md
│ │ │ ├── consent-management.md
│ │ │ └── cross-border-transfers.md
│ │ ├── licensing-and-ip/
│ │ │ ├── open-source-licenses.md
│ │ │ ├── third-party-attributions.md
│ │ │ ├── patent-strategy.md
│ │ │ └── trademark-guidelines.md
│ │ ├── DPIAs/
│ │ │ ├── template.md
│ │ │ ├── user-profile-dpia.md
│ │ │ ├── ai-recommendation-dpia.md
│ │ │ └── index.md
│ │ ├── ROPAs/
│ │ │ ├── user-data-ropa.md
│ │ │ ├── analytics-ropa.md
│ │ │ └── index.md
│ │ ├── accessibility/
│ │ │ ├── wcag-compliance-report.md
│ │ │ ├── accessibility-statement.md
│ │ │ └── remediation-plan.md
│ │ ├── contracts/
│ │ │ ├── data-processing-agreement-template.md
│ │ │ ├── vendor-agreements.md
│ │ │ └── sla-templates.md
│ │ ├── compliance.md
│ │ ├── privacy-policy.md
│ │ ├── terms-of-service.md
│ │ ├── cookie-policy.md
│ │ ├── data-retention-maps.md
│ │ ├── regulatory-register.md
│ │ └── README.md
│ │
│ ├── 04-architecture/
│ │ ├── api-architecture/
│ │ │ ├── rest-api-design.md
│ │ │ ├── graphql-schema.md
│ │ │ ├── websocket-protocol.md
│ │ │ ├── api-versioning.md
│ │ │ ├── rate-limiting.md
│ │ │ └── authentication-flows.md
│ │ ├── data-architecture/
│ │ │ ├── database-schema.md
│ │ │ ├── data-models.md
│ │ │ ├── caching-strategy.md
│ │ │ ├── data-migration-strategy.md
│ │ │ └── event-sourcing.md
│ │ ├── decisions/
│ │ │ ├── template.md
│ │ │ ├── 001-monorepo-structure.md
│ │ │ ├── 002-module-federation.md
│ │ │ ├── 003-testing-strategy.md
│ │ │ └── index.md
│ │ ├── frontend-architecture/
│ │ │ ├── component-architecture.md
│ │ │ ├── state-management.md
│ │ │ ├── routing-strategy.md
│ │ │ └── module-federation.md
│ │ ├── backend-architecture/
│ │ │ ├── microservices-overview.md
│ │ │ ├── service-boundaries.md
│ │ │ ├── message-queues.md
│ │ │ └── background-jobs.md
│ │ ├── infrastructure-architecture/
│ │ │ ├── cloud-architecture.md
│ │ │ ├── networking.md
│ │ │ ├── containerization.md
│ │ │ └── orchestration.md
│ │ ├── integration-architecture/
│ │ │ ├── third-party-integrations.md
│ │ │ ├── webhook-handlers.md
│ │ │ └── external-apis.md
│ │ ├── architecture.md
│ │ ├── system-overview.md
│ │ ├── domain-driven-design-map.md
│ │ ├── c4-model-diagrams.md
│ │ └── README.md
│ │
│ ├── 05-engineering-and-devops/
│ │ ├── development/
│ │ │ ├── backend.md
│ │ │ ├── testing.md
│ │ │ ├── quality.md
│ │ │ ├── code-review-guidelines.md
│ │ │ ├── git-workflow.md
│ │ │ ├── branching-strategy.md
│ │ │ └── debugging-guide.md
│ │ ├── languages/
│ │ │ ├── typescript.md
│ │ │ ├── react.md
│ │ │ ├── node.md
│ │ │ └── sql.md
│ │ ├── ui/
│ │ │ ├── ux-accessibility.md
│ │ │ ├── design-system.md
│ │ │ ├── component-library.md
│ │ │ └── responsive-design.md
│ │ ├── ci-cd/
│ │ │ ├── pipeline-overview.md
│ │ │ ├── continuous-integration.md
│ │ │ ├── continuous-deployment.md
│ │ │ ├── release-management.md
│ │ │ ├── artifact-management.md
│ │ │ └── README.md
│ │ ├── infrastructure-as-code/
│ │ │ ├── terraform-standards.md
│ │ │ ├── kubernetes-patterns.md
│ │ │ ├── docker-best-practices.md
│ │ │ └── configuration-management.md
│ │ ├── testing/
│ │ │ ├── unit-testing.md
│ │ │ ├── integration-testing.md
│ │ │ ├── e2e-testing.md
│ │ │ ├── performance-testing.md
│ │ │ ├── security-testing.md
│ │ │ ├── accessibility-testing.md
│ │ │ └── test-data-management.md
│ │ ├── tools/
│ │ │ ├── nx-monorepo-guide.md
│ │ │ ├── vite-configuration.md
│ │ │ ├── vitest-setup.md
│ │ │ └── development-environment.md
│ │ ├── performance/
│ │ │ ├── optimization-strategies.md
│ │ │ ├── performance-budgets.md
│ │ │ ├── monitoring.md
│ │ │ └── profiling.md
│ │ ├── monorepo-standards-nx.md
│ │ ├── architectural-alignment-audit.md
│ │ └── README.md
│ │
│ ├── 06-security-and-risk/
│ │ ├── audits/
│ │ │ ├── END-TO-END-AUDIT-2025-10-29.md
│ │ │ ├── security-audit-template.md
│ │ │ ├── penetration-test-reports/
│ │ │ └── vulnerability-assessments/
│ │ ├── incident-response/
│ │ │ ├── incident-response-plan.md
│ │ │ ├── runbooks/
│ │ │ │ ├── data-breach-runbook.md
│ │ │ │ ├── ddos-runbook.md
│ │ │ │ └── unauthorized-access-runbook.md
│ │ │ ├── post-mortems/
│ │ │ └── escalation-matrix.md
│ │ ├── threat-modeling/
│ │ │ ├── threat-modeling-stride.md
│ │ │ ├── attack-trees.md
│ │ │ ├── threat-scenarios.md
│ │ │ └── mitigation-strategies.md
│ │ ├── security-controls/
│ │ │ ├── authentication.md
│ │ │ ├── authorization.md
│ │ │ ├── encryption.md
│ │ │ ├── secrets-management.md
│ │ │ ├── network-security.md
│ │ │ └── application-security.md
│ │ ├── compliance-frameworks/
│ │ │ ├── owasp-asvs.md
│ │ │ ├── nist-800-53.md
│ │ │ ├── iso-27001.md
│ │ │ └── soc2.md
│ │ ├── vulnerability-management/
│ │ │ ├── vulnerability-disclosure-policy.md
│ │ │ ├── patch-management.md
│ │ │ ├── dependency-scanning.md
│ │ │ └── remediation-tracking.md
│ │ ├── security.md
│ │ ├── risk-register.md
│ │ ├── security-policies.md
│ │ ├── acceptable-use-policy.md
│ │ └── README.md
│ │
│ ├── 07-ai-and-simulation/
│ │ ├── model-inventory-and-system-cards/
│ │ │ ├── recommendation-model-card.md
│ │ │ ├── content-moderation-model-card.md
│ │ │ ├── npc-behavior-model-card.md
│ │ │ └── index.md
│ │ ├── ai-governance/
│ │ │ ├── ai-governance.md
│ │ │ ├── ai-governance-framework.md
│ │ │ ├── ethical-guidelines.md
│ │ │ ├── bias-monitoring.md
│ │ │ └── human-oversight.md
│ │ ├── ai-development/
│ │ │ ├── model-training.md
│ │ │ ├── model-evaluation.md
│ │ │ ├── mlops-pipeline.md
│ │ │ ├── feature-engineering.md
│ │ │ └── model-versioning.md
│ │ ├── ai-deployment/
│ │ │ ├── model-serving.md
│ │ │ ├── a-b-testing.md
│ │ │ ├── canary-deployments.md
│ │ │ └── rollback-procedures.md
│ │ ├── simulation-engine/
│ │ │ ├── simulation-architecture.md
│ │ │ ├── agent-behaviors.md
│ │ │ ├── economic-modeling.md
│ │ │ └── political-dynamics.md
│ │ ├── responsible-ai/
│ │ │ ├── fairness-metrics.md
│ │ │ ├── transparency-requirements.md
│ │ │ ├── explainability.md
│ │ │ └── privacy-preserving-ml.md
│ │ ├── multi-agent-orchestration.md
│ │ ├── ai-testing-validation.md
│ │ └── README.md
│ │
│ ├── 08-game-design-and-mechanics/
│ │ ├── mechanics/
│ │ │ ├── economy-and-budgets.md
│ │ │ ├── elections-policy-and-mechanics.md
│ │ │ ├── lawmaking-and-procedure-engine.md
│ │ │ ├── media-press-and-public-opinion-system.md
│ │ │ ├── voting-systems.md
│ │ │ ├── coalition-building.md
│ │ │ ├── crisis-management.md
│ │ │ └── diplomacy-mechanics.md
│ │ ├── systems/
│ │ │ ├── ai-npc-behaviours-and-tuning.md
│ │ │ ├── parties-caucuses-and-factions.md
│ │ │ ├── roles-and-progressions.md
│ │ │ ├── world-and-institutions-blueprint.md
│ │ │ ├── reputation-system.md
│ │ │ ├── influence-mechanics.md
│ │ │ └── event-system.md
│ │ ├── balance/
│ │ │ ├── game-balance-philosophy.md
│ │ │ ├── power-scaling.md
│ │ │ ├── economic-balance.md
│ │ │ └── playtesting-feedback.md
│ │ ├── progression/
│ │ │ ├── player-progression.md
│ │ │ ├── skill-trees.md
│ │ │ ├── achievements.md
│ │ │ └── unlock-systems.md
│ │ ├── narrative/
│ │ │ ├── story-framework.md
│ │ │ ├── scenario-design.md
│ │ │ ├── character-development.md
│ │ │ └── world-lore.md
│ │ ├── multiplayer/
│ │ │ ├── matchmaking.md
│ │ │ ├── session-management.md
│ │ │ ├── player-interaction.md
│ │ │ └── anti-griefing.md
│ │ ├── game-design-document.md
│ │ └── README.md
│ │
│ ├── 09-observability-and-ops/
│ │ ├── monitoring/
│ │ │ ├── metrics-strategy.md
│ │ │ ├── dashboard-design.md
│ │ │ ├── alerting-rules.md
│ │ │ ├── slo-sli-definitions.md
│ │ │ └── service-health-checks.md
│ │ ├── logging/
│ │ │ ├── logging-strategy.md
│ │ │ ├── structured-logging.md
│ │ │ ├── log-aggregation.md
│ │ │ ├── log-retention.md
│ │ │ └── audit-logging.md
│ │ ├── tracing/
│ │ │ ├── distributed-tracing.md
│ │ │ ├── opentelemetry-setup.md
│ │ │ ├── trace-sampling.md
│ │ │ └── performance-analysis.md
│ │ ├── deployment/
│ │ │ ├── deployment-strategies.md
│ │ │ ├── blue-green-deployment.md
│ │ │ ├── canary-releases.md
│ │ │ ├── rollback-procedures.md
│ │ │ └── feature-flags.md
│ │ ├── disaster-recovery/
│ │ │ ├── backup-strategy.md
│ │ │ ├── recovery-procedures.md
│ │ │ ├── business-continuity-plan.md
│ │ │ └── failover-testing.md
│ │ ├── capacity-planning/
│ │ │ ├── resource-planning.md
│ │ │ ├── scaling-strategy.md
│ │ │ ├── cost-optimization.md
│ │ │ └── performance-forecasting.md
│ │ ├── sre/
│ │ │ ├── on-call-procedures.md
│ │ │ ├── incident-management.md
│ │ │ ├── post-mortem-template.md
│ │ │ └── error-budgets.md
│ │ ├── operations.md
│ │ ├── runbook-template.md
│ │ └── README.md
│ │
│ ├── 10-user-experience/
│ │ ├── research/
│ │ │ ├── user-research-findings.md
│ │ │ ├── usability-testing.md
│ │ │ ├── user-interviews.md
│ │ │ └── analytics-insights.md
│ │ ├── design/
│ │ │ ├── design-principles.md
│ │ │ ├── visual-language.md
│ │ │ ├── iconography.md
│ │ │ └── typography.md
│ │ ├── interaction/
│ │ │ ├── interaction-patterns.md
│ │ │ ├── micro-interactions.md
│ │ │ ├── animations.md
│ │ │ └── feedback-mechanisms.md
│ │ ├── accessibility/
│ │ │ ├── accessibility-guidelines.md
│ │ │ ├── screen-reader-support.md
│ │ │ ├── keyboard-navigation.md
│ │ │ └── color-contrast.md
│ │ └── README.md
│ │
│ ├── 11-communications-and-brand/
│ │ ├── brand/
│ │ │ ├── brand-guidelines.md
│ │ │ ├── voice-and-tone.md
│ │ │ ├── visual-identity.md
│ │ │ └── messaging-framework.md
│ │ ├── content/
│ │ │ ├── content-strategy.md
│ │ │ ├── writing-guidelines.md
│ │ │ ├── localization.md
│ │ │ └── seo-strategy.md
│ │ ├── community/
│ │ │ ├── community-management.md
│ │ │ ├── moderation-guidelines.md
│ │ │ ├── user-engagement.md
│ │ │ └── social-media-strategy.md
│ │ ├── marketing/
│ │ │ ├── marketing-strategy.md
│ │ │ ├── campaign-planning.md
│ │ │ ├── user-acquisition.md
│ │ │ └── analytics-tracking.md
│ │ └── README.md
│ │
│ ├── archive/
│ │ ├── deprecated/
│ │ ├── legacy-designs/
│ │ └── historical-decisions/
│ │
│ ├── templates/
│ │ ├── adr-template.md
│ │ ├── rfc-template.md
│ │ ├── dpia-template.md
│ │ ├── ropa-template.md
│ │ ├── runbook-template.md
│ │ ├── post-mortem-template.md
│ │ └── README.md
│ │
│ ├── quick-ref.md
│ ├── TODO.md
│ ├── STRUCTURE.md
│ └── README.md
│
├── config/
│ ├── env/
│ │ ├── .env.example
│ │ ├── .env.api.example
│ │ ├── .env.web.example
│ │ ├── .env.game-server.example
│ │ ├── .env.worker.example
│ │ └── .schema.env
│ │
│ ├── typescript/
│ │ ├── tsconfig.base.json
│ │ ├── tsconfig.app.json
│ │ ├── tsconfig.lib.json
│ │ └── tsconfig.spec.json
│ │
│ ├── eslint/
│ │ ├── .eslintrc.base.json
│ │ ├── .eslintrc.apps.json
│ │ ├── .eslintrc.libs.json
│ │ └── .eslintrc.tests.json
│ │
│ ├── vitest/
│ │ ├── vitest.config.base.js
│ │ ├── vitest.config.unit.js
│ │ ├── vitest.config.integration.js
│ │ └── vitest.config.e2e.js
│ │
│ ├── docker/
│ │ ├── docker-compose.dev.yml
│ │ ├── docker-compose.test.yml
│ │ ├── docker-compose.prod.yml
│ │ └── Dockerfile.base
│ │
│ └── README.md
│
├── infrastructure/
│ ├── terraform/
│ │ ├── environments/
│ │ │ ├── dev/
│ │ │ │ ├── main.tf
│ │ │ │ ├── variables.tf
│ │ │ │ └── outputs.tf
│ │ │ ├── staging/
│ │ │ │ ├── main.tf
│ │ │ │ ├── variables.tf
│ │ │ │ └── outputs.tf
│ │ │ └── production/
│ │ │ ├── main.tf
│ │ │ ├── variables.tf
│ │ │ └── outputs.tf
│ │ └── modules/
│ │ ├── networking/
│ │ ├── compute/
│ │ ├── database/
│ │ └── storage/
│ │
│ ├── kubernetes/
│ │ ├── base/
│ │ │ ├── deployments/
│ │ │ ├── services/
│ │ │ ├── configmaps/
│ │ │ ├── secrets/
│ │ │ ├── ingress/
│ │ │ ├── sidecars/
│ │ │ │ ├── otel-collector.yaml
│ │ │ │ └── log-forwarder.yaml
│ │ │ └── kustomization.yaml
│ │ └── overlays/
│ │ ├── dev/
│ │ │ └── kustomization.yaml
│ │ ├── staging/
│ │ │ └── kustomization.yaml
│ │ └── production/
│ │ └── kustomization.yaml
│ │
│ ├── docker/
│ │ └── images/
│ │ ├── api/
│ │ │ └── Dockerfile
│ │ ├── web/
│ │ │ └── Dockerfile
│ │ ├── game-server/
│ │ │ └── Dockerfile
│ │ └── worker/
│ │ └── Dockerfile
│ │
│ ├── vault/
│ │ ├── policies/
│ │ │ ├── api-policy.hcl
│ │ │ ├── web-policy.hcl
│ │ │ └── admin-policy.hcl
│ │ └── secrets/
│ │ └── .gitkeep
│ │
│ ├── ansible/
│ │ ├── playbooks/
│ │ ├── roles/
│ │ └── inventory/
│ │
│ └── README.md
│
├── scripts/
│ ├── ci/
│ │ ├── check-file-placement.mjs
│ │ ├── enforce-naming.mjs
│ │ ├── verify-github-config.mjs
│ │ ├── guard-change-budget.mjs
│ │ ├── generate-sbom.mjs
│ │ ├── run-security-scans.sh
│ │ └── build-attestation.sh
│ │
│ ├── db/
│ │ ├── migrate.js
│ │ ├── seed.js
│ │ ├── rollback.js
│ │ ├── backup.sh
│ │ └── restore.sh
│ │
│ ├── dev/
│ │ ├── setup-dev-environment.sh
│ │ ├── cleanup-processes.sh
│ │ ├── perf-monitor.sh
│ │ ├── reset-local-db.sh
│ │ └── generate-test-data.js
│ │
│ ├── testing/
│ │ ├── run-vitest-coverage.js
│ │ ├── test-per-app.js
│ │ ├── run-e2e-tests.sh
│ │ └── generate-test-report.js
│ │
│ ├── chaos/
│ │ ├── network-latency.sh
│ │ ├── pod-failure.sh
│ │ ├── cpu-stress.sh
│ │ └── memory-leak.sh
│ │
│ ├── deployment/
│ │ ├── deploy-staging.sh
│ │ ├── deploy-production.sh
│ │ ├── smoke-tests.sh
│ │ └── rollback.sh
│ │
│ └── README.md
│
├── .ai/
│ ├── cache/
│ │ ├── context-cache.json
│ │ ├── response-cache.json
│ │ └── workspace-state.json
│ │
│ ├── index/
│ │ ├── codebase-index.json
│ │ └── semantic-vectors.json
│ │
│ ├── knowledge/
│ │ ├── architecture-overview.md
│ │ ├── code-patterns.md
│ │ ├── expert-knowledge.json
│ │ └── troubleshooting-guide.md
│ │
│ ├── metrics/
│ │ ├── ai-metrics.json
│ │ ├── agent-performance.json
│ │ └── quality-scores.json
│ │
│ ├── context-bundles/
│ │ ├── core.md
│ │ ├── api-service.md
│ │ ├── frontend-service.md
│ │ └── project-structure.md
│ │
│ ├── prompts/
│ │ ├── code-review.md
│ │ ├── refactoring.md
│ │ ├── testing.md
│ │ └── documentation.md
│ │
│ ├── patterns/
│ │ ├── component-patterns.md
│ │ ├── api-patterns.md
│ │ └── testing-patterns.md
│ │
│ ├── history/
│ │ ├── interactions/
│ │ └── decisions/
│ │
│ ├── policies/
│ │ ├── prompt-red-team-suites/
│ │ │ ├── injection-tests.md
│ │ │ ├── bias-tests.md
│ │ │ └── safety-tests.md
│ │ └── safety-guidelines.md
│ │
│ ├── evals/
│ │ ├── regression-tests/
│ │ │ ├── code-quality.test.js
│ │ │ ├── documentation.test.js
│ │ │ └── refactoring.test.js
│ │ └── benchmarks/
│ │ ├── accuracy-benchmarks.json
│ │ └── performance-benchmarks.json
│ │
│ ├── tools/
│ │ ├── ai-assistant.cjs
│ │ ├── semantic-indexer.cjs
│ │ ├── build-context.sh
│ │ ├── refresh-knowledge.sh
│ │ └── README.md
│ │
│ ├── ai-controls.json
│ └── README.md
│
├── tools/
│ ├── generators/
│ │ ├── app-generator/
│ │ ├── lib-generator/
│ │ └── component-generator/
│ │
│ ├── executors/
│ │ ├── deploy-executor/
│ │ └── e2e-executor/
│ │
│ ├── demo/
│ │ └── sample-data/
│ │
│ └── README.md
│
├── assets/
│ ├── images/
│ │ ├── ui/
│ │ ├── game/
│ │ └── marketing/
│ │
│ ├── audio/
│ │ ├── sfx/
│ │ └── music/
│ │
│ ├── fonts/
│ │
│ ├── config/
│ │ ├── game-config.json
│ │ └── feature-flags.json
│ │
│ ├── manifest.json
│ └── README.md
│
├── .temp/
│ ├── test-output/
│ ├── debug-logs/
│ └── .gitkeep
│
├── reports/
│ ├── coverage/
│ ├── test-results/
│ ├── security/
│ ├── sbom/
│ │ └── sbom.json
│ ├── ai/
│ │ └── agent-performance.json
│ └── .gitkeep
│
├── .editorconfig
├── .gitignore
├── .gitattributes
├── .lefthook.yml
├── .npmrc
├── .prettierrc
├── .prettierignore
├── Makefile
├── nx.json
├── package.json
├── package-lock.json
├── tsconfig.json
├── vitest.config.js
│
├── README.md
├── CHANGELOG.md
├── LICENSE
├── CODE_OF_CONDUCT.md
└── CONTRIBUTING.md
