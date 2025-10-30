/**
 * API Server Entry Point
 * 
 * Initializes OpenTelemetry for distributed tracing and starts the API server.
 * This file must be the first import to ensure telemetry captures all operations.
 */

// Initialize OpenTelemetry FIRST - before any other imports
import { startTelemetry } from '@political-sphere/shared';

// Start telemetry before importing any application code
await startTelemetry({
  serviceName: 'political-sphere-api',
  serviceVersion: process.env.APP_VERSION || '0.0.0',
  environment: process.env.NODE_ENV || 'development',
});

// Now import application code
import { JsonNewsStore } from './newsStore.js';
import { NewsService } from './news-service.js';
import { createNewsServer, startServer } from './server.js';

const PORT = Number.parseInt(process.env.API_PORT ?? '4000', 10);
const HOST = process.env.API_HOST ?? '0.0.0.0';

const store = new JsonNewsStore(new URL('../data/news.json', import.meta.url));
const service = new NewsService(store);
const server = createNewsServer(service);

startServer(server, PORT, HOST);
