import { loadDictionaryFromFile, DEMO_WORDS } from './dictionary.js';
import { generateWordSearch } from './wordsearch.js';
import { generateCrissCross } from './crisscross.js';
import { generateJumble } from './jumble.js';
import { renderPuzzles } from './renderer.js';
import { themeToggleMarkup } from '../shared/shell-ui.js';
import { printWorksheet } from '../shared/print.js';
import { exportWorksheetPdf } from '../shared/export-pdf.js';

export const DIFFICULTY = {
  easy:   { minLen: 3, maxLen: 6,  attempts: 80  },
  medium: { minLen: 4, maxLen: 8,  attempts: 150 },
  hard:   { minLen: 5, maxLen: 12, attempts: 300 },
};

const state = {
  dictionary: [],
  puzzles: [],
  showSolutions: false,
};

const minLens = [3,4,5,6,7,8,9,10,11,12,13,14,15];
const maxLens = [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];

export function buildWordPuzzleUI(container) {
  container.innerHTML = `
    <div class="wp-tool tool-shell">

      <div class="wp-toolbar tool-header no-print">
        <div class="tool-header-main">
          <span class="tool-header-title">Word Puzzles</span>
          <span class="tool-header-status tb-status status-msg info" id="wpGenStatus"></span>
        </div>
        <div class="tool-header-actions">
            <button class="btn btn-primary btn-sm" id="wpBtnGenerate">
              <i class="fas fa-sync-alt"></i> Generate
            </button>
            <button class="btn btn-secondary btn-sm" id="wpBtnPrint">
              <i class="fas fa-print"></i> Print PDF
            </button>
            <button class="btn btn-secondary btn-sm" id="wpBtnExport">
              <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <span class="tool-theme-slot">${themeToggleMarkup()}</span>
        </div>
      </div>

      <div class="wp-body tool-body">

        <!-- Left: settings pane -->
        <div class="wp-settings-pane tool-settings no-print">

          <div class="wp-settings-section">
            <div class="wp-section-title">Puzzle</div>

            <div class="wp-set-field">
              <label for="wpMode">Type</label>
              <select class="tb-select" id="wpMode">
                <option value="wordsearch">Word Search</option>
                <option value="crisscross">Criss Cross</option>
                <option value="jumble">Word Jumble</option>
              </select>
            </div>
            <div class="wp-set-field">
              <label for="wpDifficulty">Difficulty</label>
              <select class="tb-select" id="wpDifficulty">
                <option value="easy">Easy</option>
                <option value="medium" selected>Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div class="wp-set-field">
              <label for="wpPuzzleCount">Puzzles</label>
              <input class="tb-num" type="number" id="wpPuzzleCount" value="2" min="1" max="8" />
            </div>
            <div class="wp-set-field">
              <label for="wpWordsPerPuzzle">Words per puzzle</label>
              <input class="tb-num" type="number" id="wpWordsPerPuzzle" value="10" min="1" max="50" />
            </div>
            <div class="wp-set-field" id="wpRowsLabel">
              <label for="wpRows">Grid rows</label>
              <input class="tb-num" type="number" id="wpRows" value="12" min="10" max="26" />
            </div>
            <div class="wp-set-field" id="wpColsLabel">
              <label for="wpCols">Grid columns</label>
              <input class="tb-num" type="number" id="wpCols" value="12" min="10" max="26" />
            </div>
          </div>

          <div class="wp-settings-section">
            <div class="wp-section-title">Word Length</div>

            <div class="wp-set-field">
              <label for="wpMinWordLength">Min letters</label>
              <select class="tb-select" id="wpMinWordLength">
                ${minLens.map(n => `<option value="${n}"${n===4?' selected':''}>${n}</option>`).join('')}
              </select>
            </div>
            <div class="wp-set-field">
              <label for="wpMaxWordLength">Max letters</label>
              <select class="tb-select" id="wpMaxWordLength">
                ${maxLens.map(n => `<option value="${n}"${n===10?' selected':''}>${n}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="wp-settings-section">
            <div class="wp-section-title">Appearance</div>

            <div class="wp-set-field">
              <label for="wpFontFamily">Font</label>
              <select class="tb-select" id="wpFontFamily">
                <option value="'Nunito', sans-serif">Nunito</option>
                <option value="'Andika', sans-serif">Andika</option>
                <option value="'Comic Sans MS', cursive">Comic Sans</option>
                <option value="'Patrick Hand', cursive">Patrick Hand</option>
                <option value="'Quicksand', sans-serif">Quicksand</option>
              </select>
            </div>
            <div class="wp-set-field">
              <label for="wpFontSize">Font size</label>
              <input class="tb-num" type="number" id="wpFontSize" value="20" min="10" max="48" />
            </div>
            <div class="wp-set-field">
              <label for="wpCellPadding">Cell padding</label>
              <input class="tb-num" type="number" id="wpCellPadding" value="6" min="0" max="20" />
            </div>
            <div class="wp-set-field">
              <label for="wpCaseMode">Letter case</label>
              <select class="tb-select" id="wpCaseMode">
                <option value="lowercase">lower</option>
                <option value="uppercase">UPPER</option>
              </select>
            </div>
          </div>

          <div class="wp-settings-section">
            <div class="wp-section-title">Dictionary</div>

            <div class="wp-set-field">
              <label class="wp-file-btn btn btn-secondary btn-sm" for="wpFileInput" title="Load word list (.txt)">
                <i class="fas fa-folder-open"></i> Load
                <span class="badge badge-accent" id="wpFileBadge">49</span>
              </label>
              <input type="file" id="wpFileInput" accept=".txt,.text" style="display:none;" />
              <button class="btn btn-danger btn-sm" id="wpBtnClearDict" title="Clear dictionary">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="wp-set-field">
              <span class="tb-status status-msg info" id="wpDictStatus">Demo (49 words)</span>
            </div>
          </div>

          <div class="wp-settings-section">
            <div class="wp-section-title">Answers</div>

            <div class="wp-set-field">
              <label for="wpShowSolutions">Show solutions</label>
              <label class="toggle-switch toggle-sm" for="wpShowSolutions">
                <input type="checkbox" id="wpShowSolutions" />
                <span class="toggle-track"></span>
              </label>
            </div>
          </div>

        </div>

        <!-- Right: rendered pages -->
        <div class="wp-output tool-preview" id="wpOutput">
          <div class="tool-preview-scroll">
          <div class="empty-state" id="wpEmptyState">
            <i class="fas fa-file-alt"></i>
            <p>Click <strong>Generate</strong> to create puzzles.</p>
          </div>
          <div id="wpPuzzlesContainer" class="tool-pages"></div>
          </div>
        </div>

        <div class="tool-info-pane" aria-hidden="true"></div>

      </div>

    </div>
  `;

  state.dictionary = Array.from(new Set(DEMO_WORDS));
  onModeChange();
  wireEvents();
  runGenerate();
}

function readOpts() {
  const n = (id, fb) => { const v = parseInt(document.getElementById(id)?.value ?? '', 10); return isNaN(v) ? fb : v; };
  const v = (id) => document.getElementById(id)?.value ?? '';
  return {
    mode:           v('wpMode') || 'wordsearch',
    wordsPerPuzzle: n('wpWordsPerPuzzle', 10),
    rows:           n('wpRows', 12),
    cols:           n('wpCols', 12),
    puzzleCount:    n('wpPuzzleCount', 2),
    difficulty:     v('wpDifficulty') || 'medium',
    minWordLength:  n('wpMinWordLength', 4),
    maxWordLength:  n('wpMaxWordLength', 10),
    fontFamily:     v('wpFontFamily') || "'Nunito', sans-serif",
    fontSize:       n('wpFontSize', 20),
    cellPadding:    n('wpCellPadding', 6),
    caseMode:       v('wpCaseMode') || 'lowercase',
  };
}

function onModeChange() {
  const isJumble = document.getElementById('wpMode')?.value === 'jumble';
  ['wpRows', 'wpCols'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = isJumble;
  });
  ['wpRowsLabel', 'wpColsLabel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.opacity = isJumble ? '0.4' : '';
  });
}

function runGenerate() {
  const status = document.getElementById('wpGenStatus');
  const dict = state.dictionary;

  if (dict.length === 0) {
    if (status) { status.className = 'tb-status status-msg error'; status.textContent = '⚠️ Load a dictionary first.'; }
    return;
  }

  const opts = readOpts();
  const rows = Math.min(26, Math.max(10, opts.rows));
  const cols = Math.min(26, Math.max(10, opts.cols));
  const puzzleCount = Math.min(8, Math.max(1, opts.puzzleCount));

  const diff = { ...(DIFFICULTY[opts.difficulty] ?? DIFFICULTY.medium) };
  diff.minLen = opts.minWordLength;
  diff.maxLen = Math.min(diff.maxLen, opts.maxWordLength);
  if (diff.maxLen < diff.minLen) diff.maxLen = diff.minLen;

  const puzzles = [];
  for (let i = 0; i < puzzleCount; i++) {
    let p;
    if (opts.mode === 'jumble') {
      p = generateJumble(dict, {
        wordsPerPuzzle: opts.wordsPerPuzzle,
        minWordLength:  opts.minWordLength,
        maxWordLength:  opts.maxWordLength,
      });
    } else {
      p = opts.mode === 'crisscross'
        ? generateCrissCross(rows, cols, dict, opts.wordsPerPuzzle, diff, opts.minWordLength)
        : generateWordSearch(rows, cols, dict, opts.wordsPerPuzzle, diff, opts.minWordLength);
      p.mode = opts.mode;
    }
    puzzles.push(p);
  }

  state.puzzles = puzzles;
  state.showSolutions = false;
  const solEl = document.getElementById('wpShowSolutions');
  if (solEl) solEl.checked = false;

  doRender();

  if (status) {
    status.className = 'tb-status status-msg success';
    status.innerHTML = `<i class="fas fa-check-circle"></i> ${puzzleCount} puzzle${puzzleCount > 1 ? 's' : ''} (${dict.length} words)`;
  }
}

function doRender() {
  const container = document.getElementById('wpPuzzlesContainer');
  const empty = document.getElementById('wpEmptyState');
  if (!container) return;

  if (!state.puzzles.length) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }

  if (empty) empty.style.display = 'none';
  const opts = readOpts();
  container.innerHTML = renderPuzzles(state.puzzles, {
    fontSize:      opts.fontSize,
    cellPadding:   opts.cellPadding,
    fontFamily:    opts.fontFamily,
    caseMode:      opts.caseMode,
    showSolutions: state.showSolutions,
  });
}

function wireEvents() {
  document.getElementById('wpBtnGenerate')?.addEventListener('click', runGenerate);

  document.getElementById('wpMode')?.addEventListener('change', () => {
    onModeChange();
  });

  document.getElementById('wpBtnPrint')?.addEventListener('click', () => {
    if (!state.puzzles.length) return;
    printWorksheet();
  });

  document.getElementById('wpBtnExport')?.addEventListener('click', () => {
    if (!state.puzzles.length) return;
    exportWorksheetPdf({ filenameBase: document.getElementById('wpMode')?.value ?? 'word_puzzles' });
  });

  document.getElementById('wpShowSolutions')?.addEventListener('change', (e) => {
    state.showSolutions = e.target.checked;
    if (state.puzzles.length) doRender();
  });

  document.getElementById('wpFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dictStatus = document.getElementById('wpDictStatus');
    const badge = document.getElementById('wpFileBadge');
    try {
      const words = await loadDictionaryFromFile(file);
      state.dictionary = words;
      const msg = words.length ? `${words.length} words` : '⚠️ No valid words';
      if (dictStatus) { dictStatus.className = `tb-status status-msg ${words.length ? 'success' : 'error'}`; dictStatus.textContent = msg; }
      if (badge) badge.textContent = words.length;
    } catch (err) {
      if (dictStatus) { dictStatus.className = 'tb-status status-msg error'; dictStatus.textContent = `❌ ${err.message}`; }
      state.dictionary = [];
      if (badge) badge.textContent = '0';
    }
    e.target.value = '';
  });

  document.getElementById('wpBtnClearDict')?.addEventListener('click', () => {
    state.dictionary = [];
    state.puzzles = [];
    const badge = document.getElementById('wpFileBadge');
    const dictStatus = document.getElementById('wpDictStatus');
    if (badge) badge.textContent = '0';
    if (dictStatus) { dictStatus.className = 'tb-status status-msg info'; dictStatus.textContent = 'No dictionary'; }
    doRender();
  });

  ['wpFontFamily', 'wpFontSize', 'wpCellPadding', 'wpCaseMode'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => { if (state.puzzles.length) doRender(); };
    el.addEventListener('change', handler);
    el.addEventListener('input', handler);
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
