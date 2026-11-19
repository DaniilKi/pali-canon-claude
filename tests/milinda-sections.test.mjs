import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { getAtiText, translationCoverage } from '../src/providers.mjs';
import { liveCache } from '../src/cache.mjs';
import { extractAtiSection } from '../src/ati-sections.mjs';
import { reviewedSectionLink, assertRegisteredSection, validateSectionRegistry, sectionHash } from '../src/ati-section-registry.mjs';
import { ATI_SECTION_PROFILES, isAtiSectionId } from '../src/ati-section-profiles.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

const registry = JSON.parse(readFileSync('scripts/canon/reviewed_ati_sections.json', 'utf8'));
const milindaRows = registry.links.filter(row => row.unit_id.startsWith('mil'));
const copy = value => JSON.parse(JSON.stringify(value));
const unit = row => canon.load().byId.get(row.unit_id);
const id = row => `ati:${row.path}#${row.anchor}`;
const sourceRoot = process.env.PALI_ATI_SECTIONS_SOURCE_DIR;
const html = row => readFileSync(join(sourceRoot, row.path.slice(1) + '.html'), 'utf8');
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; liveCache.clear(); });

test('fourteen complete substantive question choices have unique real section identities and retain old source data', () => {
  assert.deepEqual(registry, JSON.parse(readFileSync('server/data/reviewed-ati-sections.json', 'utf8')));
  const snapshot = canon.load();
  assert.equal(validateSectionRegistry(registry, snapshot.canon, snapshot.translations, canon.segments), registry);
  assert.equal(registry.links.length, 35); assert.equal(milindaRows.length, 14); assert.equal(new Set(milindaRows.map(id)).size, 14);
  assert.equal(sectionHash(milindaRows), '1895805a2ffc3518b590a000843a018b90f40694980094ba877940124d94ad16');
  assert.equal(JSON.parse(readFileSync('server/data/reviewed-partial-pages.json', 'utf8')).links.length, 22);
  assert.equal(sectionHash(JSON.parse(readFileSync('scripts/canon/reviewed_partial_pages.json', 'utf8')).links.slice(0, 18)), 'd55eab78d8820f2b9ef8c4988c936eaa17e11b51298ccb29c2b015760ff7ad36');
  for (const row of milindaRows) {
    const link = snapshot.translations[row.unit_id].find(value => value.section), metadata = canon.describe(unit(row)), choice = english.available(unit(row)).find(value => value.translation_id === id(row));
    assert.equal(canon.translationId(link), id(row)); assert.equal(isAtiSectionId(id(row)), true);
    assert.equal(link.url, `https://accesstoinsight.org${row.path}.html#${row.anchor}`);
    assert.equal(metadata.english_available, 1); assert.equal(choice.license, 'Kelly-free-distribution-2005');
    assert.deepEqual(choice.source_section, row.section); assert.deepEqual(metadata.english[0].source_section, row.section);
    assert.equal(Object.hasOwn(choice, 'translation_scope'), false); assert.match(choice.mapping_note, /Root title and ordinal colophon are not translated/);
    assert.deepEqual(canon.segmentsFromCorpus(unit(row), snapshot.canon), canon.segments(unit(row)));
  }
  assert.equal(canon.translationId({ source: 'ati', path: '/tipitaka/mn/mn.010.nysa' }), 'ati:/tipitaka/mn/mn.010.nysa');
  assert.equal(canon.translationId({ source: 'dhammatalks', url: 'https://www.dhammatalks.org/suttas/MN/MN10.html' }), 'dt:MN/MN10');
  const coverage = translationCoverage({ refresh: true }); assert.ok(coverage);
});

test('registry rejects deleted descriptors or links, duplicate bindings, fake owners, rights changes and scope downgrades', () => {
  const snapshot = canon.load(), render = canon.segments;
  for (const mutate of [m => m.links.pop(), m => m.links = [], m => delete m.links, m => m.version = 2, m => m.ati_commit = 'changed', m => m.links[0].translator = 'Other translator', m => m.links[0].license = 'CC-BY', m => m.links[0].path = '/tipitaka/kn/miln/other', m => m.links[0].anchor = 'invented', m => m.links[0].section.profile = 'arbitrary-selector', m => m.links[0].section.unit_id = 'mil3.1.15', m => m.links[0].section.paragraph_count++, m => m.links[0].root.start++, m => m.links[0].root.root_blocks_sha256 = '0'.repeat(64), m => m.links[0].untranslated_paratext = [], m => m.links[0].section.pali_sha256 = '0'.repeat(64)]) {
    const bad = copy(registry); mutate(bad); assert.throws(() => validateSectionRegistry(bad, snapshot.canon, snapshot.translations, render), /Registered ATI/);
  }
  for (const mutate of [links => delete links[registry.links[0].unit_id], links => delete links[registry.links[0].unit_id][0].section, links => links[registry.links[0].unit_id][0].section = null, links => links[registry.links[0].unit_id].push(copy(links[registry.links[0].unit_id][0])), links => links[registry.links[0].unit_id][0].shared_scope = {}, links => links[registry.links[0].unit_id][0].url = `https://accesstoinsight.org${registry.links[0].path}.html`, links => links[registry.links[0].unit_id][0].source = 'dhammatalks', links => links.mn1 = [{ source: 'ati', path: registry.links[0].path, url: `https://accesstoinsight.org${registry.links[0].path}.html`, translator: 'John Kelly' }]]) {
    const links = copy(snapshot.translations); mutate(links); assert.throws(() => validateSectionRegistry(registry, snapshot.canon, links, render), /Registered ATI/);
  }
  const row = registry.links[0], link = reviewedSectionLink(row, registry);
  assert.throws(() => assertRegisteredSection(link, unit(registry.links[1]), registry), /Registered ATI/);
  assert.throws(() => assertRegisteredSection({ ...link, source: 'other' }, unit(row), registry), /Registered ATI/);
  assert.throws(() => assertRegisteredSection({ ...link, path: '/arbitrary', section: null }, unit(row), registry), /Registered ATI/);
});

test('bare anthology URLs are ambiguous and only exact reviewed body anchors identify one question', () => {
  for (const row of milindaRows) {
    for (const host of ['accesstoinsight.org', 'www.accesstoinsight.org']) assert.equal(canon.resolve(`https://${host}${row.path}.html#${row.anchor}`).unit.id, row.unit_id);
    for (const anchor of ['', '#top', '#invented', '#' + row.anchor + '-invented']) assert.throws(() => canon.resolve(`https://accesstoinsight.org${row.path}.html${anchor}`), /anthology page/);
    assert.equal(canon.load().urlIndex.has('accesstoinsight.org' + row.path), false);
  }
  assert.equal(canon.resolve('https://accesstoinsight.org/tipitaka/kn/miln/miln.2x.kell.html#miln-2-3-08').unit.id, 'mil3.3.8');
  assert.equal(canon.resolve('https://accesstoinsight.org/tipitaka/kn/miln/miln.2x.kell.html#miln-2-1-08').unit.id, 'mil3.1.8');
});

test('wrong unit, bare page IDs, arbitrary anchors and scoped consent cannot retrieve a reviewed whole question', async () => {
  let calls = 0; globalThis.fetch = async () => { calls++; throw Error('Unexpected network'); };
  const row = registry.links[0], target = unit(row);
  for (const requested of [`ati:${row.path}`, `ati:${row.path}#invented`, id(registry.links[1])]) await assert.rejects(english.translation(target, requested), /not linked/);
  await assert.rejects(english.translation(target, id(row), { allow_partial: true }), /no longer has a declared partial/);
  await assert.rejects(english.translation(target, id(row), { allow_shared: true }), /no longer has a declared shared/);
  assert.equal(calls, 0);
});

test('actual reviewed sources reproduce all question/note pins, and any source, note, structure or selector drift refuses', { skip: !sourceRoot }, () => {
  let notes = 0;
  for (const row of milindaRows) {
    const raw = html(row), selected = extractAtiSection(raw, row);
    assert.equal(sectionHash(selected.text), row.section.text_sha256); assert.equal(sectionHash(selected.translator_notes), row.section.notes_sha256);
    assert.equal(sectionHash(english.atiNotice(raw)), row.section.notice_sha256); notes += selected.translator_notes.length;
    assert.equal(selected.translator_notes.length, row.section.note_count); assert.ok(!selected.text.includes('Go to top of page'));
    for (const delta of [{ ...row, anchor: 'invented' }, { ...row, section: { ...row.section, section_html_sha256: '0'.repeat(64) } }, { ...row, section: { ...row.section, text_sha256: '0'.repeat(64) } }, { ...row, section: { ...row.section, notes_sha256: '0'.repeat(64) } }, { ...row, section: { ...row.section, paragraph_count: 1 } }]) assert.throws(() => extractAtiSection(raw, delta), /reviewed ATI question/);
    for (const changed of [raw.replace('John Kelly', 'Another author'), raw.replace('<div class="chapter">', '<div class="chapter"><p>Added text</p>'), raw.replace(row.anchor, 'invented'), raw.replace('</body>', 'Changed ending</body>')]) assert.throws(() => extractAtiSection(changed, row), /reviewed ATI question/);
  }
  assert.equal(notes, 4);
});

test('actual MCP whole question retrieval isolates body, four notes, full Kelly notices, cache and exact continuation', { skip: !sourceRoot }, async () => {
  const fetched = []; globalThis.fetch = async url => { fetched.push(String(url)); const pathname = new URL(url).pathname; const row = registry.links.find(value => pathname === value.path + '.html'); assert.ok(row); return new Response(html(row), { status: 200 }); };
  const [a, b] = InMemoryTransport.createLinkedPair(), client = new Client({ name: 'reviewed-whole-questions', version: '1' });
  await Promise.all([client.connect(a), createServer().connect(b)]);
  const call = async (name, args) => { const raw = await client.callTool({ name, arguments: args }); assert.ok(!raw.isError, JSON.stringify(raw)); return JSON.parse(raw.content[0].text); };
  try {
    for (const row of milindaRows) {
      const expected = extractAtiSection(html(row), row), args = { uid: row.unit_id, translation: id(row), limit: 500 }, page = await call('get_translation', args);
      assert.equal(page.translation_id, id(row)); assert.equal(page.text_id, row.unit_id); assert.equal(page.url, `https://accesstoinsight.org${row.path}.html#${row.anchor}`);
      assert.deepEqual(page.source_section, row.section); assert.deepEqual(page.translator_notes, expected.translator_notes);
      assert.equal(Object.hasOwn(page, 'translation_scope'), false); assert.notEqual(page.whole_unit_coverage, false);
      assert.match(page.license, /©2005 John Kelly/); assert.match(page.license, /full text of this license/); assert.match(page.attribution, /John Kelly/);
      let text = page.text, next = page.continue_with;
      while (next) { const received = await call(next.name, next.arguments); text += received.text; assert.deepEqual(received.translator_notes, expected.translator_notes); next = received.continue_with; }
      assert.equal(text, expected.text);
      assert.deepEqual(page.license, english.atiNotice(html(row)).licensing);
      const calls = fetched.length, cached = await call('get_translation', args); assert.equal(fetched.length, calls); assert.equal(cached.text, page.text);
      if (page.next_offset !== null) await assert.rejects(english.translation(unit(row), id(row), { offset: page.next_offset, limit: 500, prefix_sha256: '0'.repeat(64) }), /prefix changed/);
    }
    assert.equal(fetched.length, 14); assert.ok(fetched.every(url => !url.includes('#')));
    const article = await getAtiText({ path: registry.links[0].path, limit: 30000 });
    assert.equal(Object.hasOwn(article, 'canon_text_id'), false); assert.notEqual(article.text, extractAtiSection(html(registry.links[0]), registry.links[0]).text);
    const ownNote = await english.translation(unit(registry.links[9]), id(registry.links[9])); ownNote.translator_notes[0].text = 'Caller change';
    assert.notEqual((await english.translation(unit(registry.links[9]), id(registry.links[9]))).translator_notes[0].text, 'Caller change');
  } finally { await client.close(); }
});

test('cached question retrieval rechecks the binding/root registry and refuses a missing or altered declaration', { skip: !sourceRoot }, async () => {
  globalThis.fetch = async () => new Response(html(registry.links[0]), { status: 200 });
  const snapshot = canon.load(), row = registry.links[0]; await english.translation(unit(row), id(row));
  const previous = snapshot.translations[row.unit_id], registered = snapshot.sectionRegistry;
  try {
    snapshot.translations[row.unit_id] = previous.map(value => { const bad = copy(value); delete bad.section; return bad; });
    await assert.rejects(english.translation(unit(row), id(row)), /Registered ATI/);
    snapshot.translations[row.unit_id] = previous;
    snapshot.sectionRegistry = { ...registered, links: registered.links.slice(1) };
    await assert.rejects(english.translation(unit(row), id(row)), /Registered ATI/);
  } finally { snapshot.translations[row.unit_id] = previous; snapshot.sectionRegistry = registered; }
});
