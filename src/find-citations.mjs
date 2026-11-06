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
const LOWER_IDS = ['dn', 'mn', 'sn', 'an', 'kp', 'dhp', 'ud', 'iti', 'snp', 'vv', 'pv', 'thag', 'thig', 'bv', 'mnd', 'cnd', 'mil', 'kv', 'ds', 'vb', 'patthana'];
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
  { scheme: 'id', rank: 4, re: new RegExp(`(?<![\\p{L}\\p{N}_/.-])(?:(?:${LOWER_IDS.join('|')})\\d+(?:\\.\\d+)*(?:-\\d+)?(?::\\d+(?:\\.\\d+)*)?|pli-tv-[a-z-]+?\\d+(?:\\.\\d+)*(?:-\\d+)?|th[ai]-ap\\d+)${BOUND_AFTER}`, 'gu') },
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
    folded += code < 0x80 || (code >= 0xd800 && code <= 0xdfff) ? ch : ch.normalize('NFD')[0];
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

/** Find, resolve and report every citation in `text`. */
export function findCitations(text, canon, { limit = MAX_RESULTS } = {}) {
  const spans = scan(text, { editionBookNames: canon.load().canon.books.map((book) => book.title) });
  const citations = spans.slice(0, limit).map((span) => {
    try {
      const { unit, notes, alternatives } = canon.resolve(span.text.normalize('NFC'));
      return {
        ...span, status: 'resolved', text_id: unit.id, citation: unit.acronym, title: unit.title || null,
        ...(notes.length ? { notes } : {}),
        ...(alternatives.length ? { also_on_that_page: alternatives.map((a) => a.id) } : {}),
      };
    } catch (error) {
      return { ...span, status: 'unresolved', reason: error.message || 'Could not resolve.' };
    }
  });
  const resolved = citations.filter((c) => c.status === 'resolved').length;
  const source = canon.source();
  return {
    found: spans.length,
    returned: citations.length,
    resolved,
    unresolved: citations.length - resolved,
    ...(spans.length > citations.length ? { truncated: true } : {}),
    offsets: 'start and end are UTF-16 code-unit offsets into the input, end exclusive (JavaScript String.slice).',
    citations,
    scope: 'Citations are found by pattern; a citation the scanner did not recognise is not checked. Printed edition prefixes are retained, with parenthetical book qualifiers recognised from the bundled source titles. Unresolved citations are reported, never corrected. Abbreviations that read as English in prose (single letters before a bare number, It, Ps, Pe, Ne, Pp, Ya, Dt, As) are skipped; write MN, SN, Iti, Paṭis and so on, or check one citation with resolve_reference.',
    source: { name: source.name, attribution: source.attribution, terms: source.terms },
  };
}

export function register({ tool, z, canon }) {
  tool('find_citations', 'Find every Pāli Canon citation in a piece of free text (an essay, a talk transcript, a paper\'s references) and check each one against the bundled canon. Mixed schemes are understood: MN 10, SN 56:11, AN 3.65, Dhp 183, Snp 1.8, Pj 1, Kd 1, printed edition pages like Thai MN 1.103 or VRI SN 1.20 (Nidānavaggo), PTS pages like M i 55 or S v 420, Bilara IDs like sn56.11:5.1, and suttacentral.net / accesstoinsight.org / dhammatalks.org / ancient-buddhist-texts.net links. Returns each citation with its character offsets, the text it names (ID, title) or, when it does not resolve, the reason. Works offline.', {
    text: z.string().min(1).max(MAX_TEXT).describe('The free text to scan, up to 200,000 characters.'),
  }, ({ text }) => findCitations(text, canon));
}
