/** Search complete bundled root files without assigning their hits to individual citations. */
import { sourceRevision, readingPosition } from './reading-position.mjs';
import { readingPagePosition } from './reading-navigation.mjs';
import { romanizeSearchInput, hasSearchPhrase } from '../src/search-segments.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const text = (value, max = 4000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const bookId = value => typeof value === 'string' && value.length <= 100 && /^(?:vin[0-9]{2}m[0-9]*|s[0-9]{4}m[0-9]*(?:\.nrf\.xml)?|abh[0-9]{2}m[0-9]*)$/.test(value);
const fileFor = book => book.endsWith('.nrf.xml') ? book : book + '.mul.xml';
const scripts = new Set(['roman', 'sinhala', 'thai', 'myanmar', 'devanagari', 'khmer', 'lao', 'lanna']);
const keysOnly = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const fail = () => { throw Error('The complete source-book search does not match this selection. No source or reading position was substituted.'); };
function safeRevision(value) {
  if (typeof value !== 'string' || sourceRevision({ source: { commit: value } }) !== value) fail();
  return value;
}
function selection(value) {
  if (!keysOnly(value, ['book', 'query', 'offset', 'limit', 'source']) || !bookId(value.book) || typeof value.query !== 'string' || value.query !== value.query.trim() || value.query.length > 500 || !integer(value.offset, 0, 1000000) || value.limit !== 15 || !value.query && value.offset !== 0) fail();
  if (value.source !== null) safeRevision(value.source);
  return value;
}

export function bookSearchSelection(args) {
  for (const key of args.keys()) if (!['book', 'q', 'offset', 'source'].includes(key) || args.getAll(key).length !== 1) fail();
  const raw = args.has('offset') ? args.get('offset') : '0';
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) fail();
  return selection({ book: args.get('book'), query: (args.get('q') ?? '').trim(), offset: Number(raw), limit: 15, source: args.has('source') ? args.get('source') : null });
}
export function bookSearchRoute(value, offset = value.offset) {
  selection(value);
  selection({ ...value, offset });
  const args = new URLSearchParams({ book: value.book });
  if (value.query) args.set('q', value.query);
  if (offset) args.set('offset', String(offset));
  if (value.source !== null) args.set('source', value.source);
  return '#book-search?' + args;
}

/** The catalogue has no source revision; it verifies only an exact existing book selection. */
export function bookSearchCatalogue(data, selected) {
  selection(selected);
  if (selected.query || !object(data) || data.node !== 'books' || data.name !== 'Complete VRI source books' || !integer(data.total, 1, 200) || data.offset !== 0 || data.limit !== 200 || data.next_offset !== null || !Array.isArray(data.items) || data.items.length !== data.total || !text(data.note)) fail();
  const seen = new Set(); let result;
  for (const item of data.items) {
    if (!object(item) || !bookId(item.id) || seen.has(item.id) || !text(item.title, 1000) || !text(item.collection, 30) || !['vinaya', 'sutta', 'abhidhamma'].includes(item.pitaka) || item.vri_file !== fileFor(item.id) || !keysOnly(item.read_with, ['tool', 'book']) || Object.keys(item.read_with).length !== 2 || item.read_with.tool !== 'get_text' || item.read_with.book !== item.id) fail();
    seen.add(item.id); if (item.id === selected.book) result = item;
  }
  if (!result) fail();
  return JSON.parse(JSON.stringify(result));
}

function source(data, selected) {
  const value = data.source;
  if (!keysOnly(value, ['name', 'repository', 'commit', 'attribution', 'terms', 'locator_revision']) || value.name !== 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI)' || value.repository !== 'https://github.com/VipassanaTech/tipitaka-xml' || !text(value.attribution, 10000) || !text(value.terms, 10000) || data.attribution !== value.attribution) fail();
  safeRevision(value.commit);
  const revision = safeRevision(sourceRevision(data));
  if (selected.source !== null && selected.source !== revision) {
    const error = Error('The source revision changed since this complete-book search was opened. Review the current source explicitly; no replacement excerpt was displayed.'); error.code = 'READING_SOURCE_CHANGED'; throw error;
  }
  return revision;
}
function command(value, book, offset, limit, outputScript) {
  if (!keysOnly(value, ['tool', 'book', 'offset', 'limit', 'script']) || value.tool !== 'get_text' || value.book !== book || value.offset !== offset || value.limit !== limit || own(value, 'script') && !scripts.has(value.script) || outputScript && value.script !== outputScript) fail();
}
function queryProvenance(data, selected) {
  const input = romanizeSearchInput(selected.query), base = input.text;
  if (input.original) {
    if (data.input_script !== input.script || data.input_romanized !== base) fail();
  } else if (own(data, 'input_script') || own(data, 'input_romanized')) fail();
  const phrase = data.query_mode;
  if (input.source_phrase && phrase !== 'source_phrase') fail();
  if (phrase === 'source_phrase' && !input.source_phrase || phrase === 'as_typed_phrase' && (!hasSearchPhrase(base) || input.source_phrase)) fail();
  if (phrase !== undefined) {
    if (data.query !== base || own(data, 'input_normalised')) fail();
    return;
  }
  if (!own(data, 'input_normalised')) { if (data.query !== base) fail(); return; }
  const normalized = data.input_normalised;
  if (!keysOnly(normalized, ['original', 'read_as', 'scheme', 'changes', 'note']) || normalized.original !== base || normalized.read_as !== data.query || !['ascii', 'unicode', 'velthuis', 'harvard-kyoto'].includes(normalized.scheme) || !text(normalized.note, 10000) || !Array.isArray(normalized.changes) || !integer(normalized.changes.length, 1, 500)) fail();
  for (const change of normalized.changes) {
    if (!keysOnly(change, ['from', 'to', 'rule', 'label']) || !text(change.from, 500) || !text(change.to, 500) || !text(change.rule, 100) || own(change, 'label') && !text(change.label, 1000) || !base.normalize('NFC').includes(change.from.normalize('NFC')) || !data.query.normalize('NFC').includes(change.to.normalize('NFC'))) fail();
  }
}
function hit(item, data) {
  const allowed = ['ref', 'book_id', 'title', 'title_roman', 'segment', 'type', 'vri_paragraph', 'pts_page_begins', 'thai_page_begins', 'myanmar_page_begins', 'vri_page_begins', 'excerpt', 'read_with', 'context_with'];
  if (!keysOnly(item, allowed) || item.book_id !== data.book.id || !integer(item.segment, 1, data.total_segments) || item.ref !== `vri-book:${data.book.id}/${item.segment}` || !text(item.title, 1000) || !['heading', 'prose', 'verse'].includes(item.type) || !text(item.excerpt, 4000)) fail();
  if (own(item, 'title_roman') ? item.title_roman !== data.book.title : item.title !== data.book.title) fail();
  const offset = item.segment - 1;
  if (!integer(offset, 0, 100000)) fail();
  command(item.read_with, data.book.id, offset, 1, data.script);
  if (own(item, 'context_with')) command(item.context_with, data.book.id, Math.max(0, offset - 1), 3, data.script);
  if (own(item, 'vri_paragraph') && !text(item.vri_paragraph, 100)) fail();
  for (const field of ['pts_page_begins', 'thai_page_begins', 'myanmar_page_begins', 'vri_page_begins']) if (own(item, field) && (!Array.isArray(item[field]) || item[field].length > 100 || item[field].some(value => !text(value, 200)))) fail();
}

export function validateBookSearchPage(data, selected) {
  selection(selected);
  const allowed = ['query', 'selection', 'canonical', 'book', 'total_segments', 'total_matched', 'offset', 'limit', 'returned', 'next_offset', 'results', 'citation_note', 'source', 'attribution', 'notes', 'input_script', 'input_romanized', 'input_normalised', 'query_mode', 'query_note', 'script', 'script_note'];
  if (!selected.query || !keysOnly(data, allowed) || data.selection !== 'source_book' || data.canonical !== true || !keysOnly(data.book, ['id', 'title', 'collection', 'vri_file']) || data.book.id !== selected.book || data.book.vri_file !== fileFor(selected.book) || !text(data.book.title, 1000) || !text(data.book.collection, 30) || !text(data.query, 500) || !integer(data.total_segments, 1, 100001) || !integer(data.total_matched, 0, data.total_segments) || data.offset !== selected.offset || data.limit !== 15 || !integer(data.returned, 0, 15) || !Array.isArray(data.results) || data.results.length !== data.returned || data.returned !== Math.min(15, Math.max(0, data.total_matched - data.offset)) || data.next_offset !== (data.offset + data.returned < data.total_matched ? data.offset + data.returned : null) || !text(data.citation_note)) fail();
  source(data, selected);
  if (own(data, 'script') && !scripts.has(data.script)) fail();
  for (const field of ['script_note', 'query_note', 'input_romanized']) if (own(data, field) && !text(data[field], field === 'input_romanized' ? 500 : 10000)) fail();
  if (own(data, 'input_script') && !scripts.has(data.input_script)) fail();
  if (own(data, 'query_mode') && !['source_phrase', 'as_typed_phrase'].includes(data.query_mode)) fail();
  if (own(data, 'notes') && (!Array.isArray(data.notes) || data.notes.length > 50 || data.notes.some(value => !text(value, 10000)))) fail();
  if (own(data, 'input_normalised') && !object(data.input_normalised)) fail();
  queryProvenance(data, selected);
  const seen = new Set(); let previous = 0;
  for (const item of data.results) {
    hit(item, data);
    if (seen.has(item.ref) || item.segment <= previous) fail();
    seen.add(item.ref); previous = item.segment;
  }
  return JSON.parse(JSON.stringify(data));
}

export function bookSearchHitLinks(data, item, selected) {
  const checked = validateBookSearchPage(data, selected);
  const found = checked.results.find(value => value.ref === item?.ref);
  if (!found || JSON.stringify(found) !== JSON.stringify(item)) fail();
  const revision = sourceRevision(checked), context = { book: checked.book.id };
  return { read: readingPosition(context, found.read_with.offset, found.ref, revision), context: own(found, 'context_with') ? readingPagePosition(context, found.context_with.offset, revision) : null };
}
