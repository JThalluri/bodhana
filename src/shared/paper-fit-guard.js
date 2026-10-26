/** Check the smaller stock at native size, even when its preview is hidden or fitted. */
export function initPaperFitGuard(root) {
  const source = root.querySelector('.tool-pages');
  if (!source) return () => {};
  const warning = document.createElement('span');
  warning.className = 'paper-fit-warning';
  warning.setAttribute('role', 'status'); warning.hidden = true;
  root.querySelector('.tool-header-main').append(warning);
  const blocked = new Set();
  let frame, disposed = false;
  function check() {
    if (disposed) return;
    const pages = [...source.querySelectorAll('[data-paper-size="statement"]')];
    let overflow = false;
    if (pages.length) {
      const measure = document.createElement('div');
      measure.className = source.className;
      measure.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden;display:block;--tool-page-scale:1;';
      document.body.append(measure);
      try {
        for (const original of pages) {
          const page = original.cloneNode(true);
          page.style.zoom = '1'; page.style.transform = 'none'; measure.append(page);
          const bounds = page.getBoundingClientRect();
          for (const el of page.querySelectorAll('*')) {
            if (!(el instanceof HTMLElement) || el.matches('.cert-asset,.worksheet-brand-watermark') || el.closest('.worksheet-brand-watermark')) continue;
            const r = el.getBoundingClientRect();
            if (r.width && r.height && (r.left < bounds.left - 2 || r.top < bounds.top - 2 || r.right > bounds.right + 2 || r.bottom > bounds.bottom + 2)) overflow = true;
          }
          // Hidden solutions count too: the underlying number must fit its answer box.
          for (const cell of page.querySelectorAll('.mp-cell[data-v],.mp-cell-blank,.mg-cell')) {
            if (cell.scrollWidth > cell.clientWidth + 2 || cell.scrollHeight > cell.clientHeight + 2) overflow = true;
            if (cell.dataset.fitValue && !cell.textContent.trim()) cell.textContent = cell.dataset.fitValue;
            const b = cell.getBoundingClientRect();
            const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              if (!walker.currentNode.textContent.trim()) continue;
              const range = document.createRange(); range.selectNodeContents(walker.currentNode);
              for (const r of range.getClientRects()) if (r.width && (r.left < b.left || r.right > b.right || r.top < b.top || r.bottom > b.bottom)) overflow = true;
            }
          }
          page.remove();
          if (overflow) break;
        }
      } finally { measure.remove(); }
    }
    warning.hidden = !overflow;
    warning.textContent = overflow ? 'Content does not fit Statement paper. Choose Letter, reduce content, number ranges or font size, then review the preview before printing.' : '';
    root.dataset.paperFit = overflow ? 'overflow' : 'ready';
    const actions = root.querySelectorAll('.tool-primary-actions button');
    for (const button of actions) {
      if (!/print|export/i.test(button.id)) continue;
      if (overflow && !button.disabled) { blocked.add(button); button.disabled = true; }
      else if (!overflow && blocked.delete(button)) button.disabled = false;
    }
  }
  const schedule = () => { if (disposed) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(check); };
  const observer = new MutationObserver(schedule);
  observer.observe(source, {subtree:true, childList:true, attributes:true, attributeFilter:['data-paper-size']});
  const beforeOutput = event => {
    if (!event.target.closest('.tool-primary-actions button[id*="Print"],.tool-primary-actions button[id*="Export"]')) return;
    check();
    if (!warning.hidden) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  root.addEventListener('click', beforeOutput, true);
  document.fonts?.addEventListener('loadingdone', schedule);
  document.fonts?.ready.then(schedule); schedule();
  return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); document.fonts?.removeEventListener('loadingdone', schedule); root.removeEventListener('click', beforeOutput, true); warning.remove(); };
}
