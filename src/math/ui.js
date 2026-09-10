import { generate, DEFAULTS } from './generator.js';
import { renderPapers } from './renderer.js';

export function buildUI(container) {
  container.innerHTML = `
    <div class="math-tool">

      <!-- Compact single-row sticky toolbar -->
      <div class="math-toolbar no-print">
        <div class="math-tb-row">

          <!-- 4 operation range pills -->
          <div class="op-ranges">
            <div class="op-pill">
              <span class="op-tag add-tag"><i class="fas fa-plus-circle"></i> Add</span>
              <input class="tb-num" type="number" id="addAmin" value="0" min="0" />
              <span class="tb-sep">–</span>
              <input class="tb-num" type="number" id="addAmax" value="9" min="0" />
              <span class="tb-op add-op">+</span>
              <input class="tb-num" type="number" id="addBmin" value="0" min="0" />
              <span class="tb-sep">–</span>
              <input class="tb-num" type="number" id="addBmax" value="9" min="0" />
            </div>

            <div class="op-pill">
              <span class="op-tag sub-tag"><i class="fas fa-minus-circle"></i> Sub</span>
              <input class="tb-num" type="number" id="subMmin" value="0" min="0" />
              <span class="tb-sep">–</span>
              <input class="tb-num" type="number" id="subMmax" value="20" min="0" />
              <span class="tb-op sub-op">−</span>
              <input class="tb-num" type="number" id="subSmin" value="0" min="0" />
              <span class="tb-sep">–</span>
              <input class="tb-num" type="number" id="subSmax" value="9" min="0" />
            </div>

            <div class="op-pill">
              <span class="op-tag mul-tag"><i class="fas fa-times-circle"></i> Mul</span>
              <input class="tb-num" type="number" id="mulAmin" value="0" min="0" />
              <span class="tb-sep">–</span>
              <input class="tb-num" type="number" id="mulAmax" value="10" min="0" />
              <span class="tb-op mul-op">×</span>
              <input class="tb-num" type="number" id="mulBmin" value="0" min="0" />
              <span class="tb-sep">–</span>
              <input class="tb-num" type="number" id="mulBmax" value="10" min="0" />
            </div>

            <div class="op-pill">
              <span class="op-tag div-tag"><i class="fas fa-divide"></i> Div</span>
              <input class="tb-num" type="number" id="divQmin" value="0" min="0" />
              <span class="tb-sep">–</span>
              <input class="tb-num" type="number" id="divQmax" value="10" min="0" />
              <span class="tb-op div-op">÷</span>
              <input class="tb-num" type="number" id="divDmin" value="1" min="1" />
              <span class="tb-sep">–</span>
              <input class="tb-num" type="number" id="divDmax" value="10" min="1" />
            </div>
          </div>

          <span class="tb-vdiv"></span>

          <!-- Op toggles -->
          <div class="op-checks">
            <label class="op-chk"><input type="checkbox" id="includeAdd" checked /><span class="op-sym add">+</span></label>
            <label class="op-chk"><input type="checkbox" id="includeSub" checked /><span class="op-sym sub">−</span></label>
            <label class="op-chk"><input type="checkbox" id="includeMul" /><span class="op-sym mul">×</span></label>
            <label class="op-chk"><input type="checkbox" id="includeDiv" /><span class="op-sym div">÷</span></label>
          </div>

          <span class="tb-vdiv"></span>

          <!-- Mode + counts -->
          <div class="tb-counts">
            <select class="tb-select" id="questionMode">
              <option value="mix">Mix</option>
              <option value="single">Single</option>
            </select>
            <label class="tb-count-lbl">Papers
              <input class="tb-num" type="number" id="numPapers" value="8" min="1" max="20" />
            </label>
            <label class="tb-count-lbl">Q
              <input class="tb-num" type="number" id="qPerPaper" value="50" min="1" max="100" />
            </label>
          </div>

          <span class="tb-vdiv"></span>

          <!-- Actions -->
          <div class="tb-actions">
            <button class="btn btn-primary btn-sm" id="mathGenerateBtn">
              <i class="fas fa-sync-alt"></i> Generate
            </button>
            <button class="btn btn-secondary btn-sm" id="mathPrintBtn">
              <i class="fas fa-print"></i> Print
            </button>
            <button class="btn btn-ghost btn-sm" id="mathResetBtn">
              <i class="fas fa-undo-alt"></i> Reset
            </button>
          </div>

          <!-- Status -->
          <div id="mathStatus" class="tb-status status-msg info"></div>

        </div>
      </div>

      <!-- Papers output -->
      <div class="math-papers-wrap">
        <div id="mathPapersContainer" class="math-papers">
          <div class="empty-state">
            <i class="fas fa-list-ol"></i>
            <p>Configure options above and click Generate.</p>
          </div>
        </div>
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
    mulAmin: n('mulAmin', 0), mulAmax: n('mulAmax', 10),
    mulBmin: n('mulBmin', 0), mulBmax: n('mulBmax', 10),
    divQmin: n('divQmin', 0), divQmax: n('divQmax', 10),
    divDmin: n('divDmin', 1), divDmax: n('divDmax', 10),
    includeAdd: chk('includeAdd'), includeSub: chk('includeSub'),
    includeMul: chk('includeMul'), includeDiv: chk('includeDiv'),
    questionMode: document.getElementById('questionMode')?.value ?? 'mix',
    numPapers: n('numPapers', 8),
    qPerPaper: n('qPerPaper', 50),
  };
}

function runGenerate() {
  const config = readConfig();
  const result = generate(config);
  const status = document.getElementById('mathStatus');
  const out = document.getElementById('mathPapersContainer');

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
  document.getElementById('mathPrintBtn')?.addEventListener('click', () => window.print());
  document.getElementById('mathResetBtn')?.addEventListener('click', runReset);
  ['includeAdd', 'includeSub', 'includeMul', 'includeDiv', 'questionMode'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', runGenerate);
  });
}
