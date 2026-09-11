import { extractWords, readFileAsText } from './extractor.js';

const state = {
  files: [],
  baseWordsList: [],     // original order — for append-delta
  baseWordsSet: new Set(),
  baseFileName: '',
  extracted: [],         // alpha-sorted unique words from source docs
  freq: {},              // word → occurrence count across source docs
  excluded: new Set(),   // user-deselected words
};

export function buildDictBuilderUI(container) {
  container.innerHTML = `
    <div class="db-tool">

      <div class="db-toolbar no-print">
        <div class="db-tb-row">

          <div class="wp-tb-group">
            <span class="wp-tb-grouplabel">Filter</span>
            <label class="tb-count-lbl" title="Minimum word length">Min
              <input class="tb-num" type="number" id="dbMinLen" value="3" min="1" max="20" />
            </label>
            <label class="tb-count-lbl" title="Maximum word length">Max
              <input class="tb-num" type="number" id="dbMaxLen" value="15" min="1" max="30" />
            </label>
            <label class="wp-sol-toggle" title="Convert to lowercase">
              <span class="toggle-switch" style="width:32px;height:18px;">
                <input type="checkbox" id="dbLowercase" checked />
                <span class="toggle-track"></span>
              </span>
              <span class="tb-count-lbl" style="color:var(--text-secondary)">lowercase</span>
            </label>
          </div>

          <span class="tb-vdiv"></span>

          <div class="wp-tb-group">
            <span class="wp-tb-grouplabel">Sort</span>
            <select class="tb-select" id="dbSortBy" title="Word sort order">
              <option value="alpha">Alphabetical</option>
              <option value="freq">By frequency</option>
            </select>
          </div>

          <div class="tb-actions" style="margin-left:auto">
            <button class="btn btn-primary btn-sm" id="dbBtnExtract">
              <i class="fas fa-magic"></i> Extract
            </button>
            <button class="btn btn-secondary btn-sm" id="dbBtnDownload" disabled
              title="Download extracted words as a standalone dictionary">
              <i class="fas fa-download"></i> Download
            </button>
            <button class="btn btn-secondary btn-sm" id="dbBtnMerge" disabled
              title="Combine base dictionary + new words, sort everything together">
              <i class="fas fa-compress-arrows-alt"></i> Full Merge
            </button>
            <button class="btn btn-secondary btn-sm" id="dbBtnAppend" disabled
              title="Keep base dictionary as-is, append only the net-new words at the end">
              <i class="fas fa-file-import"></i> Append Delta
            </button>
            <button class="btn btn-danger btn-sm" id="dbBtnClear">
              <i class="fas fa-times"></i> Clear
            </button>
          </div>

          <span class="tb-status status-msg info" id="dbStatus"></span>

        </div>
      </div>

      <div class="db-main">

        <div class="db-left">

          <p class="db-section-label">Source Documents</p>
          <div class="db-dropzone" id="dbDropzone">
            <i class="fas fa-cloud-upload-alt db-drop-icon"></i>
            <p class="db-drop-text">Drop files here or <span class="db-browse-link">browse</span></p>
            <p class="db-drop-hint">PDF · DOCX · ODT · TXT · CSV · MD</p>
            <input type="file" id="dbFileInput" multiple
              accept=".pdf,.docx,.odt,.txt,.md,.csv,.html,.text"
              style="display:none;" />
          </div>
          <div class="db-file-list" id="dbFileList"></div>

          <p class="db-section-label db-section-label-secondary">
            Base Dictionary <span class="db-optional">(optional — to merge/append)</span>
          </p>
          <div class="db-base-zone" id="dbBaseZone">
            <i class="fas fa-database"></i>
            <span>Drop .txt or <span class="db-browse-link">browse</span></span>
            <input type="file" id="dbBaseInput" accept=".txt,.text" style="display:none;" />
          </div>
          <div id="dbBaseInfo"></div>

        </div>

        <div class="db-right">
          <div class="db-summary" id="dbSummary"></div>
          <div class="db-word-grid" id="dbWordGrid">
            <div class="db-empty-hint">
              <i class="fas fa-book-open"></i>
              <p>Add files and click <strong>Extract</strong> to build a word list.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  resetState();
  wireEvents();
}

function resetState() {
  state.files = [];
  state.baseWordsList = [];
  state.baseWordsSet = new Set();
  state.baseFileName = '';
  state.extracted = [];
  state.freq = {};
  state.excluded = new Set();
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
    const lines = text.split(/\r?\n/).map(l => l.trim().toLowerCase()).filter(Boolean);
    state.baseWordsList = lines;
    state.baseWordsSet = new Set(lines);
    state.baseFileName = file.name;
    renderBaseInfo();
    updateActionButtons();
    if (state.extracted.length) { updateSummary(); renderWordGrid(); }
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
  if (state.extracted.length) { updateSummary(); renderWordGrid(); }
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

  setStatus('info', `Processing ${state.files.length} file(s)…`);

  try {
    const { words, freq, errors } = await extractWords(
      state.files,
      readOpts(),
      (i, total, name) => { if (name) setStatus('info', `Reading ${name} (${i + 1}/${total})…`); }
    );

    state.extracted = words;
    state.freq = freq;

    if (errors.length) {
      setStatus('error', `⚠️ ${errors.length} file(s) failed: ${errors.map(e => e.name).join(', ')}`);
    } else {
      setStatus('success', `<i class="fas fa-check-circle"></i> ${words.length} word${words.length !== 1 ? 's' : ''} extracted`);
    }

    updateSummary();
    renderWordGrid();
    updateActionButtons();
  } catch (err) {
    setStatus('error', `❌ ${err.message}`);
  } finally {
    if (extractBtn) extractBtn.disabled = false;
  }
}

// ── Results panel ─────────────────────────────────────────────────────────────

function updateSummary() {
  const el = document.getElementById('dbSummary');
  if (!el) return;
  if (!state.extracted.length) { el.innerHTML = ''; return; }

  const total = state.extracted.length;
  const excl  = state.excluded.size;
  const newCt = state.extracted.filter(w => !state.baseWordsSet.has(w)).length;
  const exCt  = total - newCt;

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
  html += `<span class="db-sum-sep">·</span><span class="db-sum-hint">click word to exclude</span>`;
  el.innerHTML = html;
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
    const isExisting = state.baseWordsSet.has(w);
    const isExcluded = state.excluded.has(w);
    const cnt = state.freq[w] || 1;
    const badge = cnt > 1 ? `<sup class="db-freq">${cnt}</sup>` : '';
    let cls = `db-word-item${isExisting ? ' db-word-existing' : ' db-word-new'}${isExcluded ? ' db-word-excluded' : ''}`;
    return `<div class="${cls}" data-word="${w}" title="${cnt} occurrence${cnt !== 1 ? 's' : ''}">${w}${badge}</div>`;
  }).join('');
}

// ── Action buttons ────────────────────────────────────────────────────────────

function updateActionButtons() {
  const hasBase    = state.baseWordsList.length > 0;
  const hasActive  = state.extracted.some(w => !state.excluded.has(w));
  const hasNewDelta = hasActive && state.extracted.some(w => !state.excluded.has(w) && !state.baseWordsSet.has(w));

  const dlBtn     = document.getElementById('dbBtnDownload');
  const mergeBtn  = document.getElementById('dbBtnMerge');
  const appendBtn = document.getElementById('dbBtnAppend');

  if (dlBtn)     dlBtn.disabled     = !hasActive;
  if (mergeBtn)  mergeBtn.disabled  = !(hasBase && hasActive);
  if (appendBtn) appendBtn.disabled = !(hasBase && hasNewDelta);
}

// ── Downloads ─────────────────────────────────────────────────────────────────

function activeExtracted() {
  return getSortedWords().filter(w => !state.excluded.has(w));
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
  const blob = new Blob([words.join('\n')], { type: 'text/plain' });
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
  const newOnly = state.extracted.filter(w => !state.excluded.has(w) && !state.baseWordsSet.has(w));
  const merged  = [...new Set([...state.baseWordsList, ...newOnly])];
  merged.sort((a, b) => a.localeCompare(b));
  downloadTxt(merged, `${baseStem()}_merged_${timestamp()}.txt`);
}

function doDownloadAppendDelta() {
  const delta = state.extracted
    .filter(w => !state.excluded.has(w) && !state.baseWordsSet.has(w))
    .sort((a, b) => a.localeCompare(b));
  downloadTxt([...state.baseWordsList, ...delta], `${baseStem()}_updated_${timestamp()}.txt`);
}

// ── Clear ─────────────────────────────────────────────────────────────────────

function doClear() {
  state.files = [];
  state.extracted = [];
  state.freq = {};
  state.excluded = new Set();
  renderFileList();
  renderWordGrid();
  const sum = document.getElementById('dbSummary');
  if (sum) sum.innerHTML = '';
  updateActionButtons();
  setStatus('info', '');
  // Base dictionary is kept intentionally — it's a separate persistent input
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(type, html) {
  const el = document.getElementById('dbStatus');
  if (!el) return;
  el.className = `tb-status status-msg ${type}`;
  el.innerHTML = html;
}

// ── Wire events ───────────────────────────────────────────────────────────────

function wireEvents() {
  document.getElementById('dbBtnExtract')?.addEventListener('click', runExtract);
  document.getElementById('dbBtnDownload')?.addEventListener('click', doDownloadStandalone);
  document.getElementById('dbBtnMerge')?.addEventListener('click', doDownloadFullMerge);
  document.getElementById('dbBtnAppend')?.addEventListener('click', doDownloadAppendDelta);
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

  // Click-to-exclude (event delegation — survives re-renders)
  document.getElementById('dbWordGrid')?.addEventListener('click', e => {
    const item = e.target.closest('.db-word-item');
    if (!item) return;
    const word = item.dataset.word;
    if (!word) return;
    if (state.excluded.has(word)) {
      state.excluded.delete(word);
      item.classList.remove('db-word-excluded');
    } else {
      state.excluded.add(word);
      item.classList.add('db-word-excluded');
    }
    updateSummary();
    updateActionButtons();
  });

  // Sort re-renders without re-extracting
  document.getElementById('dbSortBy')?.addEventListener('change', () => {
    if (state.extracted.length) renderWordGrid();
  });
}

export function unmount() {
  resetState();
}
