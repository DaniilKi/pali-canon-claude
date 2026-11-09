/** Existing post-canonical chapter authority and finite source-context presentation only. */
import { sourceRevision } from './reading-position.mjs';
import { readingPagePosition } from './reading-navigation.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const text = (value, max = 1000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const id = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,99}$/.test(value);
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => own(value, key));
const chapterRow = value => object(value) && own(value, 'citation') && own(value, 'title') && Object.keys(value).every(key => ['citation', 'title', 'title_roman'].includes(key)) && text(value.citation, 200) && text(value.title) && (!own(value, 'title_roman') || text(value.title_roman));
const clone = value => JSON.parse(JSON.stringify(value));
const fail = () => { throw Error('Chapter navigation metadata is unavailable or does not match this source. The loaded passage was not replaced.'); };
function revision(data) {
  if (data?.canonical !== false || !text(data.label, 4000) || !object(data.book) || !id(data.book.id) || data.book.canonical !== false || !text(data.book.title) || !text(data.citation, 200) || !object(data.source) || data.source.name !== 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI): Ṭīkā and Añña (post-canonical) books' || data.source.repository !== 'https://github.com/VipassanaTech/tipitaka-xml' || !text(data.source.attribution, 10000) || !text(data.source.terms, 10000) || typeof data.source.commit !== 'string' || sourceRevision({ source: { commit: data.source.commit } }) !== data.source.commit) fail();
  const value = sourceRevision(data); if (typeof value !== 'string') fail(); return value;
}

export function validateChapterIndex(data) {
  if (!object(data) || !own(data, 'chapter_index')) return null;
  const pin = revision(data), index = data.chapter_index, command = index?.read_with;
  if (!exact(index, ['scope', 'read_with']) || !['work', 'source_file'].includes(index.scope) || !exact(command, ['tool', 'citation', 'offset', 'limit']) || command.tool !== 'get_post_canonical' || !text(command.citation, 200) || command.offset !== 0 || command.limit !== 1) fail();
  if (index.scope === 'source_file') {
    if (command.citation !== data.book.id || !(data.citation === data.book.id || data.citation.startsWith(data.book.id + ' '))) fail();
  } else if (command.citation === 'Vism') {
    if (!['visuddhimagga-1', 'visuddhimagga-2'].includes(data.book.id) || !/^Vism(?:$| ch\. [1-9][0-9]*$| [1-9][0-9]*\.[1-9][0-9]*$| §[1-9][0-9]*$)/.test(data.citation)) fail();
  } else if (command.citation === 'Abhidh-s') {
    if (data.book.id !== 'abhidhammatthasangaho' || !/^Abhidh-s(?:$| [1-9][0-9]*(?:\.[1-9][0-9]*)?$)/.test(data.citation)) fail();
  } else fail();
  return { scope: index.scope, read_with: { ...command }, revision: pin, book_id: data.book.id };
}

export function validateChapterMenu(current, root) {
  const selected = validateChapterIndex(current), parent = validateChapterIndex(root);
  if (!selected || !parent || selected.scope !== parent.scope || JSON.stringify(selected.read_with) !== JSON.stringify(parent.read_with) || root.citation !== selected.read_with.citation || !text(root.title) || !Array.isArray(root.chapters) || root.chapters.length < 1 || root.chapters.length > 1000) fail();
  if (selected.revision !== parent.revision) {
    const error = Error('The chapter index source revision changed. The current Pāli passage remains unchanged.'); error.code = 'READING_SOURCE_CHANGED'; throw error;
  }
  if (selected.scope === 'source_file' && selected.book_id !== parent.book_id || selected.scope === 'work' && selected.read_with.citation === 'Vism' && parent.book_id !== 'visuddhimagga-1' || selected.scope === 'work' && selected.read_with.citation === 'Abhidh-s' && parent.book_id !== 'abhidhammatthasangaho') fail();
  const work = selected.scope === 'work' ? selected.read_with.citation : null;
  if (work && root.chapters.length !== (work === 'Vism' ? 23 : 9)) fail();
  const seen = new Set();
  for (const [index, row] of root.chapters.entries()) {
    const expected = work === 'Vism' ? `Vism ch. ${index + 1}` : `${work ?? root.book.id} ${index + 1}`;
    if (!chapterRow(row) || row.citation !== expected || seen.has(row.citation)) fail();
    seen.add(row.citation);
  }
  return { scope: selected.scope, read_with: { ...selected.read_with }, revision: parent.revision, book_id: parent.book_id, citation: root.citation, title: root.title, label: root.label, source: clone(root.source), chapters: root.chapters.map(row => ({ ...row })) };
}

export function chapterLink(row, menu) {
  if (!object(menu) || !chapterRow(row)) fail();
  const root = { canonical: false, label: menu.label, book: { id: menu.book_id, title: menu.title, canonical: false }, citation: menu.citation, title: menu.title, source: menu.source, chapters: menu.chapters, chapter_index: { scope: menu.scope, read_with: menu.read_with } };
  const checked = validateChapterMenu(root, root);
  if (checked.revision !== menu.revision || !checked.chapters.some(item => item.citation === row.citation && item.title === row.title && own(item, 'title_roman') === own(row, 'title_roman') && item.title_roman === row.title_roman)) fail();
  return readingPagePosition({ kind: 'post', uid: row.citation }, 0, checked.revision);
}

const rootNotes = new Set([
  'Complete VRI source book, including headings, invocations and front matter outside individual citation spans. Abbreviations remain as printed; no omitted text has been reconstructed.',
  'The vri-book segment references identify this source-file reading, not a standard sutta or rule citation. Cite the VRI file and paragraph/page shown, or read an individual text with uid to obtain its standard citation and linked English/commentary.',
]);
const tika = 'Post-canonical, not the canon: a book from the VRI Ṭīkā section (sub-commentaries on the canon and its commentaries, and Abhidhamma and Vinaya manuals). Keep it distinct from the root text and from the commentary (Aṭṭhakathā) when quoting.';
const anna = 'Post-canonical, not the canon: a book from the VRI "Añña" (other books) section, such as the Visuddhimagga, its Mahāṭīkā, chronicles, grammars and later Pāli works. Keep it distinct from the canonical texts when quoting.';
const vismBackground = 'Visuddhimagga ("The Path of Purification"), a post-canonical manual traditionally attributed to Buddhaghosa. Not the canon. ' + anna;
const vismScopeNote = 'The Visuddhimagga has 23 chapters in two VRI volumes; cite a chapter ("Vism ch. 4", "Vism IV") to read one. This is volume 1 (chapters 1–11).';
const postBackground = new Set([tika, anna,
  vismBackground,
  'Abhidhammatthasaṅgaha, a post-canonical Abhidhamma manual traditionally attributed to Ācariya Anuruddha. Not the canon. ' + tika,
]);

/** Never classify by length or keywords; unfamiliar notes remain visible to existing notes(). */
export function readingIntro(data, kind) {
  if (!object(data)) fail();
  const critical = { ...data }, context = []; let status = null;
  if (kind === 'book' && data.selection === 'source_book' && data.canonical === true && Array.isArray(data.notes)) {
    critical.notes = data.notes.filter(note => { if (!rootNotes.has(note)) return true; context.push(note); return false; });
    if (context.length) status = 'VRI file references are not standard citations. Abbreviations remain unexpanded.';
  } else if (kind === 'post' && data.canonical === false && postBackground.has(data.label)) {
    context.push(data.label); delete critical.label;
    status = 'Post-canonical Pāli · not the canon. Keep it distinct from the root text and commentary.';
    if (data.label === vismBackground && data.citation === 'Vism' && data.book?.id === 'visuddhimagga-1' && Array.isArray(data.notes) && data.notes.includes(vismScopeNote)) {
      try {
        const menu = validateChapterMenu(data, data);
        if (menu.scope === 'work' && menu.read_with.citation === 'Vism' && menu.chapters.length === 23) {
          critical.notes = data.notes.filter(note => { if (note !== vismScopeNote) return true; context.push(note); return false; });
          status = 'Not canon. Volume 1: chapters 1–11 of 23.';
        }
      } catch { /* Unfamiliar or malformed authority keeps the original scope warning visible. */ }
    }
  }
  return { critical, context, status };
}
