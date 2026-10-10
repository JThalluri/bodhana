import { test, expect } from 'playwright/test';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dir, '..', '..', 'dist', 'index.html');
const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;

test('§0 CORS check — Wiktionary origin=* from file://', async ({ page }) => {
  await page.goto(fileUrl);

  const result = await page.evaluate(async () => {
    try {
      const res = await fetch(
        'https://en.wiktionary.org/w/api.php?action=query&titles=hello&prop=revisions&rvprop=content&rvslots=main&formatversion=2&format=json&origin=*'
      );
      const data = await res.json();
      return { ok: true, status: res.status, keys: Object.keys(data), pagesIsArray: Array.isArray(data?.query?.pages), pageCount: data?.query?.pages?.length };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  console.log('§0 CORS result:', JSON.stringify(result, null, 2));
  expect(result.ok).toBe(true);
  expect(result.pagesIsArray).toBe(true);
});
