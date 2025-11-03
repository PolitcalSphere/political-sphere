#!/usr/bin/env node

/**
 * Incremental codebase indexer (delta indexing using git)
 * Updates existing ai-index/codebase-index.json with only changed files since last commit.
 */
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INDEX_DIR = path.join(__dirname, '../../ai-index');
const INDEX_FILE = path.join(INDEX_DIR, 'codebase-index.json');

async function loadIndex() {
  try {
    const raw = await fsp.readFile(INDEX_FILE, 'utf8').catch(() => null);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to load index:', error.message);
  }
  return null;
}

function shouldIncludeFile(filePath) {
  const rel = path.relative(process.cwd(), filePath);
  if (rel.includes('node_modules') || rel.includes('ai-cache') || rel.includes('ai-metrics'))
    return false;
  return /\.(js|ts|jsx|tsx|py|java|go|rs|md|json|ya?ml)$/i.test(rel);
}

function extractSemanticInfo(filePath, content) {
  const fileName = path.basename(filePath);
  const extension = path.extname(filePath);
  const relativePath = path.relative(process.cwd(), filePath);
  const imports = [];
  const exports = [];
  const functions = [];
  const classes = [];
  const contentLower = content.toLowerCase();
  if (['.js', '.ts', '.jsx', '.tsx'].includes(extension)) {
    const importMatches = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
    importMatches.forEach((match) => {
      const m = match.match(/from\s+['"]([^'"]+)['"]/);
      if (m) imports.push(m[1]);
    });
    const funcMatches = content.match(/(?:function|const|let)\s+(\w+)\s*\(/g) || [];
    funcMatches.forEach((m) => {
      const mm = m.match(/(?:function|const|let)\s+(\w+)\s*\(/);
      if (mm) functions.push(mm[1]);
    });
    const classMatches = content.match(/class\s+(\w+)/g) || [];
    classMatches.forEach((m) => {
      const mm = m.match(/class\s+(\w+)/);
      if (mm) classes.push(mm[1]);
    });
  }
  const keywords = [
    'function',
    'class',
    'import',
    'export',
    'async',
    'await',
    'try',
    'catch',
    'if',
    'for',
    'while',
  ];
  const vector = keywords.map((k) => contentLower.split(k).length - 1);
  return {
    filePath: relativePath,
    fileName,
    extension,
    category: 'other',
    size: content.length,
    lines: content.split('\n').length,
    imports,
    exports,
    functions,
    classes,
    lastModified: fs.statSync(filePath).mtime.toISOString(),
    semanticVector: vector,
    summary: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
  };
}

function normalizeToken(t) {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function addToSemanticMap(map, text, filePath) {
  if (!text) return;
  const tokens = String(text).split(/\W+/).map(normalizeToken).filter(Boolean);
  for (const tok of tokens) {
    if (!map[tok]) map[tok] = [];
    if (!map[tok].includes(filePath)) map[tok].push(filePath);
  }
}

function removeFromSemanticMap(map, filePath) {
  for (const [k, arr] of Object.entries(map)) {
    const i = arr.indexOf(filePath);
    if (i >= 0) {
      arr.splice(i, 1);
      if (arr.length === 0) delete map[k];
    }
  }
}

function addSimhashPrefixes(index, simhex, filePath) {
  const prefixes = [simhex.slice(0, 16), simhex.slice(0, 12), simhex.slice(0, 8)];
  for (const p of prefixes) {
    if (!index.simhashIndex[p]) index.simhashIndex[p] = [];
    if (!index.simhashIndex[p].includes(filePath)) index.simhashIndex[p].push(filePath);
  }
}

function removeFromSimhashIndex(index, filePath) {
  for (const [k, arr] of Object.entries(index.simhashIndex || {})) {
    const i = arr.indexOf(filePath);
    if (i >= 0) {
      arr.splice(i, 1);
      if (arr.length === 0) delete index.simhashIndex[k];
    }
  }
}

async function saveIndex(index) {
  await fsp.mkdir(INDEX_DIR, { recursive: true });
  await fsp.writeFile(INDEX_FILE, JSON.stringify(index, null, 2));
  console.log('Index saved (incremental)');
}

async function main() {
  const index = await loadIndex();
  if (!index) {
    console.error('No existing index found. Run full build first.');
    process.exit(1);
  }
  const last = index.lastIndexedCommit;
  if (!last) {
    console.error('Index missing lastIndexedCommit. Run full build to populate.');
    process.exit(1);
  }
  let changed = [];
  try {
    const out = execSync(`git diff --name-only ${last}..HEAD`, { encoding: 'utf8' }).trim();
    if (out)
      changed = out
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
  } catch (err) {
    console.error('Failed to run git diff:', err.message);
    process.exit(1);
  }
  if (changed.length === 0) {
    console.log('No changed files since', last);
    return;
  }
  console.log('Changed files:', changed.length);

  for (const rel of changed) {
    const full = path.join(process.cwd(), rel);
    if (!shouldIncludeFile(full)) continue;
    if (!fs.existsSync(full)) {
      // file deleted
      if (index.files[rel]) {
        delete index.files[rel];
        removeFromSemanticMap(index.semanticMap, rel);
        removeFromSimhashIndex(index, rel);
        index.totalFiles = Math.max(0, (index.totalFiles || 1) - 1);
      }
      continue;
    }
    try {
      const content = await fsp.readFile(full, 'utf8');
      const info = extractSemanticInfo(full, content);
      // compute simhash using the same algorithm as code-indexer
      // lightweight simhash implemented here (sha256 token hashing)
      const tokens = String(content).split(/\W+/).map(normalizeToken).filter(Boolean);
      const freq = {};
      for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
      const bits = 64;
      const v = new Array(bits).fill(0);
      for (const [tok, w] of Object.entries(freq)) {
        const buf = crypto.createHash('sha256').update(tok).digest();
        for (let i = 0; i < bits; i++) {
          const byteIndex = Math.floor(i / 8);
          const bitIndex = i % 8;
          const bit = (buf[byteIndex] >> bitIndex) & 1;
          v[i] += bit ? w : -w;
        }
      }
      let bigint = 0n;
      for (let i = 0; i < bits; i++) if (v[i] > 0) bigint |= 1n << BigInt(i);
      const simhex = bigint.toString(16).padStart(bits / 4, '0');
      info.simhash = simhex;

      // update index structures
      index.files[rel] = info;
      // update categories
      if (!index.categories[info.category]) index.categories[info.category] = [];
      if (!index.categories[info.category].includes(rel)) index.categories[info.category].push(rel);
      // update semanticMap tokens
      addToSemanticMap(index.semanticMap, info.fileName, rel);
      addToSemanticMap(index.semanticMap, (info.functions || []).join(' '), rel);
      addToSemanticMap(index.semanticMap, (info.classes || []).join(' '), rel);
      addToSemanticMap(index.semanticMap, info.summary, rel);
      // simhash prefixes
      if (!index.simhashIndex) index.simhashIndex = {};
      addSimhashPrefixes(index, simhex, rel);
    } catch (err) {
      console.warn('Failed to update', rel, err.message);
    }
  }

  // update lastIndexed and commit
  try {
    const commit = execSync('git rev-parse --verify HEAD', { encoding: 'utf8' }).trim();
    index.lastIndexed = new Date().toISOString();
    index.lastIndexedCommit = commit;
  } catch (err) {
    console.warn('Could not update lastIndexedCommit:', err?.message || err);
  }

  await saveIndex(index);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
