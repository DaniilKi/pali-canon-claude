import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { search, register } from '../src/postcanonical.mjs';
import { transliterate, localizePostCanonical, SCRIPTS } from '../src/script.mjs';
import { z } from 'zod';
import { isReadingLocator, assertPositionPin } from '../web/reading-position.mjs';
import { postSearchSelection, validatePostSearch, postSearchHitLinks, postContextCommand, validatePostContext } from '../web/post-search.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const select = (query = 'sati', script = 'roman', offset = 0) => ({ query, script, offset, limit: 15 });
const result = async (query = 'sati', script = 'roman', offset = 0) => localizePostCanonical(await search(query, { limit: 15, offset }), script);
const params = href => new URLSearchParams(href.split('?')[1]);
const handlers = {};
register({ z, tool(name, description, schema, handler) { handlers[name] = handler; } });
const context = (data, selected = select(), index = 0) => handlers.get_post_canonical({ includeVariants: false, ...postContextCommand(data, data.results[index], selected) });

test('post routes reject foreign, duplicate, private, malformed and unsafe selections before requests', () => {
  assert.deepEqual(postSearchSelection(new URLSearchParams('scope=post&q=+sati+'), 'roman'), select());
  assert.deepEqual(postSearchSelection(new URLSearchParams({ scope: 'post', q: 'ස' }), 'roman'), select('ස'));
  for (const q of ['', ' ', 'a', 'a'.repeat(301), 'sa\u0000ti']) assert.throws(() => postSearchSelection(new URLSearchParams({ scope: 'post', q }), 'thai'));
  for (const raw of ['q=sati', 'scope=canon&q=sati', 'scope=post&scope=post&q=sati', 'scope=post&q=a&q=b', 'scope=post&q=sati&offset=0&offset=1', 'scope=post&q=sati&books=vism', 'scope=post&q=sati&source=pin', 'scope=post&q=sati&note=private', 'scope=post&q=sati&script=thai', 'scope=post&offset=1']) assert.throws(() => postSearchSelection(new URLSearchParams(raw), 'roman'), raw);
  for (const offset of ['', '-1', '+1', '01', '1e2', '1.5', ' 1', '100001', '१२']) assert.throws(() => postSearchSelection(new URLSearchParams({ scope: 'post', q: 'sati', offset }), 'roman'));
  for (const script of [undefined, 'sinh', 'unknown']) assert.throws(() => postSearchSelection(new URLSearchParams('scope=post&q=sati'), script));
  for (const raw of ['q=%zz', 'q=%E0%A4']) assert.throws(() => postSearchSelection(new URLSearchParams('scope=post&q=sati'), 'roman', raw));
  assert.deepEqual(postSearchSelection(new URLSearchParams('scope=post&q=sati&offset=100000'), 'roman'), select('sati', 'roman', 100000));
});

test('actual global post search preserves source pins and literal bounded selection links and context', async () => {
  const data = await result(), selected = select(), checked = validatePostSearch(data, selected), hit = checked.results[0];
  assert.equal(data.searched, '109 post-canonical books'); assert.equal(hit.citation, 'dhammasangani-mulatika');
  const links = postSearchHitLinks(data, hit, selected);
  for (const href of Object.values(links)) {
    assert.equal(isReadingLocator(href), true);
    const args = params(href);
    assert.equal(args.get('uid'), hit.citation); assert.equal(args.get('kind'), 'post'); assert.equal(args.get('offset'), String(hit.read_with.offset)); assert.equal(args.get('ref'), hit.segment_ref); assert.equal(args.has('limit'), false);
    assert.doesNotThrow(() => assertPositionPin(args, data));
  }
  assert.deepEqual(postContextCommand(data, hit, selected), { citation: hit.citation, offset: hit.context_with.offset, limit: 3, script: 'roman' });
  const response = await context(data), validated = validatePostContext(response, data, hit, selected);
  assert.equal(validated.segments[1].ref, hit.segment_ref); assert.deepEqual(validated.source, data.source);
  checked.results[0].excerpt = 'Caller clone'; validated.segments[0].text = 'Caller clone';
  assert.notEqual(data.results[0].excerpt, checked.results[0].excerpt); assert.notEqual(response.segments[0].text, validated.segments[0].text);
});

test('actual MCP all output scripts, native queries, keyboard input, NFC/niggahita and source phrases preserve provenance', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair(), client = new Client({ name: 'web-post-policy', version: '1' });
  await Promise.all([client.connect(a), createServer().connect(b)]);
  const call = async (name, args) => { const raw = await client.callTool({ name, arguments: args }); assert.ok(!raw.isError, JSON.stringify(raw)); return JSON.parse(raw.content[0].text); };
  try {
    for (const [query, script] of [...SCRIPTS.map(script => [script === 'roman' ? 'sati' : transliterate('sati', 'roman', script), script]), ['.thapetvaa', 'roman'], ['dhammaṃ'.normalize('NFD'), 'roman'], ['dhammaṁ', 'roman'], [transliterate('sati', 'roman', 'sinhala'), 'thai'], ['“Yatohaṃ bhagini ariyāya jātiyā jāto”', 'roman'], ['"ā א"', 'roman'], ['ස', 'roman'], [('ස '.repeat(150)).trim(), 'roman']]) {
      const selected = select(query, script), data = await call('search_post_canonical', { query, script, offset: 0, limit: 15 });
      assert.deepEqual(validatePostSearch(data, selected), data);
      if (!data.results.length) continue;
      const hit = data.results[0], response = await call('get_post_canonical', postContextCommand(data, hit, selected));
      assert.deepEqual(validatePostContext(response, data, hit, selected), response);
      if (script !== 'roman') { assert.ok(hit.book_title_roman); assert.equal(response.book.title_roman, hit.book_title_roman); assert.equal(response.script, script); }
    }
  } finally { await client.close(); }
});

/** Pick a real globally searched hit, retaining an actual API page and count. */
async function pageContaining(query, predicate) {
  const all = await search(query, { limit: 1000000 }), index = all.results.findIndex(predicate);
  assert.ok(index >= 0, 'actual global search contains the requested source selection');
  const offset = Math.floor(index / 15) * 15, data = await result(query, 'roman', offset);
  return { data, selected: select(query, 'roman', offset), hit: data.results[index - offset] };
}

test('real Vism volume 2, Saṅgaha sections and appended Vibhāvinī retain distinct citations and numbering warnings', async () => {
  for (const [query, predicate] of [
    ['sati', hit => hit.book_id === 'visuddhimagga-2' && hit.citation.startsWith('Vism §')],
    ['citta', hit => hit.citation === 'Abhidh-s 1.2'],
    ['vibhāvinī', hit => hit.citation === 'abhidhammatthasangaho'],
    ['vibhāviniyā', hit => hit.citation.startsWith('abhidhammatthasangaho 10.')],
  ]) {
    const { data, selected, hit } = await pageContaining(query, predicate), response = await handlers.get_post_canonical({ includeVariants: false, ...postContextCommand(data, hit, selected) });
    assert.deepEqual(validatePostContext(response, data, hit, selected), response);
    assert.equal(params(postSearchHitLinks(data, hit, selected).continue).get('uid'), hit.citation);
    assert.equal(response.citation, hit.citation); assert.equal(response.book.id, hit.book_id);
    if (hit.citation.startsWith('Vism')) assert.match(response.notes.join(' '), /not Ñāṇamoli/);
    if (hit.citation.startsWith('Abhidh-s')) assert.match(response.notes.join(' '), /restart in each chapter/);
    if (hit.citation.startsWith('Vism') || hit.citation.startsWith('Abhidh-s')) {
      assert.throws(() => validatePostContext({ ...response, notes: [] }, data, hit, selected));
      assert.throws(() => validatePostContext({ ...response, vri_paragraph: '896' }, data, hit, selected));
      assert.throws(() => validatePostContext({ ...response, book: { ...response.book, vri_file: 'wrong.nrf.xml' } }, data, hit, selected));
      const wrongBook = clone(data), index = wrongBook.results.findIndex(row => row.citation === hit.citation);
      wrongBook.results[index].book_id = hit.book_id === 'visuddhimagga-2' ? 'visuddhimagga-1' : 'another-book';
      assert.throws(() => validatePostSearch(wrongBook, selected));
    }
    if (hit.citation === 'abhidhammatthasangaho') assert.equal(response.segments[1].text, 'Abhidhammatthavibhāvinīṭīkā');
    for (const badCitation of [hit.book_id === hit.citation ? 'Abhidh-s 9' : hit.book_id, 'Vism ch. 1']) assert.throws(() => validatePostContext({ ...response, citation: badCitation }, data, hit, selected));
  }
});

test('matching pagination, empty pages and actual beginning/end clipping preserve selection-local refs', async () => {
  const next = await result('sati', 'roman', 15); assert.equal(validatePostSearch(next, select('sati', 'roman', 15)).offset, 15);
  const empty = await result('sati', 'roman', 100000); assert.deepEqual(validatePostSearch(empty, select('sati', 'roman', 100000)).results, []);
  const { data, selected, hit } = await pageContaining('citta', hit => hit.citation === 'Abhidh-s 1.2');
  const end = await handlers.get_post_canonical({ includeVariants: false, ...postContextCommand(data, hit, selected) });
  assert.equal(end.returned, 2); assert.equal(end.next_offset, null); assert.equal(end.segments.at(-1).ref, hit.segment_ref);
  assert.doesNotThrow(() => validatePostContext(end, data, hit, selected));
  const beginning = await pageContaining('citta', hit => hit.citation === 'Abhidh-s 1.3');
  const start = await handlers.get_post_canonical({ includeVariants: false, ...postContextCommand(beginning.data, beginning.hit, beginning.selected) });
  assert.equal(start.offset, 0); assert.equal(start.segments[0].ref, beginning.hit.segment_ref);
  assert.doesNotThrow(() => validatePostContext(start, beginning.data, beginning.hit, beginning.selected));
});

test('source, scope, counts, metadata and arbitrary or widened commands fail closed', async () => {
  const data = await result(), hit = data.results[0], selected = select();
  for (const delta of [{ canonical: true }, { label: 'Canon' }, { searched: '1 post-canonical books' }, { books: ['vism'] }, { returned: 15 }, { total_matched: -1 }, { limit: 50 }, { offset: 1 }, { next_offset: 14 }, { query: 'unrelated' }, { source: { ...data.source, files: 'other' } }, { source: { ...data.source, name: 'Unknown' } }, { source: { ...data.source, commit: '' } }, { source: { ...data.source, terms: '' } }, { source: { ...data.source, repository: 'https://example.com' } }, { input_script: 'thai', input_romanized: 'sati' }]) assert.throws(() => validatePostSearch({ ...data, ...delta }, selected));
  for (const delta of [{ canonical: true }, { citation: 'mn10' }, { book_id: 'another-book' }, { segment_ref: 'mn10/4' }, { comments_on: 'mn10' }, { read_with: { ...hit.read_with, citation: 'mn10' } }, { read_with: { ...hit.read_with, limit: 30 } }, { read_with: { ...hit.read_with, script: 'thai' } }, { context_with: { ...hit.context_with, offset: hit.read_with.offset } }, { context_with: { ...hit.context_with, limit: 40 } }, { context_with: { ...hit.context_with, tool: 'get_translation' } }, { context_with: { ...hit.context_with, includeVariants: true } }]) { const bad = clone(data); bad.results[0] = { ...hit, ...delta }; assert.throws(() => validatePostSearch(bad, selected)); }
  const duplicate = clone(data); duplicate.results[1] = clone(hit); assert.throws(() => validatePostSearch(duplicate, selected));
  assert.throws(() => postSearchHitLinks(data, { ...hit, excerpt: 'not actual member' }, selected));
  assert.throws(() => postContextCommand(data, hit, { ...selected, private: 'draft' }));
  assert.throws(() => validatePostSearch({ ...data, source: { ...data.source, locator_revision: '<unsafe>' } }, selected));
  assert.throws(() => validatePostSearch({ ...data, results: data.results.slice(1) }, selected));
  const restricted = localizePostCanonical(await search('sati', { limit: 15, books: ['vism'] }), 'roman');
  assert.throws(() => validatePostSearch(restricted, selected));
});

test('context checks complete source identity, literal selection, count, refs, native title and continuation before wording', async () => {
  const data = await result(), hit = data.results[0], response = await context(data), selected = select();
  for (const source of [{ ...response.source, commit: 'changed-edition' }, { ...response.source, locator_revision: 'changed-map' }, { ...response.source, terms: 'Changed terms' }, { ...response.source, attribution: 'Changed attribution' }]) assert.throws(() => validatePostContext({ ...response, source }, data, hit, selected), error => error.code === 'READING_SOURCE_CHANGED');
  for (const delta of [{ citation: 'dhammasangani-mulatika 1' }, { canonical: true }, { label: 'Canon' }, { kind: 'paragraph' }, { source_selection: 'mn10' }, { offset: response.offset + 1 }, { limit: 1 }, { returned: 2 }, { next_offset: null }, { total_segments: hit.read_with.offset }, { book: { ...response.book, id: 'other' } }, { book: { ...response.book, title: 'Another work' } }, { book: { ...response.book, vri_section: 'Añña' } }, { attribution: 'Unknown' }, { notes: [''] }, { approximate: 'yes' }, { chapter_index: { ...response.chapter_index, scope: 'work' } }, { continue_with: { ...response.continue_with, includeVariants: true } }, { continue_with: { ...response.continue_with, citation: 'another-book' } }]) assert.throws(() => validatePostContext({ ...response, ...delta }, data, hit, selected));
  for (const delta of [{ ref: 'mn10/3' }, { ref: hit.segment_ref }, { comments_on_vri_paragraphs: '1' }, { text: '' }, { vri_page_begins: [''] }]) { const bad = clone(response); bad.segments[0] = { ...bad.segments[0], ...delta }; assert.throws(() => validatePostContext(bad, data, hit, selected)); }
  const query = transliterate('sati', 'roman', 'sinhala'), native = await handlers.search_post_canonical({ query, script: 'thai', offset: 0, limit: 15 }), nativeSelected = select(query, 'thai'), nativeHit = native.results[0], nativeContext = await context(native, nativeSelected);
  for (const delta of [{ script: 'sinhala' }, { input_script: 'thai' }, { input_romanized: 'other' }]) assert.throws(() => validatePostSearch({ ...native, ...delta }, nativeSelected));
  const bad = clone(native); bad.results[0].book_title_roman = 'Another title'; assert.throws(() => validatePostSearch(bad, nativeSelected));
  const switched = clone(nativeContext); switched.book.title_roman = 'Another title'; assert.throws(() => validatePostContext(switched, native, nativeHit, nativeSelected));
  const normalized = await handlers.search_post_canonical({ query: '.thapetvaa', script: 'roman', offset: 0, limit: 15 }); assert.ok(normalized.input_normalised);
  for (const delta of [{ original: 'unrelated' }, { read_as: 'unrelated' }, { changes: [] }, { note: '' }]) assert.throws(() => validatePostSearch({ ...normalized, input_normalised: { ...normalized.input_normalised, ...delta } }, select('.thapetvaa')));
});

test('helpers perform no network or private writes, need no structuredClone and preserve caller objects', async () => {
  const data = await result(), selected = select(), before = JSON.stringify(data), response = await context(data);
  const fetch = globalThis.fetch, nativeClone = globalThis.structuredClone, storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  globalThis.fetch = () => { throw Error('No network'); }; globalThis.structuredClone = undefined;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('No private storage'); } });
  try { const checked = validatePostSearch(data, selected); postSearchHitLinks(checked, checked.results[0], selected); validatePostContext(response, data, data.results[0], selected); assert.equal(JSON.stringify(data), before); }
  finally { globalThis.fetch = fetch; globalThis.structuredClone = nativeClone; if (storage) Object.defineProperty(globalThis, 'localStorage', storage); else delete globalThis.localStorage; }
});
