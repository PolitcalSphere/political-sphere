#!/usr/bin/env node

/**
 * Pre-cache common queries and patterns for AI performance optimization
 * @fileoverview Pre-caches frequently used queries to improve response times
 */

import { promises as fsp } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { recordScriptEvent } from './analytics.js';
import { updateRecentChanges } from './update-recent-changes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CACHE_DIR = path.join(REPO_ROOT, 'ai', 'ai-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');
const PATTERNS_FILE = path.join(REPO_ROOT, 'ai', 'ai-learning', 'patterns.json');
const METRICS_FILE = path.join(REPO_ROOT, 'ai-metrics.json');

// Configurable cache settings
const DEFAULT_MAX_ENTRIES = parseInt(process.env.PRE_CACHE_MAX_ENTRIES || '200', 10);
const DEFAULT_TTL_MS = parseInt(process.env.PRE_CACHE_TTL_MS || String(1000 * 60 * 60 * 24), 10); // 24h
const FAST_AI = process.env.FAST_AI === '1' || process.env.FAST_AI === 'true';

function normalizeTimestamp(value, fallback = Date.now()) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeCacheShape(cache) {
  if (!cache || typeof cache !== 'object') {
    return {
      responses: {},
      queries: {},
      lastUpdated: new Date().toISOString(),
      maxEntries: DEFAULT_MAX_ENTRIES,
      ttlMs: DEFAULT_TTL_MS,
    };
  }

  cache.responses = cache.responses || {};
  cache.queries = cache.queries || {};

  const now = Date.now();
  for (const [key, entry] of Object.entries(cache.queries)) {
    if (!entry || typeof entry !== 'object') {
      delete cache.queries[key];
      continue;
    }
    entry.timestamp = normalizeTimestamp(entry.timestamp, now);
  }

  const normalizedMax = Number(cache.maxEntries);
  cache.maxEntries = Number.isFinite(normalizedMax) ? normalizedMax : DEFAULT_MAX_ENTRIES;

  const normalizedTtl = Number(cache.ttlMs);
  cache.ttlMs = Number.isFinite(normalizedTtl) ? normalizedTtl : DEFAULT_TTL_MS;

  return cache;
}

// Common queries to pre-cache
const COMMON_QUERIES = [
  'What is the project structure?',
  'How do I run tests?',
  'What are the coding standards?',
  'How do I add a new component?',
  'What is the deployment process?',
  'How do I handle errors?',
  'What are the security requirements?',
  'How do I update dependencies?',
  'How to run the development server?',
  'How to run database migrations?',
  'How to seed test data?',
  'How to run linting?',
  'What is FAST_AI and how to enable it?',
  'Where are the ADRs (architecture decision records)?',
  'How to run the test smoke suite?',
  'How to add a new API endpoint?',
  'How to write an integration test?',
  'How to create a new React component with accessibility?',
  'How to run Playwright tests?',
  'What are the accessibility requirements?',
  'How to update shared libs?',
  'Where is the README for apps/api?',
  'How to contribute (contributing.md)?',
  'How to run the pre-cache script?',
  'How to pre-load AI contexts?',
  'What is the release process?',
];

// Note: COMMON_PATTERNS defined for future pattern caching implementation

async function loadCache() {
  try {
    await fsp.mkdir(CACHE_DIR, { recursive: true });
    const raw = await fsp.readFile(CACHE_FILE, 'utf8').catch(() => null);
    if (raw) {
      return normalizeCacheShape(JSON.parse(raw));
    }
  } catch (error) {
    console.warn('Failed to load cache:', error.message);
  }
  return normalizeCacheShape({
    responses: {},
    queries: {},
    lastUpdated: new Date().toISOString(),
    maxEntries: DEFAULT_MAX_ENTRIES,
    ttlMs: DEFAULT_TTL_MS,
  });
}

async function saveCache(cache) {
  try {
    await fsp.mkdir(CACHE_DIR, { recursive: true });
    cache.lastUpdated = new Date().toISOString();
    await fsp.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log('Cache saved successfully');
  } catch (error) {
    console.error('Failed to save cache:', error.message);
  }
}

async function preCacheQueries() {
  const cache = await loadCache();
  // Seed from built-in COMMON_QUERIES
  const seedQueries = FAST_AI ? COMMON_QUERIES.slice(0, 20) : COMMON_QUERIES;
  for (const query of seedQueries) {
    const key = query
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 200);
    const existing = cache.queries[key] || {};
    cache.queries[key] = {
      ...existing,
      query,
      cached: true,
      timestamp: Date.now(),
      response:
        existing.response ??
        (FAST_AI ? `FAST pre-cached: ${query}` : `Pre-cached response for: ${query}`),
    };
  }

  // Also generate queries from README and package.json scripts for better coverage
  try {
    const repoRoot = path.join(__dirname, '..', '..');
    const readmePath = path.join(repoRoot, 'README.md');
    const pkgPath = path.join(repoRoot, 'package.json');

    const readmeRaw = await fsp.readFile(readmePath, 'utf8').catch(() => null);
    if (readmeRaw) {
      // Extract top-level headings and short sentences as queries
      const headings = [
        ...new Set(Array.from(readmeRaw.matchAll(/^#+\s*(.+)$/gm)).map((m) => m[1].trim())),
      ];
      headings.slice(0, 20).forEach((h) => {
        const key = `readme_${h}`
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 100);
        const existing = cache.queries[key] || {};
        cache.queries[key] = {
          ...existing,
          query: `Explain: ${h}`,
          cached: true,
          timestamp: Date.now(),
          response: existing.response ?? `Pre-cached response for README heading: ${h}`,
        };
      });
    }

    const pkgRaw = await fsp.readFile(pkgPath, 'utf8').catch(() => null);
    if (pkgRaw) {
      const pkg = JSON.parse(pkgRaw);
      const scripts = Object.keys(pkg.scripts || {});
      scripts.slice(0, 20).forEach((s) => {
        const key = `script_${s}`.toLowerCase().replace(/\s+/g, '_');
        const q = `How to run: npm run ${s}`;
        const existing = cache.queries[key] || {};
        cache.queries[key] = {
          ...existing,
          query: q,
          cached: true,
          timestamp: Date.now(),
          response: existing.response ?? `Pre-cached response for script: ${s}`,
        };
      });
    }
  } catch (err) {
    console.warn('Failed to generate queries from docs:', err?.message || err);
  }

  // TTL enforcement is now handled in enforceCacheSize

  // Enforce max entries (LRU eviction)
  await enforceCacheSize(cache);

  await saveCache(cache);
}

/**
 * Evict entries when cache exceeds maxEntries using simple LRU by timestamp
 */
async function enforceCacheSize(cache) {
  try {
    const maxEntries = cache.maxEntries || DEFAULT_MAX_ENTRIES;
    const entries = Object.keys(cache.queries || {});
    const getTimestamp = (entry) => normalizeTimestamp(entry?.timestamp, 0);
    let evictedCount = 0;
    let expiredCount = 0;
    if (entries.length > maxEntries) {
      const sorted = [...entries].sort(
        (a, b) => getTimestamp(cache.queries[a]) - getTimestamp(cache.queries[b])
      );
      const toRemove = sorted.slice(0, sorted.length - maxEntries);
      toRemove.forEach((k) => delete cache.queries[k]);
      evictedCount = toRemove.length;
    } else {
      evictedCount = 0;
    }

    const ttl = cache.ttlMs || DEFAULT_TTL_MS;
    if (ttl > 0) {
      const now = Date.now();
      const currentKeys = Object.keys(cache.queries || {});
      const expiredKeys = currentKeys.filter((k) => now - getTimestamp(cache.queries[k]) > ttl);
      expiredKeys.forEach((k) => delete cache.queries[k]);
      expiredCount = expiredKeys.length;
    } else {
      expiredCount = 0;
    }

    cache.evicted = evictedCount;
    cache.expired = expiredCount;

    console.log(
      `Cache maintenance: evicted ${evictedCount} entries, expired ${expiredCount} entries`
    );
  } catch (err) {
    console.warn('Cache size enforcement failed:', err?.message || err);
  }
  return cache;
}

async function updatePatterns() {
  try {
    const raw = await fsp.readFile(PATTERNS_FILE, 'utf8').catch(() => null);
    if (!raw) {
      console.warn('Patterns file not found, skipping update');
      return;
    }
    const patterns = JSON.parse(raw);
    patterns.performancePatterns = patterns.performancePatterns || {
      cacheableQueries: [],
      optimizationTips: [],
    };
    patterns.performancePatterns.cacheableQueries = [
      ...new Set([...(patterns.performancePatterns.cacheableQueries || []), ...COMMON_QUERIES]),
    ];
    patterns.performancePatterns.optimizationTips = [
      ...new Set([
        ...(patterns.performancePatterns.optimizationTips || []),
        'Pre-cache common queries using scripts/ai/pre-cache.js',
        'Use FAST_AI=1 for rapid iteration',
        'Batch similar operations together',
        'Leverage cached patterns from ai-learning/patterns.json',
      ]),
    ];
    await fsp.writeFile(PATTERNS_FILE, JSON.stringify(patterns, null, 2));
    console.log('Patterns updated successfully');
  } catch (error) {
    console.error('Failed to update patterns:', error.message);
  }
}

async function main() {
  const startedAt = Date.now();
  let success = false;
  console.log('Pre-caching AI queries and patterns...');
  try {
    await preCacheQueries();
    await updatePatterns();
    await updateRecentChanges().catch((error) => {
      console.warn('Failed to update recent changes bundle:', error.message);
    });
    console.log('Pre-caching complete!');
    success = true;
  } catch (err) {
    console.error('Pre-cache encountered an error:', err?.message || err);
  } finally {
    try {
      const duration = Date.now() - startedAt;
      const raw = await fsp.readFile(METRICS_FILE, 'utf8').catch(() => null);
      const metrics = raw ? JSON.parse(raw) : { scriptRuns: [] };
      metrics.scriptRuns = metrics.scriptRuns || [];
      metrics.scriptRuns.push({
        script: 'pre-cache',
        timestamp: new Date().toISOString(),
        durationMs: duration,
        success,
      });
      await fsp.writeFile(METRICS_FILE, JSON.stringify(metrics, null, 2));
      await recordScriptEvent('pre-cache', {
        durationMs: duration,
        payload: {
          queriesCached: Object.keys((await loadCache()).queries || {}).length,
          fastMode: FAST_AI,
        },
      });
    } catch (err) {
      console.warn('Failed to write metrics:', err?.message || err);
    }
  }
}

if (__filename === process.argv[1]) {
  main().catch((e) => console.error(e));
}

export { preCacheQueries, updatePatterns };
