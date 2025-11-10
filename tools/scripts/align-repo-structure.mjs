#!/usr/bin/env node

/**
 * Complete Repository Structure Alignment Script
 * 
 * Aligns entire repository with canonical file-structure.md v2.4.0
 * Checks and creates all directories and files at every level
 * 
 * @version 1.0.0
 * @see docs/architecture/file-structure.md
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '../..');

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  section: (msg) => console.log(`\n${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}`),
  subsection: (msg) => console.log(`\n${'-'.repeat(70)}\n${msg}\n${'-'.repeat(70)}`),
};

// Complete repository structure from file-structure.md v2.4.0
const REPO_STRUCTURE = {
  // Root directories
  'apps': {
    type: 'dir',
    required: true,
    readme: 'Applications directory - deployable units and services'
  },
  'libs': {
    type: 'dir',
    required: true,
    readme: 'Shared libraries and reusable code'
  },
  'docs': {
    type: 'dir',
    required: true,
    readme: 'Comprehensive project documentation'
  },
  'tools': {
    type: 'dir',
    required: true,
    readme: 'Build tools and development utilities'
  },
  'scripts': {
    type: 'dir',
    required: true,
    readme: 'Automation scripts for development and operations'
  },
  'config': {
    type: 'dir',
    required: true,
    readme: 'Shared configuration files'
  },
  'reports': {
    type: 'dir',
    required: true,
    readme: 'Generated reports and audit results'
  },
  'assets': {
    type: 'dir',
    required: true,
    readme: 'Static assets (images, fonts, etc.)'
  },
  '.github': {
    type: 'dir',
    required: true
  },
  '.vscode': {
    type: 'dir',
    required: true
  },
  '.devcontainer': {
    type: 'dir',
    required: true
  },
  
  // Libs structure
  'libs/shared': {
    type: 'dir',
    required: true,
    children: ['utils', 'types', 'constants', 'config']
  },
  'libs/shared/utils': { type: 'dir', required: true },
  'libs/shared/types': { type: 'dir', required: true },
  'libs/shared/constants': { type: 'dir', required: true },
  'libs/shared/config': { type: 'dir', required: true },
  
  'libs/platform': {
    type: 'dir',
    required: true,
    children: ['auth', 'api-client', 'state', 'routing']
  },
  'libs/platform/auth': { type: 'dir', required: true },
  'libs/platform/api-client': { type: 'dir', required: true },
  'libs/platform/state': { type: 'dir', required: true },
  'libs/platform/routing': { type: 'dir', required: true },
  
  'libs/ui': {
    type: 'dir',
    required: true,
    children: ['components', 'design-system', 'accessibility']
  },
  'libs/ui/components': { type: 'dir', required: true },
  'libs/ui/design-system': { type: 'dir', required: true },
  'libs/ui/accessibility': { type: 'dir', required: true },
  
  'libs/game-engine': {
    type: 'dir',
    required: true,
    children: ['core', 'simulation', 'events']
  },
  'libs/game-engine/core': { type: 'dir', required: true },
  'libs/game-engine/simulation': { type: 'dir', required: true },
  'libs/game-engine/events': { type: 'dir', required: true },
  
  'libs/infrastructure': {
    type: 'dir',
    required: true,
    children: ['database', 'monitoring', 'deployment']
  },
  'libs/infrastructure/database': { type: 'dir', required: true },
  'libs/infrastructure/monitoring': { type: 'dir', required: true },
  'libs/infrastructure/deployment': { type: 'dir', required: true },
  
  // Tools structure
  'tools/scripts': { type: 'dir', required: true },
  'tools/config': { type: 'dir', required: true },
  'tools/docker': { type: 'dir', required: true },
  
  // Scripts structure
  'scripts/ci': { type: 'dir', required: true },
  'scripts/dev': { type: 'dir', required: true },
  'scripts/migrations': { type: 'dir', required: true },
  
  // Config structure
  'config/docker': { type: 'dir', required: true },
  'config/env': { type: 'dir', required: true },
  'config/eslint': { type: 'dir', required: true },
  'config/typescript': { type: 'dir', required: true },
  'config/vitest': { type: 'dir', required: true },
  
  // Docs structure - comprehensive hierarchy
  'docs/00-foundation': {
    type: 'dir',
    required: true,
    children: ['organization', 'standards']
  },
  'docs/00-foundation/organization': { type: 'dir', required: true },
  'docs/00-foundation/standards': { type: 'dir', required: true },
  
  'docs/01-strategy': { type: 'dir', required: true },
  'docs/02-governance': { type: 'dir', required: true },
  'docs/03-legal-and-compliance': { type: 'dir', required: true },
  
  'docs/04-architecture': {
    type: 'dir',
    required: true,
    children: ['adr', 'decisions']
  },
  'docs/04-architecture/adr': { type: 'dir', required: true },
  'docs/04-architecture/decisions': { type: 'dir', required: true },
  
  'docs/05-engineering-and-devops': {
    type: 'dir',
    required: true,
    children: ['development', 'languages', 'ui']
  },
  'docs/05-engineering-and-devops/development': { type: 'dir', required: true },
  'docs/05-engineering-and-devops/languages': { type: 'dir', required: true },
  'docs/05-engineering-and-devops/ui': { type: 'dir', required: true },
  
  'docs/06-security-and-risk': {
    type: 'dir',
    required: true,
    children: ['audits', 'policies']
  },
  'docs/06-security-and-risk/audits': { type: 'dir', required: true },
  'docs/06-security-and-risk/policies': { type: 'dir', required: true },
  
  'docs/07-ai-and-simulation': { type: 'dir', required: true },
  'docs/08-game-design-and-mechanics': { type: 'dir', required: true },
  'docs/09-observability-and-ops': { type: 'dir', required: true },
  'docs/10-user-experience': { type: 'dir', required: true },
  'docs/11-communications-and-brand': { type: 'dir', required: true },
  
  'docs/archive': { type: 'dir', required: true },
  'docs/archive/milestones': { type: 'dir', required: true },
  'docs/templates': { type: 'dir', required: true },
  'docs/examples': { type: 'dir', required: true },
  
  // Reports structure
  'reports/audits': { type: 'dir', required: true },
  'reports/coverage': { type: 'dir', required: true },
  'reports/performance': { type: 'dir', required: true },
  
  // Assets structure
  'assets/images': { type: 'dir', required: true },
  'assets/fonts': { type: 'dir', required: true },
  'assets/icons': { type: 'dir', required: true },
  'assets/audio': { type: 'dir', required: true },
};

// Apps detailed structure
const APPS_STRUCTURE = {
  'api': {
    'src/config': {},
    'src/controllers': {},
    'src/middleware': {},
    'src/routes': {},
    'src/services': {},
    'src/repositories': {},
    'src/validators': {},
    'src/utils': {},
    'src/types': {},
    'openapi': {},
    'openapi/schemas': {},
    'openapi/generated': {},
    'prisma': {},
    'prisma/migrations': {},
    'tests/unit': {},
    'tests/integration': {},
    'tests/fixtures': {},
  },
  'web': {
    'public': {},
    'src/app': {},
    'src/pages': {},
    'src/components/common': {},
    'src/components/layout': {},
    'src/components/features': {},
    'src/hooks': {},
    'src/services': {},
    'src/store': {},
    'src/router': {},
    'src/styles': {},
    'src/utils': {},
    'src/types': {},
    'src/assets/images': {},
    'src/assets/fonts': {},
    'src/assets/icons': {},
    'tests/unit': {},
    'tests/integration': {},
    'tests/e2e': {},
  },
  'game-server': {
    'src/engine': {},
    'src/simulation': {},
    'src/events': {},
    'src/networking': {},
    'src/ai': {},
    'src/utils': {},
    'tests/unit': {},
    'tests/integration': {},
  },
  'worker': {
    'src/jobs': {},
    'src/queues': {},
    'src/utils': {},
    'tests': {},
  },
  'shell': {
    'src/components': {},
    'src/remotes': {},
  },
  'feature-auth-remote': {
    'src/components': {},
    'src/services': {},
  },
  'feature-dashboard-remote': {
    'src/components': {},
    'src/services': {},
  },
  'e2e': {
    'src/api': {},
    'src/web': {},
    'src/smoke': {},
    'fixtures': {},
  },
  'load-test': {
    'src/scenarios': {},
    'src/utils': {},
  },
  'infrastructure': {
    'docker/base-images/node-alpine': {},
    'docker/base-images/nginx-alpine': {},
    'docker/base-images/python-slim': {},
    'kubernetes/base/deployments': {},
    'kubernetes/base/services': {},
    'kubernetes/base/configmaps': {},
    'kubernetes/base/secrets': {},
    'kubernetes/overlays/dev': {},
    'kubernetes/overlays/staging': {},
    'kubernetes/overlays/production': {},
    'kubernetes/monitoring/prometheus': {},
    'kubernetes/monitoring/grafana/dashboards': {},
    'helm/political-sphere/templates': {},
    'helm/political-sphere/charts/monitoring': {},
    'terraform/modules/eks': {},
    'terraform/modules/vpc': {},
    'terraform/modules/rds': {},
    'terraform/modules/s3': {},
    'terraform/modules/ecr': {},
    'terraform/environments/dev': {},
    'terraform/environments/staging': {},
    'terraform/environments/production': {},
    'terraform/global': {},
    'argocd/applications': {},
    'argocd/projects': {},
    'argocd/app-of-apps': {},
    'argocd/secrets': {},
    'argocd/sync-waves': {},
    'ci/github-actions/workflow-templates': {},
    'ci/github-actions/composite-actions': {},
    'ci/scripts': {},
    'scripts/backup': {},
    'scripts/monitoring': {},
    'scripts/maintenance': {},
    'docs/runbooks': {},
    'docs/architecture': {},
    'docs/procedures': {},
  },
  'data-pipeline': {
    'src/connectors': {},
    'src/jobs': {},
    'src/pipelines': {},
    'src/transformers': {},
    'src/types': {},
  },
};

function createDirectory(path) {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
    log.success(`Created: ${path}/`);
    return true;
  }
  return false;
}

function createFile(path, content = '') {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) {
    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(fullPath, content);
    log.success(`Created: ${path}`);
    return true;
  }
  return false;
}

function generateReadmeContent(dirName, description) {
  const title = dirName.split('/').pop().split('-').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
  
  return `# ${title}

${description || 'TODO: Add documentation'}

## Overview

<!-- Describe the purpose of this directory -->

## Contents

<!-- List key files and subdirectories -->

## Usage

<!-- Explain how to use this directory -->

## Related Documentation

- [File Structure](../docs/architecture/file-structure.md)
- [Project README](../README.md)
`;
}

function alignRootStructure() {
  log.section('PHASE 1: Root Directory Structure');
  
  let created = 0;
  
  Object.entries(REPO_STRUCTURE).forEach(([path, config]) => {
    if (config.type === 'dir') {
      const wasCreated = createDirectory(path);
      if (wasCreated) {
        created++;
        
        // Create README if specified
        if (config.readme && !path.startsWith('.')) {
          const readmePath = `${path}/README.md`;
          if (!existsSync(join(ROOT, readmePath))) {
            createFile(readmePath, generateReadmeContent(path, config.readme));
          }
        }
      }
    }
  });
  
  log.info(`Root structure: ${created} directories created`);
  return created;
}

function alignAppsStructure() {
  log.section('PHASE 2: Apps Directory Structure');
  
  let created = 0;
  
  Object.entries(APPS_STRUCTURE).forEach(([appName, structure]) => {
    const appPath = `apps/${appName}`;
    
    if (!existsSync(join(ROOT, appPath))) {
      log.warning(`App does not exist: ${appName} (skipping)`);
      return;
    }
    
    log.subsection(`App: ${appName}`);
    
    Object.keys(structure).forEach(subPath => {
      const fullPath = `${appPath}/${subPath}`;
      if (createDirectory(fullPath)) {
        created++;
      }
    });
  });
  
  log.info(`Apps structure: ${created} directories created`);
  return created;
}

function alignLibsStructure() {
  log.section('PHASE 3: Libs Directory Structure');
  
  const libsStructure = {
    'shared/schemas': {},
    'shared/validators': {},
    'shared/errors': {},
    'shared/logging': {},
    
    'platform/websocket': {},
    'platform/cache': {},
    'platform/queue': {},
    
    'ui/hooks': {},
    'ui/utils': {},
    'ui/theme': {},
    
    'game-engine/ai': {},
    'game-engine/rules': {},
    'game-engine/validation': {},
    
    'infrastructure/logging': {},
    'infrastructure/metrics': {},
    'infrastructure/tracing': {},
    
    'domain-election': {},
    'domain-election/models': {},
    'domain-election/services': {},
    
    'domain-governance': {},
    'domain-governance/models': {},
    'domain-governance/services': {},
    
    'domain-legislation': {},
    'domain-legislation/models': {},
    'domain-legislation/services': {},
    
    'data-user': {},
    'data-user/models': {},
    'data-user/repositories': {},
    
    'data-game-state': {},
    'data-game-state/models': {},
    'data-game-state/repositories': {},
    
    'feature-flags': {},
    'i18n': {},
    'i18n/locales': {},
    'i18n/locales/en': {},
    'i18n/locales/cy': {},
    
    'observability': {},
    'observability/logging': {},
    'observability/metrics': {},
    'observability/tracing': {},
    
    'testing': {},
    'testing/fixtures': {},
    'testing/mocks': {},
    'testing/utils': {},
  };
  
  let created = 0;
  
  Object.keys(libsStructure).forEach(libPath => {
    const fullPath = `libs/${libPath}`;
    if (createDirectory(fullPath)) {
      created++;
    }
  });
  
  log.info(`Libs structure: ${created} directories created`);
  return created;
}

function alignToolsStructure() {
  log.section('PHASE 4: Tools Directory Structure');
  
  const toolsStructure = {
    'scripts/ai': {},
    'scripts/build': {},
    'scripts/test': {},
    'scripts/deploy': {},
    'config/prettier': {},
    'config/jest': {},
    'config/webpack': {},
    'docker/dev': {},
    'docker/prod': {},
    'generators': {},
    'generators/app': {},
    'generators/lib': {},
  };
  
  let created = 0;
  
  Object.keys(toolsStructure).forEach(toolPath => {
    const fullPath = `tools/${toolPath}`;
    if (createDirectory(fullPath)) {
      created++;
    }
  });
  
  log.info(`Tools structure: ${created} directories created`);
  return created;
}

function alignScriptsStructure() {
  log.section('PHASE 5: Scripts Directory Structure');
  
  const scriptsStructure = {
    'ci/lint': {},
    'ci/test': {},
    'ci/build': {},
    'ci/deploy': {},
    'dev/setup': {},
    'dev/seed': {},
    'dev/cleanup': {},
    'migrations/data': {},
    'migrations/schema': {},
    'ops': {},
    'ops/backup': {},
    'ops/restore': {},
  };
  
  let created = 0;
  
  Object.keys(scriptsStructure).forEach(scriptPath => {
    const fullPath = `scripts/${scriptPath}`;
    if (createDirectory(fullPath)) {
      created++;
    }
  });
  
  log.info(`Scripts structure: ${created} directories created`);
  return created;
}

function alignConfigStructure() {
  log.section('PHASE 6: Config Directory Structure');
  
  const configStructure = {
    'docker/compose': {},
    'env/development': {},
    'env/staging': {},
    'env/production': {},
    'eslint/rules': {},
    'typescript/configs': {},
    'vitest/configs': {},
  };
  
  let created = 0;
  
  Object.keys(configStructure).forEach(configPath => {
    const fullPath = `config/${configPath}`;
    if (createDirectory(fullPath)) {
      created++;
    }
  });
  
  log.info(`Config structure: ${created} directories created`);
  return created;
}

function alignReportsStructure() {
  log.section('PHASE 7: Reports Directory Structure');
  
  const reportsStructure = {
    'audits/security': {},
    'audits/accessibility': {},
    'audits/performance': {},
    'coverage/unit': {},
    'coverage/integration': {},
    'coverage/e2e': {},
    'performance/benchmarks': {},
    'performance/profiling': {},
    'metrics': {},
    'logs': {},
  };
  
  let created = 0;
  
  Object.keys(reportsStructure).forEach(reportPath => {
    const fullPath = `reports/${reportPath}`;
    if (createDirectory(fullPath)) {
      created++;
    }
  });
  
  log.info(`Reports structure: ${created} directories created`);
  return created;
}

function validateStructure() {
  log.section('PHASE 8: Structure Validation');
  
  const issues = [];
  
  // Check all expected directories exist
  Object.entries(REPO_STRUCTURE).forEach(([path, config]) => {
    if (config.required && !existsSync(join(ROOT, path))) {
      issues.push({ type: 'missing-dir', path });
    }
  });
  
  // Check apps
  Object.keys(APPS_STRUCTURE).forEach(appName => {
    const appPath = `apps/${appName}`;
    if (!existsSync(join(ROOT, appPath))) {
      issues.push({ type: 'missing-app', path: appPath });
    }
  });
  
  if (issues.length === 0) {
    log.success('✨ Repository structure is fully compliant!');
  } else {
    log.warning(`Found ${issues.length} issues:`);
    issues.forEach(issue => {
      log.warning(`  ${issue.type}: ${issue.path}`);
    });
  }
  
  return issues;
}

function generateSummary(stats) {
  log.section('SUMMARY');
  
  const total = Object.values(stats).reduce((sum, val) => sum + val, 0);
  
  console.log('\n📊 Structure Alignment Results:\n');
  console.log(`  Root directories:     ${stats.root} created`);
  console.log(`  Apps structure:       ${stats.apps} created`);
  console.log(`  Libs structure:       ${stats.libs} created`);
  console.log(`  Tools structure:      ${stats.tools} created`);
  console.log(`  Scripts structure:    ${stats.scripts} created`);
  console.log(`  Config structure:     ${stats.config} created`);
  console.log(`  Reports structure:    ${stats.reports} created`);
  console.log(`  ${'-'.repeat(40)}`);
  console.log(`  TOTAL:                ${total} directories created\n`);
  
  if (total > 0) {
    log.success(`✅ Created ${total} new directories!`);
    log.info('Review changes and commit when ready.');
  } else {
    log.success('✅ Repository structure already compliant!');
  }
}

function main() {
  log.section('Complete Repository Structure Alignment');
  log.info('Aligning entire repository with file-structure.md v2.4.0\n');
  
  const stats = {
    root: alignRootStructure(),
    apps: alignAppsStructure(),
    libs: alignLibsStructure(),
    tools: alignToolsStructure(),
    scripts: alignScriptsStructure(),
    config: alignConfigStructure(),
    reports: alignReportsStructure(),
  };
  
  validateStructure();
  generateSummary(stats);
}

main();
