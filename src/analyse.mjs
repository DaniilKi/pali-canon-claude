/**
 * analyse_passage: word-by-word analysis of a passage of the bundled Pāli text (issues #22 and #23).
 *
 * Every word is looked up in a compact, offline subset of the Digital Pāḷi Dictionary (DPD),
 * server/data/dpd.json.gz, built by scripts/dpd/build_dpd.py from DPD's own pinned release
 * (version, asset URL and SHA-256 are in the file's `source`). Nothing is generated: the split,
 * headword, grammar, root and meaning all come from DPD, and a word DPD does not know is reported
 * as unknown. DPD lists every possible parse of an inflected form; choosing between them needs the
 * context, so all are returned. The same data answers lookup_pali when dpdict.net is unreachable.
 *
 * Licence: DPD is CC BY-NC-SA 4.0 (Bodhirasa Bhikkhu). The notice and attribution are returned
 * with every result.
 */
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as canon from './canon.mjs';

let here;
try { here = __dirname; } catch { here = dirname(fileURLToPath(import.meta.url)); }

export const DPD_LICENSE = {
  name: 'CC BY-NC-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  note: 'Non-commercial use only. Derivatives must be shared alike under the same licence, crediting Bodhirasa Bhikkhu and the Digital Pāḷi Dictionary.',
};

/** The pinned DPD release behind server/data/dpd.json.gz (scripts/audit.mjs checks that they agree). */
export const DPD_PIN = {
  version: 'v0.4.20261026',
  release: 'https://github.com/digitalpalidictionary/dpd-db/releases/tag/v0.4.20261026',
  asset: 'https://github.com/digitalpalidictionary/dpd-db/releases/download/v0.4.20261026/dpd.db.tar.xz',
  asset_sha256: '62a3f55d285ae27f5e1d15492cd7bfa92e9e66a0b6bfed9ea97b58a28e346f49',
  doi: '10.5281/zenodo.22979413',
  attribution: 'Digital Pāḷi Dictionary by Bodhirasa Bhikkhu, v0.4.20261026, CC BY-NC-SA 4.0 (https://www.dpdict.net/)',
};

let cached = null;

/** Load server/data/dpd.json.gz once and index it. */
export function loadDpd() {
  if (cached) return cached;
  const name = 'dpd.json.gz';
  const candidates = [join(here, 'data', name), join(here, '..', 'server', 'data', name), join(process.cwd(), 'server', 'data', name)];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('Bundled dictionary data (dpd.json.gz) is missing. Reinstall the extension.');
  const data = JSON.parse(gunzipSync(readFileSync(found)).toString('utf8'));
  const headwords = new Map();
  const lemmas = new Map();
  const folded = new Map();
  const add = (map, key, id) => { const list = map.get(key); if (list) list.push(id); else map.set(key, [id]); };
  for (const [id, lemma, pos, grammar, meaning, root, construction, plusCase] of data.headwords) {
    const clean = cleanLemma(lemma);
    headwords.set(id, { id, lemma, clean, pos, grammar, meaning, root, construction, plusCase });
    add(lemmas, clean, id);
    add(folded, canon.fold(clean), id);
  }
  cached = { source: data.source, roots: data.roots, forms: data.forms, headwords, lemmas, folded };
  return cached;
}

/** "dhamma 1.01" → "dhamma" (DPD numbers homonyms and senses after the word). */
export const cleanLemma = (lemma) => String(lemma ?? '').replace(/\s+\d+(?:\.\d+)?$/, '');

/** Licence notice returned with every result that contains DPD data. */
export function dpdNotice() {
  const { source } = loadDpd();
  return {
    dictionary: {
      name: source.name, version: source.version, release: source.release, asset_sha256: source.asset_sha256,
      doi: source.doi, citation: source.citation, website: source.website, subset: source.subset,
    },
    attribution: source.attribution,
    license: { ...DPD_LICENSE, attribution: source.attribution },
  };
}

// Tokeniser: keep in step with tokens() and parts() in scripts/dpd/build_dpd.py.
const LETTERS = 'a-zA-ZāīūṅñṭḍṇḷṃṁĀĪŪṄÑṬḌṆḶṂṀ';
const TOKEN = new RegExp(`[${LETTERS}]+(?:[’‘'\`]+[${LETTERS}]+)*`, 'g');
const QUOTES = /[’‘'`]+/;
const LONG_TO_SHORT = { ā: 'a', ī: 'i', ū: 'u' };

/** Word tokens of a passage, as written (quotation marks inside a word are kept: "hotī’’ti"). */
export function tokenize(text) {
  return String(text ?? '').replace(/<[^>]+>/g, ' ').match(TOKEN) ?? [];
}

/**
 * Lookup forms of one token: [{ form, note? }]. Quotation sandhi is undone only where DPD knows the
 * result: "abhinandu’’nti" → abhinanduṃ + ti, "hotī’’ti" → hoti + ti.
 */
export function wordParts(token) {
  const known = (form) => Object.hasOwn(loadDpd().forms, form);
  const pieces = String(token).toLowerCase().replace(/ṁ/g, 'ṃ').split(QUOTES).filter(Boolean);
  const out = [];
  pieces.forEach((piece, i) => {
    if (i > 0 && piece.length > 1 && piece[0] === 'n' && !known(piece) && known(piece.slice(1)) && out.length && !out.at(-1).form.endsWith('ṃ')) {
      const prev = out.at(-1);
      prev.form += 'ṃ';
      prev.note ||= 'quotation sandhi: final -ṃ written as n before ti';
      piece = piece.slice(1);
    }
    out.push({ form: piece, note: null });
  });
  for (const part of out) {
    const last = part.form.slice(-1);
    if (!known(part.form) && LONG_TO_SHORT[last] && known(part.form.slice(0, -1) + LONG_TO_SHORT[last])) {
      part.form = part.form.slice(0, -1) + LONG_TO_SHORT[last];
      part.note ||= 'final vowel lengthened before ti (sandhi)';
    }
  }
  return out;
}

function rootInfo(key) {
  if (!key) return undefined;
  const root = loadDpd().roots[key];
  return root ? { root: key, meaning: root[0], ...(root[1] ? { sign: root[1] } : {}) } : { root: key };
}

const MAX_SENSES = 3;

/** Every DPD analysis of one exact form, grouped by headword. Returns null when DPD does not know the form. */
export function analyseForm(form, { maxHeadwords = 6 } = {}) {
  const dpd = loadDpd();
  const entry = dpd.forms[form];
  if (!entry) return null;
  const [ids = [], grammar = [], splits = []] = entry;
  const groups = new Map();
  const group = (lemma) => {
    if (!groups.has(lemma)) groups.set(lemma, { headword: lemma, senses: [], grammar: [] });
    return groups.get(lemma);
  };
  for (const id of ids) {
    const hw = dpd.headwords.get(id);
    if (hw) group(hw.clean).senses.push(hw);
  }
  for (const [lemma, pos, tag] of grammar) {
    const label = `${pos} ${tag}`.trim();
    const g = group(lemma);
    if (!g.grammar.includes(label)) g.grammar.push(label);
  }
  const all = [...groups.values()].map((g) => {
    const first = g.senses[0];
    const withRoot = g.senses.find((s) => s.root);
    const withConstruction = g.senses.find((s) => s.construction);
    return {
      headword: g.headword,
      ...(first ? { pos: first.pos } : {}),
      grammar: g.grammar.length ? g.grammar : (first ? [first.grammar] : []),
      ...(withRoot ? { root: rootInfo(withRoot.root) } : {}),
      ...(withConstruction ? { construction: withConstruction.construction } : {}),
      meanings: g.senses.slice(0, MAX_SENSES).map((s) => ({ lemma: s.lemma, meaning: s.meaning || '(no meaning given)' })),
      senses_total: g.senses.length,
    };
  });
  return {
    analyses: all.slice(0, maxHeadwords),
    ...(all.length > maxHeadwords ? { more_headwords: all.length - maxHeadwords } : {}),
    splits,
  };
}

/** Short gloss of a split component: its first DPD headword and meaning. */
function component(form) {
  const dpd = loadDpd();
  const found = analyseForm(form, { maxHeadwords: 1 });
  const a = found?.analyses[0];
  if (a) return { form, headword: a.headword, ...(a.pos ? { pos: a.pos } : {}), meaning: a.meanings[0]?.meaning ?? null };
  const id = dpd.lemmas.get(form)?.[0];
  const hw = id && dpd.headwords.get(id);
  return hw ? { form, headword: hw.clean, pos: hw.pos, meaning: hw.meaning || null } : { form, meaning: null };
}

/** Analyse one token of the text. */
export function analyseToken(surface) {
  return wordParts(surface).map(({ form, note }) => {
    const found = analyseForm(form);
    const word = { surface, ...(form !== surface.toLowerCase() ? { form } : {}), ...(note ? { note } : {}) };
    if (!found) return { ...word, status: 'unknown', analyses: [], message: 'Not in the bundled DPD subset; no analysis is guessed.' };
    const split = found.splits[0];
    return {
      ...word,
      status: found.analyses.length ? 'found' : 'split-only',
      ...(split ? { split, components: split.split(' + ').map((p) => component(p.trim())) } : {}),
      ...(found.splits.length > 1 ? { other_splits: found.splits.slice(1) } : {}),
      analyses: found.analyses,
      ...(found.more_headwords ? { more_headwords: found.more_headwords } : {}),
    };
  });
}

/** Pick a segment of a unit by "3", "mn10/3" or a VRI paragraph number. */
function pickSegment(unit, segs, { segment, paragraph }) {
  if (paragraph !== undefined && paragraph !== null && paragraph !== '') {
    const index = segs.findIndex((s) => String(s.vri_paragraph) === String(paragraph));
    if (index < 0) throw new Error(`${unit.acronym} has no VRI paragraph ${paragraph}. Use get_text to see its paragraphs.`);
    return index;
  }
  if (segment === undefined || segment === null || segment === '') {
    const index = segs.findIndex((s) => s.type !== 'heading');
    return index < 0 ? 0 : index;
  }
  const raw = String(segment).trim();
  const m = raw.match(/^(?:(.+)\/)?(\d+)$/);
  if (!m) throw new Error(`Segment "${raw}" is not a segment number or ref such as ${unit.id}/3 (refs come from get_text).`);
  if (m[1] && m[1].toLowerCase() !== unit.id) throw new Error(`Segment ref ${raw} belongs to ${m[1]}, not ${unit.id}. Pass the matching uid.`);
  const index = Number(m[2]) - 1;
  if (index < 0 || index >= segs.length) throw new Error(`${unit.acronym} has ${segs.length} segments; segment ${m[2]} does not exist.`);
  return index;
}

/**
 * Word-by-word analysis of one segment of a text: per word its surface form, compound/sandhi split,
 * headword, grammar, root and short meaning from DPD. `segment` is a get_text ref ("mn10/3") or
 * number; `paragraph` picks by VRI paragraph instead. Words are paged with offset/limit.
 */
export function analysePassage({ uid, segment, paragraph, offset = 0, limit = 60 } = {}) {
  const { unit, notes } = canon.resolve(String(uid ?? ''));
  const segs = canon.segments(unit);
  if (!segs.length) throw new Error(`${unit.acronym} has no text to analyse.`);
  const index = pickSegment(unit, segs, { segment, paragraph });
  const seg = segs[index];
  const tokens = tokenize(seg.text);
  const page = tokens.slice(offset, offset + limit);
  const words = page.flatMap((t) => analyseToken(t));
  const unknown = words.filter((w) => w.status === 'unknown').length;
  const outNotes = [...notes];
  if (segment === undefined && paragraph === undefined) outNotes.push(`No segment given: analysed the first body segment (${seg.ref}). Pass segment (e.g. "${unit.id}/${index + 1}") for another.`);
  if (unit.approximate) outNotes.push('This text is abbreviated (peyyāla) in the VRI edition; the analysis covers the words printed, not the expanded text.');
  return {
    text_id: unit.id, citation: unit.acronym, title: unit.title,
    segment: { ref: seg.ref, type: seg.type, ...(seg.vri_paragraph ? { vri_paragraph: seg.vri_paragraph } : {}), text: seg.text },
    total_segments: segs.length,
    words_total: tokens.length, offset, limit, returned_tokens: page.length,
    next_offset: offset + page.length < tokens.length ? offset + page.length : null,
    words,
    ...(unknown ? { unknown_words: unknown } : {}),
    notes: outNotes,
    guidance: 'Dictionary analysis, not a translation or a ruling. DPD lists every possible parse of an inflected form and the deconstructor’s splits are computed suggestions; the right one depends on context. Quote the Pāli from segment.text and keep it distinct from these glosses.',
    edition: 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI), Pāli', text_attribution: canon.source().attribution,
    ...dpdNotice(),
  };
}

/**
 * Offline dictionary lookup (lookup_pali's fallback when dpdict.net is unreachable). Matches the
 * exact form first, then a headword, then a headword without diacritics. Returns null if nothing matches.
 */
export function lookupOffline({ word, limit = 5 } = {}) {
  const dpd = loadDpd();
  const query = String(word ?? '').trim().toLowerCase().replace(/ṁ/g, 'ṃ');
  if (!query) return null;
  const lines = [];
  const seen = new Set();
  const addSense = (hw, grammar) => {
    if (seen.has(hw.id)) return;
    seen.add(hw.id);
    const root = hw.root ? ` [${hw.root}${dpd.roots[hw.root] ? ` (${dpd.roots[hw.root][0]})` : ''}]` : '';
    lines.push(`${hw.lemma}: ${hw.pos}. ${hw.meaning || '(no meaning given)'}${root}${grammar ? ` — this form: ${grammar}` : ''}`);
  };
  const detail = [];
  const found = analyseForm(query, { maxHeadwords: 50 });
  let matched = 'form';
  if (found) {
    for (const a of found.analyses) {
      detail.push(`${a.headword}: ${a.grammar.join('; ')}${a.construction ? ` | construction: ${a.construction}` : ''}`);
      for (const id of dpd.forms[query][0] ?? []) {
        const hw = dpd.headwords.get(id);
        if (hw?.clean === a.headword) addSense(hw, a.grammar.join('; '));
      }
    }
    if (found.splits.length) detail.push(`split (DPD deconstructor): ${found.splits.join(' | ')}`);
  }
  if (!lines.length) {
    const ids = dpd.lemmas.get(query) ?? dpd.folded.get(canon.fold(query));
    matched = dpd.lemmas.has(query) ? 'headword' : 'headword without diacritics';
    for (const id of ids ?? []) {
      const hw = dpd.headwords.get(id);
      addSense(hw);
      if (hw.construction) detail.push(`${hw.lemma}: ${hw.grammar}${hw.construction ? ` | construction: ${hw.construction}` : ''}`);
    }
  }
  if (!lines.length && !detail.length) return null;
  const notice = dpdNotice();
  return {
    word: String(word).trim(), source: 'Digital Pāḷi Dictionary (bundled offline subset)', offline: true, matched,
    url: `https://www.dpdict.net/?q=${encodeURIComponent(String(word).trim())}`,
    entries: lines.slice(0, limit), total_summary_entries: lines.length, omitted: Math.max(0, lines.length - limit),
    detail_excerpt: [...new Set(detail)].join('\n').slice(0, 8000),
    detail_note: `Answered offline from the bundled DPD subset (${notice.dictionary.version}): headwords, grammar, roots, short meanings and compound/sandhi splits, without examples or inflection tables. Dictionary glosses are reference material, not scripture.`,
    ...notice,
  };
}

/** MCP registration (feature registry: src/features/index.mjs). */
export function register({ tool, z }) {
  tool('analyse_passage', 'Word-by-word analysis of a passage of the bundled Pāli text from the Digital Pāḷi Dictionary (offline): for each word its compound or sandhi split, headword, grammar (case, number, tense), root and short meaning. Pass a citation and a segment ref from get_text (e.g. "mn10/3") or a VRI paragraph. Every possible parse is listed; dictionary glosses are not a translation. CC BY-NC-SA 4.0 notice included. Works offline.', {
    uid: z.string().min(1).max(300).describe('Any citation get_text accepts, e.g. MN 10, SN 56.11, Dhp 183.'),
    segment: z.union([z.string().max(60), z.number().int().min(1)]).optional().describe('Segment ref from get_text such as "mn10/3", or its number (3). Omit for the first body segment.'),
    paragraph: z.union([z.string().max(20), z.number().int().min(0)]).optional().describe('VRI paragraph number instead of segment.'),
    offset: z.number().int().min(0).max(100000).default(0).describe('Word offset within the segment, for continuation.'),
    limit: z.number().int().min(1).max(200).default(60).describe('Words per call.'),
  }, (args) => analysePassage(args));
}
