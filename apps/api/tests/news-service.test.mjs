import { describe, test, expect } from '@jest/globals';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonNewsStore } from '../src/newsStore.js';
import { NewsService } from '../src/newsService.js';

const fixturesDir = fileURLToPath(new URL('../data/', import.meta.url));

async function setupStore(initialData = []) {
  const tempDir = await mkdtemp(join(tmpdir(), 'news-service-test-'));
  const filePath = join(tempDir, 'news.json');
  await writeFile(filePath, JSON.stringify(initialData, null, 2));

  // Pass the filesystem path (string). JsonNewsStore implementations commonly expect a path, not a file:// URL.
  const store = new JsonNewsStore(filePath);
  const service = new NewsService(store, () => new Date('2024-03-01T12:00:00.000Z'));

  return { service, filePath };
}

describe('NewsService', () => {
  describe('create()', () => {
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

      expect(created.id).toBeTruthy();
      expect(created.category).toBe('governance');
      expect(created.tags).toHaveLength(2);
      expect(created.createdAt).toBe('2024-03-01T12:00:00.000Z');

      const list = await service.list();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(created.id);

      const persisted = JSON.parse(await readFile(filePath, 'utf8'));
      expect(persisted).toHaveLength(1);
    });

    test('filters records by category, tag, limit and search', async () => {
      const seed = JSON.parse(await readFile(join(fixturesDir, 'news.json'), 'utf8'));
      const { service } = await setupStore(seed);

      const governance = await service.list({ category: 'governance' });
      expect(governance).toHaveLength(1);
      expect(governance[0].id).toBe('democracy-watch');

      const byTag = await service.list({ tag: 'transparency' });
      expect(byTag).toHaveLength(1);
      expect(byTag[0].id).toBe('campaign-finance');

      const search = await service.list({ search: 'donation' });
      expect(search).toHaveLength(1);
      expect(search[0].id).toBe('campaign-finance');

      const limit = await service.list({ limit: 1 });
      expect(limit).toHaveLength(1);
    });

    test('update returns null when record missing', async () => {
      const { service } = await setupStore();
      const result = await service.update('missing-id', { title: 'noop' });
      expect(result).toBeNull();
    });

    test('analytics summary aggregates categories and recency', async () => {
      const seed = JSON.parse(await readFile(join(fixturesDir, 'news.json'), 'utf8'));
      const { service } = await setupStore(seed);

      const summary = await service.analyticsSummary();
      expect(summary.total).toBe(2);
      expect(summary.categories).toEqual({ governance: 1, finance: 1 });
      expect(summary.recent.length).toBeGreaterThan(0);
      expect(summary.recent[0].id).toBe('campaign-finance');
    });

    test('create throws validation errors when required fields missing', async () => {
      const { service } = await setupStore();

      await expect(
        service.create({
          title: '',
          excerpt: 'Need a title',
          content: 'Need a title',
        })
      ).rejects.toThrow('Missing required fields');
    });
  });
});
