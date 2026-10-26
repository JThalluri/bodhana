import { fontStack } from './typography.js';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function renderWordPractice(state,{geo:g,pages}) {
 const line=(y,color,dash='')=>`<line x1="0" y1="${y}" x2="${g.availW}" y2="${y}" stroke="${color}" stroke-width="1" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
 return pages.map(page=>{
  const rules=[],text=[];
  for(const row of page.rows){
   if(row.kind==='words'){
    row.cells.forEach((word,i)=>text.push(`<div class="hw-practice-word" style="left:${i*g.colW+g.gutter}px;top:${row.y+(row.height-g.textLH)/2}px;width:${g.colW-2*g.gutter}px;height:${g.textLH}px;line-height:${g.textLH}px">${esc(word)}</div>`));
    if(row.underline)rules.push(line(row.y+row.height-.5,state.geometry.lineColorPrimary));
   } else {
    const y=row.y+(row.gap||0)+.5;
    if(g.gridType==='zaner_bloser'){
     rules.push(line(y,state.geometry.lineColorPrimary));
     if(state.geometry.hasMidline && state.geometry.midlineDashPattern!=='none')rules.push(line(y+row.lineH/2,state.geometry.lineColorMidline,state.geometry.midlineDashPattern==='solid'?'':state.geometry.midlineDashPattern));
     rules.push(line(y+row.lineH-1,state.geometry.lineColorBaseline));
    } else rules.push(line(y+row.lineH-1,state.geometry.lineColorPrimary));
   }
  }
  for(let i=1;i<3;i++)rules.push(`<line x1="${i*g.colW}" y1="0" x2="${i*g.colW}" y2="${g.availHN}" stroke="#cbd5e1" stroke-width="1"/>`);
  return `<div class="hw-worksheet hw-word-practice" data-paper-size="${g.paper.id}" style="width:${g.paper.widthIn}in;height:${g.paper.heightIn}in"><div class="hw-practice-content" style="left:${g.L}px;top:${g.T}px;width:${g.availW}px;height:${g.availHN}px;font-family:${esc(fontStack(g.family))};font-size:${g.fontPx}px;letter-spacing:${g.letterSpacingPx}px"><svg class="hw-ruling" width="${g.availW}" height="${g.availHN}" viewBox="0 0 ${g.availW} ${g.availHN}" aria-hidden="true">${rules.join('')}</svg>${text.join('')}</div></div>`;
 }).join('');
}
