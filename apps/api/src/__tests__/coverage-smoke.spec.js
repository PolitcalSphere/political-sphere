import { describe, it, expect } from 'vitest';
import { smoke } from '../coverage-smoke.js';

describe('coverage smoke', () => {
  it('executes the smoke function so coverage records statements', () => {
    const v = smoke();
    expect(v).toBe(42);
  });
});
