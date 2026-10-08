import treeUrl from '../../bodhana_cert_tree.png';
import flowerWatermarkUrl from '../../bodhana_cert_flower_watermark.png';
import flowerOrangeUrl from '../../bodhana_cert_flower_orange.png';
import { themeToggleMarkup } from '../shared/shell-ui.js';
import { printWorksheet } from '../shared/print.js';
import { DEFAULT_NOTE_MAX_WORDS, freshCertificateState } from './state.js';
import { CERTIFICATE_TEMPLATES, getCertificateTemplate } from './templates-library.js';

const PAGE_W_PX = 11 * 96;
const PAGE_H_PX = 8.5 * 96;

let listeners = [];
let resizeObserver = null;
let state = freshCertificateState();

function on(el, evt, fn) {
  el.addEventListener(evt, fn);
  listeners.push({ el, evt, fn });
}

function escapeAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function templateOptionsMarkup() {
  return Object.entries(CERTIFICATE_TEMPLATES)
    .map(([id, template]) => `<option value="${id}">${template.label}</option>`)
    .join('');
}

function markup() {
  return `
    <div class="award-tool tool-shell">
      <div class="tool-header tool-worksheet-header no-print">
        <div class="tool-header-main">
          <span class="tool-header-title">Appreciation Certificates</span>
          <span class="tool-header-status tb-status status-msg info" id="awardStatus"></span>
        </div>
        <div class="tool-header-actions tool-worksheet-actions">
          <div class="tool-primary-actions">
            <button class="btn btn-primary btn-sm" id="awardPrintBtn" type="button">
              <i class="fas fa-print"></i> Print
            </button>
            <span class="tool-action-separator" aria-hidden="true"></span>
            <button class="btn btn-ghost btn-sm" id="awardResetBtn" type="button">
              <i class="fas fa-undo-alt"></i> Reset
            </button>
          </div>
          <div class="tool-secondary-actions">
            <span class="tool-theme-slot">${themeToggleMarkup()}</span>
          </div>
        </div>
      </div>

      <div class="tool-body">
        <aside class="award-settings-pane tool-settings no-print">
          <section class="award-settings-section tool-type-section">
            <div class="award-section-title">Template</div>
            <label class="award-field award-field-stack" for="awardTemplate">
              <span>Award style</span>
              <select class="tb-select award-select" id="awardTemplate">
                ${templateOptionsMarkup()}
              </select>
            </label>
          </section>

          <section class="award-settings-section">
            <div class="award-section-title">Award Metadata</div>
            <label class="award-field award-field-stack" for="awardStudentName">
              <span>Student name</span>
              <input class="award-input" type="text" id="awardStudentName" autocomplete="off" spellcheck="false">
            </label>
            <label class="award-field award-field-stack" for="awardCustomTitle">
              <span>Custom title <em>optional</em></span>
              <input class="award-input" type="text" id="awardCustomTitle" autocomplete="off" spellcheck="false">
            </label>
          </section>

          <section class="award-settings-section">
            <div class="award-section-title">Appreciation Statement</div>
            <label class="award-field award-field-stack" for="awardShortNote">
              <span>Short note</span>
              <textarea class="award-textarea" id="awardShortNote" rows="7" spellcheck="false"></textarea>
            </label>
            <p class="award-note-hint" id="awardNoteHint"></p>
            <p class="award-warning" id="awardOverflowWarning" role="status"></p>
          </section>

          <section class="award-settings-section">
            <div class="award-section-title">Validation Sign-Off</div>
            <label class="award-field award-field-stack" for="awardDate">
              <span>Award date</span>
              <input class="award-input" type="text" id="awardDate" autocomplete="off" spellcheck="false">
            </label>
            <label class="award-field award-field-stack" for="awardIssuer">
              <span>Issuer name</span>
              <input class="award-input" type="text" id="awardIssuer" autocomplete="off" spellcheck="false">
            </label>
          </section>
        </aside>

        <section class="tool-preview award-preview-pane">
          <div class="award-preview-toolbar no-print">
            <span>Certificate preview</span>
            <span class="award-toolbar-dot"></span>
            <span>US Letter · Landscape · 11in x 8.5in</span>
            <span class="award-toolbar-spacer"></span>
            <span id="awardZoomLabel">65%</span>
          </div>
          <div class="award-preview-wrapper" id="awardPreviewWrapper">
            <div class="tool-pages award-pages" id="awardPages">
              <div class="cert-scale-stage" id="awardScaleStage">
                ${certificateMarkup()}
              </div>
            </div>
          </div>
        </section>

        <div class="tool-info-pane" aria-hidden="true"></div>
      </div>
    </div>
  `;
}

function certificateMarkup() {
  return `
    <article class="award-cert-page is-landscape" id="awardCertPage" data-template="custom_generic">
      <img src="${escapeAttr(flowerWatermarkUrl)}" alt="" class="cert-asset cert-asset-watermark">
      <img src="${escapeAttr(treeUrl)}" alt="" class="cert-asset cert-asset-tree">

      <div class="cert-content-layout">
        <div class="cert-text-block">
          <img src="${escapeAttr(flowerOrangeUrl)}" alt="Bodhana" class="cert-logo-main">
          <h1 class="cert-title" id="certTitle"></h1>
          <div class="cert-presented" id="certPresented"></div>
          <div class="cert-name" id="certName"></div>
          <div class="cert-note-wrap">
            <p class="cert-note" id="certNote"></p>
          </div>
          <div class="cert-footer">
            <div class="cert-sign">
              <div class="cert-sign-value" id="certIssuer"></div>
              <div class="cert-sign-line"></div>
              <div class="cert-sign-label">Issuer</div>
            </div>
            <div class="cert-sign">
              <div class="cert-sign-value" id="certDate"></div>
              <div class="cert-sign-line"></div>
              <div class="cert-sign-label">Date</div>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function countWords(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function fitScale(container) {
  const wrapper = container.querySelector('#awardPreviewWrapper');
  const stage = container.querySelector('#awardScaleStage');
  const zoomLabel = container.querySelector('#awardZoomLabel');
  if (!wrapper || !stage || !zoomLabel) return;

  const padding = 48;
  const availableW = Math.max(1, wrapper.clientWidth - padding);
  const availableH = Math.max(1, wrapper.clientHeight - padding);
  const scale = Math.max(0.22, Math.min(availableW / PAGE_W_PX, availableH / PAGE_H_PX, 1));
  const rounded = Math.round(scale * 1000) / 1000;

  stage.style.setProperty('--award-page-scale', String(rounded));
  stage.style.width = `${PAGE_W_PX * rounded}px`;
  stage.style.height = `${PAGE_H_PX * rounded}px`;
  zoomLabel.textContent = `${Math.round(rounded * 100)}%`;
}

function updateForm(container) {
  const template = getCertificateTemplate(state.templateId);
  container.querySelector('#awardTemplate').value = state.templateId;
  container.querySelector('#awardStudentName').value = state.studentName;
  container.querySelector('#awardCustomTitle').value = state.customTitle;
  container.querySelector('#awardCustomTitle').placeholder = template.defaultTitle;
  container.querySelector('#awardShortNote').value = state.shortNote;
  container.querySelector('#awardDate').value = state.awardDate;
  container.querySelector('#awardIssuer').value = state.issuerName;
}

function render(container) {
  const template = getCertificateTemplate(state.templateId);
  const title = state.customTitle.trim() || template.defaultTitle;
  const studentName = state.studentName.trim() || 'Student Name';
  const note = state.shortNote.trim();
  const issuer = state.issuerName.trim() || 'Bodhana Academy';
  const awardDate = state.awardDate.trim() || freshCertificateState().awardDate;

  container.querySelector('#awardCertPage').dataset.template = state.templateId;
  container.querySelector('#certTitle').textContent = title;
  container.querySelector('#certPresented').textContent = template.presentedLine;
  container.querySelector('#certName').textContent = studentName;
  container.querySelector('#certNote').textContent = note;
  container.querySelector('#certNote').toggleAttribute('hidden', !note);
  container.querySelector('#certIssuer').textContent = issuer;
  container.querySelector('#certDate').textContent = awardDate;

  const words = countWords(note);
  const hint = container.querySelector('#awardNoteHint');
  hint.textContent = `${words} word${words === 1 ? '' : 's'} · ${DEFAULT_NOTE_MAX_WORDS} recommended max`;
  hint.classList.toggle('is-over', words > DEFAULT_NOTE_MAX_WORDS);

  requestAnimationFrame(() => checkOverflow(container));
}

function checkOverflow(container) {
  const layout = container.querySelector('.cert-content-layout');
  const warning = container.querySelector('#awardOverflowWarning');
  if (!layout || !warning) return;

  const overflow = Math.max(0, layout.scrollHeight - layout.clientHeight);
  if (overflow > 2) {
    warning.textContent = `This certificate is ${Math.round(overflow)}px over the printable text area. Shorten the note slightly to keep the page clean.`;
    warning.classList.add('is-on');
  } else {
    warning.textContent = '';
    warning.classList.remove('is-on');
  }
}

function bindStateInput(container, selector, key) {
  const input = container.querySelector(selector);
  on(input, 'input', () => {
    state[key] = input.value;
    render(container);
  });
}

function wireEvents(container) {
  const templateSelect = container.querySelector('#awardTemplate');
  on(templateSelect, 'change', () => {
    state.templateId = templateSelect.value;
    updateForm(container);
    render(container);
  });

  bindStateInput(container, '#awardStudentName', 'studentName');
  bindStateInput(container, '#awardCustomTitle', 'customTitle');
  bindStateInput(container, '#awardShortNote', 'shortNote');
  bindStateInput(container, '#awardDate', 'awardDate');
  bindStateInput(container, '#awardIssuer', 'issuerName');

  on(container.querySelector('#awardPrintBtn'), 'click', printWorksheet);
  on(container.querySelector('#awardResetBtn'), 'click', () => {
    state = freshCertificateState();
    updateForm(container);
    render(container);
  });

  const wrapper = container.querySelector('#awardPreviewWrapper');
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => fitScale(container));
    resizeObserver.observe(wrapper);
  }
  on(window, 'resize', () => fitScale(container));
}

export function unmountCertificates() {
  listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
  listeners = [];
  resizeObserver?.disconnect();
  resizeObserver = null;
}

export function buildCertificatesUI(container) {
  unmountCertificates();
  state = freshCertificateState();
  container.innerHTML = markup();
  updateForm(container);
  wireEvents(container);
  render(container);
  fitScale(container);
}
