#!/usr/bin/env node

/**
 * Codebase Indexer for AI Intelligence Enhancement
 * @fileoverview Creates semantic index of codebase for intelligent context retrieval
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const INDEX_DIR = path.join(__dirname, '../../ai-index');
const INDEX_FILE = path.join(INDEX_DIR, 'codebase-index.json');
// Note: VECTOR_FILE reserved for future semantic vector implementation
// const VECTOR_FILE = path.join(INDEX_DIR, 'semantic-vectors.json');

// File patterns to index
const INCLUDE_PATTERNS = [
  '**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx',
  '**/*.py', '**/*.java', '**/*.go', '**/*.rs',
  '**/*.md', '**/*.json', '**/*.yml', '**/*.yaml'
];

const EXCLUDE_PATTERNS = [
  '**/node_modules/**', '**/dist/**', '**/build/**',
  '**/.git/**', '**/coverage/**', '**/*.min.js',
  '**/ai-cache/**', '**/ai-metrics/**'
];

// Semantic categories for intelligent grouping
const SEMANTIC_CATEGORIES = {
  components: ['component', 'ui', 'view', 'screen', 'page'],
  services: ['service', 'api', 'client', 'provider', 'manager'],
  models: ['model', 'entity', 'schema', 'interface', 'type'],
  utilities: ['util', 'helper', 'tool', 'lib', 'common'],
  config: ['config', 'setting', 'env', 'constant'],
  tests: ['test', 'spec', 'mock', 'fixture'],
  docs: ['readme', 'doc', 'guide', 'tutorial']
};

function shouldIncludeFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);

  // Check exclude patterns
  for (const pattern of EXCLUDE_PATTERNS) {
    if (relativePath.includes(pattern.replace('**/', ''))) {
      return false;
    }
  }

  // Check include patterns
  for (const pattern of INCLUDE_PATTERNS) {
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    if (regex.test(relativePath)) {
      return true;
    }
  }

  return false;
}

function extractSemanticInfo(filePath, content) {
  const fileName = path.basename(filePath);
  const extension = path.extname(filePath);
  const relativePath = path.relative(process.cwd(), filePath);

  // Extract imports/exports for dependency analysis
  const imports = [];
  const exports = [];

  if (['.js', '.ts', '.jsx', '.tsx'].includes(extension)) {
    // Extract import statements
    const importMatches = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
    importMatches.forEach(match => {
      const importPath = match.match(/from\s+['"]([^'"]+)['"]/)[1];
      imports.push(importPath);
    });

    // Extract export statements
    const exportMatches = content.match(/export\s+(?:const|function|class|default)\s+(\w+)/g) || [];
    exportMatches.forEach(match => {
      const exportName = match.match(/export\s+(?:const|function|class|default)\s+(\w+)/)[1];
      exports.push(exportName);
    });
  }

  // Determine semantic category
  let category = 'other';
  const fileNameLower = fileName.toLowerCase();
  const contentLower = content.toLowerCase();

  for (const [cat, keywords] of Object.entries(SEMANTIC_CATEGORIES)) {
    if (keywords.some(keyword =>
      fileNameLower.includes(keyword) ||
      contentLower.includes(keyword)
    )) {
      category = cat;
      break;
    }
  }

  // Extract key functions/classes
  const functions = [];
  const classes = [];

  if (['.js', '.ts', '.jsx', '.tsx'].includes(extension)) {
    const functionMatches = content.match(/(?:function|const|let)\s+(\w+)\s*\(/g) || [];
    functionMatches.forEach(match => {
      const funcName = match.match(/(?:function|const|let)\s+(\w+)\s*\(/)[1];
      functions.push(funcName);
    });

    const classMatches = content.match(/class\s+(\w+)/g) || [];
    classMatches.forEach(match => {
      const className = match.match(/class\s+(\w+)/)[1];
      classes.push(className);
    });
  }

  // Generate simple semantic vector (keyword frequency)
  const keywords = ['function', 'class', 'import', 'export', 'async', 'await', 'try', 'catch', 'if', 'for', 'while'];
  const vector = keywords.map(keyword => (contentLower.split(keyword).length - 1));

  return {
    filePath: relativePath,
    fileName,
    extension,
    category,
    size: content.length,
    lines: content.split('\n').length,
    imports,
    exports,
    functions,
    classes,
    lastModified: fs.statSync(filePath).mtime.toISOString(),
    semanticVector: vector,
    summary: content.substring(0, 500) + (content.length > 500 ? '...' : '')
  };
}

function buildIndex() {
  const index = {
    files: {},
    categories: {},
    dependencies: {},
    semanticMap: {},
    lastIndexed: new Date().toISOString(),
    totalFiles: 0,
    totalSize: 0
  };

  function walkDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walkDirectory(fullPath);
      } else if (stat.isFile() && shouldIncludeFile(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const semanticInfo = extractSemanticInfo(fullPath, content);

          index.files[semanticInfo.filePath] = semanticInfo;
          index.totalFiles++;
          index.totalSize += semanticInfo.size;

          // Group by category
          if (!index.categories[semanticInfo.category]) {
            index.categories[semanticInfo.category] = [];
          }
          index.categories[semanticInfo.category].push(semanticInfo.filePath);

          // Build dependency graph
          semanticInfo.imports.forEach(importPath => {
            if (!index.dependencies[semanticInfo.filePath]) {
              index.dependencies[semanticInfo.filePath] = { imports: [], importedBy: [] };
            }
            index.dependencies[semanticInfo.filePath].imports.push(importPath);
          });

        } catch (error) {
          console.warn(`Failed to index ${fullPath}: ${error.message}`);
        }
      }
    }
  }

  console.log('Building codebase index...');
  walkDirectory(process.cwd());

  // Build reverse dependencies
  for (const [file, deps] of Object.entries(index.dependencies)) {
    deps.imports.forEach(importPath => {
      // Find files that might be imported
      for (const [otherFile, otherDeps] of Object.entries(index.dependencies)) {
        if (otherFile.includes(path.basename(importPath))) {
          if (!otherDeps.importedBy) otherDeps.importedBy = [];
          otherDeps.importedBy.push(file);
        }
      }
    });
  }

  return index;
}

function saveIndex(index) {
  if (!fs.existsSync(INDEX_DIR)) {
    fs.mkdirSync(INDEX_DIR, { recursive: true });
  }

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`Index saved to ${INDEX_FILE}`);
  console.log(`Indexed ${index.totalFiles} files (${(index.totalSize / 1024 / 1024).toFixed(2)} MB)`);
}

function loadIndex() {
  try {
    if (fs.existsSync(INDEX_FILE)) {
      return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('Failed to load index:', error.message);
  }
  return null;
}

function searchIndex(query, category = null, limit = 10) {
  const index = loadIndex();
  if (!index) {
    console.error('No index found. Run indexing first.');
    return [];
  }

  const results = [];
  const queryLower = query.toLowerCase();

  for (const [filePath, fileInfo] of Object.entries(index.files)) {
    if (category && fileInfo.category !== category) continue;

    let score = 0;

    // File name match
    if (fileInfo.fileName.toLowerCase().includes(queryLower)) score += 10;

    // Path match
    if (filePath.toLowerCase().includes(queryLower)) score += 5;

    // Content match in summary
    if (fileInfo.summary.toLowerCase().includes(queryLower)) score += 3;

    // Function/class name match
    if (fileInfo.functions.some(f => f.toLowerCase().includes(queryLower))) score += 8;
    if (fileInfo.classes.some(c => c.toLowerCase().includes(queryLower))) score += 8;

    if (score > 0) {
      results.push({ ...fileInfo, score, filePath });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function main() {
  const command = process.argv[2];

  switch (command) {
    case 'build': {
      const index = buildIndex();
      saveIndex(index);
      break;
    }

    case 'search': {
      const query = process.argv[3];
      const category = process.argv[4];
      if (!query) {
        console.error('Usage: node code-indexer.js search <query> [category]');
        process.exit(1);
      }
      const results = searchIndex(query, category);
      console.log(`Search results for "${query}"${category ? ` in ${category}` : ''}:`);
      results.forEach((result, i) => {
        console.log(`${i + 1}. ${result.filePath} (score: ${result.score})`);
        console.log(`   Category: ${result.category}, Functions: ${result.functions.slice(0, 3).join(', ')}`);
      });
      break;
    }

    case 'stats': {
      const statsIndex = loadIndex();
      if (statsIndex) {
        console.log('Codebase Index Statistics:');
        console.log(`Total files: ${statsIndex.totalFiles}`);
        console.log(`Total size: ${(statsIndex.totalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Last indexed: ${statsIndex.lastIndexed}`);
        console.log('Categories:');
        for (const [cat, files] of Object.entries(statsIndex.categories)) {
          console.log(`  ${cat}: ${files.length} files`);
        }
      } else {
        console.error('No index found. Run "build" first.');
      }
      break;
    }

    default: {
      console.log('Usage:');
      console.log('  node code-indexer.js build    - Build/rebuild the codebase index');
      console.log('  node code-indexer.js search <query> [category] - Search the index');
      console.log('  node code-indexer.js stats    - Show index statistics');
      break;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { buildIndex, searchIndex, loadIndex };
