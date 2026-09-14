import { seyesGridSVG } from './seyes-grid.js';

let _listeners = [];

function on(el, evt, fn) {
  el.addEventListener(evt, fn);
  _listeners.push({ el, evt, fn });
}

export function unmount() {
  _listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
  _listeners = [];
}

// ── Constants (physical paper geometry) ───────────────────────────────────
const PAGE_W_MM    = 8.5 * 25.4;   // 215.9 mm
const PAGE_H_MM    = 11  * 25.4;   // 279.4 mm
const CELL_MM      = 8;
const RIGHT_PAD_MM = 4;

// ── HTML escape ────────────────────────────────────────────────────────────
function esc(c) {
  if (c === '&') return '&amp;';
  if (c === '<') return '&lt;';
  if (c === '>') return '&gt;';
  return c;
}

// ── Mount ──────────────────────────────────────────────────────────────────
export function buildWorksheetsUI(container) {
  container.innerHTML = `
    <div class="ws-tool">

      <!-- Sticky compact toolbar (mirrors word-puzzle pattern) -->
      <div class="ws-toolbar no-print">
        <div class="ws-tb-row">

          <div class="ws-tb-group">
            <span class="ws-tb-grouplabel">Worksheet</span>
            <select class="tb-select" id="wsTypeSelect" style="min-width:160px;">
              <option value="seyes">Seyès / French Ruled</option>
            </select>
          </div>

          <span class="tb-vdiv"></span>

          <div class="ws-tb-group">
            <span class="ws-tb-grouplabel">Settings</span>

            <label class="tb-count-lbl" title="Font size in px (28–50). Default 38 px is calibrated for Andika on the 8 mm Seyès grid.">
              Font px
              <input class="tb-num" type="number" id="wsFontSize"
                     min="28" max="50" step="0.5" value="38" style="width:42px;">
            </label>

            <label class="tb-count-lbl" title="Baseline offset in mm (−6 to +12). Nudge text up or down to seat characters on the grid line.">
              Baseline mm
              <input class="tb-num" type="number" id="wsBaseline"
                     min="-6" max="12" step="0.1" value="0" style="width:46px;">
            </label>

            <label class="tb-count-lbl" title="Left margin — must be a multiple of 8 mm so characters align to grid columns.">
              Left margin
              <select class="tb-select" id="wsLeftPad">
                <option value="0">0 mm</option>
                <option value="8" selected>8 mm</option>
                <option value="16">16 mm</option>
                <option value="24">24 mm</option>
              </select>
            </label>

            <label class="tb-count-lbl" title="Blank grid rows between text lines (0–8). Default 3 → learner has 3 rows to copy each line.">
              Blank rows
              <input class="tb-num" type="number" id="wsRowGap"
                     min="0" max="8" step="1" value="3" style="width:34px;">
            </label>

            <label class="tb-count-lbl" title="Top margin in mm (0–24). Offsets text from the paper top edge to avoid printer clipping.">
              Top margin mm
              <input class="tb-num" type="number" id="wsTopPad"
                     min="0" max="24" step="0.5" value="8" style="width:42px;">
            </label>
          </div>

          <span class="tb-vdiv"></span>

          <!-- Actions — pushed to the right -->
          <div class="tb-actions" style="margin-left:auto;">
            <span class="tb-status status-msg info" id="wsPageCount"></span>
            <button class="btn btn-primary btn-sm" id="wsPrintBtn">
              <i class="fas fa-print"></i> Print / Save PDF
            </button>
          </div>

        </div>
      </div>

      <!-- Two-pane body -->
      <div class="ws-body">

        <!-- Left pane: text input (stays visible while right pane scrolls) -->
        <div class="ws-input-pane no-print">
          <div class="ws-pane-label">Practice Text</div>
          <textarea id="wsInput" class="ws-textarea"
            placeholder="Type or paste text here. Press Enter for a new paragraph."
          >I am doing my homework. My brother is reading a book. We enjoy doing our homework. We will play outside when we are done. If it is not hot in the evening, my dad will take us to a park.</textarea>
          <p class="ws-print-warning">
            <i class="fas fa-info-circle"></i>
            Print dialog: set <strong>Margins = None</strong>, Paper = Letter,
            and check <strong>"Background graphics"</strong>.
          </p>
        </div>

        <!-- Right pane: scrollable page preview -->
        <div class="ws-pages-pane">
          <div id="wsPagesContainer"></div>
        </div>

      </div>
    </div>
  `;

  const pagesContainer = container.querySelector('#wsPagesContainer');
  const input          = container.querySelector('#wsInput');
  const fontSizeEl     = container.querySelector('#wsFontSize');
  const baselineEl     = container.querySelector('#wsBaseline');
  const leftPadEl      = container.querySelector('#wsLeftPad');
  const rowGapEl       = container.querySelector('#wsRowGap');
  const topPadEl       = container.querySelector('#wsTopPad');
  const printBtn       = container.querySelector('#wsPrintBtn');
  const pageCountEl    = container.querySelector('#wsPageCount');

  function getVars() {
    return {
      fontSize: parseFloat(fontSizeEl.value) || 40,
      baseline: parseFloat(baselineEl.value) || 0,
      leftPad:  parseFloat(leftPadEl.value)  || 8,
      rowGap:   parseInt(rowGapEl.value,  10) || 3,
      topPad:   parseFloat(topPadEl.value)   || 8,
    };
  }

  function update() {
    const vars  = getVars();
    const pages = paginateText(input.value, vars);
    if (pageCountEl) {
      pageCountEl.textContent = pages.length === 1
        ? '1 page'
        : `${pages.length} pages`;
    }
    renderPagesDOM(pagesContainer, pages, vars);
  }

  function handlePrint() {
    const vars  = getVars();
    const pages = paginateText(input.value, vars);
    const html  = buildPrintHTML(pages, vars);
    const w = window.open('', '_blank', 'width=1000,height=750');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 600);
  }

  update();

  on(input,      'input',  update);
  on(fontSizeEl, 'input',  update);
  on(fontSizeEl, 'change', update);
  on(baselineEl, 'input',  update);
  on(baselineEl, 'change', update);
  on(leftPadEl,  'change', update);
  on(rowGapEl,   'input',  update);
  on(rowGapEl,   'change', update);
  on(topPadEl,   'input',  update);
  on(topPadEl,   'change', update);
  on(printBtn,   'click',  handlePrint);
}

// ── Pagination ─────────────────────────────────────────────────────────────
//
// Seyès geometry is fully deterministic in mm, so we can calculate the
// exact number of lines per page and characters per line without touching
// the DOM.  The approach:
//   • Each character occupies a fixed 8 mm cell (seyes-char span).
//   • Each word span costs (word.length + 1) cell units: word chars + 1 for
//     the 8 mm margin-right gap.
//   • A line can hold words while the running total ≤ availChars.
//   • linesPerPage = floor((PAGE_H – topPad) / lineHeight).
//
function paginateText(text, vars) {
  const { leftPad, topPad, rowGap } = vars;

  const lineH        = (rowGap + 1) * CELL_MM;
  const linesPerPage = Math.max(1, Math.floor((PAGE_H_MM - topPad) / lineH));
  const availMm      = PAGE_W_MM - leftPad - RIGHT_PAD_MM;
  const availUnits   = Math.max(1, Math.floor(availMm / CELL_MM));

  // Build logical lines (array of word arrays) via greedy word-wrap.
  const logicalLines = [];

  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) {
      logicalLines.push([]);   // blank paragraph → blank line on the page
      continue;
    }
    let line = [], lineW = 0;
    for (const word of words) {
      const ww = word.length + 1;   // chars + 1 for word-gap unit
      if (line.length === 0 || lineW + ww <= availUnits) {
        line.push(word);
        lineW += ww;
      } else {
        logicalLines.push(line);
        line  = [word];
        lineW = ww;
      }
    }
    logicalLines.push(line);
  }

  if (logicalLines.length === 0) return [[[]]];

  // Chunk logical lines into pages.
  const pages = [];
  for (let i = 0; i < logicalLines.length; i += linesPerPage) {
    pages.push(logicalLines.slice(i, i + linesPerPage));
  }
  return pages;
}

// ── Rendering helpers ──────────────────────────────────────────────────────

// Convert a page's array-of-lines into the innerHTML for .seyes-text-area.
// Lines are joined with <br>.  Words within a line have NO <wbr> between them
// because the line-breaking is pre-computed; we don't want the browser to
// re-wrap within a logical line.
function pageLinesToHTML(lines) {
  return lines.map(words => {
    if (words.length === 0) return '';   // blank line — <br> join creates the gap
    return words.map(w =>
      `<span class="seyes-word">${
        w.split('').map(c => `<span class="seyes-char">${esc(c)}</span>`).join('')
      }</span>`
    ).join('');
  }).join('<br>');
}

function applyPageVars(el, vars) {
  el.style.setProperty('--seyes-font-size',        vars.fontSize + 'px');
  el.style.setProperty('--seyes-baseline-offset',  vars.baseline + 'mm');
  el.style.setProperty('--seyes-left-pad',         vars.leftPad  + 'mm');
  el.style.setProperty('--seyes-top-pad',          vars.topPad   + 'mm');
  el.style.setProperty('--seyes-row-gap',          vars.rowGap);
}

function renderPagesDOM(container, pages, vars) {
  const gridSVG = seyesGridSVG();
  container.innerHTML = pages.map(() => `
    <div class="seyes-page">
      <div class="seyes-grid">${gridSVG}</div>
      <div class="seyes-guide-h"></div>
      <div class="seyes-guide-v"></div>
      <div class="seyes-text-area"></div>
    </div>
  `).join('');

  const pageEls = container.querySelectorAll('.seyes-page');
  pageEls.forEach((el, i) => {
    applyPageVars(el, vars);
    el.querySelector('.seyes-text-area').innerHTML = pageLinesToHTML(pages[i]);
  });
}

// ── Print window ───────────────────────────────────────────────────────────
//
// The print window uses the same Consolas monospace stack as the screen
// preview.  Because Consolas is a system font it is NOT embedded in the PDF,
// keeping file sizes small.  The CSS variable values are baked in at print
// time so the printed output exactly matches the on-screen calibration.
//
function buildPrintHTML(pages, vars) {
  const gridSVG = seyesGridSVG();
  const pagesHTML = pages.map(lines => `
<div class="page">
  <div class="grid">${gridSVG}</div>
  <div class="text-area">${pageLinesToHTML(lines)}</div>
</div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Seyès Worksheet</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Andika:wght@400;700&display=swap">
<style>
  :root {
    --s-baseline:  ${vars.baseline}mm;
    --s-font-size: ${vars.fontSize}px;
    --s-left-pad:  ${vars.leftPad}mm;
    --s-top-pad:   ${vars.topPad}mm;
    --s-row-gap:   ${vars.rowGap};
    --s-word-gap:  8mm;
  }

  html, body { margin: 0; padding: 0; background: #fff; }

  .page {
    width: 8.5in;
    height: 11in;
    position: relative;
    background: #fff;
    overflow: hidden;
    box-sizing: border-box;
    page-break-after: always;
    break-after: page;
  }
  .page:last-child { page-break-after: avoid; break-after: auto; }

  .grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-color: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .grid svg {
    display: block;
    width: 100%;
    height: 100%;
    shape-rendering: crispEdges;
  }

  .text-area {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    padding: var(--s-top-pad) 4mm 0 var(--s-left-pad);
    transform: translateY(var(--s-baseline));
    font-family: "Andika", "Comic Sans MS", "Chalkboard SE", sans-serif;
    font-size: var(--s-font-size);
    line-height: calc((var(--s-row-gap) + 1) * 8mm);
    color: #111;
    z-index: 10;
    overflow: hidden;
    white-space: normal;
    word-break: normal;
    overflow-wrap: normal;
  }

  .seyes-word {
    display: inline-block;
    white-space: nowrap;
    vertical-align: top;
    line-height: 8mm;
    margin-right: var(--s-word-gap);
  }

  .seyes-char {
    display: inline-block;
    width: 8mm;
    text-align: center;
    line-height: 8mm;
    vertical-align: top;
  }

  @media print {
    html, body { margin: 0; background: #fff; }
    @page { size: letter; margin: 0; }
  }
</style>
</head>
<body>
${pagesHTML}
</body>
</html>`;
}
