// Layout engine — spec §4–§7.
// Turns state into a pure page model (no DOM), which the renderer converts to
// HTML. All geometry is in CSS px at 96 dpi; Letter portrait only.

import { clamp } from './state.js';
import { fontMetrics, measureText, wrapText } from './typography.js';

export const PX_PER_IN = 96;
export const PAGE_W = 8.5 * PX_PER_IN;   // 816
export const PAGE_H = 11 * PX_PER_IN;    // 1056
export const MAX_PAGES = 20;

const REF_TITLE_PX = 18;
const REF_TITLE_LH = 24;
const REF_BODY_MAX_PX = 30;
const REF_PAD_Y = 12;
const REF_PAD_X = 14;
const REF_GAP_BELOW = 14;
const PICTURE_GAP_BELOW = 10;

// ─── Seeded RNG ────────────────────────────────────────────────

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed() {
  return Math.floor(Math.random() * 900000) + 100000;
}

function shuffleUntilDifferent(items, rng) {
  const distinct = new Set(items).size > 1;
  let out = items.slice();
  for (let attempt = 0; attempt < 50; attempt++) {
    out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (!distinct || out.some((v, i) => v !== items[i])) break;
  }
  return out;
}

// ─── Content parsing ───────────────────────────────────────────

/** Alternating items: one per line; a single line falls back to commas. */
export function parseItems(text) {
  const lines = String(text).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (lines.length === 1 && lines[0].includes(',')) {
    return lines[0].split(',').map(s => s.trim()).filter(Boolean);
  }
  return lines;
}

/** Jumbled sentences: one per line; a single line falls back to sentence punctuation. */
export function parseSentences(text) {
  const lines = String(text).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (lines.length === 1) {
    const parts = lines[0].split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }
  return lines;
}

// ─── Geometry ──────────────────────────────────────────────────

export function computeGeometry(state) {
  const g = state.geometry;
  const t = state.typography;
  const l = state.layout;
  const isSeyes = g.gridType === 'seyes_french';

  // Seyès keeps float spacing so the 8 mm / 2 mm rhythm is exact.
  const lineH = isSeyes ? g.lineHeightInch * PX_PER_IN : Math.round(g.lineHeightInch * PX_PER_IN);
  const skipH = !isSeyes && g.hasSkipSpace ? Math.round(g.skipSpaceHeightInch * PX_PER_IN) : 0;
  const rowH = lineH + skipH;

  const family = t.fontFamily;
  const { asc, desc } = fontMetrics(family);
  const f = clamp(Number(t.fontSizeFill) || 0.8, 0.5, 1);

  let autoPx;
  if (g.gridType === 'zaner_bloser') autoPx = Math.round((lineH * f) / asc);
  else if (isSeyes) autoPx = Math.round(((rowH / 4) * 3 * f) / asc);
  else autoPx = Math.round((lineH * f) / (asc + desc));

  const fontPx = t.fontSizeMode === 'manual'
    ? clamp(Math.round(Number(t.fontSizePx) || autoPx), 8, 200)
    : Math.max(8, autoPx);

  const L = l.leftMarginInch * PX_PER_IN;
  const R = l.rightMarginInch * PX_PER_IN;
  const T = l.topMarginInch * PX_PER_IN;
  const B = l.bottomMarginInch * PX_PER_IN;
  const availW = Math.max(96, PAGE_W - L - R);
  const availHN = Math.max(rowH, PAGE_H - T - B);
  const letterSpacingPx = (Number(t.letterSpacingEm) || 0) * fontPx;

  return {
    gridType: g.gridType, isSeyes, lineH, skipH, rowH,
    family, fontPx, autoPx, asc, desc, letterSpacingPx,
    L, R, T, B, availW, availHN,
  };
}

/** Baseline offset inside a row of height rowH, measured from the row top. */
export function baselineInRow(geo) {
  if (geo.isSeyes) return geo.rowH;
  return geo.lineH - 1;
}

/**
 * Rows per page. Rows may stretch 85–115 % to fill the page, but only via the
 * skip space so writing-line proportions stay exact. Grids without skip
 * space (Seyès, single rule) never stretch.
 */
export function chooseRows(geo, availH) {
  const natural = geo.rowH;
  const floorN = Math.max(1, Math.floor(availH / natural));
  if (geo.skipH > 0) {
    const n = Math.max(1, Math.round(availH / natural));
    const stretched = availH / n;
    const ratio = stretched / natural;
    if (ratio >= 0.85 && ratio <= 1.15 && stretched >= geo.lineH) {
      return { n, rowH: stretched };
    }
  }
  return { n: floorN, rowH: natural };
}

// ─── Reference block ───────────────────────────────────────────

function buildRefBlock(state, geo, format, rng, sentences, maxHeight) {
  const title = String(state.refTitle ?? '').trim();
  const innerW = geo.availW - REF_PAD_X * 2;
  const warnings = [];

  let titleLines = [];
  if (title) {
    titleLines = wrapText(title, innerW, REF_TITLE_PX, geo.family, 0, 700).lines;
    if (titleLines.length > 2) {
      titleLines = titleLines.slice(0, 2);
      titleLines[1] = `${titleLines[1].replace(/\s*\S*$/, '')}…`;
      warnings.push('Reference title truncated to 2 lines.');
    }
  }

  const list = format === 'jumbled' ? shuffleUntilDifferent(sentences, rng) : null;
  const paragraphs = list ? null
    : String(state.userContentText).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!(list ?? paragraphs).length) return { block: null, warnings };

  // The reference text is read, not traced, so it may shrink (down to 14px)
  // to leave room for writing rows on page 1. Practice text never shrinks.
  const measure = bodyPx => {
    const bodyLH = Math.round(bodyPx * 1.35);
    let bodyLineCount = 0;
    if (list) {
      const numW = Math.ceil(measureText('00. ', bodyPx, geo.family));
      for (const s of list) bodyLineCount += Math.max(1, wrapText(s, innerW - numW, bodyPx, geo.family).lines.length);
    } else {
      for (const p of paragraphs) bodyLineCount += Math.max(1, wrapText(p, innerW, bodyPx, geo.family).lines.length);
    }
    const height = REF_PAD_Y * 2
      + titleLines.length * REF_TITLE_LH + (titleLines.length ? 6 : 0)
      + bodyLineCount * bodyLH;
    return { bodyPx, bodyLH, height };
  };

  let m = measure(Math.min(REF_BODY_MAX_PX, geo.fontPx));
  while (m.height > maxHeight && m.bodyPx > 14) m = measure(m.bodyPx - 1);
  if (m.height > maxHeight) warnings.push('Reference text is too long for page 1 — shorten it.');

  return {
    block: { titleLines, list, paragraphs, ...m },
    warnings,
  };
}

// ─── Page model ────────────────────────────────────────────────

/**
 * Builds { geo, pages, warnings }.
 * Each page: { picture, ref, rowH, rows: [row], badges: [{ row, n }] }
 * Each row: { text, kind: 'model' | 'trace' | 'blank', number }
 */
export function buildModel(state, seed) {
  const geo = computeGeometry(state);
  const format = state.exerciseFormat;
  const rng = mulberry32(seed);
  const warnings = [];
  const textOpts = [geo.availW, geo.fontPx, geo.family, geo.letterSpacingPx];

  const pictureH = Math.round(geo.availHN * clamp(Number(state.layout.pictureBlockHeightPct) || 0, 0, 50) / 100);
  const sentences = format === 'jumbled' ? parseSentences(state.userContentText) : [];

  let ref = null;
  if (format !== 'alternating') {
    const maxRefH = geo.availHN - (pictureH ? pictureH + PICTURE_GAP_BELOW : 0) - REF_GAP_BELOW - 2 * geo.rowH;
    const built = buildRefBlock(state, geo, format, rng, sentences, Math.max(geo.rowH, maxRefH));
    ref = built.block;
    warnings.push(...built.warnings);
  }

  const firstReserved = (pictureH ? pictureH + PICTURE_GAP_BELOW : 0) + (ref ? ref.height + REF_GAP_BELOW : 0);
  const availH1 = geo.availHN - firstReserved;
  if (availH1 < geo.rowH) warnings.push('Page 1 has no room for writing rows — shorten the reference text or reduce the picture block.');

  const page1Rows = availH1 >= geo.rowH ? chooseRows(geo, availH1) : { n: 0, rowH: geo.rowH };
  const pageNRows = chooseRows(geo, geo.availHN);

  const pages = [];
  const newPage = () => {
    const first = pages.length === 0;
    const spec = first ? page1Rows : pageNRows;
    const page = {
      picture: first ? pictureH : 0,
      ref: first ? ref : null,
      rowH: spec.rowH,
      capacity: spec.n,
      rows: [],
      badges: [],
    };
    pages.push(page);
    return page;
  };
  // An empty full-size page accepts any block (oversized blocks are split).
  const mustMove = (page, size) => page.rows.length + size > page.capacity
    && !(page.rows.length === 0 && page.capacity >= pageNRows.n);

  let tooWide = false;

  if (format === 'alternating') {
    const items = parseItems(state.userContentText);
    const blanks = clamp(Math.round(Number(state.scaffolding.blankRowsBetween) || 2), 1, 4);
    const fading = state.scaffolding.fadingMethod === 'faded_tracing';
    const groups = [];
    for (const item of items) {
      const wrapped = wrapText(item, ...textOpts);
      if (wrapped.tooWide) tooWide = true;
      for (const line of wrapped.lines) {
        const group = [{ text: line, kind: 'model' }];
        for (let b = 0; b < blanks; b++) {
          group.push(fading && b < 2 ? { text: line, kind: 'trace' } : { text: '', kind: 'blank' });
        }
        groups.push(group);
      }
    }
    let page = newPage();
    for (const group of groups) {
      if (mustMove(page, group.length)) {
        if (pages.length >= MAX_PAGES) { warnings.push(`Content truncated at ${MAX_PAGES} pages.`); break; }
        page = newPage();
      }
      // A group taller than a whole page is split rather than dropped.
      for (const row of group) {
        if (page.rows.length >= page.capacity) {
          if (pages.length >= MAX_PAGES) break;
          page = newPage();
        }
        page.rows.push(row);
      }
    }
    fillBlank(page);
  } else if (format === 'top_box') {
    const total = clamp(Math.round(Number(state.layout.totalPages) || 1), 1, MAX_PAGES);
    for (let p = 0; p < total; p++) fillBlank(newPage());
  } else {
    // jumbled — every sentence gets an atomic numbered block of equal height,
    // sized for the longest sentence so the block height doesn't hint at order.
    let rowsPerBlock = 1;
    for (const s of sentences) {
      const wrapped = wrapText(s, ...textOpts);
      if (wrapped.tooWide) tooWide = true;
      rowsPerBlock = Math.max(rowsPerBlock, wrapped.lines.length);
    }
    let page = newPage();
    sentences.forEach((_, idx) => {
      if (mustMove(page, rowsPerBlock)) {
        if (pages.length >= MAX_PAGES) return;
        page = newPage();
      }
      page.badges.push({ row: page.rows.length, n: idx + 1 });
      for (let r = 0; r < rowsPerBlock && page.rows.length < page.capacity; r++) {
        page.rows.push({ text: '', kind: 'blank' });
      }
    });
    if (sentences.length * rowsPerBlock > 0 && pages.length >= MAX_PAGES) {
      const placed = pages.reduce((sum, p) => sum + p.badges.length, 0);
      if (placed < sentences.length) warnings.push(`Content truncated at ${MAX_PAGES} pages.`);
    }
    fillBlank(page);
  }

  if (tooWide) warnings.push('A word is wider than the writing line — reduce font size or margins.');

  if (state.scaffolding.showLineNumbers) {
    pages.forEach(page => page.rows.forEach((row, i) => { row.number = i + 1; }));
  }

  return { geo, pages, warnings };
}

function fillBlank(page) {
  while (page.rows.length < page.capacity) page.rows.push({ text: '', kind: 'blank' });
}
