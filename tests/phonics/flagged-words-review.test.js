import {describe,it,expect} from 'vitest';
import * as E from '../../src/phonics/PhonicsEngine.mjs';
import {refreshAnalysis} from '../../src/phonics/analysis-cache.mjs';
import {computeBlastRadius} from '../../tools/constructs-workbench/workbench-core.mjs';
import {loadConstructs} from '../../src/phonics/constructsLoader.mjs';
const sounds=word=>E.parseWord(word).vowel_team_sounds;
describe('Nine flagged words: actual engine integration',()=>{
  it.each([
    ['recreation','ea:hiatus'],['somewhere',''],['beautiful','eau:long_u'],
    ['buried','ie:long_e'],['appear',''],['enough','ou:short_u'],
    ['laughed','augh:short_a'],['thought','ough:aw'],['worried','ie:long_e'],
  ])('%s resolves the intended vowel family', (word,expected)=>{
    expect(sounds(word)).toBe(expected);
    expect(E.tokenize(word).join('')).toBe(word);
  });
  it('separates recreation nuclei and keeps beautiful at three syllables',()=>{
    expect(E.splitSyllablesForWord('recreation')).toEqual(['rec','re','a','tion']);
    expect(E.splitSyllablesForWord('beautiful')).toEqual(['beau','ti','ful']);
  });
  it('preserves the correct r-controlled appear analysis',()=>{
    expect(E.tokenize('appear')).toEqual(['a','pp','ear']);
    expect(E.splitSyllablesForWord('appear')).toEqual(['ap','pear']);
  });
  it.each(['somewhere','somewhat','homework'])('%s has no cross-boundary ew token or bucket',word=>{
    expect(E.tokenize(word)).not.toContain('ew');
    expect(E.findAllPatternsForWord(word).vowelTeams || []).not.toContain('ew');
    expect(sounds(word)).not.toContain('ew:');
  });
  it('retains genuine ew and ure patterns',()=>{
    expect(E.tokenize('sew')).toContain('ew');expect(E.tokenize('new')).toContain('ew');
    expect(E.tokenize('pure')).toContain('ure');expect(E.tokenize('cure')).toContain('ure');
  });
  it.each(['beauty','beautiful','beautifully','beauties','beautician','beautification','beautify','beautified','beautifies','beautifying','beauteous'])('%s keeps beauty-family /ju?/',word=>{
    expect(E.tokenize(word)).toContain('eau');expect(sounds(word)).toContain('eau:long_u');
  });
  it.each(['beau','bureau','tableau','plateau'])('%s keeps eau long-o',word=>{
    expect(E.tokenize(word)).toContain('eau');expect(sounds(word)).toBe('eau:long_o');
  });
  it.each(['buried','worried','buries','worries','beauties'])('%s keeps final /i/',word=>expect(sounds(word)).toContain('ie:long_e'));
  it.each(['died','tied','cried','fried','tried','beautified','beautifies'])('%s keeps /a?/',word=>expect(sounds(word)).toContain('ie:long_i'));
  it.each(['rough','tough','rougher','toughest'])('%s uses the short-u ough family',word=>expect(sounds(word)).toBe('ough:short_u'));
  it.each(['thorough','thoroughly','thoroughfare','though','although','dough'])('%s retains long-o',word=>expect(sounds(word)).toContain('ough:long_o'));
  it.each(['thought','thoughtful','thoughtless'])('%s belongs to the saw family',word=>expect(sounds(word)).toBe('ough:aw'));
  it.each(['laugh','laughed','laughing','laughter'])('%s keeps US short-a',word=>expect(sounds(word)).toBe('augh:short_a'));
  it.each(['caught','taught','slaughter'])('%s does not inherit laugh',word=>expect(sounds(word)).toBe('augh:aw'));
  it('Workbench blast radius uses the same reachable tokens',()=>{
    const fixtures={tokenizer:['somewhere','new','beautiful','appear'].map(word=>({word}))};
    const c=loadConstructs();
    expect(computeBlastRadius('ew',c,fixtures).map(row=>row.word)).not.toContain('somewhere');
    const ea=computeBlastRadius('ea',c,fixtures).map(row=>row.word);
    expect(ea).not.toContain('beautiful');expect(ea).not.toContain('appear');
    expect(computeBlastRadius('eau',c,fixtures).map(row=>row.word)).toContain('beautiful');
  });
});
describe('Saved analysis revisions',()=>{
  it('refreshes derived data while keeping user metadata',()=>{
    const stale={...E.parseWord('beautiful'),vowel_team_sounds:'ea:long_e',is_common:false,custom:'keep'};
    const fresh=refreshAnalysis(stale,'old');expect(fresh.vowel_team_sounds).toBe('eau:long_u');
    expect(fresh.is_common).toBe(false);expect(fresh.custom).toBe('keep');
    expect(stale.vowel_team_sounds).toBe('ea:long_e');
  });
  it('keeps current records intact',()=>{
    const record=E.parseWord('appear');expect(refreshAnalysis(record,E.ANALYSIS_REVISION)).toBe(record);
  });
});
