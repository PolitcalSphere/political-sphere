#!/usr/bin/env node

/**
 * Sequentially runs fast quality gates that every Blackbox-assisted change must pass.
 * Each check maps to an existing package.json script. Missing scripts are skipped with a warning
 * so the guard remains resilient as the toolchain evolves.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..');

const readPackageScripts = async () => {
  const packageJsonPath = join(repoRoot, 'package.json');
  const raw = await readFile(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw);
  return new Set(Object.keys(pkg.scripts ?? {}));
};

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        FORCE_COLOR: 'true',
        ...options.env,
      },
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
      }
    });
  });

const checks = [
  {
    name: 'ESLint',
    script: 'lint',
  },
  {
    name: 'TypeScript type check',
    script: 'typecheck',
  },
  {
    name: 'Documentation lint',
    script: 'docs:lint',
  },
  {
    name: 'Unit test smoke suite',
    script: 'test',
    env: {
      // Allow teams to override to a faster smoke suite when needed.
      GUARD_MODE: 'smoke',
    },
  },
  {
    name: 'Boundary linting',
    script: 'lint:boundaries',
    env: {
      GUARD_MODE: process.env.GUARD_MODE || 'default',
    },
    optional: true, // Only run if GUARD_MODE=strict
  },
];

const metricsDir = join(repoRoot, 'ai-metrics');
const guardHistoryPath = join(metricsDir, 'guard-history.json');

const persistGuardRun = async (entry) => {
  await mkdir(metricsDir, { recursive: true });

  let history = [];
  try {
    const existing = await readFile(guardHistoryPath, 'utf8');
    history = JSON.parse(existing);
    if (!Array.isArray(history)) {
      history = [];
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  history.push(entry);
  const MAX_ENTRIES = 200;
  if (history.length > MAX_ENTRIES) {
    history = history.slice(-MAX_ENTRIES);
  }

  await writeFile(guardHistoryPath, JSON.stringify(history, null, 2));
};

const main = async () => {
  const startedAt = Date.now();
  const availableScripts = await readPackageScripts();
  let hasFailures = false;
  const results = [];

  for (const check of checks) {
    if (!availableScripts.has(check.script)) {
      results.push({ name: check.name, status: 'skipped', reason: 'script missing' });
      continue;
    }

    // Skip optional checks unless GUARD_MODE=strict
    if (check.optional && process.env.GUARD_MODE !== 'strict') {
      results.push({ name: check.name, status: 'skipped', reason: 'GUARD_MODE not strict' });
      continue;
    }

    try {
      console.log(`\n🔍 Running ${check.name} via npm run ${check.script}...`);
      await runCommand('npm', ['run', check.script], { env: check.env });
      results.push({ name: check.name, status: 'passed' });
    } catch (error) {
      hasFailures = true;
      results.push({ name: check.name, status: 'failed', reason: error.message });
      console.error(`❌ ${check.name} failed: ${error.message}`);
      break; // stop early to save time once a guard fails
    }
  }

  console.log('\n=== Guard Summary ===');
  for (const result of results) {
    if (result.status === 'passed') {
      console.log(`✅ ${result.name}`);
    } else if (result.status === 'skipped') {
      console.log(`⚠️  ${result.name} skipped (${result.reason})`);
    } else {
      console.log(`❌ ${result.name} (${result.reason})`);
    }
  }

  const guardEntry = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    status: hasFailures ? 'failed' : 'passed',
    actor: process.env.GIT_AUTHOR_NAME || process.env.USER || process.env.USERNAME || 'unknown',
    checks: results,
  };

  try {
    await persistGuardRun(guardEntry);
  } catch (error) {
    console.error(`⚠️  Failed to persist guard telemetry: ${error.message}`);
  }

  if (hasFailures) {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(`Unexpected guard failure: ${error.message}`);
  process.exit(1);
});
