import {test,expect} from 'playwright/test';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
const artifact=pathToFileURL(process.cwd()+'/dist/index.html').href;
const baseline=pathToFileURL(process.cwd()+'/artifacts/baseline/index.html').href;
const printSelector='.print-document .paper-page,.print-document .award-cert-page,.page';
test('baseline/current Letter print frames, Seyes geometry, landscape and multi-page export',async({page,browser})=>{
 test.setTimeout(120000);await page.route('https://**/*',route=>route.abort());fs.mkdirSync('artifacts/outputs',{recursive:true});const report={};
 for(const [label,url] of [...(fs.existsSync('artifacts/baseline/index.html') ? [['baseline',baseline]] : []),['current',artifact]]){
  report[label]={};
  for(const route of ['worksheets','math-worksheets','certificates']){
   await page.setViewportSize({width:1920,height:1080});await page.goto(url+'#/'+route);await expect(page.locator('.tool-header')).toHaveCount(1);
   await expect(page.locator('.tool-header-title')).toHaveText({'worksheets':'Seyes Worksheets','math-worksheets':'Arithmetic Tests','certificates':'Appreciation Certificates'}[route]);
   await page.evaluate(()=>document.querySelectorAll('iframe').forEach(frame=>frame.remove()));
   await page.evaluate(()=>{
    new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.tagName==='IFRAME')node.contentWindow.print=()=>{};}).observe(document.body,{childList:true});
   });
   await page.getByRole('button',{name:/Print/}).click();
   await expect.poll(()=>page.evaluate(selector=>!!document.querySelector('iframe')?.contentDocument?.querySelector(selector),printSelector)).toBeTruthy();
   const data=await page.evaluate(selector=>{const doc=document.querySelector('iframe').contentDocument;return {html:doc.documentElement.outerHTML,pages:[...doc.querySelectorAll(selector)].map(p=>({width:p.offsetWidth,height:p.offsetHeight,zoom:getComputedStyle(p).zoom,watermarks:p.querySelectorAll('.worksheet-brand-watermark').length})),chrome:!!doc.querySelector('.tool-view-controls,.tool-info-pane'),grid:doc.querySelector('.grid svg')?.getAttribute('viewBox')};},printSelector);
   report[label][route]={pages:data.pages,grid:data.grid,chrome:data.chrome};
   expect(data.chrome).toBe(false);expect(data.pages.length).toBeGreaterThan(0);
   for(const p of data.pages){expect(p.width).toBe(route==='certificates'?1056:816);expect(p.height).toBe(route==='certificates'?816:1056);expect(p.zoom).toBe('1');expect(p.watermarks).toBe(route==='certificates'?0:1);}
   const output=await browser.newPage({viewport:{width:route==='certificates'?1056:816,height:route==='certificates'?816:1056}});
   await output.route('https://**/*',route=>route.abort());
   await output.setContent(data.html);await output.evaluate(()=>document.fonts.ready);await output.emulateMedia({media:'print'});
   await output.pdf({path:`artifacts/outputs/${label}-${route}.pdf`,preferCSSPageSize:true,printBackground:true});
   await output.screenshot({path:`artifacts/outputs/${label}-${route}.png`});await output.close();
  }
 }
 for(const route of report.baseline ? Object.keys(report.current) : []){expect(report.current[route].pages.length).toBe(report.baseline[route].pages.length);expect(report.current[route].grid).toBe(report.baseline[route].grid);}
 fs.writeFileSync('artifacts/outputs/print-geometry.json',JSON.stringify(report,null,2));
 await page.goto(artifact+'#/math-worksheets');await expect(page.locator('.paper-page')).not.toHaveCount(0);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:/Export/}).click();await (await download).saveAs('artifacts/outputs/current-arithmetic-export.pdf');
});
test('Sudoku every tile count and Phonics every activity preserve fitting and settings tabs',async({page})=>{
 await page.goto(artifact+'#/sudoku');
 for(const count of ['1','2','4','6']){
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#sdkTileCount').selectOption(count);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/Generate/}).click();await expect(page.locator('.sdk-puzzle-page')).not.toHaveCount(0);
 }
 await page.goto(artifact+'#/phonics-worksheets');await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#phxBtnDemo').click();
 await page.locator('.phx-stab[data-tab="activity"]').click();
 for(const type of ['dissect','elkonin','onsetRime','syllableSplit']){
  await page.locator('#phxActivityType').selectOption(type);await expect(page.locator('.phx-page')).not.toHaveCount(0);
 }
 await page.keyboard.press('Escape');await page.setViewportSize({width:800,height:1024});await page.getByRole('button',{name:'Guide',exact:true}).click();await expect(page.locator('[data-tool-info="phonics-worksheets"]')).toBeVisible();
});
test('Dictionary manual entry, live Detail, failed lookup and download remain usable',async({page})=>{
 await page.setViewportSize({width:800,height:1024});await page.goto(artifact+'#/dict-builder');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const input=page.locator('#dbManualInput');await input.fill('caveat react theater');await page.locator('#dbManualAddAll').click();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:/Enrich/}).click();
 if(await page.getByRole('button',{name:'Preview',exact:true}).isVisible()) await page.getByRole('button',{name:'Preview',exact:true}).click();
 await page.locator('.db-word-select').first().click();
 await expect(page.locator('.tool-info-pane')).toBeVisible();await expect(page.getByRole('tab',{name:/Detail/})).toHaveAttribute('aria-selected','true');
 await page.route('https://en.wiktionary.org/**',route=>route.abort());
 await page.locator('[data-action="lookup"]').click();await expect(page.locator('[data-lookup-result]')).toContainText('reach the dictionary');
 await page.locator('[data-flag-note]').fill('Review this fixture');await page.locator('[data-action="flag"]').click();
 const flagsDownload=page.waitForEvent('download');await page.locator('[data-action="export-flags"]').click();await (await flagsDownload).saveAs('artifacts/outputs/dictionary-flags.json');
 expect(fs.readFileSync('artifacts/outputs/dictionary-flags.json','utf8')).toContain('Review this fixture');
 await page.getByRole('tab',{name:/Notes/}).click();await expect(page.locator('[data-tool-info="dictionary-builder"]')).toBeVisible();
 await page.getByRole('button',{name:'Preview',exact:true}).click();
 const download=page.waitForEvent('download');await page.locator('#dbBtnDownload').click();await (await download).saveAs('artifacts/outputs/dictionary.txt');
});

test('all Word Puzzle types and dense multi-page fitting retain scroll access',async({page})=>{
 await page.goto(artifact+'#/word-puzzles');
 for(const type of ['wordsearch','crisscross','jumble']){
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#wpMode').selectOption(type);await page.locator('#wpPuzzleCount').fill('3');await page.keyboard.press('Escape');
  await page.locator('#wpBtnGenerate').click();await expect(page.locator('.wp-puzzle-block')).toHaveCount(3);
  await page.getByRole('combobox',{name:'Preview fitting'}).selectOption('width');
  await page.locator('.tool-preview-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
  const last=await page.locator('.wp-puzzle-block').last().boundingBox();const viewport=await page.locator('.tool-preview-scroll').boundingBox();
  expect(last.y).toBeLessThan(viewport.y+viewport.height);expect(last.y+last.height).toBeLessThanOrEqual(viewport.y+viewport.height+2);
 }
});
test('offline local document readers parse PDF, DOCX and ODT without CDN requests',async({page,context})=>{
 test.setTimeout(60000);
 await page.goto(artifact+'#/dict-builder');await context.setOffline(true);
 const JSZip=(await import('jszip')).default;
 const zipDoc=new JSZip();zipDoc.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>');
 zipDoc.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>teacher theater reactor</w:t></w:r></w:p></w:body></w:document>');
 const zipOdt=new JSZip();zipOdt.file('content.xml','<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><text:p>teacher theater reactor</text:p></office:document-content>');
 const payloads=[{name:'sample.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await zipDoc.generateAsync({type:'nodebuffer'})},{name:'sample.odt',mimeType:'application/vnd.oasis.opendocument.text',buffer:await zipOdt.generateAsync({type:'nodebuffer'})},{name:'sample.pdf',mimeType:'application/pdf',buffer:fs.readFileSync('tests/content/fixtures/document.pdf')}];
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#dbFileInput').setInputFiles(payloads);await page.keyboard.press('Escape');
 await page.locator('#dbBtnExtract').click();await expect(page.locator('#dbStatus')).toContainText('words ready',{timeout:20000});await expect(page.locator('.db-word-select')).not.toHaveCount(0);
 await context.setOffline(false);
});

test('all Math categories and dense Math Games/Puzzles generate fitted Letter pages',async({page})=>{
 await page.setViewportSize({width:1024,height:600});await page.goto(artifact+'#/math-worksheets');await expect(page.locator('.tool-view-controls')).toHaveCount(1);
 for(const category of ['place-value','fractions-drill','money-counting','time-problems','math-test']){
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#mwTypeSelect').selectOption(category);await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:/Generate/}).click();
  const printable=page.locator('.tool-pages > .paper-page,.tool-pages > .pv-worksheet,.tool-pages > .frac-worksheet').first();await expect(printable).toBeVisible();
  expect(await printable.evaluate(el=>[el.offsetWidth,el.offsetHeight])).toEqual([816,1056]);
  const bounds=await printable.boundingBox(),viewport=await page.locator('.tool-preview-scroll').boundingBox();expect(bounds.height).toBeLessThanOrEqual(viewport.height);
 }
 for(const [route,count,selector] of [['math-games','#mgPages','.mg-worksheet'],['math-puzzles','#mpPuzzleCount','.mp-puzzle-page']]){
  await page.goto(artifact+'#/'+route);await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator(count).fill('3');
  if(route==='math-games') await page.locator('#mgGamesPerPage').selectOption('8');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:/Generate/}).click();expect(await page.locator(selector).count()).toBeGreaterThanOrEqual(3);
  await page.getByRole('combobox',{name:'Preview fitting'}).selectOption('width');
  // Fitting commits on the next animation frame and changes scrollHeight.
  await expect(async()=>{
   await page.locator('.tool-preview-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
   await expect(page.locator(selector).last()).toBeInViewport({timeout:500});
  }).toPass({timeout:10000});
 }
});
