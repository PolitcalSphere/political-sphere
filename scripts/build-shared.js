#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const sharedRoot = resolve(repoRoot, 'libs', 'shared');
const srcDir = resolve(sharedRoot, 'src');
const distDir = resolve(sharedRoot, 'dist');

const runTypeScriptBuild = () => {
  execSync('tsc -p libs/shared/tsconfig.json', {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  console.log('Built libs/shared with tsc');
};

const fallbackCopy = (originalError) => {
  console.warn(
    'tsc build failed or not configured, falling back to copying src to dist'
  );
  if (originalError) {
    const message =
      originalError instanceof Error ? originalError.message : String(originalError);
    console.debug(`TypeScript build error: ${message}`);
  }

  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });

  if (existsSync(srcDir)) {
    cpSync(srcDir, join(distDir, 'src'), { recursive: true });
  }

  const packageJsonPath = resolve(sharedRoot, 'package.json');
  if (existsSync(packageJsonPath)) {
    cpSync(packageJsonPath, join(distDir, 'package.json'));
  }

  const overridePath = resolve(distDir, 'package.override.json');
  if (existsSync(overridePath)) {
    cpSync(overridePath, join(distDir, 'package.json'));
  }

  console.log('Fallback: copied src to libs/shared/dist');
};

try {
  runTypeScriptBuild();
} catch (error) {
  fallbackCopy(error);
}
