import {test,expect} from 'playwright/test';import fs from 'node:fs';import {pathToFileURL} from 'node:url';
const hosted='http://127.0.0.1:4178'+JSON.parse(fs.readFileSync('dist-hosted/release.json')).base;
const portable=pathToFileURL(process.cwd()+'/dist/index.html').href;
async function ready(page){await expect(page.locator('.tool-view-controls')).toHaveCount(1);if(await page.locator('[data-persistence-ready]').count())await expect(page.locator('[data-persistence-ready]')).toHaveAttribute('data-persistence-ready','true');}
async function open(page,width){if(width<1480)await page.getByRole('button',{name:'Settings',exact:true}).click();}
async function usable(page,field){await field.scrollIntoViewIfNeeded();await expect(field).toBeVisible();const box=await field.boundingBox();expect(box.width,await field.getAttribute('id')).toBeGreaterThanOrEqual((await field.getAttribute('type'))==='number'?40:80);const pane=await page.locator('.tool-settings').boundingBox();expect(box.x).toBeGreaterThanOrEqual(pane.x);expect(box.x+box.width).toBeLessThanOrEqual(pane.x+pane.width+1);expect(box.y+box.height).toBeLessThanOrEqual(pane.y+pane.height+1);await field.focus();await expect(field).toBeFocused();}
for(const [target,url] of [['hosted',hosted],['portable',portable]]){
 test(`${target}: tabbed settings retain readable controls beside storage notices at desktop and tablet sizes`,async({page})=>{
  for(const [width,height] of [[1920,1080],[1480,900],[1366,768],[1280,800],[1024,600],[800,1280]]){
   await page.setViewportSize({width,height});await page.goto(url+'#/worksheets');await expect(page.locator('[data-tool-info="seyes"],[data-tool-info="handwriting"]')).toHaveCount(1);await ready(page);await open(page,width);
   const type=page.locator('#wsTypeSelect');if(await type.count()){await usable(page,type);await type.selectOption('handwriting');await ready(page);await open(page,width);}
   await usable(page,page.locator('#hwTypeSelect'));await page.getByRole('tab',{name:'Content',exact:true}).click();await usable(page,page.locator('#hw-userContentText'));await page.locator('#hw-userContentText').fill('The settings remain usable.');
   await page.getByRole('tab',{name:'Lines',exact:true}).click();await usable(page,page.locator('.hw-stab-panel.active select').first());await page.locator('.device-storage').scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'Clear saved data',exact:true})).toBeVisible();
   await page.screenshot({path:`artifacts/${target}-handwriting-settings-${width}.png`});
   await page.goto(url+'#/phonics-worksheets');await expect(page.locator('[data-tool-info="phonics-worksheets"]')).toHaveCount(1);await ready(page);await open(page,width);await page.getByRole('tab',{name:'Activity',exact:true}).click();await usable(page,page.locator('#phxActivityType'));await page.locator('#phxActivityType').selectOption('elkonin');
   await page.getByRole('tab',{name:'Bounds',exact:true}).click();await usable(page,page.locator('#phxSyllableMax'));await page.screenshot({path:`artifacts/${target}-phonics-settings-${width}.png`});
  }
 });
}
test('all other modules and Math categories retain accessible fields and scrollable settings',async({page})=>{
 for(const [width,height] of [[1920,1080],[1024,600]]){
  await page.setViewportSize({width,height});
  for(const route of ['math-worksheets','math-games','word-puzzles','math-puzzles','sudoku','dict-builder','certificates']){
   await page.goto(hosted+'#/'+route);const routeGuide={'math-worksheets':'math-tests','math-games':'math-games','word-puzzles':'word-puzzles','math-puzzles':'math-puzzles','sudoku':'sudoku','dict-builder':'dictionary-builder','certificates':'certificates'}[route];await expect(page.locator('[data-tool-info="'+routeGuide+'"]')).toHaveCount(1);await ready(page);await open(page,width);
   const fields=page.locator('.tool-settings input:not([type="checkbox"]):not([type="file"]):not([type="hidden"]):visible,.tool-settings select:visible,.tool-settings textarea:visible');await usable(page,fields.first());await usable(page,fields.last());
   await page.locator('.device-storage').scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'Clear saved data',exact:true})).toBeVisible();
   if(route==='math-worksheets')for(const category of ['place-value','fractions-drill','money-counting','time-problems','math-test']){await page.locator('#mwTypeSelect').scrollIntoViewIfNeeded();await page.locator('#mwTypeSelect').selectOption(category);const guide={'place-value':'place-value','fractions-drill':'fractions','money-counting':'money-counting','time-problems':'time-problems','math-test':'math-tests'}[category];await expect(page.locator('[data-tool-info="'+guide+'"]')).toHaveCount(1);await ready(page);await open(page,width);await usable(page,page.locator('#mwTypeSelect'));await usable(page,page.locator('.tool-settings input[type="number"]:visible').first());}
  }
 }
});
