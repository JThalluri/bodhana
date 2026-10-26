import {describe,it,expect,vi} from 'vitest';
vi.mock('../../src/writing-worksheets/typography.js',()=>({fontStack:f=>f,baselineOffsetInLineBox:()=>10}));
import {renderPages} from '../../src/writing-worksheets/renderer.js';
import {freshState} from '../../src/writing-worksheets/state.js';
import {baselineInRow} from '../../src/writing-worksheets/generator.js';
function render(height,wordPractice){const s=freshState();s.exerciseFormat=wordPractice?'word_practice':'alternating';const geo={paper:{id:'statement',widthIn:5.5,heightIn:8.5,heightPx:816},gridType:'zaner_bloser',lineH:height,rowH:height+18,availW:480,availHN:768,L:24,T:24,fontPx:20,family:'Andika',letterSpacingPx:0,textLH:30,colW:160,gutter:8};const page=wordPractice?{rows:[{kind:'ruling',y:0,lineH:height,height:height}]}:{rows:[{text:'cat',kind:'model'}],rowH:height+18,badges:[]};return renderPages(s,{geo,pages:[page]});}
describe('exact primary ruling',()=>{
 for(const wp of [false,true])for(const height of [48,27])it(`${wp?'Word Practice':'Handwriting'}: ${height}px line height has exact halves`,()=>{const svg=render(height,wp).match(/<svg class="hw-ruling"[^>]*>([\s\S]*?)<\/svg>/)[1];const ys=[...svg.matchAll(/<line x1="0" y1="([\d.]+)"/g)].map(m=>Number(m[1]));expect(ys.slice(0,3)).toEqual([.5,.5+height/2,.5+height]);});
 it('anchors primary model text to the corrected baseline without changing other ruling types',()=>{expect(baselineInRow({gridType:'zaner_bloser',lineH:48})).toBe(48);expect(baselineInRow({gridType:'single_rule',lineH:48})).toBe(47);expect(baselineInRow({isSeyes:true,rowH:32})).toBe(32);});
});
