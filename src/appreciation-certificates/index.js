import { buildCertificatesUI, unmountCertificates } from './certificates-ui.js';
import './certificates.css';

export function mount(container) {
  buildCertificatesUI(container);
  return unmountCertificates;
}
