import {test,expect} from 'playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
let server,origin,version='initial',fail=false,failNetwork=false;
const base=JSON.parse(fs.readFileSync('dist-hosted/release.json','utf8')).base;
const cachePrefix=`bodhana:${base}:`;
const source=fs.readFileSync('dist-hosted/sw.js','utf8');
const types={'.js':'application/javascript','.html':'text/html','.webmanifest':'application/manifest+json','.png':'image/png'};
test.beforeAll(async()=>{
 server=http.createServer((req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname.replace(base,'')||'index.html';
  if(failNetwork && name==='sw.js'){req.socket.destroy();return;}
  if(fail && name==='icon-512.png'){res.writeHead(503).end();return;}
  try{
   const workerSource=version==='initial'?source.replace('self.clients.claim()','Promise.resolve()'):source;
   let data=name==='sw.js'?Buffer.from(workerSource.replace(/"version":"[^"]+"/,`"version":"${version}"`)):fs.readFileSync(path.join('dist-hosted',name));
   if(name==='index.html')data=Buffer.from(data.toString().replace(/<\/body>\s*<\/html>\s*$/,`<div id="release-marker" hidden>${version}</div></body></html>`));
   res.writeHead(200,{'Content-Type':types[path.extname(name)]||'text/plain','Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}${base}`;
});
test.afterAll(()=>new Promise(resolve=>server.close(resolve)));
async function ready(page){await expect.poll(()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())?.active),{timeout:20000}).toBeTruthy();await page.reload();await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBeTruthy();}
test('failed initial install, complete offline relaunch, failed update and multi-tab consent',async({page,context})=>{
 test.setTimeout(90000);
 version='failed-first';fail=true;
 await page.goto(origin+'#/worksheets');
 await expect.poll(()=>page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return !r?.installing && !r?.active;}),{timeout:20000}).toBeTruthy();
 expect(await page.evaluate(()=>caches.keys())).not.toContain(cachePrefix+'failed-first');
 // Keep one existing app tab uncontrolled to verify includeUncontrolled enumeration.
 const second=await context.newPage();await second.goto(origin+'#/worksheets');await expect(second.locator('.seyes-page')).toBeVisible();
 fail=false;version='initial';await page.reload();await ready(page);
 await page.evaluate(()=>caches.open('unrelated-project'));
 await context.setOffline(true);await page.reload();await expect(page.locator('.seyes-page')).toBeVisible();
 failNetwork=true;
 await page.evaluate(async()=>{try {await (await navigator.serviceWorker.getRegistration()).update();} catch{ /* Network failure must leave the active release intact. */ }});
 expect(await page.evaluate(()=>caches.keys())).toContain(cachePrefix+'initial');
 failNetwork=false;
 await context.setOffline(false);
 expect(await second.evaluate(()=>navigator.serviceWorker.controller)).toBeNull();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#wsInput').fill('Keep this unfinished worksheet');await page.keyboard.press('Escape');
 version='failed-update';fail=true;
 await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update();});
 await expect.poll(()=>page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return !r.installing && !r.waiting;}),{timeout:20000}).toBeTruthy();
 expect(await page.evaluate(()=>caches.keys())).toContain(cachePrefix+'initial');
 expect(await page.evaluate(()=>caches.keys())).not.toContain(cachePrefix+'failed-update');
 fail=false;version='approved';
 await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update();});
 await expect(page.getByRole('button',{name:'Update available'})).toBeVisible({timeout:20000});
 expect(await page.locator('#release-marker').textContent()).toBe('initial');
 page.once('dialog',d=>d.accept());second.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Update available'}).click();
 await expect(page.locator('.pwa-actions')).toContainText('deferred');
 expect(await page.locator('#wsInput').inputValue()).toBe('Keep this unfinished worksheet');
 page.once('dialog',d=>d.accept());second.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Update available'}).click();
 await expect(page.locator('#release-marker')).toHaveText('approved',{timeout:20000});await expect(second.locator('#release-marker')).toHaveText('approved',{timeout:20000});
 expect(await page.evaluate(()=>caches.keys())).toContain('unrelated-project');
 await second.close();await context.setOffline(true);await page.reload();await expect(page.locator('#release-marker')).toHaveText('approved');await context.setOffline(false);
 version='rebuilt-rollback';await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update();});
 await expect(page.getByRole('button',{name:'Update available'})).toBeVisible();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Update available'}).click();
 await expect(page.locator('#release-marker')).toHaveText('rebuilt-rollback');await context.setOffline(true);await page.reload();await expect(page.locator('#release-marker')).toHaveText('rebuilt-rollback');await context.setOffline(false);
});

test('a waiting complete release survives a single active tab reload',async({page})=>{
 version='reload-initial';fail=false;await page.goto(origin+'#/worksheets');await ready(page);
 version='reload-waiting';await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update();});
 await expect(page.getByRole('button',{name:'Update available'})).toBeVisible();
 await page.reload();await expect(page.getByRole('button',{name:'Update available'})).toBeVisible();
 expect(await page.evaluate(()=>caches.keys())).toContain(cachePrefix+'reload-waiting');
});

test('cache eviction is reported and explicit online repair restores offline launch',async({page,context})=>{
 version='storage-repair';fail=false;await page.goto(origin+'#/worksheets');await ready(page);
 await page.evaluate(async prefix=>{for(const name of await caches.keys())if(name.startsWith(prefix))await caches.delete(name);},cachePrefix);
 await page.reload();await expect(page.getByRole('button',{name:'Repair offline files'})).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Repair offline files'}).click();
 await expect(page.locator('.pwa-actions')).toContainText('Offline files ready.',{timeout:20000});
 await context.setOffline(true);await page.reload();await expect(page.locator('.seyes-page')).toBeVisible();await context.setOffline(false);
});
