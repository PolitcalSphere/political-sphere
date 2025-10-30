#!/usr/bin/env node

/**
 * Environment Configuration Validator
 * Validates required environment variables and configurations before application startup
 */

import process from 'node:process';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m'
};

const errors = [];
const warnings = [];

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
    logWarning(`${name} not set, will use default: ${defaultValue}`);
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
    // Check if secrets are the same (bad practice)
    if (jwtSecret === jwtRefreshSecret) {
      logError('JWT_SECRET and JWT_REFRESH_SECRET must be different');
    } else {
      logSuccess('JWT secrets configured correctly');
    }

    // Check if secrets appear to be hex-encoded random bytes (recommended)
    const hexPattern = /^[0-9a-f]{64,}$/i;
    if (hexPattern.test(jwtSecret) && hexPattern.test(jwtRefreshSecret)) {
      logSuccess('JWT secrets appear to be cryptographically random');
    } else {
      logWarning('JWT secrets should be generated with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
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
  console.log(`Environment: ${nodeEnv}`);

  if (nodeEnv === 'production') {
    logSuccess('Running in production mode');
    
    // Additional production checks
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
      logWarning('Production JWT_SECRET should be at least 64 characters');
    }
  } else {
    logWarning(`Running in ${nodeEnv} mode`);
  }

  // API Configuration
  const apiPort = process.env.API_PORT || '4000';
  const apiHost = process.env.API_HOST || '0.0.0.0';
  console.log(`API: ${apiHost}:${apiPort}`);

  // Frontend Configuration  
  const frontendPort = process.env.FRONTEND_PORT || '3000';
  const frontendHost = process.env.FRONTEND_HOST || '0.0.0.0';
  console.log(`Frontend: ${frontendHost}:${frontendPort}`);

  // Worker Configuration
  const workerInterval = process.env.WORKER_INTERVAL_MS || '15000';
  console.log(`Worker interval: ${workerInterval}ms`);
}

function validateRateLimits() {
  logHeader('Rate Limiting Configuration');

  const maxRequests = process.env.API_RATE_LIMIT_MAX_REQUESTS || '100';
  const windowMs = process.env.API_RATE_LIMIT_WINDOW_MS || '900000'; // 15 minutes
  const maxKeys = process.env.API_RATE_LIMIT_MAX_KEYS || '5000';

  console.log(`Max requests: ${maxRequests} per ${parseInt(windowMs) / 1000}s`);
  console.log(`Max tracked IPs: ${maxKeys}`);

  if (parseInt(maxRequests) > 1000) {
    logWarning('High rate limit configured - ensure infrastructure can handle the load');
  }

  logSuccess('Rate limiting configured');
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
    console.log(`Database: ${masked}`);
    logSuccess('Database connection configured');
  }
}

function validateCICDSecrets() {
  logHeader('CI/CD Secrets (GitHub Actions)');

  const ciSecrets = [
    { name: 'CODECOV_TOKEN', required: false, purpose: 'Coverage reporting' },
    { name: 'SNYK_TOKEN', required: false, purpose: 'Vulnerability scanning' },
    { name: 'SEMGREP_APP_TOKEN', required: false, purpose: 'SAST scanning' },
    { name: 'AWS_ROLE_TO_ASSUME', required: false, purpose: 'AWS deployment' },
    { name: 'SLACK_WEBHOOK_URL', required: false, purpose: 'Deployment notifications' }
  ];

  console.log('Note: CI/CD secrets are configured in GitHub, not in environment files');
  console.log('Configure at: Settings > Secrets and variables > Actions\n');

  ciSecrets.forEach(({ name, required, purpose }) => {
    console.log(`  ${name}`);
    console.log(`    Purpose: ${purpose}`);
    console.log(`    Required: ${required ? 'Yes' : 'Optional'}\n`);
  });

  logSuccess('See SECURITY.md for complete CI/CD secret configuration');
}

function printSummary() {
  logHeader('Validation Summary');

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`${colors.green}✓ All checks passed!${colors.reset}\n`);
    return 0;
  }

  if (errors.length > 0) {
    console.error(`${colors.red}✗ ${errors.length} error(s) found:${colors.reset}`);
    errors.forEach((err, i) => console.error(`  ${i + 1}. ${err}`));
    console.log();
  }

  if (warnings.length > 0) {
    console.warn(`${colors.yellow}⚠ ${warnings.length} warning(s):${colors.reset}`);
    warnings.forEach((warn, i) => console.warn(`  ${i + 1}. ${warn}`));
    console.log();
  }

  if (errors.length > 0) {
    console.error(`${colors.red}Configuration validation FAILED${colors.reset}`);
    console.error('Fix errors above before starting the application.\n');
    return 1;
  }

  console.warn(`${colors.yellow}Configuration has warnings but can proceed${colors.reset}\n`);
  return 0;
}

function main() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════╗
║   Political Sphere - Environment Validator       ║
╚═══════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    validateJWTSecrets();
    validateServiceConfiguration();
    validateRateLimits();
    validateDatabaseConnection();
    validateCICDSecrets();
    
    const exitCode = printSummary();
    process.exit(exitCode);
  } catch (error) {
    console.error(`${colors.red}Validation failed with error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateJWTSecrets, validateServiceConfiguration, validateRateLimits };
