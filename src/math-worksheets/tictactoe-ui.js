import {
  DEFAULT_TTT_STATE,
  generateTicTacToeWorksheet,
  normalizeTicTacToeState,
} from './tictactoe-generator.js';
import { themeToggleMarkup } from '../shared/shell-ui.js';
import { printWorksheet } from '../shared/print.js';

let _tttListeners = [];

function on(el, evt, fn) {
  if (!el) return;
  el.addEventListener(evt, fn);
  _tttListeners.push({ el, evt, fn });
}

export function unmountTicTacToe() {
  _tttListeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
  _tttListeners = [];
}

export function buildTicTacToeUI(container) {
  container.innerHTML = `
    <div class="ttt-tool tool-shell">
      <div class="ttt-toolbar tool-header no-print">
        <div class="tool-header-main">
          <span class="tool-header-title">Math Tic-Tac-Toe</span>
          <span class="tool-header-status tb-status status-msg info" id="tttStatus"></span>
        </div>
        <div class="tool-header-actions">
            <button class="btn btn-primary btn-sm" id="tttGenerateBtn">
              <i class="fas fa-sync-alt"></i> Generate
            </button>
            <button class="btn btn-secondary btn-sm" id="tttPrintBtn">
              <i class="fas fa-print"></i> Print PDF
            </button>
            <button class="btn btn-ghost btn-sm" id="tttResetBtn">
              <i class="fas fa-undo-alt"></i> Reset
            </button>
            <span class="tool-theme-slot">${themeToggleMarkup()}</span>
        </div>
      </div>

      <div class="ttt-body tool-body">
        <div class="ttt-settings-pane tool-settings no-print">
          <div class="ttt-settings-section">
            <div class="ttt-section-title">Difficulty</div>
            <div class="ttt-field">
              <label for="tttDifficulty">Preset</label>
              <select class="tb-select" id="tttDifficulty" style="width:120px;">
                <option value="custom">Custom</option>                
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div class="ttt-settings-section" id="tttManualSection">
            <div class="ttt-section-title">Operations</div>
            <div class="ttt-op-grid">
              <label class="op-chk" title="Include addition">
                <input type="checkbox" id="tttAdd" checked>
                <span class="op-sym add">+</span>
              </label>
              <label class="op-chk" title="Include subtraction">
                <input type="checkbox" id="tttSub" checked>
                <span class="op-sym sub">-</span>
              </label>
              <label class="op-chk" title="Include multiplication">
                <input type="checkbox" id="tttMul">
                <span class="op-sym mul">&times;</span>
              </label>
              <label class="op-chk" title="Include division">
                <input type="checkbox" id="tttDiv">
                <span class="op-sym div">&divide;</span>
              </label>
            </div>

            <div class="ttt-section-subtitle">Numbers</div>
            <div class="ttt-field">
              <label for="tttMinDigits">Min digits</label>
              <input class="tb-num" type="number" id="tttMinDigits" min="1" max="6" value="3" style="width:52px;">
            </div>
            <div class="ttt-field">
              <label for="tttMaxDigits">Max digits</label>
              <input class="tb-num" type="number" id="tttMaxDigits" min="1" max="6" value="3" style="width:52px;">
            </div>
            <div class="ttt-field">
              <label for="tttOperands">Operands</label>
              <input class="tb-num" type="number" id="tttOperands" min="2" max="6" value="2" style="width:52px;">
            </div>
            <div class="ttt-field">
              <label for="tttMixedOps">Mixed operators</label>
              <input type="checkbox" id="tttMixedOps">
            </div>

            <div class="ttt-conditional" id="tttMultiplierRows">
              <div class="ttt-section-subtitle">Multipliers</div>
              <div class="ttt-field">
                <label for="tttMultiplierMinDigits">Min digits</label>
                <input class="tb-num" type="number" id="tttMultiplierMinDigits" min="1" max="6" value="1" style="width:52px;">
              </div>
              <div class="ttt-field">
                <label for="tttMultiplierMaxDigits">Max digits</label>
                <input class="tb-num" type="number" id="tttMultiplierMaxDigits" min="1" max="6" value="2" style="width:52px;">
              </div>
            </div>

            <div class="ttt-conditional" id="tttDivisorRows">
              <div class="ttt-section-subtitle">Divisors</div>
              <div class="ttt-field">
                <label for="tttDivisorMinDigits">Min digits</label>
                <input class="tb-num" type="number" id="tttDivisorMinDigits" min="1" max="6" value="1" style="width:52px;">
              </div>
              <div class="ttt-field">
                <label for="tttDivisorMaxDigits">Max digits</label>
                <input class="tb-num" type="number" id="tttDivisorMaxDigits" min="1" max="6" value="2" style="width:52px;">
              </div>
            </div>
          </div>

          <div class="ttt-settings-section">
            <div class="ttt-section-title">Layout</div>
            <div class="ttt-field">
              <label for="tttPages">Pages</label>
              <input class="tb-num" type="number" id="tttPages" min="1" max="10" value="1" style="width:52px;">
            </div>
            <div class="ttt-field">
              <label for="tttGamesPerPage">Games per page</label>
              <select class="tb-select" id="tttGamesPerPage" style="width:80px;">
                <option value="4">4</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </div>
          </div>

          <div class="ttt-settings-section">
            <div class="ttt-section-title">Reproducibility</div>
            <div class="ttt-field">
              <label for="tttSeed">Random seed</label>
              <input type="text" id="tttSeed" placeholder="optional"
                style="width:100px;font-size:12px;padding:3px 6px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text-primary);">
            </div>
          </div>
        </div>

        <div class="ttt-preview-pane tool-preview">
          <div class="tool-preview-scroll">
          <div id="tttWorksheetsContainer" class="tool-pages">
            <div class="empty-state">
              <i class="fas fa-border-all"></i>
              <p>Configure settings and click Generate.</p>
            </div>
          </div>
          </div>
        </div>

        <div class="tool-info-pane" aria-hidden="true"></div>
      </div>
    </div>
  `;

  const c = sel => container.querySelector(sel);

  const els = {
    difficulty: c('#tttDifficulty'),
    add: c('#tttAdd'),
    sub: c('#tttSub'),
    mul: c('#tttMul'),
    div: c('#tttDiv'),
    minDigits: c('#tttMinDigits'),
    maxDigits: c('#tttMaxDigits'),
    operands: c('#tttOperands'),
    mixedOps: c('#tttMixedOps'),
    multiplierMinDigits: c('#tttMultiplierMinDigits'),
    multiplierMaxDigits: c('#tttMultiplierMaxDigits'),
    divisorMinDigits: c('#tttDivisorMinDigits'),
    divisorMaxDigits: c('#tttDivisorMaxDigits'),
    pages: c('#tttPages'),
    gamesPerPage: c('#tttGamesPerPage'),
    seed: c('#tttSeed'),
    manualSection: c('#tttManualSection'),
    multiplierRows: c('#tttMultiplierRows'),
    divisorRows: c('#tttDivisorRows'),
    status: c('#tttStatus'),
    preview: c('#tttWorksheetsContainer'),
    generateBtn: c('#tttGenerateBtn'),
    printBtn: c('#tttPrintBtn'),
    resetBtn: c('#tttResetBtn'),
  };

  function readState() {
    return normalizeTicTacToeState({
      difficulty: els.difficulty.value,
      operations: {
        add: els.add.checked,
        sub: els.sub.checked,
        mul: els.mul.checked,
        div: els.div.checked,
      },
      minDigits: els.minDigits.value,
      maxDigits: els.maxDigits.value,
      numOperands: els.operands.value,
      multiOperator: els.mixedOps.checked,
      multiplierMinDigits: els.multiplierMinDigits.value,
      multiplierMaxDigits: els.multiplierMaxDigits.value,
      divisorMinDigits: els.divisorMinDigits.value,
      divisorMaxDigits: els.divisorMaxDigits.value,
      pages: els.pages.value,
      gamesPerPage: els.gamesPerPage.value,
      randomSeed: els.seed.value.trim(),
    });
  }

  function writeState(state) {
    els.difficulty.value = state.difficulty;
    els.add.checked = state.operations.add;
    els.sub.checked = state.operations.sub;
    els.mul.checked = state.operations.mul;
    els.div.checked = state.operations.div;
    els.minDigits.value = state.minDigits;
    els.maxDigits.value = state.maxDigits;
    els.operands.value = state.numOperands;
    els.mixedOps.checked = state.multiOperator;
    els.multiplierMinDigits.value = state.multiplierMinDigits;
    els.multiplierMaxDigits.value = state.multiplierMaxDigits;
    els.divisorMinDigits.value = state.divisorMinDigits;
    els.divisorMaxDigits.value = state.divisorMaxDigits;
    els.pages.value = state.pages;
    els.gamesPerPage.value = state.gamesPerPage;
    els.seed.value = state.randomSeed;
  }

  function updateConditional() {
    const state = readState();
    writeState(state);

    const presetLocked = state.difficulty !== 'custom';
    els.manualSection.classList.toggle('ttt-disabled-section', presetLocked);

    [
      els.add,
      els.sub,
      els.mul,
      els.div,
      els.minDigits,
      els.maxDigits,
      els.operands,
      els.mixedOps,
      els.multiplierMinDigits,
      els.multiplierMaxDigits,
      els.divisorMinDigits,
      els.divisorMaxDigits,
    ].forEach(el => { el.disabled = presetLocked; });

    els.multiplierRows.classList.toggle('hidden', !state.operations.mul);
    els.divisorRows.classList.toggle('hidden', !state.operations.div);
  }

  function renderProblem(problem) {
    const rows = problem.operands.map((operand, idx) => {
      const op = idx === 0 ? '' : problem.operators[idx - 1];
      return `
        <div class="ttt-problem-row">
          <span class="ttt-problem-op">${op}</span>
          <span class="ttt-problem-num">${operand}</span>
        </div>`;
    }).join('');

    return `
      <div class="ttt-problem" data-operands="${problem.operands.length}">
        ${rows}
        <div class="ttt-answer-line"></div>
      </div>`;
  }

  function renderWorksheet() {
    const result = generateTicTacToeWorksheet(readState());
    writeState(result.state);
    updateConditional();

    els.preview.innerHTML = '';

    result.pages.forEach((games) => {
      const page = document.createElement('div');
      page.className = `ttt-worksheet ttt-games-${result.state.gamesPerPage}`;
      page.innerHTML = `
        <div class="ttt-ws-header">
          <div class="ttt-ws-namedate">
            <span class="ttt-name-line">Name: ____________________________________</span>
            <span class="ttt-date-line">Date: ________________</span>
          </div>
          <div class="ttt-ws-typelabel">Math Tic-Tac-Toe</div>
        </div>
        <div class="ttt-games-layout"></div>`;

      const layout = page.querySelector('.ttt-games-layout');
      games.forEach((cells) => {
        const game = document.createElement('div');
        game.className = 'ttt-game';
        game.innerHTML = cells.map(problem => `
          <div class="ttt-cell">${renderProblem(problem)}</div>
        `).join('');
        layout.appendChild(game);
      });

      els.preview.appendChild(page);
    });

    els.status.className = 'tb-status status-msg success';
    els.status.innerHTML = `<i class="fas fa-check-circle"></i> ${result.problemCount} unique`;
  }

  function reset() {
    writeState({ ...DEFAULT_TTT_STATE, operations: { ...DEFAULT_TTT_STATE.operations } });
    updateConditional();
    renderWorksheet();
  }

  on(els.difficulty, 'change', updateConditional);
  [
    els.add,
    els.sub,
    els.mul,
    els.div,
    els.minDigits,
    els.maxDigits,
    els.operands,
    els.mixedOps,
    els.multiplierMinDigits,
    els.multiplierMaxDigits,
    els.divisorMinDigits,
    els.divisorMaxDigits,
    els.pages,
    els.gamesPerPage,
  ].forEach(el => on(el, 'change', updateConditional));

  on(els.generateBtn, 'click', renderWorksheet);
  on(els.printBtn, 'click', printWorksheet);
  on(els.resetBtn, 'click', reset);

  updateConditional();
  renderWorksheet();
}
