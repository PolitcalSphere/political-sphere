import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import { getDatabase, closeDatabase } from '../../src/stores/index.js';

function createStubCache() {
  const calls = [];
  return {
    calls,
    async get() {
      calls.push({ method: 'get', args: Array.from(arguments) });
      return null;
    },
    async set(key, value, ttl) {
      calls.push({ method: 'set', key, ttl, value });
    },
    async del(key) {
      calls.push({ method: 'del', key });
    },
    async invalidatePattern(pattern) {
      calls.push({ method: 'invalidate', pattern });
    },
    async close() {
      calls.push({ method: 'close' });
    },
  };
}

describe('DatabaseConnection cache integration', () => {
  const originalEnableCache = process.env.API_ENABLE_CACHE;

  beforeEach(() => {
    process.env.API_ENABLE_CACHE = 'false';
    closeDatabase();
  });

  afterEach(() => {
    closeDatabase();
    if (originalEnableCache === undefined) {
      delete process.env.API_ENABLE_CACHE;
    } else {
      process.env.API_ENABLE_CACHE = originalEnableCache;
    }
  });

  test('reuses provided cache instance across all stores', async () => {
    const cache = createStubCache();
    const db = getDatabase({ cache });

    const user = await db.users.create({
      username: 'cache-user',
      email: 'cache-user@example.com',
    });

    const bill = await db.bills.create({
      title: 'Transparency Bill',
      description: 'Improve spending disclosures',
      proposerId: user.id,
    });

    await db.votes.create({
      billId: bill.id,
      userId: user.id,
      vote: 'aye',
    });

    const userSets = cache.calls.filter(
      (call) => call.method === 'set' && String(call.key).startsWith('user:')
    );
    expect(userSets.length).toBeGreaterThanOrEqual(3);

    expect(
      cache.calls.some((call) => call.method === 'del' && call.key === `bill:${bill.id}:votes`)
    ).toBe(true);
    expect(
      cache.calls.some((call) => call.method === 'del' && call.key === `user:${user.id}:votes`)
    ).toBe(true);

    closeDatabase();

    expect(cache.calls.some((call) => call.method === 'close')).toBe(false);
  });
});
