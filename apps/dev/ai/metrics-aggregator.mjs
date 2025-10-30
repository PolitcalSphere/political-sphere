#!/usr/bin/env node

/**
 * Aggregates AI automation telemetry to keep assistants sharp.
 * Reads guard history, builds performance stats, and updates learning signals.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');

const metricsDir = join(repoRoot, 'ai-metrics');
const guardHistoryPath = join(metricsDir, 'guard-history.json');
const statsPath = join(metricsDir, 'stats.json');
const contextIndexPath = join(repoRoot, 'ai-cache', 'context-index.json');
const learningPath = join(repoRoot, 'ai-learning', 'patterns.json');

const safeReadJson = async (path, fallback) => {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
};

const aggregateGuardHistory = (history) => {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      totalRuns: 0,
      passRate: 0,
      averageDurationMs: 0,
      checkFailureRates: {},
      lastRun: null,
    };
  }

  let passed = 0;
  let durationTotal = 0;
  const failureCounts = {};
  const checkTotals = {};

  for (const run of history) {
    if (run.status === 'passed') {
      passed += 1;
    }

    durationTotal += run.durationMs ?? 0;

    for (const check of run.checks ?? []) {
      const checkName = check.name ?? 'unknown';
      checkTotals[checkName] = (checkTotals[checkName] ?? 0) + 1;
      if (check.status === 'failed') {
        failureCounts[checkName] = (failureCounts[checkName] ?? 0) + 1;
      }
    }
  }

  const failureRates = {};
  Object.entries(checkTotals).forEach(([name, total]) => {
    const failures = failureCounts[name] ?? 0;
    failureRates[name] = total === 0 ? 0 : Number(((failures / total) * 100).toFixed(2));
  });

  const lastRun = history[history.length - 1];

  return {
    totalRuns: history.length,
    passRate: Number(((passed / history.length) * 100).toFixed(2)),
    averageDurationMs: Math.round(durationTotal / history.length),
    checkFailureRates: failureRates,
    lastRun,
  };
};

const updateLearningSignals = async (history) => {
  const patterns = await safeReadJson(learningPath, {
    successfulPrompts: [],
    commonIssues: {},
    userPreferences: {},
    qualityImprovements: [],
    lastUpdated: null,
  });

  const issueAccumulator = {};

  for (const run of history ?? []) {
    for (const check of run.checks ?? []) {
      if (check.status === 'failed') {
        issueAccumulator[check.name] = (issueAccumulator[check.name] ?? 0) + 1;
      }
    }
  }

  const sortedIssues = Object.entries(issueAccumulator)
    .sort((a, b) => b[1] - a[1])
    .reduce((acc, [name, count]) => {
      acc[name] = count;
      return acc;
    }, {});

  patterns.commonIssues = sortedIssues;
  patterns.qualityImprovements = [
    {
      timestamp: new Date().toISOString(),
      insight: history.length === 0
        ? 'No guard runs recorded yet. Encourage engineers to execute guard pipeline before submitting AI-assisted work.'
        : 'Focus on the most frequent guard failures to uplift assistant suggestions.',
      guardSample: history.slice(-5),
    },
  ];
  patterns.lastUpdated = new Date().toISOString();

  await writeFile(learningPath, JSON.stringify(patterns, null, 2));
};

const buildStats = async () => {
  const guardHistory = await safeReadJson(guardHistoryPath, []);
  const contextIndex = await safeReadJson(contextIndexPath, null);
  const guardStats = aggregateGuardHistory(guardHistory);

  const stats = {
    generatedAt: new Date().toISOString(),
    guard: guardStats,
    knowledgeBase: contextIndex
      ? {
          documents: contextIndex.totals?.documents ?? 0,
          classifications: contextIndex.totals?.classifications ?? {},
          lastIndexedAt: contextIndex.generatedAt,
        }
      : null,
  };

  await mkdir(metricsDir, { recursive: true });
  await writeFile(statsPath, JSON.stringify(stats, null, 2));

  await updateLearningSignals(guardHistory);

  return stats;
};

const main = async () => {
  console.log('📊 Aggregating AI telemetry and knowledge signals...');
  const stats = await buildStats();
  console.log(`✅ Guard runs recorded: ${stats.guard.totalRuns}`);
  if (stats.knowledgeBase) {
    console.log(`🧠 Knowledge base documents: ${stats.knowledgeBase.documents}`);
  } else {
    console.log('⚠️  Knowledge base index missing. Run npm run ai:context first.');
  }
};

main().catch((error) => {
  console.error(`❌ Metrics aggregation failed: ${error.message}`);
  process.exit(1);
});
