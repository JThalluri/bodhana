import {
  parseWords, isPreParsedCSV,
  PHONICS_PATTERNS, SOUND_LABELS,
} from '../phonics/PhonicsEngine.mjs';
import { themeToggleMarkup, wireTabs } from '../shared/shell-ui.js';
import { printWorksheet } from '../shared/print.js';
import { exportWorksheetPdf } from '../shared/export-pdf.js';
import { DEFAULT_COMMON_WORDS } from '../shared/default-common-words.js';
import { generateDissect, generateElkonin, generateOnsetRime, generateSyllableSplit } from './generator.js';
import { renderSheet, DEFAULT_WORDS_PER_PAGE } from './renderer.js';

// Demo list: validated words from the phonics regression fixture corpus
const DEMO_WORDS = [
  'ship', 'catch', 'phone', 'sing', 'finger',
  'three', 'night', 'school', 'queen',
  'rain', 'storm', 'gingerbread',
];

const CAT_LABELS = {
  blends: 'Blends', clusters3: '3-Letter Clusters', digraphs: 'Digraphs',
  floss: 'Floss', rControlled: 'R-Controlled', rControlled3: 'R-Ctrl (3-letter)',
  trigraphs: 'Trigraphs', vowelTeams: 'Vowel Teams',
};

let state = makeState();

function makeState() {
  return {
    allWords: [],
    worksheetWords: [],
    activityType: 'dissect',
    showSolutions: false,
    wordsPerPage: DEFAULT_WORDS_PER_PAGE,
    wordSearch: '',
    filters: {
      decodableOnly: false,
      maxLevel: 8,
      activePatterns: new Set(),
      activeSounds: new Set(),
      diffMin: 1, diffMax: 3,
      phonemeMin: 1, phonemeMax: 20,
      letterMin: 1, letterMax: 30,
      syllableMin: 1, syllableMax: 8,
    },
  };
}

// ── CSV parsing (minimal RFC-4180 for toCSV() output format) ─────────────────

function parseCSVLine(line) {
  const cells = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let val = '';
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else val += line[i++];
      }
      cells.push(val);
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) { cells.push(line.slice(i)); break; }
      cells.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return cells;
}

function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const numericFields = new Set(['phoneme_count', 'difficulty', 'letter_count', 'syllable_count', 'level']);
  const booleanFields = new Set(['is_common']);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = Object.create(null);
    headers.forEach((h, idx) => {
      const v = vals[idx] ?? '';
      if (booleanFields.has(h)) {
        obj[h] = v === 'true' ? true : v === 'false' ? false : v;
      } else {
        obj[h] = numericFields.has(h) && v !== '' ? Number(v) : v;
      }
    });
    obj.tokens = (obj.graphemes || '').split('|').filter(Boolean);
    return obj;
  });
}

// ── Filtering ─────────────────────────────────────────────────────────────────

function matchesFilters(record) {
  const f = state.filters;
  if (f.decodableOnly && record.level > f.maxLevel) return false;
  if (record.difficulty < f.diffMin || record.difficulty > f.diffMax) return false;
  if (record.phoneme_count < f.phonemeMin || record.phoneme_count > f.phonemeMax) return false;
  if (record.letter_count < f.letterMin || record.letter_count > f.letterMax) return false;
  const sc = record.syllable_count ?? 1;
  if (sc < f.syllableMin || sc > f.syllableMax) return false;
  if (f.activePatterns.size > 0) {
    const wordPats = new Set([
      ...(record.digraphs || '').split(',').filter(Boolean),
      ...(record.trigraphs || '').split(',').filter(Boolean),
      ...(record.blends || '').split(',').filter(Boolean),
      ...(record.vowel_teams || '').split(',').filter(Boolean),
      ...(record.r_controlled || '').split(',').filter(Boolean),
      ...(record.clusters3 || '').split(',').filter(Boolean),
      ...(record.floss || '').split(',').filter(Boolean),
    ]);
    if (![...f.activePatterns].some(p => wordPats.has(p))) return false;
  }
  if (f.activeSounds.size > 0) {
    const wordSounds = new Set(
      (record.vowel_team_sounds || '').split(',').filter(Boolean).map(s => s.split(':')[1])
    );
    if (![...f.activeSounds].some(s => wordSounds.has(s))) return false;
  }
  return true;
}

// ── Render preview ────────────────────────────────────────────────────────────

function renderPreview() {
  const container = document.getElementById('phxPagesContainer');
  if (!container) return;

  if (!state.worksheetWords.length) {
    container.innerHTML = `<div class="empty-state">
      <i class="fas fa-file-alt"></i>
      <p>Load a word list to get started.</p>
    </div>`;
    return;
  }

  let sheetData;
  switch (state.activityType) {
    case 'dissect':       sheetData = generateDissect(state.worksheetWords); break;
    case 'elkonin':       sheetData = generateElkonin(state.worksheetWords); break;
    case 'onsetRime':     sheetData = generateOnsetRime(state.worksheetWords, state.allWords); break;
    case 'syllableSplit': sheetData = generateSyllableSplit(state.worksheetWords); break;
    default: return;
  }

  container.innerHTML = renderSheet(sheetData, { showSolutions: state.showSolutions, wordsPerPage: state.wordsPerPage });
}

// ── Word selection list ───────────────────────────────────────────────────────

function renderWordSelList() {
  const list = document.getElementById('phxWordSelList');
  const countEl = document.getElementById('phxWordSelCount');
  if (!list) return;
  if (countEl) countEl.textContent = `(${state.worksheetWords.length})`;

  // Pool = all words matching current bounds/filter settings
  const pool = state.allWords.filter(matchesFilters);
  if (!pool.length) {
    list.innerHTML = '<div class="phx-sel-empty">No words loaded.</div>';
    return;
  }

  const shown = state.wordSearch
    ? pool.filter(r => r.word.toLowerCase().includes(state.wordSearch))
    : pool;

  if (!shown.length) {
    list.innerHTML = '<div class="phx-sel-empty">No matches.</div>';
    return;
  }

  // Map word → position in worksheetWords for reorder buttons
  const selIdxMap = new Map(state.worksheetWords.map((r, i) => [r.word, i]));

  list.innerHTML = shown.map(r => {
    const selIdx = selIdxMap.get(r.word);
    const isSel = selIdx !== undefined;
    return `
      <div class="phx-word-sel-item${isSel ? ' phx-word-selected' : ''}" data-word="${r.word}">
        <span class="phx-word-sel-word">${r.word}</span>
        <div class="phx-reorder-btns">
          ${isSel ? `
            <button class="btn btn-ghost btn-sm phx-btn-up" data-idx="${selIdx}"
              ${selIdx === 0 ? 'disabled' : ''} aria-label="Move up">&#9650;</button>
            <button class="btn btn-ghost btn-sm phx-btn-down" data-idx="${selIdx}"
              ${selIdx === state.worksheetWords.length - 1 ? 'disabled' : ''} aria-label="Move down">&#9660;</button>
            <button class="btn btn-ghost btn-sm phx-btn-remove" data-idx="${selIdx}"
              aria-label="Remove">&#215;</button>
          ` : `
            <button class="btn btn-ghost btn-sm phx-btn-add" data-word="${r.word}"
              aria-label="Add to worksheet">&#43;</button>
          `}
        </div>
      </div>`;
  }).join('');
}

// ── Status helper ─────────────────────────────────────────────────────────────

function setStatus(msg, type = '') {
  const el = document.getElementById('phxStatus');
  if (el) { el.textContent = msg; el.className = `status-msg ${type}`; }
}

// ── Load words ────────────────────────────────────────────────────────────────

function loadWordsFromText(text) {
  if (isPreParsedCSV(text)) {
    const records = parseCSV(text);
    if (!records.length) { setStatus('CSV contains no rows.', 'error'); return; }
    state.allWords = records;
    setStatus(`${records.length} words loaded from CSV.`, 'success');
  } else {
    const words = [...new Set(
      text.split(/[\s,;\n]+/).map(w => w.trim().toLowerCase()).filter(w => /^[a-z]+$/.test(w))
    )];
    if (!words.length) { setStatus('No valid words found.', 'error'); return; }
    const raw = parseWords(words);
    state.allWords = raw.map(r => ({
      ...r,
      is_common: DEFAULT_COMMON_WORDS.has(r.word.toLowerCase()),
    }));
    setStatus(`${state.allWords.length} words loaded.`, 'success');
  }
  resetWordSelection();
  renderWordSelList();
  renderPreview();
}

function resetWordSelection() {
  state.worksheetWords = state.allWords.filter(matchesFilters);
}

function onFiltersChanged() {
  resetWordSelection();
  renderWordSelList();
  renderPreview();
}

// ── Build UI ──────────────────────────────────────────────────────────────────

export function buildPhonicsWorksheetsUI(container) {
  state = makeState();

  const patternFilterHtml = Object.entries(PHONICS_PATTERNS).map(([cat, patterns]) => `
    <details class="phx-filter-group">
      <summary class="phx-filter-summary">${CAT_LABELS[cat] || cat}</summary>
      <div class="phx-pattern-chips">
        ${patterns.map(p => `<button class="phx-chip" data-pattern="${p}">${p}</button>`).join('')}
      </div>
    </details>`).join('');

  const soundChipsHtml = Object.entries(SOUND_LABELS)
    .map(([code, label]) => `<button class="phx-chip" data-sound="${code}">${label}</button>`)
    .join('');

  container.innerHTML = `
    <div class="phx-tool tool-shell">

      <div class="phx-toolbar tool-header tool-worksheet-header no-print">
        <div class="tool-header-main">
          <span class="tool-header-title">Phonics Worksheets</span>
          <span class="status-msg" id="phxStatus"></span>
        </div>
        <div class="tool-header-actions tool-worksheet-actions">
          <div class="tool-primary-actions">
            <button class="btn btn-secondary btn-sm" id="phxBtnPrint">
              <i class="fas fa-print"></i> Print
            </button>
            <button class="btn btn-secondary btn-sm" id="phxBtnExport">
              <i class="fas fa-file-pdf"></i> Export
            </button>
          </div>
          <div class="tool-secondary-actions">
            <span class="tool-theme-slot">${themeToggleMarkup()}</span>
          </div>
        </div>
      </div>

      <div class="phx-body tool-body">

        <div class="phx-settings tool-settings no-print">

          <div class="phx-stab-strip" role="tablist">
            <button class="phx-stab active" role="tab" aria-selected="true" data-tab="source">
              <i class="fas fa-file-upload"></i><span>Source</span>
            </button>
            <button class="phx-stab" role="tab" aria-selected="false" data-tab="activity">
              <i class="fas fa-tasks"></i><span>Activity</span>
            </button>
            <button class="phx-stab" role="tab" aria-selected="false" data-tab="filters">
              <i class="fas fa-filter"></i><span>Filters</span>
            </button>
            <button class="phx-stab" role="tab" aria-selected="false" data-tab="bounds">
              <i class="fas fa-sliders-h"></i><span>Bounds</span>
            </button>
            <button class="phx-stab" role="tab" aria-selected="false" data-tab="words">
              <i class="fas fa-list"></i><span>Words</span>
            </button>
          </div>

          <div class="phx-stab-panels">

            <div class="phx-stab-panel active" role="tabpanel" data-panel="source">
              <div class="phx-settings-section">
                <div class="phx-dropzone" id="phxDropzone">
                  <i class="fas fa-file-upload phx-drop-icon"></i>
                  <p class="phx-drop-text">Drop a word list <strong>(.txt)</strong> or Dictionary Builder export <strong>(.csv)</strong></p>
                  <p class="phx-drop-hint">or <span class="phx-browse-link" id="phxBrowseLink">browse</span></p>
                  <input type="file" id="phxFileInput" accept=".txt,.csv" style="display:none">
                </div>
                <button class="btn btn-ghost btn-sm phx-demo-btn" id="phxBtnDemo">
                  <i class="fas fa-list"></i> Load demo list
                </button>
              </div>
            </div>

            <div class="phx-stab-panel" role="tabpanel" data-panel="activity">
              <div class="phx-settings-section">
                <div class="phx-field-row">
                  <label for="phxActivityType">Type</label>
                  <select class="tb-select" id="phxActivityType">
                    <option value="dissect">Dissect the Word</option>
                    <option value="elkonin">Elkonin Sound Boxes</option>
                    <option value="onsetRime">Onset &amp; Rime</option>
                    <option value="syllableSplit">Syllable Split</option>
                  </select>
                </div>
                <label class="phx-toggle-row">
                  <span>Show solutions</span>
                  <span class="toggle-switch toggle-sm">
                    <input type="checkbox" id="phxShowSolutions">
                    <span class="toggle-track"></span>
                  </span>
                </label>
                <div class="phx-field-row">
                  <label for="phxWordsPerPage">Words per page</label>
                  <input class="tb-num" type="number" id="phxWordsPerPage"
                    min="1" max="30" value="${DEFAULT_WORDS_PER_PAGE}">
                </div>
                <p class="phx-activity-note" id="phxOnsetRimeNote" style="display:none">
                  Works best with short, single-syllable words.
                </p>
              </div>
            </div>

            <div class="phx-stab-panel" role="tabpanel" data-panel="filters">
              <div class="phx-settings-section">
                <p class="phx-section-label">Patterns</p>
                <div class="phx-pattern-filter">${patternFilterHtml}</div>
              </div>
              <div class="phx-settings-section">
                <p class="phx-section-label">Vowel Sounds</p>
                <div class="phx-sound-chips">${soundChipsHtml}</div>
              </div>
            </div>

            <div class="phx-stab-panel" role="tabpanel" data-panel="bounds">
              <div class="phx-settings-section">
                <p class="phx-section-label">Scope &amp; Sequence</p>
                <label class="phx-toggle-row">
                  <span>Decodable words only</span>
                  <span class="toggle-switch toggle-sm">
                    <input type="checkbox" id="phxDecodableOnly">
                    <span class="toggle-track"></span>
                  </span>
                </label>
                <div class="phx-field-row">
                  <label for="phxMaxLevel">Max level</label>
                  <input class="tb-num" type="number" id="phxMaxLevel" min="1" max="8" value="8">
                </div>
              </div>
              <div class="phx-settings-section">
                <p class="phx-section-label">Word Properties</p>
                <div class="phx-field-row">
                  <label>Difficulty</label>
                  <div class="phx-range-pair">
                    <input class="tb-num" type="number" id="phxDiffMin" min="1" max="3" value="1">
                    <span class="phx-range-sep">–</span>
                    <input class="tb-num" type="number" id="phxDiffMax" min="1" max="3" value="3">
                  </div>
                </div>
                <div class="phx-field-row">
                  <label>Phonemes</label>
                  <div class="phx-range-pair">
                    <input class="tb-num" type="number" id="phxPhonemeMin" min="1" max="20" value="1">
                    <span class="phx-range-sep">–</span>
                    <input class="tb-num" type="number" id="phxPhonemeMax" min="1" max="20" value="20">
                  </div>
                </div>
                <div class="phx-field-row">
                  <label>Letters</label>
                  <div class="phx-range-pair">
                    <input class="tb-num" type="number" id="phxLetterMin" min="1" max="30" value="1">
                    <span class="phx-range-sep">–</span>
                    <input class="tb-num" type="number" id="phxLetterMax" min="1" max="30" value="30">
                  </div>
                </div>
                <div class="phx-field-row">
                  <label>Syllables</label>
                  <div class="phx-range-pair">
                    <input class="tb-num" type="number" id="phxSyllableMin" min="1" max="8" value="1">
                    <span class="phx-range-sep">–</span>
                    <input class="tb-num" type="number" id="phxSyllableMax" min="1" max="8" value="8">
                  </div>
                </div>
              </div>
            </div>

            <div class="phx-stab-panel" role="tabpanel" data-panel="words">
              <div class="phx-settings-section phx-words-panel">
                <input class="phx-word-search" type="text" id="phxWordSearch"
                  placeholder="Search words…">
                <p class="phx-section-label">
                  Word Selection <span id="phxWordSelCount"></span>
                </p>
                <div class="phx-word-sel-actions">
                  <button class="btn btn-ghost btn-sm" id="phxBtnSelAll">All</button>
                  <button class="btn btn-ghost btn-sm" id="phxBtnSelNone">None</button>
                  <button class="btn btn-ghost btn-sm" id="phxBtnShuffle">
                    <i class="fas fa-random"></i> Shuffle
                  </button>
                  <button class="btn btn-ghost btn-sm" id="phxBtnResetOrder">
                    <i class="fas fa-undo"></i> Reset
                  </button>
                </div>
                <div class="phx-word-sel-list" id="phxWordSelList">
                  <div class="phx-sel-empty">No words loaded.</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="phx-preview tool-preview">
          <div class="phx-preview-scroll">
            <div class="tool-pages" id="phxPagesContainer">
              <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <p>Load a word list to get started.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>`;

  wireEvents(container);
}

function wireEvents(container) {
  wireTabs(container.querySelector('.phx-settings'), {
    tabClass: 'phx-stab',
    panelClass: 'phx-stab-panel',
  });

  container.querySelector('#phxBtnPrint')?.addEventListener('click', () => printWorksheet());
  container.querySelector('#phxBtnExport')?.addEventListener('click', () =>
    exportWorksheetPdf({ filenameBase: `phonics_${state.activityType}` })
  );

  container.querySelector('#phxBtnDemo')?.addEventListener('click', () => {
    loadWordsFromText(DEMO_WORDS.join('\n'));
  });

  const fileInput = container.querySelector('#phxFileInput');
  container.querySelector('#phxBrowseLink')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => loadWordsFromText(ev.target.result);
    reader.readAsText(file);
    fileInput.value = '';
  });

  const dropzone = container.querySelector('#phxDropzone');
  dropzone?.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('phx-drag-over'); });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('phx-drag-over'));
  dropzone?.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('phx-drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => loadWordsFromText(ev.target.result);
    reader.readAsText(file);
  });

  container.querySelector('#phxActivityType')?.addEventListener('change', e => {
    state.activityType = e.target.value;
    const note = container.querySelector('#phxOnsetRimeNote');
    if (note) note.style.display = e.target.value === 'onsetRime' ? '' : 'none';
    renderPreview();
  });

  container.querySelector('#phxShowSolutions')?.addEventListener('change', e => {
    state.showSolutions = e.target.checked;
    renderPreview();
  });

  container.querySelector('#phxWordsPerPage')?.addEventListener('change', e => {
    const v = Number(e.target.value);
    if (v >= 1) { state.wordsPerPage = v; renderPreview(); }
  });

  container.querySelector('#phxDecodableOnly')?.addEventListener('change', e => {
    state.filters.decodableOnly = e.target.checked;
    onFiltersChanged();
  });

  container.querySelector('#phxMaxLevel')?.addEventListener('change', e => {
    state.filters.maxLevel = Number(e.target.value);
    onFiltersChanged();
  });

  [
    ['#phxDiffMin', 'diffMin'], ['#phxDiffMax', 'diffMax'],
    ['#phxPhonemeMin', 'phonemeMin'], ['#phxPhonemeMax', 'phonemeMax'],
    ['#phxLetterMin', 'letterMin'], ['#phxLetterMax', 'letterMax'],
    ['#phxSyllableMin', 'syllableMin'], ['#phxSyllableMax', 'syllableMax'],
  ].forEach(([id, key]) => {
    container.querySelector(id)?.addEventListener('change', e => {
      state.filters[key] = Number(e.target.value);
      onFiltersChanged();
    });
  });

  container.querySelector('.phx-pattern-filter')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-pattern]');
    if (!btn) return;
    const p = btn.dataset.pattern;
    if (state.filters.activePatterns.has(p)) {
      state.filters.activePatterns.delete(p);
      btn.classList.remove('phx-chip-active');
    } else {
      state.filters.activePatterns.add(p);
      btn.classList.add('phx-chip-active');
    }
    onFiltersChanged();
  });

  container.querySelector('.phx-sound-chips')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-sound]');
    if (!btn) return;
    const s = btn.dataset.sound;
    if (state.filters.activeSounds.has(s)) {
      state.filters.activeSounds.delete(s);
      btn.classList.remove('phx-chip-active');
    } else {
      state.filters.activeSounds.add(s);
      btn.classList.add('phx-chip-active');
    }
    onFiltersChanged();
  });

  container.querySelector('#phxWordSearch')?.addEventListener('input', e => {
    state.wordSearch = e.target.value.trim().toLowerCase();
    renderWordSelList();
  });

  container.querySelector('#phxBtnSelAll')?.addEventListener('click', () => {
    const pool = state.allWords.filter(matchesFilters);
    const visible = state.wordSearch
      ? pool.filter(r => r.word.toLowerCase().includes(state.wordSearch))
      : pool;
    const selectedSet = new Set(state.worksheetWords.map(r => r.word));
    visible.forEach(r => { if (!selectedSet.has(r.word)) state.worksheetWords.push(r); });
    renderWordSelList();
    renderPreview();
  });

  container.querySelector('#phxBtnSelNone')?.addEventListener('click', () => {
    const pool = state.allWords.filter(matchesFilters);
    const toRemove = new Set(
      (state.wordSearch
        ? pool.filter(r => r.word.toLowerCase().includes(state.wordSearch))
        : pool).map(r => r.word)
    );
    state.worksheetWords = state.worksheetWords.filter(r => !toRemove.has(r.word));
    renderWordSelList();
    renderPreview();
  });

  container.querySelector('#phxBtnShuffle')?.addEventListener('click', () => {
    for (let i = state.worksheetWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.worksheetWords[i], state.worksheetWords[j]] = [state.worksheetWords[j], state.worksheetWords[i]];
    }
    renderWordSelList();
    renderPreview();
  });

  container.querySelector('#phxBtnResetOrder')?.addEventListener('click', () => {
    state.worksheetWords = state.allWords.filter(matchesFilters);
    renderWordSelList();
    renderPreview();
  });

  container.querySelector('#phxWordSelList')?.addEventListener('click', e => {
    const add    = e.target.closest('.phx-btn-add');
    const up     = e.target.closest('.phx-btn-up');
    const down   = e.target.closest('.phx-btn-down');
    const remove = e.target.closest('.phx-btn-remove');

    if (add) {
      const word = add.dataset.word;
      const record = state.allWords.find(r => r.word === word);
      if (record && !state.worksheetWords.some(r => r.word === word)) {
        state.worksheetWords.push(record);
        renderWordSelList();
        renderPreview();
      }
      return;
    }

    const btn = up || down || remove;
    if (!btn) return;
    const i = Number(btn.dataset.idx);
    if (up && i > 0) {
      [state.worksheetWords[i - 1], state.worksheetWords[i]] =
        [state.worksheetWords[i], state.worksheetWords[i - 1]];
    } else if (down && i < state.worksheetWords.length - 1) {
      [state.worksheetWords[i], state.worksheetWords[i + 1]] =
        [state.worksheetWords[i + 1], state.worksheetWords[i]];
    } else if (remove) {
      state.worksheetWords.splice(i, 1);
    } else return;
    renderWordSelList();
    renderPreview();
  });
}

export function unmountPhonicsWorksheets() {
  state = makeState();
}
