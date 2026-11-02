/**
 * Parallels and cross-references (issue #29, D59), built from the bundled VRI canon and commentary by
 * scripts/parallels/build.mjs into server/data/parallels.json.gz. Loaded lazily; works offline.
 *
 * Two sources, and every link names its own:
 *  - 'commentary-citation': the commentary (Aṭṭhakathā) on one text cites another, by VRI's own bracketed
 *    reference checked against the quotation, or by naming a sutta whose title is unique. The commentary
 *    passage is given as a get_commentary ref, with the words that make the citation.
 *  - 'shared-passage': two canonical texts share a passage word for word (stock formulae excluded), with
 *    the segment refs of the shared passage in each and a similarity score.
 *
 * SuttaCentral's parallels are linked, never fetched or bundled.
 */
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as canon from './canon.mjs';

let here;
try { here = __dirname; } catch { here = dirname(fileURLToPath(import.meta.url)); }

const FILE = 'parallels.json.gz';
export const SOURCES = ['commentary-citation', 'shared-passage'];
export const MATCH = {
  'vri-reference+quotation': "VRI's own reference in the commentary (book, volume and VRI paragraph), confirmed by finding the quoted words in the cited paragraph",
  'vri-reference': "VRI's own reference in the commentary (book, volume and VRI paragraph); there is no quotation to check. Never used for SN or AN",
  'sutta-name': 'the commentary names the sutta, and the name is the title of exactly one canonical text',
  'sutta-name+nikaya': 'the commentary names the sutta and its Nikāya, and the name is the title of exactly one text in that Nikāya',
  'shared-word-sequences': 'the two texts share runs of 8 or more words, word for word (diacritics and case ignored); runs found in more than 4 texts are treated as stock formulae and ignored',
};

let data = null;
let index = null;

function dataPath() {
  const candidates = [join(here, 'data', FILE), join(here, '..', 'server', 'data', FILE), join(process.cwd(), 'server', 'data', FILE)];
  return candidates.find((p) => existsSync(p)) || null;
}

/** Load the parallels data once. Returns null when the data file is not installed. */
export function load() {
  if (data) return data;
  const path = dataPath();
  if (!path) return null;
  data = JSON.parse(gunzipSync(readFileSync(path)).toString('utf8'));
  index = new Map();
  const add = (id, entry) => (index.get(id) || index.set(id, []).get(id)).push(entry);
  data.citations.forEach((l, i) => { add(l.from, ['out', i]); add(l.to, ['in', i]); });
  data.shared.forEach((l, i) => { add(l.a, ['a', i]); add(l.b, ['b', i]); });
  return data;
}

function textInfo(id) {
  const u = canon.load().byId.get(id);
  return u ? { id: u.id, citation: u.acronym, title: u.title || null } : { id, citation: id, title: null };
}

function citationLink(l, dir) {
  const other = dir === 'out' ? l.to : l.from;
  return {
    source: 'commentary-citation',
    relation: dir === 'out' ? `The commentary on this text cites ${textInfo(l.to).citation}` : `The commentary on ${textInfo(l.from).citation} cites this text`,
    text: textInfo(other),
    match: l.match,
    how_matched: MATCH[l.match],
    commentary: {
      on: textInfo(l.from), work: l.work, passage_ref: l.commentary_ref,
      read_with: { tool: 'get_commentary', uid: l.from },
      label: 'Commentary (Aṭṭhakathā), not the canon',
    },
    evidence: l.evidence,
    ...(l.vri_reference ? { vri_reference: l.vri_reference, cited: l.cited } : {}),
    ...(l.named ? { named: l.named } : {}),
    ...(l.quotation_found ? { quotation_found: l.quotation_found } : {}),
    ...(l.target_segment ? { cited_segment: l.target_segment } : {}),
  };
}

function sharedLink(l, side) {
  const mine = side === 'a' ? 'a' : 'b';
  const theirs = side === 'a' ? 'b' : 'a';
  return {
    source: 'shared-passage',
    relation: 'Shares a passage word for word with this text',
    text: textInfo(l[theirs]),
    match: 'shared-word-sequences',
    how_matched: MATCH['shared-word-sequences'],
    score: l.score,
    shared_words: l.shared_words,
    longest_run_words: l.longest_run_words,
    coverage: { this_text: l[`${mine}_coverage`], other_text: l[`${theirs}_coverage`] },
    this_segments: l[`${mine}_segments`],
    other_segments: l[`${theirs}_segments`],
    ...(l[`${mine}_segment_count`] > l[`${mine}_segments`].length || l[`${theirs}_segment_count`] > l[`${theirs}_segments`].length
      ? { segments_truncated: { this_text: l[`${mine}_segment_count`], other_text: l[`${theirs}_segment_count`] } } : {}),
  };
}

// Shared passages first (largest first), then what this text's commentary cites, then what cites this text.
const ORDER = { a: 0, b: 0, out: 1, in: 2 };

/** All links of a resolved unit (a grouped range also gets its members' links), in a stable order. */
export function linksOf(unit) {
  const d = load();
  if (!d) return null;
  const ids = [unit.id, ...(unit.members || [])];
  const entries = [];
  const seen = new Set();
  for (const id of ids) for (const e of index.get(id) || []) {
    const k = e.join(':');
    if (!seen.has(k)) { seen.add(k); entries.push(e); }
  }
  const links = entries.map(([dir, i]) => ({ dir, link: dir === 'out' || dir === 'in' ? citationLink(d.citations[i], dir) : sharedLink(d.shared[i], dir) }));
  links.sort((x, y) => ORDER[x.dir] - ORDER[y.dir]
    || (y.link.shared_words || 0) - (x.link.shared_words || 0)
    || (x.link.text.id < y.link.text.id ? -1 : x.link.text.id > y.link.text.id ? 1 : 0)
    || String(x.link.commentary?.passage_ref || '').localeCompare(String(y.link.commentary?.passage_ref || '')));
  return links.map((x) => x.link);
}

function sourceInfo(d) {
  const { name, builder, inputs, attribution, terms } = d.source;
  return { name, builder, inputs, attribution, terms };
}

/** Parallels and cross-references of a text: resolves any citation, paginated by link. */
export function getParallels(uid, { offset = 0, limit = 25 } = {}) {
  const { unit, notes } = canon.resolve(uid);
  const base = { text_id: unit.id, citation: unit.acronym, title: unit.title || null };
  const suttacentral = {
    url: `https://suttacentral.net/${unit.id}`,
    note: 'SuttaCentral lists parallels in other Buddhist traditions (Chinese, Sanskrit, Tibetan). Link only: its content is not fetched or bundled, at its request.',
  };
  const d = load();
  if (!d) {
    return { ...base, available: false, links: [], suttacentral_parallels: suttacentral, notes: [...notes, 'The parallels data file (parallels.json.gz) is not installed with this copy of the server. Reinstall to use this tool.'] };
  }
  const all = linksOf(unit);
  const page = all.slice(offset, offset + limit);
  const counts = { 'commentary-citation': 0, 'shared-passage': 0 };
  for (const l of all) counts[l.source]++;
  const extra = [];
  if (!all.length) extra.push(`No parallel or cross-reference is recorded for ${unit.acronym}. Only links with clear evidence are kept, so this does not mean the text has none: see SuttaCentral (link below) for parallels in other traditions, or search_texts for a phrase.`);
  if (unit.approximate) extra.push(`${unit.acronym} is abbreviated (peyyāla) in the VRI edition, so shared passages are found only in the words that are printed.`);
  return {
    ...base, available: true,
    total: all.length, counts, offset, limit, returned: page.length,
    next_offset: offset + page.length < all.length ? offset + page.length : null,
    links: page,
    suttacentral_parallels: suttacentral,
    notes: [...notes, ...extra,
      'Every link names its source. commentary-citation: the traditional commentary (not the canon) cites the other text; read the passage with get_commentary. shared-passage: the two canonical texts share wording, found by machine; read both with get_text at the segment refs given.',
      'No link is better than a wrong link: ambiguous references are left out, and SN and AN texts are never linked by number alone.'],
    match_types: MATCH,
    source: sourceInfo(d),
  };
}

/** Feature registration (src/features/index.mjs). */
export function register({ tool, z, citation }) {
  tool('get_parallels', 'Find parallels and cross-references for a text, built offline from the bundled VRI edition: (1) other canonical texts the traditional commentary (Aṭṭhakathā) cites when explaining this one, or that cite it, each with the commentary passage and the words that make the citation; (2) other canonical texts that share a passage with it word for word, with the segment refs on both sides and a similarity score (stock formulae left out). Every link states its source and how it was matched; ambiguous references are left out. Also gives the SuttaCentral link for parallels in other traditions (link only). Paginated. Works offline.', {
    uid: citation,
    limit: z.number().int().min(1).max(100).default(25).describe('Links per page.'),
    offset: z.number().int().min(0).max(100000).default(0).describe('Link offset for continuation.'),
  }, ({ uid, limit, offset }) => getParallels(uid, { offset, limit }));
}
