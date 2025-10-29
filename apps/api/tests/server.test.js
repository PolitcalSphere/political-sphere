import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createNewsServer } from '../src/server.js';
import { NewsService } from '../src/newsService.js';

class MemoryStore {
  constructor(initial = []) {
    this.records = initial.map((item) => ({ ...item }));
  }

  async readAll() {
    return this.records.map((item) => ({ ...item }));
  }

  async writeAll(nextRecords) {
    this.records = nextRecords.map((item) => ({ ...item }));
  }
}

async function startServerWithData(seed = []) {
  const store = new MemoryStore(seed);
  const service = new NewsService(store, () => new Date('2024-03-10T14:00:00.000Z'));
  const server = createNewsServer(service);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const close = async () =>
    new Promise((resolve) => {
      server.close(resolve);
    });

  return { baseUrl, service, store, close };
}

test('GET /api/news returns seeded data', async (t) => {
  const { baseUrl, close } = await startServerWithData([
    {
      id: 'abc',
      title: 'Election Reform Bill Advances',
      excerpt: 'The committee approved the reform bill.',
      content: 'Full text',
      category: 'governance',
      tags: ['elections'],
      status: 'published',
      createdAt: '2024-03-09T12:00:00.000Z',
      updatedAt: '2024-03-09T12:00:00.000Z',
    },
  ]);

  t.after(close);

  const response = await fetch(`${baseUrl}/api/news`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.data.length, 1);
  assert.equal(payload.data[0].id, 'abc');
});

test('POST /api/news creates a record and persists it', async (t) => {
  const { baseUrl, store, close } = await startServerWithData();
  t.after(close);

  const payload = {
    title: 'Budget Transparency Portal Launches',
    excerpt: 'New portal surfaces government spending data.',
    content: 'Detailed description of the initiative.',
    category: 'finance',
    tags: ['transparency', 'budget'],
  };

  const response = await fetch(`${baseUrl}/api/news`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.ok(body.data.id);

  const records = await store.readAll();
  assert.equal(records.length, 1);
  assert.equal(records[0].title, payload.title);
  assert.deepEqual(records[0].tags, ['transparency', 'budget']);
});

test('POST /api/news validates required fields', async (t) => {
  const { baseUrl, close } = await startServerWithData();
  t.after(close);

  const response = await fetch(`${baseUrl}/api/news`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '',
      excerpt: '',
      content: '',
    }),
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.startsWith('Missing required fields'), true);
});

test('PUT /api/news/{id} updates existing records', async (t) => {
  const { baseUrl, store, close } = await startServerWithData([
    {
      id: 'abc',
      title: 'Initial Title',
      excerpt: 'Initial excerpt',
      content: 'Initial content',
      category: 'policy',
      tags: [],
      status: 'draft',
      createdAt: '2024-03-09T12:00:00.000Z',
      updatedAt: '2024-03-09T12:00:00.000Z',
    },
  ]);
  t.after(close);

  const response = await fetch(`${baseUrl}/api/news/abc`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Updated Title',
      status: 'published',
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.title, 'Updated Title');
  assert.equal(body.data.status, 'published');

  const records = await store.readAll();
  assert.equal(records[0].title, 'Updated Title');
});

test('PUT /api/news/{id} returns 404 for unknown record', async (t) => {
  const { baseUrl, close } = await startServerWithData();
  t.after(close);

  const response = await fetch(`${baseUrl}/api/news/unknown`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'noop' }),
  });

  assert.equal(response.status, 404);
});

test('GET /metrics/news provides aggregate summary', async (t) => {
  const { baseUrl, close } = await startServerWithData([
    {
      id: '1',
      title: 'Story A',
      excerpt: 'Ex',
      content: 'Content',
      category: 'finance',
      tags: ['budget'],
      status: 'published',
      createdAt: '2024-03-08T10:00:00.000Z',
      updatedAt: '2024-03-08T10:00:00.000Z',
    },
    {
      id: '2',
      title: 'Story B',
      excerpt: 'Ex',
      content: 'Content',
      category: 'governance',
      tags: ['reform'],
      status: 'published',
      createdAt: '2024-03-09T11:00:00.000Z',
      updatedAt: '2024-03-09T11:00:00.000Z',
    },
  ]);
  t.after(close);

  const response = await fetch(`${baseUrl}/metrics/news`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.total, 2);
  assert.equal(body.categories.finance, 1);
  assert.equal(Array.isArray(body.recent), true);
});
