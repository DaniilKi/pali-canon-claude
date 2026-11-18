/** Validate post-canonical search and its literal, selection-bounded context commands. */
import { readingPosition, sourceRevision } from './reading-position.mjs';
import { queryProvenance } from './book-search.mjs';
import { validateChapterIndex } from './reading-chapters.mjs';
import { transliterate } from '../src/script.mjs';
import { romanizeSearchInput } from '../src/search-segments.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const keysOnly = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const text = (value, max = 10000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
const id = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,99}$/.test(value);
const scripts = new Set(['roman', 'sinhala', 'thai', 'myanmar', 'devanagari', 'khmer', 'lao', 'lanna']);
const clone = value => JSON.parse(JSON.stringify(value));
const equal = (a, b) => object(a) && object(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => own(b, key) && a[key] === b[key]);
const fail = () => { throw Error('The post-canonical search or surrounding context does not match this selection. No source or reading position was substituted.'); };
const searchLabel = 'Post-canonical books (VRI Ṭīkā and Añña sections), not the canon. Results are kept separate from canonical search results.';
const labels = {
  'Ṭīkā': 'Post-canonical, not the canon: a book from the VRI Ṭīkā section (sub-commentaries on the canon and its commentaries, and Abhidhamma and Vinaya manuals). Keep it distinct from the root text and from the commentary (Aṭṭhakathā) when quoting.',
  'Añña': 'Post-canonical, not the canon: a book from the VRI "Añña" (other books) section, such as the Visuddhimagga, its Mahāṭīkā, chronicles, grammars and later Pāli works. Keep it distinct from the canonical texts when quoting.',
};
function selection(value) {
  if (!keysOnly(value, ['query', 'offset', 'limit', 'script']) || !text(value.query, 300) || value.query !== value.query.trim() || !integer(value.offset, 0, 100000) || value.limit !== 15 || !scripts.has(value.script)) fail();
  // One native glyph can represent a valid two-letter Roman word (Sinhala ස → sa).
  if (romanizeSearchInput(value.query).text.length < 2) fail();
  return value;
}
export function postSearchSelection(args, script, rawQuery) {
  if (rawQuery !== undefined) { try { decodeURIComponent(rawQuery.replace(/\+/g, ' ')); } catch { fail(); } }
  for (const key of args.keys()) if (!['scope', 'q', 'offset'].includes(key) || args.getAll(key).length !== 1) fail();
  if (args.get('scope') !== 'post') fail();
  const offset = args.has('offset') ? args.get('offset') : '0';
  if (!/^(0|[1-9][0-9]*)$/.test(offset)) fail();
  return selection({ query: (args.get('q') ?? '').trim(), offset: Number(offset), limit: 15, script });
}
function source(data) {
  const value = data.source;
  if (!keysOnly(value, ['name', 'repository', 'commit', 'files', 'attribution', 'terms', 'locator_revision']) || value.name !== 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI): Ṭīkā and Añña (post-canonical) books' || value.repository !== 'https://github.com/VipassanaTech/tipitaka-xml' || value.files !== 'romn/*.tik.xml, romn/*.nrf.xml (except s0518m, s0520m), romn/e0101n.mul.xml, e0102n.mul.xml, e0103n.att.xml, e0104n.att.xml; titles from tipitaka.org/romn/tree.json' || !text(value.attribution) || !text(value.terms) || !text(value.commit, 100)) fail();
  try { if (sourceRevision({ source: { commit: value.commit } }) !== value.commit || !text(sourceRevision(data), 100)) fail(); } catch { fail(); }
}
function outputScript(data, selected) {
  if (selected.script === 'roman' ? own(data, 'script') || own(data, 'script_note') : data.script !== selected.script || !text(data.script_note)) fail();
}
function nativeTitle(value, key, script) {
  if (!text(value[key], 1000) || (script === 'roman' ? own(value, key + '_roman') : !text(value[key + '_roman'], 1000) || value[key] !== transliterate(value[key + '_roman'], 'roman', script))) fail();
}
/** Only normalized citations emitted by search; no guessed title aliases or arbitrary references. */
function citationScope(citation, book) {
  if (!id(book) || !text(citation, 200)) fail();
  let match;
  if ((match = /^Vism (?:§([1-9][0-9]{0,2})|ch\. ([1-9][0-9]?))$/.exec(citation))) {
    // These are the bundled edition's explicit two-volume boundaries, not physical segment offsets.
    if (!['visuddhimagga-1', 'visuddhimagga-2'].includes(book) || match[1] && (Number(match[1]) > 896 || book !== `visuddhimagga-${Number(match[1]) <= 364 ? 1 : 2}`) || match[2] && (Number(match[2]) > 23 || book !== `visuddhimagga-${Number(match[2]) <= 11 ? 1 : 2}`)) fail();
    return { work: 'Vism', kind: match[1] ? 'paragraph' : 'chapter', chapter: match[2] ? Number(match[2]) : null, paragraph: match[1] ? Number(match[1]) : null };
  }
  if ((match = /^Abhidh-s ([1-9])(?:\.([1-9][0-9]*))?$/.exec(citation))) {
    if (book !== 'abhidhammatthasangaho') fail();
    return { work: 'Abhidh-s', kind: match[2] ? 'paragraph' : 'chapter', chapter: Number(match[1]), paragraph: match[2] ? Number(match[2]) : null };
  }
  if (citation === book) return { work: null, kind: 'book', chapter: null };
  if (citation.startsWith(book + ' ') && (match = /^(?:([1-9][0-9]*)(?:\.([1-9][0-9]*))?|§([1-9][0-9]*))$/.exec(citation.slice(book.length + 1)))) return { work: null, kind: match[2] || match[3] ? 'paragraph' : 'chapter', chapter: match[1] ? Number(match[1]) : null, paragraph: match[2] || match[3] ? Number(match[2] || match[3]) : null };
  fail();
}
function command(value, citation, offset, limit, selected) {
  if (!keysOnly(value, ['tool', 'citation', 'offset', 'limit', 'script']) || value.tool !== 'get_post_canonical' || value.citation !== citation || value.offset !== offset || value.limit !== limit || own(value, 'script') && value.script !== selected.script || selected.script !== 'roman' && value.script !== selected.script) fail();
}
function hit(item, selected) {
  if (!keysOnly(item, ['canonical', 'citation', 'book_id', 'book_title', 'book_title_roman', 'vri_section', 'chapter', 'match_vri_paragraph', 'excerpt', 'segment_ref', 'read_with', 'context_with']) || item.canonical !== false || !own(labels, item.vri_section) || !text(item.excerpt, 4000)) fail();
  const scope = citationScope(item.citation, item.book_id);
  if (scope.work && item.vri_section !== (scope.work === 'Vism' ? 'Añña' : 'Ṭīkā')) fail();
  nativeTitle(item, 'book_title', selected.script);
  for (const field of ['chapter', 'match_vri_paragraph']) if (own(item, field) && !text(item[field], field === 'chapter' ? 1000 : 100)) fail();
  if (!integer(item.read_with?.offset, 0, 100000) || item.segment_ref !== `${item.citation}/${item.read_with.offset + 1}`) fail();
  command(item.read_with, item.citation, item.read_with.offset, 1, selected);
  command(item.context_with, item.citation, Math.max(0, item.read_with.offset - 1), 3, selected);
}
export function validatePostSearch(data, selected) {
  selection(selected);
  // Output Romanization may be longer than the schema-bounded original query; provenance binds it exactly.
  if (!keysOnly(data, ['query', 'canonical', 'label', 'searched', 'results', 'total_matched', 'offset', 'limit', 'next_offset', 'source', 'script', 'script_note', 'input_script', 'input_romanized', 'input_normalised', 'query_mode', 'query_note']) || !text(data.query, 2000) || data.canonical !== false || data.label !== searchLabel || data.searched !== '109 post-canonical books' || !integer(data.total_matched, 0, 1000000) || data.offset !== selected.offset || data.limit !== 15 || !Array.isArray(data.results) || data.results.length !== Math.min(15, Math.max(0, data.total_matched - data.offset)) || data.next_offset !== (data.offset + 15 < data.total_matched ? data.offset + 15 : null)) fail();
  source(data); outputScript(data, selected);
  if (own(data, 'query_mode') && !['source_phrase', 'as_typed_phrase'].includes(data.query_mode) || own(data, 'query_note') && !text(data.query_note) || own(data, 'input_script') && !scripts.has(data.input_script) || own(data, 'input_romanized') && !text(data.input_romanized, 2000)) fail();
  queryProvenance(data, selected, fail);
  const seen = new Set(), books = new Map();
  for (const item of data.results) {
    hit(item, selected);
    const identity = { title: item.book_title, roman: item.book_title_roman, section: item.vri_section };
    if (seen.has(item.citation) || books.has(item.book_id) && !equal(books.get(item.book_id), identity)) fail();
    seen.add(item.citation); books.set(item.book_id, identity);
  }
  return clone(data);
}
function member(data, item, selected) {
  const checked = validatePostSearch(data, selected), found = checked.results.find(value => value.citation === item?.citation);
  if (!found || JSON.stringify(found) !== JSON.stringify(item)) fail();
  return { checked, found };
}
export function postSearchHitLinks(data, item, selected) {
  const { checked, found } = member(data, item, selected);
  const href = readingPosition({ kind: 'post', uid: found.citation }, found.read_with.offset, found.segment_ref, sourceRevision(checked));
  // Both routes use the existing 30-segment reader within this citation; neither widens to the book.
  return { read: href, continue: href };
}
export function postContextCommand(data, item, selected) {
  const { found } = member(data, item, selected);
  return { citation: found.context_with.citation, offset: found.context_with.offset, limit: 3, script: selected.script };
}
function pages(segment) {
  if (own(segment, 'vri_paragraph') && !text(segment.vri_paragraph, 100)) fail();
  for (const key of ['pts_page_begins', 'thai_page_begins', 'myanmar_page_begins', 'vri_page_begins']) if (own(segment, key) && (!Array.isArray(segment[key]) || segment[key].length > 100 || segment[key].some(page => !text(page, 200)))) fail();
}
export function validatePostContext(response, data, item, selected) {
  const { checked, found } = member(data, item, selected), scope = citationScope(found.citation, found.book_id), offset = found.context_with.offset;
  if (!keysOnly(response, ['canonical', 'label', 'citation', 'title', 'title_roman', 'kind', 'chapter', 'vri_paragraph', 'approximate', 'book', 'chapters', 'chapter_index', 'notes', 'source', 'edition', 'attribution', 'total_segments', 'offset', 'limit', 'returned', 'next_offset', 'segments', 'continue_with', 'script', 'script_note']) || response.canonical !== false) fail();
  source(response);
  if (!equal(response.source, checked.source)) { const error = Error('The post-canonical source changed since this search was opened. Run the search again to review the current source; no replacement context was displayed.'); error.code = 'READING_SOURCE_CHANGED'; throw error; }
  outputScript(response, selected);
  const book = response.book;
  if (!keysOnly(book, ['id', 'title', 'title_roman', 'vri_file', 'vri_section', 'vri_group', 'canonical']) || book.id !== found.book_id || book.canonical !== false || book.vri_section !== found.vri_section || !text(book.vri_file, 100) || !/^[a-z0-9][a-z0-9_.-]*\.(?:mul|tik|nrf|att)\.xml$/.test(book.vri_file) || !Array.isArray(book.vri_group) || book.vri_group.length > 100 || book.vri_group.some(group => !text(group, 1000))) fail();
  nativeTitle(book, 'title', selected.script); nativeTitle(response, 'title', selected.script);
  if (found.book_id === 'visuddhimagga-1' && book.vri_file !== 'e0101n.mul.xml' || found.book_id === 'visuddhimagga-2' && book.vri_file !== 'e0102n.mul.xml' || found.book_id === 'abhidhammatthasangaho' && book.vri_file !== 'abh07t.nrf.xml') fail();
  if (book.title !== found.book_title || book.title_roman !== found.book_title_roman || response.citation !== found.citation || response.kind !== scope.kind || response.label !== (scope.work === 'Vism' ? 'Visuddhimagga ("The Path of Purification"), a post-canonical manual traditionally attributed to Buddhaghosa. Not the canon. ' : scope.work === 'Abhidh-s' ? 'Abhidhammatthasaṅgaha, a post-canonical Abhidhamma manual traditionally attributed to Ācariya Anuruddha. Not the canon. ' : '') + labels[found.vri_section] || response.edition !== 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI), Pāli' || response.attribution !== response.source.attribution) fail();
  if (own(response, 'chapter') && !integer(response.chapter, 1, 100000) || scope.chapter !== null && response.chapter !== scope.chapter || own(response, 'vri_paragraph') && !text(response.vri_paragraph, 100) || own(response, 'approximate') && typeof response.approximate !== 'boolean' || !Array.isArray(response.notes) || response.notes.length > 100 || response.notes.some(note => !text(note))) fail();
  if (scope.paragraph !== undefined && scope.paragraph !== null) {
    const paragraph = /^([1-9][0-9]*)(?:\s*[-–]\s*[1-9][0-9]*)?$/.exec(response.vri_paragraph);
    if (!paragraph || Number(paragraph[1]) !== scope.paragraph) fail();
    if (scope.work === 'Vism') {
      const volume = found.book_id === 'visuddhimagga-1' ? 1 : 2;
      const warning = `VRI paragraph ${response.vri_paragraph} (volume ${volume}). VRI numbers the Visuddhimagga's paragraphs continuously, 1–896, and VRI's own cross-references write it "visuddhi. ${volume}.${scope.paragraph}" (volume.paragraph); this is not Ñāṇamoli's chapter.paragraph numbering.`;
      if (!response.notes.includes(warning) || own(response, 'chapter') && (!integer(response.chapter, 1, 23) || (response.chapter <= 11 ? 1 : 2) !== volume)) fail();
    } else if (scope.work === 'Abhidh-s' && !response.notes.includes('Sections are VRI\'s paragraph numbers, which restart in each chapter. Other editions and translations (for example Bhikkhu Bodhi\'s Comprehensive Manual of Abhidhamma) number their sections themselves; check the text before citing their numbers.')) fail();
  }
  // A paragraph may include volume-opening headings before the first chapter; its summary then has no chapter.
  if (scope.work && !own(response, 'chapter_index') || scope.kind === 'paragraph' && own(response, 'chapter') && own(found, 'chapter') && response.title !== found.chapter) fail();
  if (own(response, 'chapter_index')) { const index = validateChapterIndex(response); if (!index || index.scope !== (scope.work ? 'work' : 'source_file') || index.read_with.citation !== (scope.work || found.book_id)) fail(); }
  if (own(response, 'chapters')) {
    if (!Array.isArray(response.chapters) || response.chapters.length > 1000) fail();
    for (const [i, row] of response.chapters.entries()) { if (!keysOnly(row, ['citation', 'title', 'title_roman']) || row.citation !== `${scope.work === 'Vism' ? 'Vism ch.' : scope.work || found.book_id} ${i + 1}`) fail(); nativeTitle(row, 'title', selected.script); }
  }
  if (!integer(response.total_segments, found.read_with.offset + 1, 100001) || response.offset !== offset || response.limit !== 3 || !integer(response.returned, 1, 3) || !Array.isArray(response.segments) || response.segments.length !== response.returned || response.returned !== Math.min(3, response.total_segments - offset) || response.next_offset !== (offset + response.returned < response.total_segments ? offset + response.returned : null)) fail();
  if (own(response, 'continue_with')) {
    if (response.next_offset === null) { if (response.continue_with !== null) fail(); }
    else { const value = response.continue_with; if (!keysOnly(value, ['tool', 'citation', 'offset', 'limit', 'includeVariants', 'script']) || value.includeVariants !== false) fail(); const { includeVariants, ...rest } = value; command(rest, found.citation, response.next_offset, 3, selected); }
  }
  let matches = 0;
  response.segments.forEach((segment, i) => {
    if (!keysOnly(segment, ['ref', 'type', 'text', 'vri_paragraph', 'pts_page_begins', 'thai_page_begins', 'myanmar_page_begins', 'vri_page_begins']) || segment.ref !== `${found.citation}/${offset + i + 1}` || !['heading', 'prose', 'verse'].includes(segment.type) || !text(segment.text, 100000)) fail();
    pages(segment);
    if (segment.ref === found.segment_ref) { matches += 1; if (own(found, 'match_vri_paragraph') && segment.vri_paragraph !== found.match_vri_paragraph) fail(); }
  });
  if (matches !== 1) fail();
  return clone(response);
}
