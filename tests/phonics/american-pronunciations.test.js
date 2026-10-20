import {describe,it,expect} from 'vitest';
import fs from 'node:fs';import * as yaml from 'js-yaml';
import * as E from '../../src/phonics/PhonicsEngine.mjs';
import {loadConstructs} from '../../src/phonics/constructsLoader.mjs';
import {compileConstructs} from '../../scripts/constructs-compile-core.mjs';
import {checkStructure,ValidationError} from '../../scripts/constructs-validate.mjs';
import {computeBlastRadius,runRegressionDiff} from '../../tools/constructs-workbench/workbench-core.mjs';
import {refreshAnalysis} from '../../src/phonics/analysis-cache.mjs';
import {renderWordDetail} from '../../src/shared/phonicsWordDetail.js';
import {generateDissect,generateElkonin} from '../../src/phonics-worksheets/generator.js';
const raw=yaml.load(fs.readFileSync('constructs/phonics-constructs.yaml','utf8'));
const compiled=compileConstructs(raw);
describe('American enough and glacier pronunciation',()=>{
 it.each([
  ['enough',['e','n','ou','gh'],4,'ou:short_u','uh-NUF'],
  ['glacier',['g','l','a','ci','er'],5,'a:long_a','GLAY-sher'],
  ['glaciers',['g','l','a','ci','er','s'],6,'a:long_a','GLAY-sherz'],
 ])('%s has consistent sound units, filtering and persisted data',(word,tokens,count,sounds,respelling)=>{
  const record=E.parseWord(word);expect(record.tokens).toEqual(tokens);expect(E.tokenize(word)).toEqual(tokens);
  expect(record.graphemes).toBe(tokens.join('|'));expect(record.tokens.join('')).toBe(word);
  expect(record.phoneme_count).toBe(count);expect(record.syllable_count).toBe(2);expect(record.level).toBe(8);
  expect(record.vowel_team_sounds).toBe(sounds);expect(record.pronunciation_locale).toBe('en-US');
  expect(record.pronunciation_respelling).toBe(respelling);expect(JSON.parse(record.pronunciation_segments).map(s=>s.spelling)).toEqual(tokens);
  expect(generateDissect([record]).words[0].tokens).toEqual(tokens);expect(generateElkonin([record]).words[0].phonemeCount).toBe(count);
 });
 it('shows gh as /f/ and includes every segment in enough detail',()=>{
  const record=E.parseWord('enough'),segments=JSON.parse(record.pronunciation_segments);
  expect(segments.at(-1)).toEqual({spelling:'gh',ipa:'f'});
  const html=renderWordDetail('enough',record);expect(html).toContain('American pronunciation');expect(html).toContain('uh-NUF');
  expect(html).toContain('>gh</span>');expect(html).toContain('>/f/</span>');expect(html).not.toContain('>ough</span>');
 });
 it('glacier has ci /sh/ and er /r-colored vowel/, with no long-i or hiatus claim',()=>{
  const record=E.parseWord('glacier'),segments=JSON.parse(record.pronunciation_segments);
  expect(segments[3]).toEqual({spelling:'ci',ipa:'\u0283'});expect(segments[4]).toEqual({spelling:'er',ipa:'\u025a'});
  expect(E.soundForVowelTeam('glacier','ie')).toBeNull();expect(E.soundForVowelTeam('glacier','a')).toBe('long_a');
  expect(E.findAllPatternsForWord('glacier').vowelTeams || []).not.toContain('ie');
  expect(renderWordDetail('glacier',record)).not.toMatch(/bike|hiatus/);
 });
 it('keeps enough out of ough buckets while preserving its short-u filter',()=>{
  expect(E.parseWord('enough').vowel_teams).toBe('ou');expect(E.soundForVowelTeam('enough','ough')).toBeNull();
  expect(E.vowelTeamSounds('enough')[0].sound).toBe('short_u');
 });
 it.each(['glacial','glaciation','glaciologist','though','dough','rough','tough','laughter','died','pier'])('%s keeps the generic analysis path',word=>{
  expect(E.parseWord(word).pronunciation_locale).toBe('');
 });
 it('keeps genuine long-i and other ough sounds',()=>{
  expect(E.parseWord('died').vowel_team_sounds).toBe('ie:long_i');
  expect(E.parseWord('though').vowel_team_sounds).toBe('ough:long_o');expect(E.parseWord('thought').vowel_team_sounds).toBe('ough:aw');
  expect(E.parseWord('rough').vowel_team_sounds).toBe('ough:short_u');
 });
 it('Workbench reachability and regression checks honor pronunciation entries',()=>{
  const fixtures={tokenizer:[{word:'enough'},{word:'glacier'},{word:'died'}]};
  expect(computeBlastRadius('ough',compiled,fixtures).map(r=>r.word)).not.toContain('enough');
  expect(computeBlastRadius('ou',compiled,fixtures).find(r=>r.word==='enough').sound).toBe('short_u');
  expect(computeBlastRadius('ie',compiled,fixtures).map(r=>r.word)).not.toContain('glacier');
  const original=structuredClone(compiled);original.wordPronunciations=[];
  const diffs=runRegressionDiff(original,compiled,{vowelTeamSounds:[{word:'glacier',pattern:'ie',sound:'long_i'}]});
  expect(diffs).toMatchObject([{word:'glacier',oldSound:'long_i',newSound:null}]);
 });
 it('refreshes old cache records and keeps their metadata',()=>{
  const record={...E.parseWord('enough'),graphemes:'e|n|ough',phoneme_count:3,pronunciation_segments:'',is_common:true};
  const next=refreshAnalysis(record,'3.1');expect(next.graphemes).toBe('e|n|ou|gh');expect(next.phoneme_count).toBe(4);expect(next.is_common).toBe(true);
  expect(record.phoneme_count).toBe(3);
 });
 it('adds pronunciation to extended CSV while keeping the portable base columns',()=>{
  const record=E.parseWord('enough');expect(E.toCSV([record]).split('\n')[0]).toBe('word,graphemes,phoneme_count,digraphs,trigraphs,blends,difficulty');
  const csv=E.toCSV([record],{extended:true});expect(csv).toContain('pronunciation_ipa');expect(csv).toContain('uh-NUF');expect(csv).toContain('""spelling"":""gh""');
 });
});
describe('Curated pronunciation validation',()=>{
 it.each([
  ['duplicate',r=>r.wordPronunciations.push(structuredClone(r.wordPronunciations[0]))],
  ['wrong spelling',r=>r.wordPronunciations[0].segments[0].spelling='x'],
  ['unknown sound',r=>r.wordPronunciations[0].segments[0].vowelSound='made_up'],
  ['unsupported locale',r=>r.wordPronunciations[0].locale='en-GB'],
  ['invalid level',r=>r.wordPronunciations[0].level=0],
  ['unsafe IPA',r=>r.wordPronunciations[0].ipa='<script>'],
  ['missing IPA',r=>r.wordPronunciations[0].ipa=''],
  ['conflicting vowel exception',r=>r.vowelTeamExceptions.find(row=>row.word==='enough'&&row.pattern==='ou').sound='long_o'],
  ['missing source',r=>r.wordPronunciations[0].source=''],
  ['empty segments',r=>r.wordPronunciations[0].segments=[]],
  ['null entry',r=>r.wordPronunciations=[null]],
  ['non-array',r=>r.wordPronunciations={}],
 ])('rejects %s',(_,mutate)=>{const next=structuredClone(raw);mutate(next);expect(()=>checkStructure(compileConstructs(next))).toThrow(ValidationError);});
 it('accepts legacy compiled constructs without the optional section',()=>{
  const old=structuredClone(compiled);delete old.wordPronunciations;expect(loadConstructs(old).pronunciationOverridesMap.size).toBe(0);
 });
});
