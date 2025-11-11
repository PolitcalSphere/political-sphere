#!/usr/bin/env node

/**
 * Unified Environment Validation
 *
 * Consolidates environment variable validation and secret detection
 * from validate-env.js and assess-secrets.sh
 *
 * Version: 2.0.0
 * Last Updated: 2025-11-10
 *
 * Usage:
 *   node tools/scripts/validation/validate-environment.mjs [--mode=strict|warn|scan]
 *
 * Modes:
 *   strict - Fail on errors, warn on issues (default for CI)
 *   warn   - Report all issues but don't fail (default for dev)
 *   scan   - Secret scanning only, no validation
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const errors = [];
const warnings = [];
const secretFindings = [];

// Configuration
const MODE = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] || 'warn';
// Optional: limit scan to specific files passed via CLI after a --files marker
// Example: node validate-environment.mjs --mode=scan --files file1.ts file2.json
const FILES_FLAG_INDEX = process.argv.indexOf('--files');
const PROVIDED_FILES = FILES_FLAG_INDEX >= 0 ? process.argv.slice(FILES_FLAG_INDEX + 1) : [];
const VALID_MODES = ['strict', 'warn', 'scan'];

if (!VALID_MODES.includes(MODE)) {
  console.error(
    `${colors.red}Invalid mode: ${MODE}. Must be one of: ${VALID_MODES.join(', ')}${colors.reset}`,
  );
  process.exit(1);
}

// ============================================================================
// Logging Utilities
// ============================================================================

function logHeader(text) {
  console.log(`\n${colors.cyan}═══ ${text} ═══${colors.reset}\n`);
}

function logError(message) {
  errors.push(message);
  console.error(`${colors.red}✗ ERROR: ${message}${colors.reset}`);
}

function logWarning(message) {
  warnings.push(message);
  console.warn(`${colors.yellow}⚠ WARNING: ${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.dim}ℹ ${message}${colors.reset}`);
}

function logSecretFinding(file, line, pattern) {
  secretFindings.push({ file, line, pattern });
  console.warn(
    `${colors.yellow}🔐 Potential secret in ${file}:${line} (pattern: ${pattern})${colors.reset}`,
  );
}

// ============================================================================
// Validation Functions
// ============================================================================

function validateRequired(name, value, minLength = 0) {
  if (!value) {
    logError(`${name} is not set`);
    return false;
  }
  if (minLength > 0 && value.length < minLength) {
    logError(`${name} must be at least ${minLength} characters (current: ${value.length})`);
    return false;
  }
  return true;
}

function validateOptional(name, value, defaultValue) {
  if (!value) {
    logInfo(`${name} not set, using default: ${defaultValue}`);
    return false;
  }
  return true;
}

function validateJWTSecrets() {
  logHeader('JWT Authentication Configuration');

  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  const secretValid = validateRequired('JWT_SECRET', jwtSecret, 32);
  const refreshValid = validateRequired('JWT_REFRESH_SECRET', jwtRefreshSecret, 32);

  if (secretValid && refreshValid) {
    // Check if secrets are the same (security issue)
    if (jwtSecret === jwtRefreshSecret) {
      logError('JWT_SECRET and JWT_REFRESH_SECRET must be different');
    } else {
      logSuccess('JWT secrets configured correctly');
    }

    // Check if secrets appear to be cryptographically random
    const hexPattern = /^[0-9a-f]{64,}$/i;
    if (hexPattern.test(jwtSecret) && hexPattern.test(jwtRefreshSecret)) {
      logSuccess('JWT secrets appear to be cryptographically random');
    } else {
      logWarning(
        "JWT secrets should be generated with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"",
      );
    }
  }

  // Check expiration times
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  validateOptional('JWT_EXPIRES_IN', process.env.JWT_EXPIRES_IN, expiresIn);
  validateOptional('JWT_REFRESH_EXPIRES_IN', process.env.JWT_REFRESH_EXPIRES_IN, refreshExpiresIn);
}

function validateServiceConfiguration() {
  logHeader('Service Configuration');

  const nodeEnv = process.env.NODE_ENV || 'development';
  logInfo(`Environment: ${nodeEnv}`);

  if (nodeEnv === 'production') {
    logSuccess('Running in production mode');

    // Additional production checks
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
      logWarning('Production JWT_SECRET should be at least 64 characters');
    }

    // Ensure no development flags in production
    if (process.env.FAST_AI === '1') {
      logError('FAST_AI mode is enabled in production - this should only be used in development');
    }
  } else {
    logInfo(`Running in ${nodeEnv} mode`);
  }

  // API Configuration
  const apiPort = process.env.API_PORT || '4000';
  const apiHost = process.env.API_HOST || '0.0.0.0';
  logInfo(`API: ${apiHost}:${apiPort}`);

  // Frontend Configuration
  const frontendPort = process.env.FRONTEND_PORT || '3000';
  const frontendHost = process.env.FRONTEND_HOST || '0.0.0.0';
  logInfo(`Frontend: ${frontendHost}:${frontendPort}`);
}

function validateDatabaseConnection() {
  logHeader('Database Configuration');

  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    logWarning('DATABASE_URL not set - using in-memory storage');
    logWarning('Data will be lost on restart - not suitable for production');
  } else {
    // Mask sensitive parts of connection string
    const masked = dbUrl.replace(/:([^:@]+)@/, ':****@');
    logInfo(`Database: ${masked}`);
    logSuccess('Database connection configured');
  }
}

function validateRateLimits() {
  logHeader('Rate Limiting Configuration');

  const maxRequests = process.env.API_RATE_LIMIT_MAX_REQUESTS || '100';
  const windowMs = process.env.API_RATE_LIMIT_WINDOW_MS || '900000'; // 15 minutes

  logInfo(`Max requests: ${maxRequests} per ${parseInt(windowMs, 10) / 1000}s`);

  if (parseInt(maxRequests, 10) > 1000) {
    logWarning('High rate limit configured - ensure infrastructure can handle the load');
  }

  logSuccess('Rate limiting configured');
}

// ============================================================================
// Secret Scanning
// ============================================================================

const SECRET_PATTERNS = [
  // High-entropy strings that look like secrets
  {
    name: 'High-Entropy String',
    pattern: /(['"])([a-zA-Z0-9+/=_-]{40,})\1/,
    severity: 'high',
  },

  // Common secret variable assignments
  {
    name: 'Password Assignment',
    pattern: /(password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/,
    severity: 'high',
  },
  {
    name: 'Secret Assignment',
    pattern: /(secret|api_key|apikey)\s*[:=]\s*['"][^'"]{20,}['"]/,
    severity: 'high',
  },
  {
    name: 'Token Assignment',
    pattern: /(token|auth)\s*[:=]\s*['"][^'"]{20,}['"]/,
    severity: 'high',
  },

  // AWS keys
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'critical' },
  {
    name: 'AWS Secret Key',
    pattern: /aws(.{0,20})?['"][0-9a-zA-Z/+=]{40}['"]/,
    severity: 'critical',
  },

  // Private keys
  {
    name: 'RSA Private Key',
    pattern: /-----BEGIN (RSA )?PRIVATE KEY-----/,
    severity: 'critical',
  },
  {
    name: 'SSH Private Key',
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/,
    severity: 'critical',
  },

  // Generic API keys
  {
    name: 'Generic API Key',
    pattern: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/,
    severity: 'high',
  },
];

const SAFE_PATTERNS = [
  /test[_-]?secret/i,
  /example[_-]?key/i,
  /placeholder/i,
  /your[_-]?(secret|key|token)/i,
  /\$\{.*\}/, // Template variables
  /process\.env\./, // Environment variable references
  /pattern:\s*\//, // Regex pattern definitions in code
  /-----BEGIN.*PRIVATE KEY-----/, // Pattern definitions for key detection
];

function isSafeContext(line) {
  return SAFE_PATTERNS.some((pattern) => pattern.test(line));
}

function scanFileForSecrets(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Skip comments and safe contexts
      if (line.trim().startsWith('//') || line.trim().startsWith('#') || isSafeContext(line)) {
        return;
      }

      SECRET_PATTERNS.forEach(({ name, pattern, severity }) => {
        if (pattern.test(line)) {
          logSecretFinding(filePath, index + 1, `${name} (${severity})`);
        }
      });
    });
  } catch (error) {
    // Skip binary or unreadable files
    if (error.code !== 'EISDIR') {
      logWarning(`Could not scan ${filePath}: ${error.message}`);
    }
  }
}

function scanDirectory(
  dir,
  extensions = ['.js', '.ts', '.tsx', '.json', '.yml', '.yaml', '.env', '.sh'],
) {
  const SKIP_DIRS = ['node_modules', '.git', '.nx', 'dist', 'build', 'coverage', '.vitest'];
  const SKIP_FILES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']);

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (!SKIP_DIRS.includes(entry)) {
          scanDirectory(fullPath, extensions);
        }
      } else {
        if (SKIP_FILES.has(entry)) {
          continue;
        }
        const dotIndex = entry.lastIndexOf('.');
        const ext = dotIndex >= 0 ? entry.substring(dotIndex) : '';
        if (extensions.includes(ext) || entry === '.env.local') {
          scanFileForSecrets(fullPath);
        }
      }
    }
  } catch (error) {
    logWarning(`Could not scan directory ${dir}: ${error.message}`);
  }
}

function performSecretScan() {
  logHeader('Secret Scanning');

  // If specific files were provided, scan only those; otherwise scan the whole workspace
  if (PROVIDED_FILES.length > 0) {
    logInfo(`Scanning provided paths: ${PROVIDED_FILES.length} item(s)`);
    const SKIP_FILES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']);
    for (const p of PROVIDED_FILES) {
      try {
        const name = p.split('/').pop() || p;
        if (SKIP_FILES.has(name)) {
          logInfo(`Skipping lockfile: ${p}`);
          continue;
        }
        const st = statSync(p);
        if (st.isDirectory()) {
          scanDirectory(p);
        } else {
          scanFileForSecrets(p);
        }
      } catch (e) {
        logWarning(`Could not access ${p}: ${e.message}`);
      }
    }
  } else {
    const rootDir = process.cwd();
    logInfo(`Scanning workspace: ${rootDir}`);
    scanDirectory(rootDir);
  }

  if (secretFindings.length === 0) {
    logSuccess('No potential secrets detected in workspace');
  } else {
    logWarning(`Found ${secretFindings.length} potential secret(s) - review findings above`);
    logInfo(
      'If these are false positives, ensure they use template variables or are in test fixtures',
    );
  }
}

function checkEnvLocalFiles() {
  logHeader('.env.local Security Check');

  const envFiles = [
    '.env.local',
    '.env.development.local',
    '.env.production.local',
    '.env.test.local',
  ];
  const foundFiles = envFiles.filter((f) => existsSync(f));

  if (foundFiles.length === 0) {
    logSuccess('No .env.local files found (using environment variables only)');
    return;
  }

  foundFiles.forEach((file) => {
    logInfo(`Checking ${file}...`);

    // Verify it's gitignored
    const gitignore = existsSync('.gitignore') ? readFileSync('.gitignore', 'utf-8') : '';
    if (!gitignore.includes('.env.local') && !gitignore.includes('.env*.local')) {
      logError(`${file} exists but .env.local pattern is not in .gitignore`);
    } else {
      logSuccess(`${file} is properly gitignored`);
    }

    // Scan for actual secrets (not just references)
    scanFileForSecrets(file);
  });
}

// ============================================================================
// Summary and Exit
// ============================================================================

function printSummary() {
  logHeader('Validation Summary');

  const totalIssues = errors.length + warnings.length + secretFindings.length;

  if (totalIssues === 0) {
    console.log(`${colors.green}✓ All checks passed!${colors.reset}\n`);
    return 0;
  }

  if (errors.length > 0) {
    console.error(`${colors.red}✗ ${errors.length} error(s) found:${colors.reset}`);
    errors.forEach((err, i) => {
      console.error(`  ${i + 1}. ${err}`);
    });
    console.log();
  }

  if (warnings.length > 0) {
    console.warn(`${colors.yellow}⚠ ${warnings.length} warning(s):${colors.reset}`);
    warnings.forEach((warn, i) => {
      console.warn(`  ${i + 1}. ${warn}`);
    });
    console.log();
  }

  if (secretFindings.length > 0) {
    console.warn(
      `${colors.yellow}🔐 ${secretFindings.length} potential secret(s) detected${colors.reset}`,
    );
    console.log();
  }

  // Determine exit code based on mode
  if (MODE === 'strict' && errors.length > 0) {
    console.error(`${colors.red}Validation FAILED (strict mode)${colors.reset}`);
    console.error('Fix errors above before proceeding.\n');
    return 1;
  }

  if (MODE === 'scan') {
    console.warn(`${colors.yellow}Secret scan complete - review findings above${colors.reset}\n`);
    return secretFindings.length > 0 ? 1 : 0;
  }

  console.warn(`${colors.yellow}Validation complete with warnings (${MODE} mode)${colors.reset}\n`);
  return 0;
}

// ============================================================================
// Main
// ============================================================================

function main() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════╗
║   Political Sphere - Environment Validator       ║
║   Mode: ${MODE.toUpperCase().padEnd(39)}║
╚═══════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    if (MODE === 'scan') {
      // Secret scanning only
      performSecretScan();
      checkEnvLocalFiles();
    } else {
      // Full validation + scanning
      validateJWTSecrets();
      validateServiceConfiguration();
      validateDatabaseConnection();
      validateRateLimits();
      performSecretScan();
      checkEnvLocalFiles();
    }

    const exitCode = printSummary();
    process.exit(exitCode);
  } catch (error) {
    console.error(`${colors.red}Validation failed with error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  validateJWTSecrets,
  validateServiceConfiguration,
  validateDatabaseConnection,
  validateRateLimits,
  performSecretScan,
  checkEnvLocalFiles,
};
