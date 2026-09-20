/*!
 * PhonicsConstructor.js  v2.2.0
 * Raw word list → phonics metadata objects + CSV.
 *
 * CHANGELOG
 *  2.2.0  Compound-aware and suffix-aware syllable splitting.
 *         Fixes: something → some·thing (was so·met·hing)
 *                amazing   → a·maz·ing  (was a·ma·zing)
 *         Preserves: rabbit, father, sister, summer, bigger, teacher,
 *                    water, flower, running, spelling, wanted, jumped.
 *  2.1.0  Initial syllable splitter.
 *  2.0.0  Scope & sequence, decodability, extended CSV.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PhonicsConstructor = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '2.3.0';

  /* ==========================================================
     1. PATTERN DICTIONARY  (expanded, level-tagged)
     ========================================================== */
  var PHONICS_PATTERNS = {
    digraphs:    ['ch','sh','th','wh','ph','ck','ng','qu','gh','kn','wr','gn','mb','ps'],
    floss:       ['ss','ff','ll','zz'],
    blends:      ['bl','cl','fl','gl','pl','sl','br','cr','dr','fr','gr','pr','tr',
                  'tw','dw','sc','sk','sm','sn','sp','st','sw',
                  'mp','nt','nk','nd','ft','lt','lk','ld','lp','lf','pt','ct','xt',
                  'rd','rk','rm','rn','rl','rt'],
    clusters3:   ['scr','spl','spr','str','shr','thr','squ','sch'],
    trigraphs:   ['tch','dge','igh'],
    vowelTeams:  ['ai','ay','ea','ee','ie','oa','oe','ue','ui',
                  'au','aw','ei','eu','ew','ey','oi','oo','ou','ow','oy',
                  'eigh','ough','augh'],
    rControlled: ['ar','er','ir','or','ur'],
    rControlled3:['air','ear','eer','oor','our','are','ere','ire','ore','ure','oar']
  };

  var PATTERN_CATEGORY = {};
  var PATTERN_LEVELS   = {};
  var SORTED_PATTERNS  = [];

  (function initPatterns() {
    var catLevels = {
      digraphs: 2, floss: 2, blends: 3, clusters3: 4, trigraphs: 4,
      vowelTeams: 5, rControlled: 6, rControlled3: 7
    };
    Object.keys(PHONICS_PATTERNS).forEach(function (cat) {
      PHONICS_PATTERNS[cat].forEach(function (p) {
        if (!PATTERN_CATEGORY[p]) {
          PATTERN_CATEGORY[p] = cat;
          PATTERN_LEVELS[p]   = catLevels[cat] || 2;
        }
      });
    });
    ['gh','kn','wr','gn','mb','ps'].forEach(function (p) { PATTERN_LEVELS[p] = 4; });
    ['au','aw','ei','eu','ew','ey','oi','oo','ou','ow','oy'].forEach(function (p) { PATTERN_LEVELS[p] = 6; });
    ['eigh','ough','augh'].forEach(function (p) { PATTERN_LEVELS[p] = 8; });

    var seen = {};
    Object.keys(PHONICS_PATTERNS).forEach(function (cat) {
      PHONICS_PATTERNS[cat].forEach(function (p) {
        if (seen[p]) return;
        seen[p] = 1;
        SORTED_PATTERNS.push({ pattern: p, category: cat });
      });
    });
    SORTED_PATTERNS.sort(function (a, b) { return b.pattern.length - a.pattern.length; });
  })();

  var SCOPE_LEVELS = [
    { level: 1, name: 'CVC & single letters',        desc: 'cat, dog, sun' },
    { level: 2, name: 'Digraphs & FLOSS',            desc: 'sh, ch, th, ck, ng, ss, ll' },
    { level: 3, name: 'Consonant blends',            desc: 'st, tr, bl, mp, nd' },
    { level: 4, name: 'Trigraphs & 3-clusters',      desc: 'tch, dge, igh, str, spl' },
    { level: 5, name: 'Common vowel teams',          desc: 'ai, ay, ee, ea, oa' },
    { level: 6, name: 'Advanced vowels & R-ctrl',    desc: 'oi, oy, ou, au, ar, er' },
    { level: 7, name: 'R-ctrl trigraphs',            desc: 'air, ear, ire, ore' },
    { level: 8, name: 'Advanced / multi-syllable',   desc: 'ough, eigh, schwa' }
  ];

  /* Curated common-word set (heuristic for real/nonsense) */
  var COMMON_WORDS = (function () {
    return ('the be to of and a in that have i it for not on with he as you do at this but his by from ' +
      'they we say her she or an will my one all would there their what so up out if about who get which ' +
      'go me when make can like time no just him know take people into year your good some could them see ' +
      'other than then now look only come its over think also back after use two how our work first well ' +
      'way even new want because any these give day most us is are was were has had does did would should ' +
      'may might must shall went gone coming saw seen looked looking said saying made making took taken got ' +
      'gotten gave given found put run ran running cat dog sun hat bat rat mat sat fat pat man can fan pan ' +
      'ran van bag tag rag big dig pig wig fig log fog hog jog bog bug hug mug rug tug dug bed fed led red ' +
      'wed ten hen pen den men net pet set wet let met bet bit fit hit sit lit pit kit win pin fin tin bin ' +
      'din sin chin thin shin ship shop chip chop chat that this them when whip fish wish dish cash mash ' +
      'dash ash bash gash hash lash rash sash trash flash crash smash shell smell spell swell class grass ' +
      'glass pass mass less mess dress press stress trip trap tree train truck trick track crack black ' +
      'block clock click clack brick bring brush brave broke bright splash spring sprint string strong ' +
      'street stream stamp stump stand still small smile stone store story storm start jump hand lamp ' +
      'milk soft belt help plant ant tent sink night light right might tight fight queen quick quit quilt').split(/\s+/);
  })();
  (function () { var m = {}; COMMON_WORDS.forEach(function (w) { m[w] = 1; }); COMMON_WORDS = m; })();

  /* ==========================================================
     1b. COMPOUND-PART DICTIONARY
     Standalone words that commonly appear as a half of a compound.
     Used by the splitter to detect morpheme boundaries that pattern
     rules alone cannot see (some+thing, any+one, rain+bow).
     ========================================================== */
  var COMPOUND_PARTS = (function () {
    var words = (
      'some any every no one thing body where what who how when why ' +
      'sun moon star day night time week year book case mark ground ' +
      'back side walk way yard work play mate room house home place ' +
      'food cake bread milk meat bird fish tree leaf rain snow wind ' +
      'cloud fire water earth air light dark may be can will do have ' +
      'go come see know think say take get make man boy girl friend ' +
      'self own ever never up down in out over under all half full ' +
      'less more hand foot head arm leg eye ear hair black white blue ' +
      'red green brown yellow pink purple grand mother father son ' +
      'daughter chair table door window wall floor roof stairs paper ' +
      'pencil pen box bag toy game ball cup pot pan bowl dish glass ' +
      'spoon fork knife car bus train boat plane bike ship truck cart ' +
      'class birth board fly base basket note text story news stand ' +
      'set line ware wear side note pad clip pin corn pop bow cup'
    ).split(/\s+/);
    var m = Object.create(null);
    words.forEach(function (w) { if (w.length >= 2) m[w] = 1; });
    return m;
  })();

  /* A root-word dictionary used to sanity-check un-doubling
     (running → run, but spelling → spell, not spel). */
  var ROOT_WORDS = (function () {
    var words = (
      'run hop sit fit big hot get cut put let win shop drop slip trip ' +
      'swim stop plan clap grab drum hug jog nod pat pet pop rub shut ' +
      'skip slam snap spin spot step stir swap tap tip top wrap zip ' +
      'spell tell sell smell swell fill kill will still chill drill ' +
      'fast slow soft hard quick small tall short long strong weak ' +
      'teach work play help look want need call talk walk read write ' +
      'sing ring king thing bring spring string wing cling fling sting ' +
      'swing big dig fig pig wig sum ban fan man pan tan van'
    ).split(/\s+/);
    var m = Object.create(null);
    words.forEach(function (w) { if (w.length >= 3) m[w] = 1; });
    return m;
  })();

  /* ==========================================================
     1c. VOWEL-TEAM PRONUNCIATION MAP
     Curated lookup for ambiguous vowel teams. Only words whose
     pronunciation differs from the pattern's default sound are
     listed — everything else falls through to DEFAULT_VOWEL_SOUND.
     Grow this list as new words appear in the curriculum.
     ========================================================== */
  var SOUND_LABELS = {
    long_a:   '/ā/ (cake)',
    long_e:   '/ē/ (see)',
    long_i:   '/ī/ (bike)',
    long_o:   '/ō/ (boat)',
    long_u:   '/ū/ (cube)',
    short_a:  '/ă/ (cat)',
    short_e:  '/ĕ/ (bed)',
    short_i:  '/ĭ/ (bit)',
    short_o:  '/ŏ/ (dog)',
    short_u:  '/ŭ/ (cup)',
    oo_long:  '/o͞o/ (moon)',
    oo_short: '/o͝o/ (book)',
    ow:       '/ou/ (cow)',
    oi:       '/oi/ (coin)',
    aw:       '/ô/ (saw)',
    air:      '/âr/ (air)'    
  };

  /* The sound each vowel team makes when it's behaving "normally". */
  var DEFAULT_VOWEL_SOUND = {
    ai:'long_a', ay:'long_a',
    ea:'long_e', ee:'long_e',
    ie:'long_i', oa:'long_o', oe:'long_o',
    ue:'long_u', ui:'long_u',
    au:'aw', aw:'aw',
    ei:'long_a', eu:'long_u',
    ew:'oo_long',
    ey:'long_a',
    oi:'oi', oy:'oi',
    oo:'oo_long',
    ou:'ow', ow:'ow',
    eigh:'long_a',      // neighbor, eight, weigh
    augh:'aw',          // caught, taught, daughter
    ough:'long_o'      // though, although (default — plenty of exceptions)
  };

  /* =================================================================
     VOWEL_TEAM_EXCEPTIONS
     Keyed by word → { pattern: sound_key }.
     Every entry is a word whose vowel team sounds differently from
     the DEFAULT_VOWEL_SOUND for that pattern.  Words not listed
     fall through to the default.

     Only vowel TEAMS are tracked (ai, ay, ea, ee, ie, oa, oe, ue, ui,
     au, aw, ei, eu, ew, ey, oi, oo, ou, ow, oy, eigh, ough, augh).
     R-controlled patterns (ar, er, ear, air, ore, etc.) are captured
     as rControlled / rControlled3 and do not produce a
     vowel_team_sounds entry — so `bear`, `wear`, `pear`, `year`,
     `hear` are deliberately NOT listed here.
     ================================================================= */
  var VOWEL_TEAM_EXCEPTIONS = {
    /* ---- ea = /ĕ/ (short e) ---- */
    bread:{ea:'short_e'}, head:{ea:'short_e'}, dead:{ea:'short_e'},
    ready:{ea:'short_e'}, already:{ea:'short_e'}, breakfast:{ea:'short_e'},
    health:{ea:'short_e'}, wealth:{ea:'short_e'}, weather:{ea:'short_e'},
    feather:{ea:'short_e'}, leather:{ea:'short_e'}, heavy:{ea:'short_e'},
    pleasant:{ea:'short_e'}, measure:{ea:'short_e'}, treasure:{ea:'short_e'},
    sweat:{ea:'short_e'}, threat:{ea:'short_e'}, spread:{ea:'short_e'},
    instead:{ea:'short_e'}, thread:{ea:'short_e'}, breath:{ea:'short_e'},
    death:{ea:'short_e'}, deaf:{ea:'short_e'},

    /* ---- ea = /ā/ (long a) ---- */
    break:{ea:'long_a'}, great:{ea:'long_a'}, steak:{ea:'long_a'},

    /* ---- ea = /ē/ (long e) — silent-e makes the ea long ---- */
    breathe:{ea:'long_e'}, breathes:{ea:'long_e'}, breathed:{ea:'long_e'},
    breather:{ea:'long_e'}, breathing:{ea:'long_e'},

    /* ---- oo = /o͝o/ (short oo) ---- */
    book:{oo:'oo_short'}, look:{oo:'oo_short'}, took:{oo:'oo_short'},
    cook:{oo:'oo_short'}, hook:{oo:'oo_short'}, good:{oo:'oo_short'},
    hood:{oo:'oo_short'}, wood:{oo:'oo_short'}, foot:{oo:'oo_short'},
    stood:{oo:'oo_short'}, shook:{oo:'oo_short'}, brook:{oo:'oo_short'},
    wool:{oo:'oo_short'}, hoof:{oo:'oo_short'},

    /* ---- oo = /ŭ/ ---- */
    blood:{oo:'short_u'}, flood:{oo:'short_u'},

    /* ---- ow = /ō/ (long o) ---- */
    snow:{ow:'long_o'}, slow:{ow:'long_o'}, grow:{ow:'long_o'},
    show:{ow:'long_o'}, know:{ow:'long_o'}, low:{ow:'long_o'},
    row:{ow:'long_o'}, glow:{ow:'long_o'}, flow:{ow:'long_o'},
    throw:{ow:'long_o'}, window:{ow:'long_o'}, yellow:{ow:'long_o'},
    follow:{ow:'long_o'},

    /* ---- ou = /o͞o/ ---- */
    soup:{ou:'oo_long'}, group:{ou:'oo_long'}, you:{ou:'oo_long'},
    youth:{ou:'oo_long'}, route:{ou:'oo_long'}, wound:{ou:'oo_long'},

    /* ---- ou = /o͝o/ (short oo) ---- */
    would:{ou:'oo_short'}, could:{ou:'oo_short'}, should:{ou:'oo_short'},

    /* ---- ou = /ō/ (long o) — the -ould family splits here ----
       'would/could/should' say /o͝o/ (short oo), but 'shoulder' and
       'soul' say /ō/.  Without these explicit entries, lookupException
       strips the 's'/'er' suffix off 'shoulders' and inherits oo_short
       from 'should'. */
    shoulder:{ou:'long_o'}, shoulders:{ou:'long_o'},
    soul:{ou:'long_o'}, souls:{ou:'long_o'},
    boulder:{ou:'long_o'}, boulders:{ou:'long_o'},
    
    /* ---- ou = /ŭ/ ---- */
    touch:{ou:'short_u'}, rough:{ou:'short_u'}, tough:{ou:'short_u'},
    enough:{ou:'short_u'}, cousin:{ou:'short_u'}, double:{ou:'short_u'},
    trouble:{ou:'short_u'}, young:{ou:'short_u'},

    /* ---- ie = /ē/ (long e) — default -ief/-ield set ---- */
    field:{ie:'long_e'}, yield:{ie:'long_e'}, shield:{ie:'long_e'},
    brief:{ie:'long_e'}, chief:{ie:'long_e'}, thief:{ie:'long_e'},
    grief:{ie:'long_e'}, relief:{ie:'long_e'}, niece:{ie:'long_e'},
    piece:{ie:'long_e'}, priest:{ie:'long_e'},

    /* ---- ie = /ē/ (long e) — believe family ---- */
    believe:{ie:'long_e'}, believes:{ie:'long_e'}, believed:{ie:'long_e'},
    believer:{ie:'long_e'}, believing:{ie:'long_e'},

    /* ---- ie = /ē/ (long e) — cookie, movie, batter(y→ies) ---- */
    /*   The 'oo' in -oo- words (cookie, rookie, hoodie) says short-oo
         like "book", not long-oo like "moon". Override both teams. */
    cookie:{ie:'long_e', oo:'oo_short'},
    cookies:{ie:'long_e', oo:'oo_short'},
    bookie:{ie:'long_e', oo:'oo_short'},
    bookies:{ie:'long_e', oo:'oo_short'},
    rookie:{ie:'long_e', oo:'oo_short'},
    rookies:{ie:'long_e', oo:'oo_short'},
    hoodie:{ie:'long_e', oo:'oo_short'},
    hoodies:{ie:'long_e', oo:'oo_short'},
    woodie:{ie:'long_e', oo:'oo_short'},
    footie:{ie:'long_e', oo:'oo_short'},
    movie:{ie:'long_e'}, movies:{ie:'long_e'},
    batteries:{ie:'long_e'},

    /* ---- ie = /ē/ (long e) — common -ie nouns ---- */
    /*   NOTE: rookie/rookies and hoodie/hoodies live in the block above
         so they can carry BOTH the ie AND oo overrides. Do not re-add. */
    zombie:{ie:'long_e'}, zombies:{ie:'long_e'},
    brownie:{ie:'long_e'}, brownies:{ie:'long_e'},
    selfie:{ie:'long_e'}, selfies:{ie:'long_e'},
    sweetie:{ie:'long_e'}, auntie:{ie:'long_e'},

    /* ---- ie = /ē/ (long e) — multi-syllable ---- */
    calorie:{ie:'long_e'}, calories:{ie:'long_e'},
    prairie:{ie:'long_e'}, collie:{ie:'long_e'},
    goalie:{ie:'long_e'}, genie:{ie:'long_e'},
    soldier:{ie:'long_e'}, charlie:{ie:'long_e'},

    /* ---- ie = /ĕ/ (short e) ---- */
    friend:{ie:'short_e'},

    /* ---- ey = /ē/ (long e) ---- */
    key:{ey:'long_e'}, monkey:{ey:'long_e'}, donkey:{ey:'long_e'},
    turkey:{ey:'long_e'}, alley:{ey:'long_e'}, valley:{ey:'long_e'},
    chimney:{ey:'long_e'}, honey:{ey:'long_e'}, money:{ey:'long_e'},

    /* ---- ey = /ā/ (long a) ---- */
    they:{ey:'long_a'}, obey:{ey:'long_a'},

    /* ---- ay = /ĕ/ (short e) ---- */
    says:{ay:'short_e'},

    /* ---- ei = /ē/ (long e) ---- */
    receive:{ei:'long_e'}, deceive:{ei:'long_e'}, ceiling:{ei:'long_e'},
    protein:{ei:'long_e'}, either:{ei:'long_e'}, neither:{ei:'long_e'},
    seize:{ei:'long_e'},

    /* ---- ei = /ī/ (long i) ---- */
    height:{ei:'long_i'}, sleight:{ei:'long_i'},

    /* ---- ei = /âr/ (air) ---- */
    their:{ei:'air'}, heir:{ei:'air'}, theirs:{ei:'air'}
  };

  /* Try the word directly; if it's an inflected form, try common
     suffix-stripped stems. Handles received → receive, believed →
     believe, sweeter → sweet, etc. */
  function lookupException(word, pattern) {
    // 1. Direct match.
    var m = VOWEL_TEAM_EXCEPTIONS[word];
    if (m && m[pattern]) return m[pattern];

    // 2. Suffix-stripped match (received → receive, believed → believe).
	var suffixes = ['ing', 'est', 'ed', 'er', 'ly', 's', 'd', 'es'];
    for (var i = 0; i < suffixes.length; i++) {
      var s = suffixes[i];
      if (word.length > s.length + 2 && word.slice(-s.length) === s) {
        var stem = word.slice(0, -s.length);
        var m2 = VOWEL_TEAM_EXCEPTIONS[stem];
        if (m2 && m2[pattern]) return m2[pattern];
      }
    }

    // 3. Compound-part match: scan every split point where both halves are
    //    at least 3 chars. If either half is in the exceptions map, adopt
    //    its sound. Handles gingerbread → bread, bedspread → spread,
    //    breadwinner → bread, steakhouse → steak, overthrow → throw.
    //    The ≥3 constraint on each side prevents -e silent-ending words
    //    like 'breathe' from matching on prefix 'breath'.
    for (var j = 3; j <= word.length - 3; j++) {
      var prefix = word.slice(0, j);
      var m3 = VOWEL_TEAM_EXCEPTIONS[prefix];
      if (m3 && m3[pattern]) return m3[pattern];

      var suffix = word.slice(j);
      var m4 = VOWEL_TEAM_EXCEPTIONS[suffix];
      if (m4 && m4[pattern]) return m4[pattern];
    }

    return null;
  }
  
  /* Resolve the sound a vowel team makes inside a specific word. */
  function soundForVowelTeam(word, pattern) {
    var ex = lookupException(word, pattern);
    if (ex) return ex;
    return DEFAULT_VOWEL_SOUND[pattern] || null;
  }
  
  /* Return an array of { pattern, sound, label, is_default } for every
     vowel team found in a word. */
  function vowelTeamSounds(word, tokens) {
    var out = [];
    (tokens || tokenize(word)).forEach(function (t) {
      if (!DEFAULT_VOWEL_SOUND[t]) return;
      var sound = soundForVowelTeam(word, t);
      if (!sound) return;
      out.push({
        pattern: t,
        sound: sound,
        label: SOUND_LABELS[sound] || sound,
        is_default: sound === DEFAULT_VOWEL_SOUND[t]
      });
    });
    return out;
  }
  
  /* ==========================================================
     2. HELPERS
     ========================================================== */
  var CONSONANT = /[bcdfghjklmnpqrstvwxyz]/;
  var VOWEL_RE  = /[aeiou]/;

  function clean(word) {
    return String(word == null ? '' : word).toLowerCase().replace(/[^a-z]/g, '');
  }
  function isVowel(ch) { return VOWEL_RE.test(ch); }

  function countSyllables(word) {
    var w = clean(word);
    if (!w) return 0;
    if (w.length <= 3) return 1;
    if (w.charAt(w.length - 1) === 'e' && w.length > 2) {
      var isLe = (w.charAt(w.length - 2) === 'l' && w.length > 3 && !isVowel(w.charAt(w.length - 3)));
      if (!isLe) w = w.slice(0, -1);
    }
    var count = 0, prev = false;
    for (var i = 0; i < w.length; i++) {
      var v = isVowel(w.charAt(i));
      if (v && !prev) count++;
      prev = v;
    }
    return Math.max(1, count);
  }

  function onsetRime(word) {
    var w = clean(word), i = 0;
    while (i < w.length && !isVowel(w.charAt(i))) i++;
    return { onset: w.slice(0, i), rime: w.slice(i) };
  }

  function tokenize(word, opts) {
    opts = opts || {};
    var mergeDoubles = opts.mergeDoubleConsonants !== false;
    var w = clean(word), tokens = [], i = 0;
    while (i < w.length) {
      var matched = null;
      for (var k = 0; k < SORTED_PATTERNS.length; k++) {
        var p = SORTED_PATTERNS[k].pattern;
        if (p.length > w.length - i) continue;
        if (w.substr(i, p.length) !== p) continue;

        // 'ng' is only a digraph at the end of a syllable. When it's
        // immediately followed by 'e', the n and g belong to different
        // syllables (gin-ger, fin-ger, long-er, strong-er). Skip the
        // match so the fall-through splits them into n + g.
        if (p === 'ng' && i + 2 < w.length && w.charAt(i + 2) === 'e') continue;

        matched = p;
        break;
      }
      if (matched) { tokens.push(matched); i += matched.length; continue; }
      if (mergeDoubles && i + 1 < w.length &&
          w.charAt(i) === w.charAt(i + 1) && CONSONANT.test(w.charAt(i))) {
        tokens.push(w.charAt(i) + w.charAt(i + 1)); i += 2; continue;
      }
      tokens.push(w.charAt(i)); i += 1;
    }
    return tokens;
  }

  function findAllPatterns(word) {
    var found = {};
    SORTED_PATTERNS.forEach(function (sp) {
      if (word.indexOf(sp.pattern) !== -1) {
        if (!found[sp.category]) found[sp.category] = [];
        if (found[sp.category].indexOf(sp.pattern) === -1) found[sp.category].push(sp.pattern);
      }
    });
    return found;
  }

  function computeDifficulty(buckets, tokens) {
    if (buckets.clusters3.length) return 3;
    if (buckets.trigraphs.length) return 2;
    var last = tokens[tokens.length - 1];
    var FINAL = {mp:1,nt:1,nk:1,nd:1,ft:1,lt:1,lk:1,ld:1,lp:1,lf:1,pt:1,ct:1,xt:1,
                 rd:1,rk:1,rm:1,rn:1,rl:1,rt:1};
    if (last && FINAL[last]) return 2;
    if (buckets.vowelTeams.length || buckets.rControlled.length || buckets.rControlled3.length) return 2;
    return 1;
  }

  function decodabilityLevel(record) {
    var maxLevel = 1;
    (record.tokens || []).forEach(function (t) {
      if (PATTERN_LEVELS[t]) maxLevel = Math.max(maxLevel, PATTERN_LEVELS[t]);
    });
    return maxLevel;
  }

  /* ==========================================================
     2b. SYLLABLE SPLITTER  (heuristic, compound/suffix-aware)
     ========================================================== */

  /* Vowel nuclei — patterns that count as a SINGLE vowel sound.
     Longest first. R-controlled patterns are deliberately excluded so
     'story' segments as o | y, not or | y. */
  var VOWEL_NUCLEI = (function () {
    var list = []
      .concat(['air','ear','eer','oor','our','are','ere','ire','ore','ure','oar'])
      .concat(['eigh','ough','augh','igh'])
      .concat(['ai','ay','ea','ee','ie','oa','oe','ue','ui','au','aw',
               'ei','eu','ew','ey','oi','oo','ou','ow','oy']);
    list.sort(function (a, b) { return b.length - a.length; });
    return list;
  })();

  function isVowelChar(ch) { return 'aeiou'.indexOf(ch) !== -1; }

  /* 'y' is a consonant only when it starts a word and is followed by a vowel
     (yes, you, yacht). Otherwise it acts as a vowel (happy, gym, fly). */
  function isYVowel(w, i) {
    if (i === 0 && i + 1 < w.length && isVowelChar(w.charAt(i + 1))) return false;
    return true;
  }

  function identifyVowelNuclei(word) {
    var w = clean(word);
    var nuclei = [];
    var i = 0;
    while (i < w.length) {
      var matched = null;
      for (var k = 0; k < VOWEL_NUCLEI.length; k++) {
        var p = VOWEL_NUCLEI[k];
        if (w.substr(i, p.length) === p) { matched = p; break; }
      }
      if (matched) {
        nuclei.push({ start: i, end: i + matched.length, pattern: matched });
        i += matched.length;
        continue;
      }
      var ch = w.charAt(i);
      if (isVowelChar(ch) || (ch === 'y' && isYVowel(w, i))) {
        nuclei.push({ start: i, end: i + 1, pattern: ch });
        i += 1;
        continue;
      }
      i += 1;
    }
    // Silent final 'e' — drop it when the word has 2+ nuclei
    if (nuclei.length >= 2) {
      var last = nuclei[nuclei.length - 1];
      if (last.pattern === 'e' && last.start > 0 && !isVowelChar(w.charAt(last.start - 1))) {
        var after = w.slice(last.end);
        var isSilent = (last.end === w.length) ||
                       (after.length === 1 && (after === 's' || after === 'd'));
        if (isSilent) nuclei.pop();
      }
    }
    return nuclei;
  }

  /* ---------- Compound split ---------- */
  /* Longest left half first so 'something' → some|thing, not 'so'|'mething'.
     Requires BOTH halves to be standalone words (>= 3 letters each) so a
     short morpheme like 'no' cannot falsely split 'nothing'. */
  function tryCompoundSplit(word) {
    if (word.length < 6) return null;
    for (var i = word.length - 3; i >= 3; i--) {
      var left = word.slice(0, i);
      var right = word.slice(i);
      if (COMPOUND_PARTS[left] && COMPOUND_PARTS[right]) {
        return [left, right];
      }
    }
    return null;
  }

  /* ---------- Suffix strip ---------- */
  /* Returns {stem, suffix} or null.  Includes un-doubling logic:
     running → run + ning, bigger → big + ger, but
     spelling → spell + ing (not spel + ling).
     minStem for -er is 5 so 'father', 'summer', 'sister', 'water'
     fall through to pattern rules instead of being chopped. */
  function tryStripSuffix(word) {
    var rules = [
      { suf: 'tion', minStem: 3, always: true },
      { suf: 'sion', minStem: 3, always: true },
      { suf: 'ment', minStem: 3, always: true },
      { suf: 'ness', minStem: 3, always: true },
      { suf: 'less', minStem: 3, always: true },
      { suf: 'able', minStem: 3, always: true },
      { suf: 'ible', minStem: 3, always: true },
      { suf: 'ous',  minStem: 3, always: true },
      { suf: 'ful',  minStem: 3, always: true },
      { suf: 'ing',  minStem: 3, always: false, undouble: true },
      { suf: 'ly',   minStem: 3, always: false },
      { suf: 'est',  minStem: 4, always: false, undouble: true },
      { suf: 'er',   minStem: 5, always: false, undouble: true },
      { suf: 'ed',   minStem: 2, always: false, edOnly: true }
    ];

    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (word.length < r.suf.length + r.minStem) continue;
      if (word.slice(-r.suf.length) !== r.suf) continue;

      var stem = word.slice(0, -r.suf.length);
      var actualSuf = r.suf;

      // '-ed' only adds a syllable after t or d (wanted, needed).
      // After any other letter, -ed is silent (jumped, cooked) — bail.
      if (r.edOnly) {
        var lastCh = stem.charAt(stem.length - 1);
        if (lastCh !== 't' && lastCh !== 'd') continue;
      }

      // Stem must contain a vowel.
      if (!/[aeiouy]/.test(stem)) continue;

      // Un-double a final consonant only when the un-doubled root is a known word.
      if (r.undouble && stem.length >= 3) {
        var c1 = stem.charAt(stem.length - 1);
        var c2 = stem.charAt(stem.length - 2);
        if (c1 === c2 && !/[aeiou]/.test(c1) && c1 !== 'l' && c1 !== 's' && c1 !== 'f') {
          var candidate = stem.slice(0, -1);
          if (ROOT_WORDS[candidate]) {
            actualSuf = c1 + r.suf;
            stem = candidate;
          }
        }
      }

      return { stem: stem, suffix: actualSuf };
    }
    return null;
  }

  function splitSyllables(word, depth) {
    depth = depth || 0;
    var w = clean(word);
    if (!w) return [];
    if (depth > 4) return [w];              // guard against runaway recursion

    // ---- 1. Compound split: some|thing, rain|bow, any|one ----
    var compound = tryCompoundSplit(w);
    if (compound) {
      var l = splitSyllables(compound[0], depth + 1);
      var r = splitSyllables(compound[1], depth + 1);
      return l.concat(r);
    }

    // ---- 2. -Cle ending: ta|ble, lit|tle, ap|ple ----
    var cleSuffix = '';
    if (w.length > 4 && w.slice(-2) === 'le') {
      var cIdx = w.length - 3;
      var c = w.charAt(cIdx);
      if (!isVowelChar(c) && c !== 'l') {
        cleSuffix = w.slice(cIdx);
        w = w.slice(0, cIdx);
      }
    }

    // ---- 3. Suffix strip: a|maz|ing, run|ning, teach|er ----
    var stripped = tryStripSuffix(w);
    if (stripped && stripped.stem.length >= 2) {
      var stemSyls = splitSyllables(stripped.stem, depth + 1);
      var withSuffix = stemSyls.concat([stripped.suffix]);
      return cleSuffix ? withSuffix.concat([cleSuffix]) : withSuffix;
    }

    // ---- 4. Pattern-based fallback ----
    var nuclei = identifyVowelNuclei(w);
    if (nuclei.length <= 1) return cleSuffix ? [w, cleSuffix] : [w];

    var boundaries = [];
    for (var n = 0; n < nuclei.length - 1; n++) {
      var cur = nuclei[n], nxt = nuclei[n + 1];
      var between = w.slice(cur.end, nxt.start);
      var len = between.length;
      var split;

      if (len === 0) {
        // Adjacent vowels → hiatus (cre-ate, play-er)
        split = cur.end;
      } else if (len === 1) {
        // VCV → split before the consonant (o-pen, ti-ger).
        // Guard against leaving a bare consonant as its own syllable.
        split = cur.end;
        if (split < 1 || !/[aeiouy]/.test(w.slice(0, split))) split = cur.end + 1;
      } else if (len === 2) {
        // VCCV.  Keep true consonant digraphs together (fa-ther, wea-ther);
        // split other pairs between (rab-bit, sis-ter, win-ter, sum-mer).
        if (between === 'th' || between === 'sh' || between === 'ch' || between === 'wh') {
          split = cur.end;
        } else {
          split = cur.end + 1;
        }
      } else {
        // VCCCV+ → keep the last two together if they form a cluster.
        var lastTwo = between.slice(-2);
        var cat = PATTERN_CATEGORY[lastTwo];
        if (cat === 'blends' || cat === 'digraphs' || cat === 'clusters3') {
          split = nxt.start - 2;
        } else {
          split = nxt.start - 1;
        }
      }

      if (split > (boundaries.length ? boundaries[boundaries.length - 1] : 0)) {
        boundaries.push(split);
      }
    }

    var syllables = [], start = 0;
    boundaries.forEach(function (b) {
      if (b > start) syllables.push(w.slice(start, b));
      start = b;
    });
    if (start < w.length) syllables.push(w.slice(start));
    if (cleSuffix) syllables.push(cleSuffix);

    return syllables.length ? syllables : [word];
  }

  /* ==========================================================
     3. PARSING
     ========================================================== */
  function parseWord(rawWord, opts) {
    opts = opts || {};
    var word = clean(rawWord);
    if (!word) return null;

    var tokens = tokenize(word, opts);
    var buckets = {
      digraphs: [], trigraphs: [], blends: [],
      clusters3: [], vowelTeams: [], rControlled: [], rControlled3: [], floss: []
    };
    var seen = {};
    tokens.forEach(function (tok) {
      if (tok.length < 2) return;
      var cat = PATTERN_CATEGORY[tok];
      if (!cat || !buckets[cat]) return;
      var k = cat + ':' + tok;
      if (seen[k]) return;
      seen[k] = 1;
      buckets[cat].push(tok);
    });

    if (opts.includeSubPatterns) {
      var all = findAllPatterns(word);
      Object.keys(all).forEach(function (cat) {
        if (!buckets[cat]) return;
        all[cat].forEach(function (p) {
          if (buckets[cat].indexOf(p) === -1) buckets[cat].push(p);
        });
      });
    }

    var difficulty = computeDifficulty(buckets, tokens);
    var or = onsetRime(word);

    var allPats = [];
    Object.keys(buckets).forEach(function (cat) {
      buckets[cat].forEach(function (p) {
        if (allPats.indexOf(p) === -1) allPats.push(p);
      });
    });

    var rec = {
      word: word,
      graphemes: tokens.join('|'),
      phoneme_count: tokens.length,
      digraphs:  buckets.digraphs.join(','),
      trigraphs: buckets.trigraphs.join(','),
      blends:    buckets.blends.join(','),
      difficulty: difficulty,

      clusters3:    buckets.clusters3.join(','),
      vowel_teams:  buckets.vowelTeams.join(','),
      r_controlled: buckets.rControlled.concat(buckets.rControlled3).join(','),
      floss:        buckets.floss.join(','),
      letter_count: word.length,

      syllable_count: countSyllables(word),
      onset: or.onset,
      rime:  or.rime,
      level: 0,
      is_common: COMMON_WORDS[word] ? 'yes' : 'no',
      secondary_patterns: allPats.join(','),
      vowel_team_sounds: vowelTeamSounds(word, tokens).map(function (s) {
        return s.pattern + ':' + s.sound;
      }).join(','),

      tokens: tokens
    };
    rec.level = decodabilityLevel(rec);
    return rec;
  }

  function parseWords(list, opts) {
    if (!Array.isArray(list)) list = String(list == null ? '' : list).split(/[\r\n]+/);
    var out = [], seen = {};
    list.forEach(function (raw) {
      var rec = parseWord(raw, opts);
      if (!rec || seen[rec.word]) return;
      seen[rec.word] = 1;
      out.push(rec);
    });
    return out;
  }

  function parseText(text, opts) {
    var list = String(text || '').split(/[\r\n,;|\t]+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return /[a-zA-Z]/.test(s); });
    return parseWords(list, opts);
  }

  /* ==========================================================
     4. MINIMAL PAIRS
     ========================================================== */
  function findMinimalPairs(word, pool, opts) {
    opts = opts || {};
    var target = parseWord(word, opts);
    if (!target) return [];
    var results = [];
    (pool || []).forEach(function (w) {
      var rec = (typeof w === 'string') ? parseWord(w, opts) : w;
      if (!rec || rec.word === target.word) return;
      if (rec.tokens.length !== target.tokens.length) return;
      var diffs = 0, at = -1;
      for (var i = 0; i < rec.tokens.length; i++) {
        if (rec.tokens[i] !== target.tokens[i]) { diffs++; at = i; }
        if (diffs > 1) return;
      }
      if (diffs === 1) {
        results.push({
          word: rec.word,
          target_token: target.tokens[at],
          other_token: rec.tokens[at],
          differs_at: at
        });
      }
    });
    return results;
  }

  /* ==========================================================
     5. CSV EXPORTER
     ========================================================== */
  var BASE_COLUMNS = ['word','graphemes','phoneme_count','digraphs','trigraphs','blends','difficulty'];
  var EXTENDED_COLUMNS = ['clusters3','vowel_teams','r_controlled','floss','letter_count',
                          'syllable_count','onset','rime','level','is_common','secondary_patterns',
                          'vowel_team_sounds'];
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCSV(rows, opts) {
    opts = opts || {};
    var cols = BASE_COLUMNS.concat(opts.extended ? EXTENDED_COLUMNS : []);
    var lines = [cols.join(',')];
    (rows || []).forEach(function (r) {
      lines.push(cols.map(function (c) { return csvCell(r[c]); }).join(','));
    });
    return lines.join('\r\n');
  }

  function downloadCSV(csv, filename) {
    if (typeof document === 'undefined') return;
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'phonics-dictionary.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function isPreParsedCSV(text) {
    var first = String(text || '').split(/\r?\n/)[0] || '';
    return /^\s*word\s*,\s*graphemes/i.test(first);
  }

  /* ==========================================================
     6. PUBLIC API
     ========================================================== */
  return {
    VERSION: VERSION,
    PHONICS_PATTERNS: PHONICS_PATTERNS,
    PATTERN_LEVELS:   PATTERN_LEVELS,
    PATTERN_CATEGORY: PATTERN_CATEGORY,
    SCOPE_LEVELS:     SCOPE_LEVELS,
    SORTED_PATTERNS:  SORTED_PATTERNS,

    tokenize: tokenize,
    parseWord: parseWord,
    parseWords: parseWords,
    parseText: parseText,
    findAllPatterns: findAllPatterns,
    findMinimalPairs: findMinimalPairs,
    countSyllables: countSyllables,
    onsetRime: onsetRime,
    decodabilityLevel: decodabilityLevel,

    toCSV: toCSV,
    downloadCSV: downloadCSV,
    isPreParsedCSV: isPreParsedCSV,

    splitSyllables: splitSyllables,
    identifyVowelNuclei: identifyVowelNuclei,
    tryCompoundSplit: tryCompoundSplit,
    tryStripSuffix: tryStripSuffix,

    VOWEL_TEAM_EXCEPTIONS: VOWEL_TEAM_EXCEPTIONS,
    DEFAULT_VOWEL_SOUND: DEFAULT_VOWEL_SOUND,
    SOUND_LABELS: SOUND_LABELS,
    soundForVowelTeam: soundForVowelTeam,
    vowelTeamSounds: vowelTeamSounds,    

    lookupException: lookupException,
    
    selfTest: function () {
      var rows = parseWords(['ship','catch','thump','stretch','clamp','shell','night','phone']);
      if (typeof console !== 'undefined') console.table(rows);
      return toCSV(rows, { extended: true });
    }
  };
});
