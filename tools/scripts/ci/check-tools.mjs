#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function cmdHasVersion(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

const missing = [];
if (!cmdHasVersion('node')) missing.push('node (>=18)');
if (!cmdHasVersion('git')) missing.push('git');
if (!cmdHasVersion('npx')) missing.push('npx');

// Detect test runner in package.json or local node_modules before attempting any networked `npx` calls
let hasTestRunner = false;
try {
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  if (fileExists(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8') || '{}');
    const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
    if (deps.vitest || deps.jest) hasTestRunner = true;
  }
} catch {
  // ignore parse errors; fall through to other checks
}

// Check for installed binaries in node_modules/.bin
const nmBin = path.resolve(process.cwd(), 'node_modules', '.bin');
if (!hasTestRunner) {
  if (fileExists(path.join(nmBin, 'vitest')) || fileExists(path.join(nmBin, 'vitest.cmd'))) hasTestRunner = true;
  if (fileExists(path.join(nmBin, 'jest')) || fileExists(path.join(nmBin, 'jest.cmd'))) hasTestRunner = true;
}

// If still not found, avoid running `npx` which may trigger network installs; instead warn and provide a remediation template
if (!hasTestRunner) {
  // Optional: allow networked npx checks in local/dev scenarios by setting ALLOW_NETWORK=1
  if (process.env.ALLOW_NETWORK === '1') {
    try {
      // use a short timeout to avoid long waits in restricted environments
      execSync('npx --yes vitest --version', { stdio: 'ignore', timeout: 15000 });
      hasTestRunner = true;
    } catch {
      try {
        execSync('npx --yes jest --version', { stdio: 'ignore', timeout: 15000 });
        hasTestRunner = true;
      } catch {
        // networked npx check failed or timed out
        hasTestRunner = false;
      }
    }
  }
}

if (!hasTestRunner) missing.push('Vitest or Jest (declared in package.json or installed in node_modules)');

if (missing.length > 0) {
  console.error('\nERROR: Missing required tools:');
  for (const m of missing) console.error(` - ${m}`);
  console.error('\nRemediation:');
  console.error(' - Ensure Node, Git and npx are installed in the environment.');
  console.error(' - Add Vitest or Jest to your package.json devDependencies and run `npm ci` so the runner is available locally, or install the runner in CI images.');
  console.error('\nIf you want to allow `npx` to fetch remote packages during this check, run the script with the environment variable ALLOW_NETWORK=1 (not recommended for CI).');
  console.error('\nSuggested TODO entry template:');
  console.error('\n- [ ] Provision tools: ' + missing.join(', '));
  console.error('  - Owner: @devops-team');
  console.error('  - Due: YYYY-MM-DD');
  process.exit(2);
}

console.log('All required tools appear available (local checks).');
process.exit(0);
