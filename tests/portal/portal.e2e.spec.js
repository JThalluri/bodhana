import {test,expect} from 'playwright/test';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
const hosted='http://127.0.0.1:4178'+JSON.parse(fs.readFileSync('dist-hosted/release.json','utf8')).base;
const portable=pathToFileURL(process.cwd()+'/dist/index.html').href;
const routes=['math-worksheets','math-games','word-puzzles','math-puzzles','sudoku','dict-builder','worksheets','certificates','phonics-worksheets'];
async function tool(page,url,route){await page.goto(url+'#/'+route);await expect(page.locator('.tool-view-controls')).toHaveCount(1);}
for(const [target,url] of [['portable',portable],['hosted',hosted]]){
 test(`${target}: all routes, tablet drawer and narrow Guide`,async({page,browserName})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of routes){
   await tool(page,url,route);
   await page.getByRole('button',{name:'Settings',exact:true}).click();
   await expect(page.getByRole('dialog')).toBeVisible();
   await page.keyboard.press('Escape');
   await expect(page.getByRole('dialog')).toHaveCount(0);
   await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeFocused();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
   await page.screenshot({path:`artifacts/${browserName}-${target}-${route}-1024.png`});
   await page.setViewportSize({width:800,height:1024});
   await page.getByRole('button',{name:'Guide',exact:true}).click();
   await expect(page.getByRole('region',{name:'Guide'})).toBeVisible();
   await page.getByRole('button',{name:'Preview',exact:true}).click();
   await page.setViewportSize({width:1024,height:768});
  }
  expect(errors).toEqual([]);
 });
}
test('Math categories, Writing subtypes, state and rapid route changes',async({page})=>{
 await tool(page,hosted,'math-worksheets');
 for(const value of ['place-value','fractions-drill','money-counting','time-problems','math-test']){
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#mwTypeSelect').selectOption(value);
  await expect(page.locator('.tool-view-controls')).toHaveCount(1);await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.tool-info-content')).toHaveCount(1);
 }
 await tool(page,hosted,'worksheets');await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.locator('#wsTypeSelect').selectOption('handwriting');await expect(page.locator('[data-tool-info="handwriting"]')).toHaveCount(1);
 await page.evaluate(()=>{location.hash='/math-worksheets';location.hash='/worksheets';location.hash='/certificates';});
 await expect(page.locator('[data-tool-info="certificates"]')).toHaveCount(1);
});
test('production geometry and screenshots across viewport matrix',async({page})=>{
 await tool(page,portable,'worksheets');
 for(const [w,h] of [[1920,1080],[1366,768],[1280,800],[1024,768],[800,1280],[768,1024],[1024,600],[700,800]]){
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(150);
  for(const theme of ['light','dark']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   const bounds=await page.locator('.seyes-page').first().boundingBox();
   const viewport=await page.locator('.tool-preview-scroll').boundingBox();
   expect(bounds.width).toBeLessThanOrEqual(viewport.width);expect(bounds.height).toBeLessThanOrEqual(viewport.height);
   await page.screenshot({path:`artifacts/layout-${w}x${h}-${theme}.png`});
  }
 }
});
test('portable has no PWA registration; hosted installs and relaunches offline',async({page,context})=>{
 await tool(page,portable,'worksheets');expect(await page.evaluate(()=>navigator.serviceWorker?.controller || null)).toBeNull();
 await tool(page,hosted,'worksheets');await page.evaluate(()=>navigator.serviceWorker.ready);
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBeTruthy();
 await expect(page.getByRole('button',{name:'Update available'})).toHaveCount(0);
 await page.reload();await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBeTruthy();
 await context.setOffline(true);await page.goto(hosted+'#/certificates');await expect(page.locator('[data-tool-info="certificates"]')).toHaveCount(1);
 await page.goto(hosted+'#/phonics-worksheets');await expect(page.locator('[data-tool-info="phonics-worksheets"]')).toHaveCount(1);
 await context.setOffline(false);
});

test('overlay focus trap, navigation coordination and resize preserve form state',async({page})=>{
 await tool(page,portable,'worksheets');
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#wsInput').fill('State survives rotation');
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await page.keyboard.press('Shift+Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBeTruthy();
 await page.keyboard.press('Escape');await page.locator('#sidebarToggle').click();await expect(page.getByRole('dialog')).toHaveCount(1);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.setViewportSize({width:1920,height:1080});await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.locator('#wsInput')).toHaveValue('State survives rotation');expect(await page.locator('[inert]').count()).toBe(0);
});

test('desktop threshold leaves a readable guide instead of squeezing both panes',async({page})=>{
 await page.setViewportSize({width:1480,height:900});await tool(page,portable,'worksheets');
 expect((await page.locator('.tool-info-pane').boundingBox()).width).toBeGreaterThanOrEqual(280);
 await page.setViewportSize({width:1440,height:900});await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeVisible();
});
