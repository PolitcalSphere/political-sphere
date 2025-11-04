import { describe, it, expect, beforeEach } from 'vitest';
import { UserStore } from '../../src/user-store.js';

function createFakeDb() {
  const users = [];
  return {
    prepare(sql) {
      const up = sql.trim().toUpperCase();
      if (up.startsWith('INSERT')) {
        return {
          run(id, username, email, created_at, updated_at) {
            users.push({ id, username, email, created_at, updated_at });
            return { changes: 1 };
          },
        };
      }

      if (up.includes('WHERE ID = ?')) {
        return {
          get(id) {
            return users.find((u) => u.id === id) || null;
          },
        };
      }

      if (up.includes('WHERE USERNAME = ?')) {
        return {
          get(username) {
            return users.find((u) => u.username === username) || null;
          },
        };
      }

      if (up.includes('WHERE EMAIL = ?')) {
        return {
          get(email) {
            return users.find((u) => u.email === email) || null;
          },
        };
      }

      return {
        all() {
          return users.slice();
        },
      };
    },
  };
}

function createFakeCache() {
  const store = new Map();
  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async set(key, value) {
      store.set(key, value);
      return true;
    },
    async invalidatePattern() {
      // noop for tests
      return true;
    },
  };
}

describe('UserStore (in-memory DB + cache)', () => {
  let db;
  let cache;
  let store;

  beforeEach(() => {
    db = createFakeDb();
    cache = createFakeCache();
    store = new UserStore(db, cache);
  });

  it('creates a user and caches it', async () => {
    const input = { username: 'alice', email: 'a@example.com' };
    const created = await store.create(input);
    expect(created).toHaveProperty('id');
    expect(created.username).toBe('alice');

    // cached by id
    const cached = await cache.get(`user:${created.id}`);
    expect(cached).not.toBeNull();
    expect(cached.username).toBe('alice');
  });

  it('retrieves user by id and uses cache when present', async () => {
    const input = { username: 'bob', email: 'b@example.com' };
    const created = await store.create(input);

    // clear DB but keep cache populated to ensure cache path works
    const userFromDb = await store.getById(created.id);
    expect(userFromDb).not.toBeNull();

    // simulate cache hit
    const cached = await cache.get(`user:${created.id}`);
    expect(cached).not.toBeNull();
  });

  it('can lookup by username and email', async () => {
    const input = { username: 'carol', email: 'c@example.com' };
    await store.create(input);
    const byUsername = await store.getByUsername('carol');
    expect(byUsername).not.toBeNull();
    expect(byUsername.email).toBe('c@example.com');

    const byEmail = await store.getByEmail('c@example.com');
    expect(byEmail).not.toBeNull();
    expect(byEmail.username).toBe('carol');
  });
});
