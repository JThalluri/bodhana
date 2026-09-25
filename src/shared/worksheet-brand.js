export const WORKSHEET_BRAND_WATERMARK_CLASS = 'worksheet-brand-watermark';
export const WORKSHEET_BRAND_NAME = 'Bodhana';

export function addBrandWatermarks(rootDocument, pageSelector) {
  rootDocument.querySelectorAll(pageSelector).forEach(page => {
    if (page.querySelector(`.${WORKSHEET_BRAND_WATERMARK_CLASS}`)) return;
    const mark = rootDocument.createElement('div');
    mark.className = WORKSHEET_BRAND_WATERMARK_CLASS;
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = WORKSHEET_BRAND_NAME;
    page.appendChild(mark);
  });
}

export function brandWatermarkElementHTML() {
  return `<div class="${WORKSHEET_BRAND_WATERMARK_CLASS}" aria-hidden="true">${WORKSHEET_BRAND_NAME}</div>`;
}

export function brandWatermarkStyles() {
  return `
    .${WORKSHEET_BRAND_WATERMARK_CLASS} {
      position: absolute !important;
      top: 0.1in !important;
      right: 0.14in !important;
      z-index: 1000 !important;
      pointer-events: none !important;
      user-select: none !important;
      font-family: "Nunito", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif !important;
      font-size: 16pt !important;
      font-weight: 900 !important;
      line-height: 1 !important;
      letter-spacing: 0.01em !important;
      color: #f97316 !important;
      opacity: 0.58 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  `;
}
