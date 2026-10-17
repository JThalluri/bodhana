import {test,expect} from 'playwright/test';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const hosted='http://127.0.0.1:4178'+JSON.parse(fs.readFileSync('dist-hosted/release.json')).base;
const portable=pathToFileURL(process.cwd()+'/dist/index.html').href;
const textFile=(name,text)=>({name,mimeType:'text/plain',buffer:Buffer.from(text)});
async function ready(page){await expect(page.locator('.tool-view-controls')).toHaveCount(1);const workspace=page.locator('[data-persistence-ready]');if(await workspace.count())await expect(workspace).toHaveAttribute('data-persistence-ready','true');}
async function settings(page){await page.getByRole('button',{name:'Settings',exact:true}).click();}
async function saved(page){await expect(page.locator('[data-save-state]')).toHaveAttribute('data-save-state','saved');}
for(const [target,url] of [['hosted',hosted],['portable',portable]]){
 test(`${target}: settings, worksheet text, fitting and selected Math/Writing subtype survive reload`,async({page})=>{
  await page.goto(url+'#/worksheets');await ready(page);await settings(page);
  await page.locator('#wsInput').fill('Retain my worksheet text.');await page.locator('#wsFontSize').fill('32');await page.locator('#wsFontSize').dispatchEvent('change');await page.keyboard.press('Escape');
  await page.getByRole('combobox',{name:'Preview fitting'}).selectOption('width');await page.reload();await ready(page);await settings(page);
  await expect(page.locator('#wsInput')).toHaveValue('Retain my worksheet text.');await expect(page.locator('#wsFontSize')).toHaveValue('32');await page.keyboard.press('Escape');await expect(page.getByRole('combobox',{name:'Preview fitting'})).toHaveValue('width');
  await page.goto(url+'#/math-worksheets');await ready(page);await settings(page);await page.locator('#mwTypeSelect').selectOption('place-value');await expect(page.locator('[data-tool-info="place-value"]')).toHaveCount(1);
  await page.reload();await ready(page);await expect(page.locator('#mwTypeSelect')).toHaveValue('place-value');
  await page.goto(url+'#/worksheets');await ready(page);await settings(page);await page.locator('#wsTypeSelect').selectOption('handwriting');await ready(page);await page.reload();await ready(page);await expect(page.locator('#hwTypeSelect')).toHaveValue('handwriting');
 });
}
test('Dictionary Builder files, base, curation and flags survive reload and re-extraction; offline in Chromium',async({page,context,browserName})=>{
 await page.goto(hosted+'#/dict-builder');await ready(page);await settings(page);
 await page.locator('#dbFileInput').setInputFiles(textFile('source.txt','teacher theater reactor caverns'));
 await page.locator('#dbBaseInput').setInputFiles(textFile('base.txt','teacher\nexisting'));await expect(page.locator('#dbBaseInfo')).toContainText('base.txt');await page.keyboard.press('Escape');
 await page.locator('#dbBtnExtract').click();await expect(page.locator('#dbStatus')).toContainText('words ready');await page.locator('#dbBtnEnrich').click();
 await page.locator('.db-word-select').first().click();await page.locator('[data-flag-note]').fill('Retained review');await page.locator('[data-action="flag"]').click();await saved(page);
 await page.reload();await ready(page);await settings(page);await expect(page.locator('#dbFileList')).toContainText('source.txt');await expect(page.locator('#dbBaseInfo')).toContainText('base.txt');await page.keyboard.press('Escape');
 await expect(page.locator('.db-word-select')).toHaveCount(4);await expect(page.locator('[data-action="export-flags"]')).toBeEnabled();
 if(browserName==='chromium'){await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBeTruthy();await context.setOffline(true);}
 await page.reload();await ready(page);await page.locator('#dbBtnExtract').click();await expect(page.locator('#dbStatus')).toContainText('words ready');await page.locator('#dbBtnClear').click();await saved(page);await page.reload();await ready(page);
 await expect(page.locator('.db-word-select')).toHaveCount(0);await settings(page);await expect(page.locator('#dbFileList')).toBeEmpty();await expect(page.locator('#dbBaseInfo')).toContainText('base.txt');await page.locator('#dbBaseClearBtn').click();await saved(page);await page.reload();await ready(page);await expect(page.locator('#dbBaseInfo')).toBeEmpty();
 await context.setOffline(false);
});
test('Word Puzzle and Phonics loaded dictionaries and selected words persist across navigation and reload',async({page})=>{
 await page.goto(hosted+'#/word-puzzles');await ready(page);await settings(page);await page.locator('#wpFileInput').setInputFiles(textFile('words.txt','teacher\ntheater\nreactor\ncaverns'));
 await expect(page.locator('#wpDictStatus')).toContainText('4 words');await page.locator('.wp-btn-remove-word').first().click();await saved(page);await page.reload();await ready(page);await settings(page);await expect(page.locator('#wpWordSelCount')).toHaveText('(3/4)');await page.keyboard.press('Escape');
 await page.goto(hosted+'#/phonics-worksheets');await ready(page);await settings(page);await page.locator('#phxFileInput').setInputFiles(textFile('phonics.txt','ship\ncatch\nphone\nsing'));
 await expect(page.locator('#phxStatus')).toContainText('4 words');await page.getByRole('tab',{name:'Words',exact:true}).click();await page.locator('.phx-btn-remove').first().click();await saved(page);
 await page.reload();await ready(page);await expect(page.locator('#phxWordSelCount')).toContainText('3');await settings(page);await page.getByRole('tab',{name:'Activity',exact:true}).click();await page.locator('#phxActivityType').selectOption('elkonin');await page.keyboard.press('Escape');await saved(page);await page.reload();await ready(page);await expect(page.locator('#phxActivityType')).toHaveValue('elkonin');
 await page.goto(hosted+'#/word-puzzles');await ready(page);await expect(page.locator('#wpWordSelCount')).toHaveText('(3/4)');
});
test('Handwriting dictionary, appended content, tier and typography retain state without replaying preset side effects',async({page})=>{
 await page.goto(hosted+'#/worksheets');await ready(page);await settings(page);await page.locator('#wsTypeSelect').selectOption('handwriting');await ready(page);await settings(page);await page.locator('#hwTier').selectOption('tier2');await page.getByRole('tab',{name:'Text',exact:true}).click();await page.locator('[data-path="typography.fontSizeMode"]').selectOption('manual');await page.locator('[data-path="typography.fontSizePx"]').fill('24');await page.locator('[data-path="typography.fontSizePx"]').dispatchEvent('change');await page.getByRole('tab',{name:'Content',exact:true}).click();
 await page.locator('#hwDictFileInput').setInputFiles(textFile('writing.txt','teacher\ntheater\nreactor'));await expect(page.locator('#hwDictStatus')).toContainText('3 words');await page.locator('#hwBtnSelAll').click();await saved(page);
 const content=await page.locator('#hw-userContentText').inputValue();await page.reload();await ready(page);await settings(page);await expect(page.locator('#hw-userContentText')).toHaveValue(content);await expect(page.locator('#hwWordSelCount')).toHaveText('(3/3)');await expect(page.locator('#hwTier')).toHaveValue('tier2');await expect(page.locator('[data-path="typography.fontSizePx"]')).toHaveValue('24');
});
test('explicit clear removes only this app data; blocked storage does not prevent working',async({page,context})=>{
 await page.goto(hosted+'#/dict-builder');await ready(page);await settings(page);await page.locator('#dbManualInput').fill('theater reactor');await page.locator('#dbManualAddAll').click();await saved(page);
 await page.evaluate(()=>{localStorage.setItem('another-app','keep');});page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Clear saved data',exact:true}).click();await ready(page);
 await expect(page.locator('.db-word-select')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('another-app'))).toBe('keep');
 const restricted=await context.newPage();await restricted.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});Object.defineProperty(window,'indexedDB',{get(){throw new DOMException('Blocked','SecurityError');}});});
 await restricted.goto(hosted+'#/dict-builder');await ready(restricted);await settings(restricted);await expect(restricted.locator('.device-storage')).toContainText(/unavailable|could not be saved/);await restricted.locator('#dbManualInput').fill('theater');await restricted.locator('#dbManualAddAll').click();await restricted.keyboard.press('Escape');await expect(restricted.locator('.db-word-select')).toHaveCount(1);
});

test('quota failure preserves the last complete dictionary; corrupt settings fall back safely',async({page})=>{
 await page.goto(hosted+'#/word-puzzles');await ready(page);await settings(page);await page.locator('#wpFileInput').setInputFiles(textFile('original.txt','teacher\ntheater\nreactor'));await expect(page.locator('#wpDictStatus')).toContainText('3 words');await saved(page);
 await page.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('Full','QuotaExceededError');};});
 await page.locator('#wpFileInput').setInputFiles(textFile('replacement.txt','caverns\nlanding'));await expect(page.locator('#wpDictStatus')).toContainText('2 words');await expect(page.locator('.device-storage')).toContainText('could not be saved');await expect(page.locator('.tool-shell')).toHaveAttribute('data-save-state','error');
 await page.reload();await ready(page);await expect(page.locator('#wpWordSelCount')).toHaveText('(3/3)');
 await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key.includes('settings:word-puzzles'))localStorage.setItem(key,'{corrupt');});await page.reload();await ready(page);await settings(page);await expect(page.locator('#wpMode')).toHaveValue('wordsearch');await expect(page.locator('.device-storage')).toContainText('unavailable');
});
test('clearing in one tab prevents an older tab from recreating the saved workspace',async({page,context})=>{
 await page.goto(hosted+'#/dict-builder');await ready(page);await settings(page);await page.locator('#dbManualInput').fill('theater');await page.locator('#dbManualAddAll').click();await saved(page);
 const second=await context.newPage();await second.goto(hosted+'#/dict-builder');await ready(second);await expect(second.locator('.db-word-select')).toHaveCount(1);
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Clear saved data',exact:true}).click();await ready(page);await expect(page.locator('.db-word-select')).toHaveCount(0);
 await settings(second);await expect(second.locator('.device-storage')).toContainText('cleared in another window');await second.locator('#dbManualInput').fill('reactor');await second.locator('#dbManualAddAll').click();await second.keyboard.press('Escape');await expect(second.locator('.db-word-select')).toHaveCount(2);
 await page.reload();await ready(page);await expect(page.locator('.db-word-select')).toHaveCount(0);await second.close();
});
test('portable loaded dictionary survives reload and rapid module exits flush the latest edit',async({page})=>{
 await page.goto(portable+'#/word-puzzles');await ready(page);await settings(page);await page.locator('#wpFileInput').setInputFiles(textFile('portable.txt','teacher\ntheater\nreactor'));await expect(page.locator('#wpDictStatus')).toContainText('3 words');await saved(page);
 await page.locator('.wp-btn-remove-word').first().click();await page.evaluate(()=>{location.hash='/certificates';});await expect(page.locator('[data-tool-info="certificates"]')).toHaveCount(1);
 await page.goto(portable+'#/word-puzzles');await ready(page);await expect(page.locator('#wpWordSelCount')).toHaveText('(2/3)');await page.reload();await ready(page);await expect(page.locator('#wpWordSelCount')).toHaveText('(2/3)');
});

test('an old asynchronous file read cannot overwrite a re-entered module',async({page})=>{
 await page.goto(hosted+'#/word-puzzles');await ready(page);await settings(page);await page.locator('#wpFileInput').setInputFiles(textFile('original.txt','teacher\ntheater\nreactor'));await expect(page.locator('#wpDictStatus')).toContainText('3 words');await saved(page);
 await page.evaluate(()=>{const original=FileReader.prototype.readAsText;const pending=[];FileReader.prototype.readAsText=function(file){pending.push([this,file]);};window.finishPendingReads=()=>Promise.all(pending.map(([reader,file])=>new Promise(resolve=>{reader.addEventListener('loadend',resolve,{once:true});original.call(reader,file);})));});
 await page.locator('#wpFileInput').setInputFiles(textFile('stale.txt','caverns\nlanding'));await page.evaluate(()=>{location.hash='/certificates';});await expect(page.locator('[data-tool-info="certificates"]')).toHaveCount(1);await page.evaluate(()=>{location.hash='/word-puzzles';});await ready(page);
 await page.evaluate(()=>window.finishPendingReads());await expect(page.locator('#wpWordSelCount')).toHaveText('(3/3)');
});
