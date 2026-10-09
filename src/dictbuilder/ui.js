import { extractWords, findPossiblePlurals, readFileAsText } from './extractor.js';
import { themeToggleMarkup, infoPaneTabsMarkup, wireInfoPaneTabs } from '../shared/shell-ui.js';
import PhonicsEngine from '../phonics/PhonicsEngine.mjs';
import { renderWordDetail } from '../shared/phonicsWordDetail.js';
import { DEFAULT_COMMON_WORDS } from '../shared/default-common-words.js';
import { speakText, speakSequence, isSpeechSupported, cancelSpeech } from '../shared/speech.js';
import { tokenizeManualInput } from './manual-entry-helpers.js';

const state = {
  files: [],
  baseWordsList: [],     // original order — for append-delta
  baseWordsSet: new Set(),
  baseFileName: '',
  extracted: [],         // alpha-sorted unique words from source docs
  freq: {},              // word → occurrence count across source docs
  pluralInfo: {},
  excluded: new Set(),   // user-deselected words
  phonicsByWord: Object.create(null), // word → Record from PhonicsEngine (no is_common)
  flagged: [],           // [{ word, record, note, flaggedAt }]
  selectedWord: null,
};

// Assigned once at mount via wireInfoPaneTabs — used by selectWord()
let infoPaneTabs = null;

// ── Notes tab static content ──────────────────────────────────────────────────

const NOTES_HTML = `
  <div class="wd-notes">
    <div>
      <h3>Extract</h3>
      <p>Scans your source documents and builds a unique, sorted word list. Words are
      filtered by length and lowercase setting. Likely plurals are flagged automatically.</p>
    </div>
    <div>
      <h3>Enrich</h3>
      <p>Runs phonics analysis on every extracted word using the Phase 3 engine. This is
      an opt-in step — not automatic — because analysis is computed per-word and you may
      want to review the word list first.</p>
      <p>Enrichment is cached for the session: re-running Enrich or re-extracting the same
      words never recomputes words already analyzed.</p>
    </div>
    <div>
      <h3>Word grid</h3>
      <ul>
        <li><strong>Click a word's text</strong> to select it and view its phonics detail.</li>
        <li><strong>Click the × button</strong> to exclude a word from export.</li>
        <li>Superscript numbers are frequency counts across all source documents.</li>
        <li>Blue words are possible plurals. Grey words already exist in the base dictionary.</li>
      </ul>
    </div>
    <div>
      <h3>Flagging</h3>
      <p>In the Detail tab, use the Flag control to mark a word for follow-up. Add an optional
      note explaining the issue, then click <em>Flag</em>. Use <em>Export flags</em> to download
      the collected flags as JSON — this file is the input for the Phase 2 Constructs Workbench
      when a teacher finds something that needs a correction.</p>
    </div>
  </div>`;

export function buildDictBuilderUI(container) {
  container.innerHTML = `
    <div class="db-tool tool-shell">

      <div class="tool-header tool-worksheet-header no-print">
        <div class="tool-header-main">
          <span class="tool-header-title">Dictionary Builder</span>
          <span class="tool-header-status tb-status status-msg info" id="dbStatus"></span>
        </div>

        <div class="tool-header-actions">
          <div class="tool-primary-actions">
            <button class="btn btn-primary btn-sm" id="dbBtnExtract">
              <i class="fas fa-magic"></i> Extract
            </button>
            <button class="btn btn-secondary btn-sm" id="dbBtnEnrich" disabled
              title="Run phonics analysis on extracted words">
              <i class="fas fa-microscope"></i> Enrich
            </button>
            <span class="tool-action-separator" aria-hidden="true"></span>
            <button class="btn btn-secondary btn-sm" id="dbBtnDownload" disabled
              title="Download extracted words as a standalone dictionary">
              <i class="fas fa-download"></i> Download
            </button>
            <button class="btn btn-secondary btn-sm" id="dbBtnMerge" disabled
              title="Combine base dictionary + new words, sort everything together">
              <i class="fas fa-compress-arrows-alt"></i> Merge
            </button>
            <button class="btn btn-secondary btn-sm" id="dbBtnAppend" disabled
              title="Keep base dictionary as-is, append only the net-new words at the end">
              <i class="fas fa-file-import"></i> Append
            </button>
            <button class="btn btn-secondary btn-sm" id="dbBtnPhonicsCSV" disabled
              title="Export phonics analysis as CSV (requires Enrich)">
              <i class="fas fa-file-csv"></i> Export
            </button>
            <span class="tool-action-separator" aria-hidden="true"></span>
            <button class="btn btn-danger btn-sm" id="dbBtnClear">
              <i class="fas fa-times"></i> Clear
            </button>
          </div>
          <div class="tool-secondary-actions">
            <span class="tool-theme-slot">${themeToggleMarkup()}</span>
          </div>
        </div>
      </div>

      <div class="db-main tool-body">

        <div class="db-left tool-settings no-print">

          <section class="db-settings-section">
            <div class="db-section-label">Filter</div>

            <div class="db-field-row db-field-row-compact">
              <label for="dbMinLen">Min length</label>
              <input class="tb-num" type="number" id="dbMinLen" value="5" min="1" max="20" />
            </div>

            <div class="db-field-row db-field-row-compact">
              <label for="dbMaxLen">Max length</label>
              <input class="tb-num" type="number" id="dbMaxLen" value="15" min="3" max="30" />
            </div>

            <label class="db-toggle-row" title="Convert to lowercase">
              <span>Lowercase</span>
              <span class="toggle-switch toggle-sm">
                <input type="checkbox" id="dbLowercase" checked />
                <span class="toggle-track"></span>
              </span>
            </label>

            <label class="db-toggle-row" title="Keep likely plurals visible, but exclude them from downloads by default">
              <span>Exclude plurals</span>
              <span class="toggle-switch toggle-sm">
                <input type="checkbox" id="dbExcludePlurals" checked />
                <span class="toggle-track"></span>
              </span>
            </label>
          </section>

          <section class="db-settings-section">
            <div class="db-section-label">Add Words Manually</div>
            <input type="text" class="db-manual-input" id="dbManualInput"
              placeholder="e.g. caveat react theater" />
            <div class="db-manual-preview" id="dbManualPreview"></div>
            <button class="btn btn-sm btn-secondary" id="dbManualAddAll" disabled>
              Add all
            </button>
          </section>

          <section class="db-settings-section">
            <div class="db-section-label">Sort</div>
            <div class="db-field-row">
              <label for="dbSortBy">Order</label>
              <select class="tb-select" id="dbSortBy" title="Word sort order">
                <option value="alpha">Alphabetical</option>
                <option value="freq">By frequency</option>
              </select>
            </div>
          </section>

          <section class="db-settings-section">
            <div class="db-section-label">Source Documents</div>
            <div class="db-dropzone" id="dbDropzone">
              <i class="fas fa-cloud-upload-alt db-drop-icon"></i>
              <p class="db-drop-text">Drop files here or <span class="db-browse-link">browse</span></p>
              <p class="db-drop-hint">PDF / DOCX / ODT / TXT / CSV / MD</p>
              <input type="file" id="dbFileInput" multiple
                accept=".pdf,.docx,.odt,.txt,.md,.csv,.html,.text"
                style="display:none;" />
            </div>
            <div class="db-file-list" id="dbFileList"></div>
          </section>

          <section class="db-settings-section">
            <div class="db-section-label">
              Base Dictionary <span class="db-optional">(optional)</span>
            </div>
            <div class="db-base-zone" id="dbBaseZone">
              <i class="fas fa-database"></i>
              <span>Drop .txt or <span class="db-browse-link">browse</span></span>
              <input type="file" id="dbBaseInput" accept=".txt,.text" style="display:none;" />
            </div>
            <div id="dbBaseInfo"></div>
          </section>

        </div>

        <div class="db-right tool-preview">
          <div class="db-results-scroll">
            <div class="db-summary" id="dbSummary"></div>
            <div class="db-word-grid" id="dbWordGrid">
              <div class="db-empty-hint">
                <i class="fas fa-book-open"></i>
                <p>Add files and click <strong>Extract</strong> to build a word list.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="tool-info-pane" id="dbInfoPane"></div>

      </div>
    </div>
  `;

  // Initialize info pane tabs
  const infoPane = container.querySelector('#dbInfoPane');
  infoPane.innerHTML = infoPaneTabsMarkup([
    { id: 'notes',  label: 'Notes',  icon: 'fa-sticky-note' },
    { id: 'detail', label: 'Detail', icon: 'fa-microscope'  },
  ]);
  infoPane.querySelector('[data-panel="notes"]').innerHTML = NOTES_HTML;
  infoPaneTabs = wireInfoPaneTabs(infoPane);

  resetState();
  wireEvents();
  renderDetailPanel(); // initialize Detail tab with "no word selected" state
}

function resetState() {
  state.files = [];
  state.baseWordsList = [];
  state.baseWordsSet = new Set();
  state.baseFileName = '';
  state.extracted = [];
  state.freq = {};
  state.pluralInfo = {};
  state.excluded = new Set();
  state.phonicsByWord = Object.create(null);
  state.flagged = [];
  state.selectedWord = null;
}

// ── Options ──────────────────────────────────────────────────────────────────

function readOpts() {
  const n = (id, fb) => { const v = parseInt(document.getElementById(id)?.value ?? '', 10); return isNaN(v) ? fb : v; };
  return {
    minLen:    n('dbMinLen', 3),
    maxLen:    n('dbMaxLen', 15),
    lowercase: document.getElementById('dbLowercase')?.checked ?? true,
  };
}

function getSortedWords() {
  const sortBy = document.getElementById('dbSortBy')?.value ?? 'alpha';
  if (sortBy === 'freq') {
    return [...state.extracted].sort((a, b) =>
      (state.freq[b] || 0) - (state.freq[a] || 0) || a.localeCompare(b)
    );
  }
  return [...state.extracted]; // already alpha-sorted from tokenize()
}

// ── Source documents ─────────────────────────────────────────────────────────

function addFiles(newFiles) {
  const existing = new Set(state.files.map(f => f.name + f.size));
  for (const f of newFiles) {
    if (!existing.has(f.name + f.size)) {
      state.files.push(f);
      existing.add(f.name + f.size);
    }
  }
  renderFileList();
}

function removeFile(idx) {
  state.files.splice(idx, 1);
  renderFileList();
}

function renderFileList() {
  const list = document.getElementById('dbFileList');
  if (!list) return;
  if (!state.files.length) { list.innerHTML = ''; return; }
  list.innerHTML = state.files.map((f, i) => `
    <div class="db-file-item">
      <span class="db-file-name" title="${f.name}">
        <i class="fas ${fileIcon(f.name)}"></i> ${f.name}
      </span>
      <button class="db-file-remove btn-icon" data-idx="${i}" title="Remove">
        <i class="fas fa-times"></i>
      </button>
    </div>`).join('');

  list.querySelectorAll('.db-file-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFile(+btn.dataset.idx));
  });
}

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  return ({ pdf: 'fa-file-pdf', docx: 'fa-file-word', odt: 'fa-file-alt',
            csv: 'fa-file-csv', md: 'fa-file-alt' })[ext] ?? 'fa-file-alt';
}

// ── Base dictionary ──────────────────────────────────────────────────────────

async function loadBaseDictionary(file) {
  try {
    const text = await readFileAsText(file);
    const lines = text.split(/\r?\n/).map(l => normalizeDownloadWord(l.trim())).filter(Boolean);
    state.baseWordsList = lines;
    state.baseWordsSet = new Set(lines);
    state.baseFileName = file.name;
    renderBaseInfo();
    updateActionButtons();
    if (state.extracted.length) {
      refreshPluralInfo();
      applyPluralExclusions();
      updateSummary();
      renderWordGrid();
    }
  } catch (err) {
    setStatus('error', `❌ ${err.message}`);
  }
}

function clearBaseDictionary() {
  state.baseWordsList = [];
  state.baseWordsSet = new Set();
  state.baseFileName = '';
  renderBaseInfo();
  updateActionButtons();
  if (state.extracted.length) {
    refreshPluralInfo();
    applyPluralExclusions();
    updateSummary();
    renderWordGrid();
  }
}

function renderBaseInfo() {
  const info = document.getElementById('dbBaseInfo');
  const zone = document.getElementById('dbBaseZone');
  if (!info || !zone) return;
  if (!state.baseFileName) {
    info.innerHTML = '';
    zone.style.display = '';
    return;
  }
  zone.style.display = 'none';
  info.innerHTML = `
    <div class="db-file-item db-base-loaded">
      <span class="db-file-name">
        <i class="fas fa-list"></i> ${state.baseFileName}
        <span class="db-base-count">${state.baseWordsList.length} words</span>
      </span>
      <button class="db-file-remove btn-icon" id="dbBaseClearBtn" title="Remove base dictionary">
        <i class="fas fa-times"></i>
      </button>
    </div>`;
  document.getElementById('dbBaseClearBtn')?.addEventListener('click', clearBaseDictionary);
}

// ── Extract ──────────────────────────────────────────────────────────────────

async function runExtract() {
  if (!state.files.length) {
    setStatus('error', 'Add at least one source document first.');
    return;
  }
  const extractBtn = document.getElementById('dbBtnExtract');
  if (extractBtn) extractBtn.disabled = true;
  state.excluded = new Set();
  state.selectedWord = null;

  setStatus('info', `Processing ${state.files.length} file(s)…`);

  try {
    const { words, freq, pluralInfo, errors } = await extractWords(
      state.files,
      readOpts(),
      (i, total, name) => { if (name) setStatus('info', `Reading ${name} (${i + 1}/${total})…`); }
    );

    state.extracted = words;
    state.freq = freq;
    state.pluralInfo = pluralInfo;
    refreshPluralInfo();
    applyPluralExclusions();

    if (errors.length) {
      setStatus('error', `⚠️ ${errors.length} file(s) failed: ${errors.map(e => e.name).join(', ')}`);
    } else {
      setStatus('success', `<i class="fas fa-check-circle"></i> ${words.length} word${words.length !== 1 ? 's' : ''} extracted`);
    }

    updateSummary();
    renderWordGrid();
    updateActionButtons();
    renderDetailPanel(); // reset detail (selection was cleared)
  } catch (err) {
    setStatus('error', `❌ ${err.message}`);
  } finally {
    if (extractBtn) extractBtn.disabled = false;
  }
}

// ── Enrich ────────────────────────────────────────────────────────────────────

function runEnrich() {
  const toEnrich = state.extracted.filter(w => !(w in state.phonicsByWord));
  if (!toEnrich.length) {
    setStatus('info', 'Already enriched.');
    return;
  }
  const records = PhonicsEngine.parseWords(toEnrich);
  records.forEach(r => { state.phonicsByWord[r.word] = r; });
  updateSummary();
  renderWordGrid();
  updateActionButtons();
  if (state.selectedWord) renderDetailPanel(); // refresh if open word just got enriched
  setStatus('success', `<i class="fas fa-check-circle"></i> ${records.length} word${records.length !== 1 ? 's' : ''} enriched`);
}

// ── Selection and detail panel ─────────────────────────────────────────────────

function selectWord(word) {
  if (!word) return;
  cancelSpeech();
  state.selectedWord = word;
  renderWordGrid();
  renderDetailPanel();
  infoPaneTabs?.activate('detail'); // auto-switch — unconditional per spec §4
}

function isCommon(word) {
  if (state.baseWordsList.length) return state.baseWordsSet.has(word);
  return DEFAULT_COMMON_WORDS.has(word);
}

function renderDetailPanel() {
  const panel = document.querySelector('#dbInfoPane .info-tab-panel[data-panel="detail"]');
  if (!panel) return;

  const word   = state.selectedWord;
  const record = word ? state.phonicsByWord[word] : null;

  panel.innerHTML = renderWordDetail(word, record, {
    freq:           word ? (state.freq[word] || 1) : 0,
    isCommon:       word ? isCommon(word) : null,
    alreadyFlagged: word ? state.flagged.some(f => f.word === word) : false,
    flagCount:      state.flagged.length,
  });

  // Wire flag button (only present in enriched state)
  const flagBtn = panel.querySelector('[data-action="flag"]');
  if (flagBtn && !flagBtn.disabled) {
    flagBtn.addEventListener('click', () => {
      const noteInput = panel.querySelector('[data-flag-note]');
      const note = noteInput?.value.trim() || '';
      state.flagged.push({
        word,
        record,
        note,
        flaggedAt: new Date().toISOString(),
      });
      if (noteInput) noteInput.value = '';
      flagBtn.innerHTML = '<i class="fas fa-check"></i> Flagged';
      flagBtn.disabled = true;
      updateActionButtons();
      // Re-render to update export-flags button count
      renderDetailPanel();
    });
  }

  // Wire export-flags button
  const exportBtn = panel.querySelector('[data-action="export-flags"]');
  exportBtn?.addEventListener('click', doExportFlagsJSON);

  // Wire TTS buttons (only present in enriched state)
  const speakWordBtn = panel.querySelector('[data-action="speak-word"]');
  const speakSylBtn  = panel.querySelector('[data-action="speak-syllables"]');
  if (!isSpeechSupported()) {
    [speakWordBtn, speakSylBtn].forEach(b => {
      if (b) { b.disabled = true; b.title = 'Text-to-speech not supported in this browser'; }
    });
  } else {
    speakWordBtn?.addEventListener('click', () => speakText(word));
    speakSylBtn?.addEventListener('click',  () => speakSequence(PhonicsEngine.splitSyllables(word)));
  }
}

// ── Exclude ───────────────────────────────────────────────────────────────────

function toggleExclude(word) {
  if (!word) return;
  if (state.excluded.has(word)) {
    state.excluded.delete(word);
  } else {
    state.excluded.add(word);
  }
  // Toggle class on the item in-place without full grid re-render
  const item = document.querySelector(`#dbWordGrid .db-word-item[data-word="${word}"]`);
  item?.classList.toggle('db-word-excluded', state.excluded.has(word));
  updateSummary();
  updateActionButtons();
}

// ── Results panel ─────────────────────────────────────────────────────────────

function updateSummary() {
  const el = document.getElementById('dbSummary');
  if (!el) return;
  if (!state.extracted.length) { el.innerHTML = ''; return; }

  const total    = state.extracted.length;
  const excl     = state.excluded.size;
  const pluralCt = Object.keys(state.pluralInfo).length;
  const newCt    = state.extracted.filter(w => !hasBaseWord(w)).length;
  const exCt     = total - newCt;
  const enrichedCt = Object.keys(state.phonicsByWord).length;

  let html = '';
  if (state.baseWordsList.length) {
    html += `<span class="db-sum-chip db-sum-existing">${exCt} in base</span>`;
    html += `<span class="db-sum-sep">·</span>`;
    html += `<span class="db-sum-chip db-sum-new">${newCt} new</span>`;
  } else {
    html += `<span class="db-sum-chip db-sum-new">${total} word${total !== 1 ? 's' : ''}</span>`;
  }
  if (excl) {
    html += `<span class="db-sum-sep">·</span><span class="db-sum-chip db-sum-excluded">${excl} excluded</span>`;
  }
  if (pluralCt) {
    html += `<span class="db-sum-sep">&middot;</span><span class="db-sum-chip db-sum-plural">${pluralCt} possible plural${pluralCt !== 1 ? 's' : ''}</span>`;
  }
  if (enrichedCt) {
    html += `<span class="db-sum-sep">·</span><span class="db-sum-chip db-sum-enriched">${enrichedCt} enriched</span>`;
  }
  html += `<span class="db-sum-sep">·</span><span class="db-sum-hint">click × to exclude</span>`;
  el.innerHTML = html;
}

function excludePluralsEnabled() {
  return document.getElementById('dbExcludePlurals')?.checked ?? true;
}

function refreshPluralInfo() {
  state.pluralInfo = findPossiblePlurals(state.extracted, state.baseWordsList);
}

function applyPluralExclusions() {
  if (!excludePluralsEnabled()) {
    for (const word of Object.keys(state.pluralInfo)) {
      state.excluded.delete(word);
    }
    return;
  }

  for (const word of Object.keys(state.pluralInfo)) {
    state.excluded.add(word);
  }
}

function renderWordGrid() {
  const grid = document.getElementById('dbWordGrid');
  if (!grid) return;

  if (!state.extracted.length) {
    grid.innerHTML = `
      <div class="db-empty-hint">
        <i class="fas fa-book-open"></i>
        <p>Add files and click <strong>Extract</strong> to build a word list.</p>
      </div>`;
    return;
  }

  grid.innerHTML = getSortedWords().map(w => {
    const isExisting = hasBaseWord(w);
    const isExcluded = state.excluded.has(w);
    const isSelected = state.selectedWord === w;
    const isEnriched = w in state.phonicsByWord;
    const pluralBase = state.pluralInfo[w];
    const isPlural   = Boolean(pluralBase);
    const cnt        = state.freq[w] || 1;
    const badge      = cnt > 1 ? `<sup class="db-freq">${cnt}</sup>` : '';
    const pluralTitle = isPlural ? `; possible plural of "${pluralBase}"` : '';
    const cls = [
      'db-word-item',
      isExisting ? 'db-word-existing' : 'db-word-new',
      isPlural   ? 'db-word-plural'   : '',
      isExcluded ? 'db-word-excluded' : '',
      isSelected ? 'selected'         : '',
      isEnriched ? 'db-word-enriched' : '',
    ].filter(Boolean).join(' ');
    return `
      <div class="${cls}" data-word="${w}"
           title="${cnt} occurrence${cnt !== 1 ? 's' : ''}${pluralTitle}">
        <button class="db-word-select" data-word="${w}">${w}${badge}</button>
        <button class="db-word-exclude-btn" data-word="${w}"
          title="Exclude from export" aria-label="Exclude ${w}">
          <i class="fas fa-times"></i>
        </button>
      </div>`;
  }).join('');
}

// ── Action buttons ────────────────────────────────────────────────────────────

function updateActionButtons() {
  const hasBase     = state.baseWordsList.length > 0;
  const hasActive   = state.extracted.some(w => !state.excluded.has(w));
  const hasNewDelta = hasActive && state.extracted.some(w => !state.excluded.has(w) && !hasBaseWord(w));
  const hasEnriched = Object.keys(state.phonicsByWord).length > 0;

  const enrichBtn = document.getElementById('dbBtnEnrich');
  const dlBtn     = document.getElementById('dbBtnDownload');
  const mergeBtn  = document.getElementById('dbBtnMerge');
  const appendBtn = document.getElementById('dbBtnAppend');
  const csvBtn    = document.getElementById('dbBtnPhonicsCSV');

  if (enrichBtn) enrichBtn.disabled = !state.extracted.length;
  if (dlBtn)     dlBtn.disabled     = !hasActive;
  if (mergeBtn)  mergeBtn.disabled  = !(hasBase && hasActive);
  if (appendBtn) appendBtn.disabled = !(hasBase && hasNewDelta);
  if (csvBtn)    csvBtn.disabled    = !hasEnriched;
}

// ── Downloads ─────────────────────────────────────────────────────────────────

function activeExtracted() {
  return getSortedWords().filter(w => !state.excluded.has(w));
}

function isAllCapsDownloadWord(word) {
  const letters = word.replace(/[^a-zA-Z]/g, '');
  return letters.length > 1 && letters === letters.toUpperCase();
}

function normalizeDownloadWord(word) {
  if (!word) return '';
  return isAllCapsDownloadWord(word) ? word : word.toLowerCase();
}

function normalizeDownloadWords(words) {
  return [...new Set(words.map(normalizeDownloadWord).filter(Boolean))];
}

function hasBaseWord(word) {
  return state.baseWordsSet.has(normalizeDownloadWord(word));
}

function timestamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function baseStem() {
  return state.baseFileName.replace(/\.[^.]+$/, '') || 'dictionary';
}

function downloadTxt(words, filename) {
  const blob = new Blob([normalizeDownloadWords(words).join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function doDownloadStandalone() {
  downloadTxt(activeExtracted(), `dictionary_${timestamp()}.txt`);
}

function doDownloadFullMerge() {
  const newOnly = state.extracted.filter(w => !state.excluded.has(w) && !hasBaseWord(w));
  const merged  = normalizeDownloadWords([...state.baseWordsList, ...newOnly]);
  merged.sort((a, b) => a.localeCompare(b));
  downloadTxt(merged, `${baseStem()}_merged_${timestamp()}.txt`);
}

function doDownloadAppendDelta() {
  const delta = normalizeDownloadWords(state.extracted
    .filter(w => !state.excluded.has(w) && !hasBaseWord(w))
  ).sort((a, b) => a.localeCompare(b));
  downloadTxt([...state.baseWordsList, ...delta], `${baseStem()}_updated_${timestamp()}.txt`);
}

function doExportPhonicsCSV() {
  const rows = activeExtracted().map(word => ({
    ...(state.phonicsByWord[word] || { word }),
    is_common: isCommon(word),
  }));
  const csv = PhonicsEngine.toCSV(rows, { extended: true, extraColumns: ['is_common'] });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `phonics_${timestamp()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('success', 'CSV exported — load it in <strong>Phonics Worksheets → Word Source</strong> to generate worksheets.');
}

function doExportFlagsJSON() {
  if (!state.flagged.length) return;
  const json = JSON.stringify(state.flagged, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `phonics-flags_${timestamp()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Clear ─────────────────────────────────────────────────────────────────────

function doClear() {
  state.files = [];
  state.extracted = [];
  state.freq = {};
  state.pluralInfo = {};
  state.excluded = new Set();
  state.phonicsByWord = Object.create(null);
  state.flagged = [];
  state.selectedWord = null;
  renderFileList();
  renderWordGrid();
  const sum = document.getElementById('dbSummary');
  if (sum) sum.innerHTML = '';
  updateActionButtons();
  setStatus('info', '');
  renderDetailPanel();
  // Manual entry cleared on Clear — extracted list is gone so any preview is stale
  const manualInput = document.getElementById('dbManualInput');
  if (manualInput) manualInput.value = '';
  renderManualPreview();
  // Base dictionary is kept intentionally — it's a separate persistent input
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(type, html) {
  const el = document.getElementById('dbStatus');
  if (!el) return;
  el.className = `tb-status status-msg ${type}`;
  el.innerHTML = html;
}

// ── Manual word entry ─────────────────────────────────────────────────────────

function addManualWord(word) {
  if (state.extracted.includes(word)) return; // defensive; UI prevents this
  const record = PhonicsEngine.parseWord(word);
  if (!record) return;

  state.extracted.push(word);
  state.phonicsByWord[word] = record; // cache immediately — already computed for preview
  state.freq[word] = state.freq[word] || 1;

  // Deliberately does NOT call findPossiblePlurals/applyPluralExclusions — §B.3:
  // re-running plural detection on manual add risks silently changing exclusion
  // state on words the teacher already curated.
  updateSummary();
  renderWordGrid();
  updateActionButtons();
  selectWord(word);
}

let _manualDebounce = null;

function renderManualPreview() {
  const raw     = document.getElementById('dbManualInput')?.value ?? '';
  const tokens  = tokenizeManualInput(raw);
  const preview = document.getElementById('dbManualPreview');
  const addAll  = document.getElementById('dbManualAddAll');
  if (!preview) return;

  if (!tokens.length) {
    preview.innerHTML = '';
    if (addAll) addAll.disabled = true;
    return;
  }

  let anyAddable = false;
  preview.innerHTML = tokens.map(({ cleaned }) => {
    const inDict = state.extracted.includes(cleaned);
    if (!inDict) anyAddable = true;
    return `
      <div class="db-manual-row">
        <span class="db-manual-word">${cleaned}</span>
        ${inDict
          ? `<span class="db-manual-status">already in dictionary</span>`
          : `<button class="btn btn-xs btn-primary db-manual-add-btn"
               data-manual-add="${cleaned}">Add</button>`
        }
      </div>`;
  }).join('');

  if (addAll) addAll.disabled = !anyAddable;

  preview.querySelectorAll('.db-manual-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addManualWord(btn.dataset.manualAdd);
      renderManualPreview();
    });
  });
}

// ── Wire events ───────────────────────────────────────────────────────────────

function wireEvents() {
  document.getElementById('dbBtnExtract')?.addEventListener('click', runExtract);
  document.getElementById('dbBtnEnrich')?.addEventListener('click', runEnrich);
  document.getElementById('dbBtnDownload')?.addEventListener('click', doDownloadStandalone);
  document.getElementById('dbBtnMerge')?.addEventListener('click', doDownloadFullMerge);
  document.getElementById('dbBtnAppend')?.addEventListener('click', doDownloadAppendDelta);
  document.getElementById('dbBtnPhonicsCSV')?.addEventListener('click', doExportPhonicsCSV);
  document.getElementById('dbBtnClear')?.addEventListener('click', doClear);

  // Source documents drop zone
  const dropzone  = document.getElementById('dbDropzone');
  const fileInput = document.getElementById('dbFileInput');
  dropzone?.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('db-drag-over'); });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('db-drag-over'));
  dropzone?.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('db-drag-over');
    addFiles(Array.from(e.dataTransfer.files));
  });
  dropzone?.addEventListener('click', e => {
    if (e.target.closest('.db-file-remove')) return;
    fileInput?.click();
  });
  fileInput?.addEventListener('change', e => {
    addFiles(Array.from(e.target.files));
    e.target.value = '';
  });

  // Base dictionary zone
  const baseZone  = document.getElementById('dbBaseZone');
  const baseInput = document.getElementById('dbBaseInput');
  baseZone?.addEventListener('dragover', e => { e.preventDefault(); baseZone.classList.add('db-drag-over'); });
  baseZone?.addEventListener('dragleave', () => baseZone.classList.remove('db-drag-over'));
  baseZone?.addEventListener('drop', e => {
    e.preventDefault();
    baseZone.classList.remove('db-drag-over');
    const f = e.dataTransfer.files[0];
    if (f) loadBaseDictionary(f);
  });
  baseZone?.addEventListener('click', () => baseInput?.click());
  baseInput?.addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) loadBaseDictionary(f);
    e.target.value = '';
  });

  // Word grid — two delegated handlers: exclude-btn and select-btn
  document.getElementById('dbWordGrid')?.addEventListener('click', e => {
    const excludeBtn = e.target.closest('.db-word-exclude-btn');
    if (excludeBtn) {
      toggleExclude(excludeBtn.dataset.word);
      return;
    }
    const selectBtn = e.target.closest('.db-word-select');
    if (selectBtn) selectWord(selectBtn.dataset.word);
  });

  // Sort re-renders without re-extracting
  document.getElementById('dbSortBy')?.addEventListener('change', () => {
    if (state.extracted.length) renderWordGrid();
  });

  document.getElementById('dbExcludePlurals')?.addEventListener('change', () => {
    if (!state.extracted.length) return;
    applyPluralExclusions();
    updateSummary();
    renderWordGrid();
    updateActionButtons();
  });

  document.getElementById('dbManualInput')?.addEventListener('input', () => {
    clearTimeout(_manualDebounce);
    _manualDebounce = setTimeout(renderManualPreview, 300);
  });

  document.getElementById('dbManualAddAll')?.addEventListener('click', () => {
    const raw = document.getElementById('dbManualInput')?.value ?? '';
    tokenizeManualInput(raw)
      .filter(t => !state.extracted.includes(t.cleaned))
      .forEach(t => addManualWord(t.cleaned));
    renderManualPreview();
  });
}

export function unmount() {
  resetState();
  infoPaneTabs = null;
}
