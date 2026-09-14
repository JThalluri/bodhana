import {
  setSeed, TYPE_GENERATORS, TYPE_NAMES,
} from './pv-generator.js';

let _pvListeners = [];

function on(el, evt, fn) {
  if (!el) return;
  el.addEventListener(evt, fn);
  _pvListeners.push({ el, evt, fn });
}

export function unmountPlaceValue() {
  _pvListeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
  _pvListeners = [];
}

// ─── Build UI ─────────────────────────────────────────────────────────────────

export function buildPlaceValueUI(container) {
  container.innerHTML = `
    <div class="pv-tool">

      <!-- Toolbar -->
      <div class="pv-toolbar no-print">
        <div class="pv-tb-row">

          <div style="display:flex;align-items:center;gap:6px;">
            <span class="mw-typebar-label">Worksheet Type</span>
            <select class="tb-select" id="pvType" style="min-width:220px;">
              <option value="type1">1. Examining Number Value</option>
              <option value="type2">2. Place Value Chart</option>
              <option value="type3">3. Build a Number (Expanded Form)</option>
              <option value="type4">4. Missing Place Value</option>
              <option value="type5">5. Word Form</option>
              <option value="type6">6. Comparing Numbers</option>
              <option value="type7">7. Rounding</option>
              <option value="type8">8. Base-Ten Blocks</option>
              <option value="type9">9. Skip Counting</option>
              <option value="type10">10. Powers of 10</option>
            </select>
          </div>

          <span class="tb-vdiv"></span>

          <div class="tb-actions" style="margin-left:auto;gap:6px;">
            <button class="btn btn-ghost btn-sm" id="pvRevealBtn">
              <i class="fas fa-eye"></i> Reveal Solutions
            </button>
            <button class="btn btn-primary btn-sm" id="pvGenerateBtn">
              <i class="fas fa-sync-alt"></i> Generate
            </button>
            <button class="btn btn-secondary btn-sm" id="pvPrintBtn">
              <i class="fas fa-print"></i> Print
            </button>
            <button class="btn btn-secondary btn-sm" id="pvPdfBtn">
              <i class="fas fa-file-pdf"></i> PDF
            </button>
          </div>

        </div>
      </div>

      <!-- Two-pane body -->
      <div class="pv-body">

        <!-- Left: settings pane -->
        <div class="pv-settings-pane no-print">

          <div class="pv-settings-section">
            <div class="pv-section-title">Number Range</div>

            <div class="pv-field">
              <label for="pvMinDigits">Min integer digits</label>
              <input class="tb-num" type="number" id="pvMinDigits" min="1" max="7" value="2" style="width:52px;">
            </div>
            <div class="pv-field">
              <label for="pvMaxDigits">Max integer digits</label>
              <input class="tb-num" type="number" id="pvMaxDigits" min="1" max="7" value="4" style="width:52px;">
            </div>

            <div class="pv-field">
              <label for="pvIncludeDecimals">Include decimals</label>
              <input type="checkbox" id="pvIncludeDecimals">
            </div>
            <div class="pv-field pv-indent hidden" id="pvDecPlacesRow">
              <label for="pvDecimalPlaces">Max decimal places</label>
              <input class="tb-num" type="number" id="pvDecimalPlaces" min="1" max="5" value="2" style="width:52px;">
            </div>
            <div class="pv-field pv-indent hidden" id="pvDecMixRow">
              <label for="pvDecimalMix">Mix decimal places</label>
              <input type="checkbox" id="pvDecimalMix" checked>
            </div>
          </div>

          <div class="pv-settings-section">
            <div class="pv-section-title">Worksheet Options</div>

            <div class="pv-field">
              <label for="pvWorksheetCount">Number of worksheets</label>
              <input class="tb-num" type="number" id="pvWorksheetCount" min="1" max="10" value="2" style="width:52px;">
            </div>
            <div class="pv-field">
              <label for="pvQuestionsPerWs">Questions per worksheet</label>
              <input class="tb-num" type="number" id="pvQuestionsPerWs" min="1" max="30" value="25" style="width:52px;">
            </div>
            <div class="pv-field" id="pvSkipStepRow" style="display:none;">
              <label for="pvSkipStep">Skip count step</label>
              <select class="tb-select" id="pvSkipStep" style="width:80px;">
                <option value="10" selected>10</option>
                <option value="20">20</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
              </select>
            </div>
          </div>

          <div class="pv-settings-section">
            <div class="pv-section-title">Appearance</div>

            <div class="pv-field">
              <label for="pvFontFamily">Font</label>
              <select class="tb-select" id="pvFontFamily" style="width:120px;">
                <option value="'Andika', sans-serif">Andika</option>
                <option value="'Nunito', sans-serif">Nunito</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>
            <div class="pv-field">
              <label for="pvFontSize">Font size</label>
              <select class="tb-select" id="pvFontSize" style="width:80px;">
                <option value="12px">Small</option>
                <option value="14px">Medium</option>
                <option value="16px">Large</option>
                <option value="20px" selected>X-Large</option>
              </select>
            </div>
            <div class="pv-field">
              <label for="pvLocale">Number locale</label>
              <select class="tb-select" id="pvLocale" style="width:80px;">
                <option value="us">US</option>
                <option value="in">Indian</option>
              </select>
            </div>
          </div>

          <div class="pv-settings-section">
            <div class="pv-section-title">Answer Key</div>

            <div class="pv-field">
              <label for="pvIncludeAnswerKey">Include answer key</label>
              <input type="checkbox" id="pvIncludeAnswerKey">
            </div>
            <div class="pv-field pv-indent hidden" id="pvAnswerKeyPlacementRow">
              <label for="pvAnswerKeyPlacement">Placement</label>
              <select class="tb-select" id="pvAnswerKeyPlacement" style="width:120px;">
                <option value="separate">Separate page</option>
                <option value="bottom">Bottom of page</option>
              </select>
            </div>
          </div>

          <div class="pv-settings-section">
            <div class="pv-section-title">Reproducibility</div>
            <div class="pv-field">
              <label for="pvSeed">Random seed</label>
              <input type="text" id="pvSeed" placeholder="optional"
                style="width:100px;font-size:12px;padding:3px 6px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text-primary);">
            </div>
          </div>

        </div>

        <!-- Right: preview pane -->
        <div class="pv-preview-pane">
          <div id="pvWorksheetsContainer">
            <div class="empty-state">
              <i class="fas fa-file-alt"></i>
              <p>Configure settings and click Generate.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  // ── Element refs ─────────────────────────────────────────────────────────────
  const c = sel => container.querySelector(sel);

  const typeEl          = c('#pvType');
  const minDigitsEl     = c('#pvMinDigits');
  const maxDigitsEl     = c('#pvMaxDigits');
  const includeDecEl    = c('#pvIncludeDecimals');
  const decPlacesEl     = c('#pvDecimalPlaces');
  const decMixEl        = c('#pvDecimalMix');
  const decPlacesRow    = c('#pvDecPlacesRow');
  const decMixRow       = c('#pvDecMixRow');
  const wsCountEl       = c('#pvWorksheetCount');
  const qPerWsEl        = c('#pvQuestionsPerWs');
  const skipStepEl      = c('#pvSkipStep');
  const skipStepRow     = c('#pvSkipStepRow');
  const fontFamilyEl    = c('#pvFontFamily');
  const fontSizeEl      = c('#pvFontSize');
  const localeEl        = c('#pvLocale');
  const includeAKEl     = c('#pvIncludeAnswerKey');
  const akPlacementEl   = c('#pvAnswerKeyPlacement');
  const akPlacementRow  = c('#pvAnswerKeyPlacementRow');
  const seedEl          = c('#pvSeed');
  const revealBtn       = c('#pvRevealBtn');
  const generateBtn     = c('#pvGenerateBtn');
  const printBtn        = c('#pvPrintBtn');
  const pdfBtn          = c('#pvPdfBtn');
  const preview         = c('#pvWorksheetsContainer');

  let revealActive = false;

  // ── Conditional visibility ──────────────────────────────────────────────────

  function updateConditional() {
    const showDec  = includeDecEl.checked;
    const showAK   = includeAKEl.checked;
    const showSkip = typeEl.value === 'type9';

    decPlacesRow.classList.toggle('hidden', !showDec);
    decMixRow.classList.toggle('hidden', !showDec);
    akPlacementRow.classList.toggle('hidden', !showAK);
    skipStepRow.style.display = showSkip ? '' : 'none';
  }

  // ── Read state from UI ───────────────────────────────────────────────────────

  function readState() {
    let minD = parseInt(minDigitsEl.value) || 2;
    let maxD = parseInt(maxDigitsEl.value) || 4;
    if (minD > maxD) maxD = minD;
    if (maxD > 7) maxD = 7;
    if (minD < 1) minD = 1;

    return {
      type:                 typeEl.value,
      minDigits:            minD,
      maxDigits:            maxD,
      includeDecimals:      includeDecEl.checked,
      decimalPlaces:        Math.max(1, parseInt(decPlacesEl.value) || 2),
      decimalMix:           decMixEl.checked,
      worksheetCount:       Math.min(10, Math.max(1, parseInt(wsCountEl.value) || 2)),
      questionsPerWorksheet:Math.min(30, Math.max(1, parseInt(qPerWsEl.value) || 25)),
      skipCountStep:        parseInt(skipStepEl.value) || 10,
      fontFamily:           fontFamilyEl.value,
      fontSize:             fontSizeEl.value,
      locale:               localeEl.value,
      includeAnswerKey:     includeAKEl.checked,
      answerKeyPlacement:   akPlacementEl.value,
      randomSeed:           seedEl.value.trim(),
    };
  }

  // ── Pagination helpers ───────────────────────────────────────────────────────

  /**
   * Build an empty worksheet page shell and return { page, content }.
   * `.pv-worksheet` is a fixed 11in flex column; `.pv-ws-content` is the
   * flexible remainder, so its box is exactly the space left after the header.
   */
  function newPage(state, titleHTML, typeLabel) {
    const page = document.createElement('div');
    page.className = 'pv-worksheet';
    page.style.fontFamily = state.fontFamily;
    page.style.fontSize = state.fontSize;
    page.innerHTML = `
      <div class="pv-ws-header">
        <div class="pv-ws-namedate">${titleHTML}</div>
        <div class="pv-ws-typelabel">${typeLabel}</div>
      </div>
      <div class="pv-ws-content"></div>`;
    return { page, content: page.querySelector('.pv-ws-content') };
  }

  // Treat a few px of slack as full, absorbing rounding differences between
  // the browser's screen layout and the print layout.
  const FIT_SAFETY_PX = 4;
  function overflows(el) {
    const last = el.lastElementChild;
    if (!last) return false;

    const contentRect = el.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    const lastStyle = getComputedStyle(last);
    const lastMargin = parseFloat(lastStyle.marginBottom) || 0;

    return lastRect.bottom + lastMargin > contentRect.bottom - FIT_SAFETY_PX;
  }

  /**
   * Append `nodes` into as many pages as needed, packing each page greedily so
   * no vertical space is wasted and no item is ever split across a break.
   *
   * A fixed questions-per-page count cannot work here: item height varies a lot
   * by worksheet type (a one-line rounding prompt vs. a multi-row place value
   * chart), so any single number either overflows tall types or leaves tall
   * gaps on short ones. Measuring the real rendered height is the only approach
   * that holds for every type.
   */
  function flowIntoPages(host, state, nodes, makeTitle, typeLabel) {
    const pages = [];
    let idx = 0;

    while (idx < nodes.length) {
      const { page, content } = newPage(state, makeTitle(pages.length), typeLabel);
      host.appendChild(page);
      pages.push(page);

      let placed = 0;
      while (idx < nodes.length) {
        content.appendChild(nodes[idx]);
        if (overflows(content)) {
          // Never leave a page empty — an item taller than a full page has to
          // stay put and be clipped, otherwise this loop would never advance.
          if (placed === 0) { idx++; placed++; continue; }
          content.removeChild(nodes[idx]);
          break;
        }
        idx++;
        placed++;
      }
    }

    return pages;
  }

  function questionNode(num, questionHTML) {
    const el = document.createElement('div');
    el.className = 'pv-question';
    el.innerHTML = `
      <span class="pv-q-num">${num}.</span>
      <span class="pv-q-body">${questionHTML}</span>`;
    return el;
  }

  // ── Generate worksheets ──────────────────────────────────────────────────────

  function generate() {
    const state = readState();
    setSeed(state.randomSeed);

    const gen = TYPE_GENERATORS[state.type];
    if (!gen) return;

    const typeLabel = TYPE_NAMES[state.type];

    // Measure against the real layout, but keep the half-built pages invisible
    // so the user never sees items being appended and removed.
    preview.innerHTML = '';
    preview.style.visibility = 'hidden';
    preview.classList.add('pv-measuring');

    const allAnswers = [];

    for (let w = 1; w <= state.worksheetCount; w++) {
      const answerRows = [];
      const nodes = [];

      if (state.type === 'type9') {
        const note = document.createElement('p');
        note.className = 'pv-instruction';
        note.textContent = `Fill in the missing numbers. Count by ${state.skipCountStep}s:`;
        nodes.push(note);
      }

      for (let q = 1; q <= state.questionsPerWorksheet; q++) {
        const { question, answer } = gen(state);
        nodes.push(questionNode(q, question));
        answerRows.push(`<div class="pv-answer-key-item">${q}. ${answer}</div>`);
      }

      const label = state.worksheetCount > 1 ? ` ${w}` : '';
      const makeTitle = pageIdx => pageIdx === 0
        ? `<span class="pv-name-line">Name: ___________________________</span>
           <span class="pv-date-line">Date: ________________</span>`
        : `<span class="pv-name-line">Worksheet${label} — continued</span>`;

      const pages = flowIntoPages(preview, state, nodes, makeTitle, typeLabel);

      // Answer key at the bottom: try to tuck it onto the last page, and only
      // spill to a fresh page when it genuinely does not fit.
      if (state.includeAnswerKey && state.answerKeyPlacement === 'bottom') {
        const key = document.createElement('div');
        key.className = 'pv-answer-key';
        key.innerHTML = `
          <div class="pv-answer-key-title">Answer Key</div>
          <div class="pv-answer-key-grid">${answerRows.join('')}</div>`;

        const lastContent = pages[pages.length - 1].querySelector('.pv-ws-content');
        lastContent.appendChild(key);
        if (overflows(lastContent)) {
          lastContent.removeChild(key);
          const { page, content } = newPage(
            state, `<span class="pv-name-line">Worksheet${label} — Answer Key</span>`, typeLabel);
          content.appendChild(key);
          preview.appendChild(page);
        }
      }

      allAnswers.push({ label, answerRows });
    }

    // Separate answer key pages, flowed the same way so long keys break cleanly.
    if (state.includeAnswerKey && state.answerKeyPlacement === 'separate') {
      for (const { label, answerRows } of allAnswers) {
        const grid = document.createElement('div');
        grid.className = 'pv-answer-key-grid';
        grid.innerHTML = answerRows.join('');
        flowIntoPages(
          preview, state, [grid],
          () => `<span class="pv-name-line">Answer Key – Worksheet${label}</span>`,
          typeLabel);
      }
    }

    preview.classList.remove('pv-measuring');
    preview.style.visibility = '';
    preview.classList.toggle('reveal-solutions', revealActive);
  }

  // ── Event handlers ───────────────────────────────────────────────────────────

  on(typeEl, 'change', updateConditional);
  on(includeDecEl, 'change', updateConditional);
  on(includeAKEl, 'change', updateConditional);

  on(generateBtn, 'click', generate);
  on(printBtn, 'click', () => window.print());

  on(revealBtn, 'click', () => {
    revealActive = !revealActive;
    preview.classList.toggle('reveal-solutions', revealActive);
    revealBtn.innerHTML = revealActive
      ? '<i class="fas fa-eye-slash"></i> Hide Solutions'
      : '<i class="fas fa-eye"></i> Reveal Solutions';
  });

  on(pdfBtn, 'click', async () => {
    if (!preview.querySelector('.pv-worksheet')) return;
    pdfBtn.disabled = true;
    pdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
      if (!window.html2pdf) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      await window.html2pdf()
        .set({
          margin: 0,
          filename: 'place_value_worksheets.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        })
        .from(preview)
        .save();
    } finally {
      pdfBtn.disabled = false;
      pdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> PDF';
    }
  });

  updateConditional();
  generate();
}
