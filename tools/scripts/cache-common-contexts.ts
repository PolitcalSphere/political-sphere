#!/usr/bin/env tsx
/*
  Cache common development contexts for fast AI access
  Usage: tsx scripts/cache-common-contexts.ts
*/

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const CACHE_FILE = 'ai-cache/common-contexts.json';

interface CachedContext {
  name: string;
  files: Record<string, { content: string; lastModified: number }>;
  lastUpdated: string;
}

const COMMON_CONTEXTS = [
  {
    name: 'api-types',
    files: ['libs/shared/src/types/api.ts', 'libs/shared/src/types/index.ts'],
  },
  {
    name: 'auth-utils',
    files: ['libs/shared/src/auth/', 'libs/shared/src/utils/auth.ts'],
  },
  {
    name: 'test-helpers',
    files: ['libs/shared/src/test/', 'jest.setup.js'],
  },
  {
    name: 'config-files',
    files: ['package.json', 'tsconfig.base.json', 'nx.json', '.eslintrc.json'],
  },
];

function cacheContext(contextDef: (typeof COMMON_CONTEXTS)[0]): CachedContext | null {
  const context: CachedContext = {
    name: contextDef.name,
    files: {},
    lastUpdated: new Date().toISOString(),
  };

  let hasContent = false;

  for (const filePath of contextDef.files) {
    try {
      const fullPath = join(process.cwd(), filePath);
      if (existsSync(fullPath)) {
        const stats = statSync(fullPath);
        const content = readFileSync(fullPath, 'utf8');
        context.files[filePath] = {
          content: content.slice(0, 2000), // Limit content size
          lastModified: stats.mtime.getTime(),
        };
        hasContent = true;
      }
    } catch (_e) {
      // Skip files that can't be read
    }
  }

  return hasContent ? context : null;
}

function cacheAllContexts(): void {
  const cachedContexts: CachedContext[] = [];

  for (const contextDef of COMMON_CONTEXTS) {
    const cached = cacheContext(contextDef);
    if (cached) {
      cachedContexts.push(cached);
    }
  }

  writeFileSync(
    CACHE_FILE,
    JSON.stringify({ contexts: cachedContexts, lastUpdated: new Date().toISOString() }, null, 2)
  );
  console.log(`Cached ${cachedContexts.length} common contexts`);
}

function getCachedContext(name: string): void {
  if (!existsSync(CACHE_FILE)) {
    console.error('Cache not found. Run script without arguments first.');
    return;
  }

  const cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
  const context = cache.contexts.find((c: CachedContext) => c.name === name);

  if (!context) {
    console.error(`Context "${name}" not found in cache.`);
    return;
  }

  console.log(JSON.stringify(context, null, 2));
}

const command = process.argv[2];
if (command) {
  getCachedContext(command);
} else {
  cacheAllContexts();
}
