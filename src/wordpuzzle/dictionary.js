export const DEMO_WORDS = [
  'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'garden',
  'happy', 'island', 'jungle', 'kayak', 'lemon', 'mango', 'night',
  'ocean', 'puzzle', 'queen', 'river', 'sunny', 'tiger', 'unicorn',
  'violet', 'water', 'xenon', 'yummy', 'zebra', 'butter', 'cloud',
  'dream', 'ember', 'flame', 'grace', 'heart', 'ivory', 'jolly',
  'koala', 'lunar', 'magic', 'noble', 'orbit', 'peace', 'quiet',
  'radar', 'solar', 'tulip', 'ultra', 'vivid', 'whale', 'youth',
];

function parseCSVLine(line) {
  const cells = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let val = '';
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else val += line[i++];
      }
      cells.push(val);
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) { cells.push(line.slice(i)); break; }
      cells.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return cells;
}

function normalizeWords(words) {
  return Array.from(new Set(
    words
      .map(w => String(w || '').trim().toLowerCase())
      .filter(w => /^[a-z]+$/.test(w))
  ));
}

export function loadDictionaryFromText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];

  const firstLine = trimmed.split(/\r?\n/, 1)[0] || '';
  const headers = parseCSVLine(firstLine).map(h => h.trim().toLowerCase());
  const wordIdx = headers.indexOf('word');

  if (wordIdx !== -1) {
    const words = trimmed
      .split(/\r?\n/)
      .slice(1)
      .map(line => parseCSVLine(line)[wordIdx]);
    return normalizeWords(words);
  }

  return normalizeWords(trimmed.split(/[\s,;]+/));
}

export function loadDictionaryFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(loadDictionaryFromText(e.target.result));
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
