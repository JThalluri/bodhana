const routes = {
  '/':             () => import('./home.js'),
  '/math':         () => import('../math/index.js'),
  '/word-puzzles': () => import('../wordpuzzle/index.js'),
  '/math-puzzles': () => import('../mathpuzzle/index.js'),
  '/sudoku':       () => import('../sudoku/index.js'),
  '/dict-builder': () => import('../dictbuilder/index.js'),
};

let currentUnmount = null;

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

async function handleRoute() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const content = document.getElementById('portalContent');

  if (currentUnmount) {
    currentUnmount();
    currentUnmount = null;
  }

  content.innerHTML = '';
  updateActiveNav(hash);

  const loader = routes[hash] ?? routes['/'];
  try {
    const mod = await loader();
    currentUnmount = mod.mount(content) ?? null;
  } catch (e) {
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
