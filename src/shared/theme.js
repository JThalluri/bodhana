const STORAGE_KEY = 'bodhana-theme';

export function loadTheme() {
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* A restricted browser must still open the portal. */ }
  const theme = saved === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Theme still changes in this window. */ }
}
