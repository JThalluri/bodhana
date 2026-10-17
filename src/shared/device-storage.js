const scope = typeof __APP_BASE__ !== 'undefined' && __APP_BASE__ !== './'
  ? __APP_BASE__ : (globalThis.location?.pathname || 'portable');
export const storagePrefix = `bodhana:device:v1:${scope}:`;
const databaseName = storagePrefix + 'files';
let connection, openDatabase;
let failure = '';
let clearing = false;
let writes = Promise.resolve();
const clearListeners = new Set();
function currentEpoch() { try { return localStorage.getItem(storagePrefix+'cleared') || 'initial'; } catch { return 'initial'; } }
const sessionEpoch = currentEpoch();
globalThis.window?.addEventListener('storage',event=>{
  if (event.key !== storagePrefix+'cleared') return;
  clearing = true; clearListeners.forEach(stop=>stop());
  report('Saved data was cleared in another window. Reload this window before saving again.');
});

function report(message = '') {
  failure = message;
  globalThis.window?.dispatchEvent(new CustomEvent('bodhana-storage-status', {detail: message}));
}
export function storageMessage() { return failure; }
export function readPreference(key, fallback = null) {
  try {
    const record = JSON.parse(localStorage.getItem(storagePrefix + key) || 'null');
    return record?.version === 1 && record.epoch === currentEpoch() ? record.data : fallback;
  } catch { report('Saved settings are unavailable. Changes may not survive closing this window.'); return fallback; }
}
export function writePreference(key, data) {
  if (clearing || sessionEpoch !== currentEpoch()) return false;
  try { localStorage.setItem(storagePrefix + key, JSON.stringify({version: 1, epoch: sessionEpoch, data})); return true; }
  catch { report('Settings could not be saved. Browser storage may be full or disabled.'); return false; }
}
export function readSelection(key, allowed, fallback) {
  const saved = readPreference('selection:' + key);
  return allowed.includes(saved) ? saved : fallback;
}
function database() {
  if (!connection) connection = new Promise((resolve, reject) => {
    let request, settled = false;
    const fail = error => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } };
    const timer = setTimeout(() => fail(new Error('Storage did not open')), 3000);
    try { request = indexedDB.open(databaseName, 1); } catch (error) { fail(error); return; }
    request.onupgradeneeded = () => request.result.createObjectStore('workspaces');
    request.onblocked = () => fail(new Error('Storage is blocked by another window'));
    request.onerror = () => fail(request.error);
    request.onsuccess = () => {
      if (settled) { request.result.close(); return; }
      settled = true; clearTimeout(timer);
      request.result.onversionchange = () => { request.result.close(); connection = null; openDatabase = null; };
      openDatabase = request.result;
      resolve(request.result);
    };
  });
  return connection;
}
async function transact(mode, action) {
  const db = openDatabase || await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('workspaces', mode);
    const request = action(transaction.objectStore('workspaces'));
    transaction.oncomplete = () => resolve(request?.result);
    transaction.onabort = () => reject(transaction.error || new Error('Storage transaction failed'));
    transaction.onerror = () => {}; // onabort reports the failure once.
  });
}
function enqueue(action) {
  // IDB serialises read/write transactions in creation order. Start immediately
  // so pagehide flushes create their transaction before the document closes.
  const next = action();
  writes = Promise.allSettled([writes,next]).then(() => {});
  return next;
}

// Binary buffers avoid WebKit's IndexedDB Blob/File preparation failures.
// Prepare once on upload, before exposing a File in module state, so snapshots
// and pagehide flushes remain synchronous and never reread large documents.
const fileBytes = new WeakMap();
export async function prepareFiles(files) {
  await Promise.all(files.map(async file => { if (!fileBytes.has(file)) fileBytes.set(file, await file.arrayBuffer()); }));
}
export const packFiles = files => files.map(file => {
  const bytes = fileBytes.get(file);
  if (!bytes) throw new Error('File has not been prepared for storage');
  return {name: file.name, type: file.type, lastModified: file.lastModified, bytes};
});
export const unpackFiles = files => (files || []).filter(file => file.bytes instanceof ArrayBuffer && typeof file.name === 'string')
  .map(entry => {
    const file = new File([entry.bytes], entry.name, {type: entry.type, lastModified: entry.lastModified});
    fileBytes.set(file,entry.bytes); return file;
  });

export function initWorkspacePersistence(root, key, {snapshot, restore}) {
  let active = true, ready = false, dirty = false, timer, revision = 0;
  root.inert = true;
  root.setAttribute('aria-busy', 'true');
  root.dataset.persistenceReady = 'false';
  const save = () => {
    clearTimeout(timer);
    if (!active || !ready || clearing) return;
    dirty = false;
    const savedRevision = ++revision;
    let record;
    try { record = {version: 1, epoch: sessionEpoch, data: structuredClone(snapshot())}; }
    catch { root.dataset.saveState = 'error'; report('Loaded files could not be saved. Keep a separate copy before closing.'); return; }
    root.dataset.saveState = 'saving';
    enqueue(() => clearing || sessionEpoch !== currentEpoch() ? Promise.resolve() : transact('readwrite', store => store.put(record, key)))
      .then(() => { if (active && savedRevision === revision) root.dataset.saveState = 'saved'; })
      .catch(() => { if (active) root.dataset.saveState = 'error'; report('Loaded files could not be saved. Browser storage may be full or disabled; keep a separate copy.'); });
  };
  const changed = event => {
    if (!ready || event.target.closest?.('.device-storage')) return;
    dirty = true; ++revision; root.dataset.saveState = 'pending';
    clearTimeout(timer); timer = setTimeout(save, 150);
  };
  const flush = () => { if (dirty) save(); };
  const stop = () => { active = false; clearTimeout(timer); root.inert = false; root.removeAttribute('aria-busy'); root.dataset.persistenceReady = 'true'; };
  clearListeners.add(stop);
  for (const event of ['input','change','click']) root.addEventListener(event, changed);
  window.addEventListener('pagehide', flush);
  const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
  document.addEventListener('visibilitychange', hidden);
  (async () => {
    try {
      // Await earlier unmount saves before re-entering the same module.
      await writes;
      const record = await transact('readonly', store => store.get(key));
      if (active && root.isConnected && record?.version === 1 && record.epoch === currentEpoch()) restore(record.data);
    } catch { report('Saved files are unavailable. You can keep working, but files may need loading again.'); }
    finally {
      if (active) { ready = true; root.inert = false; root.removeAttribute('aria-busy'); root.dataset.persistenceReady = 'true'; }
    }
  })();
  return {save, dispose() {
    flush(); stop(); clearListeners.delete(stop);
    for (const event of ['input','change','click']) root.removeEventListener(event, changed);
    window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hidden);
  }};
}

export async function clearSavedData() {
  clearing = true;
  clearListeners.forEach(stop => stop());
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(storagePrefix)) localStorage.removeItem(key);
    localStorage.setItem(storagePrefix+'cleared', crypto.randomUUID());
    await writes;
    await transact('readwrite', store => store.clear());
  } catch {
    report('Some saved data could not be cleared. Close other app windows and clear this site’s data in browser settings.');
    throw new Error('Could not clear saved data');
  }
}
