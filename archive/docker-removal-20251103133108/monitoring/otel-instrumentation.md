# OpenTelemetry instrumentation — Node.js (example)

This is a minimal example to instrument a Node.js API with OpenTelemetry, export traces to Jaeger and metrics to Prometheus.

Install (dev):

```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-jaeger @opentelemetry/exporter-prometheus
```

Basic bootstrap (server start):

```js
// otel.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');

const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger-collector:14268/api/traces',
});

const promExporter = new PrometheusExporter({ startServer: true }, () => {
  console.log('Prometheus scrape endpoint running');
});

const sdk = new NodeSDK({
  traceExporter: jaegerExporter,
  metricExporter: promExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// require this file as early as possible in your app (e.g., node -r ./otel.js app.js)
```

Notes:

- For Kubernetes, point Jaeger exporter to the Jaeger collector service (e.g., `http://jaeger-collector:14268/api/traces`).
- Prometheus exporter exposes a scrape endpoint by default (port 9464). Add a ServiceMonitor for Prometheus to scrape it.

\*\*\* End of file
