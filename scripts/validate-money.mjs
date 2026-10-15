import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/#/math-worksheets');
  await page.selectOption('#mwTypeSelect', 'money-counting');
  await page.waitForSelector('.money-question');
  await page.evaluate(() => document.fonts.ready);
  async function verify(label) {
    const result = await page.evaluate(() => {
      const pages = [...document.querySelectorAll('.money-worksheet')];
      const bad = [];
      for (const p of pages) {
        const c = p.querySelector('.money-content').getBoundingClientRect();
        for (const item of p.querySelectorAll('.money-question, .money-key-entry')) {
          const r = item.getBoundingClientRect();
          if (r.bottom > c.bottom + 1 || r.right > c.right + 1 || item.scrollWidth > item.clientWidth + 1) bad.push(item.textContent);
        }
      }
      return { pages: pages.length, questions: document.querySelectorAll('.money-question').length,
        answers: document.querySelectorAll('.money-key-entry').length, bad };
    });
    assert.equal(result.bad.length, 0, `${label}: overflow ${result.bad}`);
    assert.ok(result.questions > 0, `${label}: blank`);
    assert.equal(result.answers, result.questions);
    console.log(label, result);
  }
  for (const currency of ['inr', 'usd']) {
    for (const type of ['word-problems', 'arithmetic']) {
      await page.selectOption('#moneyCurrency', currency);
      await page.selectOption('#moneySubType', type);
      for (const font of ['s', 'm', 'l', 'xl']) {
        await page.selectOption('#moneyFontSize', font);
        await page.click('#moneyGenerate');
        await verify(`${currency} ${type} ${font}`);
      }
    }
  }
  await page.selectOption('#moneyFontSize', 'm');
  await page.fill('#moneyPages', '20');
  await page.click('#moneyGenerate');
  await verify('20 worksheets');
  await page.fill('#moneyPages', '1');
  await page.click('#moneyGenerate');
  await page.screenshot({ path: '.codex/money-arithmetic-desktop.png', fullPage: true });
  await page.selectOption('#moneySubType', 'word-problems');
  await page.selectOption('#moneyGrade', '1');
  assert.equal(await page.locator('#moneyDifficulty option[value="hard"]').isDisabled(), true);
  await page.click('#moneyGenerate');
  await page.screenshot({ path: '.codex/money-word-problems-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('#moneyGenerate');
  await verify('mobile word problems');
  const visiblePaper = await page.locator('.money-worksheet').first().boundingBox();
  assert.ok(visiblePaper.x >= 0 && visiblePaper.x + visiblePaper.width <= 390 && visiblePaper.y < 844, 'mobile preview must be in the viewport');
  await page.screenshot({ path: '.codex/money-mobile.png', fullPage: true });
  await page.selectOption('#mwTypeSelect', 'fractions-drill');
  await page.selectOption('#mwTypeSelect', 'money-counting');
  await page.waitForSelector('.money-question');
  const downloadPromise = page.waitForEvent('download');
  await page.click('#moneyExport');
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^money_word_problems_inr_.*\.pdf$/);
  assert.equal(await download.failure(), null);
  await page.evaluate(() => {
    window.__moneyPrintCalled = false;
    const original = document.createElement.bind(document);
    document.createElement = function (...args) {
      const node = original(...args);
      if (args[0] === 'iframe') {
        setTimeout(() => {
          node.contentWindow.print = () => { window.__moneyPrintCalled = true; };
        }, 0);
      }
      return node;
    };
  });
  await page.click('#moneyPrint');
  await page.waitForFunction(() => window.__moneyPrintCalled);
  console.log('PDF export and print handoff passed');
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
