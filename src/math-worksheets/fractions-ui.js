import {
  FRACTION_PRESETS,
  FRACTION_TYPES,
  applyRangePreset,
  capNoteFor,
  denominatorCapFor,
  generateFractionQuestions,
  normalizeFractionState,
} from './fractions-generator.js';
import { themeToggleMarkup } from '../shared/shell-ui.js';
import { printWorksheet } from '../shared/print.js';
import { exportWorksheetPdf } from '../shared/export-pdf.js';

const topicModules = import.meta.glob('./fractions/topics/*.json', { eager: true, import: 'default' });
const TOPICS = Object.values(topicModules)
  .filter(topic => topic?.topicId)
  .sort((a, b) => a.title.localeCompare(b.title));

let _fracListeners = [];

function on(el, evt, fn) {
  if (!el) return;
  el.addEventListener(evt, fn);
  _fracListeners.push({ el, evt, fn });
}

export function unmountFractions() {
  _fracListeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
  _fracListeners = [];
}

export function buildFractionsUI(container) {
  container.innerHTML = `
    <div class="frac-tool tool-shell">
      <div class="frac-toolbar tool-header tool-worksheet-header no-print">
        <div class="tool-header-main">
          <span class="tool-header-title">Fractions</span>
          <span class="tool-header-status tb-status status-msg info" id="fracStatus"></span>
        </div>
        <div class="tool-header-actions tool-worksheet-actions">
          <div class="tool-primary-actions">
            <button class="btn btn-primary btn-sm" id="fracGenerateBtn"><i class="fas fa-sync-alt"></i> Generate</button>
            <button class="btn btn-secondary btn-sm" id="fracPrintBtn"><i class="fas fa-print"></i> Print</button>
            <button class="btn btn-secondary btn-sm" id="fracExportBtn"><i class="fas fa-file-pdf"></i> Export</button>
            <span class="tool-action-separator" aria-hidden="true"></span>
            <button class="btn btn-ghost btn-sm" id="fracResetBtn"><i class="fas fa-undo-alt"></i> Reset</button>
          </div>
          <div class="tool-secondary-actions">
            <span class="tool-theme-slot">${themeToggleMarkup()}</span>
          </div>
        </div>
      </div>
      <div class="frac-body tool-body">
        <div class="frac-settings-pane tool-settings no-print">
          <div class="frac-settings-section">
            <div class="frac-section-title">Fractions Type</div>
            <div class="frac-field">
              <label for="fracSubType">Worksheet</label>
              <select class="tb-select" id="fracSubType">${typeOptions()}</select>
            </div>
          </div>
          <div class="frac-settings-section">
            <div class="frac-section-title">Range</div>
            <div class="frac-field">
              <label for="fracRangePreset">Preset</label>
              <select class="tb-select" id="fracRangePreset">${presetOptions()}</select>
            </div>
            <div class="frac-field"><label for="fracNumMin">Min numerator</label><input class="tb-num" type="number" id="fracNumMin" value="1"></div>
            <div class="frac-field"><label for="fracNumMax">Max numerator</label><input class="tb-num" type="number" id="fracNumMax" value="8"></div>
            <div class="frac-field"><label for="fracDenMin">Min denominator</label><input class="tb-num" type="number" id="fracDenMin" value="2"></div>
            <div class="frac-field"><label for="fracDenMax">Max denominator</label><input class="tb-num" type="number" id="fracDenMax" value="12"></div>
            <div class="frac-range-note" id="fracRangeNote"></div>
          </div>
          <div class="frac-settings-section">
            <div class="frac-section-title">Question Options</div>
            <div class="frac-field" id="fracShapeRow">
              <label for="fracShape">Visual shape</label>
              <select class="tb-select" id="fracShape"><option value="grid">Grid</option><option value="bar">Bar</option></select>
            </div>
            <div class="frac-field" id="fracModeRow">
              <label for="fracMode">Question mode</label>
              <select class="tb-select" id="fracMode"><option value="numerals">Numerals</option><option value="visual">Visual</option><option value="mixed">Mixed</option></select>
            </div>
            <div class="frac-field" id="fracDenomModeRow">
              <label for="fracDenomMode">Denominators</label>
              <select class="tb-select" id="fracDenomMode"><option value="unlike">Unlike</option><option value="same">Same</option></select>
            </div>
            <div class="frac-op-grid" id="fracOpsRow">
              <label class="op-chk"><input type="checkbox" id="fracOpAdd" checked><span class="op-sym add">+</span></label>
              <label class="op-chk"><input type="checkbox" id="fracOpSub"><span class="op-sym sub">-</span></label>
              <label class="op-chk"><input type="checkbox" id="fracOpMul"><span class="op-sym mul">&times;</span></label>
              <label class="op-chk"><input type="checkbox" id="fracOpDiv"><span class="op-sym div">&divide;</span></label>
            </div>
            <div class="frac-field" id="fracTopicRow">
              <label for="fracTopic">Topic</label>
              <select class="tb-select" id="fracTopic">${topicOptions()}</select>
            </div>
            <div class="frac-field" id="fracCurrencyRow">
              <label for="fracCurrency">Currency</label>
              <select class="tb-select" id="fracCurrency"><option value="inr">Rupee</option><option value="usd">Dollar</option></select>
            </div>
          </div>
          <div class="frac-settings-section">
            <div class="frac-section-title">Layout</div>
            <div class="frac-field"><label for="fracPages">Pages</label><input class="tb-num" type="number" id="fracPages" min="1" max="20" value="1"></div>
            <div class="frac-field"><label for="fracFontSize">Font size</label><select class="tb-select" id="fracFontSize"><option value="s">S</option><option value="m" selected>M</option><option value="l">L</option><option value="xl">XL</option></select></div>
            <div class="frac-field"><label for="fracWorkspace">Workspace</label><input type="checkbox" id="fracWorkspace" checked></div>
            <div class="frac-field"><label for="fracAnswers">Answer key</label><input type="checkbox" id="fracAnswers" checked></div>
          </div>
          <div class="frac-settings-section">
            <div class="frac-section-title">Reproducibility</div>
            <div class="frac-field">
              <label for="fracSeed">Random seed</label>
              <input class="frac-text-input" type="text" id="fracSeed" placeholder="optional">
            </div>
          </div>
        </div>
        <div class="frac-preview-pane tool-preview">
          <div class="tool-preview-scroll">
            <div id="fracWorksheetsContainer" class="tool-pages">
              <div class="empty-state"><i class="fas fa-divide"></i><p>Configure settings and click Generate.</p></div>
            </div>
          </div>
        </div>
        <div class="tool-info-pane" aria-hidden="true"></div>
      </div>
    </div>
  `;

  const c = sel => container.querySelector(sel);
  const els = {
    subType: c('#fracSubType'),
    rangePreset: c('#fracRangePreset'),
    numMin: c('#fracNumMin'),
    numMax: c('#fracNumMax'),
    denMin: c('#fracDenMin'),
    denMax: c('#fracDenMax'),
    rangeNote: c('#fracRangeNote'),
    shape: c('#fracShape'),
    mode: c('#fracMode'),
    denomMode: c('#fracDenomMode'),
    opAdd: c('#fracOpAdd'),
    opSub: c('#fracOpSub'),
    opMul: c('#fracOpMul'),
    opDiv: c('#fracOpDiv'),
    topic: c('#fracTopic'),
    currency: c('#fracCurrency'),
    pages: c('#fracPages'),
    fontSize: c('#fracFontSize'),
    workspace: c('#fracWorkspace'),
    answers: c('#fracAnswers'),
    seed: c('#fracSeed'),
    status: c('#fracStatus'),
    preview: c('#fracWorksheetsContainer'),
    generate: c('#fracGenerateBtn'),
    print: c('#fracPrintBtn'),
    export: c('#fracExportBtn'),
    reset: c('#fracResetBtn'),
    shapeRow: c('#fracShapeRow'),
    modeRow: c('#fracModeRow'),
    denomModeRow: c('#fracDenomModeRow'),
    opsRow: c('#fracOpsRow'),
    topicRow: c('#fracTopicRow'),
    currencyRow: c('#fracCurrencyRow'),
  };

  function readState() {
    return normalizeFractionState({
      subType: els.subType.value,
      rangePreset: els.rangePreset.value,
      numMin: els.numMin.value,
      numMax: els.numMax.value,
      denMin: els.denMin.value,
      denMax: els.denMax.value,
      shapePreference: els.shape.value,
      questionMode: els.mode.value,
      denomMode: els.denomMode.value,
      ops: {
        add: els.opAdd.checked,
        sub: els.opSub.checked,
        mul: els.opMul.checked,
        div: els.opDiv.checked,
      },
      wpTopic: els.topic.value,
      currency: els.currency.value,
      pages: els.pages.value,
      fontSize: els.fontSize.value,
      workspace: els.workspace.checked,
      includeAnswers: els.answers.checked,
      randomSeed: els.seed.value.trim(),
    });
  }

  function writeState(state) {
    els.subType.value = state.subType;
    els.rangePreset.value = state.rangePreset;
    els.numMin.value = state.numMin;
    els.numMax.value = state.numMax;
    els.denMin.value = state.denMin;
    els.denMax.value = state.denMax;
    els.shape.value = state.shapePreference;
    els.mode.value = state.questionMode;
    els.denomMode.value = state.denomMode;
    els.opAdd.checked = state.ops.add;
    els.opSub.checked = state.ops.sub;
    els.opMul.checked = state.ops.mul;
    els.opDiv.checked = state.ops.div;
    els.topic.value = state.wpTopic;
    els.currency.value = state.currency;
    els.pages.value = state.pages;
    els.fontSize.value = state.fontSize;
    els.workspace.checked = state.workspace;
    els.answers.checked = state.includeAnswers;
    els.seed.value = state.randomSeed;
    const locked = state.rangePreset !== 'custom';
    [els.numMin, els.numMax, els.denMin, els.denMax].forEach(el => { el.readOnly = locked; });
    const cap = denominatorCapFor(state.subType);
    els.denMin.max = String(cap);
    els.denMax.max = String(cap);
    els.rangeNote.textContent = capNoteFor(state.subType);
  }

  function updateConditional() {
    const state = readState();
    writeState(state);
    const visualType = ['identify', 'shade', 'compare'].includes(state.subType);
    const isCompare = state.subType === 'compare';
    const isOps = state.subType === 'operations' || state.subType === 'missing-operand';
    const isWord = state.subType === 'word-problems';
    els.shapeRow.classList.toggle('hidden', !visualType);
    els.modeRow.classList.toggle('hidden', !isCompare);
    els.denomModeRow.classList.toggle('hidden', !isOps);
    els.opsRow.classList.toggle('hidden', state.subType !== 'operations');
    els.topicRow.classList.toggle('hidden', !isWord);
    els.currencyRow.classList.toggle('hidden', !(isWord && state.wpTopic === 'money'));
  }

  function newPage(state, title, pageNumber) {
    const page = document.createElement('div');
    page.className = `frac-worksheet frac-font-${state.fontSize} frac-layout-${layoutModeFor(state)}`;
    page.innerHTML = `
      <div class="frac-ws-header">
        <div class="frac-ws-namedate">
          <span class="frac-name-line">${title}</span>
          <span class="frac-date-line">Date: ________________</span>
        </div>
        <div class="frac-ws-typelabel">${FRACTION_TYPES[state.subType]}${state.pages > 1 ? ` | Page ${pageNumber}` : ''}</div>
      </div>
      <div class="frac-ws-content"></div>`;
    return { page, content: page.querySelector('.frac-ws-content') };
  }

  function overflows(el) {
    const last = el.lastElementChild;
    if (!last) return false;
    const contentRect = el.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    const lastStyle = getComputedStyle(last);
    const margin = parseFloat(lastStyle.marginBottom) || 0;
    return lastRect.bottom + margin > contentRect.bottom - 4;
  }

  function questionNode(q, item, state) {
    const node = document.createElement('div');
    node.className = `frac-question frac-type-${state.subType}`;
    node.innerHTML = `<span class="frac-q-num">${q})</span><span class="frac-q-body">${item.html}${state.workspace ? '<span class="frac-workspace-line"></span>' : ''}</span>`;
    return node;
  }

  function answerKeyNode(entries) {
    const node = document.createElement('div');
    node.className = 'frac-answer-key';
    node.innerHTML = `<div class="frac-answer-key-title">Answer Key</div>
      <div class="frac-answer-key-grid">${entries.map((entry, idx) => `<div>${idx + 1}) ${entry.answer}</div>`).join('')}</div>`;
    return node;
  }

  function renderWorksheet() {
    const result = generateFractionQuestions(readState(), TOPICS);
    const state = result.state;
    writeState(state);
    updateConditional();

    els.preview.innerHTML = '';
    els.preview.style.visibility = 'hidden';
    els.preview.classList.add('frac-measuring');

    let questionIndex = 0;
    const answers = [];
    for (let pageIndex = 0; pageIndex < state.pages; pageIndex++) {
      const { page, content } = newPage(
        state,
        pageIndex === 0 ? 'Name: ____________________________________' : 'Continued',
        pageIndex + 1,
      );
      els.preview.appendChild(page);
      let placed = 0;
      while (questionIndex < result.questions.length) {
        const item = result.questions[questionIndex];
        const node = questionNode(questionIndex + 1, item, state);
        content.appendChild(node);
        if (overflows(content)) {
          if (placed === 0) {
            questionIndex++;
            answers.push(item);
            placed++;
            continue;
          }
          content.removeChild(node);
          break;
        }
        questionIndex++;
        answers.push(item);
        placed++;
      }
    }

    if (state.includeAnswers && answers.length) {
      const key = answerKeyNode(answers);
      const lastContent = els.preview.lastElementChild?.querySelector('.frac-ws-content');
      lastContent?.appendChild(key);
      if (lastContent && overflows(lastContent) && els.preview.children.length < 20) {
        lastContent.removeChild(key);
        const { page, content } = newPage(state, 'Answer Key', els.preview.children.length + 1);
        content.appendChild(key);
        els.preview.appendChild(page);
      }
    }

    els.preview.classList.remove('frac-measuring');
    els.preview.style.visibility = '';
    els.status.className = 'tb-status status-msg success';
    els.status.innerHTML = `<i class="fas fa-check-circle"></i> ${answers.length} questions`;
  }

  function reset() {
    writeState(normalizeFractionState({}));
    updateConditional();
    renderWorksheet();
  }

  on(els.rangePreset, 'change', () => {
    writeState(applyRangePreset(readState(), els.rangePreset.value));
    updateConditional();
  });
  [els.numMin, els.numMax, els.denMin, els.denMax].forEach(el => on(el, 'input', () => {
    els.rangePreset.value = 'custom';
    updateConditional();
  }));
  [
    els.subType, els.shape, els.mode, els.denomMode, els.opAdd, els.opSub,
    els.opMul, els.opDiv, els.topic, els.currency, els.pages, els.fontSize, els.workspace, els.answers,
  ].forEach(el => on(el, 'change', updateConditional));
  on(els.generate, 'click', renderWorksheet);
  on(els.print, 'click', printWorksheet);
  on(els.export, 'click', () => exportWorksheetPdf({ filenameBase: `fractions_${els.subType.value}` }));
  on(els.reset, 'click', reset);

  reset();
}

function typeOptions() {
  return Object.entries(FRACTION_TYPES)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');
}

function presetOptions() {
  return Object.entries(FRACTION_PRESETS)
    .map(([value, preset]) => `<option value="${value}"${value === 'grade5' ? ' selected' : ''}>${preset.label}</option>`)
    .join('');
}

function topicOptions() {
  return TOPICS.map(topic => `<option value="${topic.topicId}">${topic.title}</option>`).join('');
}

function layoutModeFor(state) {
  if (state.subType === 'word-problems') return 'wide';
  if (['identify', 'shade', 'compare', 'numberline'].includes(state.subType)) return 'two-col';
  return 'three-col';
}
