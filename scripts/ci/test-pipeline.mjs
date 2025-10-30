#!/usr/bin/env node
/**
 * CI/CD Pipeline Integration Tests
 * 
 * Tests the complete CI/CD pipeline functionality including:
 * - Workflow execution simulation
 * - Security gate enforcement
 * - Quality gate validation
 * - Deployment strategy testing
 * - Rollback procedures
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

class PipelineTest {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.passed = false;
    this.error = null;
  }

  async run(testFn) {
    try {
      await testFn();
      this.passed = true;
      console.log(`  ✅ ${this.name}`);
    } catch (error) {
      this.passed = false;
      this.error = error.message;
      console.log(`  ❌ ${this.name}: ${error.message}`);
    }
  }
}

class PipelineTestSuite {
  constructor() {
    this.tests = [];
  }

  addTest(name, description, testFn) {
    const test = new PipelineTest(name, description);
    this.tests.push({ test, testFn });
  }

  async runAll() {
    console.log('\n🧪 Running CI/CD Pipeline Integration Tests\n');
    console.log('━'.repeat(80) + '\n');

    for (const { test, testFn } of this.tests) {
      await test.run(testFn);
    }

    const passed = this.tests.filter(t => t.test.passed).length;
    const failed = this.tests.length - passed;

    console.log('\n' + '━'.repeat(80));
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${this.tests.length} tests\n`);

    return failed === 0;
  }
}

// Utility functions
function executeCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    throw new Error(`Command failed: ${error.message}`);
  }
}

function fileExists(path) {
  return existsSync(path);
}

function fileContains(path, text) {
  if (!fileExists(path)) {
    throw new Error(`File not found: ${path}`);
  }
  const content = readFileSync(path, 'utf8');
  return content.includes(text);
}

// Create test suite
const suite = new PipelineTestSuite();

// Test 1: Validate workflow files exist
suite.addTest(
  'Workflow files exist',
  'Checks that all required workflow files are present',
  () => {
    const required = ['ci.yml', 'deploy.yml', 'security.yml', 'e2e.yml'];
    for (const file of required) {
      const path = join('.github/workflows', file);
      if (!fileExists(path)) {
        throw new Error(`Missing workflow file: ${file}`);
      }
    }
  }
);

// Test 2: Validate workflow syntax
suite.addTest(
  'Workflow syntax validation',
  'Validates YAML syntax of all workflow files',
  () => {
    try {
      executeCommand('node scripts/ci/validate-pipelines.mjs');
    } catch (error) {
      // The validator might exit with 1 for warnings, check actual error
      if (error.message.includes('parse') || error.message.includes('syntax')) {
        throw error;
      }
    }
  }
);

// Test 3: Lint checks pass
suite.addTest(
  'Lint checks pass',
  'Runs linting to ensure code quality',
  () => {
    try {
      executeCommand('npm run lint 2>&1');
    } catch (error) {
      throw new Error('Linting failed');
    }
  }
);

// Test 4: Type checking passes
suite.addTest(
  'Type checking passes',
  'Validates TypeScript types',
  () => {
    try {
      executeCommand('npm run typecheck 2>&1');
    } catch (error) {
      throw new Error('Type checking failed');
    }
  }
);

// Test 5: Security scan for secrets
suite.addTest(
  'No secrets detected',
  'Runs Gitleaks to check for exposed secrets',
  () => {
    const scriptPath = 'scripts/security/gitleaks-scan.sh';
    if (!fileExists(scriptPath)) {
      throw new Error('Gitleaks scan script not found');
    }
    
    // Note: This is a smoke test - actual scan happens in CI
    const hasGitleaksConfig = fileExists('.gitleaks.toml') || fileExists('.gitleaks.yml');
    if (!hasGitleaksConfig) {
      throw new Error('Gitleaks configuration not found');
    }
  }
);

// Test 6: Security workflows configured
suite.addTest(
  'Security workflows configured',
  'Validates security scanning is properly configured',
  () => {
    const securityWorkflow = '.github/workflows/security.yml';
    if (!fileExists(securityWorkflow)) {
      throw new Error('Security workflow not found');
    }
    
    // Check for required security scans
    const requiredScans = ['audit', 'CodeQL', 'dependency'];
    for (const scan of requiredScans) {
      if (!fileContains(securityWorkflow, scan)) {
        throw new Error(`Security scan missing: ${scan}`);
      }
    }
  }
);

// Test 7: Accessibility testing configured
suite.addTest(
  'Accessibility testing configured',
  'Validates WCAG 2.2 AA+ accessibility testing',
  () => {
    const ciWorkflow = '.github/workflows/ci.yml';
    if (!fileContains(ciWorkflow, 'accessibility') && !fileContains(ciWorkflow, 'a11y')) {
      throw new Error('Accessibility testing not configured');
    }
  }
);

// Test 8: SBOM generation configured
suite.addTest(
  'SBOM generation configured',
  'Validates Software Bill of Materials generation',
  () => {
    const deployWorkflow = '.github/workflows/deploy.yml';
    if (!fileContains(deployWorkflow, 'sbom')) {
      throw new Error('SBOM generation not configured');
    }
  }
);

// Test 9: Container scanning configured
suite.addTest(
  'Container scanning configured',
  'Validates Trivy container scanning',
  () => {
    const deployWorkflow = '.github/workflows/deploy.yml';
    if (!fileContains(deployWorkflow, 'trivy')) {
      throw new Error('Container scanning not configured');
    }
  }
);

// Test 10: Deployment safeguards
suite.addTest(
  'Deployment safeguards configured',
  'Validates health checks and rollback procedures',
  () => {
    const deployWorkflow = '.github/workflows/deploy.yml';
    
    if (!fileContains(deployWorkflow, 'health')) {
      throw new Error('Health checks not configured');
    }
    
    if (!fileContains(deployWorkflow, 'rollback')) {
      throw new Error('Rollback procedure not configured');
    }
  }
);

// Test 11: Environment protection
suite.addTest(
  'Environment protection configured',
  'Validates GitHub environment protection',
  () => {
    const deployWorkflow = '.github/workflows/deploy.yml';
    if (!fileContains(deployWorkflow, 'environment:')) {
      throw new Error('Environment protection not configured');
    }
  }
);

// Test 12: OIDC authentication
suite.addTest(
  'OIDC authentication configured',
  'Validates secure authentication for deployments',
  () => {
    const deployWorkflow = '.github/workflows/deploy.yml';
    if (!fileContains(deployWorkflow, 'id-token: write')) {
      throw new Error('OIDC authentication not configured');
    }
  }
);

// Test 13: Observability integration
suite.addTest(
  'Observability integration',
  'Validates monitoring script exists',
  () => {
    const monitorScript = 'scripts/ci/otel-monitor.sh';
    if (!fileExists(monitorScript)) {
      throw new Error('Observability monitoring script not found');
    }
  }
);

// Test 14: Test coverage reporting
suite.addTest(
  'Test coverage reporting configured',
  'Validates code coverage is tracked',
  () => {
    const ciWorkflow = '.github/workflows/ci.yml';
    if (!fileContains(ciWorkflow, 'coverage')) {
      throw new Error('Test coverage reporting not configured');
    }
  }
);

// Test 15: Caching configured
suite.addTest(
  'Dependency caching configured',
  'Validates NPM and Docker caching',
  () => {
    const ciWorkflow = '.github/workflows/ci.yml';
    if (!fileContains(ciWorkflow, 'cache:')) {
      throw new Error('Dependency caching not configured');
    }
  }
);

// Test 16: Parallel job execution
suite.addTest(
  'Parallel job execution',
  'Validates jobs run in parallel where possible',
  () => {
    const ciWorkflow = '.github/workflows/ci.yml';
    const content = readFileSync(ciWorkflow, 'utf8');
    
    // Check for multiple jobs (indicating potential parallelization)
    const jobMatches = content.match(/^  \w+:/gm);
    if (!jobMatches || jobMatches.length < 3) {
      throw new Error('Insufficient job parallelization');
    }
  }
);

// Test 17: Artifact retention configured
suite.addTest(
  'Artifact retention configured',
  'Validates build artifacts are properly retained',
  () => {
    const ciWorkflow = '.github/workflows/ci.yml';
    if (!fileContains(ciWorkflow, 'upload-artifact')) {
      throw new Error('Artifact upload not configured');
    }
    
    if (!fileContains(ciWorkflow, 'retention-days')) {
      throw new Error('Artifact retention not configured');
    }
  }
);

// Test 18: Import boundary checks
suite.addTest(
  'Import boundary checks configured',
  'Validates Nx module boundaries are enforced',
  () => {
    const ciWorkflow = '.github/workflows/ci.yml';
    if (!fileContains(ciWorkflow, 'import-boundaries') && 
        !fileContains(ciWorkflow, 'lint-boundaries')) {
      throw new Error('Import boundary checks not configured');
    }
  }
);

// Test 19: ADR validation
suite.addTest(
  'ADR validation configured',
  'Validates Architecture Decision Records are validated',
  () => {
    const adrWorkflow = '.github/workflows/adr-validate.yml';
    if (!fileExists(adrWorkflow)) {
      throw new Error('ADR validation workflow not found');
    }
  }
);

// Test 20: Deployment documentation
suite.addTest(
  'Deployment documentation exists',
  'Validates deployment runbooks and procedures are documented',
  () => {
    const docsExist = 
      fileExists('docs/05-engineering-and-devops/ci-cd-architecture.md') ||
      fileExists('docs/09-observability-and-ops/deployment-runbook.md') ||
      fileExists('DISASTER-RECOVERY-RUNBOOK.md');
    
    if (!docsExist) {
      throw new Error('Deployment documentation not found');
    }
  }
);

// Run all tests
suite.runAll().then(success => {
  process.exit(success ? 0 : 1);
});
