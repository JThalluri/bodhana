import {describe,it,expect} from 'vitest';
import * as E from '../../src/phonics/PhonicsEngine.mjs';
import {buildSoundGuide} from '../../src/phonics/core/soundGuide.mjs';
import {renderWordDetail} from '../../src/shared/phonicsWordDetail.js';
const guide=word=>buildSoundGuide(E.parseWord(word),E.lookupExceptionForWord);
describe('Unified offline rule-based sound guide',()=>{
 it.each(['cat','dog','sun','ship','catch','rain','clap','enough','glacier','teacher','though','qzxyz'])('%s gets a guide with every stored spelling group',word=>{
  const record=E.parseWord(word),result=guide(word);
  expect(result.parts.map(part=>part.spelling)).toEqual(record.tokens);
  expect(result.parts.map(part=>part.spelling).join('')).toBe(word);
  const html=renderWordDetail(word,record);expect(html).toContain('wd-sound-guide');expect(html).toContain('American pronunciation');expect(html).not.toContain('>Vowel Sounds<');
 });
 it.each(['cat','dog','sun','ship','catch','rain','clap'])('%s uses established rules without pretending to be reviewed',word=>{
  const result=guide(word);expect(result.mode).toBe('rules');expect(result.needsReview).toBe(false);expect(result.parts.every(part=>part.status==='rule')).toBe(true);
 });
 it('a blend displays its separate sounds while retaining its spelling group',()=>{
  const part=guide('clap').parts[0];expect(part.spelling).toBe('cl');expect(part.sounds).toEqual(['k','l']);
  expect(renderWordDetail('clap',E.parseWord('clap'))).toContain('/k/ + /l/');
 });
 it.each(['though','thought','rough','laughed'])('%s does not misrepresent a composite spelling with a vowel-only sound',word=>{
  const part=guide(word).parts.find(part=>/ough|augh/.test(part.spelling));expect(part.status).toBe('needs_review');expect(part.sounds).toEqual([]);
 });
 it('keeps ambiguous default teams and hiatus explicit, without a guessed IPA',()=>{
  expect(guide('teacher').parts.find(part=>part.spelling==='ea').status).toBe('needs_review');
  expect(guide('recreation').parts.find(part=>part.spelling==='ea').status).toBe('needs_review');
  expect(renderWordDetail('teacher',E.parseWord('teacher'))).toContain('Needs review');
  expect(renderWordDetail('teacher',E.parseWord('teacher'))).not.toContain('class="wd-pronunciation"');
 });
 it('uses an existing vowel exception instead of an ambiguous default',()=>{
  const part=guide('bread').parts.find(part=>part.spelling==='ea');expect(part.status).toBe('rule');expect(part.sounds).toEqual(['\u025b']);
 });
 it('retains reviewed enough/glacier sound units and full pronunciation',()=>{
  for(const word of ['enough','glacier']){const result=guide(word);expect(result.mode).toBe('reviewed');expect(result.needsReview).toBe(false);expect(result.parts.every(part=>part.status==='reviewed')).toBe(true);}
  expect(guide('enough').parts.at(-1).sounds).toEqual(['f']);expect(guide('glacier').parts[3].sounds).toEqual(['\u0283']);
 });
 it('labels group counts without claiming a blend is one phoneme',()=>{
  const html=renderWordDetail('clap',E.parseWord('clap'));expect(html).toContain('>Groups<');expect(html).not.toContain('>Phonemes<');
 });
 it('does not rewrite imported or cached analysis',()=>{
  const record={...E.parseWord('cat'),vowel_team_sounds:'a:unknown',is_common:true};const saved=JSON.stringify(record);buildSoundGuide(record,E.lookupExceptionForWord);expect(JSON.stringify(record)).toBe(saved);
 });
 it('handles corrupt optional pronunciation and incomplete grouping safely',()=>{
  const record={...E.parseWord('cat'),pronunciation_segments:'[null]',pronunciation_locale:'en-US'};expect(buildSoundGuide(record).mode).toBe('rules');
  expect(buildSoundGuide({...record,tokens:[null]}).needsReview).toBe(true);
 });
 it('provides an optional safe online reference link',()=>{
  const html=renderWordDetail('cat',E.parseWord('cat'));expect(html).toContain('https://dictionary.cambridge.org/us/pronunciation/english/cat');expect(html).toContain('target="_blank" rel="noopener noreferrer"');expect(html).toContain('Internet required');expect(html).not.toMatch(/<iframe|<audio|<video/);
 });
});
