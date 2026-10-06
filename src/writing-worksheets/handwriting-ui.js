// Handwriting Lines — settings UI + live preview.
// Mounted by src/worksheets/index.js when the type switcher selects
// "handwriting". No settings are persisted (session-only state).

import { themeToggleMarkup } from '../shared/shell-ui.js';
import { printWorksheet } from '../shared/print.js';
import { exportWorksheetPdf } from '../shared/export-pdf.js';
import { REF_TITLE_DEFAULTS, FONT_OPTIONS, freshState, getPath, setPath, clamp } from './state.js';
import { TIERS, applyTier } from './presets.js';
import { buildModel, randomSeed } from './generator.js';
import { renderPages } from './renderer.js';
import { ensureFont, isFontReady } from './typography.js';

let _listeners = [];
let _rafId = 0;
let _alive = false;

function on(el, evt, fn) {
  el.addEventListener(evt, fn);
  _listeners.push({ el, evt, fn });
}

export function unmountHandwriting() {
  _alive = false;
  cancelAnimationFrame(_rafId);
  _listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
  _listeners = [];
}

const SEYES_ROW_INCH = 8 / 25.4;

const num = (path, label, { min, max, step, title = '' }) => `
  <div class="ws-field" title="${title}">
    <label for="hw-${path}">${label}</label>
    <input class="tb-num" type="number" id="hw-${path}" data-path="${path}" data-type="number" min="${min}" max="${max}" step="${step}">
  </div>`;

const sel = (path, label, options, title = '') => `
  <div class="ws-field" title="${title}">
    <label for="hw-${path}">${label}</label>
    <select class="tb-select" id="hw-${path}" data-path="${path}">
      ${options.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
    </select>
  </div>`;

const chk = (path, label, title = '') => `
  <div class="ws-field hw-check" title="${title}">
    <label for="hw-${path}">${label}</label>
    <input type="checkbox" id="hw-${path}" data-path="${path}" data-type="bool">
  </div>`;

const color = (path, label) => `
  <div class="ws-field">
    <label for="hw-${path}">${label}</label>
    <input class="hw-color" type="color" id="hw-${path}" data-path="${path}">
  </div>`;

function markup() {
  return `
    <div class="hw-tool tool-shell">
      <div class="tool-header tool-worksheet-header no-print">
        <div class="tool-header-main">
          <span class="tool-header-title">Handwriting Lines</span>
          <span class="tool-header-status tb-status status-msg info" id="hwPageCount"></span>
        </div>
        <div class="tool-header-actions tool-worksheet-actions">
          <div class="tool-primary-actions">
            <button class="btn btn-primary btn-sm" id="hwPrintBtn"><i class="fas fa-print"></i> Print</button>
            <button class="btn btn-secondary btn-sm" id="hwExportBtn"><i class="fas fa-file-pdf"></i> Export PDF</button>
            <span class="tool-action-separator" aria-hidden="true"></span>
            <button class="btn btn-ghost btn-sm" id="hwResetBtn" title="Restore all settings to defaults"><i class="fas fa-rotate-left"></i> Reset</button>
          </div>
          <div class="tool-secondary-actions">
            <span class="tool-theme-slot">${themeToggleMarkup()}</span>
          </div>
        </div>
      </div>

      <div class="tool-body">
        <div class="hw-settings-pane tool-settings no-print">
          <div class="ws-settings-section tool-type-section">
            <div class="ws-section-title">Worksheet</div>
            <div class="ws-field">
              <label for="hwTypeSelect">Type</label>
              <select class="tb-select" id="hwTypeSelect">
                <option value="seyes">Seyes / French Ruled</option>
                <option value="handwriting" selected>Handwriting Lines</option>
              </select>
            </div>
            ${sel('exerciseFormat', 'Format', [
              ['alternating', 'Alternating (model + practice)'],
              ['top_box', 'Copy from box'],
              ['jumbled', 'Jumbled sentences'],
            ])}
            <div class="ws-field">
              <label for="hwTier">Grade tier</label>
              <select class="tb-select" id="hwTier">
                ${Object.entries(TIERS).map(([id, t]) => `<option value="${id}">${t.label}</option>`).join('')}
              </select>
            </div>
            <p class="hw-hint">Choosing a tier loads its preset. Every value below stays editable.</p>
          </div>

          <div class="ws-settings-section">
            <div class="ws-section-title">Content</div>
            <textarea id="hw-userContentText" data-path="userContentText" class="ws-textarea hw-textarea"
              placeholder="One item or sentence per line."></textarea>
            <p class="hw-hint" id="hwContentHint"></p>
            <div class="ws-field hw-wide" id="hwRefTitleRow">
              <label for="hw-refTitle">Box title</label>
              <input class="tb-num hw-text" type="text" id="hw-refTitle" data-path="refTitle" maxlength="120">
            </div>
            <div class="ws-field" id="hwSeedRow" title="Same seed → same jumbled order.">
              <label for="hwSeed">Seed</label>
              <div class="hw-seed">
                <input class="tb-num" type="number" id="hwSeed" min="1" step="1">
                <button class="btn btn-ghost btn-sm" id="hwReshuffleBtn" title="New random order"><i class="fas fa-shuffle"></i></button>
              </div>
            </div>
          </div>

          <div class="ws-settings-section">
            <div class="ws-section-title">Line Geometry</div>
            ${sel('geometry.gridType', 'Ruling', [
              ['zaner_bloser', 'Primary (head / mid / base)'],
              ['seyes_french', 'Seyès-style (practice)'],
              ['single_rule', 'Single rule'],
            ])}
            <p class="hw-hint" id="hwSeyesNote" hidden>Seyès-style lines are fixed at 8 mm rows with 2 mm sub-lines. Verify spacing on a physical print.</p>
            ${num('geometry.lineHeightInch', 'Line height (in)', { min: 0.2, max: 2, step: 0.0625 })}
            ${chk('geometry.hasSkipSpace', 'Gap between rows')}
            ${num('geometry.skipSpaceHeightInch', 'Gap height (in)', { min: 0, max: 1, step: 0.0625 })}
            ${chk('geometry.hasMidline', 'Midline')}
            ${sel('geometry.midlineDashPattern', 'Midline style', [['4 4', 'Dashed'], ['2 3', 'Dotted'], ['solid', 'Solid']])}
            ${color('geometry.lineColorPrimary', 'Head / main line')}
            ${color('geometry.lineColorMidline', 'Midline / sub-lines')}
            ${color('geometry.lineColorBaseline', 'Baseline')}
          </div>

          <div class="ws-settings-section">
            <div class="ws-section-title">Typography</div>
            ${sel('typography.fontFamily', 'Font', FONT_OPTIONS.map(f => [f, f]))}
            ${sel('typography.fontSizeMode', 'Size', [['auto', 'Fit to lines'], ['manual', 'Manual']])}
            ${num('typography.fontSizeFill', 'Fill (0.5–1)', { min: 0.5, max: 1, step: 0.01, title: 'How much of the writing zone the letters fill.' })}
            ${num('typography.fontSizePx', 'Font px', { min: 8, max: 200, step: 1 })}
            ${num('typography.baselineShiftPx', 'Baseline shift px', { min: -30, max: 30, step: 1, title: 'Nudge text up (−) or down (+).' })}
            ${num('typography.letterSpacingEm', 'Letter spacing (em)', { min: -0.05, max: 0.3, step: 0.01 })}
          </div>

          <div class="ws-settings-section">
            <div class="ws-section-title">Layout</div>
            ${num('layout.totalPages', 'Pages', { min: 1, max: 20, step: 1, title: 'Copy-from-box format only. Other formats paginate automatically.' })}
            ${num('layout.pictureBlockHeightPct', 'Picture box %', { min: 0, max: 50, step: 5, title: 'Drawing box on page 1 (0 = none).' })}
            ${num('layout.leftMarginInch', 'Left margin (in)', { min: 0.25, max: 2, step: 0.05 })}
            ${num('layout.rightMarginInch', 'Right margin (in)', { min: 0.25, max: 2, step: 0.05 })}
            ${num('layout.topMarginInch', 'Top margin (in)', { min: 0.25, max: 2, step: 0.05 })}
            ${num('layout.bottomMarginInch', 'Bottom margin (in)', { min: 0.25, max: 2, step: 0.05 })}
            ${chk('layout.showLeftMarginVerticalLine', 'Margin line')}
            ${color('layout.leftMarginLineColor', 'Margin line color')}
          </div>

          <div class="ws-settings-section">
            <div class="ws-section-title">Scaffolding</div>
            ${sel('scaffolding.fadingMethod', 'Tracing', [['none', 'None'], ['faded_tracing', 'Faded tracing (2 rows)']], 'Alternating format only.')}
            ${num('scaffolding.tracingOpacity', 'Tracing opacity', { min: 0.05, max: 0.7, step: 0.05 })}
            ${num('scaffolding.blankRowsBetween', 'Practice rows', { min: 1, max: 4, step: 1, title: 'Rows after each model line (alternating format).' })}
            ${chk('scaffolding.showLineNumbers', 'Line numbers')}
          </div>

          <div class="ws-settings-section hw-warning-section" id="hwWarnings" hidden>
            <div class="overflow-warning" role="status"></div>
          </div>
        </div>

        <div class="tool-preview">
          <div class="tool-preview-scroll">
            <div id="hwPagesContainer" class="tool-pages"></div>
          </div>
        </div>

        <div class="tool-info-pane" aria-hidden="true"></div>
      </div>
    </div>
  `;
}

/**
 * @param {HTMLElement} container
 * @param {(type: string) => void} onTypeChange  called when the user picks another worksheet type
 */
export function buildHandwritingUI(container, onTypeChange) {
  unmountHandwriting();
  _alive = true;
  container.innerHTML = markup();

  let state = freshState();
  let seed = state.seed ?? randomSeed();

  const $ = sel => container.querySelector(sel);
  const pagesEl = $('#hwPagesContainer');
  const pageCountEl = $('#hwPageCount');
  const warnSection = $('#hwWarnings');
  const warnEl = warnSection.querySelector('.overflow-warning');
  const tierEl = $('#hwTier');
  const seedEl = $('#hwSeed');
  const bound = [...container.querySelectorAll('[data-path]')];

  function syncControls() {
    for (const el of bound) {
      const v = getPath(state, el.dataset.path);
      if (el.type === 'checkbox') el.checked = !!v;
      else if (el.dataset.type === 'number') el.value = el.dataset.path === 'geometry.lineHeightInch' ? +Number(v).toFixed(4) : v;
      else el.value = v ?? '';
    }
    tierEl.value = state.activeTier;
    seedEl.value = seed;
    syncEnabled();
  }

  function setDisabled(path, disabled) {
    const el = container.querySelector(`[data-path="${path}"]`);
    if (!el) return;
    el.disabled = disabled;
    el.closest('.ws-field')?.classList.toggle('is-disabled', disabled);
  }

  function syncEnabled() {
    const g = state.geometry;
    const fmt = state.exerciseFormat;
    const seyes = g.gridType === 'seyes_french';
    const zb = g.gridType === 'zaner_bloser';
    // Seyès-style geometry is locked so the 8 mm / 2 mm rhythm stays exact.
    setDisabled('geometry.lineHeightInch', seyes);
    setDisabled('geometry.hasSkipSpace', !zb);
    setDisabled('geometry.skipSpaceHeightInch', !zb || !g.hasSkipSpace);
    setDisabled('geometry.hasMidline', !zb);
    setDisabled('geometry.midlineDashPattern', !zb || !g.hasMidline);
    setDisabled('geometry.lineColorBaseline', !zb);
    setDisabled('typography.fontSizeFill', state.typography.fontSizeMode !== 'auto');
    setDisabled('typography.fontSizePx', state.typography.fontSizeMode !== 'manual');
    setDisabled('layout.totalPages', fmt !== 'top_box');
    setDisabled('layout.leftMarginLineColor', !state.layout.showLeftMarginVerticalLine);
    setDisabled('scaffolding.fadingMethod', fmt !== 'alternating');
    setDisabled('scaffolding.tracingOpacity', fmt !== 'alternating' || state.scaffolding.fadingMethod !== 'faded_tracing');
    setDisabled('scaffolding.blankRowsBetween', fmt !== 'alternating');
    $('#hwSeyesNote').hidden = !seyes;
    $('#hwSeedRow').hidden = fmt !== 'jumbled';
    $('#hwRefTitleRow').hidden = fmt === 'alternating';
    $('#hwContentHint').textContent = {
      alternating: 'One word or sentence per line (or a single comma-separated line). Long lines wrap; each wrapped line gets its own model and practice rows.',
      top_box: 'Shown in a box on page 1; students copy it onto the lines below.',
      jumbled: 'One sentence per line, in the correct order. They are shuffled in the box.',
    }[fmt];
  }

  function scheduleRender() {
    cancelAnimationFrame(_rafId);
    _rafId = requestAnimationFrame(render);
  }

  function render() {
    if (!_alive) return;
    const family = state.typography.fontFamily;
    if (!isFontReady(family)) {
      // Measure only with the real font; re-render once it arrives.
      ensureFont(family).then(() => { if (_alive) scheduleRender(); });
    }
    const model = buildModel(state, seed);
    pagesEl.innerHTML = renderPages(state, model);
    const n = model.pages.length;
    pageCountEl.textContent = `${n} page${n === 1 ? '' : 's'}`;

    const warnings = [...model.warnings];
    const overflowing = [...pagesEl.querySelectorAll('.hw-content')]
      .some(el => el.scrollHeight - el.clientHeight > 1);
    if (overflowing) warnings.push('Content overflows the page — reduce text, picture box or margins.');
    warnSection.hidden = warnings.length === 0;
    warnEl.innerHTML = warnings.map(w => `<div><i class="fas fa-triangle-exclamation"></i> ${w}</div>`).join('');
  }

  function readControl(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.dataset.type === 'number') {
      const v = parseFloat(el.value);
      if (!Number.isFinite(v)) return null;
      return clamp(v, parseFloat(el.min), parseFloat(el.max));
    }
    return el.value;
  }

  function onFieldChange(e) {
    const el = e.target;
    const path = el.dataset.path;
    const value = readControl(el);
    if (value === null) return;

    if (path === 'exerciseFormat') {
      const prevDefault = REF_TITLE_DEFAULTS[state.exerciseFormat];
      if (state.refTitle === prevDefault) state.refTitle = REF_TITLE_DEFAULTS[value];
    }
    setPath(state, path, value);

    if (path === 'geometry.gridType') {
      const g = state.geometry;
      if (value === 'seyes_french') {
        Object.assign(g, { lineHeightInch: SEYES_ROW_INCH, hasSkipSpace: false, skipSpaceHeightInch: 0, hasMidline: false });
      } else if (value === 'single_rule') {
        Object.assign(g, { hasSkipSpace: false, hasMidline: false });
        if (g.lineHeightInch === SEYES_ROW_INCH) g.lineHeightInch = 0.28125;
      } else if (value === 'zaner_bloser' && g.lineHeightInch === SEYES_ROW_INCH) {
        Object.assign(g, { lineHeightInch: 0.5, hasSkipSpace: true, skipSpaceHeightInch: 0.1875, hasMidline: true, midlineDashPattern: '4 4' });
      }
    }
    if (path === 'typography.fontSizeMode' && value === 'manual') {
      // Start manual mode from the size currently shown.
      state.typography.fontSizePx = buildModel(state, seed).geo.autoPx;
    }

    // Only re-sync on 'change' so typing in a field isn't interrupted.
    if (e.type === 'change') syncControls();
    else syncEnabled();
    scheduleRender();
  }

  for (const el of bound) {
    on(el, 'input', onFieldChange);
    on(el, 'change', onFieldChange);
  }

  on(tierEl, 'change', () => {
    applyTier(state, tierEl.value);
    if (tierEl.value === 'tier1' && state.userContentText === freshState().userContentText) {
      state.userContentText = 'cat\nsun\nbig dog\nI can run.';
    }
    syncControls();
    scheduleRender();
  });

  on(seedEl, 'change', () => {
    const v = parseInt(seedEl.value, 10);
    if (Number.isFinite(v) && v > 0) seed = v;
    seedEl.value = seed;
    scheduleRender();
  });

  on($('#hwReshuffleBtn'), 'click', () => {
    seed = randomSeed();
    seedEl.value = seed;
    scheduleRender();
  });

  on($('#hwResetBtn'), 'click', () => {
    state = freshState();
    seed = randomSeed();
    syncControls();
    scheduleRender();
  });

  on($('#hwPrintBtn'), 'click', () => printWorksheet());
  on($('#hwExportBtn'), 'click', () => exportWorksheetPdf({ filenameBase: 'writing_worksheet' }));

  const typeSelect = $('#hwTypeSelect');
  on(typeSelect, 'change', () => {
    if (typeSelect.value !== 'handwriting') onTypeChange?.(typeSelect.value);
  });

  syncControls();
  render();
}
