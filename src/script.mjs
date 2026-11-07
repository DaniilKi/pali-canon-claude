// Pāli transliteration between Roman (the VRI romanisation, ISO 15919 style) and
// the scripts in which Theravāda readers use the Canon: Sinhala, Thai, Myanmar
// (Burmese), Devanagari, Khmer, Lao and Lanna (Tai Tham).
//
// Written for this project from the Unicode code charts and the conventions of
// the VRI Chaṭṭha Saṅgāyana script editions, and MIT licensed like the rest of
// the server. No third-party transliterator is used or copied.
//
// Pāli has a small closed alphabet, so letters convert exactly both ways.
// Scripts have no letter case, so Roman output is lower case. Punctuation and
// digits follow each VRI edition (for example "." is । in Devanagari and ฯ in
// Thai). Lao and Lanna have no VRI edition at the pinned commit; they follow the
// Unicode Pāli conventions for those scripts and are tested by round trip only.

export const SCRIPTS = ['roman', 'sinhala', 'thai', 'myanmar', 'devanagari', 'khmer', 'lao', 'lanna'];

export const SCRIPT_NAMES = {
  roman: 'Roman (Latin with diacritics)',
  sinhala: 'Sinhala',
  thai: 'Thai',
  myanmar: 'Myanmar (Burmese)',
  devanagari: 'Devanagari',
  khmer: 'Khmer',
  lao: 'Lao',
  lanna: 'Lanna (Tai Tham)',
};

const ALIASES = {
  roman: 'roman', romn: 'roman', latn: 'roman', latin: 'roman', iast: 'roman', iso: 'roman',
  sinhala: 'sinhala', sinh: 'sinhala', si: 'sinhala', sinhalese: 'sinhala',
  thai: 'thai', th: 'thai',
  myanmar: 'myanmar', mymr: 'myanmar', burmese: 'myanmar', my: 'myanmar', burma: 'myanmar',
  devanagari: 'devanagari', deva: 'devanagari', hindi: 'devanagari', nagari: 'devanagari',
  khmer: 'khmer', khmr: 'khmer', km: 'khmer', cambodian: 'khmer',
  lao: 'lao', laoo: 'lao', laos: 'lao',
  lanna: 'lanna', lana: 'lanna', taitham: 'lanna', 'tai tham': 'lanna', tham: 'lanna', 'tai-tham': 'lanna', tai_tham: 'lanna',
};

/** Normalise a script name ('mymr', 'Burmese', 'Tai Tham', ...) to one of SCRIPTS, or throw. */
export function scriptName(name) {
  const key = String(name ?? '').trim().toLowerCase();
  const found = ALIASES[key];
  if (!found) throw new Error(`Unknown script "${name}". Available: ${SCRIPTS.join(', ')}.`);
  return found;
}

// Roman letters in the order the tokenizer must try them (aspirates first).
const CONSONANTS = ['kh', 'gh', 'ch', 'jh', 'ṭh', 'ḍh', 'th', 'dh', 'ph', 'bh',
  'k', 'g', 'ṅ', 'c', 'j', 'ñ', 'ṭ', 'ḍ', 'ṇ', 't', 'd', 'n', 'p', 'b', 'm', 'y', 'r', 'l', 'v', 's', 'h', 'ḷ'];
const VOWELS = ['a', 'ā', 'i', 'ī', 'u', 'ū', 'e', 'o'];
const C_ORDER = ['k', 'kh', 'g', 'gh', 'ṅ', 'c', 'ch', 'j', 'jh', 'ñ', 'ṭ', 'ṭh', 'ḍ', 'ḍh', 'ṇ', 't', 'th', 'd', 'dh', 'n',
  'p', 'ph', 'b', 'bh', 'm', 'y', 'r', 'l', 'v', 's', 'h', 'ḷ'];

const zip = (keys, chars) => Object.fromEntries(keys.map((k, i) => [k, chars[i]]));

// Each table has: consonants in C_ORDER (c), independent vowels (v) and vowel
// signs (s) in VOWELS order, the virama used inside clusters, the visible
// virama for a consonant with no vowel and nothing after it (final), the
// niggahita (m), digits 0-9, and the edition's punctuation:
//   stop      what "." becomes (not after a digit, where it stays ".")
//   abbr      the abbreviation mark VRI adds after "pe" in "…pe…" (peyyāla)
//   verseEnd  what ";" at the very end of a verse line becomes
//   stanzaEnd what the final "." of a stanza becomes (option { stanza: true })
//   ellipsis, comma  replacements for "…" and ","
// prefix: e and o are stored before their consonant (Thai, Lao).
const TABLES = {
  devanagari: {
    c: [...'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवसहळ'],
    v: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ओ'],
    s: ['', 'ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ो'],
    virama: '्', m: 'ं', digits: [...'०१२३४५६७८९'],
    stop: '।', abbr: '॰', verseEnd: '।', stanzaEnd: '॥',
    // VRI writes a zero-width joiner after the virama in these clusters.
    zwj: ['kk', 'kl', 'kv', 'cc', 'jj', 'ñc', 'ñj', 'ññ', 'nn', 'pl', 'll'],
  },
  sinhala: {
    c: [...'කඛගඝඞචඡජඣඤටඨඩඪණතථදධනපඵබභමයරලවසහළ'],
    v: ['අ', 'ආ', 'ඉ', 'ඊ', 'උ', 'ඌ', 'එ', 'ඔ'],
    s: ['', 'ා', 'ි', 'ී', 'ු', 'ූ', 'ෙ', 'ො'],
    virama: '්', m: 'ං', digits: null,
    abbr: '.',
    // VRI writes ZWJ before y and r (yansaya, rakaransaya) and ZWNJ in every other cluster.
    joiner: (a, b) => (b === 'y' || b === 'r' ? '\u200d' : '\u200c'),
  },
  thai: {
    c: [...'กขคฆงจฉชฌญฏฐฑฒณตถทธนปผพภมยรลวสหฬ'],
    v: ['อ', 'อา', 'อิ', 'อี', 'อุ', 'อู', 'เอ', 'โอ'],
    s: ['', 'า', 'ิ', 'ี', 'ุ', 'ู', 'เ', 'โ'],
    virama: 'ฺ', m: 'ํ', digits: [...'๐๑๒๓๔๕๖๗๘๙'], prefix: true,
    stop: 'ฯ', abbr: '.',
  },
  myanmar: {
    c: [...'ကခဂဃငစဆဇဈဉဋဌဍဎဏတထဒဓနပဖဗဘမယရလဝသဟဠ'],
    v: ['အ', 'အာ', 'ဣ', 'ဤ', 'ဥ', 'ဦ', 'ဧ', 'ဩ'],
    s: ['', 'ာ', 'ိ', 'ီ', 'ု', 'ူ', 'ေ', 'ော'],
    virama: '္', final: '်', m: 'ံ', digits: [...'၀၁၂၃၄၅၆၇၈၉'],
    stop: '။', abbr: '.', verseEnd: '။', ellipsis: '။', comma: '၊',
    // Stacks VRI writes as one letter, a medial or kinzi (applied in this order).
    ligatures: [['သ္သ', 'ဿ'], ['ဉ္ဉ', 'ည'], ['္ယ', 'ျ'], ['္ရ', 'ြ'], ['္ဝ', 'ွ'], ['္ဟ', 'ှ'], ['င္', 'င်္']],
    extraIndependent: { 'ဦ': 'ū', 'ဪ': 'o' },
  },
  khmer: {
    c: [...'កខគឃងចឆជឈញដឋឌឍណតថទធនបផពភមយរលវសហឡ'],
    v: ['អ', 'អា', 'ឥ', 'ឦ', 'ឧ', 'ឩ', 'ឯ', 'ឱ'],
    s: ['', 'ា', 'ិ', 'ី', 'ុ', 'ូ', 'េ', 'ោ'],
    virama: '្', final: '៑', m: 'ំ', digits: [...'០១២៣៤៥៦៧៨៩'],
    stop: '។', abbr: '.',
    extraIndependent: { 'ឨ': 'ū' },
  },
  lao: {
    // Lao with the Pāli letters added in Unicode 12 (U+0E86-U+0EAC) and the Pāli virama U+0EBA.
    c: ['ກ', 'ຂ', 'ຄ', 'ຆ', 'ງ', 'ຈ', 'ຉ', 'ຊ', 'ຌ', 'ຎ', 'ຏ', 'ຐ', 'ຑ', 'ຒ', 'ຓ', 'ຕ', 'ຖ', 'ທ', 'ຘ', 'ນ',
      'ປ', 'ຜ', 'ພ', 'ຠ', 'ມ', 'ຍ', 'ຣ', 'ລ', 'ວ', 'ສ', 'ຫ', 'ຬ'],
    v: ['ອ', 'ອາ', 'ອິ', 'ອີ', 'ອຸ', 'ອູ', 'ເອ', 'ໂອ'],
    s: ['', 'າ', 'ິ', 'ີ', 'ຸ', 'ູ', 'ເ', 'ໂ'],
    virama: '຺', m: 'ໍ', digits: [...'໐໑໒໓໔໕໖໗໘໙'], prefix: true,
  },
  lanna: {
    // Tai Tham is stored in logical order; sakot (U+1A60) stacks clusters and
    // the visible asat (U+1A7A) marks a consonant with no vowel.
    c: ['ᨠ', 'ᨡ', 'ᨣ', 'ᨥ', 'ᨦ', 'ᨧ', 'ᨨ', 'ᨩ', 'ᨫ', 'ᨬ', 'ᨭ', 'ᨮ', 'ᨯ', 'ᨰ', 'ᨱ', 'ᨲ', 'ᨳ', 'ᨴ', 'ᨵ', 'ᨶ',
      'ᨷ', 'ᨹ', 'ᨻ', 'ᨽ', 'ᨾ', 'ᨿ', 'ᩁ', 'ᩃ', 'ᩅ', 'ᩈ', 'ᩉ', 'ᩊ'],
    v: ['ᩋ', 'ᩋᩣ', 'ᩍ', 'ᩎ', 'ᩏ', 'ᩐ', 'ᩑ', 'ᩒ'],
    s: ['', 'ᩣ', 'ᩥ', 'ᩦ', 'ᩩ', 'ᩪ', 'ᩮ', 'ᩮᩣ'],
    virama: '᩠', final: '᩺', m: 'ᩴ', digits: [...'᪐᪑᪒᪓᪔᪕᪖᪗᪘᪙'],
    extraIndependent: { 'ᩌ': 'ā' },
    extraSigns: { 'ᩤ': 'ā', 'ᩰ': 'o' },
    // Subjoined letters and the great sa some Lanna texts use; accepted on input.
    expand: [['ᩕ', '᩠ᩁ'], ['ᩖ', '᩠ᩃ'], ['ᩔ', 'ᩈ᩠ᩈ']],
  },
};

// Myanmar: VRI writes the tall ā (ါ, also in o ေါ) after ခ ဂ ပ ဝ, whether
// alone or at the foot of a stack, and after the stack ဒ္ဓ; never after a medial.
const MYMR_TALL = /([ခဂပဝ]|ဒ္ဓ)(ေ?)ာ/g;

for (const t of Object.values(TABLES)) {
  t.cons = zip(C_ORDER, t.c);
  t.ind = zip(VOWELS, t.v);
  t.sign = zip(VOWELS, t.s);
  t.zwj = new Set(t.zwj ?? []);
}

const ROMAN_TOKENS = [...CONSONANTS, ...VOWELS, 'ṃ'];
const PE = '\uE000'; // private-use marks used only inside one conversion
const STOP = '\uE001';
const STANZA = '\uE002';

function* romanTokens(s) {
  for (let i = 0; i < s.length;) {
    let tok = null;
    for (const t of ROMAN_TOKENS) if (s.startsWith(t, i)) { tok = t; break; }
    if (tok) {
      yield { kind: tok === 'ṃ' ? 'm' : VOWELS.includes(tok) ? 'v' : 'c', tok };
      i += tok.length;
    } else {
      // Other romanisations write the niggahita as ṁ or ŋ.
      if (s[i] === 'ṁ' || s[i] === 'ŋ') yield { kind: 'm', tok: 'ṃ' };
      else yield { kind: 'o', tok: s[i] };
      i += 1;
    }
  }
}

// Roman punctuation as each VRI edition prints it.
function romanPunctuation(s, t, stanza) {
  if (stanza && t.stanzaEnd) s = s.replace(/\.(\)?\s*)$/, `${STANZA}$1`);
  if (t.abbr) {
    s = s.replace(/…(\s*)(pe)…/gi, `…$1$2${PE}…`);
    // An abbreviation ("sī. syā. kaṃ.", "dī. ni. 3.36") is followed by a lower-case word or
    // a number, or is a short word closing a bracket; a sentence ends before a capital, a
    // quote mark or the end of the text.
    s = s.replace(/(?<=(?:^|[\s(.])\p{Ll}{1,6})\.(?=\s*[\p{Ll}\d)])/gu, PE);
  }
  if (t.stop) s = s.replace(/(?<![0-9])\./g, STOP);
  if (t.verseEnd) s = s.replace(/;(\s*)$/, `${STOP}$1`);
  return s;
}

function fromRoman(text, script, stanza) {
  const t = TABLES[script];
  const s = romanPunctuation(text.normalize('NFC'), t, stanza).toLowerCase();
  let out = '';
  let pending = null; // Roman consonant written without a vowel yet
  let consStart = -1; // where that consonant begins in `out`
  for (const { kind, tok } of romanTokens(s)) {
    if (kind === 'c') {
      if (pending) {
        out += t.virama;
        if (t.zwj.has(pending + tok)) out += '\u200d';
        else if (t.joiner) out += t.joiner(pending, tok);
      }
      consStart = out.length;
      out += t.cons[tok];
      pending = tok;
    } else if (kind === 'v') {
      if (pending) {
        const sign = t.sign[tok];
        if (t.prefix && (tok === 'e' || tok === 'o')) out = out.slice(0, consStart) + sign + out.slice(consStart);
        else out += sign;
        pending = null;
      } else {
        out += t.ind[tok];
      }
    } else {
      if (pending) { out += t.final ?? t.virama; pending = null; }
      if (kind === 'm') out += t.m;
      else if (tok >= '0' && tok <= '9') out += t.digits ? t.digits[tok.charCodeAt(0) - 48] : tok;
      else if (tok === PE) out += t.abbr;
      else if (tok === STOP) out += t.stop;
      else if (tok === STANZA) out += t.stanzaEnd;
      else if (tok === '…' && t.ellipsis) out += t.ellipsis;
      else if (tok === ',' && t.comma) out += t.comma;
      else out += tok;
    }
  }
  if (pending) out += t.final ?? t.virama;
  if (t.ligatures) for (const [a, b] of t.ligatures) out = out.split(a).join(b);
  if (script === 'myanmar') out = out.replace(MYMR_TALL, '$1$2ါ');
  return out;
}

// Reverse tables, built once per script.
const REVERSE = {};
function reverse(script) {
  if (REVERSE[script]) return REVERSE[script];
  const t = TABLES[script];
  const cons = new Map(C_ORDER.map((r) => [t.cons[r], r]));
  const carrier = t.ind.a; // in several scripts independent vowels are a + vowel sign
  cons.set(carrier, '');
  const ind = new Map();
  for (const r of VOWELS) if (r !== 'a' && !t.ind[r].startsWith(carrier)) ind.set(t.ind[r], r);
  for (const [k, v] of Object.entries(t.extraIndependent ?? {})) ind.set(k, v);
  const signs = new Map(VOWELS.filter((r) => t.sign[r] && !(t.prefix && (r === 'e' || r === 'o'))).map((r) => [t.sign[r], r]));
  for (const [k, v] of Object.entries(t.extraSigns ?? {})) signs.set(k, v);
  const punct = new Map();
  if (t.stop) punct.set(t.stop, '.');
  if (t.stanzaEnd) punct.set(t.stanzaEnd, '.');
  if (t.abbr) punct.set(t.abbr, '.');
  if (t.ellipsis) punct.set(t.ellipsis, '.');
  if (t.comma) punct.set(t.comma, ',');
  if (t.digits) t.digits.forEach((d, i) => punct.set(d, String(i)));
  const expand = [...(t.expand ?? [])];
  if (t.ligatures) for (const [a, b] of [...t.ligatures].reverse()) expand.push([b, a]);
  if (script === 'myanmar') expand.push(['ါ', 'ာ']);
  const byLength = (m) => [...m.keys()].sort((a, b) => b.length - a.length);
  const prefixes = t.prefix ? new Map([[t.sign.e, 'e'], [t.sign.o, 'o']]) : new Map();
  return (REVERSE[script] = { t, cons, ind, signs, signList: byLength(signs), indList: byLength(ind), punct, expand, prefixes });
}

function toRomanFrom(text, script) {
  const R = reverse(script);
  const { t } = R;
  let s = text.normalize('NFC').replace(/[\u200c\u200d]/g, '');
  for (const [a, b] of R.expand) s = s.split(a).join(b);
  const at = (i, list) => list.find((x) => s.startsWith(x, i));
  let out = '';
  for (let i = 0; i < s.length;) {
    let prefix = null;
    if (R.prefixes.has(s[i]) && R.cons.has(s[i + 1])) { prefix = R.prefixes.get(s[i]); i += 1; }
    const c = s[i];
    if (R.cons.has(c)) {
      out += R.cons.get(c);
      i += 1;
      if (prefix) out += prefix;
      else if (s[i] === t.virama || (t.final && s[i] === t.final)) i += 1;
      else {
        const sign = at(i, R.signList);
        if (sign) { out += R.signs.get(sign); i += sign.length; } else out += 'a';
      }
      continue;
    }
    const v = at(i, R.indList);
    if (v) { out += R.ind.get(v); i += v.length; continue; }
    if (c === t.m) { out += 'ṃ'; i += 1; continue; }
    out += R.punct.get(c) ?? c;
    i += 1;
  }
  // "…pe…" (peyyāla): the editions add an abbreviation mark after pe.
  if (t.abbr) out = out.replace(/[.…](\s*)pe\.[.…]/g, '…$1pe…');
  return out;
}

const RANGES = [
  ['devanagari', 0x0900, 0x097f], ['sinhala', 0x0d80, 0x0dff], ['thai', 0x0e00, 0x0e7f], ['lao', 0x0e80, 0x0eff],
  ['myanmar', 0x1000, 0x109f], ['khmer', 0x1780, 0x17ff], ['lanna', 0x1a20, 0x1aaf],
];

/** The script most letters of `text` are written in ('roman' when none of the others). */
export function detectScript(text) {
  const counts = {};
  for (const ch of String(text ?? '')) {
    const cp = ch.codePointAt(0);
    if (cp < 0x0900) continue;
    for (const [name, lo, hi] of RANGES) if (cp >= lo && cp <= hi) { counts[name] = (counts[name] ?? 0) + 1; break; }
  }
  let best = 'roman';
  let n = 0;
  for (const [name, c] of Object.entries(counts)) if (c > n) { best = name; n = c; }
  return best;
}

/**
 * Transliterate Pāli text between scripts. `from` may be 'auto' (detect).
 * Names or codes are accepted (see scriptName). Roman output is lower case.
 * Option `stanza`: the text ends a verse, so a final "." is written as the
 * edition's stanza mark (॥ in Devanagari).
 */
export function transliterate(text, from, to, { stanza = false } = {}) {
  if (text == null) return text;
  const s = String(text);
  const a = from === 'auto' ? detectScript(s) : scriptName(from);
  const b = scriptName(to);
  if (a === b) return s;
  const roman = a === 'roman' ? s : toRomanFrom(s, a);
  return b === 'roman' ? roman : fromRoman(roman, b, stanza);
}

/** Text in any supported script, converted to Roman; Roman input is returned unchanged. */
export function toRoman(text) {
  const s = String(text ?? '');
  const script = detectScript(s);
  return script === 'roman' ? s : toRomanFrom(s, script);
}

// ---------------------------------------------------------------------------
// MCP integration: the `script` option of resolve_reference, get_text and
// search_texts, and input in any script. The Pāli is always the VRI Roman
// edition transliterated by this module; IDs, citations, English and
// collection names stay in Roman.

/** Values accepted by the `script` tool parameter. */
export const SCRIPT_CHOICES = SCRIPTS;
export const SCRIPT_DESCRIPTION = 'Write the Pāli in this script: roman (default), sinhala, thai, myanmar, devanagari, khmer, lao or lanna (Tai Tham). Citations, IDs and English stay in Roman.';

/** Convert user input (a citation, link or search query) written in any supported script to Roman. */
export function romanizeInput(text) {
  const s = String(text ?? '');
  const script = detectScript(s);
  if (script === 'roman') return { text: s, script };
  return { text: toRomanFrom(s, script).normalize('NFC'), script, original: s };
}

/** Label converted native input while leaving Roman input unlabelled, independent of output script. */
export function inputNote(input) {
  return input?.original ? { input_script: input.script, input_romanized: input.text } : {};
}

function scriptNote(script) {
  return {
    script,
    script_note: `Pāli transliterated into ${SCRIPT_NAMES[script]} by this server from the VRI Roman edition (exact letter-for-letter; punctuation follows VRI's own script editions where they exist). Citations, IDs and English are left in Roman.`,
  };
}

const pali = (text, script, opts) => (typeof text === 'string' && text ? transliterate(text, 'roman', script, opts) : text);

function verse(text, script) {
  const lines = text.split('\n');
  return lines.map((line, i) => pali(line, script, { stanza: i === lines.length - 1 })).join('\n');
}

function localizeUnitFields(obj, script) {
  const out = { ...obj };
  if (typeof out.title === 'string') { out.title_roman = out.title; out.title = pali(out.title, script); }
  if (typeof out.vri_book === 'string') out.vri_book = pali(out.vri_book, script);
  if (typeof out.excerpt === 'string') out.excerpt = pali(out.excerpt, script);
  return out;
}

/** resolve_reference / get_metadata result in `script` (undefined or 'roman' leaves it unchanged). */
export function localizeDescribe(result, script, input) {
  const s = script ? scriptName(script) : 'roman';
  if (s === 'roman') return { ...result, ...inputNote(input) };
  const out = localizeUnitFields(result, s);
  if (Array.isArray(out.also_on_that_page)) out.also_on_that_page = out.also_on_that_page.map((a) => localizeUnitFields(a, s));
  if (Array.isArray(out.members)) out.members = out.members.map((m) => (m && typeof m === 'object' ? localizeUnitFields(m, s) : m));
  return { ...out, ...scriptNote(s), ...inputNote(input) };
}

/** get_text result in `script`: segment text (verses line by line), variant readings and title. */
export function localizeText(result, script, input) {
  const s = script ? scriptName(script) : 'roman';
  if (s === 'roman') return { ...result, ...inputNote(input) };
  const out = localizeUnitFields(result, s);
  out.segments = (result.segments ?? []).map((seg) => {
    const x = { ...seg };
    if (typeof x.text === 'string') x.text = x.type === 'verse' ? verse(x.text, s) : pali(x.text, s);
    if (Array.isArray(x.variant_readings)) x.variant_readings = x.variant_readings.map((v) => pali(v, s));
    // Structured variants (get_text variants: "structured"): the Pāli of each note in `script`; sigla stay as legend keys.
    if (Array.isArray(x.variants)) x.variants = x.variants.map((v) => ({
      ...v,
      raw: pali(v.raw, s),
      readings: (v.readings ?? []).map((r) => ({ ...r, reading: pali(r.reading, s) })),
      omissions: (v.omissions ?? []).map((o) => ({ ...o, text: pali(o.text, s) })),
      remarks: (v.remarks ?? []).map((r) => pali(r, s)),
    }));
    return x;
  });
  if (Array.isArray(result.pali_opening)) out.pali_opening = result.pali_opening;
  return { ...out, ...scriptNote(s), ...inputNote(input) };
}

/** search_texts result in `script`: titles and excerpts. */
export function localizeSearch(result, script, input) {
  const s = script ? scriptName(script) : 'roman';
  if (s === 'roman') return { ...result, ...inputNote(input) };
  const out = { ...result };
  if (Array.isArray(out.results)) out.results = out.results.map((r) => localizeUnitFields(r, s));
  if (Array.isArray(out.title_matches)) out.title_matches = out.title_matches.map((r) => localizeUnitFields(r, s));
  return { ...out, ...scriptNote(s), ...inputNote(input) };
}

/** get_text commentary: true: the commentary's segments and title in `script`, by the same rules as the canon segments. */
export function localizeCommentary(commentary, script, input) {
  const s = script ? scriptName(script) : 'roman';
  if (!commentary) return commentary;
  if (s === 'roman') return { ...commentary, ...inputNote(input) };
  const out = localizeText(commentary, s, input);
  // A catalogue or an unavailable alignment is not an empty page of commentary.
  if (!Array.isArray(commentary.segments)) delete out.segments;
  if (out.book) out.book = localizeUnitFields(out.book, s);
  if (Array.isArray(out.books)) out.books = out.books.map((book) => localizeUnitFields(book, s));
  return out;
}

/**
 * Post-canonical results (resolve_reference fallback, search_texts post_canonical): titles, chapter names and
 * excerpts in `script`; citations and IDs stay Roman.
 */
export function localizePostCanonical(result, script, input) {
  const s = script ? scriptName(script) : 'roman';
  if (s === 'roman' || !result) return result && { ...result, ...inputNote(input) };
  const named = (obj, key) => (typeof obj[key] === 'string' ? { [`${key}_roman`]: obj[key], [key]: pali(obj[key], s) } : {});
  const out = { ...result, ...named(result, 'title') };
  if (out.book && typeof out.book === 'object') out.book = { ...out.book, ...named(out.book, 'title') };
  if (Array.isArray(out.results)) {
    out.results = out.results.map((r) => ({
      ...r, ...named(r, 'book_title'),
      ...(typeof r.chapter === 'string' ? { chapter: pali(r.chapter, s) } : {}),
      ...(typeof r.excerpt === 'string' ? { excerpt: pali(r.excerpt, s) } : {}),
    }));
  }
  return { ...out, ...scriptNote(s), ...inputNote(input) };
}
