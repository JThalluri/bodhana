// Renderer — converts the page model into `.hw-worksheet` page HTML.
// Ruling is inline SVG (no gradients) so preview, print and PDF export are
// pixel-identical. Text is HTML so web fonts survive the export path.

import { PAGE_H, PX_PER_IN, baselineInRow } from './generator.js';
import { baselineOffsetInLineBox, fontStack } from './typography.js';

const esc = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const r2 = n => Math.round(n * 100) / 100;
const crisp = y => Math.round(y) + 0.5;
const MM = PX_PER_IN / 25.4;

function hline(y, w, color, dash = '') {
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
  return `<line x1="0" y1="${r2(y)}" x2="${r2(w)}" y2="${r2(y)}" stroke="${color}" stroke-width="1"${dashAttr}/>`;
}

function rulingSVG(state, geo, rowCount, rowH) {
  const g = state.geometry;
  const w = geo.availW;
  const h = Math.ceil(rowCount * rowH) + 1;
  const parts = [];

  if (geo.gridType === 'zaner_bloser') {
    const midDash = g.midlineDashPattern === 'solid' ? '' : g.midlineDashPattern;
    const showMid = g.hasMidline && g.midlineDashPattern !== 'none';
    for (let i = 0; i < rowCount; i++) {
      const y0 = i * rowH;
      parts.push(hline(crisp(y0), w, g.lineColorPrimary));
      if (showMid) parts.push(hline(crisp(y0 + Math.round(geo.lineH / 2)), w, g.lineColorMidline, midDash));
      parts.push(hline(crisp(y0 + geo.lineH - 1), w, g.lineColorBaseline));
    }
  } else if (geo.isSeyes) {
    // Exact float spacing: major line every 8 mm, three 2 mm sub-lines between.
    const q = rowH / 4;
    for (let x = 0; x <= w + 0.01; x += 8 * MM) {
      parts.push(`<line x1="${r2(x)}" y1="0" x2="${r2(x)}" y2="${r2(rowCount * rowH)}" stroke="${g.lineColorMidline}" stroke-width="0.75"/>`);
    }
    for (let i = 0; i < rowCount; i++) {
      const y0 = i * rowH;
      for (let k = 1; k <= 3; k++) parts.push(hline(y0 + k * q, w, g.lineColorMidline));
    }
    for (let i = 0; i <= rowCount; i++) parts.push(hline(i * rowH, w, g.lineColorPrimary));
  } else {
    for (let i = 0; i < rowCount; i++) {
      parts.push(hline(crisp(i * rowH + geo.lineH - 1), w, g.lineColorPrimary));
    }
  }

  return `<svg class="hw-ruling" width="${r2(w)}" height="${h}" viewBox="0 0 ${r2(w)} ${h}" aria-hidden="true">${parts.join('')}</svg>`;
}

function refBlockHTML(ref) {
  const title = ref.titleLines.length
    ? `<div class="hw-ref-title">${ref.titleLines.map(esc).join('<br>')}</div>`
    : '';
  const bodyStyle = `font-size:${ref.bodyPx}px;line-height:${ref.bodyLH}px`;
  const body = ref.list
    ? `<ol class="hw-ref-list" style="${bodyStyle}">${ref.list.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`
    : `<div class="hw-ref-body" style="${bodyStyle}">${ref.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div>`;
  return `<div class="hw-ref-block" style="height:${ref.height}px">${title}${body}</div>`;
}

function pageHTML(state, geo, page) {
  const s = state;
  const lineBox = geo.lineH;
  const textTopInRow = baselineInRow(geo) - baselineOffsetInLineBox(geo.fontPx, geo.family, lineBox)
    + (Number(s.typography.baselineShiftPx) || 0);
  const tracingOpacity = Math.min(0.7, Math.max(0.05, Number(s.scaffolding.tracingOpacity) || 0.2));

  const rowsH = page.rows.length * page.rowH;
  const textHTML = page.rows.map((row, i) => {
    const y = i * page.rowH;
    let out = '';
    if (row.text) {
      const cls = row.kind === 'trace' ? 'line-text is-trace' : 'line-text';
      const op = row.kind === 'trace' ? `opacity:${tracingOpacity};` : '';
      out += `<div class="${cls}" style="top:${r2(y + textTopInRow)}px;height:${r2(lineBox)}px;line-height:${r2(lineBox)}px;${op}">${esc(row.text)}</div>`;
    }
    if (row.number) {
      out += `<div class="hw-line-num" style="top:${r2(y + baselineInRow(geo) - 14)}px">${row.number}</div>`;
    }
    return out;
  }).join('');

  const badgeLeft = -Math.min(34, geo.L - 4);
  const badges = page.badges.map(b => {
    const top = b.row * page.rowH + Math.max(0, (Math.min(page.rowH, geo.lineH) - 26) / 2);
    return `<div class="hw-badge" style="top:${r2(top)}px;left:${r2(badgeLeft)}px">${b.n}</div>`;
  }).join('');

  const picture = page.picture
    ? `<div class="hw-picture" style="height:${page.picture}px"><span>Draw a picture</span></div>`
    : '';
  const ref = page.ref ? refBlockHTML(page.ref) : '';

  const marginLine = s.layout.showLeftMarginVerticalLine
    ? `<svg class="hw-margin-line" width="2" height="${PAGE_H}" style="left:${r2(geo.L - 8)}px" aria-hidden="true"><line x1="1" y1="0" x2="1" y2="${PAGE_H}" stroke="${s.layout.leftMarginLineColor}" stroke-width="1.5"/></svg>`
    : '';

  const fontStyle = [
    `font-family:${fontStack(geo.family).replace(/'/g, '&#39;')}`,
    `font-size:${geo.fontPx}px`,
    `letter-spacing:${r2(geo.letterSpacingPx)}px`,
  ].join(';');

  return `<div class="hw-worksheet">
  ${marginLine}
  <div class="hw-content" style="left:${r2(geo.L)}px;top:${r2(geo.T)}px;width:${r2(geo.availW)}px;height:${r2(geo.availHN)}px">
    ${picture}${ref}
    <div class="hw-rows" style="height:${r2(rowsH)}px;${fontStyle}">
      ${rulingSVG(s, geo, page.rows.length, page.rowH)}
      ${textHTML}${badges}
    </div>
  </div>
</div>`;
}

export function renderPages(state, model) {
  return model.pages.map(page => pageHTML(state, model.geo, page)).join('');
}
