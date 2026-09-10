import { rand, pick, shuffle } from '../shared/utils.js';

const DIRS = [
  [0, 1], [1, 0], [1, 1], [-1, 1],
  [0, -1], [-1, 0], [-1, -1], [1, -1],
];

function randomLetter() {
  return String.fromCharCode(97 + rand(0, 25));
}

export function generateWordSearch(rows, cols, wordPool, wordCount, diff, minLenOverride) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(''));
  const placements = [];

  let minLen = minLenOverride;
  let maxLen = diff.maxLen;
  if (minLen > maxLen) maxLen = minLen;

  const pool = wordPool.filter(w => w.length >= minLen && w.length <= maxLen);
  const finalPool = pool.length > 0 ? pool : wordPool;
  const chosen = shuffle([...finalPool]).slice(0, Math.min(wordCount, finalPool.length));
  chosen.sort((a, b) => b.length - a.length);

  for (const word of chosen) {
    const placed = tryPlaceWord(grid, rows, cols, word, diff.attempts);
    if (placed) placements.push(placed);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '') grid[r][c] = randomLetter();
    }
  }

  return { grid, words: placements.map(p => p.word), placements };
}

function tryPlaceWord(grid, rows, cols, word, maxAttempts) {
  const len = word.length;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const [dr, dc] = pick(DIRS);
    const startR = rand(0, rows - 1);
    const startC = rand(0, cols - 1);
    const endR = startR + dr * (len - 1);
    const endC = startC + dc * (len - 1);
    if (endR < 0 || endR >= rows || endC < 0 || endC >= cols) continue;

    let fits = true;
    for (let i = 0; i < len; i++) {
      const cell = grid[startR + dr * i][startC + dc * i];
      if (cell !== '' && cell !== word[i]) { fits = false; break; }
    }
    if (!fits) continue;

    for (let i = 0; i < len; i++) {
      grid[startR + dr * i][startC + dc * i] = word[i];
    }
    return { word, start: { r: startR, c: startC }, dir: { dr, dc }, length: len };
  }
  return null;
}
