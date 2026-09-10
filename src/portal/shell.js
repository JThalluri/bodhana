import { toggleTheme } from '../shared/theme.js';

export function initShell() {
  const sidebar  = document.getElementById('portalSidebar');
  const toggle   = document.getElementById('sidebarToggle');
  const overlay  = document.getElementById('sidebarOverlay');
  const themBtn  = document.getElementById('themeToggle');

  const isMobile = () => window.innerWidth <= 768;

  toggle.addEventListener('click', () => {
    if (isMobile()) {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('visible');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('visible');
  });

  // Close mobile sidebar when a nav link is clicked
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', () => {
      if (isMobile()) {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('visible');
      }
    });
  });

  themBtn.addEventListener('click', toggleTheme);
}
