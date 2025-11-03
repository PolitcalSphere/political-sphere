#!/usr/bin/env node

/**
 * Performance monitoring script for AI assistants
 * @fileoverview Monitors and reports AI performance metrics
 */

import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const METRICS_FILE = path.join(__dirname, '../../ai-metrics.json');
const CACHE_FILE = path.join(__dirname, '../../ai-cache/cache.json');
const PATTERNS_FILE = path.join(__dirname, '../../ai-learning/patterns.json');

function loadMetrics() {
  try {
    return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
  } catch (error) {
    console.error('Failed to load metrics:', error.message);
    return null;
  }
}

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (error) {
    console.warn('Failed to load cache:', error.message);
    return { queries: {} };
  }
}

function loadPatterns() {
  try {
    return JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8'));
  } catch (error) {
    console.warn('Failed to load patterns:', error.message);
    return { performancePatterns: { fastResponses: [], slowResponses: [] } };
  }
}

function analyzePerformance() {
  const metrics = loadMetrics();
  const cache = loadCache();
  const patterns = loadPatterns();

  if (!metrics) {
    console.error('No metrics data available');
    return;
  }

  console.log('=== AI Performance Analysis ===\n');

  // Basic metrics
  console.log('📊 Basic Metrics:');
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Successful Requests: ${metrics.successfulRequests}`);
  console.log(`Failed Requests: ${metrics.failedRequests}`);
  console.log(`Average Response Time: ${metrics.averageResponseTime}ms`);
  console.log(`Cache Hit Rate: ${(metrics.performanceMetrics?.cacheHitRate || 0) * 100}%`);
  console.log(`Rate Limit Hits: ${metrics.performanceMetrics?.rateLimitHits || 0}`);
  console.log();

  // Response time distribution
  if (metrics.responseTimeDistribution) {
    console.log('⏱️  Response Time Distribution:');
    console.log(`P50: ${metrics.responseTimeDistribution.p50}ms`);
    console.log(`P95: ${metrics.responseTimeDistribution.p95}ms`);
    console.log(`P99: ${metrics.responseTimeDistribution.p99}ms`);
    console.log();
  }

  // Cache analysis
  const cachedQueries = Object.keys(cache.queries).length;
  console.log('💾 Cache Analysis:');
  console.log(`Cached Queries: ${cachedQueries}`);
  console.log(`Cache Last Updated: ${cache.lastUpdated}`);
  console.log();

  // Pattern analysis
  console.log('🎯 Performance Patterns:');
  console.log(
    `Fast Responses Identified: ${patterns.performancePatterns?.fastResponses?.length || 0}`
  );
  console.log(
    `Slow Responses Identified: ${patterns.performancePatterns?.slowResponses?.length || 0}`
  );
  console.log(`Cacheable Queries: ${patterns.performancePatterns?.cacheableQueries?.length || 0}`);
  console.log();

  // Recommendations
  console.log('💡 Recommendations:');
  if (metrics.averageResponseTime > 2000) {
    console.log('- Consider enabling FAST_AI=1 for faster responses');
    console.log('- Review and optimize slow response patterns');
  }
  if ((metrics.performanceMetrics?.cacheHitRate || 0) < 0.5) {
    console.log('- Increase cache utilization by pre-caching common queries');
    console.log('- Run scripts/ai/pre-cache.js to populate cache');
  }
  if (metrics.performanceMetrics?.rateLimitHits > 0) {
    console.log('- Rate limits are being hit - consider increasing limits or optimizing usage');
  }
  if (cachedQueries < 10) {
    console.log('- Cache is underutilized - add more pre-cached queries');
  }
  console.log('- Monitor patterns in ai-learning/patterns.json for continuous improvement');
}

function main() {
  const startedAt = Date.now();
  let success = false;
  try {
    analyzePerformance();
    success = true;
  } finally {
    // record run into ai-metrics.json
    (async () => {
      try {
        const raw = await fsp.readFile(METRICS_FILE, 'utf8').catch(() => null);
        const metrics = raw ? JSON.parse(raw) : { scriptRuns: [] };
        metrics.scriptRuns = metrics.scriptRuns || [];
        metrics.scriptRuns.push({
          script: 'performance-monitor',
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
          success,
        });
        await fsp.writeFile(METRICS_FILE, JSON.stringify(metrics, null, 2));
      } catch (err) {
        console.warn('Failed to record performance-monitor run:', err?.message || err);
      }
    })();
  }
}

if (__filename === process.argv[1]) {
  main();
}

export { analyzePerformance };
