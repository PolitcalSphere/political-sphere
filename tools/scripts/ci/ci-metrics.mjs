#!/usr/bin/env node
/**
 * CI Metrics Collector
 * Tracks CI/CD pipeline performance, failures, and trends
 * Owner: DevOps Team
 * Last updated: 2025-10-29
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const METRICS_FILE = path.join(__dirname, '../../ai-metrics/ci-metrics.json');
const METRICS_DIR = path.dirname(METRICS_FILE);

// Ensure metrics directory exists
if (!fs.existsSync(METRICS_DIR)) {
  fs.mkdirSync(METRICS_DIR, { recursive: true });
}

/**
 * Load existing metrics or create new
 */
function loadMetrics() {
  if (fs.existsSync(METRICS_FILE)) {
    return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
  }

  return {
    version: '1.0.0',
    last_updated: new Date().toISOString(),
    summary: {
      total_runs: 0,
      successful_runs: 0,
      failed_runs: 0,
      average_duration_minutes: 0,
      success_rate_percent: 0,
    },
    workflows: {},
    trends: {
      daily: {},
      weekly: {},
    },
  };
}

/**
 * Save metrics to file
 */
function saveMetrics(metrics) {
  metrics.last_updated = new Date().toISOString();
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
  console.log(`✅ Metrics saved to ${METRICS_FILE}`);
}

/**
 * Record a CI run
 */
function recordRun(workflowName, status, durationMinutes, details = {}) {
  const metrics = loadMetrics();

  // Initialize workflow if not exists
  if (!metrics.workflows[workflowName]) {
    metrics.workflows[workflowName] = {
      total_runs: 0,
      successful_runs: 0,
      failed_runs: 0,
      average_duration_minutes: 0,
      last_run: null,
      last_success: null,
      last_failure: null,
    };
  }

  const workflow = metrics.workflows[workflowName];

  // Update workflow stats
  workflow.total_runs++;
  workflow.last_run = new Date().toISOString();

  if (status === 'success') {
    workflow.successful_runs++;
    workflow.last_success = new Date().toISOString();
  } else {
    workflow.failed_runs++;
    workflow.last_failure = new Date().toISOString();
    workflow.last_failure_reason = details.reason || 'Unknown';
  }

  // Update average duration
  workflow.average_duration_minutes =
    (workflow.average_duration_minutes * (workflow.total_runs - 1) + durationMinutes) /
    workflow.total_runs;

  // Update overall summary
  metrics.summary.total_runs++;
  if (status === 'success') {
    metrics.summary.successful_runs++;
  } else {
    metrics.summary.failed_runs++;
  }

  metrics.summary.success_rate_percent =
    (metrics.summary.successful_runs / metrics.summary.total_runs) * 100;

  metrics.summary.average_duration_minutes =
    (metrics.summary.average_duration_minutes * (metrics.summary.total_runs - 1) +
      durationMinutes) /
    metrics.summary.total_runs;

  // Update daily trends
  const today = new Date().toISOString().split('T')[0];
  if (!metrics.trends.daily[today]) {
    metrics.trends.daily[today] = { runs: 0, successes: 0, failures: 0 };
  }
  metrics.trends.daily[today].runs++;
  if (status === 'success') {
    metrics.trends.daily[today].successes++;
  } else {
    metrics.trends.daily[today].failures++;
  }

  saveMetrics(metrics);
  return metrics;
}

/**
 * Generate CI health report
 */
function generateHealthReport() {
  const metrics = loadMetrics();

  console.log('\n📊 CI/CD Pipeline Health Report');
  console.log('================================\n');

  console.log('📈 Overall Statistics:');
  console.log(`   Total Runs: ${metrics.summary.total_runs}`);
  console.log(
    `   Successful: ${metrics.summary.successful_runs} (${metrics.summary.success_rate_percent.toFixed(2)}%)`
  );
  console.log(`   Failed: ${metrics.summary.failed_runs}`);
  console.log(`   Avg Duration: ${metrics.summary.average_duration_minutes.toFixed(2)} minutes`);
  console.log('');

  console.log('🔧 Workflow Breakdown:');
  Object.entries(metrics.workflows).forEach(([name, stats]) => {
    const successRate = (stats.successful_runs / stats.total_runs) * 100;
    const healthEmoji = successRate >= 95 ? '✅' : successRate >= 80 ? '⚠️' : '❌';

    console.log(`   ${healthEmoji} ${name}:`);
    console.log(`      Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`      Avg Duration: ${stats.average_duration_minutes.toFixed(2)} min`);
    console.log(
      `      Last Run: ${stats.last_run ? new Date(stats.last_run).toLocaleString() : 'Never'}`
    );
    if (stats.last_failure) {
      console.log(`      Last Failure: ${new Date(stats.last_failure).toLocaleString()}`);
      console.log(`      Reason: ${stats.last_failure_reason || 'Unknown'}`);
    }
    console.log('');
  });

  // Identify issues
  console.log('🚨 Action Items:');
  const issues = [];

  if (metrics.summary.success_rate_percent < 90) {
    issues.push(
      `Overall success rate (${metrics.summary.success_rate_percent.toFixed(2)}%) is below 90%`
    );
  }

  if (metrics.summary.average_duration_minutes > 30) {
    issues.push(
      `Average CI duration (${metrics.summary.average_duration_minutes.toFixed(2)} min) exceeds 30 minutes`
    );
  }

  Object.entries(metrics.workflows).forEach(([name, stats]) => {
    const successRate = (stats.successful_runs / stats.total_runs) * 100;
    if (successRate < 80) {
      issues.push(`${name} success rate (${successRate.toFixed(2)}%) is below 80%`);
    }
    if (stats.average_duration_minutes > 20) {
      issues.push(
        `${name} duration (${stats.average_duration_minutes.toFixed(2)} min) exceeds 20 minutes`
      );
    }
  });

  if (issues.length === 0) {
    console.log('   ✅ No critical issues detected!\n');
  } else {
    issues.forEach((issue) => console.log(`   ❌ ${issue}`));
    console.log('');
  }

  return metrics;
}

/**
 * Reset metrics (for testing or new baseline)
 */
function resetMetrics() {
  const confirm = process.argv.includes('--confirm');
  if (!confirm) {
    console.log('⚠️  This will delete all CI metrics. Run with --confirm to proceed.');
    return;
  }

  if (fs.existsSync(METRICS_FILE)) {
    fs.unlinkSync(METRICS_FILE);
    console.log('✅ Metrics reset successfully');
  }
}

/**
 * CLI interface
 */
function main() {
  const command = process.argv[2];

  switch (command) {
    case 'record':
      const workflow = process.argv[3];
      const status = process.argv[4];
      const duration = parseFloat(process.argv[5] || '0');
      const reason = process.argv[6];

      if (!workflow || !status) {
        console.error('Usage: ci-metrics.js record <workflow> <status> [duration] [reason]');
        process.exit(1);
      }

      recordRun(workflow, status, duration, { reason });
      console.log(`✅ Recorded ${status} run for ${workflow} (${duration} min)`);
      break;

    case 'report':
      generateHealthReport();
      break;

    case 'reset':
      resetMetrics();
      break;

    default:
      console.log('CI Metrics Collector');
      console.log('Usage:');
      console.log('  node ci-metrics.js record <workflow> <status> [duration] [reason]');
      console.log('  node ci-metrics.js report');
      console.log('  node ci-metrics.js reset --confirm');
      break;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { recordRun, generateHealthReport, loadMetrics };
