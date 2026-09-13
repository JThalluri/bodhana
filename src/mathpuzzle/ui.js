import { DEFAULTS } from '../math/generator.js';
import { DIFFICULTY_SETTINGS, generatePuzzle } from './generator.js';
import { renderPuzzles } from './renderer.js';

const DIFF_DEFAULTS = {
  easy:   { equations: DIFFICULTY_SETTINGS.easy.targetDefault },
  medium: { equations: DIFFICULTY_SETTINGS.medium.targetDefault },
  hard:   { equations: DIFFICULTY_SETTINGS.hard.targetDefault },
};

const state = {
  puzzles: [],
  showSolutions: false,
};

export function buildMathPuzzleUI(container) {
  container.innerHTML = `
    <div class="mp-tool">

      <!-- Toolbar -->
      <div class="mp-toolbar no-print">
        <div class="mp-tb-row">
          <span class="mw-typebar-label">Math Puzzle Grid</span>
          <span class="tb-vdiv"></span>
          <span class="tb-status status-msg info" id="mpStatus"></span>

          <div class="tb-actions" style="margin-left:auto;gap:6px;">
            <button class="btn btn-primary btn-sm" id="mpBtnGenerate">
              <i class="fas fa-sync-alt"></i> Generate
            </button>
            <button class="btn btn-secondary btn-sm" id="mpBtnPrint">
              <i class="fas fa-print"></i> Print
            </button>
            <button class="btn btn-ghost btn-sm" id="mpBtnReset">
              <i class="fas fa-undo-alt"></i> Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Two-pane body -->
      <div class="mp-body">

        <!-- Left: settings pane -->
        <div class="mp-settings-pane no-print">

          <div class="mp-settings-section">
            <div class="mp-section-title">Operations</div>

            <div class="mp-op-row">
              <label class="op-chk" title="Include Addition">
                <input type="checkbox" id="mpIncludeAdd" checked />
                <span class="op-sym add">+</span>
              </label>
              <span class="mp-range-group">
                <input class="tb-num mp-range-num" type="number" id="mpAddAmin" value="0" min="0" max="9999" />
                <span class="tb-sep">–</span>
                <input class="tb-num mp-range-num" type="number" id="mpAddAmax" value="9" min="0" max="9999" />
              </span>
              <span class="tb-op add-op">+</span>
              <span class="mp-range-group">
                <input class="tb-num mp-range-num" type="number" id="mpAddBmin" value="0" min="0" max="9999" />
                <span class="tb-sep">–</span>
                <input class="tb-num mp-range-num" type="number" id="mpAddBmax" value="9" min="0" max="9999" />
              </span>
            </div>

            <div class="mp-op-row">
              <label class="op-chk" title="Include Subtraction">
                <input type="checkbox" id="mpIncludeSub" checked />
                <span class="op-sym sub">−</span>
              </label>
              <span class="mp-range-group">
                <input class="tb-num mp-range-num" type="number" id="mpSubMmin" value="0" min="0" max="9999" />
                <span class="tb-sep">–</span>
                <input class="tb-num mp-range-num" type="number" id="mpSubMmax" value="20" min="0" max="9999" />
              </span>
              <span class="tb-op sub-op">−</span>
              <span class="mp-range-group">
                <input class="tb-num mp-range-num" type="number" id="mpSubSmin" value="0" min="0" max="9999" />
                <span class="tb-sep">–</span>
                <input class="tb-num mp-range-num" type="number" id="mpSubSmax" value="9" min="0" max="9999" />
              </span>
            </div>

            <div class="mp-op-row">
              <label class="op-chk" title="Include Multiplication">
                <input type="checkbox" id="mpIncludeMul" />
                <span class="op-sym mul">×</span>
              </label>
              <span class="mp-range-group">
                <input class="tb-num mp-range-num" type="number" id="mpMulAmin" value="0" min="0" max="9999" />
                <span class="tb-sep">–</span>
                <input class="tb-num mp-range-num" type="number" id="mpMulAmax" value="10" min="0" max="9999" />
              </span>
              <span class="tb-op mul-op">×</span>
              <span class="mp-range-group">
                <input class="tb-num mp-range-num" type="number" id="mpMulBmin" value="0" min="0" max="9999" />
                <span class="tb-sep">–</span>
                <input class="tb-num mp-range-num" type="number" id="mpMulBmax" value="10" min="0" max="9999" />
              </span>
            </div>

            <div class="mp-op-row">
              <label class="op-chk" title="Include Division">
                <input type="checkbox" id="mpIncludeDiv" />
                <span class="op-sym div">÷</span>
              </label>
              <span class="mp-range-group">
                <input class="tb-num mp-range-num" type="number" id="mpDivQmin" value="0" min="0" max="9999" />
                <span class="tb-sep">–</span>
                <input class="tb-num mp-range-num" type="number" id="mpDivQmax" value="10" min="0" max="9999" />
              </span>
              <span class="tb-op div-op">÷</span>
              <span class="mp-range-group">
                <input class="tb-num mp-range-num" type="number" id="mpDivDmin" value="1" min="1" max="9999" />
                <span class="tb-sep">–</span>
                <input class="tb-num mp-range-num" type="number" id="mpDivDmax" value="10" min="1" max="9999" />
              </span>
            </div>
          </div>

          <div class="mp-settings-section">
            <div class="mp-section-title">Puzzle Options</div>

            <div class="mp-field">
              <label for="mpDifficulty">Difficulty</label>
              <select class="tb-select" id="mpDifficulty">
                <option value="easy">Easy</option>
                <option value="medium" selected>Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div class="mp-field">
              <label for="mpPuzzleCount">Puzzles</label>
              <input class="tb-num" type="number" id="mpPuzzleCount" value="2" min="1" max="8" />
            </div>
            <div class="mp-field">
              <label for="mpEquations">Equations</label>
              <input class="tb-num" type="number" id="mpEquations" value="${DIFFICULTY_SETTINGS.medium.targetDefault}" min="1" max="40" />
            </div>
          </div>

          <div class="mp-settings-section">
            <div class="mp-section-title">Answers</div>

            <div class="mp-field">
              <label for="mpShowSolutions">Show solutions</label>
              <label class="toggle-switch toggle-sm" for="mpShowSolutions">
                <input type="checkbox" id="mpShowSolutions" />
                <span class="toggle-track"></span>
              </label>
            </div>
          </div>

        </div>

        <!-- Right: rendered pages -->
        <div class="mp-output" id="mpOutput">
          <div class="empty-state" id="mpEmptyState">
            <i class="fas fa-hashtag"></i>
            <p>Click <strong>Generate</strong> to create math puzzles.</p>
          </div>
          <div id="mpPuzzlesContainer"></div>
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
  const sel = id => document.getElementById(id)?.value ?? '';
  return {
    addAmin: n('mpAddAmin', 0), addAmax: n('mpAddAmax', 9),
    addBmin: n('mpAddBmin', 0), addBmax: n('mpAddBmax', 9),
    subMmin: n('mpSubMmin', 0), subMmax: n('mpSubMmax', 20),
    subSmin: n('mpSubSmin', 0), subSmax: n('mpSubSmax', 9),
    mulAmin: n('mpMulAmin', 0), mulAmax: n('mpMulAmax', 10),
    mulBmin: n('mpMulBmin', 0), mulBmax: n('mpMulBmax', 10),
    divQmin: n('mpDivQmin', 0), divQmax: n('mpDivQmax', 10),
    divDmin: n('mpDivDmin', 1), divDmax: n('mpDivDmax', 10),
    includeAdd: chk('mpIncludeAdd'), includeSub: chk('mpIncludeSub'),
    includeMul: chk('mpIncludeMul'), includeDiv: chk('mpIncludeDiv'),
    difficulty: sel('mpDifficulty') || 'medium',
  };
}

function runGenerate() {
  const config = readConfig();
  const status = document.getElementById('mpStatus');
  const count = parseInt(document.getElementById('mpPuzzleCount')?.value ?? '2', 10) || 2;
  const equations = parseInt(document.getElementById('mpEquations')?.value ?? '18', 10) || 18;

  const hasOp = config.includeAdd || config.includeSub || config.includeMul || config.includeDiv;
  if (!hasOp) {
    if (status) { status.className = 'tb-status status-msg error'; status.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Choose at least one operation.'; }
    return;
  }

  const puzzles = [];
  for (let i = 0; i < Math.min(8, Math.max(1, count)); i++) {
    const p = generatePuzzle(config, equations);
    puzzles.push(p);
  }

  state.puzzles = puzzles;
  state.showSolutions = false;
  const solEl = document.getElementById('mpShowSolutions');
  if (solEl) solEl.checked = false;

  doRender();

  const validPuzzles = puzzles.filter(Boolean);
  if (status) {
    if (validPuzzles.length === 0) {
      status.className = 'tb-status status-msg error';
      status.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No equations match these ranges.';
    } else {
      const placed = validPuzzles.reduce((s, p) => s + (p.equationCount ?? 0), 0);
      status.className = 'tb-status status-msg success';
      status.innerHTML = `<i class="fas fa-check-circle"></i> ${validPuzzles.length} puzzle${validPuzzles.length > 1 ? 's' : ''} · ${Math.round(placed / validPuzzles.length)} eq avg`;
    }
  }
}

function doRender() {
  const container = document.getElementById('mpPuzzlesContainer');
  const empty = document.getElementById('mpEmptyState');
  if (!container) return;

  const valid = state.puzzles.filter(Boolean);
  if (!valid.length) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }

  if (empty) empty.style.display = 'none';
  container.innerHTML = renderPuzzles(valid, { showSolutions: state.showSolutions });
}

function runReset() {
  const d = DEFAULTS;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  const chk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = v; };

  set('mpAddAmin', d.addAmin); set('mpAddAmax', d.addAmax);
  set('mpAddBmin', d.addBmin); set('mpAddBmax', d.addBmax);
  set('mpSubMmin', d.subMmin); set('mpSubMmax', d.subMmax);
  set('mpSubSmin', d.subSmin); set('mpSubSmax', d.subSmax);
  set('mpMulAmin', d.mulAmin); set('mpMulAmax', d.mulAmax);
  set('mpMulBmin', d.mulBmin); set('mpMulBmax', d.mulBmax);
  set('mpDivQmin', d.divQmin); set('mpDivQmax', d.divQmax);
  set('mpDivDmin', d.divDmin); set('mpDivDmax', d.divDmax);
  chk('mpIncludeAdd', d.includeAdd); chk('mpIncludeSub', d.includeSub);
  chk('mpIncludeMul', d.includeMul); chk('mpIncludeDiv', d.includeDiv);

  const diffEl = document.getElementById('mpDifficulty');
  if (diffEl) diffEl.value = 'medium';
  set('mpPuzzleCount', 2);
  set('mpEquations', DIFFICULTY_SETTINGS.medium.targetDefault);

  runGenerate();
}

function wireEvents() {
  document.getElementById('mpBtnGenerate')?.addEventListener('click', runGenerate);
  document.getElementById('mpBtnPrint')?.addEventListener('click', () => window.print());
  document.getElementById('mpBtnReset')?.addEventListener('click', runReset);

  document.getElementById('mpDifficulty')?.addEventListener('change', (e) => {
    const eqInput = document.getElementById('mpEquations');
    if (eqInput) eqInput.value = DIFF_DEFAULTS[e.target.value]?.equations ?? 18;
    runGenerate();
  });

  ['mpIncludeAdd', 'mpIncludeSub', 'mpIncludeMul', 'mpIncludeDiv'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', runGenerate);
  });

  document.getElementById('mpShowSolutions')?.addEventListener('change', (e) => {
    state.showSolutions = e.target.checked;
    if (state.puzzles.filter(Boolean).length) doRender();
  });

  document.addEventListener('keydown', handleKeydown);
}

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runGenerate();
  }
}

export function unmount() {
  document.removeEventListener('keydown', handleKeydown);
  state.puzzles = [];
  state.showSolutions = false;
}
