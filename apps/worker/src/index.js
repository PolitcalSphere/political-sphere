import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { summarizeNews } from './aggregator.js';

const API_URL = process.env.API_URL ?? 'http://api:4000';
const INTERVAL = Number.parseInt(process.env.WORKER_INTERVAL_MS ?? '15000', 10);
const OUTPUT_PATH =
  process.env.WORKER_OUTPUT ??
  fileURLToPath(new URL('../output/news-summary.json', import.meta.url));

let intervalId;

async function persistSummary(summary) {
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(summary, null, 2), 'utf8');
}

async function fetchUpdates() {
  try {
    const response = await fetch(new URL('/api/news', API_URL));
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }
    const payload = await response.json();
    const items = Array.isArray(payload.data) ? payload.data : [];
    const summary = summarizeNews(items);
    await persistSummary(summary);
    console.log(
      `[worker] Processed ${summary.total} stories. Latest update: ${summary.latest?.updatedAt ?? 'n/a'}`,
    );
  } catch (error) {
    console.error(`[worker] Failed to call API: ${error.message}`);
  }
}

function start() {
  console.log(`[worker] Polling ${API_URL} every ${INTERVAL}ms`);
  intervalId = setInterval(fetchUpdates, INTERVAL);
  fetchUpdates().catch((error) => console.error('[worker] Initial fetch failed', error));
}

function shutdown() {
  console.log('[worker] Received termination signal, shutting down…');
  if (intervalId) {
    clearInterval(intervalId);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
