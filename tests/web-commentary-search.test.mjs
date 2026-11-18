import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { search, register } from '../src/commentary-search.mjs';
import { getCommentary, load, bookSegments } from '../src/commentary.mjs';
import { transliterate, localizeCommentary, SCRIPTS } from '../src/script.mjs';
import { z } from 'zod';
import { isReadingLocator, assertPositionPin } from '../web/reading-position.mjs';
import { commentarySearchSelection, validateCommentarySearch, commentarySearchHitLinks, commentaryContextCommand, validateCommentaryContext } from '../web/commentary-search.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const select = (query = 'sati', script = 'roman', offset = 0) => ({ query, script, offset, limit: 15 });
const result = () => localizeCommentary(search('sati', { limit: 15 }), 'roman');
const params = href => new URLSearchParams(href.split('?')[1]);
let handler;
register({ z, tool(name, description, schema, fn) { handler = fn; } });
const toolSearch = (query, script = 'roman', offset = 0) => handler({ query, script, offset, limit: 15 });
const context = (data, selected = select(), index = 0) => getCommentary(data.results[index].book.uid, commentaryContextCommand(data, data.results[index], selected));

test('commentary routes reject foreign, duplicate, private, malformed and unsafe selections before requests', () => {
  assert.deepEqual(commentarySearchSelection(new URLSearchParams('scope=commentary&q=+sati+'), 'roman'), select());
  for (const q of ['', ' ', 'a']) assert.throws(() => commentarySearchSelection(new URLSearchParams({ scope: 'commentary', q }), 'thai'));
  for (const raw of ['q=sati', 'scope=canon&q=sati', 'scope=commentary&scope=commentary&q=sati', 'scope=commentary&q=a&q=b', 'scope=commentary&q=sati&offset=0&offset=1', 'scope=commentary&q=sati&books=abh01a.att.xml', 'scope=commentary&q=sati&source=pin', 'scope=commentary&q=sati&note=private', 'scope=commentary&q=sati&script=thai', 'scope=commentary&offset=1']) assert.throws(() => commentarySearchSelection(new URLSearchParams(raw), 'roman'), raw);
  for (const offset of ['', '-1', '+1', '01', '1e2', '1.5', ' 1', '1000001', '१२']) assert.throws(() => commentarySearchSelection(new URLSearchParams({ scope: 'commentary', q: 'sati', offset }), 'roman'));
  for (const script of [undefined, 'sinh', 'unknown']) assert.throws(() => commentarySearchSelection(new URLSearchParams('scope=commentary&q=sati'), script));
  assert.throws(() => commentarySearchSelection(new URLSearchParams('scope=commentary&q=sati'), 'roman', 'q=%zz'));
  assert.throws(() => commentarySearchSelection(new URLSearchParams({ scope: 'commentary', q: 'a'.repeat(501) }), 'roman'));
});

test('actual commentary search yields exact source links, a literal three-segment command and independently cloned context', () => {
  const data = result(), selected = select(), checked = validateCommentarySearch(data, selected), hit = checked.results[0];
  assert.equal(checked.searched_books, 47); assert.equal(checked.source.files, 'romn/*.att.xml');
  assert.equal(hit.citation, 'commentary:abh01a.att.xml/c28');
  const links = commentarySearchHitLinks(checked, hit, selected), read = params(links.read), continuing = params(links.continue);
  for (const href of Object.values(links)) assert.equal(isReadingLocator(href), true);
  assert.equal(read.get('uid'), hit.citation); assert.equal(read.get('kind'), 'commentary'); assert.equal(read.get('offset'), '0'); assert.equal(read.get('ref'), hit.citation);
  assert.equal(continuing.get('uid'), hit.book.uid); assert.equal(continuing.get('offset'), String(hit.segment - 1)); assert.equal(continuing.get('ref'), hit.citation);
  assert.doesNotThrow(() => assertPositionPin(read, getCommentary(hit.citation)));
  assert.deepEqual(commentaryContextCommand(data, hit, selected), { uid: hit.book.uid, offset: hit.segment - 2, limit: 3, script: 'roman' });
  const response = context(data), validated = validateCommentaryContext(response, checked, hit, selected);
  assert.equal(validated.segments[1].ref, hit.citation); assert.match(validated.alignment_note, /does not assert an alignment/);
  validated.segments[0].text = 'Caller clone'; checked.results[0].excerpt = 'Caller clone';
  assert.notEqual(data.results[0].excerpt, checked.results[0].excerpt); assert.notEqual(response.segments[0].text, validated.segments[0].text);
});

test('actual MCP roman, native, normalized and quoted inputs preserve query provenance and native context titles', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair(), client = new Client({ name: 'web-commentary-policy', version: '1' });
  await Promise.all([client.connect(a), createServer().connect(b)]);
  const call = async (name, args) => { const raw = await client.callTool({ name, arguments: args }); assert.ok(!raw.isError, JSON.stringify(raw)); return JSON.parse(raw.content[0].text); };
  try {
    for (const [query, script] of [...SCRIPTS.map(script => ['sati', script]), ['.thapetvaa', 'roman'], ['dhammaṃ'.normalize('NFD'), 'roman'], ['dhammaṁ', 'roman'], [transliterate('sati', 'roman', 'sinhala'), 'thai'], ['"ā א"', 'roman']]) {
      const selected = select(query, script), data = await call('search_commentary', { query, script, offset: 0, limit: 15 });
      assert.deepEqual(validateCommentarySearch(data, selected), data);
      if (!data.results.length) continue;
      const hit = data.results[0], response = await call('get_commentary', commentaryContextCommand(data, hit, selected));
      assert.deepEqual(validateCommentaryContext(response, data, hit, selected), response);
      if (script !== 'roman') { assert.ok(hit.book.title_roman); assert.equal(response.book.title_roman, hit.book.title_roman); assert.equal(response.script, script); }
    }
  } finally { await client.close(); }
});

test('matching-result pagination and final source-segment context preserve actual offsets and short boundaries', () => {
  const openingQuery = '"Namo tassa bhagavato arahato sammāsambuddhassa"';
  const opening = localizeCommentary(search(openingQuery, { limit: 15 }), 'roman'), openingSelected = select(openingQuery), openingHit = opening.results[0];
  assert.equal(openingHit.segment, 1); assert.equal(commentaryContextCommand(opening, openingHit, openingSelected).offset, 0);
  assert.doesNotThrow(() => validateCommentaryContext(context(opening, openingSelected), opening, openingHit, openingSelected));
  const first = result(), next = localizeCommentary(search('sati', { limit: 15, offset: 15 }), 'roman');
  assert.equal(validateCommentarySearch(next, select('sati', 'roman', 15)).offset, 15);
  assert.notEqual(first.results[0].citation, next.results[0].citation);
  const empty = localizeCommentary(search('sati', { limit: 15, offset: 1000000 }), 'roman');
  assert.deepEqual(validateCommentarySearch(empty, select('sati', 'roman', 1000000)).results, []);
  const book = load().books.find(book => bookSegments(book).at(-1).text.length > 5), all = bookSegments(book), query = '"' + all.at(-1).text + '"';
  const actual = localizeCommentary(search(query, { limit: 1000000 }), 'roman'), tail = actual.results.find(hit => hit.book.vri_file === book.file && hit.segment === all.length);
  assert.ok(tail, 'actual final source segment is searched');
  const data = { ...actual, offset: 0, limit: 15, returned: 1, total_matched: 1, next_offset: null, results: [tail] }, selected = select(query);
  const response = context(data, selected);
  assert.equal(response.returned, 2); assert.equal(response.next_offset, null);
  assert.doesNotThrow(() => validateCommentaryContext(response, data, tail, selected));
});

test('source, scope, labels, counts, commands and invented alignment fail closed', () => {
  const data = result(), hit = data.results[0], selected = select();
  for (const delta of [{ canonical: true }, { content_type: 'canon' }, { label: 'Commentary' }, { alignment_note: 'Aligned' }, { books: ['abh01a.att.xml'] }, { total_matched: -1 }, { returned: 1 }, { limit: 50 }, { offset: 1 }, { next_offset: 14 }, { searched_books: 0 }, { searched_books: 1 }, { query: 'unrelated' }, { source: { ...data.source, files: ['romn/*.att.xml'] } }, { source: { ...data.source, name: 'Unknown' } }, { source: { ...data.source, commit: '' } }, { source: { ...data.source, terms: '' } }, { source: { ...data.source, repository: 'https://example.com' } }, { input_script: 'thai', input_romanized: 'sati' }]) assert.throws(() => validateCommentarySearch({ ...data, ...delta }, selected));
  for (const delta of [{ canonical: true }, { content_type: 'canon' }, { citation: 'mn10/c28' }, { segment: hit.segment + 1 }, { comments_on_vri_paragraphs: '1' }, { book: { ...hit.book, uid: 'commentary:other.att.xml' } }, { read_with: { ...hit.read_with, uid: 'mn10' } }, { read_with: { ...hit.read_with, limit: 1 } }, { read_with: { ...hit.read_with, script: 'thai' } }, { context_with: { ...hit.context_with, offset: hit.segment - 1 } }, { context_with: { ...hit.context_with, limit: 40 } }, { context_with: { ...hit.context_with, tool: 'get_translation' } }, { context_with: { ...hit.context_with, source: 'pin' } }]) { const bad = clone(data); bad.results[0] = { ...hit, ...delta }; assert.throws(() => validateCommentarySearch(bad, selected)); }
  const duplicate = clone(data); duplicate.results[1] = clone(hit); assert.throws(() => validateCommentarySearch(duplicate, selected));
  assert.throws(() => commentarySearchHitLinks(data, { ...hit, excerpt: 'not actual member' }, selected));
  assert.throws(() => commentaryContextCommand(data, hit, { ...selected, private: 'draft' }));
});

test('context source identity changes are explicit and complete source metadata cannot silently drift', () => {
  const data = result(), hit = data.results[0], response = context(data);
  for (const source of [{ ...response.source, commit: 'changed-edition' }, { ...response.source, locator_revision: 'changed-map' }, { ...response.source, terms: 'Changed terms' }, { ...response.source, attribution: 'Changed attribution' }]) assert.throws(() => validateCommentaryContext({ ...response, source }, data, hit, select()), error => error.code === 'READING_SOURCE_CHANGED');
  for (const delta of [{ citation: hit.citation }, { canonical: true }, { alignment_note: 'Aligned to MN 10' }, { text_id: 'mn10' }, { offset: response.offset + 1 }, { limit: 1 }, { returned: 2 }, { next_offset: null }, { total_segments: hit.segment - 1 }, { book: { ...response.book, work: 'Another work' } }, { commentary: 'Another work' }]) assert.throws(() => validateCommentaryContext({ ...response, ...delta }, data, hit, select()));
  for (const delta of [{ ref: 'mn10/c28' }, { ref: hit.citation }, { comments_on_vri_paragraphs: '1' }, { text: '' }]) { const bad = clone(response); bad.segments[0] = { ...bad.segments[0], ...delta }; assert.throws(() => validateCommentaryContext(bad, data, hit, select())); }
  const type = clone(response); type.segments[1].type = type.segments[1].type === 'prose' ? 'verse' : 'prose'; assert.throws(() => validateCommentaryContext(type, data, hit, select()));
});

test('native script output, roman title identity and backend normalization labels cannot be substituted', async () => {
  const query = transliterate('sati', 'roman', 'sinhala'), data = await toolSearch(query, 'thai'), selected = select(query, 'thai'), hit = data.results[0], response = context(data, selected);
  for (const delta of [{ script: 'sinhala' }, { input_script: 'thai' }, { input_romanized: 'other' }]) assert.throws(() => validateCommentarySearch({ ...data, ...delta }, selected));
  const bad = clone(data); bad.results[0].book.title_roman = 'Another title'; assert.throws(() => validateCommentarySearch(bad, selected));
  const switched = clone(response); switched.book.title_roman = 'Another title'; assert.throws(() => validateCommentaryContext(switched, data, hit, selected));
  assert.throws(() => validateCommentaryContext({ ...response, script: 'sinhala' }, data, hit, selected));
  const normalized = await toolSearch('.thapetvaa'); assert.ok(normalized.input_normalised);
  for (const delta of [{ original: 'unrelated' }, { read_as: 'unrelated' }, { changes: [] }, { note: '' }]) assert.throws(() => validateCommentarySearch({ ...normalized, input_normalised: { ...normalized.input_normalised, ...delta } }, select('.thapetvaa')));
});

test('helpers use no network, storage, source corpus or structuredClone and preserve private input owners', () => {
  const data = result(), selected = select(), before = JSON.stringify(data), response = context(data);
  const fetch = globalThis.fetch, nativeClone = globalThis.structuredClone, storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  globalThis.fetch = () => { throw Error('No network'); }; globalThis.structuredClone = undefined;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('No private storage'); } });
  try { const checked = validateCommentarySearch(data, selected); commentarySearchHitLinks(checked, checked.results[0], selected); validateCommentaryContext(response, data, data.results[0], selected); assert.equal(JSON.stringify(data), before); }
  finally { globalThis.fetch = fetch; globalThis.structuredClone = nativeClone; if (storage) Object.defineProperty(globalThis, 'localStorage', storage); else delete globalThis.localStorage; }
});
