import {test,expect} from 'playwright/test';import {pathToFileURL} from 'node:url';import fs from 'node:fs';
const base=JSON.parse(fs.readFileSync('dist-hosted/release.json')).base;
for(const [target,url] of [['portable',pathToFileURL(process.cwd()+'/dist/index.html').href],['hosted','http://127.0.0.1:4178'+base]])test(`${target}: Word Practice paper, controls, offline persistence and output`,async({page,context,browser})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1920,height:1080});await page.goto(url+'#/worksheets');
 await page.locator('#wsTypeSelect').selectOption('handwriting');await expect(page.locator('[data-persistence-ready]')).toHaveAttribute('data-persistence-ready','true');
 await page.locator('#hw-exerciseFormat').selectOption('word_practice');await page.locator('#hw-paperSize').selectOption('statement');
 await page.locator('.hw-stab[data-tab="content"]').click();await page.locator('#hw-userContentText').fill('create separate granular pristine');
 await page.locator('.hw-stab[data-tab="layout"]').click();for(const name of ['left','right','top','bottom'])await expect(page.locator(`[data-path="layout.${name}MarginInch"]`)).toHaveValue('0.25');
 await expect(page.locator('.hw-word-practice')).toHaveCount(1);await expect.poll(()=>page.locator('.hw-word-practice').evaluate(el=>[el.offsetWidth,el.offsetHeight])).toEqual([528,816]);
 await expect(page.locator('.hw-practice-word')).toHaveText(['create','separate','granular','pristine']);
 await page.screenshot({path:`artifacts/${target}-word-practice-desktop.png`});
 await page.evaluate(()=>new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.tagName==='IFRAME')n.contentWindow.print=()=>{};}).observe(document.body,{childList:true}));
 await page.locator('#hwPrintBtn').click();await expect.poll(()=>page.evaluate(()=>!!document.querySelector('iframe')?.contentDocument.querySelector('.print-document .hw-word-practice'))).toBeTruthy();
 const html=await page.evaluate(()=>{const d=document.querySelector('iframe').contentDocument,p=d.querySelector('.hw-word-practice');if(p.offsetWidth!==528||p.offsetHeight!==816||!p.querySelector('.worksheet-brand-watermark'))throw Error('Invalid Statement print geometry');return d.documentElement.outerHTML;});
 const output=await browser.newPage();await output.setContent(html);await output.evaluate(()=>document.fonts.ready);await output.emulateMedia({media:'print'});await output.pdf({path:`artifacts/${target}-word-practice-print.pdf`,preferCSSPageSize:true,printBackground:true});await output.screenshot({path:`artifacts/${target}-word-practice-print.png`});await output.close();
 await page.evaluate(()=>document.querySelectorAll('iframe').forEach(f=>f.remove()));
 const download=page.waitForEvent('download');await page.locator('#hwExportBtn').click();await (await download).saveAs(`artifacts/${target}-word-practice-export.pdf`);expect(fs.readFileSync(`artifacts/${target}-word-practice-export.pdf`,'latin1')).toContain('/MediaBox [0 0 396 612]');
 await page.locator('.hw-stab[data-tab="setup"]').click();await page.locator('[id="hw-wordPractice.lines"]').selectOption('all');await expect(page.locator('.hw-practice-word')).toHaveCount(0);
 await page.locator('[id="hw-wordPractice.mode"]').selectOption('words');await expect(page.locator('.hw-practice-word')).toHaveCount(4);await expect(page.locator('[id="hw-wordPractice.lines"]')).toBeDisabled();
 await page.locator('[id="hw-wordPractice.mode"]').selectOption('practice');await page.locator('[id="hw-wordPractice.lines"]').selectOption('2');
 await expect(page.locator('[data-save-state]')).toHaveAttribute('data-save-state','saved');
 if(target==='hosted'){await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBeTruthy();}
 await context.setOffline(true);await page.reload();await expect(page.locator('[data-persistence-ready]')).toHaveAttribute('data-persistence-ready','true');await expect(page.locator('.hw-practice-word')).toHaveCount(4);
 await page.setViewportSize({width:800,height:1024});await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.locator('#hw-paperSize')).toBeVisible();await page.locator('#hw-paperSize').selectOption('letter');await page.keyboard.press('Escape');await expect.poll(()=>page.locator('.hw-worksheet').evaluate(el=>[el.offsetWidth,el.offsetHeight])).toEqual([816,1056]);
 await page.getByRole('button',{name:'Toggle theme',exact:true}).click();
 await page.screenshot({path:`artifacts/${target}-word-practice-tablet-dark.png`});
});

test('Handwriting Statement formats, dictionary reuse, rule styles and dense word pagination',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});await page.goto(pathToFileURL(process.cwd()+'/dist/index.html').href+'#/worksheets');await page.locator('#wsTypeSelect').selectOption('handwriting');
 await expect(page.locator('[data-persistence-ready]')).toHaveAttribute('data-persistence-ready','true');await page.locator('#hw-paperSize').selectOption('statement');
 for(const format of ['alternating','top_box','jumbled','word_practice']){
  await page.locator('#hw-exerciseFormat').selectOption(format);await expect.poll(()=>page.locator('.hw-worksheet').first().evaluate(el=>[el.offsetWidth,el.offsetHeight])).toEqual([528,816]);
 }
 await page.locator('.hw-stab[data-tab="content"]').click();await page.locator('#hwDictFileInput').setInputFiles({name:'words.txt',mimeType:'text/plain',buffer:Buffer.from('apple banana carrot')});await page.locator('#hwBtnSelAll').click();await expect(page.locator('#hw-userContentText')).toHaveValue(/apple/);
 await page.locator('#hw-userContentText').fill(Array.from({length:90},(_,i)=>'practice'+i).join(' '));
 await page.locator('.hw-stab[data-tab="setup"]').click();await page.locator('[id="hw-wordPractice.lines"]').selectOption('3');await expect.poll(()=>page.locator('.hw-worksheet').count()).toBeGreaterThan(1);
 await page.locator('.hw-stab[data-tab="lines"]').click();await page.locator('[data-path="geometry.gridType"]').selectOption('single_rule');
 // No duplicate ruling or overlapping row bands; long words stay inside their columns.
 const check=await page.locator('.hw-word-practice').evaluateAll(pages=>pages.every(p=>{const c=p.querySelector('.hw-practice-content'),text=[...p.querySelectorAll('.hw-practice-word')];return text.every(t=>t.offsetTop>=0&&t.offsetTop+t.offsetHeight<=c.clientHeight+1&&t.scrollWidth<=t.clientWidth+1);}));expect(check).toBe(true);
 await page.screenshot({path:'artifacts/word-practice-dense-single-rule.png'});
 await page.locator('.hw-stab[data-tab="setup"]').click();await page.locator('#hwTypeSelect').selectOption('seyes');await page.locator('#wsTypeSelect').selectOption('handwriting');await expect(page.locator('[data-persistence-ready]')).toHaveAttribute('data-persistence-ready','true');await expect(page.locator('#hw-exerciseFormat')).toHaveValue('word_practice');await expect(page.locator('#hw-paperSize')).toHaveValue('statement');
});
