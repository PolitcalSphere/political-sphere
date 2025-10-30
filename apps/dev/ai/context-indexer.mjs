#!/usr/bin/env node

/**
 * Builds a high-signal context index for AI assistants.
 * Extracts metadata from Markdown sources so prompts can link to canonical facts quickly.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');
const docsRoot = join(repoRoot, 'docs');
const outputDir = join(repoRoot, 'ai-cache');
const outputPath = join(outputDir, 'context-index.json');

const isMarkdown = (name) => name.toLowerCase().endsWith('.md');

const safeReadJson = async (filePath, fallback) => {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
};

const walkDocs = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const items = [];

  for (const entry of entries) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      items.push(...(await walkDocs(entryPath)));
    } else if (entry.isFile() && isMarkdown(entry.name)) {
      items.push(entryPath);
    }
  }

  return items;
};

const extractTableMetadata = (lines, tableHeader) => {
  const headerIndex = lines.findIndex((line) => line.includes(tableHeader));
  if (headerIndex === -1) {
    return null;
  }

  const dataRowIndex = headerIndex + 2;
  if (!lines[dataRowIndex]) {
    return null;
  }

  const cells = lines[dataRowIndex]
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);

  if (cells.length < 5) {
    return null;
  }

  return {
    classification: cells[0],
    version: cells[1],
    lastUpdated: cells[2],
    owner: cells[3],
    reviewCycle: cells[4],
  };
};

const summarizeContent = (lines) => {
  const summaryLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('>')) {
      continue;
    }

    summaryLines.push(trimmed);
    if (summaryLines.length === 2) {
      break;
    }
  }

  return summaryLines.join(' ');
};

const buildContextIndex = async () => {
  const markdownFiles = await walkDocs(docsRoot);
  const previousIndex = await safeReadJson(outputPath, { documents: [] });
  const previousDocs = new Map(
    (previousIndex?.documents ?? []).map((doc) => [doc.path, doc])
  );

  const classificationCounts = {};
  const docEntries = await Promise.all(
    markdownFiles.map(async (filePath) => {
      const fileStat = await stat(filePath);
      const relativePath = relative(repoRoot, filePath);
      const modifiedAt = fileStat.mtime.toISOString();
      const previousDoc = previousDocs.get(relativePath);

      if (previousDoc && previousDoc.modifiedAt === modifiedAt) {
        return {
          doc: {
            ...previousDoc,
            modifiedAt,
            size: fileStat.size,
          },
        };
      }

      const content = await readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const titleLine = lines.find((line) => line.startsWith('# ')) ?? '';
      const title = titleLine.replace(/^#\s+/, '').trim() || '(untitled)';
      const summary = summarizeContent(lines);
      const metadata = extractTableMetadata(lines, 'Classification');

      return {
        doc: {
          path: relativePath,
          title,
          summary,
          classification: metadata?.classification ?? 'Unknown',
          version: metadata?.version ?? 'N/A',
          lastUpdated: metadata?.lastUpdated ?? 'N/A',
          owner: metadata?.owner ?? 'N/A',
          reviewCycle: metadata?.reviewCycle ?? 'N/A',
          modifiedAt,
          size: fileStat.size,
        },
      };
    })
  );

  const documents = docEntries.map(({ doc }) => {
    const classification = doc.classification ?? 'Unknown';
    classificationCounts[classification] =
      (classificationCounts[classification] ?? 0) + 1;
    return doc;
  });

  documents.sort((a, b) => a.path.localeCompare(b.path));

  const index = {
    generatedAt: new Date().toISOString(),
    totals: {
      documents: documents.length,
      classifications: classificationCounts,
    },
    documents,
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(index, null, 2));

  return index;
};

const main = async () => {
  console.log('📚 Building AI context index from documentation...');
  const index = await buildContextIndex();
  console.log(`✅ Indexed ${index.totals.documents} documents`);
  console.log(`🔎 Classification coverage: ${Object.keys(index.totals.classifications).join(', ')}`);
};

main().catch((error) => {
  console.error(`❌ Context indexing failed: ${error.message}`);
  process.exit(1);
});
