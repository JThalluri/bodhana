import {paperForPage} from './paper-size.js';
/** Split intact rows at native physical bounds, including when the preview is hidden. */
export function paginateRows(host, contentSelector, {continuationRemove,continuationLabel} = {}) {
  const source = [...host.children];
  if (!source.length || source[0].dataset.paperSize !== 'statement') return;
  const measure = document.createElement('div');
  measure.className = 'tool-pages';
  measure.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden;display:block;--tool-page-scale:1;';
  document.body.append(measure);
  const result = [];
  try {
    for (const original of source) {
      const originalContent = original.querySelector(contentSelector);
      if (!originalContent) { result.push(original); continue; }
      const items = [...originalContent.children].map(el => el.cloneNode(true));
      let page, content, continuation = false;
      const next = () => {
        page = original.cloneNode(true); page.style.zoom = '1';
        content = page.querySelector(contentSelector); content.replaceChildren();
        if (continuation) page.dataset.paperContinuation = 'true';
        if (continuation && continuationRemove) {
          page.querySelectorAll(continuationRemove).forEach(el => el.remove());
          if (continuationLabel) {
            const label = document.createElement('p');
            label.className = 'paper-continuation'; label.textContent = continuationLabel;
            content.before(label);
          }
        }
        measure.append(page); result.push(page); continuation = true;
      };
      next();
      const paper = paperForPage(page);
      const bottom = () => page.getBoundingClientRect().top + paper.heightPx - parseFloat(getComputedStyle(page).paddingBottom) - 3;
      for (const item of items) {
        content.append(item);
        if (content.children.length > 1 && [...content.children].some(el => el.getBoundingClientRect().bottom > bottom())) {
          item.remove(); next(); content.append(item);
        }
        // One oversized row remains visible for correction; the output guard blocks clipping.
      }
    }
    result.forEach(page => page.style.removeProperty('zoom'));
    host.replaceChildren(...result);
  } finally { measure.remove(); }
}
