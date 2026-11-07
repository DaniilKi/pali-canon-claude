/**
 * Abhidhamma navigation aids built from the bundled VRI text only:
 *  - the mātikā (matrix) of the Dhammasaṅgaṇī: the 22 triads (tika), the 100 Abhidhamma dyads (duka)
 *    in their groups, and the 42 Suttanta dyads, each with its VRI paragraph and segment location;
 *  - the 24 conditions (paccaya) of the Paṭṭhāna: names from the paccayuddesa, each pointing to its
 *    definition in the paccayaniddesa. No English is supplied here; a lookup_pali pointer is given instead.
 * Every Pāli heading is read from the bundled text at runtime; nothing is reconstructed.
 */
import * as bundled from './canon.mjs';
import { withNormalised } from './input.mjs';

const MATIKA_UNITS = [
  { id: 'ds1.1', key: 'tika', kind: 'tika' },
  { id: 'ds1.2', key: 'duka', kind: 'duka' },
  { id: 'ds1.3', key: 'suttantika', kind: 'duka' },
];
const PATTHANA_UNIT = 'patthana1.1';
const ITEM = /^\((Ka|Kha|Ga|Gha)\)\s*(.*)$/;
const strip = (text) => String(text ?? '').replace(/<[^>]+>/g, '').trim();
const unitById = (canon, id) => {
  const unit = canon.load().byId.get(id);
  if (!unit) throw new Error(`Bundled text ${id} is missing from the canon data.`);
  return unit;
};

// No English names or explanations are written into this module (D1, library not teacher): for an English
// meaning the result points to lookup_pali, the Digital Pāḷi Dictionary tool, with the Pāli term from the text.
export const DICTIONARY_NOTE = 'For an English meaning, look the Pāli term up with lookup_pali (Digital Pāḷi Dictionary). Dictionary glosses are reference material, not scripture and not a translation of this definition.';

const locate = (unit, first, count) => ({
  text_id: unit.id,
  citation: unit.acronym,
  segment_ref: `${unit.id}/${first + 1}`,
  get_text: { uid: unit.acronym, offset: first, limit: count },
  read_with: { tool: 'get_text', uid: unit.id, offset: first, limit: count },
});

// Parsed results are cached per canon object, so a different canon passed in gets its own parse.
const matikaCache = new WeakMap();

/** Parse the Dhammasaṅgaṇī mātikā from the bundled VRI blocks. */
export function buildMatika(canon = bundled) {
  if (matikaCache.has(canon)) return matikaCache.get(canon);
  const sections = MATIKA_UNITS.map(({ id, key, kind }) => {
    const unit = unitById(canon, id);
    const segs = canon.segments(unit);
    const entries = [];
    let group = null;
    let current = null;
    segs.forEach((seg, i) => {
      const text = strip(seg.text);
      if (seg.type === 'heading') {
        if (key === 'duka' && !/mātikā$/i.test(text)) group = text;
        return;
      }
      const m = text.match(ITEM);
      if (!m) return;
      if (seg.vri_paragraph) {
        current = { number: Number(seg.vri_paragraph), kind, ...(group ? { group } : {}), items: [], first: i, last: i };
        entries.push(current);
      }
      if (!current) return;
      current.items.push({ label: m[1], text: m[2] });
      current.last = i;
    });
    // The section's own heading is the last "…mātikā" heading before its first entry (Ds 1.1 opens with the book's "Mātikā" chapter heading first).
    const firstEntry = entries.length ? entries[0].first : segs.length;
    const heading = segs.slice(0, firstEntry).filter((s) => s.type === 'heading' && /mātikā$/i.test(strip(s.text))).pop();
    return {
      key,
      text_id: unit.id,
      citation: unit.acronym,
      title: unit.title,
      heading: heading ? strip(heading.text) : unit.title,
      vri_paragraphs: unit.vri,
      entries: entries.map(({ first, last, ...e }) => ({ ...e, vri_paragraph: String(e.number), ...locate(unit, first, last - first + 1) })),
    };
  });
  matikaCache.set(canon, sections);
  return sections;
}

const stem = (value) => bundled.fold(value).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const groupStem = (heading) => stem(heading).replace(/m$/, '').replace(/(gocchaka|duka)$/, '');

function source(canon) {
  const s = canon.source();
  return { edition: 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI), Pāli', attribution: s.attribution, terms: s.terms, source: s };
}

function groupsOf(section) {
  const groups = [];
  for (const e of section.entries) {
    const g = e.group || null;
    if (!groups.length || groups[groups.length - 1].heading !== g) groups.push({ heading: g, from: e.number, to: e.number, count: 0 });
    const last = groups[groups.length - 1];
    last.to = e.number;
    last.count += 1;
  }
  return groups.filter((g) => g.heading);
}

/** abhidhamma_matika: overview without a section, or the entries of a section, group or single triad/dyad. */
export function matika(section, canon = bundled) {
  const sections = buildMatika(canon);
  const base = { book: 'Dhammasaṅgaṇī', ...source(canon) };
  const overview = () => ({
    ...base,
    sections: sections.map((s) => ({
      section: s.key, heading: s.heading, text_id: s.text_id, citation: s.citation, vri_paragraphs: s.vri_paragraphs,
      entries: s.entries.length,
      read_with: { tool: 'abhidhamma_matika', section: s.key },
      ...(groupsOf(s).length ? { groups: groupsOf(s).map((g) => ({ heading: g.heading, dyads: `${g.from}–${g.to}`, count: g.count,
        read_with: { tool: 'abhidhamma_matika', section: g.heading } })) } : {}),
    })),
    usage: 'Pass section "tika", "duka", "suttantika", a dyad group such as "hetugocchaka", or one entry such as "tika 5" or "duka 101". Read the full text with get_text using the returned uid and offset.',
  });
  if (section === undefined || section === null || !String(section).trim() || stem(section) === 'all') return overview();
  const wanted = stem(section);
  // Never turn a negative, decimal or range into a different valid entry by stripping punctuation.
  const literal = bundled.fold(section).trim();
  const one = literal.match(/^(tika|duka|triad|dyad)\s*(\d+)$/);
  if (!one && /^(tika|duka|triad|dyad)/.test(literal) && /\d/.test(literal)) {
    throw new Error(`Invalid mātikā entry "${section}". Give a positive whole entry number, e.g. "tika 5" or "duka 101"; ranges, signs and decimals are not entry selectors.`);
  }
  if (one) {
    const n = Number(one[2]);
    const pool = /^(tika|triad)$/.test(one[1]) ? sections.filter((s) => s.key === 'tika') : sections.filter((s) => s.key !== 'tika');
    const entry = pool.flatMap((s) => s.entries).find((e) => e.number === n);
    if (!entry) throw new Error(`No ${one[1]} ${n} in the Dhammasaṅgaṇī mātikā: triads are numbered 1–22, dyads 1–142 (1–100 Abhidhamma, 101–142 Suttanta).`);
    return { ...base, entries: [entry] };
  }
  const aliases = { tika: ['tika', 'tikamatika', 'triads', 'triad'], duka: ['duka', 'dukamatika', 'abhidhammaduka', 'abhidhammadukamatika', 'abhidhamma duka', 'dyads', 'dyad'], suttantika: ['suttantika', 'suttanta', 'suttantikaduka', 'suttantikadukamatika', 'suttanta duka', 'suttanta dyads'] };
  const compact = literal.replace(/\s+/g, '');
  const bySection = sections.find((s) => aliases[s.key].includes(wanted) || s.text_id === compact);
  if (bySection) {
    const { entries, ...meta } = bySection;
    return { ...base, section: meta.key, heading: meta.heading, text_id: meta.text_id, citation: meta.citation, vri_paragraphs: meta.vri_paragraphs, entries };
  }
  const duka = sections.find((s) => s.key === 'duka');
  const group = groupsOf(duka).find((g) => stem(g.heading) === wanted || groupStem(g.heading) === wanted.replace(/m$/, '').replace(/(gocchaka|duka)$/, '').trim());
  if (group) {
    return { ...base, section: 'duka', group: group.heading, entries: duka.entries.filter((e) => e.group === group.heading) };
  }
  throw new Error(`Unknown mātikā section "${section}". Use tika, duka, suttantika, one of the dyad groups (${groupsOf(duka).map((g) => g.heading).join(', ')}), or an entry such as "tika 5" or "duka 101".`);
}

const conditionsCache = new WeakMap();

/** Parse the 24 conditions (paccayuddesa) and their definitions (paccayaniddesa) from the bundled Paṭṭhāna. */
export function buildConditions(canon = bundled) {
  if (conditionsCache.has(canon)) return conditionsCache.get(canon);
  const unit = unitById(canon, PATTHANA_UNIT);
  const segs = canon.segments(unit);
  const uddesaHeading = segs.findIndex((s) => s.type === 'heading' && /Paccayuddeso$/.test(strip(s.text)));
  const niddesaHeading = segs.findIndex((s) => s.type === 'heading' && /Paccayaniddeso$/.test(strip(s.text)));
  if (uddesaHeading < 0 || niddesaHeading < 0) throw new Error('The Paṭṭhāna paccayuddesa or paccayaniddesa was not found in the bundled text.');
  const uddesaIndex = uddesaHeading + 1;
  const uddesa = strip(segs[uddesaIndex].text);
  const names = uddesa.replace(/ti\.?$/, '').split(/,\s*/).map((n) => n.trim()).filter(Boolean);
  const conditions = names.map((name, i) => {
    const key = bundled.fold(name).replace(/paccayo$/, '');
    const start = segs.findIndex((s, j) => j > niddesaHeading && s.vri_paragraph && bundled.fold(strip(s.text)).startsWith(`${bundled.fold(name)}ti`));
    if (start < 0) throw new Error(`No definition found for ${name} in the bundled Paṭṭhāna.`);
    let end = start + 1;
    while (end < segs.length && !segs[end].vri_paragraph && segs[end].type === 'prose' && !/Paccayaniddeso\.$/.test(strip(segs[end].text))) end += 1;
    const definition = segs.slice(start, end).map((s) => strip(s.text));
    return {
      number: i + 1,
      name,
      key,
      definition: {
        opening: definition[0].split(/\s+–\s+/)[0],
        vri_paragraph: segs[start].vri_paragraph,
        ...locate(unit, start, end - start),
        text: definition,
      },
      listed_in: { heading: strip(segs[uddesaHeading].text), ...locate(unit, uddesaIndex, 1) },
    };
  });
  conditionsCache.set(canon, conditions);
  return conditions;
}

/** patthana_condition: one condition by Pāli name or number 1–24, or "all" for the list. */
export function condition(name, canon = bundled) {
  const conditions = buildConditions(canon);
  const base = { book: 'Paṭṭhāna', ...source(canon) };
  const withDictionary = (c, full) => {
    const term = c.name.replace(/paccayo$/i, '').toLowerCase();
    const out = { number: c.number, name: c.name, read_with: { tool: 'patthana_condition', name: String(c.number) },
      dictionary: { tool: 'lookup_pali', word: term, note: DICTIONARY_NOTE } };
    if (!full) {
      const { text, ...where } = c.definition;
      return { ...out, definition: where };
    }
    return { ...out, definition: c.definition, listed_in: c.listed_in };
  };
  const raw = String(name ?? '').trim();
  const wanted = stem(raw);
  if (!wanted || wanted === 'all' || wanted === 'list') {
    return { ...base, count: conditions.length, conditions: conditions.map((c) => withDictionary(c, false)),
      usage: 'Pass one Pāli name (hetu, ārammaṇapaccayo) or number 1–24 for its full definition text.' };
  }
  const key = wanted.replace(/\s*(paccayo|paccaya)$/, '').replace(/ /g, '');
  // Numbers are checked on the raw input: only 1–24 written as plain digits ("-1" or "1.5" are not numbers here).
  const found = /^\d{1,2}$/.test(raw) ? (Number(raw) >= 1 && Number(raw) <= conditions.length ? conditions[Number(raw) - 1] : undefined)
    : /\d/.test(raw) ? undefined
      : conditions.find((c) => c.key === key || bundled.fold(c.name) === key);
  if (!found) {
    throw new Error(`Unknown Paṭṭhāna condition "${raw}". The 24 conditions are: ${conditions.map((c) => c.name).join(', ')}.`);
  }
  return { ...base, condition: withDictionary(found, true) };
}

export function register({ tool, z, canon }) {
  tool('abhidhamma_matika', 'Browse the mātikā (matrix) of the Dhammasaṅgaṇī: the 22 triads (tika), the 100 Abhidhamma dyads (duka) in their groups and the 42 Suttanta dyads, in Pāli from the bundled VRI text, each with its VRI paragraph and an exact source read_with command. Without a section it returns an overview with section and group commands. Entry selectors require a positive whole number. Works offline.', {
    section: z.string().max(60).optional().describe('"tika", "duka", "suttantika", a dyad group such as "hetugocchaka" or "āsava", or one entry such as "tika 5" or "duka 101". Omit for an overview.'),
  }, ({ section }) => matika(section, canon));

  tool('patthana_condition', 'One of the 24 conditions (paccaya) of the Paṭṭhāna: its Pāli name from the bundled VRI text, exact source reading commands and Pāli text of its definition (paccayaniddesa), and the Pāli term to look up with lookup_pali for an English dictionary meaning. Pass "all" for the list. Works offline.', {
    name: z.string().trim().min(1).max(60).describe('Pāli name (hetu, hetupaccayo, ārammaṇa…), a number 1–24, or "all".'),
  }, ({ name }) => withNormalised(name, (n) => condition(n, canon)));
}
