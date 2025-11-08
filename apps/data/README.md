# Data Processing Service

A comprehensive data processing and ETL (Extract, Transform, Load) service for Political Sphere. This service handles data pipelines, transformations, connectors to external sources, and scheduled data jobs.

## Features

- **Data Pipelines**: User data, analytics, and game state synchronization
- **Transformers**: Data normalization, metric aggregation, and input sanitization
- **Connectors**: Database, API, and external data source integrations
- **Scheduled Jobs**: Automated imports, cleanup, and report generation

## Architecture

```
src/
├── pipelines/          # Data processing pipelines
│   ├── user-data-pipeline.ts
│   ├── analytics-pipeline.ts
│   └── game-state-sync.ts
├── transformers/       # Data transformation utilities
│   ├── normalize-user-data.ts
│   ├── aggregate-metrics.ts
│   └── sanitize-inputs.ts
├── connectors/         # External system connectors
│   ├── database-connector.ts
│   ├── api-connector.ts
│   └── external-sources.ts
├── jobs/              # Scheduled background jobs
│   ├── scheduled-imports.ts
│   ├── data-cleanup.ts
│   └── export-reports.ts
├── types/             # TypeScript type definitions
│   └── pipeline.ts
└── server.ts          # Main server entry point
```

## Installation

```bash
# Install dependencies (from repository root)
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
vim .env
```

## Configuration

Configure the service via environment variables in `.env`:

### Database
- `DB_HOST`: Database hostname (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name (default: political_sphere)
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password

### API
- `API_BASE_URL`: Base URL for internal API
- `API_TIMEOUT`: Request timeout in milliseconds
- `API_RETRIES`: Number of retry attempts

### Jobs
- `CLEANUP_RETENTION_DAYS`: Days to retain data before cleanup
- `CLEANUP_ARCHIVE_ENABLED`: Enable archiving before deletion
- `CLEANUP_ARCHIVE_DESTINATION`: S3 or file path for archives

## Usage

### Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Run Pipelines

```typescript
import { UserDataPipeline } from './pipelines/user-data-pipeline.js';

const pipeline = new UserDataPipeline({
  name: 'user-data',
  batchSize: 100,
});

await pipeline.execute(userData);
```

### Transform Data

```typescript
import { NormalizeUserDataTransformer } from './transformers/normalize-user-data.js';

const transformer = new NormalizeUserDataTransformer();
const normalized = transformer.transform(rawUserData);
```

### Schedule Jobs

```typescript
import { ScheduledImportsJob } from './jobs/scheduled-imports.js';

const importsJob = new ScheduledImportsJob(externalSources, database);

importsJob.registerJob({
  name: 'daily-import',
  source: 'uk-parliament-api',
  schedule: '0 0 * * *', // Daily at midnight
  enabled: true,
});

importsJob.startAll();
```

## Development

### Run Tests

```bash
npm test
```

### Lint and Format

```bash
npm run lint
npm run format
```

### Type Check

```bash
npm run type-check
```

## Pipelines

### User Data Pipeline
Processes user data through validation, normalization, and enrichment stages.

### Analytics Pipeline
Aggregates event data and calculates metrics for reporting and monitoring.

### Game State Sync Pipeline
Synchronizes game state across distributed systems with conflict resolution.

## Transformers

### Normalize User Data
Standardizes user data to a consistent format across different input sources.

### Aggregate Metrics
Calculates summary statistics and time-series data from raw metrics.

### Sanitize Inputs
Prevents XSS, SQL injection, and other security vulnerabilities.

## Connectors

### Database Connector
Manages database connections with pooling, transactions, and query execution.

### API Connector
HTTP client with retry logic, authentication, and error handling.

### External Sources Connector
Integrates with third-party APIs, webhooks, and data feeds.

## Jobs

### Scheduled Imports
Runs periodic data imports from external sources on configurable schedules.

### Data Cleanup
Removes old records, archives data, and optimizes database tables.

### Export Reports
Generates reports in various formats (CSV, JSON, XLSX, PDF) and delivers via email or S3.

## Security

- All database queries use parameterized statements
- Input sanitization applied to all user data
- API connections use TLS/SSL
- Secrets managed via environment variables
- Rate limiting on external API calls

## Monitoring

The service provides health check endpoints and structured logging:

```typescript
const health = await server.healthCheck();
// {
//   status: 'healthy',
//   database: true,
//   api: true
// }
```

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

See [LICENSE](../../LICENSE) for details.
