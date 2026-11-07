/**
 * find_citations: scan free text (an essay, a talk transcript, a paper's references) for every
 * citation form the citation parser accepts, resolve each against the bundled canon, and report
 * the ones that do not resolve together with the parser's or resolver's reason.
 *
 * The scanner only proposes candidate spans; `canon.resolve` (and through it `parseCitation`)
 * decides what each one means. Nothing is guessed: a candidate that does not resolve is reported
 * as unresolved, never corrected.
 *
 * To keep ordinary prose quiet, free text is matched more strictly than the resolve_reference
 * input box:
 *   - collection abbreviations are case-sensitive ("MN 10", not "mn 10" or "Mn 10");
 *   - one-letter and English-looking abbreviations are not read before a bare number
 *     (D, M, S, A, J, Dh, It, Th, Thi, Ne, Pe, Pet, Ps, Pp, Ya, Dt, As), so "Plan A 3",
 *     "It 27 times", "Ps 23" (Psalm 23) and "As 5 people" are not citations here;
 *     the one-letter forms are still read as PTS volume/page ("M i 55", "S v 420");
 *   - a number glued to letters ("MN 10th") or followed by ",000" is not a citation;
 *   - links count only for suttacentral.net, accesstoinsight.org, dhammatalks.org and ancient-buddhist-texts.net.
 */

import { EDITION_WORDS, VINAYA_SCOPES, matchesEditionBook } from './editions.mjs';
import { _test as citationTables } from './citations.mjs';
import { romanizeInput, romanizeLookupInput, inputNote } from './script.mjs';
import { createHash } from 'node:crypto';

// Not inside a word, a number or an e-mail address.
const BOUND_BEFORE = '(?<![\\p{L}\\p{N}_@])';
const BOUND_AFTER = '(?![\\p{L}\\p{N}_@]|,\\d)';
// "10", "56.11", "56:11", "1.296-305", "1-20", "1 – 20" (spaces only around en/em dashes).
const NUM = '\\d+(?:[.:]\\d+)*(?:(?:-|\\s?[–—]\\s?)\\d+(?:[.:]\\d+)*)?';

const ABBREVIATIONS = [
  'DN', 'MN', 'SN', 'AN', 'Kp', 'Khp', 'Dhp', 'Ud', 'Iti', 'Snp', 'Sn', 'Stnp', 'Vv', 'Pv', 'Thag', 'Thig',
  'Tha[ -]?Ap', 'Thi[ -]?Ap', 'Ap', 'Bv', 'Cp', 'Ja', 'Mnd', 'Cnd', 'Patis', 'Mil', 'Nett', 'Ds', 'Dhs', 'Vb', 'Vibh',
  'Dhatuk', 'Pug', 'Kv', 'Yam', 'Patthana', 'Patth',
];
const FULL_NAMES = [
  '(?:Digha|Majjhima|Samyutta|Anguttara)(?:[ -]?Nikay[ao])?', 'Khuddakapatha', 'Dhammapada', 'Udana', 'Itivuttaka',
  'Sutta[ -]?Nipata', 'Vimanavatthu', 'Petavatthu', 'Theragatha', 'Therigatha', 'Thera[ -]?apadana', 'Theri[ -]?apadana',
  'Apadana', 'Buddhavamsa', 'Cariyapitaka', 'Jataka', 'Mahaniddesa', 'Cul?laniddesa', 'Patisambhidamagga', 'Milindapanha',
  'Nettippakarana', 'Petakopadesa', 'Dhammasangani', 'Vibhanga', 'Dhatukatha', 'Puggalapannatti', 'Kathavatthu', 'Yamaka',
];
const PTS_ABBREVIATIONS = ['DN', 'MN', 'SN', 'AN', 'D', 'M', 'S', 'A', 'Vin', 'Vv', 'Pv', 'Ap', 'Bv', 'Cp', 'Ja', 'J', 'Nidd',
  'Patis', 'Ps', 'Mil', 'Nett', 'Pet', 'Dhs', 'Vibh', 'Kv', 'Pp', 'Pug', 'Dhatuk', 'Yam', 'Khp'];
const ROMAN = '(?:I{1,3}|IV|VI{0,2}|i{1,3}|iv|vi{0,2})';
const VINAYA = '(?:Pj|Ss|Ay|Np|Pc|Pd|Sk|Kd|Mv|Cv|Pvr|Parajika|Sanghadisesa|Aniyata|Nissaggiya|Pacittiya|Patidesaniya|Sekhiya|Adhikaranasamatha|Khandhaka)';
const LOWER_IDS = ['dn', 'mn', 'sn', 'an', 'kp', 'dhp', 'ud', 'iti', 'snp', 'vv', 'pv', 'thag', 'thig', 'bv', 'cp', 'ja', 'mnd', 'cnd', 'mil', 'ne', 'pe', 'kv', 'ds', 'vb', 'patthana'];
// These source IDs always have multiple numeric parts. Do not turn an ordinary 'pp3 file' into a citation.
const MACHINE_ID = `(?:(?:${LOWER_IDS.join('|')})\\d+(?:\\.\\d+)*|(?:ps|dt|pp|ya)\\d+(?:\\.\\d+)+)(?:-\\d+)?(?::\\d+(?:\\.\\d+)*)?`;
const LINK_HOSTS = /^(?:www\.)?(?:suttacentral\.net|accesstoinsight\.org|dhammatalks\.org|ancient-buddhist-texts\.net)$/i;
const EDITION_HEAD = `(?:${Object.keys(EDITION_WORDS).sort((a, b) => b.length - a.length).join('|')})(?:\\.?\\s*ed(?:ition)?\\.?)?[\\s.:,]+`;
const EDITION_SCOPE = [...new Set([...ABBREVIATIONS, ...FULL_NAMES, ...Object.keys(citationTables.COLLECTIONS), ...Object.keys(VINAYA_SCOPES)])]
  .sort((a, b) => b.length - a.length).join('|');
// Keep invalid Roman volumes/ranges as edition candidates too: never reinterpret their interior as a text or PTS page.
const EDITION_PAGE = `(?:${ROMAN}(?:\\.\\s*|\\s+))?(?:(?:volume|vol)\\.?\\s*)?\\d+(?:(?:\\s*[.:,]\\s*|\\s+(?:(?:pages?|pp|p)\\.?\\s*)?)\\d+)*(?:\\s*[-–—]\\s*\\d+(?:[.:]\\d+)*)?`;

// Each pattern runs on folded text; offsets are mapped back to the original input.
// Lower `rank` wins when two candidates overlap at the same start.
const PATTERNS = [
  { scheme: 'link', rank: 0, re: /https?:\/\/[^\s<>"'()[\]{}]+/giu },
  { scheme: 'edition', rank: 0, re: new RegExp(`${BOUND_BEFORE}${EDITION_HEAD}(?:${EDITION_SCOPE})\\.?\\s*${EDITION_PAGE}${BOUND_AFTER}`, 'giu') },
  { scheme: 'pts', rank: 1, re: new RegExp(`${BOUND_BEFORE}(?:PTS[: ]\\s?)?(?:${PTS_ABBREVIATIONS.join('|')})(?:\\.\\s?|\\s)${ROMAN}(?:\\.\\s?|\\s)\\d+${BOUND_AFTER}`, 'gu') },
  { scheme: 'vinaya', rank: 2, re: new RegExp(`${BOUND_BEFORE}(?:Vinaya\\s)?(?:(?:Bu|Bi|Bhikkhu|Bhikkhuni)\\s?)?${VINAYA}\\s?${NUM}${BOUND_AFTER}`, 'gu') },
  { scheme: 'vinaya', rank: 2, re: new RegExp(`${BOUND_BEFORE}Vinaya\\s(?:Mahavagga|Cul?lavagga)\\s?${NUM}${BOUND_AFTER}`, 'giu') },
  { scheme: 'number', rank: 3, re: new RegExp(`${BOUND_BEFORE}(?:${ABBREVIATIONS.join('|')})\\.?\\s?${NUM}${BOUND_AFTER}`, 'gu') },
  { scheme: 'number', rank: 3, re: new RegExp(`${BOUND_BEFORE}(?:${FULL_NAMES.join('|')})\\s${NUM}${BOUND_AFTER}`, 'giu') },
  { scheme: 'id', rank: 4, re: new RegExp(`(?<![\\p{L}\\p{N}_/.-])(?:${MACHINE_ID}|pli-tv-[a-z-]+?\\d+(?:\\.\\d+)*(?:-\\d+)?|th[ai]-ap\\d+)${BOUND_AFTER}`, 'gu') },
];

/**
 * Remove diacritics (precomposed or combining) and keep, for every folded character, the UTF-16 offset
 * of the input character it came from, so matches in the folded text map back to exact input offsets.
 */
export function foldWithOffsets(text) {
  let folded = '';
  const offsets = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const code = ch.charCodeAt(0);
    if (code >= 0x80 && /\p{M}/u.test(ch)) continue; // combining mark (decomposed input)
    // Supported native decimal numerals map one-for-one; preserve prose case and original offsets.
    folded += code >= 0x80 && /\p{Nd}/u.test(ch) ? romanizeInput(ch).text
      : code < 0x80 || (code >= 0xd800 && code <= 0xdfff) ? ch : ch.normalize('NFD')[0];
    offsets.push(i);
  }
  offsets.push(text.length);
  return { folded, offsets };
}

function trimLink(raw) {
  return raw.replace(/[.,;:!?]+$/, '');
}

/** Candidate spans without resolving them. Source book names retain recognised parenthetical edition qualifiers. */
export function scan(text, { editionBookNames = [] } = {}) {
  const { folded, offsets } = foldWithOffsets(text);
  // Map a folded span back to the input, keeping combining marks that follow its last character.
  const span = (start, end) => {
    let to = offsets[end - 1] + 1;
    while (to < text.length && /\p{M}/u.test(text[to])) to += 1;
    return [offsets[start], to];
  };
  const found = [];
  for (const { scheme, rank, re } of PATTERNS) {
    re.lastIndex = 0;
    for (const m of folded.matchAll(re)) {
      const length = scheme === 'link' ? trimLink(m[0]).length : m[0].length;
      const [start, baseEnd] = span(m.index, m.index + length);
      let end = baseEnd;
      if (scheme === 'edition') {
        const qualifier = text.slice(end).match(/^\s*\(([^()\r\n]{1,100})\)/u);
        // Only consume a book qualifier supported by the source index; ordinary parenthetical prose stays separate.
        if (qualifier && editionBookNames.some((title) => matchesEditionBook(title, qualifier[1]))) end += qualifier[0].length;
      }
      if (scheme === 'link') {
        let host = '';
        try { host = new URL(text.slice(start, end)).hostname; } catch { /* not a URL */ }
        if (!LINK_HOSTS.test(host)) continue;
      }
      found.push({ start, end, scheme, rank });
    }
  }
  // Keep the earliest span; at the same start the longer, then the higher-ranked one; drop overlaps.
  found.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start) || a.rank - b.rank);
  const kept = [];
  let until = -1;
  for (const c of found) {
    if (c.start < until) continue;
    kept.push({ start: c.start, end: c.end, text: text.slice(c.start, c.end), scheme: c.scheme });
    until = c.end;
  }
  return kept;
}

export const MAX_TEXT = 200000;
export const MAX_RESULTS = 500;
export const MAX_REPORT_BYTES = 256 * 1024;
export const MAX_TOOL_RESULT_BYTES = 1024 * 1024;
// Bump this epoch when scanner/resolver semantics change; cursors are not authentication tokens.
const CURSOR_VERSION = 'v1';
const RECORD_BUDGET = MAX_REPORT_BYTES - 8192;
const indexScopes = new WeakMap();
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function reportScope(text, canon) {
  const loaded = canon.load();
  const data = loaded.canon;
  let index = indexScopes.get(loaded);
  if (!index) {
    // Bundled data is immutable. Include indexed boundaries, not just the upstream source commit.
    const digest = createHash('sha256');
    digest.update(JSON.stringify([data.source, data.collections, data.units, [...(loaded.urlIndex || [])]]));
    // Hash one book at a time to avoid another full-corpus JSON allocation.
    for (const book of data.books) digest.update(JSON.stringify(book));
    index = digest.digest('hex');
    indexScopes.set(loaded, index);
  }
  // JSON preserves exact UTF-16 input, including lone surrogates and decomposed characters.
  return hash([CURSOR_VERSION, index, text]);
}

function cursorOffset(cursor, scope) {
  if (cursor === undefined) return 0;
  const m = typeof cursor === 'string' && cursor.match(/^(v\d+):([a-f0-9]{64}):([1-9]\d{0,5}):([a-f0-9]{16})$/);
  if (!m || m[1] !== CURSOR_VERSION || m[2] !== scope || m[4] !== hash([scope, Number(m[3])]).slice(0, 16)) throw new Error('Invalid citation cursor or changed text/bundled index. Restart without cursor; otherwise reuse the identical original text and next_cursor unchanged.');
  return Number(m[3]);
}

function unchecked(span) {
  return { start: span.start, end: span.end, scheme: span.scheme, status: 'not_checked',
    text_preview: span.text.slice(0, 512), text_omitted: true, text_length: span.text.length,
    reason: 'This citation candidate exceeds the report processing/response bound. No resolved or unresolved verdict was made. Inspect the full candidate using its offsets in the original input.' };
}

/** Find, resolve and report every citation in `text`. */
export function findCitations(text, canon, { limit = MAX_RESULTS, cursor } = {}) {
  if (typeof text !== 'string' || !text.length || text.length > MAX_TEXT) throw new Error(`text must contain 1 to ${MAX_TEXT} characters.`);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RESULTS) throw new Error(`limit must be an integer from 1 to ${MAX_RESULTS}.`);
  const scope = reportScope(text, canon);
  const offset = cursorOffset(cursor, scope);
  const spans = scan(text, { editionBookNames: canon.load().canon.books.map((book) => book.title) });
  if (offset && offset >= spans.length) throw new Error('Citation cursor is outside this report. Restart without cursor.');
  const resolveSpan = (span) => {
    if (span.text.length > 2048) return unchecked(span);
    try {
      // URLs retain their literal identity; only textual citations undergo script conversion.
      const input = span.scheme === 'link' ? { text: span.text } : romanizeLookupInput(span.text);
      const { unit, notes, alternatives } = canon.resolve(input.text.normalize('NFC'));
      return {
        ...span, ...inputNote(input), status: 'resolved', text_id: unit.id, citation: unit.acronym, title: unit.title || null,
        ...(notes.length ? { notes } : {}),
        ...(alternatives.length ? { also_on_that_page: alternatives.map((a) => a.id) } : {}),
      };
    } catch (error) {
      return { ...span, status: 'unresolved', reason: error.message || 'Could not resolve.' };
    }
  };
  const citations = [];
  let bytes = 2;
  for (let i = offset; i < spans.length && citations.length < limit; i++) {
    let record = resolveSpan(spans[i]);
    let size = Buffer.byteLength(JSON.stringify(record)) + 1;
    if (size > RECORD_BUDGET) { record = unchecked(spans[i]); size = Buffer.byteLength(JSON.stringify(record)) + 1; }
    if (bytes + size > RECORD_BUDGET) break;
    citations.push(record); bytes += size;
  }
  const resolved = citations.filter((c) => c.status === 'resolved').length;
  const unresolved = citations.filter((c) => c.status === 'unresolved').length;
  const next = offset + citations.length;
  const source = canon.source();
  const report = {
    found: spans.length,
    offset, limit,
    returned: citations.length,
    resolved,
    unresolved,
    not_checked: citations.length - resolved - unresolved,
    counts_scope: 'resolved, unresolved and not_checked count only this returned page; found counts the whole input.',
    next_cursor: next < spans.length ? `${CURSOR_VERSION}:${scope}:${next}:${hash([scope, next]).slice(0, 16)}` : null,
    pagination: 'Reuse the identical original text and pass next_cursor as cursor. limit may change. Citation offsets always refer to that original text. No input text is stored or echoed for continuation. truncated means this page contains only part of the report; next_cursor indicates whether later matches remain.',
    max_report_bytes: MAX_REPORT_BYTES,
    max_tool_result_bytes: MAX_TOOL_RESULT_BYTES,
    ...(spans.length > citations.length ? { truncated: true } : {}),
    offsets: 'start and end are UTF-16 code-unit offsets into the input, end exclusive (JavaScript String.slice).',
    citations,
    scope: 'Citations are found by pattern; a citation the scanner did not recognise is not checked. Supported native numerals are accepted with Roman citation names; native-script names are not scanned. URLs retain their literal identity. Printed edition prefixes are retained, with parenthetical book qualifiers recognised from the bundled source titles. Unresolved citations are reported, never corrected. Abbreviations that read as English in prose (single letters before a bare number, It, Ps, Pe, Ne, Pp, Ya, Dt, As) are skipped; write MN, SN, Iti, Paṭis and so on, or check one citation with resolve_reference.',
    source: { name: source.name, attribution: source.attribution, terms: source.terms },
  };
  if (Buffer.byteLength(JSON.stringify(report)) > MAX_REPORT_BYTES) throw new Error('Citation report metadata exceeds its response bound. No partial report was returned.');
  return report;
}

export function register({ tool, z, canon }) {
  tool('find_citations', 'Find every Pāli Canon citation in a piece of free text (an essay, a talk transcript, a paper\'s references) and check each one against the bundled canon. Mixed schemes are understood: MN 10, SN 56:11, AN 3.65, Dhp 183, Snp 1.8, Pj 1, Kd 1, printed edition pages like Thai MN 1.103 or VRI SN 1.20 (Nidānavaggo), PTS pages like M i 55 or S v 420, canonical IDs like ja526, ps3.2 and ya1.1.1, Bilara anchors like sn56.11:5.1, and suttacentral.net / accesstoinsight.org / dhammatalks.org / ancient-buddhist-texts.net links. Supports native numerals with Roman citation names, preserving original text and offsets; native-script names are not scanned. Returns each citation with its character offsets, the text it names (ID, title) or, when it does not resolve, the reason. Paginate with next_cursor and unchanged text; counts are per page except found. Oversized candidates are marked not_checked, never verified. Works offline.', {
    text: z.string().min(1).max(MAX_TEXT).describe('The free text to scan, up to 200,000 characters.'),
    limit: z.number().int().min(1).max(MAX_RESULTS).default(MAX_RESULTS).describe('Maximum citations on this page. Structured reports also have a 256 KiB JSON byte budget, so a page can be shorter. Counts other than found describe this page.'),
    cursor: z.string().max(100).optional().describe('Opaque next_cursor from the preceding report. Reuse the identical original text; changed input or bundled index is rejected. Do not supply an offset or edit the cursor.'),
  }, ({ text, ...options }) => findCitations(text, canon, options));
}
