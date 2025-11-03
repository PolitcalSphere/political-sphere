#!/usr/bin/env node
/*
  Context Preloader: Load common development contexts for fast AI warm-up
  Usage: node scripts/ai/context-preloader.js preload
*/

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join, extname } from "path";

const CACHE_FILE = "ai-cache/context-cache.json";
const CONTEXTS = {
  "api-routes": [
    "apps/api/src/routes/",
    "libs/shared/src/",
    "docs/architecture/decisions/",
    ".blackboxrules",
  ],
  "frontend-components": [
    "apps/frontend/src/components/",
    "libs/shared/src/",
    "docs/architecture/decisions/",
    ".blackboxrules",
  ],
  tests: ["tests/", "jest.config.cjs", "docs/", ".blackboxrules"],
  config: [
    "package.json",
    "tsconfig.base.json",
    "nx.json",
    "docs/architecture/decisions/",
    ".blackboxrules",
  ],
  docs: ["docs/", "README.md", ".blackboxrules"],
  "rules-awareness": [
    ".blackboxrules",
    ".github/copilot-instructions.md",
    "docs/architecture/decisions/",
  ],
  patterns: ["ai/patterns/", "ai-learning/patterns.json", "docs/TODO.md"],
};

async function preloadContext(contextName) {
  const paths = CONTEXTS[contextName];
  if (!paths) return null;

  const context = { name: contextName, files: {}, lastUpdated: new Date().toISOString() };

  const promises = paths.map(async (path) => {
    if (existsSync(path)) {
      if (statSync(path).isDirectory()) {
        const files = readdirSync(path, { recursive: true });
        for (const file of files) {
          if (
            extname(file) === ".ts" ||
            extname(file) === ".js" ||
            extname(file) === ".json" ||
            extname(file) === ".md"
          ) {
            const fullPath = join(path, file);
            try {
              const content = readFileSync(fullPath, "utf8");
              // Validate content integrity
              if (content.length === 0) {
                console.warn(`Warning: Empty file ${fullPath}`);
                continue;
              }
              context.files[fullPath] = { content: content.slice(0, 1000), size: content.length };
            } catch (e) {
              console.error(`Error reading file ${fullPath}:`, e.message);
              // Skip unreadable files but log the error
            }
          }
        }
      } else {
        try {
          const content = readFileSync(path, "utf8");
          if (content.length === 0) {
            console.warn(`Warning: Empty file ${path}`);
            return;
          }
          context.files[path] = { content: content.slice(0, 1000), size: content.length };
        } catch (e) {
          console.error(`Error reading file ${path}:`, e.message);
          // Skip unreadable files but log the error
        }
      }
    } else {
      // Skip non-existent paths silently to avoid noise
      return;
    }
  });

  await Promise.all(promises);

  return context;
}

async function preloadAll() {
  const cache = { contexts: {}, lastUpdated: new Date().toISOString() };

  const promises = Object.keys(CONTEXTS).map(async (contextName) => {
    console.log(`Preloading context: ${contextName}`);
    const context = await preloadContext(contextName);
    if (context) cache.contexts[contextName] = context;
  });

  await Promise.all(promises);

  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  console.log(`Context cache built with ${Object.keys(cache.contexts).length} contexts`);
}

function getContext(contextName) {
  if (!existsSync(CACHE_FILE)) {
    console.error('Cache not found. Run "preload" first.');
    process.exit(1);
  }

  const cache = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  const context = cache.contexts[contextName];
  if (!context) {
    console.error(`Context "${contextName}" not found.`);
    process.exit(1);
  }

  console.log(JSON.stringify(context, null, 2));
}

const command = process.argv[2];
if (command === "preload") {
  preloadAll().catch(console.error);
} else if (command === "get") {
  getContext(process.argv[3]);
} else {
  console.log("Usage: node scripts/ai/context-preloader.js preload|get <context>");
}
