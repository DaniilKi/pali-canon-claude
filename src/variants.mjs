// Structured variant readings (issue #28).
//
// VRI's Chaṭṭha Saṅgāyana XML records, in <note> elements, readings found in other printed
// editions, e.g. "pīti (sī. pī.), pītī (ka.)": the reading "pīti" is in the Sinhala and PTS
// editions, "pītī" in the edition marked "ka.". The same element is also used for
// cross-references ("dī. ni. 1.157") and editorial remarks. This module splits a note into
// readings and the editions (sigla) that carry them. It never rewrites the Pāli: every
// reading is a verbatim substring of the note, the raw note is always returned with it, and
// anything it cannot classify with certainty is returned as a verbatim remark.
//
// The bundled data keeps notes per paragraph, not at the word they follow, so the base
// (Chaṭṭha Saṅgāyana) word a variant replaces is not identified here.
import * as canon from './canon.mjs';

const VRI_KEY = 'VRI, "Help viewing the Tipitaka", https://tipitaka.org/help (list of version abbreviations)';

/** Edition sigla used in VRI notes. Meanings from VRI's own key; see docs/glossary.md. */
export const SIGLA = {
  'sī.': { edition: 'Sri Lankan', source: VRI_KEY },
  'syā.': { edition: 'Thai', source: VRI_KEY },
  'pī.': { edition: 'Pali Text Society', source: VRI_KEY },
  'kaṃ.': { edition: 'Cambodian', source: VRI_KEY },
  'ka.': {
    edition: 'Cambodian', source: VRI_KEY,
    caveat: 'VRI lists both "kaṃ." and "ka." as Cambodian, yet some notes cite both side by side; the siglum is kept as printed and never merged with "kaṃ.".',
  },
};

/** Words in a siglum group that qualify the editions rather than name one. */
const SCOPES = {
  sabbattha: 'all (other) editions', // "everywhere"
  bahūsu: 'many editions', // "in many"
  katthaci: 'some editions', // "somewhere"
};
/** Modifiers: the reading is in that edition's commentary or sub-commentary, not its root text. */
const PARTS = { 'aṭṭha.': 'commentary', 'ṭīkā': 'sub-commentary' };

// Spelling slips in the source normalised for matching only; `as_printed` keeps the original.
const SIGLUM_ALIASES = {
  'sī': 'sī.', 'si.': 'sī.', 'syā': 'syā.', 'pī': 'pī.', 'kaṃ': 'kaṃ.', 'ka': 'ka.',
};
const SCOPE_ALIASES = { ssabbattha: 'sabbattha', sabbatha: 'sabbattha', bahūsū: 'bahūsu', katthacī: 'katthaci' };
const PART_ALIASES = { 'aṭṭha': 'aṭṭha.', 'ṭṭha.': 'aṭṭha.', 'ṭīkā': 'ṭīkā' };

const siglum = (t) => (SIGLA[t] ? t : SIGLUM_ALIASES[t]);

/**
 * Parse the text inside one pair of parentheses: "sī. syā. kaṃ. pī.", "sī. aṭṭha., ka. aṭṭha.",
 * "sabbattha", "ka. saṃ. ni. 1.122". Returns { editions, scope?, remark? } or null when it does not
 * open with a known siglum or scope word.
 */
export function parseSigla(group) {
  const editions = [];
  let scope;
  const remarks = [];
  for (const part of group.split(/[,;]\s*/)) {
    // Tokens with their offsets, so an unparsed tail is returned exactly as printed.
    const tokens = [];
    for (const m of part.matchAll(/[^\s§]+/g)) {
      const pieces = m[0].match(/[^.]+\./g);
      // "sī.pī." (no space) splits only when every piece is a siglum.
      if (!siglum(m[0]) && pieces && pieces.join('') === m[0] && pieces.length > 1 && pieces.every(siglum)) {
        let at = m.index;
        for (const x of pieces) { tokens.push({ t: x, at }); at += x.length; }
      } else tokens.push({ t: m[0], at: m.index });
    }
    let i = 0;
    let found = false;
    while (i < tokens.length) {
      const t = tokens[i].t;
      const s = siglum(t);
      if (s) {
        const e = { siglum: s, edition: SIGLA[s].edition };
        if (t !== s) e.as_printed = t;
        const next = tokens[i + 1]?.t;
        const p = PARTS[next] ? next : PART_ALIASES[next];
        if (p) { e.part = PARTS[p]; i += 1; }
        editions.push(e);
        found = true;
        i += 1;
        continue;
      }
      const sc = SCOPES[t] ? t : SCOPE_ALIASES[t];
      if (sc && !scope) { scope = { word: sc, meaning: SCOPES[sc] }; found = true; i += 1; continue; }
      break;
    }
    // Whatever does not parse (a cross-reference, a comment, a bare "aṭṭha.") stays verbatim.
    if (!found) remarks.push(part.trim());
    else if (i < tokens.length) remarks.push(part.slice(tokens[i].at).trim());
  }
  if (!editions.length && !scope) return null;
  const out = { editions };
  if (scope) out.scope = scope;
  const remark = remarks.filter(Boolean).join(', ');
  if (remark) out.remark = remark;
  return out;
}

/**
 * Parse one VRI note into { raw, readings[], remarks[] }.
 * readings: { reading, editions: [{ siglum, edition, part? }], scope?, remark? }, where `reading` is
 * the verbatim text that precedes the parenthesis. remarks: verbatim leftovers (cross-references,
 * editorial comments, "(?)" queries) that are not readings attributed to an edition.
 */
export function parseNote(raw) {
  const readings = [];
  const remarks = [];
  const re = /([^()]*)\(([^()]*)\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(raw))) {
    last = re.lastIndex;
    const before = m[1].replace(/^[\s,;]+|[\s,;]+$/g, '');
    const sig = parseSigla(m[2]);
    // Pāli readings carry no digits; a digit means a cross-reference ("a. ni. 9.38") is mixed in,
    // so the piece is kept as a remark rather than risk attributing a reference as a reading.
    if (sig && before && !/\d/.test(before)) {
      readings.push({ reading: before, ...sig });
    } else {
      // Not a reading we can attribute: keep the whole piece verbatim.
      const piece = m[0].replace(/^[\s,;]+|[\s,;]+$/g, '');
      if (piece) remarks.push(piece);
    }
  }
  const tail = raw.slice(last).replace(/^[\s,;]+|[\s,;]+$/g, '');
  if (tail) remarks.push(tail);
  return { raw, readings, remarks };
}

/** Legend for the sigla that appear in a list of parsed notes. */
export function legend(parsed) {
  const used = new Set();
  for (const p of parsed) for (const r of p.readings) for (const e of r.editions) used.add(e.siglum);
  return Object.fromEntries([...used].map((s) => [s, SIGLA[s]]));
}

/** get_text `variants` modes. "raw" = the strings VRI records (`variant_readings`); "structured" = `variants`, each with the raw note and its parsed readings. */
export const VARIANT_MODES = ['none', 'raw', 'structured'];

/**
 * Segments of a text with variants in the requested mode. `includeVariants: true` (the original
 * boolean parameter) still means "raw"; an explicit `variants` takes precedence.
 */
export function textSegments(unit, { includeVariants = false, variants } = {}) {
  const mode = variants || (includeVariants ? 'raw' : 'none');
  const segs = canon.segments(unit, { includeNotes: mode !== 'none' });
  if (mode !== 'structured') return { segments: segs, mode };
  const all = [];
  for (const s of segs) {
    if (!s.variant_readings?.length) continue;
    s.variants = s.variant_readings.map(parseNote);
    delete s.variant_readings; // each structured entry keeps the note verbatim as `raw`
    all.push(...s.variants);
  }
  return { segments: segs, mode, all };
}

/** Extra fields for a get_text page in structured mode: the sigla legend and how to read it. */
export function structuredInfo(page) {
  const parsed = page.flatMap((s) => s.variants || []);
  return {
    variant_sigla: legend(parsed),
    variant_note: 'Each variant gives a reading found in other printed editions (by siglum) where they differ from this Chaṭṭha Saṅgāyana text; "raw" is VRI\'s note verbatim. The word replaced is not identified; locate it in the paragraph. Remarks are cross-references or editorial comments kept verbatim. Source: VRI notes (attribution as for the text).',
  };
}
