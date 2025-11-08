#!/usr/bin/env node

import { readdir } from 'fs/promises';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';

const GITHUB_DIR = '.github';
const README_PATH = join(GITHUB_DIR, 'README.md');

// Color schemes
const FOLDER_COLORS = {
  root: 'fill:#FF6F00,stroke:#E65100,stroke-width:3px,color:#fff',
  workflows: 'fill:#2E7D32,stroke:#1B5E20,stroke-width:2px,color:#fff',
  actions: 'fill:#1565C0,stroke:#0D47A1,stroke-width:2px,color:#fff',
  documentation: 'fill:#6A1B9A,stroke:#4A148C,stroke-width:2px,color:#fff',
  issueTemplates: 'fill:#E65100,stroke:#BF360C,stroke-width:2px,color:#fff',
  prTemplates: 'fill:#00838F,stroke:#006064,stroke-width:2px,color:#fff',
};

const FILE_COLORS = {
  workflow: 'fill:#A5D6A7,stroke:#66BB6A,stroke-width:1px',
  action: 'fill:#90CAF9,stroke:#42A5F5,stroke-width:1px',
  documentation: 'fill:#CE93D8,stroke:#AB47BC,stroke-width:1px',
  template: 'fill:#FFCC80,stroke:#FFA726,stroke-width:1px',
  prTemplate: 'fill:#80DEEA,stroke:#26C6DA,stroke-width:1px',
  root: 'fill:#BCAAA4,stroke:#8D6E63,stroke-width:1px',
  copilot: 'fill:#F48FB1,stroke:#EC407A,stroke-width:1px',
  readme: 'fill:#B0BEC5,stroke:#78909C,stroke-width:1px',
};

async function scanDirectory(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const items = { folders: [], files: [] };
  
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      items.folders.push(entry.name);
    } else {
      items.files.push(entry.name);
    }
  }
  
  return items;
}

async function generateMermaidDiagram() {
  let diagram = 'graph TB\n    GitHub[📁 .github/]\n\n';
  let styles = '';
  const nodeIds = new Set();
  
  function createNodeId(path, name) {
    const sanitized = name.replace(/[^a-zA-Z0-9]/g, '_');
    const parts = path.split('/').filter(Boolean);
    const prefix = parts.length > 0 ? parts[parts.length - 1].substring(0, 3) : 'root';
    let nodeId = `${prefix}_${sanitized}`;
    let counter = 1;
    
    while (nodeIds.has(nodeId)) {
      nodeId = `${prefix}_${sanitized}_${counter++}`;
    }
    
    nodeIds.add(nodeId);
    return nodeId;
  }
  
  async function processDirectory(dirPath, parentId, indent = '    ') {
    const items = await scanDirectory(dirPath);
    
    // Process folders first
    for (const folder of items.folders) {
      const folderId = createNodeId(dirPath, folder);
      const fullPath = join(dirPath, folder);
      
      diagram += `${indent}${parentId} --> ${folderId}[📁 ${folder}/]\n`;
      
      // Determine folder color
      let folderColor = FOLDER_COLORS.actions;
      if (folder === 'workflows') folderColor = FOLDER_COLORS.workflows;
      else if (folder === 'documentation') folderColor = FOLDER_COLORS.documentation;
      else if (folder === 'ISSUE_TEMPLATE') folderColor = FOLDER_COLORS.issueTemplates;
      else if (folder === 'PULL_REQUEST_TEMPLATE') folderColor = FOLDER_COLORS.prTemplates;
      
      styles += `    style ${folderId} ${folderColor}\n`;
      
      // Recursively process subdirectory
      await processDirectory(fullPath, folderId, indent + '    ');
    }
    
    // Process files
    for (const file of items.files) {
      const fileId = createNodeId(dirPath, file);
      diagram += `${indent}${parentId} --> ${fileId}[📄 ${file}]\n`;
      
      // Determine file color
      let fileColor = FILE_COLORS.root;
      if (dirPath.includes('workflows')) fileColor = FILE_COLORS.workflow;
      else if (dirPath.includes('actions')) fileColor = FILE_COLORS.action;
      else if (dirPath.includes('documentation')) fileColor = FILE_COLORS.documentation;
      else if (dirPath.includes('ISSUE_TEMPLATE')) fileColor = FILE_COLORS.template;
      else if (dirPath.includes('PULL_REQUEST_TEMPLATE')) fileColor = FILE_COLORS.prTemplate;
      else if (file === 'copilot-instructions.md') fileColor = FILE_COLORS.copilot;
      else if (file === 'README.md') fileColor = FILE_COLORS.readme;
      
      styles += `    style ${fileId} ${fileColor}\n`;
    }
  }
  
  // Start processing from .github directory
  await processDirectory(GITHUB_DIR, 'GitHub');
  
  // Add root styling
  styles = `    style GitHub ${FOLDER_COLORS.root}\n` + styles;
  
  diagram += '\n' + styles;
  
  return diagram;
}

async function updateReadme() {
  const diagram = await generateMermaidDiagram();
  const readme = await readFile(README_PATH, 'utf-8');
  
  // Replace the existing mermaid diagram
  const mermaidRegex = /```mermaid\n[\s\S]*?\n```/;
  const newReadme = readme.replace(mermaidRegex, '```mermaid\n' + diagram + '```');
  
  await writeFile(README_PATH, newReadme, 'utf-8');
  console.log('✅ Diagram updated successfully');
}

// Run the update
updateReadme().catch(error => {
  console.error('❌ Error updating diagram:', error);
  process.exit(1);
});
