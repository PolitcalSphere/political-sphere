import { execSync } from 'node:child_process';
import fs from 'node:fs';

try {
  // Try to get diff from git
  const diff = execSync('git diff HEAD~1', { encoding: 'utf8' });
  const prompt = `Review this code diff for potential issues, bugs, or improvements. Focus on security, performance, and best practices:\n${diff}`;
  const review = execSync(
    `ollama run llama3 '${prompt.replace(/'/g, "'\\''")}'`,
    { encoding: 'utf8' }
  );
  console.log('AI Review:');
  console.log(review.trim());
} catch (error) {
  console.log(
    'Ollama not available or no diff found. Falling back to basic linting...'
  );
  try {
    execSync('npm run lint', { stdio: 'inherit' });
    execSync('npm run typecheck', { stdio: 'inherit' });
  } catch (lintError) {
    console.error('Linting failed:', lintError.message);
  }
}
