/** Shared presentation only; source-family scope and pins remain in their finite parsers. */
import { createHash } from 'node:crypto';
import { decodeHtml } from './http.mjs';
const fail = () => { throw new Error('Apadāna source metadata or content differs from the reviewed pinned publication.'); };
export const digest = value => createHash('sha256').update(value).digest('hex');

/** Pandoc's adjacent alternatives are reduced BEFORE unescaping brackets. Never consume an outer bracket. */
export function plainMarkdown(value) {
  let text = String(value).replace(/\[([^\[\]]*)\]\{\.diacritics data-state=on\}\[([^\[\]]*)\]\{\.no-diacritics data-state=off\}/g, '$1');
  if (/\{\.(?:no-)?diacritics\b/.test(text)) fail();
  text = text.replace(/\[\^(\d+)\]/g, '[Note $1]')
    .replace(/<abbr title="[^"]*">([^<>]*)<\/abbr>/g, '$1');
  if (/[<>]/.test(text)) fail();
  text = decodeHtml(text).replace(/\\([\\`*{}\[\]()#+.!_>-])/g, '$1')
    .replace(/^#{1,3}\s+/gm, '').replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

