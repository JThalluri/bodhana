import { DIFFICULTY_SETTINGS, generatePuzzle } from './generator.js';
import { renderPuzzles } from './renderer.js';
import { readInt } from '../shared/utils.js';

const state = {
  puzzles: [],
  showSolutions: false,
};

export function buildSudokuUI(container) {
  container.innerHTML = `
    <div class="sdk-tool">

      <!-- Compact sticky toolbar -->
      <div class="sdk-toolbar no-print">
        <div class="sdk-tb-row">

          <!-- Puzzle settings -->
          <div class="wp-tb-group">
            <span class="wp-tb-grouplabel">Puzzle</span>
            <select class="tb-select" id="sdkDifficulty" title="Difficulty">
              <option value="easy">Easy</option>
              <option value="medium" selected>Medium</option>
              <option value="hard">Hard</option>
            </select>
            <label class="tb-count-lbl">Puzzles
              <input class="tb-num" type="number" id="sdkPuzzleCount" value="2" min="1" max="8" />
            </label>
          </div>

          <span class="tb-vdiv"></span>

          <!-- Style settings -->
          <div class="wp-tb-group">
            <span class="wp-tb-grouplabel">Style</span>
            <select class="tb-select" id="sdkFontFamily" title="Font" style="min-width:110px;">
              <option value="'Nunito', sans-serif">Nunito</option>
              <option value="'Comic Sans MS', cursive">Comic Sans</option>
              <option value="'Fredoka One', cursive">Fredoka</option>
              <option value="'Patrick Hand', cursive">Patrick Hand</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="Arial, sans-serif">Arial</option>
            </select>
            <label class="tb-count-lbl" title="Font size (px)">Size
              <input class="tb-num" type="number" id="sdkFontSize" value="20" min="10" max="36" />
            </label>
            <label class="tb-count-lbl" title="Cell padding (px)">Pad
              <input class="tb-num" type="number" id="sdkCellPadding" value="12" min="4" max="28" />
            </label>
          </div>

          <span class="tb-vdiv"></span>

          <!-- Solutions toggle -->
          <label class="mp-sol-toggle" title="Show solutions">
            <span class="toggle-switch" style="width:32px;height:18px;">
              <input type="checkbox" id="sdkShowSolutions" />
              <span class="toggle-track"></span>
            </span>
            <span class="tb-count-lbl" style="color:var(--text-secondary)">
              <i class="fas fa-eye"></i> Solutions
            </span>
          </label>

          <span class="tb-vdiv"></span>

          <!-- Actions -->
          <div class="tb-actions">
            <button class="btn btn-primary btn-sm" id="sdkBtnGenerate">
              <i class="fas fa-sync-alt"></i> Generate
            </button>
            <button class="btn btn-secondary btn-sm" id="sdkBtnPrint">
              <i class="fas fa-print"></i> Print
            </button>
            <button class="btn btn-ghost btn-sm" id="sdkBtnReset">
              <i class="fas fa-undo-alt"></i> Reset
            </button>
          </div>

          <span class="tb-status status-msg info" id="sdkStatus"></span>
        </div>
      </div>

      <!-- Output -->
      <div class="sdk-output" id="sdkOutput">
        <div class="empty-state" id="sdkEmptyState">
          <i class="fas fa-th"></i>
          <p>Click <strong>Generate</strong> to create Sudoku puzzles.</p>
        </div>
        <div id="sdkPuzzlesContainer"></div>
      </div>

    </div>
  `;

  wireEvents();
  runGenerate();
}

function readConfig() {
  const sel = id => document.getElementById(id)?.value ?? '';
  return {
    difficulty:  sel('sdkDifficulty') || 'medium',
    count:       Math.min(8, Math.max(1, readInt('sdkPuzzleCount', 2))),
    fontFamily:  sel('sdkFontFamily') || "'Nunito', sans-serif",
    fontSize:    readInt('sdkFontSize', 20),
    cellPadding: readInt('sdkCellPadding', 12),
  };
}

function runGenerate() {
  const config = readConfig();
  const status = document.getElementById('sdkStatus');

  if (status) {
    status.className = 'tb-status status-msg info';
    status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating&hellip;';
  }

  // Defer so the spinner renders before heavy backtracking work
  setTimeout(() => {
    const puzzles = [];
    for (let i = 0; i < config.count; i++) {
      puzzles.push(generatePuzzle(config.difficulty));
    }

    state.puzzles = puzzles;
    state.showSolutions = false;
    const solEl = document.getElementById('sdkShowSolutions');
    if (solEl) solEl.checked = false;

    doRender(config);

    if (status) {
      const diff = DIFFICULTY_SETTINGS[config.difficulty];
      const blanks = 81 - diff.clues;
      status.className = 'tb-status status-msg success';
      status.innerHTML = `<i class="fas fa-check-circle"></i> ${puzzles.length} puzzle${puzzles.length > 1 ? 's' : ''} &middot; ${blanks} blanks`;
    }
  }, 0);
}

function doRender(cfg) {
  const config = cfg ?? readConfig();
  const container = document.getElementById('sdkPuzzlesContainer');
  const empty = document.getElementById('sdkEmptyState');
  if (!container) return;

  if (!state.puzzles.length) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }

  if (empty) empty.style.display = 'none';
  container.innerHTML = renderPuzzles(state.puzzles, {
    showSolutions: state.showSolutions,
    fontFamily:    config.fontFamily,
    fontSize:      config.fontSize,
    cellPadding:   config.cellPadding,
  });
}

function runReset() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('sdkDifficulty',  'medium');
  set('sdkPuzzleCount', 2);
  set('sdkFontFamily',  "'Nunito', sans-serif");
  set('sdkFontSize',    20);
  set('sdkCellPadding', 12);
  runGenerate();
}

function wireEvents() {
  document.getElementById('sdkBtnGenerate')?.addEventListener('click', runGenerate);
  document.getElementById('sdkBtnPrint')?.addEventListener('click', () => window.print());
  document.getElementById('sdkBtnReset')?.addEventListener('click', runReset);

  document.getElementById('sdkShowSolutions')?.addEventListener('change', (e) => {
    state.showSolutions = e.target.checked;
    if (state.puzzles.length) doRender();
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
