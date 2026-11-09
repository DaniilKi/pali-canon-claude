import test from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as books from '../src/source-books.mjs';
import { search, register } from '../src/source-book-search.mjs';
import { localizeSearch, transliterate } from '../src/script.mjs';
import { romanizeSearchInput } from '../src/search-segments.mjs';
import { z } from 'zod';
import { isReadingLocator, assertPositionPin } from '../web/reading-position.mjs';
import { assertPageRequest } from '../web/reading-navigation.mjs';
import { bookSearchSelection, bookSearchRoute, bookSearchCatalogue, validateBookSearchPage, bookSearchHitLinks } from '../web/book-search.mjs';

const query = '"Ime kho panāyasmanto dvenavuti pācittiyā"';
const select = (book = 'vin02m1', q = query, offset = 0, source = null) => ({ book, query: q, offset, limit: 15, source });
const params = href => new URLSearchParams(href.split('?')[1]);
const result = () => search(query, { book: 'vin02m1', limit: 15 });
const clone = value => JSON.parse(JSON.stringify(value));
let registeredSearch;
register({ z, tool: (name, description, schema, handler) => { registeredSearch = handler; } });
const toolSearch = (q, script = 'roman') => registeredSearch({ book: 'vin02m1', query: q, script, offset: 0, limit: 15 });

test('strict routes support every actual catalogue ID and preserve optional source pins separately from match offsets', () => {
  for (const item of books.catalogue({ limit: 200 }).items) {
    const selection = bookSearchSelection(new URLSearchParams({ book: item.id }));
    assert.deepEqual(selection, select(item.id, ''));
    assert.deepEqual(bookSearchSelection(params(bookSearchRoute(selection))), selection);
  }
  const selected = bookSearchSelection(new URLSearchParams({ book: 'vin02m1', q: '  quoted ā 😀 phrase  ', offset: '1000000', source: canon.source().commit }));
  assert.equal(selected.query, 'quoted ā 😀 phrase'); assert.equal(selected.offset, 1000000);
  assert.deepEqual(bookSearchSelection(params(bookSearchRoute(selected))), selected);
  assert.equal(params(bookSearchRoute(selected, 15)).get('source'), canon.source().commit);
  assert.equal(bookSearchSelection(new URLSearchParams('book=vin02m1&q=%20%20')).query, '');
});

test('unknown, duplicate, unsafe and private route fields fail before any source request', () => {
  for (const raw of ['q=dhamma', 'book=vin02m1&book=vin01m', 'book=vin02m1&q=a&q=b', 'book=vin02m1&source=x&source=y', 'book=vin02m1&offset=0&offset=1', 'book=vin02m1&uid=mn10', 'book=vin02m1&note=private', 'book=vin02m1&script=thai', 'book=vin02m1&allow_shared=true', 'book=vin02m1&translation=default', 'book=vin02m1&ref=somewhere']) assert.throws(() => bookSearchSelection(new URLSearchParams(raw)), raw);
  for (const book of ['', 'VIN02M1', '../vin02m1', 'vin02m1.mul.xml', 'https://example.com', 'mn10', 'not-a-book', 's0518m.nrf.xml/1']) assert.throws(() => bookSearchSelection(new URLSearchParams({ book, q: 'dhamma' })), book);
  for (const offset of ['', '-1', '+1', '01', '1.5', '1e2', ' 1', '1000001', '१२', '9'.repeat(100)]) assert.throws(() => bookSearchSelection(new URLSearchParams({ book: 'vin02m1', q: 'dhamma', offset })), offset);
  assert.throws(() => bookSearchSelection(new URLSearchParams({ book: 'vin02m1', offset: '1' })));
  assert.throws(() => bookSearchSelection(new URLSearchParams({ book: 'vin02m1', q: 'x'.repeat(501) })));
  for (const source of ['', '<bad>', 'https://example.com', 'a\nb']) assert.throws(() => bookSearchSelection(new URLSearchParams({ book: 'vin02m1', q: 'dhamma', source })));
  assert.throws(() => bookSearchRoute({ ...select(), private: 'not a route field' }));
  assert.throws(() => bookSearchRoute(select(), 1000001));
});

test('empty-query catalogue validation confirms the exact selected book and safe existing reading command', () => {
  const catalogue = books.catalogue({ offset: 0, limit: 200 }), selected = select('vin02m1', '');
  const item = bookSearchCatalogue(catalogue, selected);
  assert.equal(catalogue.total, 61); assert.equal(item.id, selected.book); assert.deepEqual(item.read_with, { tool: 'get_text', book: selected.book });
  item.title = 'Independent clone'; assert.notEqual(catalogue.items.find(value => value.id === selected.book).title, item.title);
  for (const change of [{ node: 'canon' }, { limit: 60 }, { offset: 1 }, { total: 62 }, { next_offset: 61 }, { items: [...catalogue.items, catalogue.items[0]], total: 62 }]) assert.throws(() => bookSearchCatalogue({ ...catalogue, ...change }, selected));
  for (const read_with of [{ tool: 'get_translation', book: selected.book }, { tool: 'get_text', book: 'vin01m' }, { tool: 'get_text', book: selected.book, uid: 'mn10' }, { tool: 'get_text', book: selected.book, offset: 0 }]) {
    const bad = clone(catalogue); bad.items.find(value => value.id === selected.book).read_with = read_with;
    assert.throws(() => bookSearchCatalogue(bad, selected));
  }
  assert.throws(() => bookSearchCatalogue(catalogue, select('vin99m', '')));
  assert.throws(() => bookSearchCatalogue(catalogue, select()));
});

test('actual printed source-book-only phrase retains exact file context, source terms and pinned hit links', () => {
  const data = result(); assert.equal(canon.search(query).total_texts_matched, 0);
  const checked = validateBookSearchPage(data, select());
  assert.equal(checked.total_matched, 1); assert.equal(checked.results[0].ref, 'vri-book:vin02m1/7');
  assert.equal(checked.source.terms, canon.source().terms); assert.equal(checked.attribution, canon.source().attribution);
  const links = bookSearchHitLinks(checked, checked.results[0], select()), exact = params(links.read), context = params(links.context);
  assert.equal(exact.get('book'), 'vin02m1'); assert.equal(exact.get('offset'), '6'); assert.equal(exact.get('ref'), checked.results[0].ref); assert.equal(exact.get('source'), canon.source().commit);
  assert.equal(context.get('offset'), '5'); assert.equal(context.get('page_source'), canon.source().commit); assert.equal(context.has('ref'), false);
  assert.equal(isReadingLocator(links.read), true); assert.equal(isReadingLocator(links.context), false);
  assert.doesNotThrow(() => assertPositionPin(exact, books.readBook({ book: 'vin02m1', offset: 6, limit: 1 })));
  assert.doesNotThrow(() => assertPageRequest(context));
  const noContext = clone(data); delete noContext.results[0].context_with;
  assert.equal(bookSearchHitLinks(noContext, noContext.results[0], select()).context, null);
});

test('actual matching-segment pagination stays separate from source-position bounds and can reach an empty millionth results offset', () => {
  const all = search('Namo tassa', { book: 'vin01m', limit: 1000000 }); assert.equal(all.total_matched, 40);
  let offset = 0; const refs = [];
  do {
    const page = search('Namo tassa', { book: 'vin01m', limit: 15, offset }), checked = validateBookSearchPage(page, select('vin01m', 'Namo tassa', offset));
    refs.push(...checked.results.map(item => item.ref)); offset = checked.next_offset;
  } while (offset !== null);
  assert.deepEqual(refs, all.results.map(item => item.ref));
  const empty = search('Namo tassa', { book: 'vin01m', limit: 15, offset: 1000000 });
  assert.deepEqual(validateBookSearchPage(empty, select('vin01m', 'Namo tassa', 1000000)).results, []);
  const missing = search('"absentprintedphrasezzzz"', { book: 'vin01m', limit: 15 });
  assert.equal(validateBookSearchPage(missing, select('vin01m', missing.query)).total_matched, 0);
});

test('actual native/Velthuis normalization and raw phrase provenance bind the returned query without browser inference', async () => {
  const raw = result(), native = localizeSearch(raw, 'thai', romanizeSearchInput(query));
  native.results = native.results.map(item => ({ ...item, read_with: { ...item.read_with, script: 'thai' }, context_with: { ...item.context_with, script: 'thai' } }));
  const checked = validateBookSearchPage(native, select());
  assert.equal(checked.results[0].ref, raw.results[0].ref); assert.equal(checked.script, 'thai');
  assert.equal(checked.results[0].title_roman, raw.book.title); assert.equal(checked.script_note, native.script_note);
  assert.equal(params(bookSearchHitLinks(checked, checked.results[0], select()).read).get('ref'), raw.results[0].ref);
  for (const typed of ['.thapetvaa', 'paacittiyaa', transliterate('pācittiyā', 'roman', 'sinhala')]) {
    const actual = await toolSearch(typed), selected = select('vin02m1', typed);
    const validated = validateBookSearchPage(actual, selected);
    assert.equal(validated.query, actual.query);
    if (actual.results.length) assert.equal(params(bookSearchHitLinks(validated, validated.results[0], selected).read).get('book'), selected.book);
    assert.ok(actual.input_normalised || actual.input_romanized, 'actual normalization/conversion label is exercised');
  }
  const phraseQuery = '"ā א"', phrase = await toolSearch(phraseQuery);
  assert.equal(phrase.query_mode, 'source_phrase'); assert.equal(validateBookSearchPage(phrase, select('vin02m1', phraseQuery)).query, phraseQuery);
  const asTyped = { ...raw, query_mode: 'as_typed_phrase', query_note: 'Original source wording retained', notes: ['Existing source label'] };
  assert.equal(validateBookSearchPage(asTyped, select()).query_note, asTyped.query_note);
});

test('stale same-book queries and unrelated normalization/native metadata cannot authorize excerpts or links', async () => {
  const data = result();
  assert.throws(() => validateBookSearchPage(data, select('vin02m1', 'unrelated query')));
  assert.throws(() => bookSearchHitLinks(data, data.results[0], select('vin02m1', 'unrelated query')));
  assert.throws(() => bookSearchHitLinks(data, data.results[0]));
  for (const change of [{ query: 'unrelated' }, { input_script: 'thai', input_romanized: query }, { query_mode: 'source_phrase' }, { input_normalised: {} }]) assert.throws(() => validateBookSearchPage({ ...data, ...change }, select()));
  const typed = '.thapetvaa', normalized = await toolSearch(typed), selected = select('vin02m1', typed);
  assert.ok(normalized.input_normalised);
  for (const delta of [{ original: 'unrelated' }, { read_as: 'unrelated' }, { note: '' }, { changes: [] }, { changes: [{ from: 'unrelated', to: normalized.query, rule: 'velthuis' }] }]) assert.throws(() => validateBookSearchPage({ ...normalized, input_normalised: { ...normalized.input_normalised, ...delta } }, selected));
  const nativeQuery = transliterate('pācittiyā', 'roman', 'sinhala'), native = await toolSearch(nativeQuery);
  for (const delta of [{ input_script: 'thai' }, { input_romanized: 'unrelated' }, { input_script: undefined }]) assert.throws(() => validateBookSearchPage({ ...native, ...delta }, select('vin02m1', nativeQuery)));
  const phrase = { ...data, query_mode: 'as_typed_phrase', input_normalised: normalized.input_normalised };
  assert.throws(() => validateBookSearchPage(phrase, select()));
});

test('unknown source, fallback, missing terms and changed requested revision refuse excerpts before presentation', () => {
  const data = result();
  for (const change of [{ selection: 'translation' }, { canonical: false }, { fallback: null }, { translation_scope: null }, { source: { ...data.source, name: 'Other source' } }, { source: { ...data.source, repository: 'https://example.com' } }, { source: { ...data.source, terms: '' } }, { source: { ...data.source, attribution: '' } }, { source: { ...data.source, commit: '' } }, { attribution: 'Different attribution' }]) assert.throws(() => validateBookSearchPage({ ...data, ...change }, select()));
  assert.throws(() => validateBookSearchPage(data, select('vin02m1', query, 0, 'older-source')), error => error.code === 'READING_SOURCE_CHANGED');
  assert.doesNotThrow(() => validateBookSearchPage(data, select('vin02m1', query, 0, data.source.commit)));
  const mapped = { ...data, source: { ...data.source, locator_revision: 'new-locator' } };
  assert.throws(() => validateBookSearchPage(mapped, select('vin02m1', query, 0, data.source.commit)), error => error.code === 'READING_SOURCE_CHANGED');
  assert.doesNotThrow(() => validateBookSearchPage(mapped, select('vin02m1', query, 0, 'new-locator')));
});

test('wrong result identities, duplicate refs, unsafe commands, extra scope fields and invented context are rejected', () => {
  const data = result(), original = data.results[0];
  for (const change of [{ ref: 'mn10/1' }, { ref: 'vri-book:vin02m1/07' }, { book_id: 'vin01m' }, { segment: 8 }, { type: 'translation' }, { text_id: 'mn10' }, { excerpt: '' }, { title: 'Other book' }, { read_with: { ...original.read_with, tool: 'get_translation' } }, { read_with: { ...original.read_with, book: 'vin01m' } }, { read_with: { ...original.read_with, offset: 5 } }, { read_with: { ...original.read_with, offset: 100001 } }, { read_with: { ...original.read_with, limit: 30 } }, { read_with: { ...original.read_with, uid: 'mn10' } }, { read_with: { ...original.read_with, script: 'javascript' } }, { context_with: { ...original.context_with, offset: 6 } }, { context_with: { ...original.context_with, limit: 1 } }, { context_with: { ...original.context_with, source: 'pin' } }]) assert.throws(() => validateBookSearchPage({ ...data, results: [{ ...original, ...change }] }, select()));
  const two = { ...data, total_matched: 2, returned: 2, results: [original, clone(original)] };
  assert.throws(() => validateBookSearchPage(two, select()));
  assert.throws(() => bookSearchHitLinks(data, { ...original, read_with: { ...original.read_with, offset: 0 } }, select()));
});

test('invalid counts/continuations fail closed and maximum readable source position never expands the offset cap', () => {
  const data = result();
  for (const change of [{ total_segments: 0 }, { total_segments: 100002 }, { total_matched: data.total_segments + 1 }, { offset: 1 }, { limit: 50 }, { returned: 0 }, { next_offset: 1 }, { next_offset: undefined }, { results: [] }, { query: '' }]) assert.throws(() => validateBookSearchPage({ ...data, ...change }, select()));
  const last = clone(data); last.total_segments = 100001; last.results[0].segment = 100001; last.results[0].ref = 'vri-book:vin02m1/100001'; last.results[0].read_with.offset = 100000; last.results[0].context_with.offset = 99999;
  assert.doesNotThrow(() => validateBookSearchPage(last, select()));
  assert.equal(params(bookSearchHitLinks(last, last.results[0], select()).read).get('offset'), '100000');
  const tooFar = clone(last); tooFar.results[0].segment = 100002; tooFar.results[0].ref = 'vri-book:vin02m1/100002'; tooFar.results[0].read_with.offset = 100001;
  assert.throws(() => validateBookSearchPage(tooFar, select()));
});

test('policy is offline, portable and immutable; callers receive independent checked clones and exact source-only links', () => {
  const data = result(), selected = select(), before = JSON.stringify({ data, selected });
  const fetch = globalThis.fetch, cloneNative = globalThis.structuredClone, storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  globalThis.fetch = () => { throw Error('No network'); }; globalThis.structuredClone = undefined;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('No storage'); } });
  try {
    const checked = validateBookSearchPage(data, selected); bookSearchHitLinks(checked, checked.results[0], selected);
    checked.results[0].excerpt = 'Independent caller value'; checked.source.commit = 'Independent clone';
    assert.equal(JSON.stringify({ data, selected }), before);
    const route = bookSearchRoute(selected); assert.equal(isReadingLocator(route), false);
  } finally { globalThis.fetch = fetch; globalThis.structuredClone = cloneNative; if (storage) Object.defineProperty(globalThis, 'localStorage', storage); else delete globalThis.localStorage; }
});
