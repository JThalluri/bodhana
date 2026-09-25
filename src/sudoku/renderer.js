import { DIFFICULTY_SETTINGS } from './generator.js';

export function renderPuzzles(puzzles, opts = {}) {
  const tileCount = normalizeTileCount(opts.tileCount);
  if (tileCount === 1) {
    return puzzles.map((p, i) => puzzleHTML(p, i, opts)).join('');
  }

  const pages = [];
  for (let i = 0; i < puzzles.length; i += tileCount) {
    pages.push(tiledPageHTML(puzzles.slice(i, i + tileCount), i, tileCount, opts));
  }
  return pages.join('');
}

function puzzleHTML(data, idx, opts) {
  if (!data) return '';
  const { puzzle, solution, difficulty } = data;
  const {
    showSolutions = false,
    fontFamily = "'Andika', sans-serif",
    fontSize = 20,
    cellPadding = 12,
  } = opts;

  const cellSize = fontSize + 2 * cellPadding;
  const label = DIFFICULTY_SETTINGS[difficulty]?.label ?? difficulty;

  const gridStyle = [
    `--sdk-cell-size: ${cellSize}px`,
    `--sdk-font-size: ${fontSize}px`,
    `font-family: ${fontFamily}`,
  ].join('; ');

  return `
    <section class="sdk-puzzle-page">
      <div class="sdk-header">
        <span class="sdk-header-field">Name <span class="sdk-underline sdk-underline-lg"></span></span>
        <span class="sdk-header-field">Date <span class="sdk-underline sdk-underline-md"></span></span>
        <span class="sdk-header-meta">Puzzle ${idx + 1} &middot; ${label}</span>
      </div>
      <div class="sdk-grid-wrap" style="${gridStyle}" role="img" aria-label="Sudoku puzzle ${idx + 1}">
        ${gridToHTML(puzzle, solution, showSolutions)}
      </div>
      <p class="sdk-instructions">Fill each row, column, and 3&times;3 box with the digits 1&ndash;9, using each digit exactly once.</p>
    </section>
  `;
}

function tiledPageHTML(pagePuzzles, startIndex, tileCount, opts) {
  const gridStyle = tileGridStyle(tileCount);
  const difficultyLabel = DIFFICULTY_SETTINGS[pagePuzzles[0]?.difficulty]?.label ?? pagePuzzles[0]?.difficulty ?? 'Sudoku';
  const tiles = pagePuzzles.map((puzzle, index) => {
    if (!puzzle) return '';
    const puzzleNumber = startIndex + index + 1;
    return `
      <article class="sdk-tile" style="${gridStyle}">
        <div class="sdk-tile-number">${puzzleNumber}</div>
        <div class="sdk-grid-wrap sdk-tile-grid-wrap" role="img" aria-label="Sudoku puzzle ${puzzleNumber}">
          ${gridToHTML(puzzle.puzzle, puzzle.solution, opts.showSolutions)}
        </div>
      </article>
    `;
  }).join('');

  return `
    <section class="sdk-puzzle-page sdk-tile-page sdk-tile-page-${tileCount}">
      <div class="sdk-header">
        <span class="sdk-header-field">Name <span class="sdk-underline sdk-underline-lg"></span></span>
        <span class="sdk-header-field">Date <span class="sdk-underline sdk-underline-md"></span></span>
        <span class="sdk-header-meta">Sudoku &middot; ${difficultyLabel}</span>
      </div>
      <div class="sdk-tile-layout">
        ${tiles}
      </div>
      <p class="sdk-instructions">Fill each row, column, and 3&times;3 box with the digits 1&ndash;9, using each digit exactly once.</p>
    </section>
  `;
}

function tileGridStyle(tileCount) {
  const preset = {
    2: { cell: 54, font: 25 },
    4: { cell: 42, font: 19 },
    6: { cell: 34, font: 16 },
  }[tileCount] ?? { cell: 42, font: 19 };

  return [
    `--sdk-cell-size: ${preset.cell}px`,
    `--sdk-font-size: ${preset.font}px`,
    "font-family: 'Andika', sans-serif",
  ].join('; ');
}

function normalizeTileCount(value) {
  return [1, 2, 4, 6].includes(Number(value)) ? Number(value) : 4;
}

function gridToHTML(puzzle, solution, showSolutions) {
  let html = '<table class="sdk-grid-table"><tbody>';
  for (let r = 0; r < 9; r++) {
    html += '<tr>';
    for (let c = 0; c < 9; c++) {
      const val = puzzle[r][c];
      // Box boundary classes — with border-collapse, thicker border wins at shared edges
      const bc = [
        r % 3 === 0 ? 'sdk-bt' : '',
        c % 3 === 0 ? 'sdk-bl' : '',
        r % 3 === 2 ? 'sdk-bb' : '',
        c % 3 === 2 ? 'sdk-br' : '',
      ].filter(Boolean).join(' ');

      if (val !== 0) {
        html += `<td class="sdk-cell sdk-given ${bc}">${val}</td>`;
      } else if (showSolutions) {
        html += `<td class="sdk-cell sdk-blank sdk-sol ${bc}">${solution[r][c]}</td>`;
      } else {
        html += `<td class="sdk-cell sdk-blank ${bc}"></td>`;
      }
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}
