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
        <table class="mp-grid-table" style="--mp-cols:${cols}"
               role="img" aria-label="Math puzzle grid ${idx + 1}">
          ${gridToHTML(grid, rows, cols, showSolutions)}
        </table>
      </div>
    </section>
  `;
}

function gridToHTML(grid, rows, cols, showSolutions) {
  let html = '<tbody>';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (!cell) {
        html += `<td class="mp-cell mp-cell-black"></td>`;
      } else {
        // Directional border classes:
        // mp-br and mp-bb are always applied to equation cells.
        // mp-bt / mp-bl are added only when the adjacent cell is non-equation
        // (null or out-of-bounds). This ensures exactly one 2px line per edge —
        // no double-borders at junctions between adjacent equation cells.
        const bCls = [
          'mp-br', 'mp-bb',
          !grid[r - 1]?.[c] ? 'mp-bt' : '',
          !grid[r]?.[c - 1] ? 'mp-bl' : '',
        ].filter(Boolean).join(' ');

        if (cell.blank) {
          const solSpan = showSolutions
            ? `<span class="mp-sol">${esc(cell.value)}</span>`
            : '';
          html += `<td class="mp-cell mp-cell-blank ${bCls}">${solSpan}</td>`;
        } else {
          const extra = cell.type === 'op' ? ` mp-cell-op` : cell.type === 'eq' ? ` mp-cell-eq` : '';
          html += `<td class="mp-cell mp-cell-value${extra} ${bCls}" data-v="${esc(cell.value)}">${esc(cell.value)}</td>`;
        }
      }
    }
    html += '</tr>';
  }
  html += '</tbody>';
  return html;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
