import './paper-size.css';
import { initPaperFitGuard } from './paper-fit-guard.js';
import { initSettingsPersistence } from './settings-persistence.js';
import { openOverlay, closeOverlay } from './modal.js';
import { initPreviewFit } from './preview-fit.js';
import { renderToolInfo } from './tool-info.js';

export function initToolShell(container, key) {
  const root = container.querySelector('.tool-shell');
  if (!root) return () => {};
  root.querySelectorAll('.fas').forEach(icon=>icon.setAttribute('aria-hidden','true'));
  const header = root.querySelector('.tool-header-main');
  const settings = root.querySelector('.tool-settings');
  const body = root.querySelector('.tool-body');
  const paper = settings.querySelector(':scope > .paper-size-field');
  // Keep the family's primary type control first.
  if (paper === settings.firstElementChild && paper.nextElementSibling) paper.nextElementSibling.after(paper);
  // Keep a tab strip and its panels in their own row. Shared controls/notices
  // belong outside that row, otherwise they can squeeze the panels to zero.
  const tabs = settings.querySelector(':scope > [role="tablist"]');
  let tabsRow;
  if (tabs?.nextElementSibling) {
    tabsRow = document.createElement('div'); tabsRow.className = 'tool-settings-tabs';
    const panels = tabs.nextElementSibling;
    tabs.before(tabsRow); tabsRow.append(tabs, panels);
    settings.dataset.tabbedSettings = 'true';
  }
  let guide = root.querySelector('.tool-info-pane');
  if (!guide) { guide = document.createElement('aside'); guide.className = 'tool-info-pane'; body.append(guide); }
  guide.removeAttribute('aria-hidden'); guide.setAttribute('role', 'region'); guide.setAttribute('aria-label', 'Guide');
  const contentCleanup = key === 'dictionary-builder' ? () => {} : renderToolInfo(guide, key);
  const controls = document.createElement('div'); controls.className = 'tool-view-controls no-print';
  controls.innerHTML = '<button class="btn btn-secondary settings-open" aria-expanded="false">Settings</button><button class="btn btn-secondary workspace-switch" aria-pressed="false">Guide</button>';
  (root.querySelector('.tool-primary-actions') || header).prepend(controls);
  const open = controls.querySelector('.settings-open');
  const switcher = controls.querySelector('.workspace-switch');
  const close = document.createElement('button'); close.className = 'btn btn-secondary settings-close no-print'; close.textContent = 'Close settings';
  settings.prepend(close);
  const showGuide = () => { root.dataset.workspace = 'guide'; switcher.textContent = 'Preview'; switcher.setAttribute('aria-pressed', 'true'); };
  const toggle = () => {
    if (root.dataset.workspace !== 'guide') showGuide();
    else { root.dataset.workspace = 'preview'; switcher.textContent = 'Guide'; switcher.setAttribute('aria-pressed', 'false'); root.dispatchEvent(new Event('preview-activated')); }
  };
  const openSettings = () => openOverlay(settings, open);
  open.addEventListener('click', openSettings); close.addEventListener('click', closeOverlay); switcher.addEventListener('click', toggle);
  root.addEventListener('show-guide', showGuide);
  const compact = matchMedia('(max-width: 1479px)');
  const resize = () => { closeOverlay(); root.dispatchEvent(new Event('preview-activated')); };
  compact.addEventListener('change', resize);
  const fitCleanup = initPreviewFit(root, controls);
  const settingsCleanup = initSettingsPersistence(root, key);
  const paperCleanup = initPaperFitGuard(root);
  return () => { paperCleanup(); settingsCleanup(); closeOverlay(); if (tabsRow) { tabsRow.replaceWith(...tabsRow.childNodes); delete settings.dataset.tabbedSettings; } compact.removeEventListener('change', resize); fitCleanup(); contentCleanup(); controls.remove(); close.remove(); root.removeEventListener('show-guide', showGuide); };
}
