import { addBrandWatermarks, brandWatermarkStyles } from './worksheet-brand.js';

const EXPORT_PAGE_SELECTOR = [
  '.paper-page',
  '.pv-worksheet',
  '.ttt-worksheet',
  '.mp-puzzle-page',
  '.sdk-puzzle-page',
  '.wp-puzzle-block',
].join(',');

const EXPORT_PAGE_CHILD_SELECTOR = EXPORT_PAGE_SELECTOR
  .split(',')
  .map(selector => `.print-document > ${selector}`)
  .join(',');

const EXPORT_PAGE_LAST_CHILD_SELECTOR = EXPORT_PAGE_CHILD_SELECTOR
  .split(',')
  .map(selector => `${selector}:last-child`)
  .join(',');

const PDF_WIDTH = 612;
const PDF_HEIGHT = 792;
const EXPORT_SCALE = 3;

export async function exportWorksheetPdf(options = {}) {
  const source = document.querySelector('.tool-pages');
  const pages = [...(source?.querySelectorAll(EXPORT_PAGE_SELECTOR) ?? [])];
  if (!pages.length) return;

  await document.fonts?.ready;

  const frame = createExportFrame(source);
  try {
    const exportDocument = frame.contentDocument;
    const exportWindow = frame.contentWindow;
    if (!exportDocument || !exportWindow) return;

    await waitForExportLayout(exportDocument, exportWindow);

    const exportPages = [...exportDocument.querySelectorAll(EXPORT_PAGE_CHILD_SELECTOR)];
    const doc = new ImagePdf();
    for (const pageEl of exportPages) {
      const image = await renderPageImage(pageEl, exportWindow);
      doc.addPage(image);
    }

    const filename = `${sanitizeFilename(options.filenameBase ?? currentWorksheetName())}_${timestamp()}.pdf`;
    downloadBlob(doc.toBlob(), filename);
  } finally {
    frame.remove();
  }
}

function createExportFrame(source) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.left = '-10000px';
  frame.style.top = '0';
  frame.style.width = '8.5in';
  frame.style.height = '11in';
  frame.style.border = '0';
  frame.style.visibility = 'hidden';
  frame.style.pointerEvents = 'none';
  document.body.appendChild(frame);

  const headAssets = [...document.querySelectorAll('link[rel="stylesheet"], style')]
    .map(node => node.outerHTML)
    .join('\n');

  const exportDocument = frame.contentDocument;
  exportDocument.open();
  exportDocument.write(`<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <title>Bodhana Worksheet Export</title>
  ${headAssets}
  <style>${exportPrintStyles()}</style>
</head>
<body>
  <main class="print-document">${source.innerHTML}</main>
</body>
</html>`);
  exportDocument.close();
  addBrandWatermarks(exportDocument, EXPORT_PAGE_CHILD_SELECTOR);
  return frame;
}

function exportPrintStyles() {
  return `
    @page { size: Letter; margin: 0; }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 8.5in !important;
      min-width: 8.5in !important;
      background: white !important;
      color: black !important;
      overflow: visible !important;
    }

    .print-document {
      display: block !important;
      width: 8.5in !important;
      min-width: 8.5in !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      overflow: visible !important;
    }

    ${EXPORT_PAGE_CHILD_SELECTOR} {
      zoom: 1 !important;
      width: 8.5in !important;
      min-width: 8.5in !important;
      max-width: none !important;
      height: 11in !important;
      max-height: 11in !important;
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

    ${EXPORT_PAGE_LAST_CHILD_SELECTOR} {
      page-break-after: avoid !important;
      break-after: auto !important;
    }

    .pv-worksheet,
    .ttt-worksheet {
      zoom: 1 !important;
      box-shadow: none !important;
      margin: 0 !important;
      overflow: hidden !important;
    }

    .pv-ws-content {
      overflow: visible !important;
    }

    .mp-puzzle-page {
      display: flex !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      margin: 0 !important;
      background: white !important;
      box-sizing: border-box !important;
      width: 8.5in !important;
      height: 11in !important;
      max-height: 11in !important;
      max-width: none !important;
      overflow: hidden !important;
    }

    .mp-header {
      font-size: 16pt !important;
      margin-bottom: 10px !important;
      padding-bottom: 8px !important;
      border-bottom-width: 2.5px !important;
    }

    .mp-underline-lg { width: 220px !important; }
    .mp-underline-md { width: 130px !important; }

    .mp-grid-wrap {
      overflow: visible !important;
    }

    .mp-grid-table {
      --mp-cell-size: calc(7.3in / var(--mp-cols)) !important;
      border-collapse: separate !important;
      border-spacing: 0 !important;
      background: white !important;
      border: none !important;
    }

    .mp-cell {
      width: var(--mp-cell-size) !important;
      height: var(--mp-cell-size) !important;
      min-width: var(--mp-cell-size) !important;
      font-size: calc(var(--mp-cell-size) * 0.42) !important;
      border: none !important;
    }

    .mp-cell-op {
      font-size: calc(var(--mp-cell-size) * 0.50) !important;
    }

    .mp-cell-eq {
      font-size: calc(var(--mp-cell-size) * 0.48) !important;
    }

    .mp-cell-black {
      background: white !important;
    }

    .mp-cell-value,
    .mp-cell-blank {
      background: white !important;
      color: #000 !important;
    }

    .mp-cell.mp-bt { border-top: 2px solid #333 !important; }
    .mp-cell.mp-br { border-right: 2px solid #333 !important; }
    .mp-cell.mp-bb { border-bottom: 2px solid #333 !important; }
    .mp-cell.mp-bl { border-left: 2px solid #333 !important; }

    .mp-cell-op[data-v="+"] { color: #2563eb !important; }
    .mp-cell-op[data-v="-"],
    .mp-cell-op[data-v="−"] { color: #ef4444 !important; }
    .mp-cell-op[data-v="×"] { color: #0f766e !important; }
    .mp-cell-op[data-v="÷"] { color: #6366f1 !important; }

    .wp-puzzle-block {
      display: flex !important;
      background: white !important;
      border: none !important;
      border-radius: 0 !important;
      padding: 20px 24px 30px !important;
      margin: 0 !important;
      box-shadow: none !important;
      box-sizing: border-box !important;
      width: 8.5in !important;
      height: 11in !important;
      max-height: 11in !important;
      overflow: hidden !important;
    }

    .wp-puzzle-header {
      border-bottom-color: #aaa !important;
      color: #222 !important;
    }

    .wp-field { color: #222 !important; }
    .wp-label { color: #666 !important; }
    .wp-dash-line { border-bottom-color: #999 !important; }
    .wp-grid { border-color: #999 !important; background: white !important; }
    .wp-grid-no-border { border: none !important; }
    .wp-cell { border-color: #bbb !important; }

    ${brandWatermarkStyles()}
  `;
}

async function waitForExportLayout(exportDocument, exportWindow) {
  if (exportDocument.fonts?.ready) {
    await exportDocument.fonts.ready.catch(() => {});
  }

  await new Promise(resolve => {
    exportWindow.requestAnimationFrame(() => {
      exportWindow.requestAnimationFrame(resolve);
    });
  });
}

async function renderPageImage(pageEl, view = window) {
  const rect = pageEl.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  const clone = pageEl.cloneNode(true);

  inlineComputedStyles(pageEl, clone, view);
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.zoom = '1';

  const html = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;margin:0;background:white;overflow:hidden;">${html}</div>
    </foreignObject>
  </svg>`;

  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * EXPORT_SCALE);
  canvas.height = Math.ceil(height * EXPORT_SCALE);

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const bytes = await canvasToJpegBytes(canvas);
  return { bytes, width: canvas.width, height: canvas.height };
}

function inlineComputedStyles(source, clone, view = window) {
  if (!isElementNode(source) || !isElementNode(clone)) return;

  const computed = view.getComputedStyle(source);
  const cssText = [...computed].map(prop => `${prop}:${computed.getPropertyValue(prop)};`).join('');
  clone.setAttribute('style', cssText);

  const sourceChildren = [...source.children];
  const cloneChildren = [...clone.children];
  for (let i = 0; i < sourceChildren.length; i++) {
    inlineComputedStyles(sourceChildren[i], cloneChildren[i], view);
  }
}

function isElementNode(node) {
  return node?.nodeType === 1;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to render worksheet page for PDF export.'));
    img.src = src;
  });
}

function canvasToJpegBytes(canvas) {
  return new Promise(resolve => {
    canvas.toBlob(async blob => {
      const buffer = await blob.arrayBuffer();
      resolve(new Uint8Array(buffer));
    }, 'image/jpeg', 0.98);
  });
}

function currentWorksheetName() {
  return document.querySelector('.tool-header-title')?.textContent?.trim() || 'worksheet';
}

function sanitizeFilename(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'worksheet';
}

function timestamp(date = new Date()) {
  const yy = String(date.getFullYear()).slice(-2);
  const pad = n => String(n).padStart(2, '0');
  return `${yy}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

class ImagePdf {
  constructor() {
    this.pages = [];
  }

  addPage(image) {
    this.pages.push(image);
  }

  toBlob() {
    const parts = this.toParts();
    return new Blob(parts, { type: 'application/pdf' });
  }

  toParts() {
    const objects = [];
    const add = body => {
      objects.push(Array.isArray(body) ? body : [body]);
      return objects.length;
    };

    const catalogId = add('<< /Type /Catalog /Pages 2 0 R >>\n');
    const pagesId = add('');

    const pageIds = [];
    for (const [index, image] of this.pages.entries()) {
      const imageName = `Im${index + 1}`;
      const imageId = add([
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
        image.bytes,
        '\nendstream\n',
      ]);
      const content = `q\n${PDF_WIDTH} 0 0 ${PDF_HEIGHT} 0 0 cm\n/${imageName} Do\nQ\n`;
      const contentId = add(`<< /Length ${asciiLength(content)} >>\nstream\n${content}endstream\n`);
      const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\n`);
      pageIds.push(pageId);
    }

    objects[pagesId - 1] = [`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>\n`];

    const parts = ['%PDF-1.4\n'];
    const offsets = [0];
    let offset = asciiLength(parts[0]);

    objects.forEach((body, idx) => {
      offsets.push(offset);
      const prefix = `${idx + 1} 0 obj\n`;
      const suffix = 'endobj\n';
      parts.push(prefix, ...body, suffix);
      offset += asciiLength(prefix) + bodyLength(body) + asciiLength(suffix);
    });

    const xrefOffset = offset;
    let xref = `xref\n0 ${objects.length + 1}\n`;
    xref += '0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i++) {
      xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    parts.push(xref);
    return parts;
  }
}

function bodyLength(parts) {
  return parts.reduce((sum, part) => sum + (part instanceof Uint8Array ? part.length : asciiLength(part)), 0);
}

function asciiLength(value) {
  return value.length;
}
