import { parseCitation } from './citations.mjs';
import { isPartial } from './translation-scope.mjs';

/** Existing English title metadata; dhammatalks stores its title after a citation in the legacy caption. */
export function translationTitle(link) {
  if (isPartial(link)) return null;
  if (link.english?.trim()) return link.english;
  if (link.source !== 'dhammatalks') return null;
  const reference = link.reference || '';
  const numbered = reference.match(/^([A-Za-z][A-Za-z-]*\s+\d+(?:[.:]\d+)*(?:[-–—]\d+(?:[.:]\d+)*)?)\s+(.+)$/u);
  if (numbered) {
    try {
      const header = parseCitation(numbered[1]);
      if (header.kind === 'id' || header.kind === 'uid') return numbered[2];
    } catch { /* An unrecognised caption is not evidence of a title. */ }
  }
  // The source's Dhammapada chapter captions use Roman numerals. Bare Itivuttaka references have no individual title.
  return reference.match(/^Dhp\s+[IVX]+\s*:\s*(.+)$/u)?.[1] || null;
}
