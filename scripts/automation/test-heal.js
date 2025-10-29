#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🤖 Self-Healing Test Script');

const command = process.argv[2];
const args = process.argv.slice(3);

console.log(`Running: ${command} ${args.join(' ')}`);

const child = spawn(command, args, { stdio: 'inherit' });

child.on('close', (code) => {
  console.log(`Command exited with code: ${code}`);
  process.exit(code);
});
