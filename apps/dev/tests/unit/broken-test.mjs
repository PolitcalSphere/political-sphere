import { test } from 'node:test';
import assert from 'assert';

test('self-healing demo - should demonstrate auto-fixing', () => {
  assert.strictEqual(2 + 2, 4);
});

test('self-healing demo - nested tests - nested test case', () => {
  assert.ok(true);
});
