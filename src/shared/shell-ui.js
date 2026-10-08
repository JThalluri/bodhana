/**
 * Render the tab-strip + panel skeleton for .tool-info-pane.
 * Purely generic: no Dictionary-Builder-specific code.
 *
 * @param {{ id: string, label: string, icon?: string }[]} tabs
 * @returns {string} HTML string
 */
export function infoPaneTabsMarkup(tabs) {
  return `
    <div class="info-tabs" role="tablist">
      ${tabs.map((t, i) => `
        <button class="info-tab${i === 0 ? ' active' : ''}" role="tab"
                aria-selected="${i === 0}" data-tab="${t.id}">
          ${t.icon ? `<i class="fas ${t.icon}"></i>` : ''} ${t.label}
        </button>
      `).join('')}
    </div>
    <div class="info-tab-panels">
      ${tabs.map((t, i) => `
        <div class="info-tab-panel${i === 0 ? ' active' : ''}" role="tabpanel" data-panel="${t.id}"></div>
      `).join('')}
    </div>
  `;
}

/**
 * Wire click-to-activate on the tab strip inside container.
 * Returns { activate(tabId) } so the caller can switch tabs programmatically.
 *
 * @param {HTMLElement} container
 * @returns {{ activate: (tabId: string) => void }}
 */
export function wireInfoPaneTabs(container) {
  const tabs   = container.querySelectorAll('.info-tab');
  const panels = container.querySelectorAll('.info-tab-panel');
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

export function themeToggleMarkup(extraClass = '') {
  return `
    <div class="theme-pill ${extraClass}" role="button" tabindex="0" aria-label="Toggle theme" data-theme-toggle>
      <i class="fas fa-sun theme-sun"></i>
      <span class="theme-pill-track"><span class="theme-pill-thumb"></span></span>
      <i class="fas fa-moon theme-moon"></i>
    </div>
  `;
}
