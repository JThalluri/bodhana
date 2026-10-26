import {describe,it,expect,vi} from 'vitest';
vi.mock('../../src/writing-worksheets/typography.js',()=>({measureText:(s,px)=>s.length*px*.6}));
import {paperSize,paperForPages} from '../../src/shared/paper-size.js';
import {buildWordPracticeModel} from '../../src/writing-worksheets/word-practice.js';
import {freshState} from '../../src/writing-worksheets/state.js';
function model(text,extra={}){const s=freshState();s.userContentText=text;s.wordPractice={...s.wordPractice,...extra};const paper=paperSize('statement');const g={paper,availW:480,availHN:768,fontPx:20,family:'Andika',letterSpacingPx:0,lineH:48,skipH:4};return buildWordPracticeModel(s,g);}
describe('shared physical paper sizes',()=>{
 it('keeps Letter fallback, Statement points and landscape orientation explicit',()=>{expect(paperSize('unknown').widthPx).toBe(816);expect(paperSize('statement')).toMatchObject({widthPx:528,heightPx:816,widthPt:396,heightPt:612});expect(paperSize('letter',true).widthPx).toBe(1056);});
 it('rejects mixed physical sizes in one job',()=>{const p=id=>({dataset:{paperSize:id},matches:()=>false});expect(()=>paperForPages([p('letter'),p('statement')])).toThrow(/one paper size/);});
});
describe('Word Practice pagination',()=>{
 it('places words row-major and emits one practice row per word row',()=>{const m=model('create separate granular pristine');expect(m.pages[0].rows.filter(r=>r.kind==='words').map(r=>r.cells)).toEqual([['create','separate','granular'],['pristine']]);expect(m.pages[0].rows.filter(r=>r.kind==='ruling')).toHaveLength(2);});
 it('keeps all words through multi-page pagination',()=>{const words=Array.from({length:120},(_,i)=>'word'+i),m=model(words.join(' '),{lines:'5'});expect(m.pages.length).toBeGreaterThan(1);expect(m.pages.flatMap(p=>p.rows).filter(r=>r.kind==='words').flatMap(r=>r.cells)).toEqual(words);for(const p of m.pages)for(const r of p.rows)expect(r.y+r.height).toBeLessThanOrEqual(768);});
 it('full-page lines ignores the word list',()=>{const m=model('retained words',{lines:'all'});expect(m.pages).toHaveLength(1);expect(m.pages[0].rows.every(r=>r.kind==='ruling')).toBe(true);});
 it('words only has one underline per row and no practice rows',()=>{const m=model('cat dog sun moon',{mode:'words'});expect(m.pages[0].rows.every(r=>r.kind==='words'&&r.underline)).toBe(true);});
 it('wraps a long word without losing characters',()=>{const word='a'.repeat(200),m=model(word);expect(m.pages.flatMap(p=>p.rows).filter(r=>r.kind==='words').map(r=>r.cells[0]).join('')).toBe(word);});
 it('starts empty input with one blank page',()=>{expect(model('').pages).toEqual([{rows:[]}]);});
});
