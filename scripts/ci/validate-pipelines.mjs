#!/usr/bin/env node
/**
 * CI/CD Pipeline Configuration Validator
 * 
 * Validates GitHub Actions workflows for:
 * - Security best practices
 * - Required quality gates
 * - Proper secret handling
 * - Compliance requirements
 * - Performance optimization
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

const WORKFLOWS_DIR = '.github/workflows';
const REQUIRED_WORKFLOWS = [
  'ci.yml',
  'security.yml',
  'deploy.yml',
  'e2e.yml'
];

const REQUIRED_SECURITY_SCANS = [
  'gitleaks',
  'npm audit',
  'trivy',
  'codeql',
  'semgrep'
];

const REQUIRED_QUALITY_GATES = [
  'lint',
  'typecheck',
  'test',
  'accessibility',
  'import-boundaries'
];

class ValidationResult {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  addError(message, file = null) {
    this.errors.push({ message, file, severity: 'error' });
  }

  addWarning(message, file = null) {
    this.warnings.push({ message, file, severity: 'warning' });
  }

  addInfo(message, file = null) {
    this.info.push({ message, file, severity: 'info' });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  print() {
    console.log('\n📋 CI/CD Pipeline Validation Report\n');
    console.log('━'.repeat(80));

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach(({ message, file }) => {
        console.log(`  • ${message}${file ? ` (${file})` : ''}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach(({ message, file }) => {
        console.log(`  • ${message}${file ? ` (${file})` : ''}`);
      });
    }

    if (this.info.length > 0) {
      console.log('\n ℹ️  INFO:');
      this.info.forEach(({ message, file }) => {
        console.log(`  • ${message}${file ? ` (${file})` : ''}`);
      });
    }

    console.log('\n' + '━'.repeat(80));
    console.log(`\n📊 Summary: ${this.errors.length} errors, ${this.warnings.length} warnings, ${this.info.length} info\n`);

    return !this.hasErrors();
  }
}

class PipelineValidator {
  constructor() {
    this.result = new ValidationResult();
    this.workflows = new Map();
  }

  // Load all workflow files
  loadWorkflows() {
    try {
      const files = readdirSync(WORKFLOWS_DIR);
      const ymlFiles = files.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

      for (const file of ymlFiles) {
        const filePath = join(WORKFLOWS_DIR, file);
        try {
          const content = readFileSync(filePath, 'utf8');
          const workflow = parseYaml(content);
          this.workflows.set(file, workflow);
          this.result.addInfo(`Loaded workflow: ${file}`);
        } catch (err) {
          this.result.addError(`Failed to parse workflow: ${err.message}`, file);
        }
      }
    } catch (err) {
      this.result.addError(`Failed to read workflows directory: ${err.message}`);
    }
  }

  // Validate required workflows exist
  validateRequiredWorkflows() {
    for (const required of REQUIRED_WORKFLOWS) {
      if (!this.workflows.has(required)) {
        this.result.addError(`Required workflow missing: ${required}`);
      }
    }
  }

  // Validate security scanning coverage
  validateSecurityScans() {
    const allWorkflowContent = Array.from(this.workflows.values())
      .map(w => JSON.stringify(w))
      .join(' ');

    for (const scan of REQUIRED_SECURITY_SCANS) {
      if (!allWorkflowContent.includes(scan)) {
        this.result.addError(`Required security scan missing: ${scan}`);
      }
    }
  }

  // Validate quality gates are enforced
  validateQualityGates() {
    const ciWorkflow = this.workflows.get('ci.yml');
    if (!ciWorkflow) return;

    const workflowStr = JSON.stringify(ciWorkflow);

    for (const gate of REQUIRED_QUALITY_GATES) {
      if (!workflowStr.includes(gate)) {
        this.result.addWarning(`Quality gate may be missing: ${gate}`, 'ci.yml');
      }
    }
  }

  // Check for hardcoded secrets
  validateNoHardcodedSecrets() {
    for (const [file, workflow] of this.workflows) {
      const content = JSON.stringify(workflow);

      // Check for common secret patterns
      const secretPatterns = [
        /password\s*[:=]\s*['"][^'"]+['"]/i,
        /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
        /token\s*[:=]\s*['"][^'"]+['"]/i,
        /secret\s*[:=]\s*['"][^'"]+['"]/i,
        /aws[_-]?access[_-]?key/i
      ];

      for (const pattern of secretPatterns) {
        if (pattern.test(content) && !content.includes('secrets.')) {
          this.result.addError(`Potential hardcoded secret detected`, file);
          break;
        }
      }
    }
  }

  // Validate proper secret handling
  validateSecretHandling() {
    for (const [file, workflow] of this.workflows) {
      const content = JSON.stringify(workflow);

      // Ensure secrets are accessed via ${{ secrets.* }}
      if (content.includes('secrets.')) {
        // Good - using GitHub secrets

        // Check for secrets in logs
        if (content.includes('echo') && content.includes('secrets.')) {
          this.result.addWarning(`Potential secret exposure in logs`, file);
        }
      }

      // Check for OIDC usage (preferred over long-lived secrets)
      if (file === 'deploy.yml' || file === 'deploy-canary.yml') {
        if (!content.includes('id-token: write')) {
          this.result.addWarning(`Consider using OIDC for deployments`, file);
        }
      }
    }
  }

  // Validate SBOM generation
  validateSBOM() {
    const deployWorkflows = ['deploy.yml', 'deploy-canary.yml'];
    
    for (const workflowFile of deployWorkflows) {
      const workflow = this.workflows.get(workflowFile);
      if (!workflow) continue;

      const content = JSON.stringify(workflow);
      if (!content.includes('sbom')) {
        this.result.addError(`SBOM generation missing`, workflowFile);
      }
    }
  }

  // Validate accessibility testing
  validateAccessibilityTesting() {
    const ciWorkflow = this.workflows.get('ci.yml');
    if (!ciWorkflow) return;

    const content = JSON.stringify(ciWorkflow);
    if (!content.includes('accessibility') && !content.includes('a11y')) {
      this.result.addError(`Accessibility testing missing`, 'ci.yml');
    }
  }

  // Validate test coverage requirements
  validateTestCoverage() {
    const ciWorkflow = this.workflows.get('ci.yml');
    if (!ciWorkflow) return;

    const content = JSON.stringify(ciWorkflow);

    // Check for coverage reporting
    if (!content.includes('coverage')) {
      this.result.addWarning(`Test coverage reporting not configured`, 'ci.yml');
    }

    // Check for coverage upload (Codecov, etc.)
    if (!content.includes('codecov') && !content.includes('coveralls')) {
      this.result.addWarning(`Coverage upload not configured`, 'ci.yml');
    }
  }

  // Validate deployment safeguards
  validateDeploymentSafeguards() {
    const deployWorkflows = ['deploy.yml', 'deploy-canary.yml'];

    for (const workflowFile of deployWorkflows) {
      const workflow = this.workflows.get(workflowFile);
      if (!workflow) continue;

      // Check for environment protection
      const hasEnvironment = JSON.stringify(workflow).includes('environment:');
      if (!hasEnvironment) {
        this.result.addWarning(`No environment protection configured`, workflowFile);
      }

      // Check for health checks
      const hasHealthChecks = JSON.stringify(workflow).includes('health');
      if (!hasHealthChecks) {
        this.result.addError(`Health checks missing from deployment`, workflowFile);
      }

      // Check for rollback capability
      const hasRollback = JSON.stringify(workflow).includes('rollback');
      if (!hasRollback) {
        this.result.addWarning(`Rollback capability not explicitly defined`, workflowFile);
      }

      // Check for smoke tests
      const hasSmokeTests = JSON.stringify(workflow).includes('smoke');
      if (!hasSmokeTests) {
        this.result.addWarning(`Smoke tests missing from deployment`, workflowFile);
      }
    }
  }

  // Validate observability integration
  validateObservability() {
    for (const [file, workflow] of this.workflows) {
      const content = JSON.stringify(workflow);

      // Check for metrics/traces
      if (file.startsWith('deploy') || file === 'ci.yml') {
        const hasObservability = 
          content.includes('otel') || 
          content.includes('metrics') || 
          content.includes('tracing');
        
        if (!hasObservability) {
          this.result.addWarning(`Observability integration missing`, file);
        }
      }
    }
  }

  // Validate caching strategy
  validateCaching() {
    for (const [file, workflow] of this.workflows) {
      const content = JSON.stringify(workflow);

      // Check for dependency caching
      if (content.includes('npm ci') || content.includes('npm install')) {
        if (!content.includes('cache:')) {
          this.result.addWarning(`Dependency caching not configured`, file);
        }
      }

      // Check for build caching (Docker)
      if (content.includes('docker build') || content.includes('docker/build-push-action')) {
        if (!content.includes('cache-from') && !content.includes('cache-to')) {
          this.result.addWarning(`Docker build caching not configured`, file);
        }
      }
    }
  }

  // Validate performance optimization
  validatePerformance() {
    for (const [file, workflow] of this.workflows) {
      const content = JSON.stringify(workflow);

      // Check for parallel execution
      if (file === 'ci.yml') {
        const jobs = workflow.jobs || {};
        const jobNames = Object.keys(jobs);

        // Check if jobs have dependencies that could be parallelized
        let hasParallelJobs = false;
        for (const jobName of jobNames) {
          const job = jobs[jobName];
          if (!job.needs || job.needs.length === 0) {
            hasParallelJobs = true;
            break;
          }
        }

        if (!hasParallelJobs) {
          this.result.addInfo(`Consider parallelizing independent jobs`, file);
        }
      }

      // Check for timeout configuration
      if (!content.includes('timeout-minutes')) {
        this.result.addInfo(`Consider adding timeout-minutes to prevent hung jobs`, file);
      }
    }
  }

  // Validate compliance requirements
  validateCompliance() {
    // Check for audit logging
    const hasAuditLogging = Array.from(this.workflows.values())
      .some(w => JSON.stringify(w).includes('audit') || JSON.stringify(w).includes('log'));

    if (!hasAuditLogging) {
      this.result.addWarning(`Audit logging not explicitly configured`);
    }

    // Check for GDPR/CCPA compliance checks
    const securityWorkflow = this.workflows.get('security.yml');
    if (securityWorkflow) {
      const content = JSON.stringify(securityWorkflow);
      if (!content.includes('GDPR') && !content.includes('compliance')) {
        this.result.addInfo(`Consider adding GDPR/CCPA compliance checks`, 'security.yml');
      }
    }
  }

  // Run all validations
  validate() {
    console.log('🔍 Starting CI/CD pipeline validation...\n');

    this.loadWorkflows();
    this.validateRequiredWorkflows();
    this.validateSecurityScans();
    this.validateQualityGates();
    this.validateNoHardcodedSecrets();
    this.validateSecretHandling();
    this.validateSBOM();
    this.validateAccessibilityTesting();
    this.validateTestCoverage();
    this.validateDeploymentSafeguards();
    this.validateObservability();
    this.validateCaching();
    this.validatePerformance();
    this.validateCompliance();

    return this.result.print();
  }
}

// Run validation
const validator = new PipelineValidator();
const success = validator.validate();

process.exit(success ? 0 : 1);
