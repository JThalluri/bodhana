import { addBrandWatermarks, brandWatermarkStyles } from './worksheet-brand.js';

const PRINT_PAGE_SELECTOR = [
  '.paper-page',
  '.pv-worksheet',
  '.frac-worksheet',
  '.mg-worksheet',
  '.mp-puzzle-page',
  '.sdk-puzzle-page',
  '.wp-puzzle-block',
  '.hw-worksheet',
  '.award-cert-page',
].join(',');

const LANDSCAPE_PAGE_SELECTOR = '.award-cert-page.is-landscape';

const PRINT_PAGE_CHILD_SELECTOR = PRINT_PAGE_SELECTOR
  .split(',')
  .map(selector => `.print-document > ${selector}`)
  .join(',');

const PRINT_PAGE_LAST_CHILD_SELECTOR = PRINT_PAGE_CHILD_SELECTOR
  .split(',')
  .map(selector => `${selector}:last-child`)
  .join(',');

export function printWorksheet() {
  const source = document.querySelector('.tool-pages');
  const pages = source?.querySelectorAll(PRINT_PAGE_SELECTOR);
  if (!source || !pages?.length) {
    window.print();
    return;
  }
  const isLandscape = [...pages].some(page => page.matches(LANDSCAPE_PAGE_SELECTOR));
  const pageWidth = isLandscape ? '11in' : '8.5in';
  const pageHeight = isLandscape ? '8.5in' : '11in';
  const pageSize = isLandscape ? 'Letter landscape' : 'Letter';

  const printFrame = document.createElement('iframe');
  printFrame.setAttribute('aria-hidden', 'true');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  printFrame.style.visibility = 'hidden';
  document.body.appendChild(printFrame);

  const printWindow = printFrame.contentWindow;
  const printDocument = printFrame.contentDocument;
  if (!printWindow || !printDocument) {
    printFrame.remove();
    window.print();
    return;
  }

  const headAssets = [...document.querySelectorAll('link[rel="stylesheet"], style')]
    .map(node => node.outerHTML)
    .join('\n');

  printDocument.open();
  printDocument.write(`<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <title>Bodhana Worksheet Print</title>
  ${headAssets}
  <style>
    @page { size: ${pageSize}; margin: 0; }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      color: black !important;
    }

    .print-document {
      display: block !important;
      width: ${pageWidth} !important;
      min-width: 0 !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      overflow: visible !important;
    }

    ${PRINT_PAGE_CHILD_SELECTOR} {
      zoom: 1 !important;
      width: ${pageWidth} !important;
      min-width: 0 !important;
      max-width: none !important;
      height: ${pageHeight} !important;
      max-height: ${pageHeight} !important;
      margin: 0 !important;
      position: relative !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      background: white !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    ${PRINT_PAGE_LAST_CHILD_SELECTOR} {
      page-break-after: avoid !important;
      break-after: auto !important;
    }

    .print-document .cert-scale-stage {
      display: block !important;
      width: ${pageWidth} !important;
      height: ${pageHeight} !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      background: white !important;
    }

    .print-document .award-cert-page.is-landscape {
      position: relative !important;
      top: auto !important;
      left: auto !important;
      width: ${pageWidth} !important;
      min-width: ${pageWidth} !important;
      height: ${pageHeight} !important;
      min-height: ${pageHeight} !important;
      margin: 0 !important;
      transform: none !important;
      page-break-after: avoid !important;
      break-after: auto !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .print-document .cert-name {
      color: #c44f42 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .print-document .cert-title,
    .print-document .cert-note,
    .print-document .cert-sign-value {
      color: #1d1717 !important;
    }

    .print-document .cert-title::after,
    .print-document .cert-sign-line {
      background: #9f3435 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    ${brandWatermarkStyles()}
  </style>
</head>
<body>
  <main class="print-document">${source.innerHTML}</main>
</body>
</html>`);
  printDocument.close();
  if (!isLandscape) {
    addBrandWatermarks(printDocument, PRINT_PAGE_CHILD_SELECTOR);
  }

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    printFrame.remove();
  };

  const runPrint = () => {
    printWindow.addEventListener('afterprint', cleanup, { once: true });
    printWindow.focus();
    printWindow.print();
    setTimeout(cleanup, 60000);
  };

  if (printDocument.fonts?.ready) {
    printDocument.fonts.ready.then(() => setTimeout(runPrint, 100));
  } else {
    setTimeout(runPrint, 300);
  }
}
