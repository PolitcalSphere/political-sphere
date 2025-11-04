import { describe, it, expect, beforeEach } from 'vitest';
import { PartyStore } from '../../src/party-store.js';

function createFakeDb() {
  const parties = [];
  return {
    prepare(sql) {
      const up = sql.trim().toUpperCase();
      if (up.startsWith('INSERT')) {
        return {
          run(id, name, description, color, created_at) {
            parties.push({ id, name, description, color, created_at });
            return { changes: 1 };
          },
        };
      }

      if (up.includes('SELECT COUNT(*)')) {
        return {
          get() {
            return { count: parties.length };
          },
        };
      }

      if (up.includes('WHERE ID = ?')) {
        return {
          get(id) {
            return parties.find((p) => p.id === id) || null;
          },
        };
      }

      if (up.includes('WHERE NAME = ?')) {
        return {
          get(name) {
            return parties.find((p) => p.name === name) || null;
          },
        };
      }

      if (up.includes('LIMIT')) {
        return {
          all(limit, offset) {
            return parties.slice(offset, offset + limit);
          },
        };
      }

      return {
        all() {
          return parties.slice();
        },
      };
    },
  };
}

function createFakeCache() {
  const map = new Map();
  return {
    async get(k) {
      return map.has(k) ? map.get(k) : null;
    },
    async set(k, v) {
      map.set(k, v);
      return true;
    },
    async del(k) {
      map.delete(k);
      return true;
    },
    async invalidatePattern() {
      return true;
    },
  };
}

describe('PartyStore (in-memory)', () => {
  let store;

  beforeEach(() => {
    const db = createFakeDb();
    const cache = createFakeCache();
    store = new PartyStore(db, cache);
  });

  it('creates and returns a party', async () => {
    const p = await store.create({ name: 'Greens', color: '#00ff00', description: 'Green party' });
    expect(p).toHaveProperty('id');
    expect(p.name).toBe('Greens');
  });

  it('getById and getByName return expected objects', async () => {
    const created = await store.create({ name: 'Labour', color: '#ff0000', description: 'Labour party' });
    const byId = await store.getById(created.id);
    expect(byId).not.toBeNull();
    const byName = await store.getByName('Labour');
    expect(byName).not.toBeNull();
    expect(byName.name).toBe('Labour');
  });

  it('getAll supports pagination and returns total', async () => {
    for (let i = 0; i < 7; i++) {
      await store.create({ name: `P${i}`, color: '#000', description: null });
    }
    const res = await store.getAll(2, 3); // page 2, 3 per page
    expect(res).toHaveProperty('parties');
    expect(res).toHaveProperty('total');
    expect(res.total).toBeGreaterThanOrEqual(7);
  });
});
