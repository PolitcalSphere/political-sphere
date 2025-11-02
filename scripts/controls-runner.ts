#!/usr/bin/env node
/**
 * Controls Runner
 * Parses docs/controls.yml and executes each control, failing on blocking violations.
 * Output: human-readable summary and GitHub Actions annotations.
 */
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CommandControl {
  id: string;
  name: string;
  severity: 'blocker' | 'warning';
  type: 'command';
  command: string;
}

interface MetricSpec {
  run: string;
  file: string;
  jsonPath: string; // dot-notation path
  threshold: number;
  comparison: '>=' | '>' | '<=' | '<';
}

interface MetricControl {
  id: string;
  name: string;
  severity: 'blocker' | 'warning';
  type: 'metric';
  metric: MetricSpec;
}

type Control = CommandControl | MetricControl;

interface Catalogue {
  version: number;
  metadata?: Record<string, unknown>;
  controls: Control[];
}

function logGroupStart(name: string) {
  // GitHub Actions group start
  console.log(`::group::${name}`);
}
function logGroupEnd() {
  console.log('::endgroup::');
}

function annotate(kind: 'error' | 'warning' | 'notice', message: string) {
  console.log(`::${kind}::${message.replace(/\n/g, '%0A')}`);
}

async function runShell(
  cmd: string,
  cwd: string
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    // Use shell: true to handle complex commands with pipes, redirects, etc.
    const child = spawn(cmd, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.on('error', (err) => {
      stderr += `Spawn error: ${err.message}`;
      resolve({ code: 1, stdout, stderr });
    });
  });
}

function getByPath(obj: unknown, pathStr: string): unknown {
  return pathStr.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function compare(a: number, op: MetricSpec['comparison'], b: number): boolean {
  switch (op) {
    case '>=':
      return a >= b;
    case '>':
      return a > b;
    case '<=':
      return a <= b;
    case '<':
      return a < b;
  }
}

async function runCommandControl(ctrl: CommandControl, repoRoot: string) {
  logGroupStart(`${ctrl.name} [${ctrl.id}]`);
  console.log(`Severity: ${ctrl.severity}`);
  console.log(`Running: ${ctrl.command}`);
  const { code, stdout, stderr } = await runShell(ctrl.command, repoRoot);
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
  const passed = code === 0;
  if (!passed) {
    const msg = `${ctrl.name} failed (command exit code ${code}).`;
    annotate(ctrl.severity === 'blocker' ? 'error' : 'warning', msg);
  }
  logGroupEnd();
  return { id: ctrl.id, name: ctrl.name, passed, severity: ctrl.severity } as const;
}

async function runMetricControl(ctrl: MetricControl, repoRoot: string) {
  logGroupStart(`${ctrl.name} [${ctrl.id}]`);
  console.log(`Severity: ${ctrl.severity}`);
  console.log(`Preparing metric via: ${ctrl.metric.run}`);
  const prep = await runShell(ctrl.metric.run, repoRoot);
  if (prep.stdout.trim()) console.log(prep.stdout.trim());
  if (prep.stderr.trim()) console.error(prep.stderr.trim());
  // Even if prep failed, attempt to read file to give better error context
  const metricPath = path.resolve(repoRoot, ctrl.metric.file);
  let value: number | undefined;
  try {
    const raw = readFileSync(metricPath, 'utf8');
    const json = JSON.parse(raw);
    const v = getByPath(json, ctrl.metric.jsonPath);
    value = typeof v === 'number' ? v : Number(v);
  } catch (_e) {
    annotate(
      ctrl.severity === 'blocker' ? 'error' : 'warning',
      `Metric file not readable: ${metricPath}`
    );
  }
  let passed = false;
  if (typeof value === 'number' && Number.isFinite(value)) {
    passed = compare(value, ctrl.metric.comparison, ctrl.metric.threshold);
    console.log(
      `Metric ${ctrl.metric.jsonPath} = ${value} ${ctrl.metric.comparison} ${ctrl.metric.threshold} => ${passed ? 'OK' : 'VIOLATION'}`
    );
    if (!passed) {
      annotate(
        ctrl.severity === 'blocker' ? 'error' : 'warning',
        `${ctrl.name} threshold not met: ${value} ${ctrl.metric.comparison} ${ctrl.metric.threshold}`
      );
    }
  } else {
    annotate(
      ctrl.severity === 'blocker' ? 'error' : 'warning',
      `${ctrl.name} metric value is missing or not numeric.`
    );
  }
  logGroupEnd();
  return { id: ctrl.id, name: ctrl.name, passed, severity: ctrl.severity } as const;
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const cataloguePath = path.resolve(repoRoot, 'docs', 'controls.yml');
  console.log(`Loading controls from: ${cataloguePath}`);
  const yamlText = readFileSync(cataloguePath, 'utf8');
  console.log(`Parsing YAML (${yamlText.length} bytes)...`);
  const config = YAML.parse(yamlText) as Catalogue;
  console.log(`Parsed config:`, config);

  if (!config || !Array.isArray(config.controls)) {
    console.error('Invalid controls catalogue: missing controls array');
    process.exit(2);
  }

  console.log(`Loaded ${config.controls.length} controls (version ${config.version}).`);
  const results: { id: string; name: string; passed: boolean; severity: string }[] = [];
  for (const ctrl of config.controls) {
    if (ctrl.type === 'command') {
      results.push(await runCommandControl(ctrl as CommandControl, repoRoot));
    } else if (ctrl.type === 'metric') {
      results.push(await runMetricControl(ctrl as MetricControl, repoRoot));
    } else {
      // Satisfy TypeScript exhaustiveness under exactOptionalPropertyTypes without referencing unreachable properties
      annotate('warning', `Unknown control type encountered. Skipping.`);
    }
  }

  const blockersFailed = results.filter((r) => !r.passed && r.severity === 'blocker');
  const warningsFailed = results.filter((r) => !r.passed && r.severity === 'warning');

  console.log('\nControls Summary');
  console.log('================');
  for (const r of results) {
    console.log(`${r.passed ? '✔' : '✖'} [${r.severity}] ${r.id} - ${r.name}`);
  }

  if (blockersFailed.length > 0) {
    console.error(`\nBlocking violations: ${blockersFailed.length}. Failing job.`);
    process.exit(1);
  }
  if (warningsFailed.length > 0) {
    annotate('notice', `${warningsFailed.length} warning control(s) did not pass.`);
  }
  console.log('\nAll blocking controls passed.');
}

main().catch((err) => {
  annotate('error', `Controls runner crashed: ${err?.message || err}`);
  process.exit(1);
});
