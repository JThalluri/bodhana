/** Returns physical pages; smaller stock continues the same numbered test. */
export function renderPapers(papers, questionCount, paperSize = 'letter') {
  if (paperSize === 'statement') return papers.map((paper,idx) => statementPages(paper,idx,questionCount)).join('');
  return papers.map((paper,idx) => paperHTML(paper,idx,questionCount)).join('');
}

function statementPages(paper, idx, questionCount) {
  const pages = [];
  for (let offset = 0; offset < paper.length; offset += 32) {
    const batch = paper.slice(offset,offset + 32);
    const rowCount = Math.ceil(batch.length / 2);
    const columns = [batch.slice(0,rowCount),batch.slice(rowCount)];
    const rows = Array.from({length:rowCount},(_,row) => '<tr>' + columns.map((column,col) =>
      column[row] ? questionCell(column[row],offset + col * rowCount + row + 1) : '<td></td>'
    ).join('') + '</tr>').join('');
    pages.push(`<section class="paper-page" data-paper-size="statement" style="width:5.5in;height:8.5in">
      <div class="paper-header">
        <span class="header-name">Name <span class="underline-sm"></span></span>
        <span class="header-score">Score <span class="score-underline"></span> / ${questionCount}</span>
        <span class="header-time">Time <span class="underline-vsm"></span></span>
        <span class="header-var">Test-${idx + 1}${offset ? ' (continued)' : ''}</span>
      </div><table class="paper-table"><tbody>${rows}</tbody></table></section>`);
  }
  return pages.join('');
}

function paperHTML(paper, idx, qCount) {
  const col0 = paper.slice(0, Math.ceil(qCount / 3));
  const col1 = paper.slice(col0.length, col0.length * 2);
  const col2 = paper.slice(col0.length * 2);
  const cols = [col0, col1, col2];
  const rows = Math.max(...cols.map(c => c.length));

  const tableRows = Array.from({ length: rows }, (_, row) =>
    `<tr>${cols.map((col, ci) => {
      const offset = cols.slice(0, ci).reduce((s, c) => s + c.length, 0);
      return col[row]
        ? questionCell(col[row], offset + row + 1)
        : '<td></td>';
    }).join('')}</tr>`
  ).join('');

  return `
    <section class="paper-page">
      <div class="paper-header">
        <span class="header-name">Name <span class="underline-sm"></span></span>
        <span class="header-score">Score <span class="score-underline"></span> / ${qCount}</span>
        <span class="header-time">Time <span class="underline-vsm"></span></span>
        <span class="header-var">Test-${idx + 1}</span>
      </div>
      <table class="paper-table"><tbody>${tableRows}</tbody></table>
    </section>
  `;
}

function questionCell(expr, num) {
  return `<td><div class="question">
    <span class="q-num">${num}.</span>
    <span class="q-expr">${expr} =</span>
    <span class="q-line"></span>
  </div></td>`;
}
