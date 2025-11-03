#!/usr/bin/env node

/**
 * Build high-value context bundles for AI assistants.
 * Collects curated source documents and writes aggregated Markdown bundles to ai/context-bundles/.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '../../..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'ai/context-bundles');

/**
 * Bundle definitions: output file name and ordered list of relative source files
 */
const BUNDLES = [
  {
    file: 'core.md',
    title: 'Core Project Context',
    sources: [
      'README.md',
      'docs/TODO.md',
      'docs/controls.yml',
      'ai/ai-knowledge/project-context.md',
    ],
  },
  {
    file: 'api-service.md',
    title: 'API Service Snapshot',
    sources: [
      'apps/api/README.md',
      'apps/api/src/server.js',
      'apps/api/src/routes/users.js',
      'apps/api/src/migrations/index.js',
      'apps/api/tests/README.md',
    ],
  },
  {
    file: 'game-server.md',
    title: 'Game Server Snapshot',
    sources: [
      'apps/game-server/README.md',
      'apps/game-server/src/index.js',
      'apps/game-server/src/db.js',
      'apps/game-server/scripts/testComplianceLogging.js',
      'apps/game-server/scripts/testModeration.js',
    ],
  },
  {
    file: 'frontend.md',
    title: 'Frontend Snapshot',
    sources: [
      'apps/frontend/README.md',
      'apps/frontend/src/server.js',
      'apps/frontend/tests/accessibility.test.js',
    ],
  },
];

async function fileExists(relativePath) {
  try {
    const fullPath = path.join(REPO_ROOT, relativePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

async function buildBundle({ file, title, sources }) {
  const outputLines = [`# ${title}`, '', `> Generated: ${new Date().toISOString()}`, ''];

  for (const source of sources) {
    if (!(await fileExists(source))) continue;

    const fullPath = path.join(REPO_ROOT, source);
    const content = await fs.readFile(fullPath, 'utf8');
    outputLines.push(`## ${source}`);
    outputLines.push('');
    outputLines.push('```');
    outputLines.push(content.trimEnd());
    outputLines.push('```');
    outputLines.push('');
  }

  const outputPath = path.join(OUTPUT_DIR, file);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(outputPath, outputLines.join('\n'), 'utf8');
  return outputPath;
}

async function main() {
  const results = [];
  for (const bundle of BUNDLES) {
    const outputPath = await buildBundle(bundle);
    results.push(path.relative(REPO_ROOT, outputPath));
  }

  console.log('Context bundles generated:', results.join(', '));
}

main().catch((error) => {
  console.error('Failed to build context bundles:', error);
  process.exitCode = 1;
});
