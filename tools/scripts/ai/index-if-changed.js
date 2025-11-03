#!/usr/bin/env node

/**
 * Regenerate the semantic index only when relevant directories change.
 */

import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '../../..');
const HASH_FILE = path.join(REPO_ROOT, 'ai/ai-index/.last-hash');
const WATCH_PATHS = [
  'apps/api',
  'apps/frontend',
  'apps/game-server',
  'libs',
  'ai/ai-knowledge',
  'ai/patterns',
  'docs',
];

function hashForPath(relativePath, hash = createHash('sha256')) {
  const fullPath = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return hash;

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(fullPath).sort();
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      hashForPath(path.join(relativePath, entry), hash);
    }
  } else if (stat.isFile()) {
    hash.update(relativePath);
    hash.update(String(stat.size));
    hash.update(String(stat.mtimeMs));
  }

  return hash;
}

function computeWorkspaceHash() {
  const hash = createHash('sha256');
  for (const p of WATCH_PATHS) {
    hashForPath(p, hash);
  }
  return hash.digest('hex');
}

function readStoredHash() {
  try {
    return fs.readFileSync(HASH_FILE, 'utf8').trim();
  } catch {
    return null;
  }
}

function writeStoredHash(hash) {
  fs.mkdirSync(path.dirname(HASH_FILE), { recursive: true });
  fs.writeFileSync(HASH_FILE, `${hash}\n`, 'utf8');
}

function runIndexer() {
  const scriptPath = path.join(__dirname, 'code-indexer.js');
  const result = spawnSync('node', ['--experimental-modules', scriptPath, 'build'], {
    cwd: path.join(REPO_ROOT, 'ai'),
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`code-indexer exited with status ${result.status}`);
  }
}

function main() {
  const workspaceHash = computeWorkspaceHash();
  const storedHash = readStoredHash();

  if (storedHash === workspaceHash) {
    console.log('No relevant changes detected; skipping index regeneration.');
    return;
  }

  console.log('Changes detected in monitored paths. Rebuilding semantic index...');
  runIndexer();
  writeStoredHash(workspaceHash);
}

main();
