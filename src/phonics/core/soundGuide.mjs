/** Conservative display guidance over existing analysis; never fabricates whole-word IPA. */
const CONSONANTS = {b:'b',d:'d',f:'f',h:'h',j:'d\u0292',k:'k',l:'l',m:'m',n:'n',p:'p',r:'r',t:'t',v:'v',w:'w',z:'z'};
const VOWELS = {long_a:'e\u026a',long_e:'i\u02d0',long_i:'a\u026a',long_o:'o\u028a',long_u:'ju\u02d0',short_a:'\u00e6',short_e:'\u025b',short_i:'\u026a',short_o:'\u0251',short_u:'\u028c',oo_long:'u\u02d0',oo_short:'\u028a',ow:'a\u028a',oi:'\u0254\u026a',aw:'\u0254',air:'\u025br'};
const AMBIGUOUS_TEAMS = new Set(['ea','ie','oo','ou','ow','au','ui','ue','eu','ew','ey','ei','eau']);
const FIXED_GROUPS = {sh:'\u0283',ck:'k',tch:'t\u0283',dge:'d\u0292',igh:'a\u026a',ss:'s',ff:'f',ll:'l',zz:'z'};
const BLENDS = new Set(['bl','cl','fl','gl','pl','sl','br','cr','dr','fr','gr','pr','tr','tw','dw','sk','sm','sn','sp','st','sw','mp','nt','nk','nd','ft','lt','ld','lp','lf','pt','ct','scr','spl','spr','str']);
function supported(spelling, sounds, reason) { return {spelling, sounds, status:'rule', reason}; }
function unresolved(spelling, reason) { return {spelling, sounds:[], status:'needs_review', reason}; }
function consonant(letter) { return letter==='c'?'k':letter==='g'?'\u0261':letter==='s'?'s':CONSONANTS[letter]; }

export function buildSoundGuide(record, exceptionFor = () => null) {
  const word=String(record?.word || '').toLowerCase();
  const tokens=(Array.isArray(record?.tokens)?record.tokens:String(record?.graphemes || '').split('|')).filter(token=>typeof token==='string' && token.length);
  if (!tokens.length || tokens.join('')!==word) return {mode:'rules',needsReview:true,parts:[unresolved(word,'Stored spelling groups are incomplete; refresh the analysis.')]};
  let reviewed;
  try { reviewed=JSON.parse(record?.pronunciation_segments || 'null'); } catch { /* Older/imported data uses rules. */ }
  if (record?.pronunciation_locale==='en-US' && Array.isArray(reviewed) && reviewed.length &&
      reviewed.every(part=>part && typeof part.spelling==='string' && typeof part.ipa==='string' && part.ipa.trim()) &&
      reviewed.map(part=>part.spelling).join('')===word) {
    return {mode:'reviewed',needsReview:false,parts:reviewed.map(part=>({spelling:part.spelling,sounds:[part.ipa],status:'reviewed',reason:'Provided American pronunciation'}))};
  }
  const vowelSounds=new Map(String(record?.vowel_team_sounds || '').split(',').filter(Boolean).map(value=>value.split(':')));
  let offset=0;
  const parts=tokens.map(spelling=>{
    const start=offset;offset+=spelling.length;
    const next=word[offset] || '';
    const vowelSound=vowelSounds.get(spelling);
    // These may contain consonants, or separate vowels: a vowel label is insufficient.
    if (spelling==='ough' || spelling==='augh' || vowelSound==='hiatus') return unresolved(spelling,'The full spelling needs more than a vowel label.');
    if (vowelSound) {
      if (!VOWELS[vowelSound]) return unresolved(spelling,'The supplied sound is not supported by the current rules.');
      if (AMBIGUOUS_TEAMS.has(spelling) && exceptionFor(word,spelling)!==vowelSound) return unresolved(spelling,'This spelling has several possible sounds.');
      return supported(spelling,[VOWELS[vowelSound]],'Existing vowel rule or exception');
    }
    if (FIXED_GROUPS[spelling]) return supported(spelling,[FIXED_GROUPS[spelling]],'Consonant or spelling-group rule');
    if (spelling==='ng' && offset===word.length) return supported(spelling,['\u014b'],'Final ng rule');
    if (spelling==='kn' && start===0) return supported(spelling,['n'],'Initial kn rule');
    if (spelling==='wr' && start===0) return supported(spelling,['r'],'Initial wr rule');
    if (spelling==='gn' && start===0) return supported(spelling,['n'],'Initial gn rule');
    if (spelling==='mb' && offset===word.length) return supported(spelling,['m'],'Final mb rule');
    if (spelling==='ph' && start===0) return supported(spelling,['f'],'Initial ph rule');
    if (spelling==='nk') return supported(spelling,['\u014b','k'],'The nk group contains two sounds.');
    if (BLENDS.has(spelling)) return supported(spelling,[...spelling].map(consonant),'A consonant blend contains separate sounds.');
    if (spelling==='c' && !/[eiy]/.test(next)) return supported(spelling,['k'],'Hard c rule');
    if (spelling==='g' && !/[eiy]/.test(next)) return supported(spelling,['\u0261'],'Hard g rule');
    if (spelling==='s' && start===0) return supported(spelling,['s'],'Initial s rule');
    if (CONSONANTS[spelling]) {
      if ((spelling==='h' && start===0) || (spelling==='t' && /st[el]/.test(word)) ||
          (spelling==='l' && /[aou]l[fmkv]/.test(word)) || (spelling==='b' && next==='t')) {
        return unresolved(spelling,'Check whether this consonant is pronounced here.');
      }
      return supported(spelling,[CONSONANTS[spelling]],'Single-consonant rule');
    }
    // A narrow closed-CVC rule; broader single-vowel contexts remain explicit review items.
    if (/^[aeiou]$/.test(spelling) && tokens.length===3 && tokens[1]===spelling && /^[b-df-hj-np-tv-z]+$/.test(tokens[0]) && /^[b-df-hj-np-tv-z]+$/.test(tokens[2]) &&
        word[0]!=='w' && !/[lr]/.test(tokens[2]) && !(spelling==='u' && /[bpf]/.test(word[0])) &&
        !(spelling==='o' && tokens[2]==='n')) {
      return supported(spelling,[VOWELS[{a:'short_a',e:'short_e',i:'short_i',o:'short_o',u:'short_u'}[spelling]]],'Closed CVC vowel rule');
    }
    return unresolved(spelling,'The current rules do not resolve this group confidently.');
  });
  return {mode:'rules',parts,needsReview:parts.some(part=>part.status==='needs_review') || !parts.length};
}
