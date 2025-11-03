#!/usr/bin/env node

/**
 * Generate a high-level summary of recent repository changes relevant to AI workflows.
 */

import { spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '../../..');
const OUTPUT_FILE = path.join(REPO_ROOT, 'ai/context-bundles/recent-changes.md');
const TRACKED_PREFIXES = ['apps/api', 'apps/frontend', 'apps/game-server', 'libs', 'docs', 'ai'];

function runGit(args) {
  const result = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(' ')} failed`);
  }
  return result.stdout.trim();
}

function parseLog(raw) {
  const entries = [];
  const blocks = raw.split('\n\n').filter(Boolean);
  for (const block of blocks) {
    const [header, ...files] = block.split('\n');
    const [hash, author, date, subject] = header.split('|');
    const touched = files
      .map((line) => line.trim())
      .filter((file) => TRACKED_PREFIXES.some((prefix) => file.startsWith(prefix)));
    if (touched.length === 0) continue;
    entries.push({ hash, author, date, subject, files: touched });
  }
  return entries;
}

async function writeSummary(entries) {
  const lines = [
    '# Recent Changes',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
  ];

  for (const entry of entries.slice(0, 5)) {
    lines.push(`## ${entry.subject}`);
    lines.push(`- Commit: ${entry.hash}`);
    lines.push(`- Author: ${entry.author}`);
    lines.push(`- Date: ${entry.date}`);
    lines.push('- Files:');
    entry.files.slice(0, 10).forEach((file) => {
      lines.push(`  - ${file}`);
    });
    if (entry.files.length > 10) {
      lines.push(`  - ...and ${entry.files.length - 10} more`);
    }
    lines.push('');
  }

  await fs.writeFile(OUTPUT_FILE, lines.join('\n'), 'utf8');
}

export async function updateRecentChanges() {
  const rawLog = runGit([
    'log',
    '-n',
    '10',
    "--pretty=format:%H|%an|%ad|%s",
    '--date=iso-strict',
    '--name-only',
  ]);
  const entries = parseLog(rawLog);
  await writeSummary(entries);
  return path.relative(REPO_ROOT, OUTPUT_FILE);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  updateRecentChanges()
    .then((file) => {
      console.log(`Recent changes written to ${file}`);
    })
    .catch((error) => {
      console.error('Failed to update recent changes summary:', error.message);
      process.exitCode = 1;
    });
}
