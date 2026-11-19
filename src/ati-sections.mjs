/** Only fourteen reviewed Kelly question sections, with their own notes kept outside the body. */
import { createHash } from 'node:crypto';
import { plainText } from './http.mjs';
import { ATI_SECTION_PROFILE, ATI_SECTION_PROFILES } from './ati-section-profiles.mjs';
import { sectionHash } from './ati-section-registry.mjs';
const rawHash = value => createHash('sha256').update(value).digest('hex');
const fail = () => { throw Error('The reviewed ATI question text, structure, notes or source changed. No question translation was returned.'); };
const elements = node => node.children.filter(value => typeof value !== 'string');
const descendants = node => [node, ...elements(node).flatMap(descendants)];

function parse(chunk) {
  const root = { children: [] }, stack = [root]; let at = 0, trailing = 0;
  for (const match of chunk.matchAll(/<[^>]*>/g)) {
    const token = match[0]; stack.at(-1).children.push(chunk.slice(at, match.index)); at = match.index + token.length;
    const close = token.match(/^<\/([a-z0-9]+)>$/);
    if (close) {
      if (stack.length === 1) { if (close[1] !== 'div' || ++trailing !== 1) fail(); continue; }
      const node = stack.pop(); if (node.tag !== close[1]) fail(); node.close = match.index; node.end = at; continue;
    }
    const start = token.match(/^<([a-z0-9]+)((?:\s+[a-zA-Z][a-zA-Z0-9_-]*\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*>$/);
    if (!start) fail();
    const attrs = {};
    for (const attribute of start[2].matchAll(/([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*(["'])(.*?)\2/g)) { if (Object.hasOwn(attrs, attribute[1])) fail(); attrs[attribute[1]] = attribute[3]; }
    const node = { tag: start[1], attrs, children: [], start: match.index, inside: at };
    stack.at(-1).children.push(node); stack.push(node);
  }
  stack.at(-1).children.push(chunk.slice(at));
  if (stack.length !== 1 || trailing !== 1) fail();
  return root;
}
const withoutNoteTags = html => html.replace(/<a\b[^>]*class=['"]noteTag['"][^>]*>[^]*?<\/a>/g, '');
export function extractAtiSection(html, row) {
  const profile = ATI_SECTION_PROFILES.find(value => value.unit_id === row?.unit_id), p = row?.section;
  if (!profile || row.path !== profile.path || row.anchor !== profile.anchor || p?.profile !== ATI_SECTION_PROFILE || p.anchor !== row.anchor || p.paragraph_count !== profile.paragraphs || p.note_count !== profile.notes || typeof html !== 'string' || row.source_html_sha256 !== profile.source_html_sha256 || rawHash(html) !== row.source_html_sha256) fail();
  const begin = '<!-- BEGIN COPYRIGHTED TEXT CHUNK -->', end = '<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->';
  if (html.split(begin).length !== 2 || html.split(end).length !== 2 || html.indexOf(end) <= html.indexOf(begin)) fail();
  const chunk = html.slice(html.indexOf(begin) + begin.length, html.indexOf(end)), root = parse(chunk), chapters = elements(root);
  if (root.children.some(value => typeof value === 'string' && value.trim()) || chapters.length !== (profile.path.includes('2x') ? 10 : 6) || chapters.some(node => node.tag !== 'div' || JSON.stringify(node.attrs) !== '{"class":"chapter"}')) fail();
  const matches = chapters.filter(chapter => descendants(chapter).some(node => node.tag === 'a' && node.attrs.id === row.anchor));
  if (matches.length !== 1) fail();
  const chapter = matches[0], children = elements(chapter), heading = children[0];
  if (rawHash(chunk.slice(chapter.start, chapter.end)) !== p.section_html_sha256 || heading?.tag !== 'h1' || chapter.children.some(value => typeof value === 'string' && value.trim())) fail();
  const paragraphs = children.filter(node => node.tag === 'p'), notes = children.filter(node => node.tag === 'div');
  if (paragraphs.length !== profile.paragraphs || notes.length !== (profile.notes ? 1 : 0) || children.length !== 1 + paragraphs.length + notes.length || notes.some(node => JSON.stringify(node.attrs) !== '{"class":"notes"}')) fail();
  for (const node of descendants(chapter)) if (!['div', 'h1', 'a', 'span', 'p', 'dl', 'dt', 'dd', 'i'].includes(node.tag)) fail();
  const title = plainText(withoutNoteTags(chunk.slice(heading.inside, heading.close)));
  if (title !== p.heading) fail();
  const text = paragraphs.map(node => plainText(withoutNoteTags(chunk.slice(node.inside, node.close)))).join('\n\n');
  if (paragraphs.some(node => !plainText(withoutNoteTags(chunk.slice(node.inside, node.close))))) fail();
  const translator_notes = [];
  if (notes.length) {
    const children = elements(notes[0]), dl = children[1];
    if (children.length !== 2 || children[0].tag !== 'h1' || !/^Notes?$/.test(plainText(chunk.slice(children[0].inside, children[0].close))) || dl.tag !== 'dl') fail();
    const rows = elements(dl);
    if (rows.length !== profile.notes * 2) fail();
    for (let i = 0; i < profile.notes; i++) {
      const dt = rows[i * 2], dd = rows[i * 2 + 1], number = i + 1;
      if (dt.tag !== 'dt' || dd.tag !== 'dd' || plainText(chunk.slice(dt.inside, dt.close)) !== `${number}.`) fail();
      const note = plainText(chunk.slice(dd.inside, dd.close)); if (!note) fail(); translator_notes.push({ number, text: note });
    }
    const markers = descendants(chapter).filter(node => node.tag === 'a' && node.attrs.class === 'noteTag');
    if (markers.length !== profile.notes || markers.some((node, i) => node.attrs.id !== `fnt-${row.unit_id.slice(3)}-${i + 1}` || node.attrs.href !== `${profile.path.split('/').at(-1)}.html#fn-${row.unit_id.slice(3)}-${i + 1}`)) fail();
  }
  if (sectionHash(text) !== p.text_sha256 || sectionHash(translator_notes) !== p.notes_sha256) fail();
  return { text, translator_notes, title };
}
