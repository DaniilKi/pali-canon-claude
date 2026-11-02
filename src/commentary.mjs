/**
 * The traditional Pāli commentaries (Aṭṭhakathā) of the VRI Chaṭṭha Saṅgāyana edition, aligned to the
 * root texts by VRI paragraph number and checked against the words they quote (see
 * scripts/canon/build_commentary.py). Loaded lazily from server/data/commentary.json.gz; works offline.
 *
 * Commentary is not the canon: every result says so, names the commentary and carries VRI's attribution.
 */
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as canon from './canon.mjs';

let here;
try { here = __dirname; } catch { here = dirname(fileURLToPath(import.meta.url)); }

const FILE = 'commentary.json.gz';
const ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];
const HEADING = new Set(['subhead', 'title', 'chapter', 'book', 'nikaya', 'subsubhead']);
const CENTRE_HEADING = /(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$/i;
const VERSE = new Set(['gatha1', 'gatha2', 'gatha3', 'gathalast']);
export const LABEL = 'Commentary (Aṭṭhakathā), not the canon: the traditional Theravāda explanation of the texts, compiled in Pāli in Sri Lanka (traditionally attributed to Buddhaghosa, Dhammapāla and others). Keep it distinct from the root text when quoting.';
const EVIDENCE = {
  'paragraph+lemma': 'VRI paragraph number, confirmed by the root-text words the commentary quotes',
  paragraph: 'VRI paragraph number (no distinctive quotation contradicts it)',
  'paragraph+verse': 'VRI paragraph number, confirmed by the root verse the commentary quotes in full after it',
  'paragraph+heading': 'VRI paragraph number, confirmed by the commentary heading that names this text',
};

const PARA = /^(\d+)(?:\s*[-–]\s*(\d+))?$/;
/**
 * A VRI paragraph number ("12", "105-106", "105–106", "105-6") as [first, last], or null. There is no
 * paragraph 0 (n="0" marks book front matter). Same rule as para_range() in scripts/canon/build_commentary.py;
 * scripts/audit.mjs uses this one.
 */
export function paraRange(n) {
  const m = String(n ?? '').trim().match(PARA);
  if (!m) return null;
  const a = Number(m[1]);
  let tail = m[2] ?? m[1];
  if (tail.length < m[1].length) tail = m[1].slice(0, m[1].length - tail.length) + tail; // "105-6" is 105-106
  const b = Number(tail);
  return b >= a && a > 0 ? [a, b] : null;
}

let data = null;

function dataPath() {
  const candidates = [join(here, 'data', FILE), join(here, '..', 'server', 'data', FILE), join(process.cwd(), 'server', 'data', FILE)];
  return candidates.find((p) => existsSync(p)) || null;
}

/** Load the commentary data once. Returns null when the data file is not installed. */
export function load() {
  if (data) return data;
  const path = dataPath();
  if (!path) return null;
  data = JSON.parse(gunzipSync(readFileSync(path)).toString('utf8'));
  return data;
}

function ptsLabel(abbr, page) {
  const [vol, num] = String(page).split('.').map(Number);
  if (!num) return null;
  return vol ? `${abbr} ${ROMAN[vol] || vol} ${num}` : `${abbr} ${num}`;
}

const paraLabel = (a, b) => (a === b ? String(a) : `${a}–${b}`);

/** Group a passage's blocks into headings, prose paragraphs and whole stanzas. */
function passageSegments(d, pi) {
  const [bi, start, end, , a, b] = d.passages[pi];
  const book = d.books[bi];
  const out = [];
  let stanza = null;
  const flush = () => { if (stanza) { out.push(stanza); stanza = null; } };
  for (const [rend, , text, pages] of book.blocks.slice(start, end)) {
    const pts = (pages || []).map((p) => ptsLabel(book.abbr, p)).filter(Boolean);
    if (rend === 'hangnum') { flush(); continue; }
    if (VERSE.has(rend)) {
      stanza ||= { type: 'verse', text: '', pts: [] };
      stanza.text += (stanza.text ? '\n' : '') + text;
      stanza.pts.push(...pts);
      if (rend === 'gathalast') flush();
      continue;
    }
    flush();
    if (!text) continue;
    const heading = HEADING.has(rend) || (rend === 'centre' && CENTRE_HEADING.test(text));
    out.push({ type: heading ? 'heading' : 'prose', text, pts });
  }
  flush();
  return out.map((s) => ({
    type: s.type, text: s.text,
    comments_on_vri_paragraphs: paraLabel(a, b),
    ...(s.pts.length ? { commentary_pts_page_begins: [...new Set(s.pts)] } : {}),
  }));
}

function sourceInfo(d) {
  const { name, repository, commit, files, attribution, terms } = d.source;
  return { name, repository, commit, files, attribution, terms };
}

function describePassage(d, pi) {
  const [bi, , , rootBook, a, b, checked, hits, evidence] = d.passages[pi];
  const book = d.books[bi];
  return {
    work: book.work, description: book.description, vri_file: book.file, vri_book: book.title,
    comments_on: { vri_file: canon.load().canon.books[rootBook].file, vri_paragraphs: paraLabel(a, b) },
    alignment: evidence, ...(checked ? { quotations_checked: checked, quotations_found: hits } : {}),
  };
}

/** Aligned passage indexes for a resolved canon unit (own passages; a range also gets its members'). */
function passagesFor(d, unit) {
  const set = new Set(d.units[unit.id] || []);
  if (!set.size && unit.members) for (const m of unit.members) for (const pi of d.units[m] || []) set.add(pi);
  return [...set].sort((x, y) => x - y);
}

/**
 * For each commentary segment of a unit (in the order commentaryFor returns them), the passage it comes
 * from and the canon units that passage is aligned to. Used by scripts/parallels/build.mjs to tell whose
 * commentary a citation sits in.
 */
let ownersOf = null;
export function segmentOwners(unit) {
  const d = load();
  if (!d) return [];
  if (!ownersOf) {
    ownersOf = new Map();
    for (const [id, list] of Object.entries(d.units)) for (const pi of list) (ownersOf.get(pi) || ownersOf.set(pi, []).get(pi)).push(id);
  }
  const owners = ownersOf;
  const out = [];
  for (const pi of passagesFor(d, unit)) {
    const n = passageSegments(d, pi).length;
    for (let i = 0; i < n; i++) out.push({ passage: pi, units: owners.get(pi) || [] });
  }
  return out;
}

/**
 * Commentary on a text: resolves any citation, returns the aligned commentary passages as
 * segments, paginated by segment. Throws on an unknown citation (like get_text).
 */
export function getCommentary(uid, { offset = 0, limit = 40 } = {}) {
  const { unit, notes } = canon.resolve(uid);
  return commentaryFor(unit, { offset, limit, notes });
}

/** Commentary for an already resolved unit (used by get_text with commentary: true). */
export function commentaryFor(unit, { offset = 0, limit = 40, notes = [] } = {}) {
  const base = { text_id: unit.id, citation: unit.acronym, title: unit.title, label: LABEL };
  const d = load();
  if (!d) {
    return { ...base, available: false, segments: [], notes: [...notes, 'The commentary data file (commentary.json.gz) is not installed with this copy of the server. Reinstall, or read the Pāli text with get_text.'] };
  }
  const passages = passagesFor(d, unit);
  if (!passages.length) {
    return {
      ...base, available: false, total_segments: 0, segments: [],
      notes: [...notes, `No commentary passage is aligned to ${unit.acronym}. The commentary may pass over it (it often explains only the first of a run of similar texts), or its passage could not be matched with confidence: no alignment is given rather than a wrong one. Search the commentary's book in the VRI edition, or read neighbouring texts' commentary.`],
      source: sourceInfo(d),
    };
  }
  const all = [];
  for (const pi of passages) all.push(...passageSegments(d, pi));
  const page = all.slice(offset, offset + limit).map((s, i) => ({ ref: `${unit.id}/c${offset + i + 1}`, ...s }));
  const works = [...new Set(passages.map((pi) => d.books[d.passages[pi][0]].work))];
  const extra = [];
  if (unit.approximate) extra.push(`${unit.id} is abbreviated (peyyāla) in the VRI edition; the commentary shown explains the paragraph where the abbreviation occurs.`);
  if (passages.some((pi) => d.passages[pi][4] !== d.passages[pi][5])) extra.push('Some passages explain a run of root paragraphs together (comments_on_vri_paragraphs gives the range), so they may also cover neighbouring texts.');
  return {
    ...base, available: true,
    commentary: works.join('; '),
    passages: passages.map((pi) => describePassage(d, pi)),
    total_segments: all.length, offset, limit, returned: page.length,
    next_offset: offset + page.length < all.length ? offset + page.length : null,
    segments: page,
    notes: [...notes, ...extra],
    alignment_method: 'Each commentary passage carries the VRI paragraph number of the root text it explains; the bold words it quotes are checked against that paragraph. Passages that do not match are left out.',
    evidence_types: EVIDENCE,
    source: sourceInfo(d),
  };
}

/** Feature registration (src/features/index.mjs). */
export function register({ tool, z, citation }) {
  tool('get_commentary', 'Read the traditional Pāli commentary (Aṭṭhakathā, VRI Chaṭṭha Saṅgāyana edition) on a text: Sumaṅgalavilāsinī (DN), Papañcasūdanī (MN), Sāratthappakāsinī (SN), Manorathapūraṇī (AN), the Dhammapada commentary and others. Passages are aligned to the text by VRI paragraph number and checked against the words they quote; unmatched passages are left out. Commentary is not the canon: keep it distinct when quoting. Paginated by segment. Works offline.', {
    uid: citation,
    offset: z.number().int().min(0).max(100000).default(0).describe('Segment offset for continuation.'),
    limit: z.number().int().min(1).max(200).default(40).describe('Segments per page.'),
  }, ({ uid, offset, limit }) => getCommentary(uid, { offset, limit }));
}
