import './shared/local-fonts.js';
import { initPwa } from './pwa/register.js';
import './styles/responsive.css';
import './styles/tool-info.css';
import { loadTheme } from './shared/theme.js';
import { initShell } from './portal/shell.js';
import { initRouter } from './portal/router.js';

loadTheme();
initShell();
initRouter();

initPwa();
