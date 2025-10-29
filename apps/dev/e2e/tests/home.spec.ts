import { test, expect } from '@playwright/test';

test.describe('Smoke - homepage', () => {
  test('loads the homepage', async ({ page, baseURL }) => {
    const url = baseURL || 'http://localhost:3000';
    const resp = await page.goto(url, { waitUntil: 'networkidle' });
    // If the site is reachable, response should be ok
    expect(resp && resp.ok()).toBeTruthy();
  });
});
