export const DEFAULT_WORDS_PER_PAGE = 10;

function paginate(words, wordsPerPage) {
  const n = Math.max(1, wordsPerPage || DEFAULT_WORDS_PER_PAGE);
  const pages = [];
  for (let i = 0; i < words.length; i += n) pages.push(words.slice(i, i + n));
  return pages.length ? pages : [[]];
}

function pageShell(title, body) {
  return `<div class="paper-page phx-page">
    <div class="phx-page-header">
      <span class="phx-page-title">${title}</span>
      <div class="phx-name-line">
        <span class="phx-name-label">Name:</span><span class="phx-name-blank"></span>
        <span class="phx-name-label">Date:</span><span class="phx-name-blank phx-date-blank"></span>
      </div>
    </div>
    <div class="phx-word-list">${body}</div>
  </div>`;
}

export function renderSheet(sheetData, { showSolutions = false, wordsPerPage = DEFAULT_WORDS_PER_PAGE } = {}) {
  switch (sheetData.type) {
    case 'dissect':       return renderDissect(sheetData, showSolutions, wordsPerPage);
    case 'elkonin':       return renderElkonin(sheetData, showSolutions, wordsPerPage);
    case 'onsetRime':     return renderOnsetRime(sheetData, showSolutions, wordsPerPage);
    case 'syllableSplit': return renderSyllableSplit(sheetData, showSolutions, wordsPerPage);
    default: return '';
  }
}

function renderDissect(data, showSolutions, wordsPerPage) {
  return paginate(data.words, wordsPerPage).map(page => {
    const rows = page.map(item => `
      <div class="phx-word-row">
        <span class="phx-word-label">${item.word}</span>
        <div class="phx-grapheme-row">
          ${item.tokens.map(t =>
            `<span class="wd-grapheme-box phx-ws-box${showSolutions ? '' : ' phx-box-empty'}">${showSolutions ? t : ''}</span>`
          ).join('')}
        </div>
      </div>`).join('');
    return pageShell('Dissect the Word', rows);
  }).join('');
}

function renderElkonin(data, showSolutions, wordsPerPage) {
  return paginate(data.words, wordsPerPage).map(page => {
    const rows = page.map(item => `
      <div class="phx-word-row">
        <span class="phx-word-label">${item.word}</span>
        <div class="phx-elkonin-row">
          ${item.tokens.map(t =>
            `<span class="phx-elkonin-box">${showSolutions ? t : ''}</span>`
          ).join('')}
        </div>
      </div>`).join('');
    return pageShell('Elkonin Sound Boxes', rows);
  }).join('');
}

function renderOnsetRime(data, showSolutions, wordsPerPage) {
  return paginate(data.words, wordsPerPage).map(page => {
    const rows = page.map(item => `
      <div class="phx-word-row phx-or-row">
        <span class="phx-word-label">${item.word}</span>
        <div class="phx-or-boxes">
          <span class="phx-or-box phx-or-onset">${showSolutions ? (item.onset || '—') : ''}</span>
          <span class="phx-or-plus">+</span>
          <span class="phx-or-box phx-or-rime">${showSolutions ? (item.rime || '—') : ''}</span>
        </div>
        ${showSolutions && item.rhymeFamily.length
          ? `<span class="phx-rhyme-family">Rhymes: ${item.rhymeFamily.join(', ')}</span>`
          : ''}
      </div>`).join('');
    return pageShell('Onset &amp; Rime', rows);
  }).join('');
}

function renderSyllableSplit(data, showSolutions, wordsPerPage) {
  return paginate(data.words, wordsPerPage).map(page => {
    const rows = page.map(item => `
      <div class="phx-word-row">
        <span class="phx-word-label">${item.word}</span>
        <div class="phx-grapheme-row">
          ${item.syllables.map(s =>
            `<span class="wd-grapheme-box phx-ws-box phx-syllable-box${showSolutions ? '' : ' phx-box-empty'}">${showSolutions ? s : ''}</span>`
          ).join('')}
        </div>
      </div>`).join('');
    return pageShell('Syllable Split', rows);
  }).join('');
}
