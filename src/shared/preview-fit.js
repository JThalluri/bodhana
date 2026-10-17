export function initPreviewFit(root, controls) {
  if (root.classList.contains('db-tool')) return () => {};
  const viewport = root.querySelector('.tool-preview-scroll, .award-preview-wrapper');
  const pages = root.querySelector('.tool-pages');
  if (!viewport || !pages) return () => {};
  const select = document.createElement('select');
  select.className = 'tb-select preview-fit-mode';
  select.setAttribute('aria-label', 'Preview fitting');
  select.innerHTML = '<option value="page">Fit page</option><option value="width">Fit width</option>';
  controls.append(select);
  let frame;
  const fit = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!viewport.clientWidth || !viewport.clientHeight) return;
      const page = pages.querySelector('.seyes-page,.paper-page,.pv-worksheet,.frac-worksheet,.mg-worksheet,.mp-puzzle-page,.sdk-puzzle-page,.wp-puzzle-block,.hw-worksheet,.award-cert-page');
      if (!page) return;
      const w = page.offsetWidth, h = page.offsetHeight;
      if (!w || !h) return;
      const css = getComputedStyle(viewport);
      const aw = viewport.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) - 4;
      const ah = viewport.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom) - 4;
      // 20% supports short split windows; Fit width is the readable scroll mode.
      const scale = Math.max(.2, Math.min(1, aw / w, select.value === 'width' ? 1 : ah / h));
      const stage = root.querySelector('.cert-scale-stage');
      if (stage) {
        stage.style.setProperty('--award-page-scale', scale);
        stage.style.width = `${w * scale}px`; stage.style.height = `${h * scale}px`;
        const label = root.querySelector('#awardZoomLabel');
        if (label) label.textContent = `${Math.round(scale * 100)}%`;
      } else root.style.setProperty('--tool-page-scale', scale);
    });
  };
  const resize = new ResizeObserver(fit); resize.observe(viewport);
  // Observe only page insertion, not scaled geometry or attributes.
  const mutations = new MutationObserver(fit); mutations.observe(pages, { childList: true, subtree: true });
  select.addEventListener('change', fit); root.addEventListener('preview-activated', fit);
  fit();
  return () => { cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect(); select.remove(); root.removeEventListener('preview-activated', fit); };
}
