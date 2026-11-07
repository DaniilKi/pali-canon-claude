/**
 * lookup_name: people and places in the Pāli Canon (issue #32).
 *
 * Entries would come from Malalasekera's Dictionary of Pāli Proper Names (DPPN), bundled in
 * server/data/dppn.json. Its copyright status is not confirmed (see docs/sources.md), so the
 * bundled dataset ships with NO entries: the tool says so, links to the online editions, and
 * lists canonical texts whose Pāli paragraphs or indexed titles match the name. When permission
 * arrives, filling `entries` is the only change needed.
 *
 * Entry shape (server/data/dppn.json): { name, aliases?: [], kind?: 'person'|'place'|...,
 * text: verbatim entry, refs?: [citation strings that canon.resolve accepts], page?: string }
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { romanizeLookupInput, inputNote } from './script.mjs';
import * as canon from './canon.mjs';
import { translationTitle } from './translation-titles.mjs';

let here;
try { here = __dirname; } catch { here = dirname(fileURLToPath(import.meta.url)); }

let cached = null;

/** Load server/data/dppn.json (cached). */
export function loadDppn() {
  if (cached) return cached;
  const name = 'dppn.json';
  const candidates = [join(here, 'data', name), join(here, '..', 'server', 'data', name), join(process.cwd(), 'server', 'data', name)];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('Bundled proper-names data (dppn.json) is missing. Reinstall the extension.');
  cached = JSON.parse(readFileSync(found, 'utf8'));
  return cached;
}

const key = (value) => canon.fold(value).replace(/[^a-z0-9]+/g, '');
/** The name's words, folded (diacritics dropped), e.g. 'Ajātasattu Vedehiputta' → ['ajatasattu', 'vedehiputta']. */
const words = (value) => canon.fold(value).split(/[^a-z0-9]+/).filter(Boolean);

/** One-word names of this many letters or fewer are matched as whole words (Uda, Nanda would otherwise match inside ānanda, udaka). */
export const MIN_STEM = 5;

/**
 * Stem of one word, used to find it in the Pāli text: drop a final vowel so inflected forms match
 * (Sāriputta → sariputt matches Sāriputto, Sāriputtassa). Short words are kept whole.
 */
function wordStem(word) {
  return word.length > MIN_STEM ? word.replace(/[aiu]$/, '') : word;
}

/** Stems of every word of the name, each searched separately (all must occur in the same paragraph). */
export function nameStems(name) {
  return words(name).map(wordStem);
}

/** The stems as one label, separated by spaces. */
export function nameStem(name) {
  return nameStems(name).join(' ');
}

// Case endings accepted after a word's base in whole-word mode, by the word's final vowel (folded: long vowels become short).
const ENDINGS = {
  a: ['a', 'am', 'o', 'e', 'ena', 'assa', 'aya', 'ato', 'asma', 'amha', 'asmim', 'amhi', 'ehi', 'ebhi', 'anam', 'ani', 'esu', 'esam'],
  i: ['i', 'im', 'ina', 'ino', 'inam', 'issa', 'ismim', 'ihi', 'isu', 'iyo', 'iya', 'iyam', 'iyo'],
  u: ['u', 'um', 'una', 'uno', 'ussa', 'usmim', 'uhi', 'unam', 'usu', 'avo'],
};
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** One matcher per word: the stem as a substring, or (whole-word mode) the word's base plus a case ending. */
function matchers(name, exactWord) {
  return words(name).map((word) => {
    if (!exactWord) {
      const stem = wordStem(word);
      return { stem, test: (text) => text.includes(stem) };
    }
    const vowel = word.length > 2 && /[aiu]$/.test(word) ? word.slice(-1) : null;
    const base = vowel ? word.slice(0, -1) : word;
    const endings = vowel ? ENDINGS[vowel] : [''];
    const re = new RegExp(`(?:^|[^a-z0-9])${escape(base)}(?:${endings.join('|')})(?![a-z0-9])`);
    return { stem: base, test: (text) => re.test(text) };
  });
}

function validateName(name) {
  const value = String(name ?? '').trim();
  if (!value || value.length > 100) throw new Error('Give one proper name (1–100 characters), for example Sāriputta, Anāthapiṇḍika or Sāvatthī.');
  if (key(value).length < 2) throw new Error('The name needs at least two letters.');
  if (words(value).length > 4) throw new Error('Give one proper name of at most four words, for example Ajātasattu Vedehiputta.');
  return value;
}

/** Match dictionary entries: exact name or alias first, then names that start with the query. */
export function matchEntries(entries, name, limit = 5) {
  const q = key(name);
  const keysOf = (e) => [e.name, ...(e.aliases || [])].map(key);
  const exact = entries.filter((e) => keysOf(e).includes(q));
  const prefix = entries.filter((e) => !exact.includes(e) && keysOf(e).some((k) => k.startsWith(q)));
  return [...exact, ...prefix].slice(0, limit);
}

function describeEntry(entry) {
  const references = [];
  for (const ref of entry.refs || []) {
    try {
      const { unit } = canon.resolve(ref);
      references.push({ cited: ref, text_id: unit.id, citation: unit.acronym, title: unit.title });
    } catch {
      references.push({ cited: ref, text_id: null, note: 'Citation as printed in the dictionary; it does not resolve in the bundled canon.' });
    }
  }
  return {
    name: entry.name, ...(entry.aliases?.length ? { aliases: entry.aliases } : {}), ...(entry.kind ? { kind: entry.kind } : {}),
    entry: entry.text, ...(entry.page ? { page: entry.page } : {}), references,
  };
}

const HEADINGS = new Set(['nikaya', 'book', 'chapter', 'title', 'subhead', 'subsubhead', 'centre', 'hangnum']);
const OPENING_PARAGRAPHS = 2;
const WHY = [
  'The name is in an indexed Pāli or English translation title.',
  'The name is in the opening paragraphs (the nidāna or first lines).',
  'The name is in the body of the text.',
];

/** The canon's search index (owner text and folded Pāli per paragraph), built once by canon.search. */
function searchIndex() {
  const d = canon.load();
  if (!d.search) canon.search('evam', { limit: 1 });
  return { d, s: d.search };
}

/**
 * Texts in the bundled VRI canon whose Pāli contains every word of the name in one paragraph, ranked:
 * name in the title first, then in the opening paragraphs (nidāna), then elsewhere; within each group,
 * texts that name it in more paragraphs first, then canon order.
 * A one-word name of MIN_STEM letters or fewer is matched as a whole word (with case
 * endings) unless `exactWord` is false; `exactWord: true` forces whole-word matching for every word.
 */
export function appearsIn(name, limit = 10, { exactWord } = {}) {
  const ws = words(name);
  if (!ws.length || key(name).length < 2) return null;
  const shortName = ws.length === 1 && ws[0].length <= MIN_STEM;
  const whole = exactWord ?? shortName;
  const ms = matchers(name, whole);
  const matches = (text) => ms.every((m) => m.test(text));
  const { d, s } = searchIndex();
  const hits = new Map();
  for (let bi = 0; bi < s.folded.length; bi += 1) {
    const blocks = s.folded[bi];
    const raw = d.canon.books[bi].blocks;
    for (let k = 0; k < blocks.length; k += 1) {
      if (!matches(blocks[k])) continue;
      const u = s.owner[bi][k];
      if (!u) continue;
      let hit = hits.get(u.id);
      if (!hit) {
        hit = { u, order: hits.size, paragraphs: 0, first: raw[k][1] || undefined, opening: false };
        hits.set(u.id, hit);
      }
      hit.paragraphs += 1;
      if (!hit.opening && !HEADINGS.has(raw[k][0])) {
        let n = 0;
        for (let i = u.start; i <= k; i += 1) if (!HEADINGS.has(raw[i][0])) n += 1;
        if (n <= OPENING_PARAGRAPHS) hit.opening = true;
      }
    }
  }
  // Titles: the Pāli title and English translation titles, not the citation (Ud 1.1 is not the name Uda).
  const titleMatches = [];
  const titleEvidence = new Map();
  for (const { u } of s.titles) {
    const evidence = [];
    if (u.title && matches(canon.fold(u.title))) evidence.push({ title: u.title, language: 'pali', source: d.canon.source.name });
    for (const link of d.translations[u.id] || []) {
      const title = translationTitle(link);
      if (title && matches(canon.fold(title))) evidence.push({ title, language: 'english', source: canon.sourceName(link),
        ...(link.translator ? { translator: link.translator } : {}) });
    }
    if (evidence.length) { titleMatches.push(u); titleEvidence.set(u.id, evidence); }
  }
  for (const u of titleMatches) if (!hits.has(u.id)) hits.set(u.id, { u, order: hits.size, paragraphs: 0, opening: false });
  const inTitle = new Set(titleMatches.map((u) => u.id));
  const tier = (h) => (inTitle.has(h.u.id) ? 0 : h.opening ? 1 : 2);
  const ranked = [...hits.values()].map((h) => ({ ...h, tier: tier(h) }))
    .sort((a, b) => a.tier - b.tier || b.paragraphs - a.paragraphs || a.order - b.order);
  return {
    searched: 'Pāli text of the VRI Chaṭṭha Saṅgāyana edition (every name word in one paragraph), and indexed Pāli and English translation titles (every word in one title).',
    stems: ms.map((m) => m.stem),
    match: whole ? 'whole word with a case ending' : 'stem (inflected forms and compounds included)',
    ...(shortName && exactWord === undefined ? { note: `One-word names of ${MIN_STEM} letters or fewer are matched as whole words; pass exactWord: false to match inside longer words.` } : {}),
    order: 'Ranked: name in a Pāli or English translation title first, then in the opening paragraphs (nidāna), then elsewhere; within each group, texts naming it in more paragraphs first.',
    caution: 'A word search, not a dictionary: it can include other people or places with the same name, or ordinary words spelt the same (ānanda also means joy), and miss irregular forms. A title hit can come from linked English-title metadata even when the Pāli body has no name match.',
    title_matches: titleMatches.slice(0, limit).map((u) => ({ text_id: u.id, citation: u.acronym, title: u.title, matched_titles: titleEvidence.get(u.id) })),
    texts: ranked.slice(0, limit).map((h) => ({
      text_id: h.u.id, citation: h.u.acronym, title: h.u.title, why: WHY[h.tier],
      ...(titleEvidence.has(h.u.id) ? { matched_titles: titleEvidence.get(h.u.id) } : {}),
      ...(h.paragraphs ? { paragraphs_naming_it: h.paragraphs } : {}), ...(h.first ? { vri_paragraph: h.first } : {}),
    })),
    total_texts_matched: hits.size,
    attribution: canon.source().attribution,
  };
}

/** Look up a proper name. `data` defaults to the bundled dppn.json (tests pass a fixture). */
export function lookupName({ name, limit = 5, textLimit = 10, exactWord }, data = loadDppn()) {
  const input = romanizeLookupInput(name);
  const value = validateName(input.text);
  const { source, entries = [] } = data;
  const dictionary = {
    name: source.name, author: source.author, edition: source.edition,
    status: entries.length ? 'bundled' : 'not-bundled',
    license: source.license, attribution: source.attribution,
  };
  const matches = matchEntries(entries, value, limit).map(describeEntry);
  const result = { name: value, ...inputNote(input), dictionary, found: matches.length > 0, entries: matches };
  if (!entries.length) {
    result.note = `No dictionary entries are bundled. ${source.reason}`;
  } else if (!matches.length) {
    result.note = `No entry for "${value}" in the ${source.name}. Check the spelling (diacritics are optional) or try another form of the name.`;
  }
  if (source.read_online?.length) result.read_online = source.read_online;
  result.appears_in = appearsIn(value, textLimit, { exactWord });
  return result;
}

export function register({ tool, z }) {
  tool('lookup_name', 'Who or what is a name in the Pāli Canon (a person such as Sāriputta or Anāthapiṇḍika, a place such as Sāvatthī)? Returns the Dictionary of Pāli Proper Names entry when bundled (with attribution and licence), links to the online editions, and matching Pāli passages or indexed Pāli/English titles from the bundled canon. Title matches identify the exact title, language and source; they are metadata, not dictionary entries. Works offline.', {
    name: z.string().min(1).max(100).describe('A proper name in Pāli, in Roman or a supported native script (conversion labelled). Diacritics optional in Roman: Sāriputta, Anathapindika, Savatthi.'),
    limit: z.number().int().min(1).max(20).default(5).describe('Maximum dictionary entries.'),
    textLimit: z.number().int().min(1).max(50).default(10).describe('Maximum canon texts listed where the name appears.'),
    exactWord: z.boolean().optional().describe('Match each word of the name as a whole word with a case ending. Default: only for one-word names of 5 letters or fewer. Use it to stop Ānanda matching inside compounds such as ānandajāta.'),
  }, (args) => lookupName(args));
}
