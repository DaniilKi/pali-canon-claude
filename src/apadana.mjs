/** Finite, live-only Walters/Whitman Apadāna. No translated bodies are bundled. */
import { createHash } from 'node:crypto';
import { fetchPublic, decodeHtml } from './http.mjs';
import { APADANA_PROFILES, APADANA_COMMIT, APADANA_LICENSE, APADANA_TRANSLATOR, APADANA_LICENSE_URL } from './apadana-profiles.mjs';
export const digest = value => createHash('sha256').update(value).digest('hex');
const fail = () => { throw new Error('Apadāna source metadata or content differs from the reviewed pinned publication.'); };
export const rootDigest = (unit, book) => digest(JSON.stringify({ id: unit.id, book: unit.book, start: unit.start, end: unit.end, blocks: book.blocks.slice(unit.start, unit.end) }));

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

export function parseApadana(raw, profile) {
  if (typeof raw !== 'string' || raw.includes('\r') || !profile) fail();
  const front = raw.match(/^---\n([^]*?)\n---\n/);
  if (!front) fail();
  const title = front[1].match(/^title: (.+)$/m)?.[1];
  if (!title || !new RegExp(`^order: ${profile.poem}$`, 'm').test(front[1]) || !/^category: chapter-4$/m.test(front[1])) fail();
  const rest = raw.slice(front[0].length).trim();
  const notesAt = rest.search(/^\[\^\d+\]:/m);
  if (notesAt < 0) fail();
  const poem = rest.slice(0, notesAt).trim(), definitions = rest.slice(notesAt);
  // Definitions can be adjacent without a blank line: split by line-start markers, not paragraph breaks.
  const entries = [...definitions.matchAll(/^\[\^(\d+)\]:[ \t]*([^]*?)(?=^\[\^\d+\]:|(?![^]))/gm)];
  if (!entries.length || entries[0].index !== 0) fail();
  const translator_notes = entries.map((entry, index) => {
    if (Number(entry[1]) !== index + 1 || !entry[2].trim()) fail();
    return { number: Number(entry[1]), text: plainMarkdown(entry[2]) };
  });
  if (translator_notes.length !== profile.note_count) fail();
  const references = [...poem.matchAll(/\[\^(\d+)\]/g)].map(m => Number(m[1]));
  if (references.some(n => !translator_notes[n - 1]) || translator_notes.some(n => !references.includes(n.number))) fail();
  const headings = [...poem.matchAll(/^### /gm)];
  if (headings.length !== 1) fail();
  const split = headings[0].index;
  if ((profile.poem === 1) !== (split > 0)) fail();
  const publisher_paratext = plainMarkdown(poem.slice(0, split));
  const text = plainMarkdown(poem.slice(split));
  const paragraphs = text.split(/\n\n+/);
  const stanzas = paragraphs.flatMap(p => {
    const match = p.match(/\((\d+)\)\s*\[(\d+)\](?:\[Note \d+\])*$/);
    return match ? [{ local: Number(match[1]), global: Number(match[2]), text: p }] : [];
  });
  const [first, last] = profile.verses;
  if (stanzas.length !== last - first + 1 || stanzas.some((s, i) => s.local !== i + 1 || s.global !== first + i)) fail();
  // Exactly the reviewed heading + stanzas + the two publisher colophons. No silent summary/editorial inclusion.
  if (paragraphs.length !== stanzas.length + 3 || !paragraphs[0].startsWith(`[${profile.poem}. `) ||
      !/^Thus indeed /.test(paragraphs.at(-2)) || !/legend of .*is finished\.\]?(?:\[Note \d+\])?$/.test(paragraphs.at(-1))) fail();
  return { title, text, translator_notes, publisher_paratext };
}

export function validateLink(link, id, unit, book) {
  const profile = Object.values(APADANA_PROFILES).find(p => p.path === link?.path);
  if (!profile || (id !== undefined && (id !== profile.id || !unit || !book))) fail();
  for (const key of ['source', 'path', 'url', 'raw_url', 'translator', 'license', 'translation_revision', 'raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256', 'note_count']) {
    if (link[key] !== profile[key]) fail();
  }
  if (['partial_scope', 'shared_scope', 'section', 'parts'].some(key => Object.hasOwn(link, key))) fail();
  for (const key of ['title', 'reference', 'mapping_notes']) if (JSON.stringify(link[key]) !== JSON.stringify(profile[key])) fail();
  if (link.english !== undefined && link.english !== profile.title) fail();
  if (unit && (!book || unit.id !== profile.id || rootDigest(unit, book) !== profile.root_sha256)) fail();
  return profile;
}

/** Only numbered substantive stanzas are quotation evidence, never headings, notes or colophons. */
export function quotationText(result) {
  return String(result.text || '').split(/\n\n+/).filter(p => /\(\d+\)\s*\[\d+\](?:\[Note \d+\])*$/.test(p))
    .map(p => p.replace(/\[Note \d+\]/g, '').replace(/\s*\(\d+\)\s*\[\d+\]\s*$/, '')).join('\n\n');
}

export async function translation(link) {
  const profile = validateLink(link);
  // Sole fixed official artifact. fetchPublic's allowlist independently forbids alternate refs/paths.
  const raw = await fetchPublic(profile.raw_url, { json: false });
  if (digest(raw) !== profile.raw_sha256) fail();
  const result = parseApadana(raw, profile);
  if (digest(result.text) !== profile.body_sha256 || digest(JSON.stringify(result.translator_notes)) !== profile.notes_sha256 || digest(result.publisher_paratext) !== profile.paratext_sha256) fail();
  return { ...result, source: 'apadana', url: profile.url, fetched_from: 'official pinned repository', fetched_url: profile.raw_url,
    translator: APADANA_TRANSLATOR, attribution: 'Jonathan S. Walters and Whitman College, Legends of the Buddhist Saints. No endorsement is implied.',
    license: APADANA_LICENSE, license_url: APADANA_LICENSE_URL, translation_revision: APADANA_COMMIT,
    raw_sha256: profile.raw_sha256, body_sha256: profile.body_sha256, notes_sha256: profile.notes_sha256,
    paratext_sha256: profile.paratext_sha256, root_sha256: profile.root_sha256,
    mapping_notes: [...profile.mapping_notes],
    changes: 'Presentation extraction: retain diacritics; remove alternate no-diacritic display, Markdown and abbreviation markup; preserve interpolations and both numbering systems; label and separate translator notes and publisher preface. No translation wording is generated.' };
}
