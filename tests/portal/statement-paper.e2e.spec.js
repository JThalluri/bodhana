import {test,expect} from 'playwright/test';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
const base=JSON.parse(fs.readFileSync('dist-hosted/release.json')).base;
const targets=[['portable',pathToFileURL(process.cwd()+'/dist/index.html').href],['hosted','http://127.0.0.1:4178'+base]];
async function mount(page,url,route){await page.setViewportSize({width:1920,height:1080});await page.goto(url+'#/'+route);await page.locator('[data-paper-size-select]').waitFor({state:'attached'});await page.evaluate(()=>document.fonts.ready);if(await page.locator('[data-persistence-ready]').count())await expect(page.locator('[data-persistence-ready]')).toHaveAttribute('data-persistence-ready','true');}
async function statement(page){await page.locator('[data-paper-size-select]').selectOption('statement');}
async function fits(page){if(await page.locator('.tool-shell').count())await expect(page.locator('.tool-shell')).toHaveAttribute('data-paper-fit','ready');await expect.poll(()=>page.locator('[data-paper-size="statement"]').count()).toBeGreaterThan(0);const bad=await page.locator('[data-paper-size="statement"]').evaluateAll(pages=>pages.flatMap((page,i)=>{const box=page.getBoundingClientRect();const size=page.matches('.is-landscape')?[816,528]:[528,816];const bad=[];if(page.offsetWidth!==size[0]||page.offsetHeight!==size[1])bad.push({i,size:[page.offsetWidth,page.offsetHeight]});for(const el of page.querySelectorAll('*')){if(!(el instanceof HTMLElement)||el.matches('.cert-asset,.worksheet-brand-watermark')||el.closest('.worksheet-brand-watermark'))continue;const r=el.getBoundingClientRect();if(r.width&&r.height&&(r.right>box.right+2||r.bottom>box.bottom+2||r.left<box.left-2||r.top<box.top-2))bad.push({i,class:el.className,text:el.textContent.slice(0,35)});}return bad.slice(0,8);}));expect(bad).toEqual([]);}
async function output(page,browser,{print,exportId,label,landscape=false,seyes=false}){
 await page.evaluate(()=>new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.tagName==='IFRAME')n.contentWindow.print=()=>{};}).observe(document.body,{childList:true}));
 await page.locator(print).click();await expect.poll(()=>page.evaluate(()=>!!document.querySelector('iframe')?.contentDocument.querySelector('svg,.print-document'))).toBeTruthy();
 const html=await page.evaluate(()=>{
   const doc=document.querySelector('iframe').contentDocument;
   for(const mark of doc.querySelectorAll('.worksheet-brand-watermark')){const page=mark.closest('[data-paper-size="statement"]');if(page && mark.getBoundingClientRect().bottom-page.getBoundingClientRect().top>24)throw Error('Statement watermark intrudes into the quarter-inch content area');}
   return doc.documentElement.outerHTML;
 });
 const printed=await browser.newPage();await printed.setContent(html);await printed.evaluate(()=>document.fonts.ready);await printed.emulateMedia({media:'print'});
 const pdf=await printed.pdf({path:`artifacts/statement-${label}-print.pdf`,preferCSSPageSize:true,printBackground:true});const data=pdf.toString('latin1');expect(data).toMatch(landscape?/\/MediaBox\s*\[0 0 612 396\]/:/\/MediaBox\s*\[0 0 396 612\]/);
 // Native print CSS must preserve physical dimensions and all page content.
 if(!seyes)await fits(printed);
 await printed.screenshot({path:`artifacts/statement-${label}-print.png`,fullPage:true});await printed.close();await page.evaluate(()=>document.querySelectorAll('iframe').forEach(f=>f.remove()));
 if(exportId){const event=page.waitForEvent('download');await page.locator(exportId).click();const path=`artifacts/statement-${label}-export.pdf`;await (await event).saveAs(path);expect(fs.readFileSync(path,'latin1')).toContain('/MediaBox [0 0 396 612]');}
}
for(const [target,url] of targets){
 test(`${target}: Statement place-value types retain questions and keys, including wide charts and hints`,async({page})=>{
  test.setTimeout(120000);await mount(page,url,'math-worksheets');await page.locator('#mwTypeSelect').selectOption('place-value');await statement(page);await page.locator('#pvWorksheetCount').fill('1');await page.locator('#pvQuestionsPerWs').fill('30');await page.locator('#pvIncludeAnswerKey').check();await page.locator('#pvAnswerKeyPlacement').selectOption('bottom');await page.locator('#pvSeed').fill('statement-pv');
  for(let i=1;i<=11;i++){await test.step('type '+i,async()=>{await page.locator('#pvType').selectOption('type'+i);await page.locator('#pvGenerateBtn').click();await fits(page);await expect(page.locator(i===11?'.pv-hint-puzzle':'.pv-question')).toHaveCount(i===11?8:30);await expect(page.locator('.pv-answer-key-item')).toHaveCount(i===11?8:30);});}
  await page.locator('#pvType').selectOption('type2');await page.locator('#pvMinDigits').fill('7');await page.locator('#pvMaxDigits').fill('7');await page.locator('#pvIncludeDecimals').check();await page.locator('#pvDecimalPlaces').fill('5');await page.locator('#pvGenerateBtn').click();await fits(page);await page.screenshot({path:`artifacts/${target}-statement-chart.png`});
  await page.locator('[data-paper-size-select]').selectOption('letter');await expect.poll(()=>page.locator('.pv-worksheet').first().evaluate(e=>[e.offsetWidth,e.offsetHeight])).toEqual([816,1056]);
 });
 test(`${target}: Statement fractions, money and time subtypes fit at XL with answer keys`,async({page})=>{
  test.setTimeout(120000);await mount(page,url,'math-worksheets');for(const [family,prefix] of [['fractions-drill','frac'],['money-counting','money'],['time-problems','time']]){await page.locator('#mwTypeSelect').selectOption(family);await statement(page);await page.locator('#'+prefix+'FontSize').selectOption('xl');const type=page.locator('#'+prefix+'SubType');for(const value of await type.locator('option').evaluateAll(a=>a.map(x=>x.value))){await test.step(family+' '+value,async()=>{await type.selectOption(value);await page.locator('#'+prefix+(prefix==='frac'?'GenerateBtn':'Generate')).click();await fits(page);});}}
 });
 test(`${target}: Statement arithmetic preserves all 51 numbered questions through print and PDF`,async({page,browser})=>{
  await mount(page,url,'math-worksheets');await page.locator('#numPapers').fill('1');await statement(page);await expect(page.locator('.paper-page')).toHaveCount(2);const nums=await page.locator('.q-num').allTextContents();expect(nums.map(x=>parseInt(x)).sort((a,b)=>a-b)).toEqual(Array.from({length:51},(_,i)=>i+1));await fits(page);await output(page,browser,{print:'#mathPrintBtn',exportId:'#mathExportBtn',label:target+'-arithmetic'});
 });
 test(`${target}: Statement Phonics preserves words across all four activities and hidden previews`,async({page,browser})=>{
  test.setTimeout(90000);await mount(page,url,'phonics-worksheets');await page.locator('#phxBtnDemo').click();await page.locator('.phx-stab[data-tab="activity"]').click();await statement(page);await page.locator('#phxWordsPerPage').fill('30');await page.locator('#phxWordsPerPage').dispatchEvent('change');const expected=await page.locator('.phx-word-label').allTextContents();expect(expected.length).toBeGreaterThan(10);
  for(const type of ['dissect','elkonin','onsetRime','syllableSplit']){await page.locator('#phxActivityType').selectOption(type);if(!await page.locator('#phxShowSolutions').isChecked())await page.locator('.toggle-switch').filter({has:page.locator('#phxShowSolutions')}).locator('.toggle-track').click();await expect(page.locator('.phx-word-label')).toHaveText(expected);await fits(page);}
  await page.setViewportSize({width:800,height:1024});await page.getByRole('button',{name:'Guide',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#phxActivityType').selectOption('elkonin');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Preview',exact:true}).click();await fits(page);await page.screenshot({path:`artifacts/${target}-statement-phonics-tablet.png`});await output(page,browser,{print:'#phxBtnPrint',exportId:'#phxBtnExport',label:target+'-phonics'});
 });
 test(`${target}: Statement Sudoku preserves 24 boards and exposes usable tile choices`,async({page,browser})=>{
  test.setTimeout(90000);await mount(page,url,'sudoku');await statement(page);await expect(page.locator('#sdkTileCount')).toHaveValue('2');expect(await page.locator('#sdkTileCount option:disabled').count()).toBe(2);await page.locator('#sdkPuzzleCount').fill('24');await page.locator('#sdkBtnGenerate').click();await expect(page.locator('.sdk-tile')).toHaveCount(24);await fits(page);await page.locator('#sdkTileCount').selectOption('1');await expect(page.locator('.sdk-puzzle-page')).toHaveCount(24);await fits(page);await page.locator('#sdkPuzzleCount').fill('1');await page.locator('#sdkBtnGenerate').click();if(!await page.locator('#sdkShowSolutions').isChecked())await page.locator('.toggle-switch').filter({has:page.locator('#sdkShowSolutions')}).locator('.toggle-track').click();await output(page,browser,{print:'#sdkBtnPrint',exportId:'#sdkBtnExport',label:target+'-sudoku'});
 });
 test(`${target}: Statement Math Games fit all board types and paginate complete Bingo call lists`,async({page,browser})=>{
  test.setTimeout(120000);await mount(page,url,'math-games');await statement(page);await expect(page.locator('#mgGamesPerPage')).toHaveValue('4');await page.locator('#mgGamesPerPage').selectOption('1');await page.locator('#mgSeed').fill('statement-games');for(const game of ['tictactoe','bingo','match','snake'])for(const mode of ['numerals','visual','mixed']){await page.locator('#mgGame').selectOption(game);await page.locator('#mgMode').selectOption(mode);await page.locator('#mgGenerateBtn').click();await fits(page);if(game==='bingo'){const answers=await page.locator('.mg-call-row').first().getAttribute('data-answer');expect(answers).toBeTruthy();await expect(page.locator('.mg-call-row')).toHaveCount(60);await expect(page.locator('.mg-call-row > span:first-child')).toHaveText(Array.from({length:60},(_,i)=>String(i+1)));}}
  await expect(page.locator('.mg-snake-instructions')).toHaveCSS('writing-mode','horizontal-tb');await expect(page.locator('.mg-path-label')).toHaveText(['START','FINISH']);await page.screenshot({path:`artifacts/${target}-statement-snake.png`});await output(page,browser,{print:'#mgPrintBtn',exportId:'#mgExportBtn',label:target+'-games'});
 });
 test(`${target}: Statement compact Math Games retain boards, readable cells, complete keys and output`,async({page,browser,context})=>{
  test.setTimeout(240000);await mount(page,url,'math-games');await statement(page);await page.locator('#mgSeed').fill('compact-games');
  for(const count of ['2','4'])for(const game of ['tictactoe','bingo','match','snake'])for(const mode of ['numerals','visual','mixed'])for(const font of ['s','m','l','xl']){
   await test.step([count,game,mode,font].join(' '),async()=>{
    await page.locator('#mgGamesPerPage').selectOption(count);await page.locator('#mgGame').selectOption(game);await page.locator('#mgMode').selectOption(mode);await page.locator('#mgFontSize').selectOption(font);await page.locator('#mgGenerateBtn').click();await fits(page);
    await expect(page.locator('.mg-game')).toHaveCount(Number(count));await expect(page.locator('.mg-game .mg-cell')).toHaveCount(Number(count)*({tictactoe:9,bingo:25,match:16,snake:36}[game]));
    if(game==='bingo')await expect(page.locator('.mg-call-row')).toHaveCount(60);
    if(font==='m'&&mode==='mixed')await page.locator('.mg-worksheet').first().screenshot({path:`artifacts/${target}-compact-${count}-${game}.png`});
   });
  }
  await page.locator('#mgFontSize').selectOption('m');await page.locator('#mgPages').fill('2');
  for(const game of ['tictactoe','bingo','match','snake']){
   await page.locator('#mgGame').selectOption(game);await page.locator('#mgGenerateBtn').click();await fits(page);await expect(page.locator('.mg-game')).toHaveCount(8);
   if(game==='match')for(const sheet of [1,2])for(const board of [1,2,3,4])await expect(page.locator('.mg-answer-list').getByText(new RegExp('^Page '+sheet+', Game '+board+':'))).toHaveCount(8);
   if(game==='bingo')await expect(page.locator('.mg-call-row > span:first-child')).toHaveText(Array.from({length:60},(_,i)=>String(i+1)));
   await expect(page.locator('#mgStatus')).toContainText(String(await page.locator('.mg-worksheet').count())+' pages');
   await output(page,browser,{print:'#mgPrintBtn',exportId:'#mgExportBtn',label:target+'-compact-'+game});
  }
  await page.locator('#mgGame').selectOption('tictactoe');await page.locator('#mgDomain').selectOption('arithmetic');await page.locator('#mgDifficulty').selectOption('custom');await page.locator('#mgMinDigits').fill('2');await page.locator('#mgMaxDigits').fill('2');await page.locator('#mgOperands').fill('3');await page.locator('#mgGenerateBtn').click();await fits(page);await expect(page.locator('.mg-arithmetic-problem')).toHaveCount(72);
  await output(page,browser,{print:'#mgPrintBtn',exportId:'#mgExportBtn',label:target+'-compact-arithmetic'});
  await page.reload();await expect(page.locator('#mgGamesPerPage')).toHaveValue('4');await expect(page.locator('#mgPaperSize')).toHaveValue('statement');await fits(page);
  if(target==='hosted'){await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);}
  await context.setOffline(true);await page.reload();await expect(page.locator('#mgGamesPerPage')).toHaveValue('4');await fits(page);await page.setViewportSize({width:800,height:1024});await page.screenshot({path:`artifacts/${target}-compact-tablet-offline.png`});await context.setOffline(false);await page.setViewportSize({width:1920,height:1080});
  await page.locator('#mgMinDigits').fill('6');await page.locator('#mgMaxDigits').fill('6');await page.locator('#mgOperands').fill('6');await page.locator('#mgFontSize').selectOption('xl');await page.locator('#mgGenerateBtn').click();await expect(page.locator('.tool-shell')).toHaveAttribute('data-paper-fit','overflow');await expect(page.locator('#mgPrintBtn')).toBeDisabled();await expect(page.locator('#mgExportBtn')).toBeDisabled();
  await page.locator('#mgGamesPerPage').selectOption('1');await page.locator('#mgGenerateBtn').click();await fits(page);await expect(page.locator('#mgExportBtn')).toBeEnabled();
  await page.locator('#mgPaperSize').selectOption('letter');for(const n of ['6','8'])await expect(page.locator('#mgGamesPerPage option[value="'+n+'"]')).toBeEnabled();await page.locator('#mgGamesPerPage').selectOption('8');await page.locator('#mgPaperSize').selectOption('statement');await expect(page.locator('#mgGamesPerPage')).toHaveValue('4');
 });
 test(`${target}: Statement Math Puzzle keeps difficulty, solutions and native grid bounds`,async({page,browser})=>{
  await mount(page,url,'math-puzzles');await statement(page);for(const difficulty of ['easy','medium','hard']){await page.locator('#mpDifficulty').selectOption(difficulty);if(!await page.locator('#mpShowSolutions').isChecked())await page.locator('.toggle-switch').filter({has:page.locator('#mpShowSolutions')}).locator('.toggle-track').click();await fits(page);expect(await page.locator('.mp-grid-table').evaluateAll(ts=>ts.every(t=>t.rows.length<=18&&t.rows[0].cells.length<=18))).toBe(true);}
  await output(page,browser,{print:'#mpBtnPrint',exportId:'#mpBtnExport',label:target+'-mathpuzzle'});
 });
 test(`${target}: Statement Word Puzzles retain complete word banks and jumbles on continuation pages`,async({page,browser})=>{
  test.setTimeout(90000);await mount(page,url,'word-puzzles');await statement(page);await expect(page.locator('#wpRows')).toHaveValue('20');await expect(page.locator('#wpCols')).toHaveValue('20');await page.locator('#wpPuzzleCount').fill('1');await page.locator('#wpWordsPerPuzzle').fill('49');await page.locator('#wpMinWordLength').selectOption('3');await page.locator('#wpMaxWordLength').selectOption('12');for(const mode of ['wordsearch','crisscross','jumble']){await page.locator('#wpMode').selectOption(mode);await page.locator('#wpBtnGenerate').click();if(!await page.locator('#wpShowSolutions').isChecked())await page.locator('.toggle-switch').filter({has:page.locator('#wpShowSolutions')}).locator('.toggle-track').click();await fits(page);await expect.poll(()=>page.locator(mode==='jumble'?'.wp-jumble-row':'.wp-word-item').count()).toBeGreaterThan(10);}
  await output(page,browser,{print:'#wpBtnPrint',exportId:'#wpBtnExport',label:target+'-wordpuzzle'});
 });
 test(`${target}: Statement Seyes preserves 8mm/2mm physical geometry and dedicated printing`,async({page,browser})=>{
  await mount(page,url,'worksheets');await statement(page);await page.locator('#wsInput').fill('Handwriting on Statement paper. '+ 'extraordinarily'.repeat(15));await fits(page);const grid=page.locator('.seyes-grid-svg').first();await expect(grid).toHaveAttribute('viewBox','0 0 139.7 215.9');const rules=await grid.locator('line[x1="0"][x2="139.7"]').evaluateAll(ls=>ls.slice(0,5).map(l=>Number(l.getAttribute('y1'))));expect(rules).toEqual([8,10,12,14,16]);await output(page,browser,{print:'#wsPrintBtn',label:target+'-seyes',seyes:true});await page.locator('[data-paper-size-select]').selectOption('letter');await expect(page.locator('.seyes-grid-svg').first()).toHaveAttribute('viewBox','0 0 215.9 279.4');
 });
 test(`${target}: Statement Certificates reflow every template in landscape and print at 8.5 by 5.5`,async({page,browser})=>{
  await mount(page,url,'certificates');await statement(page);for(const value of await page.locator('#awardTemplate option').evaluateAll(a=>a.map(x=>x.value))){await page.locator('#awardTemplate').selectOption(value);await fits(page);await expect(page.locator('#awardOverflowWarning')).not.toHaveClass(/is-on/);}await page.screenshot({path:`artifacts/${target}-statement-certificate.png`});await output(page,browser,{print:'#awardPrintBtn',label:target+'-certificate',landscape:true});
 });
}

for(const [target,url] of targets){
 test(target+': Statement pagination while Guide is open, retained stock offline and tablet settings',async({page,context})=>{
  test.setTimeout(120000);await mount(page,url,'math-worksheets');
  if(target==='hosted'){await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBeTruthy();}
  const math=['place-value','fractions-drill','money-counting','time-problems'];
  for(const family of math){await page.locator('#mwTypeSelect').selectOption(family);await statement(page);}
  await page.setViewportSize({width:800,height:1024});
  for(const [family,button] of [['place-value','#pvGenerateBtn'],['fractions-drill','#fracGenerateBtn'],['money-counting','#moneyGenerate'],['time-problems','#timeGenerate']]){
    await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#mwTypeSelect').selectOption(family);await expect(page.locator('[data-paper-size-select]')).toHaveValue('statement');await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Guide',exact:true}).click();await page.locator(button).click();await page.getByRole('button',{name:'Preview',exact:true}).click();await fits(page);
  }
  for(const route of ['sudoku','math-games','math-puzzles','word-puzzles','worksheets','certificates','phonics-worksheets']){
    await mount(page,url,route);if(route==='phonics-worksheets'){await page.locator('#phxBtnDemo').click();await page.locator('.phx-stab[data-tab="activity"]').click();}await statement(page);
  }
  await expect(page.locator('[data-save-state]')).toHaveAttribute('data-save-state','saved');await context.setOffline(true);await page.reload();
  for(const route of ['sudoku','math-games','math-puzzles','word-puzzles','worksheets','certificates','phonics-worksheets']){
    await mount(page,url,route);await expect(page.locator('[data-paper-size-select]')).toHaveValue('statement');await fits(page);
    await page.setViewportSize({width:800,height:1024});await page.getByRole('button',{name:'Settings',exact:true}).click();if(route==='phonics-worksheets')await page.locator('.phx-stab[data-tab="activity"]').click();await expect(page.locator('[data-paper-size-select]')).toBeVisible();await page.keyboard.press('Escape');
  }
  await page.getByRole('button',{name:'Toggle theme',exact:true}).click();await page.screenshot({path:'artifacts/'+target+'-statement-offline-tablet-dark.png'});
 });
 test(target+': oversized custom Statement content warns and prevents clipped output, then recovers',async({page})=>{
  await mount(page,url,'certificates');await statement(page);await page.locator('#awardShortNote').fill('A thoughtful contribution to our classroom. '.repeat(100));await expect(page.locator('.paper-fit-warning')).toBeVisible();await expect(page.locator('#awardPrintBtn')).toBeDisabled();await page.locator('#awardShortNote').fill('For thoughtful contributions to our classroom.');await expect(page.locator('#awardPrintBtn')).toBeEnabled();await fits(page);
  await mount(page,url,'math-puzzles');await statement(page);await page.locator('#mpIncludeSub').uncheck();for(const id of ['mpAddAmin','mpAddAmax','mpAddBmin','mpAddBmax'])await page.locator('#'+id).fill(id.endsWith('min')?'9990':'9999');await page.locator('#mpBtnGenerate').click();await expect(page.locator('.paper-fit-warning')).toBeVisible();await expect(page.locator('#mpBtnPrint')).toBeDisabled();await expect(page.locator('#mpBtnExport')).toBeDisabled();await page.locator('#mpBtnReset').click();await expect(page.locator('#mpBtnPrint')).toBeEnabled();await fits(page);
 });
}

for(const [target,url] of targets)test(target+': Statement Math category print and PDF output',async({page,browser})=>{
 test.setTimeout(120000);await mount(page,url,'math-worksheets');
 for(const [family,prefix] of [['place-value','pv'],['fractions-drill','frac'],['money-counting','money'],['time-problems','time']]){
  await page.locator('#mwTypeSelect').selectOption(family);await statement(page);
  if(prefix==='pv'){await page.locator('#pvType').selectOption('type2');await page.locator('#pvWorksheetCount').fill('1');await page.locator('#pvQuestionsPerWs').fill('6');await page.locator('#pvMinDigits').fill('7');await page.locator('#pvMaxDigits').fill('7');await page.locator('#pvIncludeDecimals').check();await page.locator('#pvDecimalPlaces').fill('5');await page.locator('#pvIncludeAnswerKey').check();}
  else {await page.locator('#'+prefix+'FontSize').selectOption('xl');await page.locator('#'+prefix+'SubType').selectOption('word-problems');}
  await page.locator('#'+prefix+(['pv','frac'].includes(prefix)?'GenerateBtn':'Generate')).click();await fits(page);
  await output(page,browser,{print:'#'+prefix+(['pv','frac'].includes(prefix)?'PrintBtn':'Print'),exportId:'#'+prefix+(['pv','frac'].includes(prefix)?'ExportBtn':'Export'),label:target+'-'+prefix});
 }
});

test('Statement Math Game font levels and arithmetic controls remain usable',async({page})=>{
 await mount(page,targets[0][1],'math-games');await statement(page);await page.locator('#mgGamesPerPage').selectOption('1');await page.locator('#mgSeed').fill('statement-fonts');
 for(const game of ['tictactoe','bingo','match','snake'])for(const font of ['s','m','l','xl']){await page.locator('#mgGame').selectOption(game);await page.locator('#mgFontSize').selectOption(font);await page.locator('#mgGenerateBtn').click();await fits(page);}
 await page.locator('#mgGame').selectOption('tictactoe');await page.locator('#mgDomain').selectOption('arithmetic');await page.locator('#mgMinDigits').fill('3');await page.locator('#mgMaxDigits').fill('3');await page.locator('#mgOperands').fill('3');await page.locator('#mgGenerateBtn').click();await fits(page);
});
