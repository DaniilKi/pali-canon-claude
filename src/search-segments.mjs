import { romanizeLookupInput, detectScript } from './script.mjs';
/** Search the same complete stanzas retrieval renders, without joining separate paragraphs or texts. */
const VERSE = new Set(['gatha1', 'gatha2', 'gatha3', 'gathalast']);

export const searchFold = (text, fold) => fold(text).replace(/\s+/gu, ' ');

const singleQuotedPhrase = text => /^"[^"]+"$|^“[^”]+”$/u.test(String(text).trim());
const latinLetter = text => [...String(text)].some(ch => /\p{L}/u.test(ch) && /\p{Script=Latin}/u.test(ch));
const foreignLetter = text => [...String(text)].some(ch => /\p{L}/u.test(ch) && !/\p{Script=Latin}/u.test(ch));
const foreignNumeral = text => [...String(text)].some(ch => /\p{N}/u.test(ch) && !/[0-9]/u.test(ch));

/** A complete quoted Roman-containing source phrase keeps unconverted glyphs inside the phrase. */
export const isSourcePhrase = text => singleQuotedPhrase(text) && latinLetter(text)
  && (detectScript(text) !== 'roman' || foreignLetter(text) || foreignNumeral(text));

export function romanizeSearchInput(query) {
  const text = String(query);
  try {
    const input = romanizeLookupInput(text);
    if (foreignNumeral(input.text)) throw new Error('The search input could not be converted completely. Use ASCII digits or one supported script; a quoted source phrase keeps its original numeral characters.');
    return input;
  } catch (error) {
    if (!isSourcePhrase(text)) throw error;
    return { text, script: 'roman', source_phrase: true };
  }
}

export const searchInputNote = input => input.source_phrase ? {
  query_mode: 'source_phrase',
  query_note: 'This quoted source phrase was kept as entered, without native-script conversion or spelling/English inference. Matching remains diacritic-insensitive, case-insensitive and whitespace-insensitive; this does not verify spelling, source-edition correctness or uniqueness.',
} : {};

/** Reject characters that loose word tokenization would silently discard. */
export function assertSearchQuery(query) {
  if ((foreignLetter(query) || foreignNumeral(query)) && !isSourcePhrase(query)) {
    throw new Error('Search query contains unsupported or unconverted letters or numerals. Use Roman Pāli or completely convert one supported script before searching.');
  }
}

/** Paired double quotes preserve phrase order; apostrophes remain ordinary Pāli punctuation. */
export function searchTerms(query, fold) {
  assertSearchQuery(query);
  const paired = /"([^"]+)"|“([^”]+)”/gu;
  const text = String(query);
  const phrases = [...text.matchAll(paired)]
    .map((match) => searchFold(match[1] ?? match[2], fold).trim()).filter(Boolean);
  const words = fold(text.replace(paired, ' ')).split(/[^a-z0-9]+/u).filter((word) => word.length > 1);
  return [...phrases, ...words];
}

// Even an unmatched quote must not silently opt into loose spelling/keyword retries.
export const hasSearchQuotes = (query) => /["“”]/u.test(query);
export const hasSearchPhrase = (query) => /"[^"]+"|“[^”]+”/u.test(query);

/** Map a search passage to the reader's actual source bounds, never by repeated paragraph numbers/text. */
export function searchReading(rendered, command, start, end, prefix) {
  const index = rendered.findIndex((s) => s.source_blocks[0] <= start && s.source_blocks[1] >= end);
  if (index < 0) throw new Error('Search passage has no containing source reading segment.');
  return { segment_ref: `${prefix}/${index + 1}`,
    read_with: { ...command, offset: index, limit: 1 },
    context_with: { ...command, offset: Math.max(0, index - 1), limit: 3 } };
}


export function searchSegments(blocks, owner = () => null) {
  const out = [];
  let stanza = null;
  let previousOwner;
  const flush = () => {
    if (stanza?.text) out.push(stanza);
    stanza = null;
  };
  blocks.forEach(([rend, , text], i) => {
    const currentOwner = owner(i);
    if (currentOwner !== previousOwner) flush();
    previousOwner = currentOwner;
    if (rend === 'hangnum') {
      flush();
      stanza = { start: i, end: i + 1, text: '' };
      return;
    }
    if (VERSE.has(rend)) {
      stanza ||= { start: i, end: i + 1, text: '' };
      stanza.text += (stanza.text ? '\n' : '') + text;
      stanza.end = i + 1;
      if (rend === 'gathalast') flush();
      return;
    }
    flush();
    if (text) out.push({ start: i, end: i + 1, text });
  });
  flush();
  return out;
}

/** Keep the excerpt's original line breaks while finding phrases with flexible whitespace. */
export function searchExcerpt(original, needle, fold) {
  const escape = (part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(needle.split(/\s+/u).map(escape).join('\\s+'), 'u');
  const found = pattern.exec(fold(original));
  const at = Math.max(0, (found?.index ?? 0) - 80);
  return (at ? '…' : '') + original.slice(at, at + 260) + (original.length > at + 260 ? '…' : '');
}
