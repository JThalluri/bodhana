export function renderPuzzles(puzzles, opts = {}) {
  return puzzles.map((p, i) => puzzleHTML(p, i, opts)).join('');
}

function puzzleHTML(puzzle, idx, opts) {
  if (!puzzle) return '';
  const { grid, rows, cols, equationCount } = puzzle;
  const { showSolutions = false } = opts;

  return `
    <section class="mp-puzzle-page">
      <div class="mp-header">
        <span class="mp-header-field">Name <span class="mp-underline mp-underline-lg"></span></span>
        <span class="mp-header-field">Date <span class="mp-underline mp-underline-md"></span></span>
        <span class="mp-header-var">Puzzle ${idx + 1}</span>
      </div>
      <div class="mp-grid-wrap">
        <div class="mp-grid"
          style="--mp-cols:${cols};grid-template-columns:repeat(${cols},var(--mp-cell-size))"
          role="img" aria-label="Math puzzle grid ${idx + 1}">
          ${gridToHTML(grid, rows, cols, showSolutions)}
        </div>
      </div>
    </section>
  `;
}

function gridToHTML(grid, rows, cols, showSolutions) {
  let html = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (!cell) {
        html += `<div class="mp-cell mp-cell-black"></div>`;
      } else if (cell.blank) {
        const solSpan = showSolutions
          ? `<span class="mp-sol">${esc(cell.value)}</span>`
          : '';
        html += `<div class="mp-cell mp-cell-blank">${solSpan}</div>`;
      } else {
        const extra = cell.type === 'op' ? ` mp-cell-op` : cell.type === 'eq' ? ` mp-cell-eq` : '';
        html += `<div class="mp-cell mp-cell-value${extra}" data-v="${esc(cell.value)}">${esc(cell.value)}</div>`;
      }
    }
  }
  return html;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
