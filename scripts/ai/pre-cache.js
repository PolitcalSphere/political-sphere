#!/usr/bin/env node

/**
 * Pre-cache common queries and patterns for AI performance optimization
 * @fileoverview Pre-caches frequently used queries to improve response times
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '../../ai-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');
const PATTERNS_FILE = path.join(__dirname, '../../ai-learning/patterns.json');

// Common queries to pre-cache
const COMMON_QUERIES = [
  'What is the project structure?',
  'How do I run tests?',
  'What are the coding standards?',
  'How do I add a new component?',
  'What is the deployment process?',
  'How do I handle errors?',
  'What are the security requirements?',
  'How do I update dependencies?'
];

// Note: COMMON_PATTERNS defined for future pattern caching implementation

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('Failed to load cache:', error.message);
  }
  return { responses: {}, queries: {}, lastUpdated: new Date().toISOString() };
}

function saveCache(cache) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    cache.lastUpdated = new Date().toISOString();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log('Cache saved successfully');
  } catch (error) {
    console.error('Failed to save cache:', error.message);
  }
}

function preCacheQueries() {
  const cache = loadCache();

  COMMON_QUERIES.forEach(query => {
    const key = query.toLowerCase().replace(/\s+/g, '_');
    if (!cache.queries[key]) {
      cache.queries[key] = {
        query,
        cached: true,
        timestamp: new Date().toISOString(),
        // Placeholder for actual response - would be populated by AI system
        response: `Pre-cached response for: ${query}`
      };
    }
  });

  saveCache(cache);
}

function updatePatterns() {
  try {
    const patterns = JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8'));
    patterns.performancePatterns.cacheableQueries = [
      ...new Set([
        ...patterns.performancePatterns.cacheableQueries,
        ...COMMON_QUERIES
      ])
    ];
    patterns.performancePatterns.optimizationTips = [
      ...new Set([
        ...patterns.performancePatterns.optimizationTips,
        'Pre-cache common queries using scripts/ai/pre-cache.js',
        'Use FAST_AI=1 for rapid iteration',
        'Batch similar operations together',
        'Leverage cached patterns from ai-learning/patterns.json'
      ])
    ];
    fs.writeFileSync(PATTERNS_FILE, JSON.stringify(patterns, null, 2));
    console.log('Patterns updated successfully');
  } catch (error) {
    console.error('Failed to update patterns:', error.message);
  }
}

function main() {
  console.log('Pre-caching AI queries and patterns...');
  preCacheQueries();
  updatePatterns();
  console.log('Pre-caching complete!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { preCacheQueries, updatePatterns };
