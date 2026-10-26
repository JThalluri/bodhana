/** Run native-size layout independently of a collapsed/Guide-only preview. */
export function measurePaperPages(host, render) {
  const parent = host.parentNode, next = host.nextSibling;
  const measure = document.createElement('div');
  measure.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden;display:block;--tool-page-scale:1;';
  document.body.append(measure); measure.append(host);
  try { return render(); }
  finally { parent.insertBefore(host,next); measure.remove(); }
}
