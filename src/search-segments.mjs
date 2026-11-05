/** Search the same complete stanzas retrieval renders, without joining separate paragraphs or texts. */
const VERSE = new Set(['gatha1', 'gatha2', 'gatha3', 'gathalast']);

export const searchFold = (text, fold) => fold(text).replace(/\s+/gu, ' ');

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
