/**
 * Renders all puzzles to HTML string.
 * @param {object[]} puzzles
 * @param {object} opts - { fontSize, cellPadding, fontFamily, caseMode, showSolutions }
 */
export function renderPuzzles(puzzles, opts) {
  const { fontSize = 20, cellPadding = 6, fontFamily = "'Nunito', sans-serif", caseMode = 'lowercase', showSolutions = false } = opts;

  return puzzles.map((puzzle, idx) => puzzleHTML(puzzle, idx, { fontSize, cellPadding, fontFamily, caseMode, showSolutions })).join('');
}

function puzzleHTML(puzzle, idx, opts) {
  const { fontSize, cellPadding, fontFamily, caseMode, showSolutions } = opts;
  const { grid, words, placements, mode } = puzzle;
  const rows = grid.length;
  const cols = grid[0].length;

  const solSet = buildSolutionSet(placements, showSolutions);
  const gridHtml = mode === 'crisscross'
    ? crissCrossGridHtml(grid, rows, cols, placements, solSet, fontSize, cellPadding, caseMode, showSolutions)
    : wordSearchGridHtml(grid, rows, cols, solSet, fontSize, cellPadding, caseMode);

  const wordListHtml = words.map(w => {
    const display = caseMode === 'uppercase' ? w.toUpperCase() : w;
    return `<div class="wp-word-item">${display}</div>`;
  }).join('');

  return `
    <div class="wp-puzzle-block" style="font-family:${fontFamily};">
      <div class="wp-puzzle-header">
        <div class="wp-field"><span class="wp-label">Name</span> <span class="wp-dash-line"></span></div>
        <div class="wp-field"><span class="wp-label">Time</span> <span class="wp-dash-line"></span></div>
        <div class="wp-field"><span class="wp-label">Score</span> <span class="wp-dash-line"></span></div>
      </div>
      <div class="wp-grid-wrapper">${gridHtml}</div>
      <div class="wp-word-grid">${wordListHtml}</div>
    </div>
  `;
}

function buildSolutionSet(placements, showSolutions) {
  if (!showSolutions) return new Set();
  const set = new Set();
  for (const { start, dir, length } of placements) {
    for (let i = 0; i < length; i++) {
      set.add(`${start.r + dir.dr * i},${start.c + dir.dc * i}`);
    }
  }
  return set;
}

function wordSearchGridHtml(grid, rows, cols, solSet, fontSize, padding, caseMode) {
  const cellSize = `${fontSize + padding * 2}px`;
  let html = `<div class="wp-grid" style="grid-template-columns:repeat(${cols},auto);">`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let letter = grid[r][c] || '';
      if (caseMode === 'uppercase') letter = letter.toUpperCase();
      const sol = solSet.has(`${r},${c}`) ? ' wp-solution-cell' : '';
      html += `<div class="wp-cell${sol}" style="width:${cellSize};height:${cellSize};font-size:${fontSize}px;padding:${padding}px;">${letter}</div>`;
    }
  }
  return html + '</div>';
}

function crissCrossGridHtml(grid, rows, cols, placements, solSet, fontSize, padding, caseMode, showSolutions) {
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== null) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }

  if (maxR < minR || maxC < minC) return `<div class="wp-no-words">No words could be placed.</div>`;

  const gH = maxR - minR + 1;
  const gW = maxC - minC + 1;
  const cellSize = `${fontSize + padding * 2}px`;

  // Hint cells: word starts, ends, and intersections
  const hintCells = new Set();
  const occupancy = {};
  for (const { start, dir, length } of placements) {
    hintCells.add(`${start.r},${start.c}`);
    hintCells.add(`${start.r + (length - 1) * dir.dr},${start.c + (length - 1) * dir.dc}`);
    for (let i = 0; i < length; i++) {
      const key = `${start.r + dir.dr * i},${start.c + dir.dc * i}`;
      occupancy[key] = (occupancy[key] || 0) + 1;
      if (occupancy[key] > 1) hintCells.add(key);
    }
  }

  let html = `<div class="wp-grid wp-grid-no-border" style="grid-template-columns:repeat(${gW},auto);grid-template-rows:repeat(${gH},auto);">`;
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const letter = grid[r][c];
      if (letter === null) continue;
      const isHint = hintCells.has(`${r},${c}`);
      const isSol = solSet.has(`${r},${c}`);
      const cls = `wp-cell${isHint ? ' wp-hint-cell' : ''}${isSol ? ' wp-solution-cell' : ''}`;
      let display = (showSolutions || isHint) ? letter : '';
      if (caseMode === 'uppercase') display = display.toUpperCase();
      html += `<div class="${cls}" style="grid-row:${r - minR + 1};grid-column:${c - minC + 1};width:${cellSize};height:${cellSize};font-size:${fontSize}px;padding:${padding}px;">${display}</div>`;
    }
  }
  return html + '</div>';
}
