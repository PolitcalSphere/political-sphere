#!/usr/bin/env node

/**
 * Context Preloader for AI Intelligence Enhancement
 * @fileoverview Pre-loads common development contexts for faster AI responses
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre-defined contexts for common development tasks
const PREDEFINED_CONTEXTS = {
  'new-component': {
    description: 'Creating a new React component',
    files: [
      'libs/ui/src/components/README.md',
      'libs/ui/src/components/index.ts',
      'package.json',
      'tsconfig.base.json'
    ],
    patterns: [
      'export.*from.*components',
      'React\\.FC',
      'interface.*Props',
      'styled-components'
    ],
    knowledge: [
      'architecturalPatterns.boundedContexts',
      'bestPractices.codeStyle',
      'commonIssues.accessibility'
    ]
  },
  'api-endpoint': {
    description: 'Adding a new API endpoint',
    files: [
      'apps/api/src/main.ts',
      'apps/api/src/app.module.ts',
      'libs/platform/src/api/README.md',
      'nx.json'
    ],
    patterns: [
      '@Controller',
      '@Get\\|@Post\\|@Put\\|@Delete',
      'DTO',
      'validation'
    ],
    knowledge: [
      'architecturalPatterns.moduleBoundaries',
      'bestPractices.errorHandling',
      'developmentWorkflow.ci'
    ]
  },
  'database-migration': {
    description: 'Creating a database migration',
    files: [
      'scripts/migrate/README.md',
      'package.json',
      'nx.json'
    ],
    patterns: [
      'migration',
      'up\\|down',
      'schema',
      'alter table'
    ],
    knowledge: [
      'developmentWorkflow.branching',
      'bestPractices.documentation',
      'performancePatterns.monitoring'
    ]
  },
  'test-writing': {
    description: 'Writing unit or integration tests',
    files: [
      'jest.preset.js',
      'jest.setup.js',
      'libs/testing/src/README.md'
    ],
    patterns: [
      'describe\\|it\\|test',
      'expect',
      'mock',
      'TestingLibrary'
    ],
    knowledge: [
      'bestPractices.testing',
      'architecturalPatterns.boundedContexts',
      'commonIssues.testing'
    ]
  },
  'ci-pipeline': {
    description: 'Modifying CI/CD pipelines',
    files: [
      '.github/workflows/ci.yml',
      'scripts/ci/README.md',
      'Makefile'
    ],
    patterns: [
      'workflow_dispatch',
      'push\\|pull_request',
      'run:',
      'uses:'
    ],
    knowledge: [
      'developmentWorkflow.ci',
      'architecturalPatterns.security',
      'performancePatterns.optimization'
    ]
  }
};

function loadKnowledgeBase() {
  try {
    const kbPath = path.join(__dirname, '../../ai-knowledge/knowledge-base.json');
    return JSON.parse(fs.readFileSync(kbPath, 'utf8'));
  } catch (error) {
    console.warn('Failed to load knowledge base:', error.message);
    return {};
  }
}

function loadIndex() {
  try {
    const indexPath = path.join(__dirname, '../../ai-index/codebase-index.json');
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch (error) {
    console.warn('Failed to load index:', error.message);
    return { files: {} };
  }
}

function extractRelevantContent(filePath, patterns) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relevantLines = [];

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const lineLower = line.toLowerCase();
      if (patterns.some(pattern => lineLower.includes(pattern.toLowerCase()))) {
        // Include context around the matching line
        const start = Math.max(0, index - 2);
        const end = Math.min(lines.length, index + 3);
        for (let i = start; i < end; i++) {
          if (!relevantLines.includes(lines[i])) {
            relevantLines.push(lines[i]);
          }
        }
      }
    });

    return relevantLines.slice(0, 20); // Limit to prevent context bloat
  } catch (error) {
    console.warn(`Failed to extract content from ${filePath}:`, error.message);
    return [];
  }
}

function buildContext(contextName) {
  const context = PREDEFINED_CONTEXTS[contextName];
  if (!context) {
    console.error(`Unknown context: ${contextName}`);
    return null;
  }

  const knowledgeBase = loadKnowledgeBase();
  const index = loadIndex();

  const contextData = {
    name: contextName,
    description: context.description,
    timestamp: new Date().toISOString(),
    files: {},
    knowledge: {},
    patterns: context.patterns
  };

  // Extract relevant file content
  context.files.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const relevantContent = extractRelevantContent(filePath, context.patterns);
      if (relevantContent.length > 0) {
        contextData.files[filePath] = relevantContent;
      }
    }
  });

  // Extract relevant knowledge
  context.knowledge.forEach(knowledgePath => {
    const keys = knowledgePath.split('.');
    let value = knowledgeBase;
    for (const key of keys) {
      value = value?.[key];
    }
    if (value) {
      contextData.knowledge[knowledgePath] = value;
    }
  });

  // Find related files from index
  const relatedFiles = [];
  for (const [filePath, fileInfo] of Object.entries(index.files || {})) {
    if (context.patterns.some(pattern =>
      fileInfo.functions?.some(f => f.toLowerCase().includes(pattern.toLowerCase())) ||
      fileInfo.classes?.some(c => c.toLowerCase().includes(pattern.toLowerCase())) ||
      fileInfo.summary?.toLowerCase().includes(pattern.toLowerCase())
    )) {
      relatedFiles.push({
        path: filePath,
        category: fileInfo.category,
        functions: fileInfo.functions?.slice(0, 3),
        classes: fileInfo.classes?.slice(0, 3)
      });
    }
  }
  contextData.relatedFiles = relatedFiles.slice(0, 10);

  return contextData;
}

function saveContext(contextName, contextData) {
  const contextDir = path.join(__dirname, '../../ai-cache/contexts');
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }

  const contextPath = path.join(contextDir, `${contextName}.json`);
  fs.writeFileSync(contextPath, JSON.stringify(contextData, null, 2));
  console.log(`Context saved: ${contextPath}`);
}

function loadContext(contextName) {
  const contextPath = path.join(__dirname, '../../ai-cache/contexts', `${contextName}.json`);
  try {
    return JSON.parse(fs.readFileSync(contextPath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function preLoadAllContexts() {
  console.log('Pre-loading all predefined contexts...');
  let loaded = 0;

  for (const contextName of Object.keys(PREDEFINED_CONTEXTS)) {
    const contextData = buildContext(contextName);
    if (contextData) {
      saveContext(contextName, contextData);
      loaded++;
    }
  }

  console.log(`Pre-loaded ${loaded} contexts`);
}

function main() {
  const command = process.argv[2];
  const contextName = process.argv[3];

  switch (command) {
    case 'preload': {
      preLoadAllContexts();
      break;
    }

    case 'build': {
      if (!contextName) {
        console.error('Usage: node context-preloader.js build <context-name>');
        console.log('Available contexts:', Object.keys(PREDEFINED_CONTEXTS).join(', '));
        process.exit(1);
      }
      const contextData = buildContext(contextName);
      if (contextData) {
        saveContext(contextName, contextData);
        console.log(`Built context: ${contextName}`);
      }
      break;
    }

    case 'list': {
      console.log('Available contexts:');
      Object.entries(PREDEFINED_CONTEXTS).forEach(([name, info]) => {
        console.log(`  ${name}: ${info.description}`);
      });
      break;
    }

    case 'show': {
      if (!contextName) {
        console.error('Usage: node context-preloader.js show <context-name>');
        process.exit(1);
      }
      const loadedContext = loadContext(contextName);
      if (loadedContext) {
        console.log(JSON.stringify(loadedContext, null, 2));
      } else {
        console.log(`Context not found: ${contextName}`);
      }
      break;
    }

    default: {
      console.log('Usage:');
      console.log('  node context-preloader.js preload    - Pre-load all contexts');
      console.log('  node context-preloader.js build <name> - Build specific context');
      console.log('  node context-preloader.js list       - List available contexts');
      console.log('  node context-preloader.js show <name> - Show context content');
      break;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { buildContext, loadContext, PREDEFINED_CONTEXTS };
