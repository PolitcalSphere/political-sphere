import { describe, test, expect, beforeEach } from '@jest/globals';
import { CacheService } from '../../src/cache.ts';

class FakePipeline {
  #commands = [];

  constructor(store) {
    this.store = store;
  }

  del(key) {
    this.#commands.push(() => this.store.delete(key));
    return this;
  }

  async exec() {
    const results = this.#commands.map((command) => {
      try {
        command();
        return [null, 1];
      } catch (error) {
        return [error, null];
      }
    });
    this.#commands = [];
    return results;
  }
}

class FakeRedis {
  store = new Map();
  scanCalls = 0;
  closed = false;

  async get(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async set(key, value) {
    this.store.set(key, value);
    return 'OK';
  }

  async setex(key, _ttlSeconds, value) {
    this.store.set(key, value);
    return 'OK';
  }

  async del(...keys) {
    let removed = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        removed += 1;
      }
    }
    return removed;
  }

  async scan(cursor, ...args) {
    this.scanCalls += 1;
    let pattern = '*';
    let count = 10;

    for (let i = 0; i < args.length; i += 2) {
      const option = args[i];
      const value = args[i + 1];
      if (option === 'MATCH' && typeof value === 'string') {
        pattern = value;
      } else if (option === 'COUNT' && typeof value === 'number') {
        count = value;
      }
    }

    const keys = Array.from(this.store.keys()).sort();
    const startIndex = Number.parseInt(cursor, 10) || 0;
    const matcher = globToRegExp(pattern);

    const matches = [];
    let index = startIndex;
    while (index < keys.length && matches.length < count) {
      const key = keys[index];
      if (matcher.test(key)) {
        matches.push(key);
      }
      index += 1;
    }

    const nextCursor = index >= keys.length ? '0' : String(index);
    return [nextCursor, matches];
  }

  pipeline() {
    return new FakePipeline(this.store);
  }

  async quit() {
    this.closed = true;
    return 'OK';
  }
}

function globToRegExp(pattern) {
  const escaped = pattern.replace(/([.+^=!:${}()|[\]\\/])/g, '\\$1');
  const regex = `^${escaped.replace(/\*/g, '.*').replace(/\?/g, '.')}$`;
  return new RegExp(regex);
}

describe('CacheService', () => {
  let fakeRedis;
  let cache;

  beforeEach(() => {
    fakeRedis = new FakeRedis();
    cache = new CacheService(fakeRedis);
  });

  test('stores and retrieves structured data', async () => {
    await cache.set('user:123', { id: 123, role: 'admin' });
    const stored = await cache.get('user:123');
    expect(stored).toEqual({ id: 123, role: 'admin' });
  });

  test('removes key when TTL is zero or negative', async () => {
    await cache.set('session:1', { token: 'abc' });
    expect(fakeRedis.store.has('session:1')).toBe(true);

    await cache.set('session:1', { token: 'abc' }, 0);
    expect(fakeRedis.store.has('session:1')).toBe(false);

    await cache.set('session:2', { token: 'def' });
    await cache.set('session:2', { token: 'def' }, -30);
    expect(fakeRedis.store.has('session:2')).toBe(false);
  });

  test('invalidates keys using SCAN iteration', async () => {
    await cache.set('bill:1', { id: 1 });
    await cache.set('bill:2', { id: 2 });
    await cache.set('user:1', { id: 1 });

    await cache.invalidatePattern('bill:*');

    expect(fakeRedis.store.has('bill:1')).toBe(false);
    expect(fakeRedis.store.has('bill:2')).toBe(false);
    expect(fakeRedis.store.has('user:1')).toBe(true);
    expect(fakeRedis.scanCalls).toBeGreaterThan(0);
  });

  test('does not close injected redis client', async () => {
    await cache.close();
    expect(fakeRedis.closed).toBe(false);
  });
});
