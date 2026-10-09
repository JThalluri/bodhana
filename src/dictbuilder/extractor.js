const CDN = {
  pdfjs:     'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  mammoth:   'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
  jszip:     'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load library from CDN: ${src}`));
    document.head.appendChild(s);
  });
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = e => resolve(e.target.result);
    fr.onerror = () => reject(new Error(`Could not read file: ${file.name}`));
    fr.readAsText(file);
  });
}

function readArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = e => resolve(e.target.result);
    fr.onerror = () => reject(new Error(`Could not read file: ${file.name}`));
    fr.readAsArrayBuffer(file);
  });
}

async function parsePdf(file) {
  await loadScript(CDN.pdfjs);
  const lib = window.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = CDN.pdfWorker;
  const buf = await readArrayBuffer(file);
  const doc = await lib.getDocument({ data: buf }).promise;
  const parts = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map(it => it.str).join(' '));
  }
  return parts.join(' ');
}

async function parseDocx(file) {
  await loadScript(CDN.mammoth);
  const buf = await readArrayBuffer(file);
  const result = await window.mammoth.extractRawText({ arrayBuffer: buf });
  return result.value;
}

async function parseOdt(file) {
  await loadScript(CDN.jszip);
  const buf = await readArrayBuffer(file);
  const zip = await window.JSZip.loadAsync(buf);
  const xmlFile = zip.file('content.xml');
  if (!xmlFile) throw new Error('Invalid ODT: missing content.xml');
  const xml = await xmlFile.async('text');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const paragraphs = Array.from(doc.querySelectorAll('text\\:p, p'));
  return paragraphs.map(p => p.textContent).join(' ');
}

function parseCsvRow(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cells.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

// For Bodhana phonics-export CSVs: extract only the 'word' column so that rime/onset
// partial-word columns don't pollute the word list. Detected by the 'graphemes' header.
// Non-Bodhana CSVs fall back to flat-text tokenization (unchanged behaviour).
function extractCsvWordColumn(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return text;
  const header = parseCsvRow(lines[0]).map(h => h.trim().toLowerCase());
  const isPhonicsExport = header.includes('graphemes');
  if (!isPhonicsExport) return text;
  const wordColIdx = header.indexOf('word');
  if (wordColIdx < 0) return text;
  const words = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cell = parseCsvRow(line)[wordColIdx];
    if (cell && cell.trim()) words.push(cell.trim());
  }
  return words.join('\n');
}

async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf':  return parsePdf(file);
    case 'docx': return parseDocx(file);
    case 'odt':  return parseOdt(file);
    case 'csv': {
      const text = await readFileAsText(file);
      return extractCsvWordColumn(text);
    }
    default:     return readFileAsText(file);
  }
}

/**
 * Tokenize text into unique words with frequency counts.
 * Returns { words: string[] (alpha-sorted), freq: Record<string,number>, pluralInfo }
 */
export function tokenize(text, opts = {}) {
  const { minLen = 3, maxLen = 15, lowercase = true } = opts;
  const freq = {};
  const wordPattern = /[a-zA-Z]+(?:['’][a-zA-Z]+)*/g;
  for (const match of text.matchAll(wordPattern)) {
    const w = match[0].replace(/’/g, "'");
    if (!w) continue;
    const isAllCaps = isAllCapsWord(w);
    if (lowercase && isAllCaps) continue;
    const key = lowercase ? w.toLowerCase() : w;
    if (key.length >= minLen && key.length <= maxLen) {
      freq[key] = (freq[key] || 0) + 1;
    }
  }
  const words = Object.keys(freq).sort((a, b) => a.localeCompare(b));
  return { words, freq, pluralInfo: findPossiblePlurals(words) };
}

function isAllCapsWord(word) {
  const letters = word.replace(/[^a-zA-Z]/g, '');
  return letters.length > 1 && letters === letters.toUpperCase();
}

function pluralCandidates(word) {
  if (word.length < 4 || word.includes("'")) return [];
  const candidates = [];

  if (/ies$/i.test(word) && word.length > 4) {
    candidates.push(word.slice(0, -3) + 'y');
  }
  if (/ves$/i.test(word) && word.length > 4) {
    candidates.push(word.slice(0, -3) + 'f');
    candidates.push(word.slice(0, -3) + 'fe');
  }
  if (/(ches|shes|sses|xes|zes)$/i.test(word) && word.length > 4) {
    candidates.push(word.slice(0, -2));
  }
  if (/s$/i.test(word) && !/ss$/i.test(word) && word.length > 3) {
    candidates.push(word.slice(0, -1));
  }

  return [...new Set(candidates)];
}

export function findPossiblePlurals(words, extraBaseWords = []) {
  const lookup = new Set([...words, ...extraBaseWords].map(w => String(w).toLowerCase()));
  const pluralInfo = {};

  for (const word of words) {
    const lower = word.toLowerCase();
    const base = pluralCandidates(lower).find(candidate => lookup.has(candidate));
    if (base) {
      pluralInfo[word] = base;
    }
  }

  return pluralInfo;
}

export async function extractWords(files, opts, onProgress) {
  const errors = [];
  const texts = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) onProgress(i, files.length, file.name);
    try {
      texts.push(await extractText(file));
    } catch (err) {
      errors.push({ name: file.name, message: err.message });
    }
  }
  if (onProgress) onProgress(files.length, files.length, '');
  const { words, freq, pluralInfo } = tokenize(texts.join(' '), opts);
  return { words, freq, pluralInfo, errors };
}
