import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { isReadingLocator } from '../web/reading-position.mjs';
import { citationSelection, citationRoute, validateCitationResolution } from '../web/citation-resolution.mjs';

let client;
before(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'citation-resolution-test', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
});
after(async () => { await client?.close(); });
const clone = value => JSON.parse(JSON.stringify(value));
async function resolve(reference, script = 'roman') {
  const result = await client.callTool({ name: 'resolve_reference', arguments: { reference, script } });
  assert.ok(!result.isError, JSON.stringify(result.content));
  return result.structuredContent;
}
const params = href => new URLSearchParams(href.slice(href.indexOf('?') + 1));

test('citation routes carry one bounded public reference and never become saved reading positions', () => {
  for (const reference of ['MN 10', 'Vism I.1', 'Abhidh-s 1', 'Satipatthana Sutta', 'MN ๑๐', 'https://www.accesstoinsight.org/tipitaka/mn/mn.010.than.html', 'a?b&c=d']) {
    const href = citationRoute(reference);
    assert.equal(citationSelection(params(href)), reference);
    assert.equal(isReadingLocator(href), false);
  }
  assert.equal(citationSelection(new URLSearchParams({ reference: '  MN 10  ' })), 'MN 10');
  for (const raw of ['', 'uid=mn10', 'reference=', 'reference=%20%20', 'reference=MN10&reference=MN9', 'reference=MN10&ref=mn10%2F1', 'reference=MN10&source=old', 'reference=MN10&page_source=old', 'reference=MN10&offset=0', 'reference=MN10&kind=post', 'reference=MN10&book=vin01m', 'reference=MN10&note=private', 'reference=MN10&allow_shared=true', 'reference=MN10&script=thai']) assert.throws(() => citationSelection(new URLSearchParams(raw)), raw);
  for (const reference of ['x'.repeat(301), 'a\nb', '<script>']) assert.throws(() => citationRoute(reference));
  for (const raw of ['reference=%ZZ', 'reference=%E0%A4%A', 'reference=%FF']) assert.throws(() => citationSelection(new URLSearchParams(raw), raw));
  assert.equal(citationSelection(new URLSearchParams('reference=%25ZZ'), 'reference=%25ZZ'), '%ZZ');
});

test('real supported later-work references use their exact emitted reader and preserve numbering cautions', async () => {
  for (const [reference, citation, book] of [['Vism I.1', 'Vism 1.1', 'visuddhimagga-1'], ['Abhidh-s 1', 'Abhidh-s 1', 'abhidhammatthasangaho'], ['Visuddhimagga Nidānakathā 1', 'visuddhimagga-nidanakatha 1', 'visuddhimagga-nidanakatha']]) {
    const raw = await resolve(reference), data = validateCitationResolution(raw);
    assert.equal(data.canonical, false); assert.equal(data.citation, citation);
    assert.deepEqual(Object.fromEntries(params(data.href)), { kind: 'post', uid: citation });
    assert.equal(raw.book.id, book); assert.equal(data.label, raw.label); assert.deepEqual(data.notes, raw.notes);
    const read = await client.callTool({ name: raw.read_with.tool, arguments: { citation: raw.read_with.citation, limit: 1 } });
    assert.ok(!read.isError); assert.equal(read.structuredContent.canonical, false); assert.equal(read.structuredContent.segments[0].ref, citation + '/1');
    assert.equal(params(data.href).has('ref'), false); assert.equal(params(data.href).has('source'), false);
  }
  const approximate = validateCitationResolution(await resolve('Vism IV.12'));
  assert.equal(approximate.approximate, true); assert.match(approximate.notes.join(' '), /whole of chapter 4/);
  assert.equal(params(approximate.href).get('uid'), 'Vism 4.12');
});

test('real canonical aliases, ranges and page alternatives retain the resolver evidence', async () => {
  const namedRaw = await resolve('Satipatthana Sutta'), named = validateCitationResolution(namedRaw);
  assert.equal(named.canonical, true); assert.equal(named.href, '#read?uid=mn10');
  assert.equal(named.name_match.matched_name, namedRaw.name_match.matched_name);
  assert.deepEqual(named.also_named.map(row => row.id), ['sn43.5', 'an4.274']);
  assert.match(named.notes.join(' '), /2 other texts/);
  assert.equal(validateCitationResolution(await resolve('A Gallon Measure')).href, '#read?uid=sn3.13');
  const span = validateCitationResolution(await resolve('MN 10-12'));
  assert.equal(span.href, '#read?uid=mn10'); assert.match(span.notes.join(' '), /showing the first/);
  const page = validateCitationResolution(await resolve('M i 55'));
  assert.equal(page.href, '#read?uid=mn10'); assert.deepEqual(page.also_on_that_page.map(row => row.id), ['mn9']);
  assert.equal(page.also_on_that_page[0].href, '#read?uid=mn9');
  const mapped = validateCitationResolution(await resolve('SN 12.21'));
  assert.equal(params(mapped.href).has('source'), false, 'Resolver provenance does not invent an exact mapping pin');
});

test('native input and selected native output keep backend labels without browser spelling inference', async () => {
  const native = validateCitationResolution(await resolve('MN ๑๐', 'thai'), 'thai');
  assert.equal(native.href, '#read?uid=mn10'); assert.equal(native.input_script, 'thai'); assert.equal(native.input_romanized, 'MN 10');
  assert.equal(native.script, 'thai'); assert.ok(native.title_roman); assert.ok(native.script_note);
  const post = validateCitationResolution(await resolve('Vism I.1', 'sinhala'), 'sinhala');
  assert.equal(params(post.href).get('uid'), 'Vism 1.1'); assert.ok(post.title_roman); assert.equal(post.script, 'sinhala');
  const keyboard = validateCitationResolution(await resolve('Satipa.t.thaana Sutta'));
  assert.equal(keyboard.href, '#read?uid=mn10'); assert.ok(keyboard.input_normalised);
});

test('unsupported pages, ambiguous source titles and invalid citations remain errors without substitute readers', async () => {
  for (const [reference, reason] of [['Vism 3', /PTS page breaks/], ['Mahāvagga-Ṭīkā 1', /ambiguous/], ['MN 999', /not in the canon index/]]) {
    const result = await client.callTool({ name: 'resolve_reference', arguments: { reference } });
    assert.equal(result.isError, true); assert.match(JSON.parse(result.content[0].text).error, reason);
  }
  for (const uid of ['Vism I.1', 'Abhidh-s 1', 'Satipatthana Sutta']) {
    const oldRoute = await client.callTool({ name: 'get_text', arguments: { uid, limit: 1 } });
    assert.equal(oldRoute.isError, true, 'The finder must resolve before selecting a reader');
  }
});

test('malformed source, mixed-reader commands and inconsistent alternatives fail closed', async () => {
  const canonical = await resolve('Satipatthana Sutta'), post = await resolve('Vism I.1');
  const bad = [];
  for (const patch of [{ canonical: 'false' }, { id: 'https://example.com' }, { citation: 'MN 9' }, { read_with: { tool: 'get_translation', uid: 'mn10' } }, { canonical: false }, { notes: 'missing list' }, { approximate: 'yes' }, { input_script: 'thai' }]) bad.push({ ...clone(canonical), ...patch });
  for (const change of [{ repository: 'https://example.com' }, { name: 'Another source' }, { commit: '' }, { locator_revision: '<bad>' }, { attribution: '' }, { terms: '' }]) bad.push({ ...clone(canonical), source: { ...canonical.source, ...change } });
  for (const command of [{ tool: 'get_text', citation: post.citation }, { tool: 'get_post_canonical', citation: 'Vism 2.1' }, { tool: 'get_post_canonical', citation: post.citation, offset: 3 }, { tool: 'get_post_canonical', citation: post.citation, uid: 'mn10' }, { tool: 'get_post_canonical', citation: post.citation, script: 'thai' }]) bad.push({ ...clone(post), read_with: command });
  bad.push({ ...clone(post), book: { ...post.book, canonical: true } }, { ...clone(post), label: '' }, { ...clone(post), canonical: true });
  for (const row of [{ ...canonical.also_named[0], id: 'javascript:alert(1)' }, { ...canonical.also_named[0], citation: 'MN 9' }, { ...canonical.also_named[0], canonical: false }, { ...canonical.also_named[0], read_with: { tool: 'get_translation' } }]) bad.push({ ...clone(canonical), also_named: [row] });
  bad.push({ ...clone(canonical), also_named: [canonical.also_named[0], canonical.also_named[0]] });
  for (const data of bad) assert.throws(() => validateCitationResolution(data), /unsupported source metadata/);
});

test('validated public views omit source bodies and unrelated fields and clone selected metadata', async () => {
  const raw = await resolve('Satipatthana Sutta'); raw.personal_note = 'private fixture';
  const data = validateCitationResolution(raw);
  assert.equal(Object.hasOwn(data, 'personal_note'), false); assert.equal(Object.hasOwn(data, 'first_line'), false); assert.equal(Object.hasOwn(data, 'english'), false);
  data.notes.push('independent'); data.source.terms = 'independent'; data.also_named[0].title = 'independent';
  assert.ok(!raw.notes.includes('independent')); assert.notEqual(raw.source.terms, data.source.terms); assert.notEqual(raw.also_named[0].title, data.also_named[0].title);
});
