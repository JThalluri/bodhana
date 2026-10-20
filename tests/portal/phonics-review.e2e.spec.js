import {test,expect} from 'playwright/test';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const hosted='http://127.0.0.1:4178'+JSON.parse(fs.readFileSync('dist-hosted/release.json')).base;
const portable=pathToFileURL(process.cwd()+'/dist/index.html').href;
const words=['recreation','somewhere','beautiful','buried','appear','enough','laughed','thought','worried'];
const expected=['ea:hiatus','','eau:long_u','ie:long_e','','ough:short_u','augh:short_a','ough:aw','ie:long_e'];
const file=(name,text)=>({name,mimeType:'text/plain',buffer:Buffer.from(text)});
async function ready(page){await expect(page.locator('[data-persistence-ready]')).toHaveAttribute('data-persistence-ready','true');}
async function settings(page){await page.getByRole('button',{name:'Settings',exact:true}).click();}
async function saved(page){await expect(page.locator('[data-save-state]')).toHaveAttribute('data-save-state','saved');}
async function workspace(page,key,mutate=false){return page.evaluate(async({key,mutate})=>{
 const info=(await indexedDB.databases()).find(db=>db.name.endsWith(':files'));if(!info)throw Error('No workspace DB');
 return new Promise((resolve,reject)=>{const open=indexedDB.open(info.name);open.onerror=()=>reject(open.error);open.onsuccess=()=>{
 const db=open.result,tx=db.transaction('workspaces',mutate?'readwrite':'readonly'),store=tx.objectStore('workspaces'),request=store.get(key);let value;
 request.onsuccess=()=>{value=request.result;if(mutate){value.data.analysisRevision='pre-review';value.data.phonicsByWord.beautiful.vowel_team_sounds='ea:long_e';store.put(value,key);}};
 tx.oncomplete=()=>{db.close();resolve(value.data);};tx.onerror=()=>reject(tx.error);
 };});
 },{key,mutate});}
for(const [target,url] of [['hosted',hosted],['portable',portable]]){
 test(`${target}: nine-word Dictionary analysis and actual CSV export`,async({page})=>{
  await page.goto(url+'#/dict-builder');await ready(page);await settings(page);
  await page.locator('#dbManualInput').fill(words.join(' '));await page.locator('#dbManualAddAll').click();await page.keyboard.press('Escape');
  await expect(page.locator('.db-word-select')).toHaveCount(9);await saved(page);
  const data=await workspace(page,'dictionary-builder');
  for(let i=0;i<words.length;i++)expect(data.phonicsByWord[words[i]].vowel_team_sounds).toBe(expected[i]);
  const download=page.waitForEvent('download');await page.locator('#dbBtnPhonicsCSV').click();const exported=await download;
  const path=await exported.path();const csv=fs.readFileSync(path,'utf8');
  for(const word of words)expect(csv).toContain(word);expect(csv).toContain('eau:long_u');expect(csv).toContain('ea:hiatus');
  await exported.saveAs(`artifacts/phonics-review-${target}.csv`);
  await page.locator('.db-word-select').filter({hasText:'beautiful'}).click();
  await page.screenshot({path:`artifacts/phonics-review-${target}-dictionary.png`});
 });
 test(`${target}: imported analysis survives reload; explicit refresh keeps order and metadata`,async({page})=>{
  await page.goto(url+'#/phonics-worksheets');await ready(page);await settings(page);
  const csv='word,graphemes,phoneme_count,difficulty,letter_count,syllable_count,level,vowel_team_sounds,is_common\nbeautiful,b|ea|u|t|i|f|u|l,8,3,9,4,8,ea:long_e,false\nworried,w|or|r|ie|d,5,3,7,2,8,ie:long_i,true';
  await page.locator('#phxFileInput').setInputFiles(file('legacy.csv',csv));await expect(page.locator('#phxStatus')).toContainText('2 words');await saved(page);
  await page.reload();await ready(page);let data=await workspace(page,'phonics-worksheets');expect(data.allWords[0].vowel_team_sounds).toBe('ea:long_e');
  await settings(page);await page.getByRole('button',{name:'Refresh analysis',exact:true}).click();await saved(page);
  data=await workspace(page,'phonics-worksheets');expect(data.allWords.map(row=>row.vowel_team_sounds)).toEqual(['eau:long_u','ie:long_e']);
  expect(data.allWords.map(row=>row.is_common)).toEqual([false,true]);expect(data.selectedWords).toEqual(['beautiful','worried']);
  await page.keyboard.press('Escape');await page.reload();await ready(page);
  expect((await workspace(page,'phonics-worksheets')).allWords[0].vowel_team_sounds).toBe('eau:long_u');
 });
}
test('stale Dictionary cache refreshes without losing historical flags or word selection',async({page})=>{
 await page.goto(hosted+'#/dict-builder');await ready(page);await settings(page);await page.locator('#dbManualInput').fill('beautiful');await page.locator('#dbManualAddAll').click();await page.keyboard.press('Escape');
 await page.locator('.db-word-select').click();await page.locator('[data-flag-note]').fill('Historical evidence');await page.locator('[data-action="flag"]').click();await saved(page);
 const original=await workspace(page,'dictionary-builder',true);await page.reload();await ready(page);await settings(page);await saved(page);
 const current=await workspace(page,'dictionary-builder');expect(current.phonicsByWord.beautiful.vowel_team_sounds).toBe('eau:long_u');expect(current.flagged).toEqual(original.flagged);expect(current.selectedWord).toBe(original.selectedWord);
});
test('TXT analysis drives sound filters, worksheet boxes, Letter geometry and export',async({page})=>{
 await page.goto(hosted+'#/phonics-worksheets');await ready(page);await settings(page);await page.locator('#phxFileInput').setInputFiles(file('review.txt',words.join('\n')));await expect(page.locator('#phxStatus')).toContainText('9 words');
 await page.getByRole('tab',{name:'Activity',exact:true}).click();await page.locator('label.phx-toggle-row').filter({hasText:'Show solutions'}).click();await page.keyboard.press('Escape');
 const row=page.locator('.phx-word-row').filter({has:page.locator('.phx-word-label',{hasText:'beautiful'})});await expect(row.locator('.wd-grapheme-box')).toHaveText(['b','eau','t','i','f','u','l']);
 const before=await page.locator('.phx-page').first().evaluate(el=>({w:el.offsetWidth,h:el.offsetHeight}));expect(before).toEqual({w:816,h:1056});
 await page.screenshot({path:'artifacts/phonics-review-tablet.png'});await page.setViewportSize({width:1920,height:1080});await page.screenshot({path:'artifacts/phonics-review-desktop.png'});await page.setViewportSize({width:1024,height:768});
 await settings(page);await page.getByRole('tab',{name:'Filters',exact:true}).click();await page.locator('[data-sound="long_u"]').click();await page.keyboard.press('Escape');await expect(page.locator('.phx-word-label')).toHaveText(['beautiful']);
 await page.evaluate(()=>new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.tagName==='IFRAME')node.contentWindow.print=()=>{};}).observe(document.body,{childList:true}));
 await page.locator('#phxBtnPrint').click();
 await expect.poll(()=>page.evaluate(()=>!!document.querySelector('iframe')?.contentDocument?.querySelector('.phx-page'))).toBeTruthy();
 const printed=await page.evaluate(()=>{const doc=document.querySelector('iframe').contentDocument,p=doc.querySelector('.phx-page');return {width:p.offsetWidth,height:p.offsetHeight,words:[...doc.querySelectorAll('.phx-word-label')].map(el=>el.textContent),html:doc.documentElement.outerHTML};});
 expect([printed.width,printed.height]).toEqual([816,1056]);expect(printed.words).toEqual(['beautiful']);
 const preview=await page.context().newPage();await preview.setContent(printed.html);await preview.emulateMedia({media:'print'});await preview.pdf({path:'artifacts/phonics-review-letter.pdf',preferCSSPageSize:true});await preview.screenshot({path:'artifacts/phonics-review-print.png'});await preview.close();
 const download=page.waitForEvent('download');await page.locator('#phxBtnExport').click();const output=await download;await output.saveAs('artifacts/phonics-review-export.pdf');
 expect(fs.readFileSync('artifacts/phonics-review-export.pdf','latin1')).toContain('/MediaBox [0 0 612 792]');
});
