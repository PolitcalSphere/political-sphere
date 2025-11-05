#!/usr/bin/env node
/**
 * AI Response Cache Manager
 * Caches common queries and responses to speed up AI assistance
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_CACHE_DIR = path.join(__dirname, "../../../ai-cache");
const LEGACY_CACHE_DIR = path.join(__dirname, "../../../ai/ai-cache");

function resolveCacheDir() {
  try {
    if (!fs.existsSync(ROOT_CACHE_DIR)) {
      fs.mkdirSync(ROOT_CACHE_DIR, { recursive: true });
    }
    return ROOT_CACHE_DIR;
  } catch (error) {
    console.warn(
      `Cache manager: unable to initialise ${ROOT_CACHE_DIR}, falling back to ${LEGACY_CACHE_DIR} (${error.message})`,
    );
    if (!fs.existsSync(LEGACY_CACHE_DIR)) {
      fs.mkdirSync(LEGACY_CACHE_DIR, { recursive: true });
    }
    return LEGACY_CACHE_DIR;
  }
}

const CACHE_DIR = resolveCacheDir();
const CACHE_FILE = path.join(CACHE_DIR, "response-cache.json");
const MAX_CACHE_SIZE = 100; // Max number of cached items
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

class AICache {
  constructor() {
    this.ensureCacheDir();
    this.cache = this.loadCache();
  }

  ensureCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  loadCache() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        return data;
      }
    } catch (error) {
      console.error('Cache load error:', error.message);
    }
    return { entries: {}, metadata: { created: Date.now() } };
  }

  saveCache() {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Cache save error:', error.message);
    }
  }

  hashQuery(query) {
    return crypto.createHash('sha256').update(query).digest('hex').slice(0, 16);
  }

  get(query) {
    const hash = this.hashQuery(query);
    const entry = this.cache.entries[hash];
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      delete this.cache.entries[hash];
      this.saveCache();
      return null;
    }
    
    entry.hits = (entry.hits || 0) + 1;
    entry.lastAccessed = Date.now();
    this.saveCache();
    
    return entry.response;
  }

  set(query, response) {
    const hash = this.hashQuery(query);
    
    // Enforce size limit
    const entries = Object.keys(this.cache.entries);
    if (entries.length >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const oldest = entries.reduce((old, key) => {
        const entry = this.cache.entries[key];
        return !old || entry.lastAccessed < this.cache.entries[old].lastAccessed ? key : old;
      }, null);
      if (oldest) delete this.cache.entries[oldest];
    }
    
    this.cache.entries[hash] = {
      query: query.slice(0, 200), // Store truncated query for reference
      response,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      hits: 0
    };
    
    this.saveCache();
  }

  clear() {
    this.cache = { entries: {}, metadata: { created: Date.now() } };
    this.saveCache();
    console.log('Cache cleared');
  }

  stats() {
    const entries = Object.values(this.cache.entries);
    const totalHits = entries.reduce((sum, e) => sum + (e.hits || 0), 0);
    const avgAge = entries.length > 0 
      ? entries.reduce((sum, e) => sum + (Date.now() - e.timestamp), 0) / entries.length / 1000 / 60
      : 0;
    
    return {
      totalEntries: entries.length,
      totalHits: totalHits,
      averageAgeMinutes: Math.round(avgAge),
      cacheSize: entries.length,
      maxSize: MAX_CACHE_SIZE
    };
  }

  // Pre-populate with common queries
  prepopulate() {
    const commonQueries = [
      {
        q: 'How do I run tests?',
        r: 'npm run test:changed'
      },
      {
        q: 'Where are the main docs?',
        r: 'docs/TODO.md, docs/architecture.md, docs/VSCODE-PERFORMANCE.md'
      },
      {
        q: 'How to check performance?',
        r: 'npm run perf:monitor'
      },
      {
        q: 'Where is the API code?',
        r: 'apps/api/src/'
      },
      {
        q: 'How to cleanup processes?',
        r: 'npm run cleanup'
      },
      {
        q: 'Where are test files?',
        r: '**/__tests__/**/*.{test,spec}.{js,ts}'
      }
    ];

    commonQueries.forEach(({ q, r }) => this.set(q, r));
    console.log(`Prepopulated ${commonQueries.length} common queries`);
  }
}

// CLI interface
if (require.main === module) {
  const cache = new AICache();
  const command = process.argv[2];

  switch (command) {
    case 'stats':
      console.log('AI Cache Statistics:', cache.stats());
      break;
    case 'clear':
      cache.clear();
      break;
    case 'prepopulate':
      cache.prepopulate();
      break;
    case 'get':
      const query = process.argv[3];
      if (query) {
        const result = cache.get(query);
        console.log(result || 'Not found in cache');
      }
      break;
    default:
      console.log('AI Response Cache Manager');
      console.log('Commands:');
      console.log('  stats       - Show cache statistics');
      console.log('  clear       - Clear all cache');
      console.log('  prepopulate - Add common queries');
      console.log('  get <query> - Get cached response');
  }
}

module.exports = AICache;
