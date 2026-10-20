import {test,expect} from 'playwright/test';import fs from 'node:fs';import {pathToFileURL} from 'node:url';
const hosted='http://127.0.0.1:4178'+JSON.parse(fs.readFileSync('dist-hosted/release.json')).base;
const portable=pathToFileURL(process.cwd()+'/dist/index.html').href;
async function ready(page){await expect(page.locator('[data-persistence-ready]')).toHaveAttribute('data-persistence-ready','true');}
for(const [target,url] of [['portable',portable],['hosted',hosted]]){
 test(`${target}: uniform sound guidance stays offline and online exploration is user-initiated`,async({page,context})=>{
  const referenceRequests=[];await context.route('https://dictionary.cambridge.org/**',async route=>{referenceRequests.push(route.request().url());await route.fulfill({contentType:'text/html',body:'<!doctype html><title>External navigation test stub</title><p>Pronunciation reference target</p>'});});
  await page.goto(url+'#/dict-builder');await ready(page);
  if(target==='hosted'){await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBeTruthy();}
  await context.setOffline(true);if(target==='hosted'){await page.reload();await ready(page);}
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#dbManualInput').fill('cat ship clap teacher though enough glacier');await page.locator('#dbManualAddAll').click();await page.keyboard.press('Escape');
  for(const [word,mode,count] of [['cat','rules',3],['ship','rules',3],['clap','rules',3],['teacher','rules',4],['though','rules',2],['enough','reviewed',4],['glacier','reviewed',5]]){
   await page.locator(`.db-word-select[data-word="${word}"]`).click();await expect(page.locator('.wd-sound-guide')).toHaveAttribute('data-guide-mode',mode);await expect(page.locator('.wd-sound-row')).toHaveCount(count);
   if(['teacher','though'].includes(word))await expect(page.locator('.wd-sound-row[data-sound-status="needs_review"]')).not.toHaveCount(0);
   const link=page.getByRole('link',{name:/Explore pronunciation/});await expect(link).toHaveAttribute('href',`https://dictionary.cambridge.org/us/pronunciation/english/${word}`);await expect(link).toHaveAttribute('target','_blank');await expect(link).toContainText('(online)');
  }
  expect(referenceRequests).toEqual([]);await page.screenshot({path:`artifacts/${target}-unified-guide-offline.png`});
  await page.locator('.db-word-select[data-word="teacher"]').click();await expect(page.locator('.wd-sound-guide')).toContainText('Needs review');await page.screenshot({path:`artifacts/${target}-unified-guide-review.png`});
  await context.setOffline(false);const popup=context.waitForEvent('page');await page.getByRole('link',{name:/Explore pronunciation/}).click();const reference=await popup;await reference.waitForLoadState();expect(reference.url()).toBe('https://dictionary.cambridge.org/us/pronunciation/english/teacher');expect(referenceRequests).toEqual([reference.url()]);await reference.close();await expect(page.locator('.wd-word')).toHaveText('teacher');
  await context.setOffline(true);await page.goto(url+'#/phonics-worksheets');await ready(page);await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#phxFileInput').setInputFiles({name:'offline.txt',mimeType:'text/plain',buffer:Buffer.from('cat\nteacher\nenough')});await expect(page.locator('#phxStatus')).toContainText('3 words');await page.getByRole('tab',{name:'Words',exact:true}).click();await expect(page.locator('.phx-word-sel-item[data-word="teacher"]')).toHaveAttribute('data-sound-review','required');await expect(page.locator('.phx-word-sel-item[data-word="enough"]')).toHaveAttribute('data-sound-review','reviewed');await page.keyboard.press('Escape');await expect(page.locator('.phx-word-label')).toHaveText(['cat','teacher','enough']);await context.setOffline(false);
 });
}
