#!/usr/bin/env node

/**
 * parse-results.mjs
 * Version: 1.0.0
 * Purpose: Parse Vitest test results and create GitHub annotations
 * Compliance: QUAL-05, TEST-02, OPS-01
 * Author: Political Sphere
 * License: See repository LICENSE file
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// Constants
const VERSION = '1.0.0';
const MAX_ANNOTATIONS = 50; // GitHub limit for annotations per run
const MAX_SUMMARY_LENGTH = 65536; // GitHub step summary size limit (64KB)

// Get environment variables
const RESULT_PATH = process.env.RESULT_PATH || './test-output/results/results.json';
const GITHUB_STEP_SUMMARY = process.env.GITHUB_STEP_SUMMARY;

/**
 * Structured logging
 */
function log(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    script: 'parse-results.mjs',
    version: VERSION,
    context,
  };

  console.error(JSON.stringify(logEntry));

  // Also output human-readable format
  const prefix =
    {
      ERROR: '\x1b[31m[ERROR]\x1b[0m',
      WARN: '\x1b[33m[WARN]\x1b[0m',
      INFO: '\x1b[34m[INFO]\x1b[0m',
      SUCCESS: '\x1b[32m[SUCCESS]\x1b[0m',
    }[level] || `[${level}]`;

  console.error(`${prefix} ${message}`);
}

/**
 * Create GitHub workflow annotation
 * Uses workflow commands: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
 */
function createAnnotation(type, file, line, col, message, title = '') {
  const params = [`file=${file}`];

  if (line) params.push(`line=${line}`);
  if (col) params.push(`col=${col}`);
  if (title) params.push(`title=${title}`);

  const annotation = `::${type} ${params.join(',')}::${message}`;
  console.log(annotation);
}

/**
 * Parse Vitest JSON results
 */
async function parseVitestResults(resultsPath) {
  try {
    const content = await fs.readFile(resultsPath, 'utf-8');
    const results = JSON.parse(content);

    log('INFO', `Parsed test results from ${resultsPath}`);

    return {
      success: results.success || false,
      numTotalTests: results.numTotalTests || 0,
      numPassedTests: results.numPassedTests || 0,
      numFailedTests: results.numFailedTests || 0,
      numPendingTests: results.numPendingTests || 0,
      numTodoTests: results.numTodoTests || 0,
      testResults: results.testResults || [],
      startTime: results.startTime || Date.now(),
      testDuration: results.testDuration || 0,
    };
  } catch (error) {
    log('ERROR', `Failed to parse results file: ${error.message}`);
    throw error;
  }
}

/**
 * Extract failed test details
 */
function extractFailedTests(testResults) {
  const failed = [];

  for (const suite of testResults) {
    const suiteName = suite.name || 'Unknown Suite';
    const assertionResults = suite.assertionResults || [];

    for (const test of assertionResults) {
      if (test.status === 'failed') {
        const failureMessages = test.failureMessages || [];
        const failureDetails = test.failureDetails || [];

        failed.push({
          suiteName,
          testName: test.title || test.fullName || 'Unknown Test',
          failureMessages,
          failureDetails,
          location: test.location || null,
          duration: test.duration || 0,
        });
      }
    }
  }

  return failed;
}

/**
 * Create GitHub annotations for failed tests
 */
function createFailureAnnotations(failedTests) {
  log('INFO', `Creating annotations for ${failedTests.length} failed tests`);

  let annotationCount = 0;

  for (const test of failedTests) {
    if (annotationCount >= MAX_ANNOTATIONS) {
      log('WARN', `Reached maximum annotation limit (${MAX_ANNOTATIONS})`);
      break;
    }

    // Extract file location if available
    const file = test.location?.file || test.suiteName;
    const line = test.location?.line || 1;
    const column = test.location?.column || 1;

    // Create error annotation
    const message = test.failureMessages.join('\n') || 'Test failed';
    const title = `${test.suiteName} > ${test.testName}`;

    createAnnotation('error', file, line, column, message, title);
    annotationCount++;
  }

  log('SUCCESS', `Created ${annotationCount} annotations`);
  return annotationCount;
}

/**
 * Generate markdown summary for GitHub step summary
 */
function generateMarkdownSummary(results, failedTests) {
  const { numTotalTests, numPassedTests, numFailedTests, numPendingTests, testDuration } = results;

  // Calculate percentages
  const passRate = numTotalTests > 0 ? ((numPassedTests / numTotalTests) * 100).toFixed(2) : 0;
  const failRate = numTotalTests > 0 ? ((numFailedTests / numTotalTests) * 100).toFixed(2) : 0;

  // Format duration
  const durationSeconds = (testDuration / 1000).toFixed(2);

  let summary = `## Test Results Summary\n\n`;

  // Overall status badge
  if (numFailedTests === 0) {
    summary += `### ✅ All Tests Passed\n\n`;
  } else {
    summary += `### ❌ ${numFailedTests} Test${numFailedTests > 1 ? 's' : ''} Failed\n\n`;
  }

  // Statistics table
  summary += `| Metric | Value |\n`;
  summary += `|--------|-------|\n`;
  summary += `| **Total Tests** | ${numTotalTests} |\n`;
  summary += `| **Passed** | ✅ ${numPassedTests} (${passRate}%) |\n`;
  summary += `| **Failed** | ❌ ${numFailedTests} (${failRate}%) |\n`;

  if (numPendingTests > 0) {
    summary += `| **Pending/Skipped** | ⏭️ ${numPendingTests} |\n`;
  }

  summary += `| **Duration** | ⏱️ ${durationSeconds}s |\n`;
  summary += `\n`;

  // Failed tests details
  if (failedTests.length > 0) {
    summary += `### Failed Tests\n\n`;

    const maxFailuresToShow = 10;
    const failuresToShow = failedTests.slice(0, maxFailuresToShow);

    for (const test of failuresToShow) {
      summary += `#### ❌ ${test.suiteName} > ${test.testName}\n\n`;

      if (test.failureMessages.length > 0) {
        summary += `**Error:**\n\`\`\`\n`;
        summary += test.failureMessages.join('\n').slice(0, 500); // Limit error message length
        summary += `\n\`\`\`\n\n`;
      }

      if (test.location) {
        summary += `**Location:** ${test.location.file}:${test.location.line}\n\n`;
      }

      summary += `---\n\n`;
    }

    if (failedTests.length > maxFailuresToShow) {
      summary += `\n_...and ${failedTests.length - maxFailuresToShow} more failed tests_\n\n`;
    }
  }

  // Truncate if exceeds GitHub limit
  if (summary.length > MAX_SUMMARY_LENGTH) {
    log('WARN', `Summary exceeds ${MAX_SUMMARY_LENGTH} bytes, truncating`);
    summary = `${summary.slice(0, MAX_SUMMARY_LENGTH - 100)}\n\n_...summary truncated due to size limit_\n`;
  }

  return summary;
}

/**
 * Write step summary to GitHub
 */
async function writeStepSummary(summary) {
  if (!GITHUB_STEP_SUMMARY) {
    log('WARN', 'GITHUB_STEP_SUMMARY not set, skipping summary output');
    return;
  }

  try {
    await fs.appendFile(GITHUB_STEP_SUMMARY, summary, 'utf-8');
    log('SUCCESS', 'Step summary written successfully');
  } catch (error) {
    log('ERROR', `Failed to write step summary: ${error.message}`);
  }
}

/**
 * Parse coverage report if available
 */
async function parseCoverageReport(coveragePath) {
  const coverageSummaryPath = path.join(coveragePath, 'coverage-summary.json');

  try {
    const content = await fs.readFile(coverageSummaryPath, 'utf-8');
    const coverage = JSON.parse(content);

    const totalCoverage = coverage.total || {};

    return {
      lines: totalCoverage.lines?.pct || 0,
      statements: totalCoverage.statements?.pct || 0,
      functions: totalCoverage.functions?.pct || 0,
      branches: totalCoverage.branches?.pct || 0,
    };
  } catch (error) {
    log('WARN', `Coverage report not available: ${error.message}`);
    return null;
  }
}

/**
 * Generate coverage summary markdown
 */
function generateCoverageSummary(coverage) {
  if (!coverage) return '';

  let summary = `### Coverage Report\n\n`;
  summary += `| Type | Coverage |\n`;
  summary += `|------|----------|\n`;
  summary += `| **Lines** | ${coverage.lines.toFixed(2)}% |\n`;
  summary += `| **Statements** | ${coverage.statements.toFixed(2)}% |\n`;
  summary += `| **Functions** | ${coverage.functions.toFixed(2)}% |\n`;
  summary += `| **Branches** | ${coverage.branches.toFixed(2)}% |\n`;
  summary += `\n`;

  return summary;
}

/**
 * Main execution
 */
async function main() {
  log('INFO', `Starting result parser v${VERSION}`);
  log('INFO', `Result path: ${RESULT_PATH}`);

  try {
    // Parse test results
    const results = await parseVitestResults(RESULT_PATH);

    log(
      'INFO',
      `Total tests: ${results.numTotalTests}, Passed: ${results.numPassedTests}, Failed: ${results.numFailedTests}`
    );

    // Extract failed tests
    const failedTests = extractFailedTests(results.testResults);

    log('INFO', `Extracted ${failedTests.length} failed test details`);

    // Create GitHub annotations for failures
    if (failedTests.length > 0) {
      createFailureAnnotations(failedTests);
    }

    // Generate markdown summary
    let summary = generateMarkdownSummary(results, failedTests);

    // Parse coverage if available
    const coveragePath = process.env.COVERAGE_PATH || './test-output/coverage';
    const coverage = await parseCoverageReport(coveragePath);

    if (coverage) {
      summary += generateCoverageSummary(coverage);
    }

    // Write step summary
    await writeStepSummary(summary);

    // Output success
    if (results.numFailedTests === 0) {
      log('SUCCESS', 'All tests passed');
      process.exit(0);
    } else {
      log('ERROR', `${results.numFailedTests} tests failed`);
      process.exit(1);
    }
  } catch (error) {
    log('ERROR', `Parser failed: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
}

// Execute main
main().catch(error => {
  log('ERROR', `Unhandled error: ${error.message}`, { stack: error.stack });
  process.exit(1);
});
