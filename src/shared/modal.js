// Keep forms in place: ancestor siblings become inert, never the dialog itself.
let activeClose;
export function closeOverlay() { activeClose?.(); }
export function openOverlay(panel, trigger, onClose = () => {}) {
  closeOverlay();
  const previous = trigger || document.activeElement;
  const saved = ['role', 'aria-modal', 'aria-label', 'tabindex'].map(k => [k, panel.getAttribute(k)]);
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', trigger?.textContent?.trim() || 'Navigation');
  panel.tabIndex = -1;
  panel.classList.add('overlay-open');
  trigger?.setAttribute('aria-expanded', 'true');
  const backdrop = document.createElement('div');
  backdrop.className = 'tool-backdrop no-print';
  document.body.append(backdrop);
  const inert = [];
  for (let node = panel; node.parentElement; node = node.parentElement) {
    for (const sibling of node.parentElement.children) {
      if (sibling === node || sibling === backdrop || sibling.tagName === 'SCRIPT') continue;
      inert.push([sibling, sibling.inert]); sibling.inert = true;
    }
  }
  const focusable = () => [...panel.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')]
    .filter(el => !el.disabled && el.getClientRects().length);
  const keydown = e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') {
      const list = focusable(); const first = list[0] || panel; const last = list.at(-1) || panel;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === panel)) { e.preventDefault(); first.focus(); }
    }
  };
  const close = () => {
    if (activeClose !== close) return;
    activeClose = null;
    document.removeEventListener('keydown', keydown, true);
    backdrop.remove(); panel.classList.remove('overlay-open');
    inert.forEach(([el, value]) => el.inert = value);
    saved.forEach(([k,v]) => v === null ? panel.removeAttribute(k) : panel.setAttribute(k,v));
    trigger?.setAttribute('aria-expanded', 'false');
    onClose();
    if (previous?.isConnected && previous.getClientRects().length) previous.focus();
  };
  activeClose = close;
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', keydown, true);
  (focusable()[0] || panel).focus();
  return close;
}
