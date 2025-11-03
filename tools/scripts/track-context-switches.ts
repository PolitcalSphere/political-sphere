#!/usr/bin/env tsx
/*
  Track context switches in development workflow
  Usage: tsx scripts/track-context-switches.ts
*/

import { readFileSync, writeFileSync, existsSync } from "fs";

const LOG_FILE = "ai-metrics/context-switches.json";

interface ContextSwitch {
  timestamp: string;
  from: string;
  to: string;
  reason?: string;
}

function logContextSwitch(from: string, to: string, reason?: string): void {
  const switches: ContextSwitch[] = existsSync(LOG_FILE)
    ? JSON.parse(readFileSync(LOG_FILE, "utf8"))
    : [];

  const entry: ContextSwitch = {
    timestamp: new Date().toISOString(),
    from,
    to,
  };
  if (reason !== undefined) {
    entry.reason = reason;
  }
  switches.push(entry);

  // Keep only last 100 entries
  if (switches.length > 100) {
    switches.splice(0, switches.length - 100);
  }

  writeFileSync(LOG_FILE, JSON.stringify(switches, null, 2));
  console.log(`Context switch logged: ${from} → ${to}`);
}

function analyzeSwitches(): void {
  if (!existsSync(LOG_FILE)) {
    console.log("No context switch data available.");
    return;
  }

  const switches: ContextSwitch[] = JSON.parse(readFileSync(LOG_FILE, "utf8"));
  const contextCounts: Record<string, number> = {};

  for (const sw of switches) {
    contextCounts[sw.to] = (contextCounts[sw.to] || 0) + 1;
  }

  console.log("Context switch analysis:");
  Object.entries(contextCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([context, count]) => {
      console.log(`${context}: ${count} switches`);
    });
}

// CLI interface
const command = process.argv[2];
if (command === "log") {
  const from = process.argv[3] || "unknown";
  const to = process.argv[4] || "unknown";
  const reason = process.argv[5];
  logContextSwitch(from, to, reason);
} else if (command === "analyze") {
  analyzeSwitches();
} else {
  console.log("Usage: tsx scripts/track-context-switches.ts log <from> <to> [reason] | analyze");
}
