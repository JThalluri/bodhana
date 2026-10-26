import { paperSizeOptions } from '../shared/paper-size.js';
import { initWorkspacePersistence } from '../shared/device-storage.js';
let workspace;
// Handwriting Lines — settings UI + live preview.
// Mounted by src/worksheets/index.js when the type switcher selects
// "handwriting". Settings and dictionary selections are retained on this device.

import { themeToggleMarkup, wireTabs } from '../shared/shell-ui.js';
import { printWorksheet } from '../shared/print.js';
import { exportWorksheetPdf } from '../shared/export-pdf.js';
import { REF_TITLE_DEFAULTS, FONT_OPTIONS, freshState, getPath, setPath, clamp } from './state.js';
import { TIERS, applyTier } from './presets.js';
import { buildModel, randomSeed } from './generator.js';
import { renderPages } from './renderer.js';
import { ensureFont, isFontReady } from './typography.js';
import { loadDictionaryFromFile } from '../wordpuzzle/dictionary.js';

let _listeners = [];
let _rafId = 0;
let _alive = false;

function on(el, evt, fn) {
  el.addEventListener(evt, fn);
  _listeners.push({ el, evt, fn });
}

export function unmountHandwriting() {
  workspace?.dispose(); workspace = null;
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
          <div class="hw-stab-strip" role="tablist">
            <button class="hw-stab active" role="tab" aria-selected="true" data-tab="setup">
              <i class="fas fa-sliders-h"></i><span>Setup</span>
            </button>
            <button class="hw-stab" role="tab" aria-selected="false" data-tab="content">
              <i class="fas fa-align-left"></i><span>Content</span>
            </button>
            <button class="hw-stab" role="tab" aria-selected="false" data-tab="lines">
              <i class="fas fa-grip-lines"></i><span>Lines</span>
            </button>
            <button class="hw-stab" role="tab" aria-selected="false" data-tab="text">
              <i class="fas fa-font"></i><span>Text</span>
            </button>
            <button class="hw-stab" role="tab" aria-selected="false" data-tab="layout">
              <i class="fas fa-border-style"></i><span>Layout</span>
            </button>
          </div>

          <div class="hw-stab-panels">
            <div class="hw-stab-panel active" role="tabpanel" data-panel="setup">
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
              ['word_practice', 'Word Practice'],
            ])}
            ${sel('paperSize', 'Paper size', paperSizeOptions())}
            <div id="hwWordPracticeSection" hidden>
              ${sel('wordPractice.mode', 'Content', [['practice','Practice lines'],['words','Words only']])}
              ${sel('wordPractice.lines', 'Practice lines', [['1','1 per word'],['2','2 per word'],['3','3 per word'],['4','4 per word'],['5','5 per word'],['all','Full page (no words)']])}
              ${num('wordPractice.rowPaddingPx', 'Row padding px', {min:0,max:30,step:1})}
              ${num('wordPractice.lineGapPx', 'Gap to lines px', {min:0,max:30,step:1})}
            </div>
            <div class="ws-field">
              <label for="hwTier">Grade tier</label>
              <select class="tb-select" id="hwTier">
                ${Object.entries(TIERS).map(([id, t]) => `<option value="${id}">${t.label}</option>`).join('')}
              </select>
            </div>
            <p class="hw-hint">Choosing a tier loads its preset. Every value below stays editable.</p>
            <div class="hw-progressive-section" id="hwScaffoldingSection" hidden>
              <div class="ws-section-title">Tracing Lines</div>
              ${sel('scaffolding.fadingMethod', 'Tracing', [['none', 'None'], ['faded_tracing', 'Faded tracing (2 rows)']], 'Alternating format only.')}
              <div id="hwTracingOpacityRow">
                ${num('scaffolding.tracingOpacity', 'Tracing opacity', { min: 0.05, max: 0.7, step: 0.05 })}
              </div>
              ${num('scaffolding.blankRowsBetween', 'Practice rows', { min: 1, max: 4, step: 1, title: 'Rows after each model line (alternating format).' })}
              ${chk('scaffolding.showLineNumbers', 'Line numbers')}
            </div>
            <div class="hw-warning-section" id="hwWarnings" hidden>
              <div class="overflow-warning" role="status"></div>
            </div>
          </div>
            </div>

            <div class="hw-stab-panel" role="tabpanel" data-panel="content">
          <div class="ws-settings-section">
            <div class="ws-section-title hw-section-title-row">
              <span>Content</span>
              <span class="hw-info-icon" id="hwContentHint" role="img" aria-label="Content help" tabindex="0" title=""></span>
            </div>
            <div class="ws-field hw-wide hw-stack" id="hwRefTitleRow">
              <label for="hw-refTitle">Box title</label>
              <textarea class="hw-text hw-ref-title-input" id="hw-refTitle" data-path="refTitle" maxlength="120" rows="3"></textarea>
            </div>
            <textarea aria-label="Worksheet content" id="hw-userContentText" data-path="userContentText" class="ws-textarea hw-textarea"
              placeholder="One item or sentence per line."></textarea>
            <div class="hw-dict-panel">
              <div class="hw-dict-actions">
                <label class="btn btn-secondary btn-sm hw-file-btn" for="hwDictFileInput" title="Load word list (.txt) or Dictionary Builder export (.csv)">
                  <i class="fas fa-folder-open"></i> Dictionary
                </label>
                <input type="file" id="hwDictFileInput" accept=".txt,.text,.csv" style="display:none;">
                <span class="tb-status status-msg info" id="hwDictStatus">No dictionary</span>
              </div>
              <input class="hw-word-search" type="text" id="hwWordSearch" placeholder="Search words...">
              <div class="hw-word-sel-header">
                <span>Word Selection <span id="hwWordSelCount">(0/0)</span></span>
                <div class="hw-word-sel-actions">
                  <button class="btn btn-ghost btn-sm" id="hwBtnSelAll">All</button>
                  <button class="btn btn-ghost btn-sm" id="hwBtnSelNone">None</button>
                </div>
              </div>
              <div class="hw-word-sel-list" id="hwWordSelList">
                <div class="hw-word-sel-empty">Load a dictionary to choose words.</div>
              </div>
            </div>
            <div class="ws-field" id="hwSeedRow" title="Same seed → same jumbled order.">
              <label for="hwSeed">Seed</label>
              <div class="hw-seed">
                <input class="tb-num" type="number" id="hwSeed" min="1" step="1">
                <button class="btn btn-ghost btn-sm" id="hwReshuffleBtn" title="New random order"><i class="fas fa-shuffle"></i></button>
              </div>
            </div>
          </div>
            </div>

            <div class="hw-stab-panel" role="tabpanel" data-panel="lines">
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
            </div>

            <div class="hw-stab-panel" role="tabpanel" data-panel="text">
          <div class="ws-settings-section">
            <div class="ws-section-title">Typography</div>
            ${sel('typography.fontFamily', 'Font', FONT_OPTIONS.map(f => [f, f]))}
            ${sel('typography.fontSizeMode', 'Size', [['auto', 'Fit to lines'], ['manual', 'Manual']])}
            ${num('typography.fontSizeFill', 'Fill (0.5–1)', { min: 0.5, max: 1, step: 0.01, title: 'How much of the writing zone the letters fill.' })}
            ${num('typography.fontSizePx', 'Font px', { min: 8, max: 200, step: 1 })}
            ${num('typography.baselineShiftPx', 'Baseline shift px', { min: -30, max: 30, step: 1, title: 'Nudge text up (−) or down (+).' })}
            ${num('typography.letterSpacingEm', 'Letter spacing (em)', { min: -0.05, max: 0.3, step: 0.01 })}
          </div>
            </div>

            <div class="hw-stab-panel" role="tabpanel" data-panel="layout">
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
            </div>

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
  wireTabs(container.querySelector('.hw-settings-pane'), {
    tabClass: 'hw-stab',
    panelClass: 'hw-stab-panel',
  });

  let state = freshState();
  let seed = state.seed ?? randomSeed();
  const dictionary = {
    allWords: [],
    selectedWords: [],
    appendedWords: new Set(),
    search: '',
  };

  const mountedRoot = container.querySelector('.tool-shell');
  mountedRoot.dataset.settingsManaged = 'true';
  let fileGeneration = 0;
  const $ = sel => container.querySelector(sel);
  const pagesEl = $('#hwPagesContainer');
  const pageCountEl = $('#hwPageCount');
  const warnSection = $('#hwWarnings');
  const warnEl = warnSection.querySelector('.overflow-warning');
  const tierEl = $('#hwTier');
  const seedEl = $('#hwSeed');
  const contentEl = $('#hw-userContentText');
  const bound = [...container.querySelectorAll('[data-path]')];

  const contentWords = text => String(text || '')
    .replace(/[,\|;]+/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(Boolean);

  const normalizeContentText = text => contentWords(text).join(' ');

  function setContentText(text) {
    state.userContentText = normalizeContentText(text);
    contentEl.value = state.userContentText;
  }

  function visibleDictionaryWords() {
    return dictionary.search
      ? dictionary.allWords.filter(word => word.includes(dictionary.search))
      : dictionary.allWords;
  }

  function updateDictionaryStatus(text, type = 'info') {
    const status = $('#hwDictStatus');
    if (!status) return;
    status.className = `tb-status status-msg ${type}`;
    status.textContent = text;
  }

  function renderWordSelection() {
    const list = $('#hwWordSelList');
    const count = $('#hwWordSelCount');
    if (count) count.textContent = `(${dictionary.selectedWords.length}/${dictionary.allWords.length})`;
    if (!list) return;

    if (!dictionary.allWords.length) {
      list.innerHTML = '<div class="hw-word-sel-empty">Load a dictionary to choose words.</div>';
      return;
    }

    const shown = visibleDictionaryWords();
    if (!shown.length) {
      list.innerHTML = '<div class="hw-word-sel-empty">No matches.</div>';
      return;
    }

    const selected = new Set(dictionary.selectedWords);
    list.innerHTML = shown.map(word => {
      const isSelected = selected.has(word);
      return `
        <div class="hw-word-sel-item${isSelected ? ' hw-word-selected' : ''}" data-word="${word}">
          <span class="hw-word-sel-word">${word}</span>
          ${isSelected
            ? `<button class="btn btn-ghost btn-sm hw-btn-remove-word" data-word="${word}" aria-label="Remove ${word}">&times;</button>`
            : `<button class="btn btn-ghost btn-sm hw-btn-add-word" data-word="${word}" aria-label="Add ${word}">+</button>`
          }
        </div>`;
    }).join('');
  }

  function appendDictionaryWords(words) {
    const selected = new Set(dictionary.selectedWords);
    const existing = new Set(contentWords(state.userContentText).map(w => w.toLowerCase()));
    const additions = [];

    for (const word of words) {
      selected.add(word);
      if (!existing.has(word)) {
        additions.push(word);
        dictionary.appendedWords.add(word);
        existing.add(word);
      }
    }

    dictionary.selectedWords = dictionary.allWords.filter(word => selected.has(word));
    if (additions.length) {
      setContentText([...contentWords(state.userContentText), ...additions].join(' '));
      scheduleRender();
    }
    updateDictionaryStatus(`${dictionary.selectedWords.length} selected`, dictionary.selectedWords.length ? 'success' : 'info');
    renderWordSelection();
  }

  function removeDictionaryWords(words) {
    const toRemove = new Set(words);
    dictionary.selectedWords = dictionary.selectedWords.filter(word => !toRemove.has(word));

    const appendedToRemove = new Set(words.filter(word => dictionary.appendedWords.has(word)));
    if (appendedToRemove.size) {
      setContentText(contentWords(state.userContentText).filter(word => !appendedToRemove.has(word.toLowerCase())).join(' '));
      appendedToRemove.forEach(word => dictionary.appendedWords.delete(word));
      scheduleRender();
    }

    updateDictionaryStatus(`${dictionary.selectedWords.length} selected`, dictionary.selectedWords.length ? 'success' : 'info');
    renderWordSelection();
  }

  // Word Practice owns its quarter-inch defaults; other formats retain their margins.
  function controlPath(path) {
    return state.exerciseFormat === 'word_practice' && /^layout\.(left|right|top|bottom)MarginInch$/.test(path)
      ? path.replace('layout.', 'wordPractice.margins.') : path;
  }

  function syncControls() {
    for (const el of bound) {
      const v = getPath(state, controlPath(el.dataset.path));
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
    const wp = fmt === 'word_practice';
    const seyes = g.gridType === 'seyes_french';
    $('#hwWordPracticeSection').hidden = !wp;
    setDisabled('wordPractice.lines', state.wordPractice.mode !== 'practice');
    setDisabled('wordPractice.lineGapPx', state.wordPractice.mode !== 'practice' || state.wordPractice.lines === 'all');
    const seyesOption = $('[data-path="geometry.gridType"] option[value="seyes_french"]');
    seyesOption.disabled = wp; seyesOption.hidden = wp;
    setDisabled('typography.baselineShiftPx', wp);
    setDisabled('layout.pictureBlockHeightPct', wp);
    setDisabled('layout.showLeftMarginVerticalLine', wp);
    const fontInput = $('[data-path="typography.fontSizePx"]');
    fontInput.max = wp ? '44' : '200';
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
    setDisabled('layout.leftMarginLineColor', wp || !state.layout.showLeftMarginVerticalLine);
    setDisabled('scaffolding.fadingMethod', fmt !== 'alternating');
    setDisabled('scaffolding.tracingOpacity', fmt !== 'alternating' || state.scaffolding.fadingMethod !== 'faded_tracing');
    setDisabled('scaffolding.blankRowsBetween', fmt !== 'alternating');
    $('#hwSeyesNote').hidden = !seyes;
    $('#hwSeedRow').hidden = fmt !== 'jumbled';
    $('#hwRefTitleRow').hidden = fmt === 'alternating' || wp;
    contentEl.disabled = wp && state.wordPractice.mode === 'practice' && state.wordPractice.lines === 'all';
    $('#hwScaffoldingSection').hidden = fmt !== 'alternating';
    $('#hwTracingOpacityRow').hidden = fmt !== 'alternating' || state.scaffolding.fadingMethod !== 'faded_tracing';
    $('#hwContentHint').title = {
      word_practice: 'Space, newline, comma or semicolon separated words, arranged left to right in three columns. Full page ignores the retained word list.',
      alternating: 'One word or sentence per line (or a single space-separated word line). Long lines wrap; each wrapped line gets its own model and practice rows.',
      top_box: 'Shown in a box on page 1 with light pipe separators; students copy it onto the lines below.',
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
      ensureFont(family).then(() => { if (_alive && mountedRoot.isConnected) scheduleRender(); });
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
    let value = readControl(el);
    if (value === null) return;
    if (path === 'userContentText' && e.type === 'change') {
      value = normalizeContentText(value);
      el.value = value;
    }

    if (path === 'exerciseFormat' && value === 'word_practice') {
      if (state.geometry.gridType === 'seyes_french') state.geometry.gridType = 'zaner_bloser';
      if (state.typography.fontSizeMode === 'auto') {state.typography.fontSizeMode = 'manual';state.typography.fontSizePx = 20;}
      state.typography.fontSizePx = Math.min(44,state.typography.fontSizePx);
    }
    if (path === 'exerciseFormat') {
      const prevDefault = REF_TITLE_DEFAULTS[state.exerciseFormat];
      if (state.refTitle === prevDefault) state.refTitle = REF_TITLE_DEFAULTS[value];
    }
    setPath(state, controlPath(path), value);

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

  on($('#hwDictFileInput'), 'change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const load = ++fileGeneration;
    try {
      const words = await loadDictionaryFromFile(file);
      if (!mountedRoot.isConnected || load !== fileGeneration) return;
      dictionary.allWords = words;
      dictionary.selectedWords = [];
      dictionary.appendedWords.clear();
      updateDictionaryStatus(words.length ? `${words.length} words loaded` : 'No valid words', words.length ? 'success' : 'error');
      renderWordSelection();
    } catch (err) {
      if (!mountedRoot.isConnected || load !== fileGeneration) return;
      dictionary.allWords = [];
      dictionary.selectedWords = [];
      dictionary.appendedWords.clear();
      updateDictionaryStatus(`Error: ${err.message}`, 'error');
      renderWordSelection();
    }
    e.target.value = '';
    workspace?.save();
  });

  on($('#hwWordSearch'), 'input', e => {
    dictionary.search = e.target.value.trim().toLowerCase();
    renderWordSelection();
  });

  on($('#hwBtnSelAll'), 'click', () => {
    appendDictionaryWords(visibleDictionaryWords());
  });

  on($('#hwBtnSelNone'), 'click', () => {
    removeDictionaryWords(visibleDictionaryWords());
  });

  on($('#hwWordSelList'), 'click', e => {
    const add = e.target.closest('.hw-btn-add-word');
    const remove = e.target.closest('.hw-btn-remove-word');
    if (!add && !remove) return;
    const word = (add || remove).dataset.word;
    if (add) appendDictionaryWords([word]);
    else removeDictionaryWords([word]);
  });

  on($('#hwResetBtn'), 'click', () => {
    state = freshState();
    seed = randomSeed();
    dictionary.selectedWords = [];
    dictionary.appendedWords.clear();
    updateDictionaryStatus(dictionary.allWords.length ? `${dictionary.allWords.length} words loaded` : 'No dictionary', dictionary.allWords.length ? 'success' : 'info');
    renderWordSelection();
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
  workspace = initWorkspacePersistence(mountedRoot, 'handwriting', {
    snapshot: () => ({state, seed, dictionary: {...dictionary, appendedWords: [...dictionary.appendedWords]}}),
    restore: saved => {
      if (!saved.state?.geometry || !Array.isArray(saved.dictionary?.allWords)) return;
      const defaults = freshState();
      state = {...defaults,...saved.state,wordPractice:{...defaults.wordPractice,...saved.state.wordPractice,margins:{...defaults.wordPractice.margins,...saved.state.wordPractice?.margins}}}; seed = saved.seed;
      Object.assign(dictionary,saved.dictionary,{appendedWords:new Set(saved.dictionary.appendedWords)});
      $('#hwWordSearch').value = dictionary.search;
      updateDictionaryStatus(dictionary.allWords.length+' words loaded (saved)','info');
      syncControls(); renderWordSelection(); render();
    },
  });
}
