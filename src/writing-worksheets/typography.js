// Font measurement and word wrapping — spec §5.
// Everything is measured with a canvas 2D context so layout is deterministic
// and independent of the preview zoom. Text never shrinks; it wraps.

let _ctx = null;
const _metricCache = new Map();

function ctx() {
  if (!_ctx) _ctx = document.createElement('canvas').getContext('2d');
  return _ctx;
}

export function fontStack(family) {
  return `'${family}', sans-serif`;
}

function fontSpec(px, family, weight = 400) {
  return `${weight} ${px}px ${fontStack(family)}`;
}

export function isFontReady(family) {
  try { return document.fonts.check(fontSpec(100, family)); } catch { return true; }
}

export function ensureFont(family) {
  return Promise.all([
    document.fonts.load(fontSpec(100, family, 400)),
    document.fonts.load(fontSpec(100, family, 700)),
  ]).catch(() => {});
}

/** Ascender / descender heights as a fraction of font size. */
export function fontMetrics(family) {
  if (_metricCache.has(family)) return _metricCache.get(family);
  const c = ctx();
  c.font = fontSpec(100, family);
  let asc = 0;
  for (const ch of 'lbdhkHBD') asc = Math.max(asc, c.measureText(ch).actualBoundingBoxAscent);
  let desc = 0;
  for (const ch of 'gypqj') desc = Math.max(desc, c.measureText(ch).actualBoundingBoxDescent);
  const m = { asc: asc / 100 || 0.72, desc: desc / 100 || 0.22 };
  // Only cache once the real web font is in use, never the fallback's metrics.
  if (isFontReady(family)) _metricCache.set(family, m);
  return m;
}

/**
 * Distance from the top of a line box (height = lineHeightPx) to the
 * alphabetic baseline, measured with a hidden DOM probe so it matches the
 * browser's own line-box layout exactly.
 */
const _baselineCache = new Map();
export function baselineOffsetInLineBox(px, family, lineHeightPx) {
  const key = `${family}|${px}|${lineHeightPx}`;
  if (_baselineCache.has(key)) return _baselineCache.get(key);
  const box = document.createElement('div');
  box.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;`
    + `font:400 ${px}px ${fontStack(family)};line-height:${lineHeightPx}px;height:${lineHeightPx}px`;
  box.textContent = 'Hg';
  const probe = document.createElement('span');
  probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
  box.appendChild(probe);
  document.body.appendChild(box);
  const offset = probe.getBoundingClientRect().bottom - box.getBoundingClientRect().top;
  box.remove();
  if (isFontReady(family)) _baselineCache.set(key, offset);
  return offset;
}

export function measureText(text, px, family, letterSpacingPx = 0, weight = 400) {
  const c = ctx();
  c.font = fontSpec(px, family, weight);
  return c.measureText(text).width + letterSpacingPx * [...text].length;
}

/**
 * Greedy word wrap. Returns { lines, tooWide } where tooWide is true when a
 * single word is wider than maxW (it is kept on its own line, never shrunk).
 */
export function wrapText(text, maxW, px, family, letterSpacingPx = 0, weight = 400) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  let tooWide = false;
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (!cur || measureText(next, px, family, letterSpacingPx, weight) <= maxW) {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
    }
    if (measureText(w, px, family, letterSpacingPx, weight) > maxW) tooWide = true;
  }
  if (cur) lines.push(cur);
  return { lines, tooWide };
}
