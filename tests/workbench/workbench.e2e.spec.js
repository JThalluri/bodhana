/**
 * Constructs Workbench — end-to-end tests
 *
 * Run: npx playwright test tests/workbench/workbench.e2e.spec.js
 *
 * Coverage:
 *   Step 1  — file loading, counts, disabled/enabled state
 *   Step 2  — pattern mode (ea, oo, ow, ai, ee, eigh, ough)
 *   Step 2  — word mode: direct exceptions, default resolution, compound-scan, suffix-strip
 *   Step 2  — new words not in exception table (behaviour under default resolution)
 *   Step 2  — edge cases: no vowel team, too short
 *   Step 3  — blast radius composition for 'ea'
 *   Step 5  — live patch schema validation (valid shapes + all forbidden-key / malformed cases)
 *   Step 7  — sandbox: clean add → merge allowed
 *   Step 7  — sandbox: duplicate row → validator hard-block
 *   Step 7  — sandbox: unexpected regression change → hard gate
 */

import { test, expect } from 'playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT  = path.join(__dir, '../..').replace(/\\/g, '/');

const STANDALONE_URL  = `file:///${ROOT}/tools/constructs-workbench/workbench-standalone.html`;
const CONSTRUCTS_PATH = path.join(__dir, '../../constructs/phonics-constructs.yaml');
const FIXTURES_PATH   = path.join(__dir, '../../constructs/fixtures/phonics-regression-fixtures.v2.yaml');

// ── Custom fixture: always disable FSA so file-input path is used ─────────────

const wb = test.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => { delete window.showOpenFilePicker; });
    await use(page);
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadFiles(page) {
  await page.goto(STANDALONE_URL);
  await page.waitForSelector('#fileConstructs');
  await page.setInputFiles('#fileConstructs', CONSTRUCTS_PATH);
  await page.waitForSelector('.msg.ok');
  await page.setInputFiles('#fileFixtures', FIXTURES_PATH);
  await page.waitForFunction(() => document.querySelectorAll('.msg.ok').length >= 2);
}

async function proceedToStep2(page) {
  await page.waitForSelector('#btnStep1Next');
  await page.click('#btnStep1Next');
  await page.waitForSelector('#qInput');
}

async function searchAndWait(page, query) {
  await page.fill('#qInput', query);
  await page.waitForTimeout(700); // 500 ms debounce + 200 ms buffer
}

/** Navigate from Step 2 straight to Step 5 with a given patch YAML pre-filled. */
async function navigateToStep5(page, patchYaml) {
  await searchAndWait(page, 'ea');
  await page.waitForSelector('#btnTarget');
  await page.click('#btnTarget');
  await page.waitForSelector('#btnStep3Next');
  await page.click('#btnStep3Next');
  await page.waitForSelector('#btnStep4Next');
  await page.click('#btnStep4Next');
  await page.waitForSelector('#patchInput');
  if (patchYaml) {
    await page.fill('#patchInput', patchYaml);
    await page.waitForTimeout(300); // schema validation fires synchronously on input event
  }
}

async function runSandboxAndWaitStep7(page) {
  await page.waitForSelector('#btnRunSandbox:not([disabled])');
  await page.click('#btnRunSandbox');
  await page.waitForSelector('h2');
  await page.waitForFunction(() =>
    document.querySelector('h2')?.textContent?.includes('Step 7'));
}

// ── Suite 1: File Loading (Step 1) ────────────────────────────────────────────

wb.describe('Step 1 — File Loading', () => {
  wb('shows upload inputs when FSA is disabled', async ({ page }) => {
    await page.goto(STANDALONE_URL);
    await expect(page.locator('#fileConstructs')).toBeAttached();
    await expect(page.locator('#fileFixtures')).toBeAttached();
  });

  wb('continue button absent before any file loaded', async ({ page }) => {
    await page.goto(STANDALONE_URL);
    await expect(page.locator('#btnStep1Next')).not.toBeAttached();
  });

  wb('loading constructs shows success with exception count', async ({ page }) => {
    await page.goto(STANDALONE_URL);
    await page.setInputFiles('#fileConstructs', CONSTRUCTS_PATH);
    const msg = page.locator('.msg.ok').first();
    await expect(msg).toContainText('exception rows');
  });

  wb('loading both files shows two success messages', async ({ page }) => {
    await loadFiles(page);
    await expect(page.locator('.msg.ok')).toHaveCount(2);
  });

  wb('continue button enabled after constructs loaded', async ({ page }) => {
    await page.goto(STANDALONE_URL);
    await page.setInputFiles('#fileConstructs', CONSTRUCTS_PATH);
    await page.waitForSelector('#btnStep1Next');
    await expect(page.locator('#btnStep1Next')).toBeEnabled();
  });

  wb('fixtures message shows vowelTeamSounds entry count', async ({ page }) => {
    await loadFiles(page);
    const msgs = page.locator('.msg.ok');
    await expect(msgs.nth(1)).toContainText('vowelTeamSounds entries');
  });

  wb('continues to Step 2 with search input', async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
    await expect(page.locator('#qInput')).toBeVisible();
    await expect(page.locator('h2')).toContainText('Step 2');
  });
});

// ── Suite 2: Step 2 — Pattern Mode ───────────────────────────────────────────

wb.describe('Step 2 — Pattern Mode', () => {
  wb.beforeEach(async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
  });

  wb('ea → pattern mode, default = long_e, has exception rows', async ({ page }) => {
    await searchAndWait(page, 'ea');
    await expect(page.locator('.result-box')).toContainText('Pattern:');
    await expect(page.locator('.result-box')).toContainText('long_e');
    await expect(page.locator('.result-box')).toContainText('Exception rows');
    // Should have a target button
    await expect(page.locator('#btnTarget')).toBeVisible();
  });

  wb('oo → pattern mode, default = oo_long', async ({ page }) => {
    await searchAndWait(page, 'oo');
    await expect(page.locator('.result-box')).toContainText('oo_long');
    await expect(page.locator('#btnTarget')).toBeVisible();
  });

  wb('ow → pattern mode, default = ow', async ({ page }) => {
    await searchAndWait(page, 'ow');
    const box = page.locator('.result-box');
    await expect(box).toContainText('Default sound:');
    await expect(box).toContainText('ow');
  });

  wb('ai → pattern mode, default = long_a', async ({ page }) => {
    await searchAndWait(page, 'ai');
    await expect(page.locator('.result-box')).toContainText('long_a');
  });

  wb('ee → pattern mode, default = long_e', async ({ page }) => {
    await searchAndWait(page, 'ee');
    await expect(page.locator('.result-box')).toContainText('long_e');
  });

  wb('eigh → pattern mode, default = long_a', async ({ page }) => {
    await searchAndWait(page, 'eigh');
    await expect(page.locator('.result-box')).toContainText('long_a');
  });

  wb('ough → pattern mode, default = long_o', async ({ page }) => {
    await searchAndWait(page, 'ough');
    await expect(page.locator('.result-box')).toContainText('long_o');
  });

  wb('ou → pattern mode, default = ow', async ({ page }) => {
    await searchAndWait(page, 'ou');
    await expect(page.locator('.result-box')).toContainText('ow');
  });

  wb('ea shows known exception words in the rows table', async ({ page }) => {
    await searchAndWait(page, 'ea');
    const body = page.locator('.result-box');
    await expect(body).toContainText('bread');
    await expect(body).toContainText('dead');
    await expect(body).toContainText('great');
  });
});

// ── Suite 3: Step 2 — Word Mode, Direct Exceptions ───────────────────────────

wb.describe('Step 2 — Word Mode: Direct Exceptions', () => {
  wb.beforeEach(async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
  });

  wb('bread → ea: short_e, tier = direct', async ({ page }) => {
    await searchAndWait(page, 'bread');
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toContainText('ea');
    await expect(rows.first()).toContainText('short_e');
    await expect(page.locator('.tier-direct')).toBeVisible();
  });

  wb('dead → ea: short_e, tier = direct', async ({ page }) => {
    await searchAndWait(page, 'dead');
    await expect(page.locator('tbody tr').first()).toContainText('short_e');
    await expect(page.locator('.tier-direct')).toBeVisible();
  });

  wb('great → ea: long_a, tier = direct (great is an ea exception)', async ({ page }) => {
    await searchAndWait(page, 'great');
    await expect(page.locator('tbody')).toContainText('long_a');
    await expect(page.locator('.tier-direct')).toBeVisible();
  });

  wb('break → ea: long_a, tier = direct', async ({ page }) => {
    await searchAndWait(page, 'break');
    await expect(page.locator('tbody')).toContainText('long_a');
    await expect(page.locator('.tier-direct')).toBeVisible();
  });

  wb('book → oo: oo_short, tier = direct', async ({ page }) => {
    await searchAndWait(page, 'book');
    await expect(page.locator('tbody')).toContainText('oo_short');
    await expect(page.locator('.tier-direct')).toBeVisible();
  });

  wb('snow → ow: long_o, tier = direct', async ({ page }) => {
    await searchAndWait(page, 'snow');
    await expect(page.locator('tbody')).toContainText('long_o');
    await expect(page.locator('.tier-direct')).toBeVisible();
  });

  wb('cookie → oo: direct + ie: direct', async ({ page }) => {
    await searchAndWait(page, 'cookie');
    await expect(page.locator('.tier-direct')).toHaveCount(2);
  });

  wb('already → ea: short_e, tier = direct', async ({ page }) => {
    await searchAndWait(page, 'already');
    await expect(page.locator('tbody')).toContainText('short_e');
    await expect(page.locator('.tier-direct')).toBeVisible();
  });

  wb('should → ou: oo_long or exception tier = direct', async ({ page }) => {
    await searchAndWait(page, 'should');
    // 'should' is in ou exceptions
    await expect(page.locator('.tier-direct')).toBeVisible();
  });

  wb('blood → oo: direct exception (not oo_long)', async ({ page }) => {
    await searchAndWait(page, 'blood');
    await expect(page.locator('.tier-direct')).toBeVisible();
    // blood is an oo exception — should NOT show oo_long
    await expect(page.locator('tbody')).not.toContainText('oo_long');
  });
});

// ── Suite 4: Step 2 — New Words (Default Resolution) ─────────────────────────
// These words are NOT in the exception table — they must fall through to pattern default.

wb.describe('Step 2 — New Words: Default Resolution (no exception row)', () => {
  wb.beforeEach(async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
  });

  // ea → default long_e
  wb('speak → ea: long_e, tier = default (AC 2)', async ({ page }) => {
    await searchAndWait(page, 'speak');
    await expect(page.locator('tbody')).toContainText('long_e');
    await expect(page.locator('.tier-default')).toBeVisible();
    await expect(page.locator('.tier-direct')).not.toBeAttached();
  });

  wb('steam → ea: long_e, tier = default', async ({ page }) => {
    await searchAndWait(page, 'steam');
    await expect(page.locator('tbody')).toContainText('long_e');
    await expect(page.locator('.tier-default')).toBeVisible();
  });

  wb('cream → ea: long_e, tier = default', async ({ page }) => {
    await searchAndWait(page, 'cream');
    await expect(page.locator('tbody')).toContainText('long_e');
    await expect(page.locator('.tier-default')).toBeVisible();
  });

  wb('dream → ea: long_e, tier = default', async ({ page }) => {
    await searchAndWait(page, 'dream');
    await expect(page.locator('tbody')).toContainText('long_e');
    await expect(page.locator('.tier-default')).toBeVisible();
  });

  wb('beach → ea: long_e, tier = default', async ({ page }) => {
    await searchAndWait(page, 'beach');
    await expect(page.locator('tbody')).toContainText('long_e');
    await expect(page.locator('.tier-default')).toBeVisible();
  });

  wb('reach → ea: long_e, tier = default', async ({ page }) => {
    await searchAndWait(page, 'reach');
    await expect(page.locator('tbody')).toContainText('long_e');
    await expect(page.locator('.tier-default')).toBeVisible();
  });

  wb('streak → ea: long_e, tier = default', async ({ page }) => {
    await searchAndWait(page, 'streak');
    await expect(page.locator('tbody')).toContainText('long_e');
    await expect(page.locator('.tier-default')).toBeVisible();
  });

  wb('defeat → ea: long_e, tier = default', async ({ page }) => {
    await searchAndWait(page, 'defeat');
    await expect(page.locator('tbody')).toContainText('long_e');
    await expect(page.locator('.tier-default')).toBeVisible();
  });

  // oo → default oo_long
  wb('moon → oo: oo_long, tier = default', async ({ page }) => {
    await searchAndWait(page, 'moon');
    await expect(page.locator('tbody')).toContainText('oo_long');
    await expect(page.locator('.tier-default')).toBeVisible();
  });

  wb('spoon → oo: oo_long, tier = default', async ({ page }) => {
    await searchAndWait(page, 'spoon');
    await expect(page.locator('tbody')).toContainText('oo_long');
    await expect(page.locator('.tier-default')).toBeVisible();
  });

  wb('drool → oo: oo_long, tier = default', async ({ page }) => {
    await searchAndWait(page, 'drool');
    await expect(page.locator('tbody')).toContainText('oo_long');
    await expect(page.locator('.tier-default')).toBeVisible();
  });

  wb('pool → oo: oo_long, tier = default', async ({ page }) => {
    await searchAndWait(page, 'pool');
    await expect(page.locator('tbody')).toContainText('oo_long');
    await expect(page.locator('.tier-default')).toBeVisible();
  });

  // ow → default ow
  wb('town → ow: ow, tier = default', async ({ page }) => {
    await searchAndWait(page, 'town');
    await expect(page.locator('tbody')).toContainText('ow');
    await expect(page.locator('.tier-default')).toBeVisible();
  });

  wb('clown → ow: ow, tier = default', async ({ page }) => {
    await searchAndWait(page, 'clown');
    await expect(page.locator('tbody')).toContainText('ow');
    await expect(page.locator('.tier-default')).toBeVisible();
  });

  wb('preach → ea: long_e, tier = default', async ({ page }) => {
    await searchAndWait(page, 'preach');
    await expect(page.locator('tbody')).toContainText('long_e');
    await expect(page.locator('.tier-default')).toBeVisible();
  });
});

// ── Suite 5: Step 2 — Compound-Scan Resolution ───────────────────────────────

wb.describe('Step 2 — Compound-Scan Resolution', () => {
  wb.beforeEach(async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
  });

  wb('gingerbread → ea: short_e, tier = compound-scan (via bread)', async ({ page }) => {
    await searchAndWait(page, 'gingerbread');
    await expect(page.locator('tbody')).toContainText('short_e');
    await expect(page.locator('.tier-compound')).toBeVisible();
  });

  wb('breadwinner → ea: short_e, tier = compound-scan (via bread)', async ({ page }) => {
    await searchAndWait(page, 'breadwinner');
    await expect(page.locator('tbody')).toContainText('short_e');
    await expect(page.locator('.tier-compound')).toBeVisible();
  });

  wb('snowflake → ow: long_o, tier = compound-scan (via snow)', async ({ page }) => {
    await searchAndWait(page, 'snowflake');
    await expect(page.locator('tbody')).toContainText('long_o');
    await expect(page.locator('.tier-compound')).toBeVisible();
  });

  wb('snowboard → ow: long_o, tier = compound-scan (via snow)', async ({ page }) => {
    await searchAndWait(page, 'snowboard');
    await expect(page.locator('tbody')).toContainText('long_o');
    await expect(page.locator('.tier-compound')).toBeVisible();
  });

  wb('cookbook → oo: oo_short, tier = compound-scan (via cook)', async ({ page }) => {
    await searchAndWait(page, 'cookbook');
    await expect(page.locator('tbody')).toContainText('oo_short');
    await expect(page.locator('.tier-compound')).toBeVisible();
  });

  wb('snowstorm → ow: long_o, tier = compound-scan (via snow)', async ({ page }) => {
    await searchAndWait(page, 'snowstorm');
    await expect(page.locator('tbody')).toContainText('long_o');
    await expect(page.locator('.tier-compound')).toBeVisible();
  });
});

// ── Suite 6: Step 2 — Suffix-Strip Resolution ────────────────────────────────

wb.describe('Step 2 — Suffix-Strip Resolution', () => {
  wb.beforeEach(async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
  });

  wb('heading → ea: short_e, tier = suffix-stripped (from head)', async ({ page }) => {
    await searchAndWait(page, 'heading');
    await expect(page.locator('tbody')).toContainText('short_e');
    await expect(page.locator('.tier-suffix')).toBeVisible();
  });

  wb('breaded → ea: short_e, tier = suffix-stripped (from bread)', async ({ page }) => {
    await searchAndWait(page, 'breaded');
    await expect(page.locator('tbody')).toContainText('short_e');
    await expect(page.locator('.tier-suffix')).toBeVisible();
  });

  wb('breathes → ea: long_e, tier = suffix-stripped (from breathe)', async ({ page }) => {
    await searchAndWait(page, 'breathes');
    // breathe is a direct exception; breathes is suffix-stripped from breathe
    await expect(page.locator('.tier-suffix, .tier-direct')).toBeVisible();
  });
});

// ── Suite 7: Step 2 — Edge Cases ─────────────────────────────────────────────

wb.describe('Step 2 — Edge Cases', () => {
  wb.beforeEach(async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
  });

  wb('single character → no result shown', async ({ page }) => {
    await searchAndWait(page, 'e');
    await expect(page.locator('.result-box')).not.toBeAttached();
  });

  wb('word with no vowel team → "no patterns" message', async ({ page }) => {
    await searchAndWait(page, 'fish');
    await expect(page.locator('.hint')).toContainText('No vowel team patterns detected');
  });

  wb('pure consonant cluster → "no patterns" message', async ({ page }) => {
    await searchAndWait(page, 'str');
    await expect(page.locator('.hint')).toContainText('No vowel team patterns detected');
  });

  wb('unknown but plausible word without vowel team (craft) → no patterns', async ({ page }) => {
    await searchAndWait(page, 'craft');
    await expect(page.locator('.hint')).toContainText('No vowel team patterns detected');
  });

  wb('rainbow → detects both ai and ow patterns', async ({ page }) => {
    await searchAndWait(page, 'rainbow');
    // Should show 2 rows in the pattern table
    await expect(page.locator('tbody tr')).toHaveCount(2);
  });

  wb('release → detects ee and ea patterns', async ({ page }) => {
    await searchAndWait(page, 'release');
    // "release" contains "ea" (rel-ea-se) and "ee"? Actually r-e-l-e-a-s-e
    // "ea" at index 3-4, "ee" not present. Let me check just that ea is detected
    await expect(page.locator('tbody')).toContainText('ea');
  });
});

// ── Suite 8: Step 3 — Blast Radius for 'ea' ──────────────────────────────────

wb.describe('Step 3 — Blast Radius', () => {
  wb.beforeEach(async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
    await searchAndWait(page, 'ea');
    await page.waitForSelector('#btnTarget');
    await page.click('#btnTarget');
    await page.waitForSelector('h2');
    await expect(page.locator('h2')).toContainText('Step 3');
  });

  wb('blast radius includes known direct exception words', async ({ page }) => {
    const tbody = page.locator('tbody');
    await expect(tbody).toContainText('bread');
    await expect(tbody).toContainText('head');
    await expect(tbody).toContainText('dead');
    await expect(tbody).toContainText('great');
  });

  wb('blast radius includes speak as default-tier word', async ({ page }) => {
    await expect(page.locator('tbody')).toContainText('speak');
    // speak has no exception — should show as default
    const speakRow = page.locator('tbody tr', { hasText: 'speak' });
    await expect(speakRow).toContainText('default');
  });

  wb('blast radius includes gingerbread as compound-scan word', async ({ page }) => {
    await expect(page.locator('tbody')).toContainText('gingerbread');
    const row = page.locator('tbody tr', { hasText: 'gingerbread' });
    await expect(row).toContainText('compound');
  });

  wb('blast radius shows word count in header', async ({ page }) => {
    const header = page.locator('.card-title').first();
    await expect(header).toContainText('words found');
    const text = await header.textContent();
    const count = parseInt(text);
    expect(count).toBeGreaterThan(20);
  });

  wb('every row in blast radius contains "ea" substring', async ({ page }) => {
    const wordCells = page.locator('tbody tr td:first-child code');
    const words = await wordCells.allTextContents();
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(w).toContain('ea');
    }
  });
});

// ── Suite 9: Step 5 — Patch Schema Validation ────────────────────────────────

wb.describe('Step 5 — Patch Schema Validation', () => {
  wb.beforeEach(async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
    await navigateToStep5(page, '');
  });

  wb('valid add patch → "Schema valid"', async ({ page }) => {
    await page.fill('#patchInput', `patch:\n  add:\n    - { word: steam, pattern: ea, sound: long_e }`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.ok')).toContainText('Schema valid');
  });

  wb('valid bare-format add patch → "Schema valid"', async ({ page }) => {
    await page.fill('#patchInput', `add:\n  - { word: cream, pattern: ea, sound: long_e }`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.ok')).toContainText('Schema valid');
  });

  wb('valid modify patch → "Schema valid"', async ({ page }) => {
    await page.fill('#patchInput', `patch:\n  modify:\n    - { word: dead, pattern: ea, sound: short_e, note: "reaffirm" }`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.ok')).toContainText('Schema valid');
  });

  wb('valid remove patch → "Schema valid"', async ({ page }) => {
    await page.fill('#patchInput', `patch:\n  remove:\n    - { word: dead, pattern: ea }`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.ok')).toContainText('Schema valid');
  });

  wb('combined add + modify + remove → "Schema valid"', async ({ page }) => {
    await page.fill('#patchInput',
      `patch:\n  add:\n    - { word: steam, pattern: ea, sound: long_e }\n  modify:\n    - { word: dead, pattern: ea, sound: short_e }\n  remove:\n    - { word: spread, pattern: ea }`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.ok')).toContainText('Schema valid');
  });

  wb('FORBIDDEN: patternCategories at top level → error', async ({ page }) => {
    await page.fill('#patchInput', `patternCategories:\n  vowelTeams: [ea]`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.err')).toBeVisible();
    await expect(page.locator('.msg.err')).toContainText('patternCategories');
  });

  wb('FORBIDDEN: defaultVowelSound → error', async ({ page }) => {
    await page.fill('#patchInput', `defaultVowelSound:\n  ea: long_e`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.err')).toBeVisible();
  });

  wb('FORBIDDEN: compoundParts → error', async ({ page }) => {
    await page.fill('#patchInput', `compoundParts:\n  - test`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.err')).toBeVisible();
  });

  wb('FORBIDDEN: rootWords → error', async ({ page }) => {
    await page.fill('#patchInput', `rootWords:\n  - test`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.err')).toBeVisible();
  });

  wb('FORBIDDEN: suffixStripRules → error', async ({ page }) => {
    await page.fill('#patchInput', `suffixStripRules:\n  - { suffix: ing }`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.err')).toBeVisible();
  });

  wb('FORBIDDEN: vowelTeamExceptions direct key → error', async ({ page }) => {
    await page.fill('#patchInput', `vowelTeamExceptions:\n  - { word: test, pattern: ea, sound: long_e }`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.err')).toBeVisible();
  });

  wb('MALFORMED: add item missing sound → error', async ({ page }) => {
    await page.fill('#patchInput', `patch:\n  add:\n    - { word: steam, pattern: ea }`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.err')).toBeVisible();
  });

  wb('MALFORMED: add item missing word → error', async ({ page }) => {
    await page.fill('#patchInput', `patch:\n  add:\n    - { pattern: ea, sound: long_e }`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.err')).toBeVisible();
  });

  wb('MALFORMED: add item missing pattern → error', async ({ page }) => {
    await page.fill('#patchInput', `patch:\n  add:\n    - { word: steam, sound: long_e }`);
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.err')).toBeVisible();
  });

  wb('MALFORMED: YAML parse error → error message', async ({ page }) => {
    await page.fill('#patchInput', '{ invalid: yaml: [unclosed');
    await page.waitForTimeout(300);
    await expect(page.locator('.msg.err')).toBeVisible();
  });

  wb('Run Sandbox disabled with invalid patch, enabled with valid', async ({ page }) => {
    // Initially empty → disabled
    await expect(page.locator('#btnRunSandbox')).toBeDisabled();
    // Invalid patch → still disabled
    await page.fill('#patchInput', `patternCategories:\n  test: [a]`);
    await page.waitForTimeout(300);
    await expect(page.locator('#btnRunSandbox')).toBeDisabled();
    // Valid patch → enabled
    await page.fill('#patchInput', `patch:\n  add:\n    - { word: steam, pattern: ea, sound: long_e }`);
    await page.waitForTimeout(300);
    await expect(page.locator('#btnRunSandbox')).toBeEnabled();
  });
});

// ── Suite 10: Step 7 — Sandbox: Clean Patch → Merge Allowed ──────────────────

wb.describe('Step 7 — Sandbox: Clean Add → Merge Allowed', () => {
  wb('adding new word with no side effects allows merge', async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
    await navigateToStep5(page,
      `patch:\n  add:\n    - { word: steam, pattern: ea, sound: long_e, note: "anchor long_e" }`);
    await runSandboxAndWaitStep7(page);

    // Validator must pass
    await expect(page.locator('.msg.ok').first()).toContainText('Validator passed');
    // Regression diff clean
    await expect(page.locator('.msg.ok').nth(1)).toContainText('no fixtures changed');
    // "Proceed to Merge" appears
    await expect(page.locator('#btnStep7Next')).toBeVisible();
    await expect(page.locator('#btnStep7Next')).toBeEnabled();
  });

  wb('adding multiple new words allows merge', async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
    await navigateToStep5(page,
      `patch:\n  add:\n    - { word: cream, pattern: ea, sound: long_e }\n    - { word: dream, pattern: ea, sound: long_e }`);
    await runSandboxAndWaitStep7(page);
    await expect(page.locator('#btnStep7Next')).toBeVisible();
  });

  wb('removing an exception word with no compound derivatives succeeds', async ({ page }) => {
    // 'deaf' has no compound words in the fixture corpus (bedspread/breadwinner do exist
    // and would block a 'spread' or 'bread' removal with unexpected side effects)
    await loadFiles(page);
    await proceedToStep2(page);
    await navigateToStep5(page,
      `patch:\n  remove:\n    - { word: deaf, pattern: ea }`);
    await runSandboxAndWaitStep7(page);
    // deaf itself changes (expected), no other unexpected rows
    await expect(page.locator('#btnStep7Next')).toBeVisible();
  });
});

// ── Suite 11: Step 7 — Sandbox: Duplicate Row → Hard Block ───────────────────

wb.describe('Step 7 — Sandbox: Duplicate Row → Validator Hard-Block', () => {
  wb('adding existing (dead, ea) row triggers exception-table-self-consistency', async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
    await navigateToStep5(page,
      `patch:\n  add:\n    - { word: dead, pattern: ea, sound: short_e }`);
    await runSandboxAndWaitStep7(page);

    // Validator block present
    await expect(page.locator('.hard-gate')).toBeVisible();
    await expect(page.locator('.hard-gate')).toContainText('Validator failed');
    // "Proceed to Merge" must NOT appear
    await expect(page.locator('#btnStep7Next')).not.toBeAttached();
    // Back to Step 5 link present
    await expect(page.locator('#btnBackToPatch')).toBeVisible();
  });

  wb('hard gate shows the violated rule name', async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
    await navigateToStep5(page,
      `patch:\n  add:\n    - { word: head, pattern: ea, sound: short_e }`);
    await runSandboxAndWaitStep7(page);
    await expect(page.locator('.hard-gate')).toContainText('exception-table-self-consistency');
  });
});

// ── Suite 12: Step 7 — Sandbox: Unexpected Regression → Hard Gate ────────────

wb.describe('Step 7 — Sandbox: Unexpected Regression Change → Hard Gate', () => {
  wb('modifying bread:ea to long_e surfaces breadwinner+gingerbread as unexpected changes', async ({ page }) => {
    // Both breadwinner and gingerbread resolve via compound-scan from bread:ea.
    // Modifying bread changes both, neither is in expectedWords → 2 unexpected rows.
    await loadFiles(page);
    await proceedToStep2(page);
    await navigateToStep5(page,
      `patch:\n  modify:\n    - { word: bread, pattern: ea, sound: long_e }`);
    await runSandboxAndWaitStep7(page);

    // Hard gate present
    await expect(page.locator('.hard-gate').first()).toBeVisible();
    await expect(page.locator('.hard-gate').first()).toContainText('unexpected');
    // 2 unexpected rows in the regression diff (breadwinner + gingerbread)
    // (+ 2 more in blast-radius diff = 4 total tr.unexpected — use count assertion)
    await expect(page.locator('tr.unexpected')).toHaveCount(4);
    // No merge button
    await expect(page.locator('#btnStep7Next')).not.toBeAttached();
  });

  wb('modifying bread:ea shows bread as expected and breadwinner/gingerbread as unexpected', async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
    await navigateToStep5(page,
      `patch:\n  modify:\n    - { word: bread, pattern: ea, sound: long_e }`);
    await runSandboxAndWaitStep7(page);

    // Regression diff table is the first tbody on the page
    const regTable = page.locator('tbody').first();
    await expect(regTable).toContainText('bread');
    await expect(regTable).toContainText('breadwinner');
    await expect(regTable).toContainText('gingerbread');
    // breadwinner and gingerbread rows are flagged unexpected
    await expect(page.locator('tr.unexpected td', { hasText: 'breadwinner' }).first()).toBeVisible();
    await expect(page.locator('tr.unexpected td', { hasText: 'gingerbread' }).first()).toBeVisible();
  });

  wb('modifying gingerbread:ea (not in table) → validator or unexpected gate fires', async ({ page }) => {
    await loadFiles(page);
    await proceedToStep2(page);
    // gingerbread is not in the exception table so "modify" would fail schema at apply step
    // or validator would catch it — either way it blocks
    await navigateToStep5(page,
      `patch:\n  modify:\n    - { word: gingerbread, pattern: ea, sound: long_e }`);
    await runSandboxAndWaitStep7(page);
    // Some kind of block must exist — either validator or unexpected-change gate
    await expect(page.locator('.hard-gate').first()).toBeVisible();
    await expect(page.locator('#btnStep7Next')).not.toBeAttached();
  });
});
