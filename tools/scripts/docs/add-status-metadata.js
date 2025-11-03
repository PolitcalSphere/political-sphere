#!/usr/bin/env node
/**
 * Add status field to documentation files
 * This script systematically adds Status metadata to all documentation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Status mapping based on document characteristics
const DEFAULT_STATUS = 'Draft';
const STATUS_MAPPING = {
  // Operational/Active documents
  'INCIDENT-RESPONSE-PLAN': 'Published',
  'DISASTER-RECOVERY-RUNBOOK': 'Published',
  'SECURITY-AUDIT-SUMMARY': 'Published',
  'PRODUCTION-READINESS-CHECKLIST': 'Published',

  // Templates and guidelines
  template: 'Approved',
  README: 'Approved',

  // Audit and review documents
  AUDIT: 'Published',
  REMEDIATION: 'Published',

  // Policy documents
  policy: 'Approved',
  workflow: 'Approved',

  // Strategic documents
  strategy: 'Draft',
  roadmap: 'Draft',
  okrs: 'Draft',

  // Architecture decisions
  'adr-': 'Approved',
  decision: 'Approved',
};

function determineStatus(filePath) {
  const fileName = path.basename(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf8');

  // Check specific patterns
  for (const [pattern, status] of Object.entries(STATUS_MAPPING)) {
    if (fileName.includes(pattern.toLowerCase())) {
      return status;
    }
  }

  // Check if document appears complete
  if (content.length > 5000 && content.includes('##') && content.includes('###')) {
    return 'Approved';
  }

  // Check if it's a placeholder or very short
  if (content.length < 500 || content.includes('TODO') || content.includes('[TBD]')) {
    return 'Draft';
  }

  return DEFAULT_STATUS;
}

function hasMetadataTable(content) {
  return (
    content.includes('Classification') &&
    content.includes('Version') &&
    content.includes('Last Updated')
  );
}

function hasStatusColumn(content) {
  return (
    content.includes('Status') &&
    (content.includes('Draft') ||
      content.includes('Review') ||
      content.includes('Approved') ||
      content.includes('Published'))
  );
}

function addStatusToMetadataTable(content, status) {
  // Find the metadata table and add Status column
  const lines = content.split('\n');
  let inTable = false;
  let tableHeaderIndex = -1;
  let tableSeparatorIndex = -1;
  let tableDataIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      line.includes('Classification') &&
      line.includes('Version') &&
      line.includes('Last Updated')
    ) {
      tableHeaderIndex = i;
      inTable = true;
    } else if (inTable && line.match(/^\s*\|[\s:|-]+\|[\s:|-]+\|/)) {
      tableSeparatorIndex = i;
    } else if (
      inTable &&
      tableSeparatorIndex > -1 &&
      line.includes('|') &&
      !line.match(/^[\s|:-]+$/)
    ) {
      tableDataIndex = i;
      break;
    }
  }

  if (tableHeaderIndex > -1 && tableSeparatorIndex > -1 && tableDataIndex > -1) {
    // Add Status to header
    lines[tableHeaderIndex] = lines[tableHeaderIndex].replace(/\|\s*$/, '|   Status   |');

    // Add separator
    lines[tableSeparatorIndex] = lines[tableSeparatorIndex].replace(/\|\s*$/, '| :--------: |');

    // Add status value
    lines[tableDataIndex] = lines[tableDataIndex].replace(/\|\s*$/, `| **${status}** |`);

    return lines.join('\n');
  }

  return content;
}

function createMetadataTable(status) {
  const today = new Date().toISOString().split('T')[0];
  return `
<div align="center">

| Classification | Version | Last Updated |       Owner        | Review Cycle |   Status   |
| :------------: | :-----: | :----------: | :----------------: | :----------: | :--------: |
|  🔒 Internal   | \`0.1.0\` |  ${today}  | Documentation Team |  Quarterly   | **${status}** |

</div>

---
`;
}

function processFile(filePath) {
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  const status = determineStatus(filePath);

  if (hasStatusColumn(content)) {
    console.log(`  ✅ Already has status`);
    return false;
  }

  if (hasMetadataTable(content)) {
    console.log(`  ⚠️  Adding Status column (${status})`);
    content = addStatusToMetadataTable(content, status);
  } else {
    console.log(`  ❌ Adding complete metadata table (${status})`);

    // Find the first heading or content after frontmatter
    const lines = content.split('\n');
    let insertIndex = 0;

    // Skip any frontmatter
    if (lines[0] === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') {
          insertIndex = i + 1;
          break;
        }
      }
    }

    // Find first heading
    for (let i = insertIndex; i < lines.length; i++) {
      if (lines[i].startsWith('#')) {
        insertIndex = i + 1;
        break;
      }
    }

    // Insert metadata table after first heading
    const before = lines.slice(0, insertIndex).join('\n');
    const after = lines.slice(insertIndex).join('\n');
    content = before + '\n' + createMetadataTable(status) + '\n' + after;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ Updated`);
  return true;
}

function findMarkdownFiles(dir) {
  const files = [];

  function traverse(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files.sort();
}

// Main execution
console.log('🔍 Finding all documentation files...\n');

const docsDir = path.join(path.dirname(__dirname), '..', 'docs');
const files = findMarkdownFiles(docsDir);

console.log(`Found ${files.length} markdown files\n`);
console.log('📝 Processing files...\n');

let updated = 0;
let skipped = 0;

for (const file of files) {
  const wasUpdated = processFile(file);
  if (wasUpdated) {
    updated++;
  } else {
    skipped++;
  }
  console.log('');
}

console.log('\n✅ Complete!');
console.log(`   Updated: ${updated}`);
console.log(`   Skipped: ${skipped}`);
console.log(`   Total: ${files.length}`);
