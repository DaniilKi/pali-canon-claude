/** Search the same complete stanzas retrieval renders, without joining separate paragraphs or texts. */
const VERSE = new Set(['gatha1', 'gatha2', 'gatha3', 'gathalast']);

export const searchFold = (text, fold) => fold(text).replace(/\s+/gu, ' ');

/** Paired double quotes preserve phrase order; apostrophes remain ordinary Pāli punctuation. */
export function searchTerms(query, fold) {
  const paired = /"([^"]+)"|“([^”]+)”/gu;
  const text = String(query);
  const phrases = [...text.matchAll(paired)]
    .map((match) => searchFold(match[1] ?? match[2], fold).trim()).filter(Boolean);
  const words = fold(text.replace(paired, ' ')).split(/[^a-z0-9]+/u).filter((word) => word.length > 1);
  return [...phrases, ...words];
}

// Even an unmatched quote must not silently opt into loose spelling/keyword retries.
export const hasSearchQuotes = (query) => /["“”]/u.test(query);

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
