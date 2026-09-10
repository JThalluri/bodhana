import { shuffle } from '../shared/utils.js';

const CC_DIRS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
];

export function generateCrissCross(rows, cols, wordPool, wordCount, diff, minLenOverride) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  const placements = [];

  let minLen = minLenOverride;
  let maxLen = diff.maxLen;
  if (minLen > maxLen) maxLen = minLen;

  const pool = wordPool.filter(w => w.length >= minLen && w.length <= maxLen);
  const finalPool = pool.length > 0 ? pool : wordPool;
  const chosen = shuffle([...finalPool]);
  chosen.sort((a, b) => b.length - a.length);
  const words = chosen.slice(0, Math.min(wordCount, chosen.length));

  // Place first (longest) word at center
  if (words.length > 0) {
    const first = words[0];
    const startC = Math.floor(cols / 2) - Math.floor(first.length / 2);
    const startR = Math.floor(rows / 2);
    if (startC >= 0 && startC + first.length - 1 < cols) {
      for (let i = 0; i < first.length; i++) grid[startR][startC + i] = first[i];
      placements.push({ word: first, start: { r: startR, c: startC }, dir: { dr: 0, dc: 1 }, length: first.length });
    } else {
      const startR2 = Math.floor(rows / 2) - Math.floor(first.length / 2);
      const startC2 = Math.floor(cols / 2);
      if (startR2 >= 0 && startR2 + first.length - 1 < rows) {
        for (let i = 0; i < first.length; i++) grid[startR2 + i][startC2] = first[i];
        placements.push({ word: first, start: { r: startR2, c: startC2 }, dir: { dr: 1, dc: 0 }, length: first.length });
      }
    }
  }

  for (let i = 1; i < words.length; i++) {
    const placed = tryPlaceCrissCross(grid, rows, cols, words[i]);
    if (placed) placements.push(placed);
  }

  return { grid, words: placements.map(p => p.word), placements };
}

function tryPlaceCrissCross(grid, rows, cols, word) {
  const len = word.length;
  const ATTEMPTS = 200;

  // Try with intersection first
  for (let a = 0; a < ATTEMPTS; a++) {
    const { dr, dc } = CC_DIRS[Math.floor(Math.random() * CC_DIRS.length)];
    const startR = Math.floor(Math.random() * rows);
    const startC = Math.floor(Math.random() * cols);
    let intersects = false;
    let fits = true;

    for (let i = 0; i < len; i++) {
      const r = startR + dr * i;
      const c = startC + dc * i;
      if (r < 0 || r >= rows || c < 0 || c >= cols) { fits = false; break; }
      const cell = grid[r][c];
      if (cell !== null && cell !== word[i]) { fits = false; break; }
      if (cell !== null) intersects = true;
    }

    if (fits && intersects) {
      for (let i = 0; i < len; i++) grid[startR + dr * i][startC + dc * i] = word[i];
      return { word, start: { r: startR, c: startC }, dir: { dr, dc }, length: len };
    }
  }

  // Fallback: place without requiring intersection
  for (let a = 0; a < ATTEMPTS; a++) {
    const { dr, dc } = CC_DIRS[Math.floor(Math.random() * CC_DIRS.length)];
    const startR = Math.floor(Math.random() * rows);
    const startC = Math.floor(Math.random() * cols);
    let fits = true;

    for (let i = 0; i < len; i++) {
      const r = startR + dr * i;
      const c = startC + dc * i;
      if (r < 0 || r >= rows || c < 0 || c >= cols) { fits = false; break; }
      if (grid[r][c] !== null) { fits = false; break; }
    }

    if (fits) {
      for (let i = 0; i < len; i++) grid[startR + dr * i][startC + dc * i] = word[i];
      return { word, start: { r: startR, c: startC }, dir: { dr, dc }, length: len };
    }
  }

  return null;
}
