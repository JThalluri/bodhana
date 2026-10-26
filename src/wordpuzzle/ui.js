import {paperSizeControl,applyPaperSize} from '../shared/paper-size.js';
import {paginateRows} from '../shared/paper-pagination.js';
import { initWorkspacePersistence } from '../shared/device-storage.js';
let workspace;
let mountGeneration = 0, fileGeneration = 0;
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
  allWords: [],
  dictionary: [],
  puzzles: [],
  showSolutions: false,
  wordSearch: '',
};

const minLens = [3,4,5,6,7,8,9,10,11,12,13,14,15];
const maxLens = [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];

export function buildWordPuzzleUI(container) {
  ++mountGeneration;
  container.innerHTML = `
    <div class="wp-tool tool-shell">

      <div class="wp-toolbar tool-header tool-worksheet-header no-print">
        <div class="tool-header-main">
          <span class="tool-header-title">Word Puzzles</span>
          <span class="tool-header-status tb-status status-msg info" id="wpGenStatus"></span>
        </div>
        <div class="tool-header-actions tool-worksheet-actions">
          <div class="tool-primary-actions">
            <button class="btn btn-primary btn-sm" id="wpBtnGenerate">
              <i class="fas fa-sync-alt"></i> Generate
            </button>
            <button class="btn btn-secondary btn-sm" id="wpBtnPrint">
              <i class="fas fa-print"></i> Print
            </button>
            <button class="btn btn-secondary btn-sm" id="wpBtnExport">
              <i class="fas fa-file-pdf"></i> Export
            </button>
          </div>
          <div class="tool-secondary-actions">
            <span class="tool-theme-slot">${themeToggleMarkup()}</span>
          </div>
        </div>
      </div>

      <div class="wp-body tool-body">

        <!-- Left: settings pane -->
        <div class="wp-settings-pane tool-settings no-print">${paperSizeControl('wpPaperSize','Statement supports grids up to 20 × 20; word banks and jumbles continue onto extra pages as needed. Grid type fits the chosen stock.')}

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
              <input class="tb-num" type="number" id="wpWordsPerPuzzle" value="30" min="1" max="50" />
            </div>
            <div class="wp-set-field" id="wpRowsLabel">
              <label for="wpRows">Grid rows</label>
              <input class="tb-num" type="number" id="wpRows" value="22" min="10" max="26" />
            </div>
            <div class="wp-set-field" id="wpColsLabel">
              <label for="wpCols">Grid columns</label>
              <input class="tb-num" type="number" id="wpCols" value="22" min="10" max="26" />
            </div>
          </div>

          <div class="wp-settings-section">
            <div class="wp-section-title">Word Length</div>

            <div class="wp-set-field">
              <label for="wpMinWordLength">Min letters</label>
              <select class="tb-select" id="wpMinWordLength">
                ${minLens.map(n => `<option value="${n}"${n===5?' selected':''}>${n}</option>`).join('')}
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
                <option value="'Andika', sans-serif">Andika</option>
                <option value="'Nunito', sans-serif">Nunito</option>
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
              <input class="tb-num" type="number" id="wpCellPadding" value="7" min="0" max="20" />
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
              <label class="wp-file-btn btn btn-secondary btn-sm" for="wpFileInput" title="Load word list (.txt) or Dictionary Builder export (.csv)">
                <i class="fas fa-folder-open"></i> Load
                <span class="badge badge-accent" id="wpFileBadge">49</span>
              </label>
              <input type="file" id="wpFileInput" accept=".txt,.text,.csv" style="display:none;" />
              <button class="btn btn-danger btn-sm" id="wpBtnClearDict" title="Clear dictionary">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="wp-set-field">
              <span class="tb-status status-msg info" id="wpDictStatus">Demo (49 words)</span>
            </div>
            <input class="wp-word-search" type="text" id="wpWordSearch" placeholder="Search words..." />
            <div class="wp-word-sel-header">
              <span>Word Selection <span id="wpWordSelCount"></span></span>
              <div class="wp-word-sel-actions">
                <button class="btn btn-ghost btn-sm" id="wpBtnSelAll">All</button>
                <button class="btn btn-ghost btn-sm" id="wpBtnSelNone">None</button>
              </div>
            </div>
            <div class="wp-word-sel-list" id="wpWordSelList">
              <div class="wp-word-sel-empty">No words loaded.</div>
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

  setDictionaryWords(DEMO_WORDS, { statusText: `Demo (${DEMO_WORDS.length} words)`, statusType: 'info' });
  onModeChange();
  wireEvents();
  runGenerate();
  workspace = initWorkspacePersistence(container.querySelector('.tool-shell'), 'word-puzzles', {
    snapshot: () => state,
    restore: saved => {
      if (!Array.isArray(saved.allWords) || !Array.isArray(saved.dictionary)) return;
      state.allWords = saved.allWords; state.dictionary = saved.dictionary;
      state.puzzles = saved.puzzles || []; state.wordSearch = saved.wordSearch || '';
      // Settings were restored synchronously by the tool shell.
      state.showSolutions = document.getElementById('wpShowSolutions').checked;
      document.getElementById('wpWordSearch').value = state.wordSearch;
      updateDictionaryStatus(state.allWords.length ? state.dictionary.length + ' selected (saved)' : 'No dictionary', 'info');
      renderWordSelection(); doRender();
    },
  });
}

function readOpts() {
  const small=document.getElementById('wpPaperSize')?.value==='statement';
  for(const id of ['wpRows','wpCols']){const input=document.getElementById(id);input.max=small?'20':'26';if(small && Number(input.value)>20)input.value='20';}
  const n = (id, fb) => { const v = parseInt(document.getElementById(id)?.value ?? '', 10); return isNaN(v) ? fb : v; };
  const v = (id) => document.getElementById(id)?.value ?? '';
  return {
    paperSize: v('wpPaperSize'),
    mode:           v('wpMode') || 'wordsearch',
    wordsPerPuzzle: n('wpWordsPerPuzzle', 30),
    rows:           n('wpRows', 22),
    cols:           n('wpCols', 22),
    puzzleCount:    n('wpPuzzleCount', 2),
    difficulty:     v('wpDifficulty') || 'medium',
    minWordLength:  n('wpMinWordLength', 5),
    maxWordLength:  n('wpMaxWordLength', 12),
    fontFamily:     v('wpFontFamily') || "'Andika', sans-serif",
    fontSize:       n('wpFontSize', 20),
    cellPadding:    n('wpCellPadding', 6),
    caseMode:       v('wpCaseMode') || 'lowercase',
  };
}

function setDictionaryWords(words, { statusText = '', statusType = 'success' } = {}) {
  state.allWords = Array.from(new Set(words));
  state.dictionary = [...state.allWords];
  updateDictionaryStatus(statusText || `${state.allWords.length} words`, statusType);
  renderWordSelection();
}

function updateDictionaryStatus(text, type = 'info') {
  const dictStatus = document.getElementById('wpDictStatus');
  const badge = document.getElementById('wpFileBadge');
  if (dictStatus) {
    dictStatus.className = `tb-status status-msg ${type}`;
    dictStatus.textContent = text;
  }
  if (badge) badge.textContent = state.dictionary.length;
}

function visibleDictionaryWords() {
  const query = state.wordSearch;
  return query
    ? state.allWords.filter(word => word.includes(query))
    : state.allWords;
}

function renderWordSelection() {
  const list = document.getElementById('wpWordSelList');
  const count = document.getElementById('wpWordSelCount');
  if (count) count.textContent = `(${state.dictionary.length}/${state.allWords.length})`;
  if (!list) return;

  if (!state.allWords.length) {
    list.innerHTML = '<div class="wp-word-sel-empty">No words loaded.</div>';
    return;
  }

  const shown = visibleDictionaryWords();
  if (!shown.length) {
    list.innerHTML = '<div class="wp-word-sel-empty">No matches.</div>';
    return;
  }

  const selected = new Set(state.dictionary);
  list.innerHTML = shown.map(word => {
    const isSelected = selected.has(word);
    return `
      <div class="wp-word-sel-item${isSelected ? ' wp-word-selected' : ''}" data-word="${word}">
        <span class="wp-word-sel-word">${word}</span>
        ${isSelected
          ? `<button class="btn btn-ghost btn-sm wp-btn-remove-word" data-word="${word}" aria-label="Remove ${word}">&times;</button>`
          : `<button class="btn btn-ghost btn-sm wp-btn-add-word" data-word="${word}" aria-label="Add ${word}">+</button>`
        }
      </div>`;
  }).join('');
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
    paperSize: opts.paperSize,
  });
  [...container.children].forEach(page=>applyPaperSize(page,opts.paperSize));
  paginateRows(container,'.wp-jumble-list');
  paginateRows(container,'.wp-word-grid',{continuationRemove:'.wp-grid-wrapper',continuationLabel:'Word bank (continued)'});
}

function wireEvents() {
  document.getElementById('wpPaperSize').addEventListener('change',()=>{readOpts();if(state.puzzles.length)runGenerate();});
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
    const mount = mountGeneration, load = ++fileGeneration;
    try {
      const words = await loadDictionaryFromFile(file);
      if (mount !== mountGeneration || load !== fileGeneration) return;
      setDictionaryWords(words, {
        statusText: words.length ? `${words.length} words` : 'No valid words',
        statusType: words.length ? 'success' : 'error',
      });
    } catch (err) {
      if (mount !== mountGeneration || load !== fileGeneration) return;
      state.allWords = [];
      state.dictionary = [];
      updateDictionaryStatus(`Error: ${err.message}`, 'error');
      renderWordSelection();
    }
    e.target.value = '';
    workspace?.save();
  });

  document.getElementById('wpBtnClearDict')?.addEventListener('click', () => {
    ++fileGeneration;
    state.allWords = [];
    state.dictionary = [];
    state.puzzles = [];
    updateDictionaryStatus('No dictionary', 'info');
    renderWordSelection();
    doRender();
  });

  document.getElementById('wpWordSearch')?.addEventListener('input', e => {
    state.wordSearch = e.target.value.trim().toLowerCase();
    renderWordSelection();
  });

  document.getElementById('wpBtnSelAll')?.addEventListener('click', () => {
    const selected = new Set(state.dictionary);
    visibleDictionaryWords().forEach(word => selected.add(word));
    state.dictionary = state.allWords.filter(word => selected.has(word));
    updateDictionaryStatus(`${state.dictionary.length} selected`, state.dictionary.length ? 'success' : 'error');
    renderWordSelection();
  });

  document.getElementById('wpBtnSelNone')?.addEventListener('click', () => {
    const toRemove = new Set(visibleDictionaryWords());
    state.dictionary = state.dictionary.filter(word => !toRemove.has(word));
    updateDictionaryStatus(`${state.dictionary.length} selected`, state.dictionary.length ? 'success' : 'error');
    renderWordSelection();
  });

  document.getElementById('wpWordSelList')?.addEventListener('click', e => {
    const add = e.target.closest('.wp-btn-add-word');
    const remove = e.target.closest('.wp-btn-remove-word');
    if (!add && !remove) return;

    const word = (add || remove).dataset.word;
    if (add && !state.dictionary.includes(word)) {
      state.dictionary.push(word);
    } else if (remove) {
      state.dictionary = state.dictionary.filter(w => w !== word);
    }
    updateDictionaryStatus(`${state.dictionary.length} selected`, state.dictionary.length ? 'success' : 'error');
    renderWordSelection();
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
  workspace?.dispose(); workspace = null; ++mountGeneration; ++fileGeneration;
  document.removeEventListener('keydown', handleKeydown);
  state.allWords = [];
  state.dictionary = [];
  state.puzzles = [];
  state.showSolutions = false;
  state.wordSearch = '';
}
