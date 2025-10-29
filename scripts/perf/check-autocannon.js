#!/usr/bin/env node
// Read artifacts/autocannon.json and fail if thresholds are not met.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const REPORT_FILE = path.join(ROOT, 'artifacts', 'autocannon.json');

if (!fs.existsSync(REPORT_FILE)) {
  console.error('Autocannon report not found:', REPORT_FILE);
  process.exit(2);
}

const raw = fs.readFileSync(REPORT_FILE, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('Failed to parse autocannon output:', e.message);
  process.exit(2);
}

// Default thresholds (can be overridden via env vars)
const THROUGHPUT_MIN = Number(process.env.PERF_THROUGHPUT_MIN || 50); // requests/sec
const P95_MAX_MS = Number(process.env.PERF_P95_MAX_MS || 300); // ms

// Autocannon JSON structure: { requests: { average, mean, ... }, latency: { p50, p75, p90, p95, p99 }, ... }
const requests = data.requests || {};
const latency = data.latency || {};

const requestsPerSec =
  requests.mean || requests.average || data.throughput || 0;
const p95 = latency.p95 || latency['95'] || 0;

console.log(`Perf summary: req/s ≈ ${requestsPerSec}, p95 ≈ ${p95} ms`);
console.log(`Thresholds: req/s >= ${THROUGHPUT_MIN}, p95 <= ${P95_MAX_MS} ms`);

let failed = false;
const messages = [];
if (requestsPerSec < THROUGHPUT_MIN) {
  failed = true;
  messages.push(
    `Throughput too low: ${requestsPerSec} req/s < ${THROUGHPUT_MIN} req/s`
  );
}
if (p95 > P95_MAX_MS) {
  failed = true;
  messages.push(`High latency: p95 ${p95} ms > ${P95_MAX_MS} ms`);
}

if (failed) {
  console.error('Performance smoke gate FAILED:\n' + messages.join('\n'));
  process.exit(3);
}

console.log('Performance smoke gate PASSED');
process.exit(0);
