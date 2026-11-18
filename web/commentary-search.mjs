/** Validate bundled Aṭṭhakathā search and direct-book context before displaying source text. */
import { readingPosition, sourceRevision } from './reading-position.mjs';
import { queryProvenance } from './book-search.mjs';
import { transliterate } from '../src/script.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const keysOnly = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const text = (value, max = 10000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const scripts = new Set(['roman', 'sinhala', 'thai', 'myanmar', 'devanagari', 'khmer', 'lao', 'lanna']);
// search_commentary has no scope echo: require the current complete bundled catalogue.
const bundledBooks = 47;
const file = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_.-]{0,99}\.att\.xml$/.test(value);
const label = 'Commentary (Aṭṭhakathā), not the canon: the traditional Theravāda explanation of the texts, compiled in Pāli in Sri Lanka (traditionally attributed to Buddhaghosa, Dhammapāla and others). Keep it distinct from the root text when quoting.';
const searchAlignment = 'Search covers the included commentary books, including material with no verified root-text alignment. A hit does not establish which canonical passage it explains.';
const directAlignment = 'Direct book reading does not assert an alignment to a canonical text. Use a canonical citation with get_commentary for verified aligned passages.';
const fail = () => { throw Error('The commentary search or surrounding context does not match this selection. No source or reading position was substituted.'); };
const clone = value => JSON.parse(JSON.stringify(value));
const equal = (a, b) => object(a) && object(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => own(b, key) && a[key] === b[key]);
function changed() {
  const error = Error('The commentary source changed since this search was opened. Run the search again to review the current source; no replacement context was displayed.');
  error.code = 'READING_SOURCE_CHANGED'; throw error;
}
function selection(value) {
  if (!keysOnly(value, ['query', 'offset', 'limit', 'script']) || typeof value.query !== 'string' || value.query !== value.query.trim() || value.query.length < 2 || value.query.length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value.query) || !integer(value.offset, 0, 1000000) || value.limit !== 15 || !scripts.has(value.script)) fail();
  return value;
}
export function commentarySearchSelection(args, script, rawQuery) {
  if (rawQuery !== undefined) { try { decodeURIComponent(rawQuery.replace(/\+/g, ' ')); } catch { fail(); } }
  for (const key of args.keys()) if (!['scope', 'q', 'offset'].includes(key) || args.getAll(key).length !== 1) fail();
  if (args.get('scope') !== 'commentary') fail();
  const offset = args.has('offset') ? args.get('offset') : '0';
  if (!/^(0|[1-9][0-9]*)$/.test(offset)) fail();
  return selection({ query: (args.get('q') ?? '').trim(), offset: Number(offset), limit: 15, script });
}
function source(data) {
  const value = data.source;
  if (!keysOnly(value, ['name', 'repository', 'commit', 'files', 'attribution', 'terms', 'locator_revision']) || value.name !== 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI), Aṭṭhakathā' || value.repository !== 'https://github.com/VipassanaTech/tipitaka-xml' || value.files !== 'romn/*.att.xml' || !text(value.attribution) || !text(value.terms) || !text(value.commit, 100)) fail();
  try {
    if (sourceRevision({ source: { commit: value.commit } }) !== value.commit || !text(sourceRevision(data), 100)) fail();
  } catch { fail(); }
}
function outputScript(data, selected) {
  if (selected.script === 'roman' ? own(data, 'script') || own(data, 'script_note') : data.script !== selected.script || !text(data.script_note)) fail();
}
function book(value, selected) {
  if (!keysOnly(value, ['uid', 'vri_file', 'title', 'title_roman', 'work', 'description']) || !file(value.vri_file) || value.uid !== `commentary:${value.vri_file}` || !text(value.title, 1000) || !text(value.work, 1000) || !text(value.description, 1000)) fail();
  if (selected.script === 'roman' ? own(value, 'title_roman') : !text(value.title_roman, 1000) || value.title !== transliterate(value.title_roman, 'roman', selected.script)) fail();
}
function pages(value) {
  if (own(value, 'commentary_pts_page_begins') && (!Array.isArray(value.commentary_pts_page_begins) || value.commentary_pts_page_begins.length > 100 || value.commentary_pts_page_begins.some(page => !text(page, 200)))) fail();
}
function command(value, uid, selected, contextOffset) {
  if (!keysOnly(value, contextOffset === undefined ? ['tool', 'uid', 'script'] : ['tool', 'uid', 'offset', 'limit', 'script']) || value.tool !== 'get_commentary' || value.uid !== uid || own(value, 'script') && value.script !== selected.script || selected.script !== 'roman' && value.script !== selected.script) fail();
  if (contextOffset !== undefined && (value.offset !== contextOffset || value.limit !== 3)) fail();
}
function hit(item, selected) {
  if (!keysOnly(item, ['canonical', 'content_type', 'citation', 'book', 'segment', 'type', 'excerpt', 'commentary_pts_page_begins', 'read_with', 'context_with']) || item.canonical !== false || item.content_type !== 'commentary' || !integer(item.segment, 1, 100001) || !['heading', 'prose', 'verse'].includes(item.type) || !text(item.excerpt, 4000)) fail();
  book(item.book, selected);
  if (item.citation !== `${item.book.uid}/c${item.segment}`) fail();
  command(item.read_with, item.citation, selected);
  command(item.context_with, item.book.uid, selected, Math.max(0, item.segment - 2));
  pages(item);
}
export function validateCommentarySearch(data, selected) {
  selection(selected);
  const allowed = ['query', 'canonical', 'content_type', 'label', 'searched_books', 'total_matched', 'offset', 'limit', 'returned', 'next_offset', 'results', 'alignment_note', 'source', 'input_script', 'input_romanized', 'input_normalised', 'query_mode', 'query_note', 'script', 'script_note'];
  if (!selected.query || !keysOnly(data, allowed) || !text(data.query, 500) || data.canonical !== false || data.content_type !== 'commentary' || data.label !== label || data.alignment_note !== searchAlignment || data.searched_books !== bundledBooks || !integer(data.total_matched, 0, 1000000) || data.offset !== selected.offset || data.limit !== 15 || !integer(data.returned, 0, 15) || !Array.isArray(data.results) || data.results.length !== data.returned || data.returned !== Math.min(15, Math.max(0, data.total_matched - data.offset)) || data.next_offset !== (data.offset + data.returned < data.total_matched ? data.offset + data.returned : null)) fail();
  source(data); outputScript(data, selected);
  if (own(data, 'query_mode') && !['source_phrase', 'as_typed_phrase'].includes(data.query_mode) || own(data, 'query_note') && !text(data.query_note) || own(data, 'input_script') && !scripts.has(data.input_script) || own(data, 'input_romanized') && !text(data.input_romanized, 500)) fail();
  queryProvenance(data, selected, fail);
  const seen = new Set(), books = new Map(); let previous;
  for (const item of data.results) {
    hit(item, selected);
    if (seen.has(item.citation) || previous?.book.uid === item.book.uid && previous.segment >= item.segment || books.has(item.book.uid) && !equal(books.get(item.book.uid), item.book)) fail();
    seen.add(item.citation); books.set(item.book.uid, item.book); previous = item;
  }
  if (books.size > data.searched_books) fail();
  return clone(data);
}
function member(data, item, selected) {
  const checked = validateCommentarySearch(data, selected);
  const found = checked.results.find(value => value.citation === item?.citation);
  if (!found || JSON.stringify(found) !== JSON.stringify(item)) fail();
  return { checked, found };
}
export function commentarySearchHitLinks(data, item, selected) {
  const { checked, found } = member(data, item, selected), revision = sourceRevision(checked);
  return { read: readingPosition({ uid: found.citation, kind: 'commentary' }, 0, found.citation, revision), continue: readingPosition({ uid: found.book.uid, kind: 'commentary' }, found.segment - 1, found.citation, revision) };
}
export function commentaryContextCommand(data, item, selected) {
  const { found } = member(data, item, selected);
  return { uid: found.context_with.uid, offset: found.context_with.offset, limit: 3, script: selected.script };
}
export function validateCommentaryContext(response, data, item, selected) {
  const { checked, found } = member(data, item, selected);
  const offset = found.context_with.offset;
  if (!keysOnly(response, ['canonical', 'content_type', 'label', 'alignment_note', 'source', 'citation', 'book', 'commentary', 'total_segments', 'offset', 'limit', 'returned', 'next_offset', 'segments', 'script', 'script_note']) || response.canonical !== false || response.content_type !== 'commentary' || response.label !== label || response.alignment_note !== directAlignment) fail();
  source(response);
  if (!equal(response.source, checked.source)) changed();
  outputScript(response, selected); book(response.book, selected);
  if (!equal(response.book, found.book) || response.citation !== found.book.uid || response.commentary !== found.book.work || !integer(response.total_segments, found.segment, 100001) || response.offset !== offset || response.limit !== 3 || !integer(response.returned, 1, 3) || !Array.isArray(response.segments) || response.segments.length !== response.returned || response.returned !== Math.min(3, response.total_segments - offset) || response.next_offset !== (offset + response.returned < response.total_segments ? offset + response.returned : null)) fail();
  let matches = 0;
  response.segments.forEach((segment, i) => {
    if (!keysOnly(segment, ['ref', 'type', 'text', 'commentary_pts_page_begins']) || segment.ref !== `${found.book.uid}/c${offset + i + 1}` || !['heading', 'prose', 'verse'].includes(segment.type) || !text(segment.text, 100000)) fail();
    pages(segment);
    if (segment.ref === found.citation) {
      matches += 1;
      if (segment.type !== found.type || JSON.stringify(segment.commentary_pts_page_begins) !== JSON.stringify(found.commentary_pts_page_begins)) fail();
    }
  });
  if (matches !== 1) fail();
  return clone(response);
}
