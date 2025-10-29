import { execSync } from 'node:child_process';
const diff = execSync('git diff --cached', { encoding: 'utf8' });
const prompt = `Write a Conventional Commit message (type(scope): short) + body for these changes:\n${diff}`;
const msg = execSync(`ollama run llama3 '${prompt.replace(/'/g, "'\\''")}'`, {
  encoding: 'utf8',
});
console.log(msg.trim());
