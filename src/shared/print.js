const PRINT_PAGE_SELECTOR = [
  '.paper-page',
  '.pv-worksheet',
  '.ttt-worksheet',
  '.mp-puzzle-page',
  '.sdk-puzzle-page',
  '.wp-puzzle-block',
].join(',');

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
    @page { size: Letter; margin: 0; }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      color: black !important;
    }

    .print-document {
      display: block !important;
      width: 8.5in !important;
      min-width: 0 !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      overflow: visible !important;
    }

    ${PRINT_PAGE_CHILD_SELECTOR} {
      zoom: 1 !important;
      width: 8.5in !important;
      min-width: 0 !important;
      max-width: none !important;
      height: 11in !important;
      max-height: 11in !important;
      margin: 0 !important;
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
  </style>
</head>
<body>
  <main class="print-document">${source.innerHTML}</main>
</body>
</html>`);
  printDocument.close();

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
