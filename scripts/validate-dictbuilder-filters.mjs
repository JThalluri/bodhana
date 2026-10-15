import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/#/dict-builder');
  await page.waitForSelector('#dbManualInput');
  const source = ['cat', 'dog', 'ship', 'boat', 'train', 'moon', 'apple', 'banana', 'description', 'information', 'elephant', 'light', 'queen', 'tree', 'cheese', 'star', 'fish', 'bread', 'computer', 'rain'];
  await page.fill('#dbMinLen', '1');
  await page.fill('#dbMaxLen', '30');
  await page.locator('label').filter({ has: page.locator('#dbExcludePlurals') }).click();
  await page.setInputFiles('#dbFileInput', { name: 'filter-check.txt', mimeType: 'text/plain', buffer: Buffer.from(source.join(' ')) });
  await page.click('#dbBtnExtract');
  await page.waitForFunction(count => document.querySelectorAll('.db-word-item').length === count, source.length);
  const visible = () => page.locator('.db-word-item').evaluateAll(nodes => nodes.map(n => n.dataset.word));
  assert.deepEqual(await page.locator('#dbGridFilter-difficulty option').evaluateAll(nodes => nodes.map(n => n.value)), ['', '1', '2', '3', 'unknown']);
  assert.deepEqual(await page.locator('#dbGridFilter-level option').evaluateAll(nodes => nodes.map(n => n.value)), ['', '1', '2', '3', '4', '5', '6', '7', '8', 'unknown']);
  await page.selectOption('#dbGridFilter-difficulty', '1');
  assert.equal((await visible()).length, 0);
  assert.equal(await page.locator('#dbBtnEnrich').isEnabled(), true);
  await page.click('#dbBtnEnrich');
  const records = await page.evaluate(async words => {
    const { default: engine } = await import('/src/phonics/PhonicsEngine.mjs');
    return engine.parseWords(words);
  }, source);
  const expected = filters => records.filter(r => Object.entries(filters).every(([k, v]) => String(r[k]) === v)).map(r => r.word).sort();
  assert.deepEqual((await visible()).sort(), expected({ difficulty: '1' }));
  await page.selectOption('#dbGridFilter-level', '1');
  await page.selectOption('#dbGridFilter-syllable_count', '1');
  await page.selectOption('#dbGridFilter-phoneme_count', '3');
  assert.deepEqual((await visible()).sort(), expected({ difficulty: '1', level: '1', syllable_count: '1', phoneme_count: '3' }));
  const filtered = await visible();
  assert.ok(filtered.length > 1 && filtered.length < source.length);
  await page.locator('.db-word-select').first().click();
  const excluded = filtered[0];
  await page.locator(`.db-word-item[data-word="${excluded}"] .db-word-exclude-btn`).click({ force: true });
  const active = filtered.filter(word => word !== excluded);
  async function downloadText(id) {
    const waiting = page.waitForEvent('download');
    await page.click(id);
    const download = await waiting;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
  }
  assert.deepEqual((await downloadText('#dbBtnDownload')).trim().split(/\r?\n/), active);
  const csv = await downloadText('#dbBtnPhonicsCSV');
  assert.deepEqual(csv.trim().split(/\r?\n/).slice(1).map(line => line.split(',')[0]), active);
  const base = [excluded, 'zebra', 'description'];
  await page.setInputFiles('#dbBaseInput', { name: 'base.txt', mimeType: 'text/plain', buffer: Buffer.from(base.join('\n')) });
  await page.waitForSelector('.db-base-loaded');
  const appendExpected = [...base, ...active.filter(w => !base.includes(w)).sort()];
  assert.deepEqual((await downloadText('#dbBtnAppend')).trim().split(/\r?\n/), appendExpected);
  assert.deepEqual((await downloadText('#dbBtnMerge')).trim().split(/\r?\n/), [...new Set(appendExpected)].sort());
  await page.locator('label').filter({ has: page.locator('#dbUpdateBaseWords') }).click();
  assert.deepEqual((await downloadText('#dbBtnAppend')).trim().split(/\r?\n/), [...base.filter(w => w !== excluded), ...active.filter(w => !base.includes(w)).sort()]);
  await page.locator('.db-sum-hint').hover();
  assert.equal(await page.locator('.db-sum-tooltip').isVisible(), true);
  await page.mouse.move(10, 500);
  await page.screenshot({ path: '.codex/dictbuilder-filters-desktop.png', fullPage: true });
  await page.selectOption('#dbGridFilter-level', '8');
  assert.equal((await visible()).length, 0);
  for (const id of ['#dbBtnDownload', '#dbBtnMerge', '#dbBtnAppend', '#dbBtnPhonicsCSV']) assert.equal(await page.locator(id).isDisabled(), true);
  await page.click('#dbResetGridFilters');
  assert.equal((await visible()).length, source.length);
  await page.screenshot({ path: '.codex/dictbuilder-filters-all-desktop.png', fullPage: true });
  assert.equal(await page.locator(`.db-word-item[data-word="${excluded}"]`).evaluate(n => n.classList.contains('db-word-excluded')), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#dbGridFilters').scrollIntoViewIfNeeded();
  const controls = await page.locator('#dbGridFilters').boundingBox();
  assert.ok(controls.x >= 0 && controls.x + controls.width <= 391);
  for (const control of await page.locator('#dbGridFilters select').all()) {
    const bounds = await control.boundingBox();
    assert.ok(bounds.width > 100 && bounds.x >= 0 && bounds.x + bounds.width <= 390, 'mobile dropdown must have usable width');
  }
  await page.screenshot({ path: '.codex/dictbuilder-filters-mobile.png', fullPage: true });
  await page.click('#dbBtnClear');
  assert.equal((await visible()).length, 0);
  assert.equal(await page.locator('#dbGridFilter-difficulty').inputValue(), '');
  assert.equal(await page.locator('.db-base-loaded').count(), 1);
  assert.deepEqual(errors, []);
  console.log('Live dropdown filters, inclusion persistence, download/CSV/merge/append, empty state, clear, tooltip, and mobile layout passed.');
} finally {
  await browser.close();
}
