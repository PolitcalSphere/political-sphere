import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { summarizeNews } from '../src/aggregator.js';

test('summarizeNews aggregates totals, categories, tags and latest item', () => {
  const summary = summarizeNews([
    {
      id: '1',
      title: 'Policy Reform A',
      category: 'policy',
      tags: ['reform', 'health'],
      updatedAt: '2024-03-05T10:00:00.000Z',
    },
    {
      id: '2',
      title: 'Policy Reform B',
      category: 'policy',
      tags: ['reform', 'economy'],
      updatedAt: '2024-03-06T12:00:00.000Z',
    },
    {
      id: '3',
      title: 'Election Update',
      category: 'elections',
      tags: ['campaign'],
      updatedAt: '2024-03-04T09:30:00.000Z',
    },
  ]);

  assert.equal(summary.total, 3);
  assert.deepEqual(summary.categories, { policy: 2, elections: 1 });
  assert.equal(summary.tags.reform, 2);
  assert.equal(summary.tags.health, 1);
  assert.equal(summary.latest.id, '2');
});

test('summarizeNews handles empty or malformed input gracefully', () => {
  const summary = summarizeNews(null);
  assert.equal(summary.total, 0);
  assert.deepEqual(summary.categories, {});
  assert.equal(summary.latest, null);
});
