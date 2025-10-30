/**
 * OpenTelemetry Configuration for Political Sphere
 * 
 * This module configures distributed tracing, metrics, and logging
 * using OpenTelemetry for comprehensive observability.
 * 
 * @module telemetry
 * @requires @opentelemetry/sdk-node
 * @requires @opentelemetry/auto-instrumentations-node
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

/**
 * OpenTelemetry Configuration Options
 */
export interface TelemetryConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  traceEndpoint?: string;
  metricsEndpoint?: string;
  enableAutoInstrumentation?: boolean;
}

/**
 * Initialize OpenTelemetry SDK with comprehensive instrumentation
 * 
 * @param config - Telemetry configuration options
 * @returns Initialized NodeSDK instance
 * 
 * @example
 * ```typescript
 * import { initTelemetry } from '@political-sphere/shared';
 * 
 * const sdk = initTelemetry({
 *   serviceName: 'api',
 *   environment: 'production'
 * });
 * ```
 */
export function initTelemetry(config: TelemetryConfig): NodeSDK {
  const {
    serviceName,
    serviceVersion = '0.0.0',
    environment = process.env['NODE_ENV'] || 'development',
    traceEndpoint = process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] || 'http://localhost:4318/v1/traces',
    metricsEndpoint = process.env['OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'] || 'http://localhost:4318/v1/metrics',
    enableAutoInstrumentation = true,
  } = config;

  // Define service resource attributes
  const resource = resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
  });

  // Configure trace exporter (sends to Jaeger/other OTLP-compatible backend)
  const traceExporter = new OTLPTraceExporter({
    url: traceEndpoint,
    headers: {},
  });

  // Configure metrics exporter (sends to Prometheus/other OTLP-compatible backend)
  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: metricsEndpoint,
      headers: {},
    }),
    exportIntervalMillis: 60000, // Export metrics every 60 seconds
  });

  // Configure auto-instrumentation for common libraries
  const instrumentations = enableAutoInstrumentation
    ? getNodeAutoInstrumentations({
        // Instrument HTTP requests
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          ignoreIncomingRequestHook: (request) => {
            // Don't trace health check endpoints to reduce noise
            const url = request.url || '';
            return url.includes('/healthz') || url.includes('/readyz');
          },
        },
        // Instrument Express.js
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        // Instrument database queries
        '@opentelemetry/instrumentation-pg': {
          enabled: true,
          enhancedDatabaseReporting: true,
        },
        '@opentelemetry/instrumentation-mongodb': {
          enabled: true,
          enhancedDatabaseReporting: true,
        },
        // Instrument Redis
        '@opentelemetry/instrumentation-redis': {
          enabled: true,
        },
        // Instrument DNS lookups
        '@opentelemetry/instrumentation-dns': {
          enabled: true,
        },
        // Instrument file system operations (use carefully in production)
        '@opentelemetry/instrumentation-fs': {
          enabled: environment === 'development',
        },
      })
    : [];

  // Initialize OpenTelemetry SDK
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations,
  });

  // Graceful shutdown on process termination
  process.on('SIGTERM', async () => {
    try {
      await sdk.shutdown();
      // Use structured logger instead of console.log
      const { getLogger } = await import('./logger.js');
      const logger = getLogger({ service: 'telemetry' });
      logger.info('OpenTelemetry SDK shut down successfully');
    } catch (error) {
      // Use structured logger instead of console.error
      const { getLogger } = await import('./logger.js');
      const logger = getLogger({ service: 'telemetry' });
      logger.error('Error shutting down OpenTelemetry SDK', { error: error?.message ?? error });
    }
  });

  return sdk;
}

/**
 * Start OpenTelemetry SDK and begin collecting telemetry
 * 
 * @param config - Telemetry configuration options
 * @returns Promise that resolves when SDK is started
 * 
 * @example
 * ```typescript
 * import { startTelemetry } from '@political-sphere/shared';
 * 
 * await startTelemetry({
 *   serviceName: 'worker',
 *   environment: 'staging'
 * });
 * ```
 */
export async function startTelemetry(config: TelemetryConfig): Promise<void> {
  const sdk = initTelemetry(config);
  
  try {
    await sdk.start();
    // Use structured logger instead of console.log
    const { getLogger } = await import('./logger.js');
    const logger = getLogger({ service: config.serviceName });
    logger.info('OpenTelemetry initialized', { serviceName: config.serviceName, environment: config.environment });
  } catch (error) {
    // Use structured logger instead of console.error
    const { getLogger } = await import('./logger.js');
    const logger = getLogger({ service: config.serviceName });
    logger.error('Failed to initialize OpenTelemetry', { error: error?.message ?? error });
    throw error;
  }
}

/**
 * Get the OpenTelemetry API for manual instrumentation
 * 
 * @example
 * ```typescript
 * import { trace } from '@opentelemetry/api';
 * 
 * const tracer = trace.getTracer('my-service');
 * const span = tracer.startSpan('operation-name');
 * try {
 *   // Your code here
 * } finally {
 *   span.end();
 * }
 * ```
 */
export { trace, context, SpanStatusCode } from '@opentelemetry/api';
