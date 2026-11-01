/**
 * lookup_name: people and places in the Pāli Canon (issue #32).
 *
 * Entries would come from Malalasekera's Dictionary of Pāli Proper Names (DPPN), bundled in
 * server/data/dppn.json. Its copyright status is not confirmed (see docs/sources.md), so the
 * bundled dataset ships with NO entries: the tool says so, links to the online editions, and
 * lists the texts of the bundled VRI canon whose Pāli contains the name. When permission
 * arrives, filling `entries` is the only change needed.
 *
 * Entry shape (server/data/dppn.json): { name, aliases?: [], kind?: 'person'|'place'|...,
 * text: verbatim entry, refs?: [citation strings that canon.resolve accepts], page?: string }
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as canon from './canon.mjs';

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

/**
 * Stem used to find the name in the Pāli text: drop a final vowel so inflected forms match
 * (Sāriputta → sariputt matches Sāriputto, Sāriputtassa). Short names are kept whole.
 */
export function nameStem(name) {
  const k = key(name);
  return k.length >= 5 ? k.replace(/[aiu]$/, '') : k;
}

function validateName(name) {
  const value = String(name ?? '').trim();
  if (!value || value.length > 100) throw new Error('Give one proper name (1–100 characters), for example Sāriputta, Anāthapiṇḍika or Sāvatthī.');
  if (key(value).length < 2) throw new Error('The name needs at least two letters.');
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

/** Texts in the bundled VRI canon whose Pāli contains the name's stem. */
export function appearsIn(name, limit = 10) {
  const stem = nameStem(name);
  if (stem.length < 2) return null;
  const found = canon.search(stem, { limit });
  return {
    searched: 'Pāli text of the VRI Chaṭṭha Saṅgāyana edition, for the name\'s stem (inflected forms included).',
    stem,
    caution: 'A word search, not a dictionary: it can include other people or places with the same name and miss irregular forms.',
    title_matches: found.title_matches.slice(0, limit).map(({ id, citation, title }) => ({ text_id: id, citation, title })),
    texts: found.results.map(({ id, citation, title, match_vri_paragraph }) => ({ text_id: id, citation, title, vri_paragraph: match_vri_paragraph })),
    total_texts_matched: found.total_texts_matched,
    attribution: canon.source().attribution,
  };
}

/** Look up a proper name. `data` defaults to the bundled dppn.json (tests pass a fixture). */
export function lookupName({ name, limit = 5, textLimit = 10 }, data = loadDppn()) {
  const value = validateName(name);
  const { source, entries = [] } = data;
  const dictionary = {
    name: source.name, author: source.author, edition: source.edition,
    status: entries.length ? 'bundled' : 'not-bundled',
    license: source.license, attribution: source.attribution,
  };
  const matches = matchEntries(entries, value, limit).map(describeEntry);
  const result = { name: value, dictionary, found: matches.length > 0, entries: matches };
  if (!entries.length) {
    result.note = `No dictionary entries are bundled. ${source.reason}`;
  } else if (!matches.length) {
    result.note = `No entry for "${value}" in the ${source.name}. Check the spelling (diacritics are optional) or try another form of the name.`;
  }
  if (source.read_online?.length) result.read_online = source.read_online;
  result.appears_in = appearsIn(value, textLimit);
  return result;
}

export function register({ tool, z }) {
  tool('lookup_name', 'Who or what is a name in the Pāli Canon (a person such as Sāriputta or Anāthapiṇḍika, a place such as Sāvatthī)? Returns the Dictionary of Pāli Proper Names entry when bundled (with attribution and licence), links to the online editions, and the texts of the bundled canon where the name appears. Works offline.', {
    name: z.string().min(1).max(100).describe('A proper name in Pāli, diacritics optional: Sāriputta, Anathapindika, Savatthi.'),
    limit: z.number().int().min(1).max(20).default(5).describe('Maximum dictionary entries.'),
    textLimit: z.number().int().min(1).max(50).default(10).describe('Maximum canon texts listed where the name appears.'),
  }, (args) => lookupName(args));
}
