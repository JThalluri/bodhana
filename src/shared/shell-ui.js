export function themeToggleMarkup(extraClass = '') {
  return `
    <div class="theme-pill ${extraClass}" role="button" tabindex="0" aria-label="Toggle theme" data-theme-toggle>
      <i class="fas fa-sun theme-sun"></i>
      <span class="theme-pill-track"><span class="theme-pill-thumb"></span></span>
      <i class="fas fa-moon theme-moon"></i>
    </div>
  `;
}
