import { describe, it, expect, beforeEach } from 'vitest';
import { VoteStore } from '../../src/vote-store.js';

function createFakeDb() {
  const votes = [];
  return {
    prepare(sql) {
      const up = sql.trim().toUpperCase();
      if (up.startsWith('INSERT')) {
        return {
          run(id, bill_id, user_id, vote, created_at) {
            votes.push({ id, bill_id, user_id, vote, created_at });
            return { changes: 1 };
          },
        };
      }

      if (up.includes('WHERE ID = ?')) {
        return {
          get(id) {
            return votes.find((v) => v.id === id) || null;
          },
        };
      }

      if (up.includes('COUNT(*)')) {
        return {
          get(userId, billId) {
            const n = votes.filter((v) => v.user_id === userId && v.bill_id === billId).length;
            return { count: n };
          },
        };
      }

      if (up.includes('WHERE BILL_ID = ?') && up.includes('SUM')) {
        return {
          get(billId) {
            const subset = votes.filter((v) => v.bill_id === billId);
            const aye = subset.filter((s) => s.vote === 'aye').length;
            const nay = subset.filter((s) => s.vote === 'nay').length;
            const abstain = subset.filter((s) => s.vote === 'abstain').length;
            return { aye, nay, abstain };
          },
        };
      }
      
      if (up.includes('WHERE BILL_ID = ?')) {
        return {
          all(billId) {
            return votes.filter((v) => v.bill_id === billId);
          },
        };
      }

      if (up.includes('WHERE USER_ID = ?')) {
        return {
          all(userId) {
            return votes.filter((v) => v.user_id === userId);
          },
        };
      }

      if (up.includes('COUNT(*)')) {
        return {
          get(userId, billId) {
            const n = votes.filter((v) => v.user_id === userId && v.bill_id === billId).length;
            return { count: n };
          },
        };
      }

      return {
        all() {
          return votes.slice();
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
  };
}

describe('VoteStore (in-memory)', () => {
  let store;

  beforeEach(() => {
    const db = createFakeDb();
    const cache = createFakeCache();
    store = new VoteStore(db, cache);
  });

  it('creates a vote and returns expected shape', async () => {
    const input = { billId: 'b1', userId: 'u1', vote: 'aye' };
    const v = await store.create(input);
    expect(v).toHaveProperty('id');
    expect(v.billId).toBe('b1');
    expect(v.vote).toBe('aye');
  });

  it('getByBillId and getByUserId return arrays', async () => {
    await store.create({ billId: 'b2', userId: 'u2', vote: 'nay' });
    await store.create({ billId: 'b2', userId: 'u3', vote: 'aye' });

    const byBill = await store.getByBillId('b2');
    expect(Array.isArray(byBill)).toBe(true);
    expect(byBill.length).toBeGreaterThanOrEqual(2);

    const byUser = await store.getByUserId('u2');
    expect(Array.isArray(byUser)).toBe(true);
    expect(byUser[0].userId).toBe('u2');
  });

  it('hasUserVotedOnBill returns true/false correctly', async () => {
    await store.create({ billId: 'b3', userId: 'u4', vote: 'abstain' });
    const yes = await store.hasUserVotedOnBill('u4', 'b3');
    const no = await store.hasUserVotedOnBill('nope', 'b3');
    expect(yes).toBe(true);
    expect(no).toBe(false);
  });

  it('getVoteCounts aggregates counts', async () => {
    await store.create({ billId: 'b4', userId: 'x1', vote: 'aye' });
    await store.create({ billId: 'b4', userId: 'x2', vote: 'aye' });
    await store.create({ billId: 'b4', userId: 'x3', vote: 'nay' });
    const counts = await store.getVoteCounts('b4');
    expect(counts.aye).toBe(2);
    expect(counts.nay).toBe(1);
    expect(counts.abstain).toBe(0);
  });
});
