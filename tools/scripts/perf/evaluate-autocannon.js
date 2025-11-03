#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const [, , jsonPath = 'artifacts/autocannon.json', outPath = 'artifacts/autocannon-summary.txt'] =
  process.argv;
if (!fs.existsSync(jsonPath)) {
  console.error('autocannon JSON not found at', jsonPath);
  process.exit(2);
}

const raw = fs.readFileSync(jsonPath, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('Failed to parse autocannon JSON:', e.message);
  process.exit(2);
}

// Defaults: p95 latency threshold 500ms, requests/sec >= 50
const P95_THRESHOLD_MS = process.env.P95_THRESHOLD_MS ? Number(process.env.P95_THRESHOLD_MS) : 500;
const REQ_PER_SEC_MIN = process.env.REQ_PER_SEC_MIN ? Number(process.env.REQ_PER_SEC_MIN) : 50;

const out = [];
out.push('Autocannon summary');
out.push('==================');
if (data && data.requests) {
  out.push(`Requests: total=${data.requests.total} mean/sec=${data.requests.mean}`);
}
if (data && data.latency) {
  out.push(
    `Latency (ms): mean=${data.latency.mean} p50=${data.latency.p50} p95=${data.latency.p95} p99=${data.latency.p99}`
  );
}

let pass = true;
const p95 = data && data.latency && data.latency.p95 ? Number(data.latency.p95) : Infinity;
const rps = data && data.requests && data.requests.mean ? Number(data.requests.mean) : 0;

out.push(`Thresholds: p95 < ${P95_THRESHOLD_MS} ms, req/sec >= ${REQ_PER_SEC_MIN}`);
out.push(`Observed: p95=${p95} ms, req/sec=${rps}`);

if (p95 > P95_THRESHOLD_MS) {
  out.push('RESULT: p95 latency above threshold');
  pass = false;
}
if (rps < REQ_PER_SEC_MIN) {
  out.push('RESULT: requests/sec below threshold');
  pass = false;
}

fs.writeFileSync(outPath, out.join('\n'));
console.log(fs.readFileSync(outPath, 'utf8'));
process.exit(pass ? 0 : 2);
