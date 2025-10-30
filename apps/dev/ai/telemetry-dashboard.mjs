#!/usr/bin/env node

/**
 * Telemetry dashboard for AI suggestions metrics.
 * Instruments Blackbox and Copilot pipelines to capture acceptance rate, edit distance, and time-to-merge.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');

const telemetryDir = join(repoRoot, 'ai-metrics');
const telemetryPath = join(telemetryDir, 'telemetry.json');

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

const recordSuggestion = async (suggestion) => {
  const requiredFields = ['timestamp', 'source', 'content', 'context'];
  for (const field of requiredFields) {
    if (!suggestion[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  await mkdir(telemetryDir, { recursive: true });

  let telemetry = await safeReadJson(telemetryPath, {
    suggestions: [],
    acceptances: [],
    rejections: [],
    alerts: [],
  });

  telemetry.suggestions.push({
    ...suggestion,
    recordedAt: new Date().toISOString(),
  });

  // Keep last 5000 suggestions
  if (telemetry.suggestions.length > 5000) {
    telemetry.suggestions = telemetry.suggestions.slice(-5000);
  }

  await writeFile(telemetryPath, JSON.stringify(telemetry, null, 2));
  console.log('✅ Suggestion recorded');
};

const recordAcceptance = async (acceptance) => {
  const requiredFields = ['suggestionId', 'editDistance', 'timeToAccept'];
  for (const field of requiredFields) {
    if (!acceptance[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  let telemetry = await safeReadJson(telemetryPath, {
    suggestions: [],
    acceptances: [],
    rejections: [],
    alerts: [],
  });

  telemetry.acceptances.push({
    ...acceptance,
    recordedAt: new Date().toISOString(),
  });

  // Keep last 5000 acceptances
  if (telemetry.acceptances.length > 5000) {
    telemetry.acceptances = telemetry.acceptances.slice(-5000);
  }

  await writeFile(telemetryPath, JSON.stringify(telemetry, null, 2));
  console.log('✅ Acceptance recorded');
};

const recordRejection = async (rejection) => {
  const requiredFields = ['suggestionId', 'reason'];
  for (const field of requiredFields) {
    if (!rejection[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  let telemetry = await safeReadJson(telemetryPath, {
    suggestions: [],
    acceptances: [],
    rejections: [],
    alerts: [],
  });

  telemetry.rejections.push({
    ...rejection,
    recordedAt: new Date().toISOString(),
  });

  // Keep last 5000 rejections
  if (telemetry.rejections.length > 5000) {
    telemetry.rejections = telemetry.rejections.slice(-5000);
  }

  await writeFile(telemetryPath, JSON.stringify(telemetry, null, 2));
  console.log('✅ Rejection recorded');
};

const calculateMetrics = (telemetry) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentSuggestions = telemetry.suggestions.filter(s =>
    new Date(s.recordedAt) > weekAgo
  );

  const recentAcceptances = telemetry.acceptances.filter(a =>
    new Date(a.recordedAt) > weekAgo
  );

  const recentRejections = telemetry.rejections.filter(r =>
    new Date(r.recordedAt) > weekAgo
  );

  const totalRecent = recentSuggestions.length;
  const acceptedRecent = recentAcceptances.length;
  const rejectedRecent = recentRejections.length;

  const acceptanceRate = totalRecent > 0 ? (acceptedRecent / totalRecent) * 100 : 0;
  const rejectionRate = totalRecent > 0 ? (rejectedRecent / totalRecent) * 100 : 0;

  const avgEditDistance = recentAcceptances.length > 0
    ? recentAcceptances.reduce((sum, a) => sum + (a.editDistance || 0), 0) / recentAcceptances.length
    : 0;

  const avgTimeToAccept = recentAcceptances.length > 0
    ? recentAcceptances.reduce((sum, a) => sum + (a.timeToAccept || 0), 0) / recentAcceptances.length
    : 0;

  return {
    period: 'last_7_days',
    totalSuggestions: totalRecent,
    accepted: acceptedRecent,
    rejected: rejectedRecent,
    acceptanceRate: Number(acceptanceRate.toFixed(2)),
    rejectionRate: Number(rejectionRate.toFixed(2)),
    avgEditDistance: Number(avgEditDistance.toFixed(2)),
    avgTimeToAccept: Number(avgTimeToAccept.toFixed(2)),
    generatedAt: new Date().toISOString(),
  };
};

const checkAlerts = (metrics) => {
  const alerts = [];

  if (metrics.rejectionRate > 30) {
    alerts.push({
      level: 'yellow',
      message: `High rejection rate: ${metrics.rejectionRate}%`,
      threshold: 30,
      current: metrics.rejectionRate,
    });
  }

  if (metrics.rejectionRate > 50) {
    alerts.push({
      level: 'red',
      message: `Critical rejection rate: ${metrics.rejectionRate}%`,
      threshold: 50,
      current: metrics.rejectionRate,
    });
  }

  if (metrics.avgTimeToAccept > 300) { // 5 minutes
    alerts.push({
      level: 'yellow',
      message: `Slow acceptance time: ${metrics.avgTimeToAccept}s average`,
      threshold: 300,
      current: metrics.avgTimeToAccept,
    });
  }

  return alerts;
};

const startDashboard = async (port = 3001) => {
  const app = express();
  app.use(express.json());

  app.get('/metrics', async (req, res) => {
    try {
      const telemetry = await safeReadJson(telemetryPath, {
        suggestions: [],
        acceptances: [],
        rejections: [],
        alerts: [],
      });

      const metrics = calculateMetrics(telemetry);
      const alerts = checkAlerts(metrics);

      res.json({
        ...metrics,
        alerts,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/suggestion', async (req, res) => {
    try {
      await recordSuggestion(req.body);
      res.json({ status: 'recorded' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/acceptance', async (req, res) => {
    try {
      await recordAcceptance(req.body);
      res.json({ status: 'recorded' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/rejection', async (req, res) => {
    try {
      await recordRejection(req.body);
      res.json({ status: 'recorded' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.listen(port, () => {
    console.log(`📊 AI Telemetry Dashboard running on http://localhost:${port}`);
    console.log(`📈 Metrics endpoint: http://localhost:${port}/metrics`);
  });
};

const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'serve') {
    const port = parseInt(args[1]) || 3001;
    await startDashboard(port);
  } else if (command === 'metrics') {
    const telemetry = await safeReadJson(telemetryPath, {
      suggestions: [],
      acceptances: [],
      rejections: [],
      alerts: [],
    });

    const metrics = calculateMetrics(telemetry);
    const alerts = checkAlerts(metrics);

    console.log('📊 AI Suggestions Metrics (Last 7 Days)');
    console.log(`Total Suggestions: ${metrics.totalSuggestions}`);
    console.log(`Accepted: ${metrics.accepted} (${metrics.acceptanceRate}%)`);
    console.log(`Rejected: ${metrics.rejected} (${metrics.rejectionRate}%)`);
    console.log(`Avg Edit Distance: ${metrics.avgEditDistance}`);
    console.log(`Avg Time to Accept: ${metrics.avgTimeToAccept}s`);

    if (alerts.length > 0) {
      console.log('\n🚨 Alerts:');
      alerts.forEach(alert => {
        console.log(`  ${alert.level.toUpperCase()}: ${alert.message}`);
      });
    }
  } else {
    console.log('Usage:');
    console.log('  node telemetry-dashboard.mjs serve [port]');
    console.log('  node telemetry-dashboard.mjs metrics');
  }
};

main().catch((error) => {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
});
