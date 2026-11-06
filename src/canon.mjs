import { searchSegments, searchFold, searchExcerpt, searchTerms } from './search-segments.mjs';
import { readBundled, bundledExists } from './bundled-data.mjs';
/**
 * The bundled Pāli Canon: VRI Chaṭṭha Saṅgāyana text, standard citation IDs aligned to it,
 * PTS page references and English translation links. Everything here works offline.
 */
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCitation, citationId, rangeEndPath, CitationError } from './citations.mjs';
import { EDITIONS, editionIndex, editionLabel, lookupEditionPage, nextUnit, textsOnPage, editionPagesFor } from './editions.mjs';

let here;
try { here = __dirname; } catch { here = dirname(fileURLToPath(import.meta.url)); }

const ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];
const HEADING = new Set(['subhead', 'title', 'chapter', 'book', 'nikaya', 'subsubhead']);
// Centred lines are headings only when they are invocations or colophons; otherwise (e.g. rule recitations) they are text.
const CENTRE_HEADING = /(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$/i;
const VERSE = new Set(['gatha1', 'gatha2', 'gatha3', 'gathalast']);
const PITAKA = { vinaya: 'vinaya', ds: 'abhidhamma', vb: 'abhidhamma', dt: 'abhidhamma', pp: 'abhidhamma', kv: 'abhidhamma', ya: 'abhidhamma', patthana: 'abhidhamma' };
const COLLECTION_ORDER = ['vinaya', 'dn', 'mn', 'sn', 'an', 'kp', 'dhp', 'ud', 'iti', 'snp', 'vv', 'pv', 'thag', 'thig', 'ap', 'bv', 'cp', 'ja', 'mnd', 'cnd', 'ps', 'mil', 'ne', 'pe', 'ds', 'vb', 'dt', 'pp', 'kv', 'ya', 'patthana'];
const COLLECTION_NAMES = {
  vinaya: 'Vinaya Piṭaka', dn: 'Dīgha Nikāya', mn: 'Majjhima Nikāya', sn: 'Saṃyutta Nikāya', an: 'Aṅguttara Nikāya',
  kp: 'Khuddakapāṭha', dhp: 'Dhammapada', ud: 'Udāna', iti: 'Itivuttaka', snp: 'Suttanipāta', vv: 'Vimānavatthu',
  pv: 'Petavatthu', thag: 'Theragāthā', thig: 'Therīgāthā', ap: 'Apadāna', bv: 'Buddhavaṃsa', cp: 'Cariyāpiṭaka',
  ja: 'Jātaka', mnd: 'Mahāniddesa', cnd: 'Cūḷaniddesa', ps: 'Paṭisambhidāmagga', mil: 'Milindapañha', ne: 'Nettippakaraṇa',
  pe: 'Peṭakopadesa', ds: 'Dhammasaṅgaṇī', vb: 'Vibhaṅga', dt: 'Dhātukathā', pp: 'Puggalapaññatti', kv: 'Kathāvatthu',
  ya: 'Yamaka', patthana: 'Paṭṭhāna',
};
const PTS_ABBR = { dn: 'D', mn: 'M', sn: 'S', an: 'A', vinaya: 'Vin', ud: 'Ud', iti: 'It', snp: 'Sn', vv: 'Vv', pv: 'Pv',
  thag: 'Th', thig: 'Thī', ap: 'Ap', bv: 'Bv', cp: 'Cp', ja: 'Ja', mnd: 'Nidd I', cnd: 'Nidd II', ps: 'Paṭis', mil: 'Mil',
  ne: 'Nett', pe: 'Peṭ', ds: 'Dhs', vb: 'Vibh', dt: 'Dhātuk', pp: 'Pp', kv: 'Kv', ya: 'Yam', patthana: 'Paṭṭh', kp: 'Khp', dhp: 'Dhp' };

export const fold = (value) => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/ṁ|ṃ/g, 'm');

let data = null;

/** Ānandajoti Bhikkhu's text-and-translation pages (server/data/anandajoti.json, built by scripts/anandajoti/build.mjs). */
export const ANANDAJOTI_BASE = 'https://ancient-buddhist-texts.net';
export const ANANDAJOTI_LICENSE = 'CC BY-SA 3.0 — Ānandajoti Bhikkhu, Ancient Buddhist Texts (ancient-buddhist-texts.net). The site’s Copyright Notice (2013) gives CC BY-SA 3.0 Unported; its page footers link CC BY-SA 4.0. Share-alike: reuse must keep the same licence and credit Ānandajoti Bhikkhu.';
let anandajotiSource = null;

function mergeAnandajoti(translations) {
  let file;
  try { file = dataPath('anandajoti.json'); } catch { return; }
  const aj = JSON.parse(readFileSync(file, 'utf8'));
  anandajotiSource = aj.source;
  for (const [id, l] of Object.entries(aj.links)) {
    (translations[id] ||= []).push({
      source: 'anandajoti', url: ANANDAJOTI_BASE + l.path, path: l.path, ...(l.parts ? { parts: l.parts } : {}),
      translator: 'Ānandajoti Bhikkhu', english: l.title || undefined, reference: l.reference, license: 'CC BY-SA 3.0',
      match: l.match, ...(l.commentary ? { commentary: true } : {}),
    });
  }
}

/** Metadata of the Ānandajoti index (licence, policy, date checked), or null when the data file is absent. */
export function anandajotiInfo() {
  load();
  return anandajotiSource;
}

const SOURCE_NAMES = { dhammatalks: 'dhammatalks.org', ati: 'Access to Insight', anandajoti: 'Ancient Buddhist Texts (Ānandajoti Bhikkhu)' };
/** Display name of a translation link's source. */
export const sourceName = (t) => SOURCE_NAMES[t.source] || t.source;
/** Stable translation_id of a link: dt:<path>, ati:<path> or aj:<path>. */
export function translationId(t) {
  if (t.source === 'ati') return `ati:${t.path}`;
  if (t.source === 'anandajoti') return `aj:${t.path.replace(/^\/Texts-and-Translations\//, '').replace(/\.htm$/, '')}`;
  return `dt:${t.url.split('/suttas/')[1].replace(/\.html$/, '')}`;
}

function dataPath(name) {
  const candidates = [join(here, 'data', name), join(here, '..', 'server', 'data', name), join(process.cwd(), 'server', 'data', name)];
  const found = candidates.find((p) => bundledExists(p));
  if (!found) throw new Error(`Bundled canon data (${name}) is missing. Reinstall the extension or run the canon build.`);
  return found;
}

export function load() {
  if (data) return data;
  const canon = JSON.parse(gunzipSync(readBundled(dataPath('canon.json.gz'))).toString('utf8'));
  const translations = JSON.parse(readFileSync(dataPath('translations.json'), 'utf8'));
  mergeAnandajoti(translations);
  const byId = new Map();
  for (const u of canon.units) if (!byId.has(u.id)) byId.set(u.id, u);
  const ranges = [];
  for (const u of canon.units) {
    const m = u.id.match(/^(.*?)(\d+)-(\d+)$/);
    if (m) ranges.push({ prefix: m[1], from: Number(m[2]), to: Number(m[3]), unit: u });
  }
  const urlIndex = new Map();
  for (const [id, links] of Object.entries(translations)) {
    for (const link of links) {
      if (link.url) urlIndex.set(link.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\.html?$/, ''), id);
      // A work spread over several pages (e.g. DN 16 on Ancient Buddhist Texts): each part page cites the work.
      for (const part of link.parts || []) urlIndex.set(`ancient-buddhist-texts.net${part}`.replace(/\.html?$/, ''), id);
    }
  }
  data = { canon, byId, ranges, translations, urlIndex, search: null };
  return data;
}

function sectionOf(id) {
  const m = id.match(/^([a-z-]+\d+\.)/);
  return m ? m[1].replace(/\.$/, '') : id.match(/^(pli-tv-[a-z]+-[a-z]+-[a-z]+|pli-tv-[a-z]+|[a-z-]+)/)[1];
}

const VERSE_CITED = new Set(['snp', 'thag', 'thig', 'dhp']);

function ptsLabel(collection, volume, page) {
  const abbr = PTS_ABBR[collection];
  if (!abbr || page === undefined || page === null) return null;
  // Books cited by verse number get an explicit page label so a page is never mistaken for a verse.
  if (VERSE_CITED.has(collection)) return `PTS ed. p. ${page}`;
  if (!volume) return `${abbr} ${page}`;
  if (['mnd', 'cnd', 'ps', 'mil', 'ne', 'pe', 'kp', 'dhp', 'ud', 'iti', 'snp', 'vv', 'pv', 'thag', 'thig', 'bv', 'cp', 'ds', 'dt', 'pp', 'kv'].includes(collection) && volume <= 1) {
    return `${abbr} ${page}`;
  }
  return `${abbr} ${ROMAN[volume] || volume} ${page}`;
}

/** Translation links for a text; a verse or member inherits those of the range that contains it (e.g. a Dhp chapter). */
export function linksFor(u) {
  const d = load();
  const own = d.translations[u.id];
  if (own?.length) return { links: own, via: null };
  const container = rangeContaining(u.id);
  if (container && d.translations[container.id]?.length) return { links: d.translations[container.id], via: container };
  return { links: [], via: null };
}

/** Describe index certainty without inferring missing or abbreviated source wording. */
export function alignmentInfo(unit) {
  if (!unit) return null;
  if (unit.approximate) {
    if (unit.shares_passage_with) return { kind: 'shared_passage', shared_with: unit.shares_passage_with,
      note: `${unit.id} is approximate and shares its indexed source span with ${unit.shares_passage_with}. A separate source span is not asserted; no missing wording is reconstructed.` };
    return { kind: 'unverified_alignment',
      note: `${unit.id} has no confirmed independent location in the bundled citation index. The supplied source span is provisional; this does not establish that VRI abbreviates or omits the text.` };
  }
  if (!unit.members?.length) return null;
  const d = load();
  const uncertain = (unit.members || []).filter((id) => {
    const member = d.byId.get(id);
    return member?.approximate && !member.shares_passage_with;
  });
  return uncertain.length ? { kind: 'group_with_unverified_members', unverified_members: uncertain,
    note: `${unit.id} includes unverified member mappings (${uncertain.join(', ')}). Its bundled span can include neighbouring passages; it does not establish separate locations for those members.` } : null;
}

function unitSummary(u, extra = {}) {
  const d = load();
  const alignment = alignmentInfo(u);
  return {
    id: u.id,
    citation: u.acronym,
    title: u.title || null,
    collection: COLLECTION_NAMES[u.collection] || u.collection,
    ...(u.kind === 'range' ? { covers: u.members?.length ? `${u.members[0]} … ${u.members[u.members.length - 1]}` : undefined } : {}),
    pts: u.pts ? ptsLabel(u.collection, u.pts.volume, u.pts.page) + (u.pts.end_page && u.pts.end_page !== u.pts.page ? `–${u.pts.end_page}` : '') : null,
    vri_paragraphs: u.vri || null,
    ...(u.approximate ? { approximate: true } : {}),
    ...(alignment ? { alignment } : {}),
    english_available: linksFor(u).links.length,
    ...extra,
  };
}

function rangeContaining(id) {
  const d = load();
  const m = id.match(/^(.*?)(\d+)$/);
  if (!m) return null;
  const n = Number(m[2]);
  return d.ranges.find((r) => r.prefix === m[1] && r.from <= n && n <= r.to)?.unit || null;
}

function lookupId(id) {
  const d = load();
  if (d.byId.has(id)) return { unit: d.byId.get(id), via: 'id' };
  const container = rangeContaining(id);
  if (container) return { unit: container, via: 'range', note: `${id} is not separately indexed; the bundled citation lookup maps it to source group ${container.acronym} (${container.id}).` };
  return null;
}

function ptsLookup(c) {
  const d = load();
  const wanted = c.collection === 'nidd' ? null : c.collection === 'tha-ap' ? 'ap' : c.collection;
  if (c.collection === 'nidd' && c.volume > 2) return null;
  const pool = d.canon.units.filter((u) => u.pts && !u.approximate && u.kind !== 'range'
    && (c.collection === 'nidd' ? (c.volume === 1 ? u.collection === 'mnd' : u.collection === 'cnd') : u.collection === wanted)
    && (c.collection === 'nidd' || u.pts.volume === c.volume));
  const hits = pool.filter((u) => u.pts.page <= c.page && c.page <= (u.pts.end_page ?? u.pts.page));
  if (!hits.length) return null;
  // Prefer the text that begins on that page, then the shortest span.
  // Prefer texts that begin on that page, then the earliest in the book (S i 1 is SN 1.1, not SN 1.2).
  hits.sort((a, b) => (b.pts.page === c.page) - (a.pts.page === c.page) || a.book - b.book || a.start - b.start);
  return hits;
}

/** Resolve any citation to a canon text. Returns { unit, notes[], alternatives[] } or throws. */
export function resolve(reference) {
  const d = load();
  const notes = [];
  let c;
  try {
    c = parseCitation(reference);
  } catch (error) {
    if (error instanceof CitationError) throw error;
    throw new CitationError(`Could not read "${reference}".`);
  }
  if (c.segment) notes.push(`Passage anchor ":${c.segment}" is a SuttaCentral segment number; this tool returns VRI paragraphs, so read the text and locate the passage.`);
  if (c.note) notes.push(c.note);
  if (c.kind === 'pts') {
    const hits = ptsLookup(c);
    if (!hits) {
      const unpaged = { ja: 'Jātaka', nidd: c.volume === 2 ? 'Cūḷaniddesa' : null, ya: 'Yamaka', patthana: 'Paṭṭhāna' }[c.collection];
      throw new CitationError(unpaged
        ? `The VRI edition bundled here carries no PTS page numbers for the ${unpaged}, so ${c.raw} cannot be looked up by page. Cite it by number instead (e.g. Ja 1).`
        : `No text found at PTS ${c.raw}. Check the volume and page; PTS pages are available for the Sutta and Vinaya Piṭakas and most Abhidhamma books.`);
    }
    const label = c.raw.replace(/^PTS[:\s]*/i, '');
    notes.push(`PTS ${label} falls within ${hits[0].acronym}${hits[0].pts.page === c.page ? ', which begins on that page' : ''}.`);
    return { unit: hits[0], notes, alternatives: hits.slice(1, 4).map((u) => unitSummary(u)) };
  }
  if (c.kind === 'edition') {
    const { hit, occurrences } = lookupEditionPage(d, c, CitationError);
    const idx = editionIndex(d);
    const label = editionLabel(d, c.edition, hit.book, `${c.volume}.${c.page}`);
    let unit = idx.owner[hit.book][hit.block];
    if (!unit) {
      unit = nextUnit(d, hit.book, hit.block);
      if (!unit) throw new CitationError(`${label} begins in a line that belongs to no text in the index.`);
      notes.push(`${label} begins in a line printed between texts (${d.canon.books[hit.book].blocks[hit.block][2].slice(0, 60)}); showing the text that follows, ${unit.acronym}.`);
    } else {
      const para = d.canon.books[hit.book].blocks[hit.block][1];
      notes.push(`${label} begins within ${unit.acronym}${para ? ` (VRI paragraph ${para})` : ''}. Page numbers are those VRI recorded for the ${EDITIONS[c.edition].full}.`);
    }
    if (occurrences.length > 1) notes.push(`VRI marks ${label} ${occurrences.length} times in this book; the first is used.`);
    const others = new Map();
    for (const occ of occurrences) for (const u of textsOnPage(d, c.edition, occ)) if (u.id !== unit.id) others.set(u.id, u);
    const alignment = alignmentInfo(unit);
    if (alignment) notes.push(alignment.note);
    return { unit, notes, alternatives: [...others.values()].slice(0, 3).map((u) => unitSummary(u)) };
  }
  if (c.kind === 'url') {
    const key = `${c.host}${c.path}`;
    const id = d.urlIndex.get(key) || d.urlIndex.get(key.replace(/^accesstoinsight\.org/, 'accesstoinsight.org'));
    if (!id) throw new CitationError('That page is not linked to a canon text in the bundled index. Give the sutta citation instead.');
    notes.push(c.host === 'ancient-buddhist-texts.net'
      ? `Linked from ${c.host}: Ānandajoti Bhikkhu's text and translation of ${id}.`
      : `Linked from ${c.host}. Note that ${c.host} numbers some SN/AN texts by the older PTS scheme; the standard ID is ${id}.`);
    const unit = d.byId.get(id);
    const alignment = alignmentInfo(unit);
    if (alignment) notes.push(alignment.note);
    return { unit, notes, alternatives: [] };
  }
  const id = c.kind === 'uid' ? c.uid : citationId(c);
  let hit = lookupId(id);
  if (!hit && c.kind === 'id' && c.end !== null && c.end !== undefined) {
    // "MN 10-12" or "Dhp 5-7": a span that is not itself a text → return its first text.
    const first = citationId({ ...c, end: null });
    hit = lookupId(first);
    if (hit) {
      const last = citationId({ ...c, path: rangeEndPath(c), end: null });
      if (!lookupId(last)) throw new CitationError(`${reference}: final range endpoint "${last}" is not in the canon index. Check the range with browse_canon.`);
      if (last !== first) notes.push(`${reference} spans several texts; showing the first, ${hit.unit.acronym}. Request the others separately.`);
      else notes.push(`${reference} has identical endpoints; showing ${hit.unit.acronym}.`);
    }
  }
  if (!hit && c.kind === 'id' && c.collection === 'snp' && c.path.length === 1) {
    throw new CitationError(`Snp ${c.path[0]} looks like a verse number. Cite the Sutta Nipāta by chapter and sutta, e.g. Snp 1.8 (Mettasutta).`);
  }
  if (!hit && c.kind === 'id' && ['thag', 'thig'].includes(c.collection) && c.path.length === 1) {
    hit = lookupId(`${c.collection}${c.path[0]}.1`);
    if (hit) notes.push(`${reference} read as ${hit.unit.acronym} (chapter ${c.path[0]}, first poem). Cite Thag/Thig as chapter.poem.`);
  }
  if (!hit) {
    // "Kv 1", "Dt 1", "Ds 1": books numbered in sub-sections → the first section under that number.
    const child = d.canon.units.find((u) => !u.approximate && u.id.startsWith(`${id}.`));
    if (child) {
      hit = { unit: child, via: 'child' };
      notes.push(`${reference} is divided into sections; showing the first, ${child.acronym}. Use browse_canon("${id}") to list them.`);
    }
  }
  if (!hit) {
    const collection = c.kind === 'id' ? c.collection : sectionOf(id);
    throw new CitationError(`${reference} (${id}) is not in the canon index. Check the number with browse_canon("${collection}").`);
  }
  if (hit.note) notes.push(hit.note);
  const alignment = alignmentInfo(hit.unit);
  if (alignment) notes.push(alignment.note);
  const schemes = (d.translations[hit.unit.id] || []).filter((t) => t.reference && /^(AN|SN) \d+:\d+/.test(t.reference))
    .map((t) => t.reference.match(/^(AN|SN) (\d+):(\d+)/)).filter(Boolean)
    .filter((m) => `${m[1].toLowerCase()}${m[2]}.${m[3]}` !== hit.unit.id);
  if (schemes.length) notes.push(`Also numbered ${schemes[0][1]} ${schemes[0][2]}.${schemes[0][3]} in the PTS-based numbering used by Ṭhānissaro Bhikkhu (dhammatalks.org) and Access to Insight.`);
  return { unit: hit.unit, notes, alternatives: [] };
}

function bookBlocks(u) {
  return load().canon.books[u.book].blocks;
}

/** Group a unit's VRI blocks into readable segments: headings, prose paragraphs and whole stanzas. */
export function segments(u, { includeNotes = false } = {}) {
  const blocks = bookBlocks(u).slice(u.start, u.end);
  const out = [];
  let stanza = null;
  const flush = () => { if (stanza) { out.push(stanza); stanza = null; } };
  const d = load();
  // Thai, Myanmar and VRI page breaks; a break in an empty block is carried to the next segment.
  let pending = [];
  const editionLabels = (pages) => {
    const labels = [...pending];
    pending = [];
    for (const ed of Object.keys(EDITIONS)) for (const at of pages[ed] || []) labels.push([ed, editionLabel(d, ed, u.book, at)]);
    return labels;
  };
  for (const [rend, n, text, notes, pages] of blocks) {
    const pts = (pages.P || []).map((p) => {
      const [vol, page] = p.split('.').map(Number);
      return ptsLabel(u.collection, vol, page);
    });
    const eds = editionLabels(pages);
    if (rend === 'hangnum') { flush(); stanza = { type: 'verse', vri: n, text: '', pts: [], eds }; continue; }
    if (VERSE.has(rend)) {
      if (!stanza) stanza = { type: 'verse', vri: n, text: '', pts: [], eds: [] };
      stanza.text += (stanza.text ? '\n' : '') + text;
      stanza.pts.push(...pts);
      stanza.eds.push(...eds);
      if (includeNotes && notes.length) (stanza.variants ||= []).push(...notes);
      if (rend === 'gathalast') flush();
      continue;
    }
    flush();
    if (!text) { pending = eds; continue; }
    const isHeading = HEADING.has(rend) || (rend === 'centre' && CENTRE_HEADING.test(text));
    const seg = { type: isHeading ? 'heading' : 'prose', vri: n, text, pts, eds };
    if (includeNotes && notes.length) seg.variants = notes;
    out.push(seg);
  }
  flush();
  return out.map((s, i) => {
    const r = { ref: `${u.id}/${i + 1}`, type: s.type, text: s.text };
    if (s.vri) r.vri_paragraph = s.vri;
    if (s.pts?.length) r.pts_page_begins = [...new Set(s.pts.filter(Boolean))];
    for (const [ed, meta] of Object.entries(EDITIONS)) {
      const labels = (s.eds || []).filter(([e]) => e === ed).map(([, label]) => label);
      if (labels.length) r[`${meta.key}_page_begins`] = [...new Set(labels)];
    }
    if (s.variants?.length) r.variant_readings = s.variants;
    return r;
  });
}

export function source() {
  return load().canon.source;
}

export function describe(u, notes = []) {
  const d = load();
  const { links: own, via } = linksFor(u);
  if (via) notes = [...notes, `English translations are of the whole ${via.acronym} (${via.title}); this text is part of it.`];
  const english = own.map((t) => ({
    source: sourceName(t),
    translator: t.translator, reference: t.reference || undefined, url: t.url,
    ...(t.license ? { license: t.license } : {}),
    translation_id: translationId(t),
    match: t.match,
    ...(t.commentary ? { includes_commentary: true } : {}),
  }));
  const blocks = bookBlocks(u);
  const book = d.canon.books[u.book];
  return {
    ...unitSummary(u),
    pitaka: PITAKA[u.collection] || 'sutta',
    vri_book: book.title,
    vri_file: book.file,
    ...(u.members ? { contains: u.members } : {}),
    english,
    links: {
      suttacentral: `https://suttacentral.net/${u.id}`,
      note: 'SuttaCentral lists parallels and further translations. This tool links to it but does not fetch its content, at SuttaCentral\'s request.',
    },
    notes,
    segments: segments(u).length,
    ...(() => { const e = editionPagesFor(d, u); return e ? { edition_pages: e } : {}; })(),
    source: d.canon.source,
    first_line: blocks.slice(u.start, u.end).find((b) => !HEADING.has(b[0]) && !(b[0] === 'centre' && CENTRE_HEADING.test(b[2])) && b[2])?.[2]?.slice(0, 160) || null,
  };
}

// ---- search ---------------------------------------------------------------

/** Match recorded members and actual identifier descendants, never numbered siblings or partial names. */
function scopePredicate(d, scope) {
  const parent = scope && !/\d$/.test(scope);
  const members = new Set(d.byId.get(scope)?.members || []);
  return (unit) => {
    if (!scope || unit.collection === scope || unit.id === scope || members.has(unit.id)) return true;
    if (!unit.id.startsWith(scope)) return false;
    const next = unit.id[scope.length];
    return next === '.' || (parent && (next === '-' || /\d/.test(next || '')));
  };
}

// Reuse citation lookup's recorded group mapping; an unprinted member is never a new text.
function groupedScope(d, key, requested) {
  if (!key || d.byId.has(key)) return null;
  const hit = lookupId(key);
  if (hit?.via !== 'range') return null;
  return {
    unit: hit.unit,
    metadata: {
      requested, resolved_id: hit.unit.id, approximate: !!hit.unit.approximate,
      note: hit.note + (hit.unit.approximate ? ' The approximate group itself is excluded from the full-text search index.' : ''),
      read_with: { tool: 'get_text', uid: hit.unit.id },
    },
  };
}

function buildSearch() {
  const d = load();
  const owner = d.canon.books.map((b) => new Array(b.blocks.length).fill(null));
  // Most specific unit per block: prefer non-range, non-approximate, shortest span.
  const sorted = [...d.canon.units].filter((u) => !u.approximate)
    // Later writers win: ranges first, then larger texts, so each block belongs to its most specific text.
    .sort((a, b) => (b.kind === 'range') - (a.kind === 'range') || (b.end - b.start) - (a.end - a.start));
  for (const u of sorted) for (let i = u.start; i < u.end; i += 1) owner[u.book][i] = u;
  const passages = d.canon.books.map((book, bi) => searchSegments(book.blocks, (i) => owner[bi][i])
    .map((segment) => ({ ...segment, folded: searchFold(segment.text, fold) })));
  const titles = d.canon.units.filter((u) => !u.approximate).map((u) => {
    const english = (d.translations[u.id] || []).map((t) => `${t.reference || ''} ${t.english || ''}`).join(' ');
    return { u, text: fold(`${u.acronym} ${u.title} ${english}`) };
  });
  // Proper-name lookup still ranks matches per XML paragraph; preserve its index lazily.
  let folded;
  d.search = { owner, passages, titles, get folded() {
    return folded ||= d.canon.books.map((book) => book.blocks.map((block) => fold(block[2])));
  } };
  return d.search;
}

function terms(query) {
  return searchTerms(query, fold);
}

/**
 * Full-text search. `groups` (optional, used for spelling variants and English expansion, #102) replaces the query's
 * own terms: an array of groups of folded alternatives, where every group must match and any alternative in a group may.
 */
export function search(query, { collection, limit = 10, offset = 0, groups } = {}) {
  const d = load();
  const filter = collection ? fold(collection).replace(/\s+/g, '') : null;
  const resolved = groupedScope(d, filter, collection);
  const okCollection = scopePredicate(d, resolved?.unit.id || filter);
  const scopeAlignment = alignmentInfo(d.byId.get(resolved?.unit.id || filter));
  if (collection && (!filter || !d.canon.units.some(okCollection))) {
    throw new Error(`Unknown canonical search scope "${collection}". Use browse_canon to list collection and section IDs.`);
  }
  const s = d.search || buildSearch();
  const wanted = groups?.length ? groups.map((g) => g.map((w) => searchFold(w, fold))) : terms(query).map((w) => [w]);
  if (!wanted.length) throw new Error('Search needs at least one word of two or more letters.');
  const has = (text) => wanted.every((alts) => alts.some((w) => text.includes(w)));
  const matchingTitles = s.titles.filter(({ u, text }) => okCollection(u) && has(text));
  const titleHits = matchingTitles.slice(offset, offset + limit).map(({ u }) => unitSummary(u));
  const hits = [];
  const seen = new Set();
  let total = 0;
  for (let bi = 0; bi < s.passages.length; bi += 1) {
    for (const passage of s.passages[bi]) {
      const k = passage.start;
      const text = passage.folded;
      if (!has(text)) continue;
      const u = s.owner[bi][k];
      if (!u || !okCollection(u) || seen.has(u.id)) continue;
      seen.add(u.id);
      total += 1;
      if (total <= offset || hits.length >= limit) continue;
      const excerpt = searchExcerpt(passage.text, wanted[0].find((w) => text.includes(w)), fold);
      hits.push({ ...unitSummary(u), match_vri_paragraph: d.canon.books[bi].blocks[k][1] || undefined,
        excerpt });
    }
  }
  return {
    query, searched: 'Full Pāli text of the VRI Chaṭṭha Saṅgāyana edition (diacritics optional), text titles and English translation titles.',
    ...(resolved ? { scope_resolution: resolved.metadata } : {}),
    ...(scopeAlignment ? { scope_alignment: scopeAlignment } : {}),
    title_matches: titleHits, total_title_matches: matchingTitles.length,
    title_next_offset: limit > 0 && offset + limit < matchingTitles.length ? offset + limit : null,
    results: hits, total_texts_matched: total, offset, limit,
    next_offset: limit > 0 && offset + limit < total ? offset + limit : null,
    tip: total === 0 && !matchingTitles.length ? 'Search Pāli words (e.g. "satipatthana", "anapanassati") or an English title word. For English topics also try search_access_to_insight.' : undefined,
  };
}

// ---- browsing -------------------------------------------------------------

export function browse(node = 'canon', { offset = 0, limit = 60 } = {}) {
  const d = load();
  const key = fold(node).replace(/\s+/g, '');
  const page = (items) => ({ total: items.length, offset, limit, next_offset: offset + limit < items.length ? offset + limit : null, items: items.slice(offset, offset + limit) });
  const resolved = groupedScope(d, key, node);
  if (resolved) {
    const collection = resolved.unit.collection;
    return { node: key, name: COLLECTION_NAMES[collection] || collection, collection,
      scope_resolution: resolved.metadata, ...page([unitSummary(resolved.unit)]) };
  }
  const units = d.canon.units.filter((u) => !u.approximate);
  if (['canon', 'tipitaka', 'all', ''].includes(key)) {
    return { node: 'canon', ...page(COLLECTION_ORDER.map((c) => ({ id: c, name: COLLECTION_NAMES[c], pitaka: PITAKA[c] || 'sutta', texts: units.filter((u) => u.collection === c && u.kind !== 'range').length }))) };
  }
  if (['sutta', 'vinaya', 'abhidhamma'].includes(key)) {
    const cs = COLLECTION_ORDER.filter((c) => (PITAKA[c] || 'sutta') === key);
    return { node: key, ...page(cs.map((c) => ({ id: c, name: COLLECTION_NAMES[c] }))) };
  }
  if (['sn', 'an', 'vinaya'].includes(key)) {
    const sections = new Map();
    for (const u of units.filter((x) => x.collection === key && x.kind !== 'range')) {
      const s = sectionOf(u.id);
      if (!sections.has(s)) sections.set(s, { id: s, first: u.acronym, title: u.title, texts: 0 });
      sections.get(s).texts += 1;
    }
    return { node: key, name: COLLECTION_NAMES[key], note: 'Open a section ID to list its texts.', ...page([...sections.values()]) };
  }
  const inScope = scopePredicate(d, key);
  const members = units.filter((u) => u.kind !== 'range' && inScope(u));
  if (!members.length) throw new Error(`Unknown browse node "${node}". Start with "canon", "sutta", "vinaya", "abhidhamma" or a collection such as mn, sn, sn56, an4, dhp.`);
  members.sort((a, b) => a.book - b.book || a.start - b.start);
  const collection = members[0].collection;
  const alignment = alignmentInfo(d.byId.get(key));
  return { node: key, name: COLLECTION_NAMES[key] || COLLECTION_NAMES[collection] || collection, ...(key !== collection ? { collection } : {}),
    ...(alignment ? { alignment } : {}), ...page(members.map((u) => unitSummary(u))) };
}

export const _test = { lookupId, rangeContaining, ptsLookup };
