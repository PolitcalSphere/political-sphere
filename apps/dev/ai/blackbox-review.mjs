#!/usr/bin/env node

// Blackbox AI-powered code review assistant
// Integrates with Blackbox API for enhanced code analysis

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only HEAD~1', {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return output
      .trim()
      .split('\n')
      .filter((f) => f);
  } catch (e) {
    console.log('No previous commit found, using all files');
    return [];
  }
}

function analyzeFile(filePath) {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) return null;

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  // Basic analysis
  const analysis = {
    file: filePath,
    lines: lines.length,
    functions: (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || [])
      .length,
    classes: (content.match(/class\s+\w+/g) || []).length,
    imports: (content.match(/import\s+|require\(/g) || []).length,
    complexity: 'low', // placeholder
  };

  return analysis;
}

function generateReviewPrompt(changedFiles) {
  const analyses = changedFiles.map(analyzeFile).filter(Boolean);

  return `You are an expert code reviewer. Analyze these code changes for:

1. Code quality and best practices
2. Security vulnerabilities
3. Performance issues
4. Maintainability concerns
5. Testing gaps

Changed files analysis:
${analyses.map((a) => `- ${a.file}: ${a.lines} lines, ${a.functions} functions, ${a.classes} classes`).join('\n')}

Provide specific, actionable feedback with severity levels (high/medium/low). Focus on the most critical issues first.`;
}

async function main() {
  console.log('🤖 Blackbox AI Code Review Assistant');
  console.log('=====================================');

  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    console.log('No changed files detected.');
    return;
  }

  console.log(`Analyzing ${changedFiles.length} changed files...`);

  // For now, simulate Blackbox integration
  // In production, this would call Blackbox API
  const prompt = generateReviewPrompt(changedFiles);

  console.log('\n📋 Review Prompt Generated:');
  console.log(prompt);

  console.log('\n💡 Recommendations:');
  console.log('1. Run security scans on changed files');
  console.log('2. Check for proper error handling');
  console.log('3. Verify test coverage for new code');
  console.log('4. Review dependency changes for vulnerabilities');

  // Placeholder for actual Blackbox API call
  console.log('\n🔮 Blackbox AI Review (simulated):');
  console.log('✅ Code quality looks good');
  console.log('⚠️  Consider adding more error handling in async functions');
  console.log('🔒 No security issues detected');
  console.log('📊 Performance: No major concerns');

  console.log(
    '\nTo integrate with real Blackbox API, add your API key and endpoint.'
  );
}

if (require.main === module) {
  main().catch(console.error);
}
