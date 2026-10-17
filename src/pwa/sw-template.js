/* Replaced by the hosted build. No user documents or third-party responses are cached. */
const { base, version, prefix, assets } = __CONFIG__;
const cacheName = prefix + version;
self.addEventListener('install', event => {
 event.waitUntil((async()=>{
  const cache=await caches.open(cacheName);
  const results=await Promise.allSettled(assets.map(async url=>{
    const response=await fetch(new Request(url,{cache:'reload'}));
    if(!response.ok || response.type==='opaque') throw new Error('Required asset failed: '+url);
    // Consume each response immediately; holding all streams can stall browser connection limits.
    await cache.put(url,response);
  }));
  if(results.some(result=>result.status==='rejected')) {
    await caches.delete(cacheName);
    throw new Error('Required offline assets could not be cached');
  }
 })());
});
// Old caches stay while clients of older releases exist. Never delete another project's caches.
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('message', event => {
 if(event.data?.type==='CHECK_OFFLINE') event.waitUntil((async()=>{
  const cache=await caches.open(cacheName);
  const entries=await Promise.all(assets.map(asset=>cache.match(asset)));
  event.ports[0]?.postMessage({complete:entries.every(Boolean)});
 })());
 if(event.data?.type==='CLIENTS') event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>event.ports[0]?.postMessage(clients.filter(c=>new URL(c.url).pathname.startsWith(base)).map(c=>({id:c.id,url:c.url})))));
 if(event.data?.type==='ACTIVATE_APPROVED') self.skipWaiting();
 if(event.data?.type==='PRUNE' && event.source) event.waitUntil((async()=>{
  if(self.registration.waiting || self.registration.installing) return;
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  if(clients.length===1) for(const key of await caches.keys()) if(key.startsWith(prefix) && key!==cacheName) await caches.delete(key);
 })());
});
self.addEventListener('fetch', event => {
 const url=new URL(event.request.url);
 if(event.request.method!=='GET' || url.origin!==self.location.origin) return;
 const path=url.pathname;
 if(!assets.includes(path) && !(event.request.mode==='navigate' && path===base)) return;
 event.respondWith((async()=>{
  const cache=await caches.open(cacheName);
  const cached=await cache.match(path===base ? base+'index.html':path);
  return cached || fetch(event.request);
 })());
});
