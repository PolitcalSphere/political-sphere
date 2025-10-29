#!/usr/bin/env node
import { execSync } from 'child_process';

function hasCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function gitChangedFiles() {
  try {
    return execSync('git diff --name-only origin/main...HEAD', {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

function fallbackPR() {
  const files = gitChangedFiles();
  const title = `chore: update ${files[0] || 'repository'}`;
  const body = [];
  body.push('Summary: short summary of changes.');
  body.push('Changes:');
  body.push('- Bullet 1');
  body.push('- Bullet 2');
  body.push('Testing: describe how to test');
  body.push('\nChecklist:');
  body.push('- [ ] Tests added');
  body.push('- [ ] Docs updated');
  return `${title}\n\n${body.join('\n')}`;
}

function main() {
  if (hasCommand('ollama')) {
    const files = gitChangedFiles();
    const prompt = `You are an offline assistant. Create a PR title and a 5-8 line PR description including summary, changes, testing steps, and a short checklist. Files changed: ${files.join(', ')}`;
    try {
      const out = execSync(
        `ollama run llama3 --prompt "${prompt.replace(/"/g, '\\"')}"`,
        { encoding: 'utf8' }
      );
      console.log(out.trim());
      return;
    } catch (e) {
      /* fallthrough */
    }
  }
  console.log(fallbackPR());
}

main();
