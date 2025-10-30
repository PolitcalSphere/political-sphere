#!/usr/bin/env node

/**
 * Structured logging for Copilot experiments to track prompt variants and outcomes.
 * Creates monthly summaries for engineering guild review.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');

const logsDir = join(repoRoot, 'ai-logs');
const experimentLogPath = join(logsDir, 'copilot-experiments.json');

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

const logExperiment = async (experiment) => {
  const requiredFields = ['date', 'promptVariant', 'outcome'];
  for (const field of requiredFields) {
    if (!experiment[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  await mkdir(logsDir, { recursive: true });

  let experiments = await safeReadJson(experimentLogPath, []);

  experiments.push({
    ...experiment,
    loggedAt: new Date().toISOString(),
  });

  // Keep last 1000 entries
  if (experiments.length > 1000) {
    experiments = experiments.slice(-1000);
  }

  await writeFile(experimentLogPath, JSON.stringify(experiments, null, 2));
  console.log('✅ Copilot experiment logged successfully');
};

const generateMonthlySummary = async () => {
  const experiments = await safeReadJson(experimentLogPath, []);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthlyExperiments = experiments.filter(exp => {
    const expDate = new Date(exp.date);
    const expMonth = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
    return expMonth === currentMonth;
  });

  if (monthlyExperiments.length === 0) {
    console.log('ℹ️  No experiments logged this month');
    return;
  }

  const summary = {
    month: currentMonth,
    totalExperiments: monthlyExperiments.length,
    promptVariants: {},
    outcomes: {},
    averageMetrics: {},
    generatedAt: new Date().toISOString(),
  };

  // Aggregate by prompt variant
  for (const exp of monthlyExperiments) {
    const variant = exp.promptVariant;
    if (!summary.promptVariants[variant]) {
      summary.promptVariants[variant] = { count: 0, outcomes: {} };
    }
    summary.promptVariants[variant].count++;

    const outcome = exp.outcome;
    if (!summary.outcomes[outcome]) {
      summary.outcomes[outcome] = 0;
    }
    summary.outcomes[outcome]++;

    if (!summary.promptVariants[variant].outcomes[outcome]) {
      summary.promptVariants[variant].outcomes[outcome] = 0;
    }
    summary.promptVariants[variant].outcomes[outcome]++;

    // Aggregate metrics if present
    if (exp.metrics) {
      for (const [key, value] of Object.entries(exp.metrics)) {
        if (typeof value === 'number') {
          if (!summary.averageMetrics[key]) {
            summary.averageMetrics[key] = { sum: 0, count: 0 };
          }
          summary.averageMetrics[key].sum += value;
          summary.averageMetrics[key].count++;
        }
      }
    }
  }

  // Calculate averages
  for (const [key, data] of Object.entries(summary.averageMetrics)) {
    summary.averageMetrics[key] = Number((data.sum / data.count).toFixed(2));
  }

  const summaryPath = join(logsDir, `copilot-summary-${currentMonth}.json`);
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`📊 Monthly summary generated: ${summaryPath}`);
};

const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'log') {
    const experimentData = JSON.parse(args[1] || '{}');
    await logExperiment(experimentData);
  } else if (command === 'summary') {
    await generateMonthlySummary();
  } else {
    console.log('Usage:');
    console.log('  node copilot-experiment-log.mjs log <experiment-json>');
    console.log('  node copilot-experiment-log.mjs summary');
  }
};

main().catch((error) => {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
});
