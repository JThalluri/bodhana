import { generate, DEFAULTS } from './generator.js';
import { renderPapers } from './renderer.js';
import { themeToggleMarkup } from '../shared/shell-ui.js';
import { printWorksheet } from '../shared/print.js';
import { exportWorksheetPdf } from '../shared/export-pdf.js';
import './math.css';

export function buildUI(container) {
  container.innerHTML = `
    <div class="math-tool tool-shell">

      <div class="math-toolbar tool-header no-print">
        <div class="tool-header-main">
          <span class="tool-header-title">Arithmetic Tests</span>
          <span class="tool-header-status tb-status status-msg info" id="mathStatus"></span>
        </div>
        <div class="tool-header-actions">
            <button class="btn btn-primary btn-sm" id="mathGenerateBtn">
              <i class="fas fa-sync-alt"></i> Generate
            </button>
            <button class="btn btn-secondary btn-sm" id="mathPrintBtn">
              <i class="fas fa-print"></i> Print PDF
            </button>
            <button class="btn btn-secondary btn-sm" id="mathExportBtn">
              <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button class="btn btn-ghost btn-sm" id="mathResetBtn">
              <i class="fas fa-undo-alt"></i> Reset
            </button>
            <span class="tool-theme-slot">${themeToggleMarkup()}</span>
        </div>
      </div>

      <div class="math-body tool-body">

      <!-- Left: settings pane -->
      <div class="math-settings-pane tool-settings no-print">

        <div class="math-settings-section">
          <div class="math-section-title">Operations &amp; Ranges</div>

          <div class="math-op-row">
            <label class="op-chk" title="Include Addition">
              <input type="checkbox" id="includeAdd" checked>
              <span class="op-sym add">+</span>
            </label>
            <span class="math-range-group">
              <input class="tb-num math-range-num" type="number" id="addAmin" value="8" min="0" max="9999" />
              <span class="tb-sep">–</span>
              <input class="tb-num math-range-num" type="number" id="addAmax" value="30" min="0" max="9999" />
            </span>
            <span class="tb-op add-op">+</span>
            <span class="math-range-group">
              <input class="tb-num math-range-num" type="number" id="addBmin" value="7" min="0" max="9999" />
              <span class="tb-sep">–</span>
              <input class="tb-num math-range-num" type="number" id="addBmax" value="19" min="0" max="9999" />
            </span>
          </div>

          <div class="math-op-row">
            <label class="op-chk" title="Include Subtraction">
              <input type="checkbox" id="includeSub" checked>
              <span class="op-sym sub">−</span>
            </label>
            <span class="math-range-group">
              <input class="tb-num math-range-num" type="number" id="subMmin" value="9" min="0" max="9999" />
              <span class="tb-sep">–</span>
              <input class="tb-num math-range-num" type="number" id="subMmax" value="20" min="0" max="9999" />
            </span>
            <span class="tb-op sub-op">−</span>
            <span class="math-range-group">
              <input class="tb-num math-range-num" type="number" id="subSmin" value="7" min="0" max="9999" />
              <span class="tb-sep">–</span>
              <input class="tb-num math-range-num" type="number" id="subSmax" value="19" min="0" max="9999" />
            </span>
          </div>

          <div class="math-subopt-row">
            <label for="subMinDiff" title="Exclude subtraction questions whose answer is smaller than this. Stops trivial pairs like 8 − 8 and 8 − 7.">Min difference</label>
            <input class="tb-num" type="number" id="subMinDiff" value="6" min="0" max="9999" style="width:52px;" />
          </div>

          <div class="math-op-row">
            <label class="op-chk" title="Include Multiplication">
              <input type="checkbox" id="includeMul">
              <span class="op-sym mul">×</span>
            </label>
            <span class="math-range-group">
              <input class="tb-num math-range-num" type="number" id="mulAmin" value="0" min="0" max="9999" />
              <span class="tb-sep">–</span>
              <input class="tb-num math-range-num" type="number" id="mulAmax" value="10" min="0" max="9999" />
            </span>
            <span class="tb-op mul-op">×</span>
            <span class="math-range-group">
              <input class="tb-num math-range-num" type="number" id="mulBmin" value="0" min="0" max="9999" />
              <span class="tb-sep">–</span>
              <input class="tb-num math-range-num" type="number" id="mulBmax" value="10" min="0" max="9999" />
            </span>
          </div>

          <div class="math-op-row">
            <label class="op-chk" title="Include Division">
              <input type="checkbox" id="includeDiv">
              <span class="op-sym div">÷</span>
            </label>
            <span class="math-range-group">
              <input class="tb-num math-range-num" type="number" id="divQmin" value="0" min="0" max="9999" />
              <span class="tb-sep">–</span>
              <input class="tb-num math-range-num" type="number" id="divQmax" value="10" min="0" max="9999" />
            </span>
            <span class="tb-op div-op">÷</span>
            <span class="math-range-group">
              <input class="tb-num math-range-num" type="number" id="divDmin" value="1" min="1" max="9999" />
              <span class="tb-sep">–</span>
              <input class="tb-num math-range-num" type="number" id="divDmax" value="10" min="1" max="9999" />
            </span>
          </div>
        </div>

        <div class="math-settings-section">
          <div class="math-section-title">Options</div>

          <div class="math-opt-field">
            <label for="questionMode">Mode</label>
            <select class="tb-select" id="questionMode" style="width:80px;">
              <option value="mix">Mix</option>
              <option value="single">Single</option>
            </select>
          </div>
          <div class="math-opt-field">
            <label for="numPapers">Papers</label>
            <input class="tb-num" type="number" id="numPapers" value="2" min="1" max="20" style="width:52px;">
          </div>
          <div class="math-opt-field">
            <label for="qPerPaper">Questions per paper</label>
            <input class="tb-num" type="number" id="qPerPaper" value="51" min="1" max="100" style="width:52px;">
          </div>
        </div>

      </div>

      <!-- Right: papers output -->
      <div class="math-papers-pane tool-preview">
        <div class="tool-preview-scroll">
        <div id="mathPapersContainer" class="math-papers tool-pages">
          <div class="empty-state">
            <i class="fas fa-list-ol"></i>
            <p>Configure options and click Generate.</p>
          </div>
        </div>
        </div>
      </div>

      <div class="tool-info-pane" aria-hidden="true"></div>

      </div>

    </div>
  `;

  wireEvents();
  runGenerate();
}

function readConfig() {
  const n = (id, fb) => {
    const v = parseInt(document.getElementById(id)?.value ?? '', 10);
    return isNaN(v) ? fb : v;
  };
  const chk = id => document.getElementById(id)?.checked ?? false;
  return {
    addAmin: n('addAmin', 0), addAmax: n('addAmax', 9),
    addBmin: n('addBmin', 0), addBmax: n('addBmax', 9),
    subMmin: n('subMmin', 0), subMmax: n('subMmax', 20),
    subSmin: n('subSmin', 0), subSmax: n('subSmax', 9),
    subMinDiff: n('subMinDiff', 2),
    mulAmin: n('mulAmin', 0), mulAmax: n('mulAmax', 10),
    mulBmin: n('mulBmin', 0), mulBmax: n('mulBmax', 10),
    divQmin: n('divQmin', 0), divQmax: n('divQmax', 10),
    divDmin: n('divDmin', 1), divDmax: n('divDmax', 10),
    includeAdd: chk('includeAdd'), includeSub: chk('includeSub'),
    includeMul: chk('includeMul'), includeDiv: chk('includeDiv'),
    questionMode: document.getElementById('questionMode')?.value ?? 'mix',
    numPapers: n('numPapers', 8),
    qPerPaper: n('qPerPaper', 51),
  };
}

function runGenerate() {
  const config = readConfig();
  const result = generate(config);
  const status = document.getElementById('mathStatus');
  const out    = document.getElementById('mathPapersContainer');

  if (!result) {
    if (status) { status.className = 'tb-status status-msg error'; status.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Choose at least one operation.'; }
    out.innerHTML = `<div class="empty-state"><i class="fas fa-list-ol"></i><p>Select an operation above.</p></div>`;
    return;
  }

  const { combined, papers, questionCount, paperCount } = result;
  if (status) {
    status.className = 'tb-status status-msg success';
    status.innerHTML = `<i class="fas fa-check-circle"></i> ${combined.length} unique &middot; ${paperCount} &times; ${questionCount}`;
  }
  out.innerHTML = renderPapers(papers, questionCount);
}

function runReset() {
  const d = DEFAULTS;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  const chk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = v; };

  set('addAmin', d.addAmin); set('addAmax', d.addAmax);
  set('addBmin', d.addBmin); set('addBmax', d.addBmax);
  set('subMmin', d.subMmin); set('subMmax', d.subMmax);
  set('subSmin', d.subSmin); set('subSmax', d.subSmax);
  set('subMinDiff', d.subMinDiff);
  set('mulAmin', d.mulAmin); set('mulAmax', d.mulAmax);
  set('mulBmin', d.mulBmin); set('mulBmax', d.mulBmax);
  set('divQmin', d.divQmin); set('divQmax', d.divQmax);
  set('divDmin', d.divDmin); set('divDmax', d.divDmax);
  set('numPapers', d.numPapers); set('qPerPaper', d.qPerPaper);
  chk('includeAdd', d.includeAdd); chk('includeSub', d.includeSub);
  chk('includeMul', d.includeMul); chk('includeDiv', d.includeDiv);
  const mode = document.getElementById('questionMode');
  if (mode) mode.value = d.questionMode;
  runGenerate();
}

function wireEvents() {
  document.getElementById('mathGenerateBtn')?.addEventListener('click', runGenerate);
  document.getElementById('mathPrintBtn')?.addEventListener('click', printWorksheet);
  document.getElementById('mathExportBtn')?.addEventListener('click', () => exportWorksheetPdf({ filenameBase: 'arithmetic_tests' }));
  document.getElementById('mathResetBtn')?.addEventListener('click', runReset);
  ['includeAdd', 'includeSub', 'includeMul', 'includeDiv', 'questionMode', 'subMinDiff'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', runGenerate);
  });
}
