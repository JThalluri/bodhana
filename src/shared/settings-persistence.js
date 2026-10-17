import {readPreference, writePreference, clearSavedData, storageMessage} from './device-storage.js';
const excluded = new Set(['mwTypeSelect','wsTypeSelect','hwTypeSelect']);
function controls(root) {
  const managed = root.dataset.settingsManaged === 'true';
  return [...root.querySelectorAll('input,select,textarea')].filter(el =>
    (el.id || el.dataset.persistKey) && !excluded.has(el.id) && !['file','password','hidden','button','submit'].includes(el.type) &&
    (el.dataset.persistKey || !managed && el.closest('.tool-settings,.tool-header')));
}
const keyFor = el => el.dataset.persistKey || el.id;
const valueFor = el => ['checkbox','radio'].includes(el.type) ? el.checked : el.value;
function valid(el, value) {
  if (['checkbox','radio'].includes(el.type)) return typeof value === 'boolean';
  if (typeof value !== 'string') return false;
  if (el.tagName === 'SELECT') return [...el.options].some(option => option.value === value);
  if (['number','range'].includes(el.type)) return value !== '' && Number.isFinite(Number(value)) &&
    (el.min === '' || Number(value) >= Number(el.min)) && (el.max === '' || Number(value) <= Number(el.max));
  return true;
}
export function initSettingsPersistence(root, key) {
  let restoring = true;
  const saved = readPreference('settings:' + key, {});
  // Dispatch one field at a time. Some module handlers synchronise other controls.
  for (const el of controls(root)) {
    const value = saved?.[keyFor(el)];
    if (!valid(el, value) || valueFor(el) === value) continue;
    if (['checkbox','radio'].includes(el.type)) el.checked = value;
    else el.value = value;
    el.dispatchEvent(new Event('input', {bubbles: true}));
    el.dispatchEvent(new Event('change', {bubbles: true}));
  }
  restoring = false;
  const save = () => {
    if (!restoring) writePreference('settings:' + key, Object.fromEntries(controls(root).map(el => [keyFor(el), valueFor(el)])));
  };
  const changed = event => { if (!event.target.closest?.('.device-storage')) save(); };
  root.addEventListener('input', changed); root.addEventListener('change', changed); root.addEventListener('click', changed);
  const panel = document.createElement('section'); panel.className = 'device-storage no-print';
  const note = document.createElement('p'); note.setAttribute('role','status');
  const update = () => { note.textContent = storageMessage() || 'Settings and loaded dictionaries stay in this browser on this device. Keep separate copies of important files.'; };
  update();
  const button = document.createElement('button'); button.className = 'btn btn-secondary btn-sm'; button.textContent = 'Clear saved data';
  button.addEventListener('click', async () => {
    if (!confirm('Clear saved settings and loaded files for all tools on this device? This reloads the app and discards unfinished work. Other app windows should be closed first.')) return;
    button.disabled = true;
    try { await clearSavedData(); location.reload(); }
    catch { update(); button.disabled = false; }
  });
  panel.append(note,button); root.querySelector('.tool-settings')?.append(panel);
  window.addEventListener('bodhana-storage-status', update);
  return () => { root.removeEventListener('input',changed); root.removeEventListener('change',changed); root.removeEventListener('click',changed); window.removeEventListener('bodhana-storage-status',update); panel.remove(); };
}
