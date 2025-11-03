#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const REPORT = path.join(ROOT, 'artifacts', 'autocannon.json');
const SUMMARY = path.join(ROOT, 'artifacts', 'perf-summary.txt');

const MAX_P95_MS = Number(process.env.MAX_P95_MS || 500);
const MIN_RPS = Number(process.env.MIN_RPS || 50);

if (!fs.existsSync(REPORT)) {
  console.error('Autocannon report not found at', REPORT);
  process.exit(3);
}

const raw = fs.readFileSync(REPORT, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('Invalid JSON');
  process.exit(3);
}

// Try to extract p95 latency in ms
let p95 = null;
if (data && data.latency) {
  p95 = data.latency.p95 || data.latency.p95ms || data.latency['p95'] || null;
}

// Try to extract requests/sec
let rps = null;
if (data && data.requests) {
  rps =
    data.requests.mean ||
    data.requests.average ||
    data.requests.averageRequests ||
    data.requests['average'] ||
    null;
}
// fallback: compute from total and duration
if ((!rps || rps === 0) && data && data.requests && data.duration) {
  const total = data.requests.total || data.requests.requests || data.requests.responses || 0;
  const dur = data.duration > 1000 ? data.duration / 1000 : data.duration; // if ms convert
  if (total && dur) rps = total / dur;
}

// Another fallback: throughput field
if ((!rps || rps === 0) && data && data.throughput) {
  rps = data.throughput || null;
}

// Normalise values
if (p95 !== null) p95 = Number(p95);
if (rps !== null) rps = Number(rps);

const lines = [];
lines.push(`p95_ms: ${p95 === null ? 'N/A' : p95}`);
lines.push(`requests_per_sec: ${rps === null ? 'N/A' : rps}`);
lines.push(`thresholds: max_p95_ms=${MAX_P95_MS}, min_rps=${MIN_RPS}`);

let failed = false;
if (p95 !== null && p95 > MAX_P95_MS) {
  lines.push(`FAIL: p95 ${p95}ms > ${MAX_P95_MS}ms`);
  failed = true;
}
if (rps !== null && rps < MIN_RPS) {
  lines.push(`FAIL: rps ${rps} < ${MIN_RPS}`);
  failed = true;
}
if (p95 === null) lines.push('WARN: p95 not available from report');
if (rps === null) lines.push('WARN: rps not available from report');

fs.writeFileSync(SUMMARY, lines.join('\n'));
console.log(lines.join('\n'));

process.exit(failed ? 2 : 0);
