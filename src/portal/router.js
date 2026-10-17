import { initToolShell } from '../shared/tool-shell-controller.js';
const routes = {
  '/':                 () => import('./home.js'),
  '/math':             () => import('../math-worksheets/index.js'),
  '/math-worksheets':  () => import('../math-worksheets/index.js'),
  '/fractions':        () => import('../math-worksheets/index.js'),
  '/math-games':       () => import('../math-games/index.js'),
  '/word-puzzles':     () => import('../wordpuzzle/index.js'),
  '/math-puzzles':     () => import('../mathpuzzle/index.js'),
  '/sudoku':           () => import('../sudoku/index.js'),
  '/dict-builder':        () => import('../dictbuilder/index.js'),
  '/worksheets':          () => import('../worksheets/index.js'),
  '/certificates':        () => import('../appreciation-certificates/index.js'),
  '/phonics-worksheets':  () => import('../phonics-worksheets/index.js'),
};

const printableRoutes = new Set([
  '/math',
  '/math-worksheets',
  '/fractions',
  '/math-games',
  '/word-puzzles',
  '/math-puzzles',
  '/sudoku',
  '/dict-builder',
  '/worksheets',
  '/certificates',
  '/phonics-worksheets',
]);

let currentUnmount = null;
let routeGeneration = 0;

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

async function handleRoute() {
  const generation = ++routeGeneration;
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const content = document.getElementById('portalContent');

  if (currentUnmount) {
    currentUnmount();
    currentUnmount = null;
  }

  content.innerHTML = '';
  updateActiveNav(hash);
  document.body.classList.toggle('route-home', hash === '/');
  document.body.classList.toggle('route-printable-tool', printableRoutes.has(hash));
  document.querySelector('#themeToggle')?.toggleAttribute('data-theme-toggle', !printableRoutes.has(hash));

  const loader = routes[hash] ?? routes['/'];
  try {
    const mod = await loader();
    if (generation !== routeGeneration) return;
    const dispose = mod.mount(content);
    const keys = { '/math-games':'math-games','/word-puzzles':'word-puzzles','/math-puzzles':'math-puzzles','/sudoku':'sudoku','/dict-builder':'dictionary-builder','/certificates':'certificates','/phonics-worksheets':'phonics-worksheets' };
    const shellDispose = keys[hash] ? initToolShell(content, keys[hash]) : () => {};
    currentUnmount = () => { shellDispose(); dispose?.(); };
  } catch (e) {
    if (generation !== routeGeneration) return;
    content.innerHTML = `<div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <p>Failed to load this page.</p>
    </div>`;
    console.error(e);
  }
}

function updateActiveNav(hash) {
  document.querySelectorAll('.nav-item').forEach(a => {
    const route = a.dataset.route;
    a.classList.toggle('active', route === hash);
  });
}
