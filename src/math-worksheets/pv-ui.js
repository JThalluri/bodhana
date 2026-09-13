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

  // ── Generate worksheets ──────────────────────────────────────────────────────

  function generate() {
    const state = readState();
    setSeed(state.randomSeed);

    const gen = TYPE_GENERATORS[state.type];
    if (!gen) return;

    let html = '';

    for (let w = 1; w <= state.worksheetCount; w++) {
      const answerRows = [];
      let questionsHTML = '';

      if (state.type === 'type9') {
        questionsHTML += `<p class="pv-instruction">Fill in the missing numbers. Count by ${state.skipCountStep}s:</p>`;
      }

      for (let q = 1; q <= state.questionsPerWorksheet; q++) {
        const { question, answer } = gen(state);
        questionsHTML += `
          <div class="pv-question">
            <span class="pv-q-num">${q}.</span>
            <span class="pv-q-body">${question}</span>
          </div>`;
        answerRows.push(`<div class="pv-answer-key-item">${q}. ${answer}</div>`);
      }

      let answerKeyHTML = '';
      if (state.includeAnswerKey && state.answerKeyPlacement === 'bottom') {
        answerKeyHTML = `
          <div class="pv-answer-key">
            <div class="pv-answer-key-title">Answer Key</div>
            <div class="pv-answer-key-grid">${answerRows.join('')}</div>
          </div>`;
      }

      html += `
        <div class="pv-worksheet" style="font-family:${state.fontFamily};font-size:${state.fontSize};">
          <div class="pv-ws-header">
            <div class="pv-ws-namedate">
              <span class="pv-name-line">Name: ___________________________</span>
              <span class="pv-date-line">Date: ________________</span>
            </div>
            <div class="pv-ws-typelabel">${TYPE_NAMES[state.type]}</div>
          </div>
          ${questionsHTML}
          ${answerKeyHTML}
        </div>`;
    }

    if (state.includeAnswerKey && state.answerKeyPlacement === 'separate') {
      // Re-run generation with the same seed to collect answers again
      setSeed(state.randomSeed);
      for (let w = 1; w <= state.worksheetCount; w++) {
        const answerRows = [];
        for (let q = 1; q <= state.questionsPerWorksheet; q++) {
          const { answer } = gen(state);
          answerRows.push(`<div class="pv-answer-key-item">${q}. ${answer}</div>`);
        }
        html += `
          <div class="pv-worksheet" style="font-family:${state.fontFamily};font-size:${state.fontSize};">
            <div class="pv-ws-header">
              <div class="pv-ws-namedate"><span class="pv-name-line">Answer Key – Worksheet ${w}</span></div>
              <div class="pv-ws-typelabel">${TYPE_NAMES[state.type]}</div>
            </div>
            <div class="pv-answer-key-grid">${answerRows.join('')}</div>
          </div>`;
      }
    }

    preview.innerHTML = html;
    if (revealActive) preview.classList.add('reveal-solutions');
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
