import { measureText } from './typography.js';
const MAX_PAGES=20;
export function parsePracticeWords(text) { return String(text || '').split(/[\s,;|]+/).filter(Boolean); }
function wrapWord(word,width,px,family,spacing) {
  const lines=[]; let line='';
  for(const ch of word) { if(line && measureText(line+ch,px,family,spacing)>width){lines.push(line);line='';}line+=ch; }
  if(line)lines.push(line);return lines;
}
/** Three columns, row-major. Each ruling row is emitted once, never once per cell. */
export function buildWordPracticeModel(state, geo) {
  const p=state.wordPractice, warnings=[];
  const fontPx=Math.min(44,Math.max(8,geo.fontPx));
  const textLH=Math.ceil(fontPx*1.5), colW=geo.availW/3, gutter=8;
  const practice=p.mode==='practice', all=practice && p.lines==='all';
  const lineH=Math.max(geo.lineH,12), lineStep=lineH+Math.max(4,geo.skipH);
  const pad=Math.min(30,Math.max(0,Number(p.rowPaddingPx)||0));
  const gap=Math.min(30,Math.max(0,Number(p.lineGapPx)||0));
  const pages=[{rows:[]}];let y=0,truncated=false;
  function place(row,height) {
    if(y+height>geo.availHN+.01 && y>0){if(pages.length===MAX_PAGES){truncated=true;return false;}pages.push({rows:[]});y=0;}
    pages.at(-1).rows.push({...row,y,height}); y+=height;return true;
  }
  if(all) {
    for(let i=0;i<Math.floor(geo.availHN/(lineStep+pad));i++)place({kind:'ruling',lineH},lineStep+pad);
  } else {
    const words=parsePracticeWords(state.userContentText);
    if(words.some(word=>[...word].some(ch=>measureText(ch,fontPx,geo.family,geo.letterSpacingPx)>colW-gutter*2))) {
      warnings.push('A character is wider than a column. Reduce font size, letter spacing or margins before printing.');
    }
    outer:for(let i=0;i<words.length;i+=3) {
      const cells=words.slice(i,i+3).map(word=>wrapWord(word,Math.max(8,colW-gutter*2),fontPx,geo.family,geo.letterSpacingPx));
      const count=Math.max(...cells.map(c=>c.length));
      const rules=practice?Math.min(5,Math.max(1,Number(p.lines)||1)):0;
      // Keep normal word+practice blocks together. Unusually tall blocks continue on the next page.
      const blockH=count*textLH+pad*2+(practice?gap+rules*lineStep:0);
      if(blockH<=geo.availHN && y>0 && y+blockH>geo.availHN){if(pages.length===MAX_PAGES){truncated=true;break;}pages.push({rows:[]});y=0;}
      for(let k=0;k<count;k++)if(!place({kind:'words',cells:cells.map(c=>c[k]||''),underline:!practice && k===count-1},textLH+ (k===0?pad:0)+(k===count-1?pad:0)))break outer;
      for(let k=0;k<rules;k++)if(!place({kind:'ruling',lineH, gap:k===0?gap:0},lineStep+(k===0?gap:0)))break outer;
    }
  }
  if(truncated)warnings.push(`Content exceeds ${MAX_PAGES} pages. Shorten the word list before printing.`);
  return {geo:{...geo,fontPx,textLH,colW,gutter,pad},pages,warnings};
}
