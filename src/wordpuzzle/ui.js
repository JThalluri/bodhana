import { loadDictionaryFromFile, DEMO_WORDS } from './dictionary.js';
import { generateWordSearch } from './wordsearch.js';
import { generateCrissCross } from './crisscross.js';
import { generateJumble } from './jumble.js';
import { renderPuzzles } from './renderer.js';

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
    <div class="wp-tool">

      <!-- Compact two-row sticky toolbar -->
      <div class="wp-toolbar no-print">

        <!-- Row 1: puzzle settings, style, dictionary -->
        <div class="wp-tb-row">

          <div class="wp-tb-group">
            <span class="wp-tb-grouplabel">Puzzle</span>
            <select class="tb-select" id="wpMode" title="Mode">
              <option value="wordsearch">Word Search</option>
              <option value="crisscross">Criss Cross</option>
              <option value="jumble">Word Jumble</option>
            </select>
            <label class="tb-count-lbl" title="Words per puzzle">Words
              <input class="tb-num" type="number" id="wpWordsPerPuzzle" value="10" min="1" max="50" />
            </label>
            <label class="tb-count-lbl" title="Grid rows" id="wpRowsLabel">Rows
              <input class="tb-num" type="number" id="wpRows" value="12" min="10" max="26" />
            </label>
            <label class="tb-count-lbl" title="Grid columns" id="wpColsLabel">Cols
              <input class="tb-num" type="number" id="wpCols" value="12" min="10" max="26" />
            </label>
            <label class="tb-count-lbl">Puzzles
              <input class="tb-num" type="number" id="wpPuzzleCount" value="2" min="1" max="8" />
            </label>
            <select class="tb-select" id="wpDifficulty" title="Difficulty">
              <option value="easy">Easy</option>
              <option value="medium" selected>Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <span class="tb-vdiv"></span>

          <div class="wp-tb-group">
            <span class="wp-tb-grouplabel">Style</span>
            <select class="tb-select" id="wpFontFamily" title="Font family" style="min-width:100px;">
              <option value="'Nunito', sans-serif">Nunito</option>
              <option value="'Comic Sans MS', cursive">Comic Sans</option>
              <option value="'Fredoka One', cursive">Fredoka</option>
              <option value="'Patrick Hand', cursive">Patrick Hand</option>
              <option value="'Quicksand', sans-serif">Quicksand</option>
            </select>
            <label class="tb-count-lbl" title="Cell font size">Size
              <input class="tb-num" type="number" id="wpFontSize" value="20" min="10" max="48" />
            </label>
            <label class="tb-count-lbl" title="Cell padding">Pad
              <input class="tb-num" type="number" id="wpCellPadding" value="6" min="0" max="20" />
            </label>
            <select class="tb-select" id="wpCaseMode" title="Letter case">
              <option value="lowercase">lower</option>
              <option value="uppercase">UPPER</option>
            </select>
          </div>

          <span class="tb-vdiv"></span>

          <div class="wp-tb-group">
            <span class="wp-tb-grouplabel">Dictionary</span>
            <label class="wp-file-btn btn btn-secondary btn-sm" for="wpFileInput" title="Load word list (.txt)">
              <i class="fas fa-folder-open"></i>
              <span class="badge badge-accent" id="wpFileBadge">49</span>
            </label>
            <input type="file" id="wpFileInput" accept=".txt,.text" style="display:none;" />
            <button class="btn btn-danger btn-sm" id="wpBtnClearDict" title="Clear dictionary">
              <i class="fas fa-times"></i>
            </button>
            <span class="tb-status status-msg info" id="wpDictStatus">Demo (49 words)</span>
          </div>

        </div>

        <!-- Row 2: word length controls + print options + actions right-aligned -->
        <div class="wp-tb-row wp-tb-row2">

          <div class="wp-tb-group">
            <span class="wp-tb-grouplabel">Letters</span>
            <label class="tb-count-lbl" title="Minimum word length">Min
              <select class="tb-select" id="wpMinWordLength" style="padding-left:4px;">
                ${minLens.map(n => `<option value="${n}"${n===4?' selected':''}>${n}</option>`).join('')}
              </select>
            </label>
            <label class="tb-count-lbl" title="Maximum word length">Max
              <select class="tb-select" id="wpMaxWordLength" style="padding-left:4px;">
                ${maxLens.map(n => `<option value="${n}"${n===10?' selected':''}>${n}</option>`).join('')}
              </select>
            </label>
          </div>

          <span class="tb-vdiv"></span>

          <div class="wp-tb-group">
            <span class="wp-tb-grouplabel">Print</span>
            <select class="tb-select" id="wpPrintMargin" title="Print margin">
              <option value="6mm">6 mm</option>
              <option value="10mm" selected>10 mm</option>
              <option value="16mm">16 mm</option>
            </select>
            <label class="wp-sol-toggle" title="Show solutions">
              <span class="toggle-switch" style="width:32px;height:18px;">
                <input type="checkbox" id="wpShowSolutions" />
                <span class="toggle-track"></span>
              </span>
              <span class="tb-count-lbl" style="color:var(--text-secondary)"><i class="fas fa-eye"></i> Solutions</span>
            </label>
          </div>

          <span class="tb-vdiv"></span>

          <!-- Actions pushed to right via margin-left:auto -->
          <div class="tb-actions" style="margin-left:auto">
            <button class="btn btn-primary btn-sm" id="wpBtnGenerate">
              <i class="fas fa-play"></i> Generate
            </button>
            <button class="btn btn-secondary btn-sm" id="wpBtnPrint">
              <i class="fas fa-print"></i> Print
            </button>
          </div>

          <span class="tb-status status-msg info" id="wpGenStatus"></span>

        </div>
      </div>

      <!-- Puzzles output -->
      <div class="wp-output" id="wpOutput">
        <div class="empty-state" id="wpEmptyState">
          <i class="fas fa-file-alt"></i>
          <p>Click <strong>Generate</strong> to create puzzles.</p>
        </div>
        <div id="wpPuzzlesContainer"></div>
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
    printMargin:    v('wpPrintMargin') || '10mm',
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

  document.documentElement.style.setProperty('--print-margin', opts.printMargin);
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
    const margin = document.getElementById('wpPrintMargin')?.value ?? '10mm';
    document.documentElement.style.setProperty('--print-margin', margin);
    window.print();
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

  ['wpFontFamily', 'wpFontSize', 'wpCellPadding', 'wpCaseMode', 'wpPrintMargin'].forEach(id => {
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
