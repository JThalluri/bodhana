import { openOverlay, closeOverlay } from '../shared/modal.js';
import { toggleTheme } from '../shared/theme.js';
import { BANNER_URL } from './banner.js';

export function initShell() {
  const sidebar  = document.getElementById('portalSidebar');
  const toggle   = document.getElementById('sidebarToggle');
  const overlay  = document.getElementById('sidebarOverlay');

  document.querySelectorAll('.nav-item').forEach(link=>link.setAttribute('aria-label',link.querySelector('.nav-label')?.textContent || 'Home'));
  toggle.setAttribute('aria-controls','portalSidebar');
  const brandImg = document.getElementById('brandBanner');
  if (brandImg) brandImg.src = BANNER_URL;

  const isMobile = () => window.innerWidth < 1480;
  let desktopCollapsed = false;
  const sync = () => { closeOverlay(); sidebar.classList.toggle('collapsed', isMobile() || desktopCollapsed); };
  window.matchMedia('(max-width:1479px)').addEventListener('change', sync);
  sync();

  toggle.addEventListener('click', () => {
    if (isMobile()) {
      if (sidebar.classList.contains('overlay-open')) closeOverlay();
      else openOverlay(sidebar, toggle);
    } else {
      desktopCollapsed = !desktopCollapsed; sync();
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
        closeOverlay();
      }
    });
  });

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-theme-toggle]');
    if (toggle) toggleTheme();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.key !== 'Enter' && e.key !== ' ') || !e.target.closest('[data-theme-toggle]')) return;
    e.preventDefault();
    toggleTheme();
  });
}
