#!/usr/bin/env tsx

// Audit Replay Harness
// Reproduce audit runs from ledger for debugging/verification

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface AuditRun {
  timestamp: string;
  mode: string;
  network: string;
  agent_loop_safe: boolean;
  results: any[];
}

function replayAudit(runId: string) {
  const ledgerPath = join(process.cwd(), 'ai-history', 'ledger.ndjson');

  if (!existsSync(ledgerPath)) {
    console.error('Ledger not found:', ledgerPath);
    process.exit(1);
  }

  const lines = readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean);
  const runs: AuditRun[] = lines.map((line) => JSON.parse(line));

  const run = runs.find((r) => r.timestamp.includes(runId) || r.timestamp === runId);

  if (!run) {
    console.error('Run not found:', runId);
    console.log(
      'Available runs:',
      runs.map((r) => r.timestamp)
    );
    process.exit(1);
  }

  console.log('Replaying audit run:', run.timestamp);
  console.log('Mode:', run.mode);
  console.log('Results:', run.results.length);

  // Re-execute checks based on stored results
  // Implementation would re-run the checks and compare
}

if (require.main === module) {
  const runId = process.argv[2];
  if (!runId) {
    console.error('Usage: tsx scripts/audit/replay.ts <run-timestamp>');
    process.exit(1);
  }
  replayAudit(runId);
}
