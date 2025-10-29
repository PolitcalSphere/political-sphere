import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { JsonNewsStore } from '../src/newsStore.js';
import { NewsService } from '../src/newsService.js';

const fixturesDir = fileURLToPath(new URL('../data/', import.meta.url));

async function setupStore(initialData = []) {
  const dir = await mkdtemp(join(tmpdir(), 'news-store-'));
  const filePath = join(dir, 'news.json');
  await writeFile(filePath, JSON.stringify(initialData, null, 2), 'utf8');
  const fileUrl = pathToFileURL(filePath);
  const store = new JsonNewsStore(fileUrl);
  const service = new NewsService(store, () => new Date('2024-03-01T12:00:00.000Z'));
  return { store, service, filePath };
}

test('creates a record and returns it from list()', async () => {
  const { service, filePath } = await setupStore();

  const created = await service.create({
    title: 'Parliament Announces Coalition Agreement',
    excerpt: 'Coalition partners outline priorities for the next legislative cycle.',
    content: 'The agreement introduces major reforms on climate policy and electoral transparency.',
    category: 'governance',
    tags: ['coalition', 'transparency'],
    sources: ['https://example.org/news/coalition'],
  });

  assert.ok(created.id, 'record should have an id');
  assert.equal(created.category, 'governance');
  assert.equal(created.tags.length, 2);
  assert.equal(created.createdAt, '2024-03-01T12:00:00.000Z');

  const list = await service.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, created.id);

  const persisted = JSON.parse(await readFile(filePath, 'utf8'));
  assert.equal(persisted.length, 1);
});

test('filters records by category, tag, limit and search', async () => {
  const seed = JSON.parse(await readFile(join(fixturesDir, 'news.json'), 'utf8'));
  const { service } = await setupStore(seed);

  const governance = await service.list({ category: 'governance' });
  assert.equal(governance.length, 1);
  assert.equal(governance[0].id, 'democracy-watch');

  const byTag = await service.list({ tag: 'transparency' });
  assert.equal(byTag.length, 1);
  assert.equal(byTag[0].id, 'campaign-finance');

  const search = await service.list({ search: 'donation' });
  assert.equal(search.length, 1);
  assert.equal(search[0].id, 'campaign-finance');

  const limit = await service.list({ limit: 1 });
  assert.equal(limit.length, 1);
});

test('update returns null when record missing', async () => {
  const { service } = await setupStore();
  const result = await service.update('missing-id', { title: 'noop' });
  assert.equal(result, null);
});

test('analytics summary aggregates categories and recency', async () => {
  const seed = JSON.parse(await readFile(join(fixturesDir, 'news.json'), 'utf8'));
  const { service } = await setupStore(seed);

  const summary = await service.analyticsSummary();
  assert.equal(summary.total, 2);
  assert.deepEqual(summary.categories, { governance: 1, finance: 1 });
  assert.ok(summary.recent.length > 0);
  assert.equal(summary.recent[0].id, 'campaign-finance');
});

test('create throws validation errors when required fields missing', async () => {
  const { service } = await setupStore();

  await assert.rejects(
    () =>
      service.create({
        title: '',
        excerpt: 'Need a title',
        content: 'Need a title',
      }),
    (error) => error.code === 'VALIDATION_ERROR',
  );
});
