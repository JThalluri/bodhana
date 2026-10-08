/**
 * Layout-agnostic tab markup — generates the strip + panels skeleton.
 * Panel content is filled by the caller. CSS classes control orientation.
 *
 * @param {{ id: string, label: string, icon?: string }[]} tabs
 * @param {{ stripClass?: string, tabClass?: string, panelsClass?: string, panelClass?: string }} [opts]
 * @returns {string} HTML string
 */
export function tabsMarkup(tabs, {
  stripClass  = 'info-tabs',
  tabClass    = 'info-tab',
  panelsClass = 'info-tab-panels',
  panelClass  = 'info-tab-panel',
} = {}) {
  return `
    <div class="${stripClass}" role="tablist">
      ${tabs.map((t, i) => `
        <button class="${tabClass}${i === 0 ? ' active' : ''}" role="tab"
                aria-selected="${i === 0}" data-tab="${t.id}">
          ${t.icon ? `<i class="fas ${t.icon}"></i>` : ''} ${t.label}
        </button>
      `).join('')}
    </div>
    <div class="${panelsClass}">
      ${tabs.map((t, i) => `
        <div class="${panelClass}${i === 0 ? ' active' : ''}" role="tabpanel" data-panel="${t.id}"></div>
      `).join('')}
    </div>
  `;
}

/**
 * Wire click-to-activate. Works for any tab flavor — horizontal info-pane tabs,
 * vertical settings tabs, etc. Only the CSS classes differ.
 *
 * @param {HTMLElement} container
 * @param {{ tabClass?: string, panelClass?: string }} [opts]
 * @returns {{ activate: (tabId: string) => void }}
 */
export function wireTabs(container, {
  tabClass   = 'info-tab',
  panelClass = 'info-tab-panel',
} = {}) {
  const tabs   = container.querySelectorAll(`.${tabClass}`);
  const panels = container.querySelectorAll(`.${panelClass}`);
  function activate(tabId) {
    tabs.forEach(t => {
      const on = t.dataset.tab === tabId;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    panels.forEach(p => p.classList.toggle('active', p.dataset.panel === tabId));
  }
  tabs.forEach(t => t.addEventListener('click', () => activate(t.dataset.tab)));
  return { activate };
}

// Thin wrappers — Phase 4's call sites keep working unchanged
export function infoPaneTabsMarkup(tabs) { return tabsMarkup(tabs); }
export function wireInfoPaneTabs(container) { return wireTabs(container); }

export function themeToggleMarkup(extraClass = '') {
  return `
    <div class="theme-pill ${extraClass}" role="button" tabindex="0" aria-label="Toggle theme" data-theme-toggle>
      <i class="fas fa-sun theme-sun"></i>
      <span class="theme-pill-track"><span class="theme-pill-thumb"></span></span>
      <i class="fas fa-moon theme-moon"></i>
    </div>
  `;
}
