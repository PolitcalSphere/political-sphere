import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const distRoot = join(process.cwd(), 'libs', 'shared', 'dist');
const entryPath = join(distRoot, 'index.js');

mkdirSync(distRoot, { recursive: true });

const content = `// Auto-generated dev package entry for @political-sphere/shared
export * from './src/security.js';
export * from './src/logger.js';
`;

writeFileSync(entryPath, content, 'utf8');
console.log('Wrote', entryPath);
