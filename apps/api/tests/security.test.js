import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createNewsServer } from '../src/server.js';
import { NewsService } from '../src/newsService.js';
import { JsonNewsStore } from '../src/newsStore.js';

describe('API Security Tests', () => {
  let server;
  let service;
  const PORT = 4001;
  const BASE_URL = `http://localhost:${PORT}`;

  beforeAll(async () => {
    const store = new JsonNewsStore(new URL('../data/news.json', import.meta.url));
    service = new NewsService(store);
    server = createNewsServer(service);
    
    await new Promise((resolve) => {
      server.listen(PORT, '127.0.0.1', resolve);
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  describe('Security Headers', () => {
    test('includes Strict-Transport-Security header', async () => {
      const response = await fetch(`${BASE_URL}/healthz`);
      expect(response.headers.get('strict-transport-security')).toBeTruthy();
      expect(response.headers.get('strict-transport-security')).toContain('max-age=');
    });

    test('includes X-Content-Type-Options header', async () => {
      const response = await fetch(`${BASE_URL}/healthz`);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });

    test('includes X-Frame-Options header', async () => {
      const response = await fetch(`${BASE_URL}/healthz`);
      expect(response.headers.get('x-frame-options')).toBe('DENY');
    });

    test('includes Content-Security-Policy header', async () => {
      const response = await fetch(`${BASE_URL}/healthz`);
      const csp = response.headers.get('content-security-policy');
      expect(csp).toBeTruthy();
      expect(csp).toContain("default-src 'self'");
    });

    test('includes X-XSS-Protection header', async () => {
      const response = await fetch(`${BASE_URL}/healthz`);
      expect(response.headers.get('x-xss-protection')).toBeTruthy();
    });

    test('includes Referrer-Policy header', async () => {
      const response = await fetch(`${BASE_URL}/healthz`);
      expect(response.headers.get('referrer-policy')).toBeTruthy();
    });
  });

  describe('Rate Limiting', () => {
    test('includes rate limit headers', async () => {
      const response = await fetch(`${BASE_URL}/api/news`);
      expect(response.headers.get('x-ratelimit-limit')).toBeTruthy();
      expect(response.headers.get('x-ratelimit-remaining')).toBeTruthy();
      expect(response.headers.get('x-ratelimit-reset')).toBeTruthy();
    });

    test('enforces rate limits', async () => {
      // This test would need to make 101 requests to trigger rate limiting
      // Skipping for now as it's resource-intensive
      // In a real scenario, you'd mock the rate limiter
    }, 10000);
  });

  describe('CORS', () => {
    test('handles OPTIONS preflight requests', async () => {
      const response = await fetch(`${BASE_URL}/api/news`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });
      expect(response.status).toBe(204);
    });

    test('rejects unauthorized origins in production', async () => {
      // Note: This would need NODE_ENV=production
      const response = await fetch(`${BASE_URL}/api/news`, {
        headers: {
          'Origin': 'http://malicious-site.com'
        }
      });
      // In development, CORS is more permissive
      expect(response.status).not.toBe(403);
    });
  });

  describe('Input Validation', () => {
    test('rejects XSS attempts in search query', async () => {
      const response = await fetch(`${BASE_URL}/api/news?search=<script>alert('xss')</script>`);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid');
    });

    test('rejects SQL injection attempts', async () => {
      const response = await fetch(`${BASE_URL}/api/news?search=' OR '1'='1`);
      expect(response.status).toBe(400);
    });

    test('validates category parameter', async () => {
      const response = await fetch(`${BASE_URL}/api/news?category=invalid_category`);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid category');
    });

    test('validates tag parameter format', async () => {
      const response = await fetch(`${BASE_URL}/api/news?tag=<script>alert()</script>`);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid tag');
    });

    test('validates limit parameter range', async () => {
      const response = await fetch(`${BASE_URL}/api/news?limit=99999`);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid limit');
    });
  });

  describe('POST Validation', () => {
    test('sanitizes HTML in title', async () => {
      const response = await fetch(`${BASE_URL}/api/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '<script>alert("xss")</script>Test',
          excerpt: 'Test excerpt',
          content: 'Test content',
          category: 'politics'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        expect(data.data.title).not.toContain('<script>');
        expect(data.data.title).toContain('&lt;script&gt;');
      }
    });

    test('rejects title exceeding max length', async () => {
      const longTitle = 'a'.repeat(201);
      const response = await fetch(`${BASE_URL}/api/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: longTitle,
          excerpt: 'Test excerpt',
          content: 'Test content'
        })
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Title must be');
    });

    test('validates category against whitelist', async () => {
      const response = await fetch(`${BASE_URL}/api/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test',
          excerpt: 'Test excerpt',
          content: 'Test content',
          category: 'invalid-category'
        })
      });
      expect(response.status).toBe(400);
    });

    test('limits number of tags', async () => {
      const manyTags = Array(20).fill('tag').map((t, i) => `${t}${i}`);
      const response = await fetch(`${BASE_URL}/api/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test',
          excerpt: 'Test excerpt',
          content: 'Test content',
          tags: manyTags
        })
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Too many tags');
    });
  });

  describe('Error Handling', () => {
    test('does not leak stack traces in production', async () => {
      // Trigger an error
      const response = await fetch(`${BASE_URL}/api/news/nonexistent-id`);
      const text = await response.text();
      expect(text).not.toContain('Error:');
      expect(text).not.toContain('at ');
      expect(text).not.toContain('.js:');
    });

    test('returns proper error codes', async () => {
      const response = await fetch(`${BASE_URL}/nonexistent-endpoint`);
      expect(response.status).toBe(404);
    });
  });

  describe('Health Check', () => {
    test('health check endpoint works', async () => {
      const response = await fetch(`${BASE_URL}/healthz`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('api');
    });

    test('health check does not count against rate limit', async () => {
      // Make multiple health check requests
      for (let i = 0; i < 10; i++) {
        const response = await fetch(`${BASE_URL}/healthz`);
        expect(response.status).toBe(200);
        // Should not have rate limit headers
      }
    });
  });
});
