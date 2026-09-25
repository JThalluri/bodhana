import { DIFFICULTY_SETTINGS, generatePuzzle } from './generator.js';
import { renderPuzzles } from './renderer.js';
import { readInt } from '../shared/utils.js';
import { themeToggleMarkup } from '../shared/shell-ui.js';
import { printWorksheet } from '../shared/print.js';
import { exportWorksheetPdf } from '../shared/export-pdf.js';

const state = {
  puzzles: [],
  showSolutions: false,
};

export function buildSudokuUI(container) {
  container.innerHTML = `
    <div class="sdk-tool tool-shell">

      <div class="sdk-toolbar tool-header no-print">
        <div class="tool-header-main">
          <span class="tool-header-title">Sudoku</span>
          <span class="tool-header-status tb-status status-msg info" id="sdkStatus"></span>
        </div>
        <div class="tool-header-actions">
            <button class="btn btn-primary btn-sm" id="sdkBtnGenerate">
              <i class="fas fa-sync-alt"></i> Generate
            </button>
            <button class="btn btn-secondary btn-sm" id="sdkBtnPrint">
              <i class="fas fa-print"></i> Print PDF
            </button>
            <button class="btn btn-secondary btn-sm" id="sdkBtnExport">
              <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button class="btn btn-ghost btn-sm" id="sdkBtnReset">
              <i class="fas fa-undo-alt"></i> Reset
            </button>
            <span class="tool-theme-slot">${themeToggleMarkup()}</span>
        </div>
      </div>

      <div class="sdk-body tool-body">

        <!-- Left: settings pane -->
        <div class="sdk-settings-pane tool-settings no-print">

          <div class="sdk-settings-section">
            <div class="sdk-section-title">Puzzle</div>

            <div class="sdk-field">
              <label for="sdkDifficulty">Difficulty</label>
              <select class="tb-select" id="sdkDifficulty">
                <option value="easy">Easy</option>
                <option value="medium" selected>Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div class="sdk-field">
              <label for="sdkPuzzleCount">Puzzles</label>
              <input class="tb-num" type="number" id="sdkPuzzleCount" value="4" min="1" max="24" />
            </div>
          </div>

          <div class="sdk-settings-section">
            <div class="sdk-section-title">Layout</div>

            <div class="sdk-field">
              <label for="sdkTileCount">Puzzles per page</label>
              <select class="tb-select" id="sdkTileCount">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="4" selected>4</option>
                <option value="6">6</option>
              </select>
            </div>
          </div>

          <div class="sdk-settings-section">
            <div class="sdk-section-title">Answers</div>

            <div class="sdk-field">
              <label for="sdkShowSolutions">Show solutions</label>
              <label class="toggle-switch toggle-sm" for="sdkShowSolutions">
                <input type="checkbox" id="sdkShowSolutions" />
                <span class="toggle-track"></span>
              </label>
            </div>
          </div>

        </div>

        <!-- Right: rendered pages -->
        <div class="sdk-output tool-preview" id="sdkOutput">
          <div class="tool-preview-scroll">
          <div class="empty-state" id="sdkEmptyState">
            <i class="fas fa-th"></i>
            <p>Click <strong>Generate</strong> to create Sudoku puzzles.</p>
          </div>
          <div id="sdkPuzzlesContainer" class="tool-pages"></div>
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
  const sel = id => document.getElementById(id)?.value ?? '';
  return {
    difficulty:  sel('sdkDifficulty') || 'medium',
    count:       Math.min(24, Math.max(1, readInt('sdkPuzzleCount', 4))),
    tileCount:   normalizeTileCount(readInt('sdkTileCount', 4)),
  };
}

function normalizeTileCount(value) {
  return [1, 2, 4, 6].includes(value) ? value : 4;
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
    tileCount:     config.tileCount,
  });
}

function runReset() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('sdkDifficulty',  'medium');
  set('sdkPuzzleCount', 4);
  set('sdkTileCount',   4);
  runGenerate();
}

function wireEvents() {
  document.getElementById('sdkBtnGenerate')?.addEventListener('click', runGenerate);
  document.getElementById('sdkBtnPrint')?.addEventListener('click', printWorksheet);
  document.getElementById('sdkBtnExport')?.addEventListener('click', () => exportWorksheetPdf({ filenameBase: 'sudoku' }));
  document.getElementById('sdkBtnReset')?.addEventListener('click', runReset);

  document.getElementById('sdkShowSolutions')?.addEventListener('change', (e) => {
    state.showSolutions = e.target.checked;
    if (state.puzzles.length) doRender();
  });

  document.getElementById('sdkTileCount')?.addEventListener('change', () => {
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
