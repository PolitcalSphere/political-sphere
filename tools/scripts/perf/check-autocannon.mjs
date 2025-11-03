#!/usr/bin/env node
import fs from 'fs';
const reportPath = process.argv[2] || 'artifacts/autocannon.json';
if (!fs.existsSync(reportPath)) {
  console.error('Autocannon report not found:', reportPath);
  process.exit(2);
}
const raw = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Autocannon JSON structure: { requests: { average }, latency: { p99 }, ... }
const rps = raw?.requests?.average ?? raw?.requests?.mean ?? null;
const p99 = raw?.latency?.p99 ?? raw?.latency?.p95 ?? null;

const MIN_RPS = Number(process.env.MIN_RPS || 50);
const MAX_P99 = Number(process.env.MAX_P99 || 500);

console.log(
  `Autocannon summary: rps=${rps} p99=${p99} (thresholds: min_rps=${MIN_RPS}, max_p99=${MAX_P99})`
);

let failed = false;
if (rps === null) {
  console.error('Could not determine requests/sec from report');
  failed = true;
}
if (p99 === null) {
  console.error('Could not determine latency p99 from report');
  failed = true;
}
if (rps !== null && rps < MIN_RPS) {
  console.error(`RPS below threshold: ${rps} < ${MIN_RPS}`);
  failed = true;
}
if (p99 !== null && p99 > MAX_P99) {
  console.error(`p99 latency above threshold: ${p99} > ${MAX_P99}`);
  failed = true;
}

if (failed) {
  console.error('Performance gate failed');
  process.exit(2);
}

console.log('Performance gate passed');
process.exit(0);
