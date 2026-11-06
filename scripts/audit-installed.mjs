// Exhaustive offline check of the shipped bundle, isolated from src/ and the checkout's server/data.
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as canon from '../src/canon.mjs';
import * as commentary from '../src/commentary.mjs';
import * as postcanonical from '../src/postcanonical.mjs';
import { checkPages } from './installed-corpus.mjs';
import { offlineDataChecks } from './offline-data-checks.mjs';
import { available as availableEnglish } from '../src/english.mjs';

const serverAt = process.argv.indexOf('--server-dir');
if (serverAt >= 0 && !process.argv[serverAt + 1]) throw new Error('--server-dir requires a directory path');
const reportAt = process.argv.indexOf('--report');
if (reportAt >= 0 && !process.argv[reportAt + 1]) throw new Error('--report requires a destination path');
const missingCommentary = [];
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stage = await mkdtemp(join(tmpdir(), 'pali-installed-'));
const client = new Client({ name: 'pali-installed-corpus-audit', version: '1.0.0' });
let transport;
let stderr = '';
const counts = { canonical_texts: 0, canonical_segments: 0, canonical_pages: 0,
  shared_span_checks: 0,
  commentary_texts: 0, commentary_unaligned_texts: 0, commentary_segments: 0, commentary_pages: 0,
  commentary_books: 0, commentary_book_segments: 0, commentary_book_pages: 0, commentary_search_checks: 0,
  postcanonical_books: 0, postcanonical_segments: 0, postcanonical_pages: 0, lazy_data_checks: 0, search_checks: 0, search_scope_checks: 0, grouped_scope_checks: 0, title_search_pages: 0, title_search_matches: 0, title_search_checks: 0, quote_search_checks: 0, browse_scope_checks: 0, browse_group_pages: 0, quote_verification_checks: 0, edition_citation_checks: 0, citation_range_checks: 0, abt_citation_links: 0, paired_normalisation_checks: 0, proper_name_title_checks: 0, stored_title_resolution_checks: 0 };
try {
  if (reportAt >= 0) await writeFile(resolve(process.argv[reportAt + 1]), '{"status":"running"}\n');
  const serverDirectory = serverAt >= 0 ? resolve(process.argv[serverAt + 1]) : join(root, 'server');
  await cp(serverDirectory, join(stage, 'server'), { recursive: true });
  await mkdir(join(stage, 'empty'));
  const guard = join(stage, 'no-network.cjs');
  await writeFile(guard, `const fail = () => { process.stderr.write('UNEXPECTED_NETWORK_ATTEMPT\\n'); throw new Error('Network is disabled in the installed corpus audit'); };
globalThis.fetch = fail;
for (const name of ['node:http', 'node:https']) { const m = require(name); m.request = fail; m.get = fail; }
const net = require('node:net'); net.connect = fail; net.createConnection = fail;
require('node:module').syncBuiltinESMExports();\n`);
  transport = new StdioClientTransport({ command: process.execPath,
    args: ['--require', guard, join(stage, 'server', 'index.cjs')],
    cwd: join(stage, 'empty'), stderr: 'pipe', env: { ...process.env } });
  transport.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  await client.connect(transport);
  const call = async (name, args) => {
    const response = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
    assert.ok(!response.isError, `${name}(${JSON.stringify(args)}): ${JSON.stringify(response.content)}`);
    const text = response.content.find((part) => part.type === 'text')?.text;
    assert.equal(typeof text, 'string', `${name}: JSON text response`);
    return JSON.parse(text);
  };
  for (const u of canon.load().canon.units) {
    const { unit } = canon.resolve(u.id);
    const expectedEnglish = JSON.parse(JSON.stringify(availableEnglish(unit)));
    const canonical = await checkPages(call, 'get_text', { uid: u.id }, canon.segments(unit), {
      metadata: (result) => {
        assert.equal(result.text_id, unit.id);
        assert.deepEqual(result.english_available, expectedEnglish, `${u.id}: linked translation metadata`);
      },
    });
    counts.canonical_texts += 1;
    counts.canonical_segments += canonical.segments;
    counts.canonical_pages += canonical.pages;
    const expected = commentary.commentaryFor(unit, { limit: Number.MAX_SAFE_INTEGER });
    if (expected.available) {
      const checked = await checkPages(call, 'get_commentary', { uid: u.id }, expected.segments, {
        metadata: (result) => {
          assert.equal(result.available, true);
          assert.equal(result.text_id, unit.id);
          assert.equal(result.label, expected.label);
        },
      });
      counts.commentary_texts += 1;
      counts.commentary_segments += checked.segments;
      counts.commentary_pages += checked.pages;
    } else {
      const result = await call('get_commentary', { uid: u.id, limit: 1 });
      assert.equal(result.available, false, `${u.id}: unaligned commentary must be labelled`);
      assert.deepEqual(result.segments, []);
      assert.ok(result.notes.length, `${u.id}: missing alignment needs an explanation`);
      counts.commentary_unaligned_texts += 1;
      missingCommentary.push({ id: u.id, citation: u.acronym, collection: u.collection, notes: result.notes });
    }
    if (counts.canonical_texts % 1000 === 0) console.log(`Checked ${counts.canonical_texts} canonical texts and their commentary`);
  }
  const sharedOwner = await call('get_text', { uid: 'pli-tv-bu-vb-as2', limit: 200 });
  const sharedCommentary = await call('get_commentary', { uid: 'pli-tv-bu-vb-as2', limit: 200 });
  const firstDisputeRule = await call('get_text', { uid: 'pli-tv-bu-vb-as1', limit: 200 });
  const withoutRef = (segments) => segments.map(({ ref, ...segment }) => segment);
  for (const uid of ['pli-tv-bu-vb-as3', 'pli-tv-bu-vb-as4', 'pli-tv-bu-vb-as5', 'pli-tv-bu-vb-as6', 'pli-tv-bu-vb-as7', 'pli-tv-bu-vb-as1-7']) {
    const result = await call('get_text', { uid, limit: 200 });
    const expected = uid.endsWith('1-7') ? [...firstDisputeRule.segments, ...sharedOwner.segments] : sharedOwner.segments;
    assert.deepEqual(withoutRef(result.segments), withoutRef(expected), `${uid}: restricted to the shared source passage`);
    assert.equal(result.next_offset, null);
    counts.shared_span_checks += 1;
    const explained = await call('get_commentary', { uid, limit: 200 });
    assert.deepEqual(withoutRef(explained.segments), withoutRef(sharedCommentary.segments), `${uid}: no commentary from following root texts`);
    assert.equal(explained.next_offset, null);
    counts.shared_span_checks += 1;
  }
  for (const book of commentary.load().books) {
    const uid = commentary.bookInfo(book).uid;
    const expected = commentary.bookSegments(book).map((segment, i) => ({ ref: `${uid}/c${i + 1}`, ...segment }));
    const checked = await checkPages(call, 'get_commentary', { uid }, expected, {
      metadata: (result) => {
        assert.equal(result.canonical, false);
        assert.equal(result.content_type, 'commentary');
        assert.equal(result.book.vri_file, book.file);
      },
    });
    counts.commentary_books += 1;
    counts.commentary_book_segments += checked.segments;
    counts.commentary_book_pages += checked.pages;
    const query = `"${expected[0].text.replace(/\s+/gu, ' ').slice(0, 160).trim()}"`;
    const found = await call('search_commentary', { query, books: [book.file], limit: 1 });
    assert.equal(found.results[0]?.citation, `${uid}/c1`, `${book.file}: first source segment is searchable`);
    const selected = await call('get_commentary', { uid: found.results[0].read_with.uid });
    assert.deepEqual(selected.segments, [expected[0]]);
    counts.commentary_search_checks += 1;
  }
  for (const book of postcanonical.load().books) {
    const sel = postcanonical.select(book.id);
    const expected = postcanonical.segmentsOf(sel.book.blocks.slice(sel.start, sel.end))
      .map((segment, i) => ({ ref: `${sel.citation}/${i + 1}`, ...segment }));
    const checked = await checkPages(call, 'get_post_canonical', { citation: book.id }, expected, {
      metadata: (result) => assert.equal(result.canonical, false),
    });
    counts.postcanonical_books += 1;
    counts.postcanonical_segments += checked.segments;
    counts.postcanonical_pages += checked.pages;
    if (counts.postcanonical_books % 20 === 0) console.log(`Checked ${counts.postcanonical_books} post-canonical books`);
  }
  for (const [name, args, verify] of offlineDataChecks) {
    assert.ok(verify(await call(name, args)), `${name}: bundled offline dataset`);
    counts.lazy_data_checks += 1;
  }
  // Search must find complete stanzas returned by retrieval, including their internal line breaks.
  const quote = (text) => `"${text.replace(/\s+/gu, ' ').trim()}"`;
  const rootVerse = canon.segments(canon.resolve('Dhp 183').unit).find((segment) => segment.type === 'verse');
  const rootSearch = await call('search_texts', { query: quote(rootVerse.text), collection: 'dhp', english: 'off' });
  assert.ok(rootSearch.results.some((hit) => hit.id === 'dhp183'), 'installed canonical whole-stanza search');
  counts.search_checks += 1;
  const laterVerse = (await postcanonical.getText('Vism §1', { limit: 50 })).segments.find((segment) => segment.type === 'verse');
  const laterSearch = await call('search_post_canonical', { query: quote(laterVerse.text), books: ['vism'], limit: 50 });
  assert.ok(laterSearch.results.length, 'installed post-canonical whole-stanza search');
  for (const hit of laterSearch.results) {
    const selected = await call('get_post_canonical', { citation: hit.citation, limit: 200 });
    const text = selected.segments.map((segment) => segment.text).join(' ').replace(/\s+/gu, ' ');
    assert.ok(postcanonical.fold(text).includes(postcanonical.fold(laterVerse.text.replace(/\s+/gu, ' '))), hit.citation);
  }
  counts.search_checks += 1;
  for (const scope of ['sn1', 'an1', 'kv1', 'dhp1-20']) {
    const result = await call('search_texts', { query: 'dhamma', collection: scope, english: 'off', limit: 50 });
    assert.ok(result.results.length, `${scope}: scoped search has source matches`);
    const members = new Set(canon.load().byId.get(scope)?.members || []);
    for (const hit of [...result.results, ...result.title_matches]) {
      assert.ok(hit.id === scope || hit.id.startsWith(`${scope}.`) || members.has(hit.id), `${scope}: out-of-scope result ${hit.id}`);
    }
    counts.search_scope_checks += 1;
  }
  const invalidScope = await client.callTool({ name: 'search_texts', arguments: { query: 'dhamma', collection: 'sn999', english: 'off' } });
  assert.equal(invalidScope.isError, true, 'unknown scopes must be rejected, not reported as source absence');
  assert.match(invalidScope.content[0].text, /Unknown canonical search scope/);
  counts.search_scope_checks += 1;
  for (const alias of ['an1.300', 'sn46.150', 'an10.208', 'sn46.121']) {
    const { unit } = canon.resolve(alias);
    const result = await call('search_texts', { query: 'bhikkhave', collection: alias, english: 'off' });
    const direct = await call('search_texts', { query: 'bhikkhave', collection: unit.id, english: 'off' });
    const { scope_resolution, ...withoutResolution } = result;
    assert.deepEqual(withoutResolution, direct, `${alias}: identical recorded group search`);
    assert.equal(scope_resolution.resolved_id, unit.id);
    assert.equal(scope_resolution.requested, alias);
    assert.equal(scope_resolution.approximate, !!unit.approximate);
    assert.deepEqual(scope_resolution.read_with, { tool: 'get_text', uid: unit.id });
    if (unit.approximate) assert.match(scope_resolution.note, /excluded from the full-text search index/);
    if (['an1.300', 'an10.208'].includes(alias)) assert.ok(result.results.length, `${alias}: source matches`);
    counts.grouped_scope_checks += 1;
    const browsed = await call('browse_canon', { node: alias });
    assert.deepEqual(browsed.scope_resolution, scope_resolution);
    assert.equal(browsed.total, 1);
    assert.equal(browsed.items[0].id, unit.id);
    assert.equal(!!browsed.items[0].approximate, !!unit.approximate);
    counts.grouped_scope_checks += 1;
  }
  const expectedTitles = canon.search('discourse', { limit: 10000 }).title_matches.map((hit) => hit.id);
  const returnedTitles = [];
  let titleOffset = 0;
  do {
    const result = await call('search_texts', { query: 'discourse', english: 'off', limit: 7, offset: titleOffset });
    assert.equal(result.total_title_matches, expectedTitles.length);
    assert.equal(result.total_texts_matched, 0);
    assert.equal(result.next_offset, null, 'title-only continuation is separate from body continuation');
    assert.ok(result.title_matches.length <= 7);
    assert.equal(result.title_next_offset, titleOffset + 7 < expectedTitles.length ? titleOffset + 7 : null);
    returnedTitles.push(...result.title_matches.map((hit) => hit.id));
    counts.title_search_pages += 1;
    titleOffset = result.title_next_offset;
  } while (titleOffset !== null);
  assert.deepEqual(returnedTitles, expectedTitles, 'every title match is reachable exactly once');
  counts.title_search_matches = returnedTitles.length;
  counts.title_search_checks += 1;
  const literalTitles = canon.search('mindfulness', { limit: 10000 }).title_matches.map((hit) => hit.id);
  for (const offset of [0, literalTitles.length]) {
    const result = await call('search_texts', { query: 'mindfulness', english: 'auto', limit: 5, offset });
    assert.equal(result.total_title_matches, literalTitles.length);
    assert.deepEqual(result.title_matches.map((hit) => hit.id), literalTitles.slice(offset, offset + 5));
    counts.title_search_checks += 1;
  }
  const noExpansion = await call('search_texts', { query: '"12.15"', english: 'only', limit: 5 });
  assert.equal(noExpansion.expanded_from_english.found, false);
  assert.equal(noExpansion.total_title_matches, 0);
  assert.deepEqual(noExpansion.title_matches, []);
  assert.equal(noExpansion.title_next_offset, null);
  assert.equal(noExpansion.limit, 5);
  counts.title_search_checks += 1;
  for (const [name, args] of [
    ['search_texts', { english: 'off' }],
    ['search_post_canonical', { books: ['vism'] }],
    ['search_commentary', { books: ['s0201a.att.xml'] }],
  ]) {
    const plain = await call(name, { ...args, query: '"sati buddha"', limit: 50 });
    const curly = await call(name, { ...args, query: '“sati buddha”', limit: 50 });
    assert.deepEqual(curly.results, plain.results, `${name}: curly quotes preserve phrase matches`);
    assert.equal(curly.total_matched ?? curly.total_texts_matched, plain.total_matched ?? plain.total_texts_matched);
    counts.quote_search_checks += 1;
  }
  for (const text of ['satipatana', 'How many jhanas are there']) {
    const result = await call('search_texts', { query: `“${text}”`, english: 'off' });
    assert.equal(result.total_texts_matched, 0, 'a failed quoted phrase remains an exact search');
    assert.equal(result.spelling_note, undefined);
    assert.equal(result.english_words_ignored, undefined);
    counts.quote_search_checks += 1;
  }
  for (const node of ['mn1', 'mn15', 'sn1.1', 'pli-tv-bu-vb-pc1']) {
    const result = await call('browse_canon', { node });
    assert.deepEqual(result.items.map((item) => item.id), [node], 'exact browse IDs exclude numbered siblings');
    counts.browse_scope_checks += 1;
  }
  const groupMembers = canon.load().byId.get('dhp1-20').members;
  const browsedMembers = [];
  let groupOffset = 0;
  do {
    const result = await call('browse_canon', { node: 'dhp1-20', offset: groupOffset, limit: 3 });
    assert.equal(result.total, groupMembers.length);
    browsedMembers.push(...result.items.map((item) => item.id));
    counts.browse_group_pages += 1;
    groupOffset = result.next_offset;
  } while (groupOffset !== null);
  assert.deepEqual(browsedMembers, groupMembers, 'recorded group members are reachable exactly once');
  counts.browse_scope_checks += 1;
  for (const node of ['s', 'sn1.100000']) {
    const result = await client.callTool({ name: 'browse_canon', arguments: { node } });
    assert.equal(result.isError, true, 'partial/unknown browse IDs cannot select unrelated texts');
    counts.browse_scope_checks += 1;
  }
  const wordTokens = (text) => canon.fold(text).split(/[^a-z0-9]+/u).filter(Boolean);
  const unitTokens = (unit) => wordTokens(canon.load().canon.books[unit.book].blocks.slice(unit.start, unit.end).map((block) => block[2]).join(' '));
  for (const [left, right, grouped] of [['mn1', 'mn2', false], ['sn1.1', 'sn1.2', false], ['dhp183', 'dhp184', true]]) {
    const a = canon.resolve(left).unit, b = canon.resolve(right).unit;
    assert.equal(a.book, b.book);
    assert.equal(a.end, b.start);
    // Deliberately juxtaposed boundary fixture; this is not presented as a scriptural quotation.
    const text = [...unitTokens(a).slice(-10), ...unitTokens(b).slice(0, 10)].join(' ');
    const result = await call('verify_quote', { text, language: 'pali', limit: 5 });
    if (grouped) {
      assert.equal(result.best_similarity, 1);
      assert.equal(result.matches[0].text_id, 'dhp179-196');
    } else assert.ok(result.best_similarity < 1, 'independent texts cannot become an exact quotation');
    for (const hit of result.matches) {
      const full = unitTokens(canon.resolve(hit.text_id).unit).join(' ');
      const excerpt = wordTokens(hit.matched_text.replace(/…$/u, '')).join(' ');
      assert.ok(full.includes(excerpt), `${hit.text_id}: complete matched excerpt belongs to cited text`);
    }
    counts.quote_verification_checks += 1;
  }
  const editionReferences = ['Thai MN 1.103', 'Myanmar Dhp 15', 'VRI SN 1.20 (Nidānavaggo)',
    'Thai Pj 1.10', 'Thai ed. MN vol. 1 p. 103', 'VRI SN 1.20', 'Thai MN 99.999', 'Thai MN i 55'];
  const editionScan = await call('find_citations', { text: editionReferences.join('; ') });
  assert.deepEqual(editionScan.citations.map((hit) => hit.text), editionReferences);
  for (const hit of editionScan.citations) {
    assert.equal(hit.scheme, 'edition', 'edition page cannot become a canonical text or PTS number');
    let expected;
    try { expected = canon.resolve(hit.text).unit.id; } catch { expected = null; }
    assert.equal(hit.text_id ?? null, expected, hit.text);
    assert.equal(hit.status, expected ? 'resolved' : 'unresolved');
    counts.edition_citation_checks += 1;
  }
  const invalidRanges = ['MN 10-9999', 'SN 1.1-9999', 'Dhp 1-99999', 'SN 2.1-1.1', 'SN 1.1-999.1', 'MN 10-12.1'];
  const rangeScan = await call('find_citations', { text: invalidRanges.join('; ') });
  assert.deepEqual(rangeScan.citations.map((hit) => hit.text), invalidRanges);
  for (const hit of rangeScan.citations) {
    assert.equal(hit.status, 'unresolved');
    assert.equal(hit.text_id, undefined);
    counts.citation_range_checks += 1;
  }
  for (const reference of ['MN 10-9999', 'SN 2.1-1.1']) {
    for (const [name, args] of [['resolve_reference', { reference }], ['get_text', { uid: reference }]]) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(result.isError, true, `${name}: invalid endpoint cannot be ignored`);
      counts.citation_range_checks += 1;
    }
  }
  for (const [uid, expected] of [['MN 10-12', 'mn10'], ['AN 1.296-305', 'an1.296-305'], ['Dhp 1-20', 'dhp1-20']]) {
    const result = await call('get_text', { uid, limit: 1 });
    assert.equal(result.text_id, expected);
    counts.citation_range_checks += 1;
  }
  const abtPages = Object.entries(canon.load().translations).flatMap(([id, links]) => links
    .filter((link) => link.source === 'anandajoti')
    .flatMap((link) => [link.url, ...(link.parts || []).map((path) => new URL(path, canon.ANANDAJOTI_BASE).href)]
      .map((url) => ({ id, url: new URL(url).href }))));
  assert.ok(abtPages.length);
  for (let start = 0; start < abtPages.length; start += 100) {
    const batch = abtPages.slice(start, start + 100);
    const text = batch.map((page) => page.url).join('; ');
    const result = await call('find_citations', { text });
    assert.equal(result.unresolved, 0);
    assert.deepEqual(result.citations.map((hit) => [hit.text, hit.text_id]), batch.map((page) => [page.url, page.id]));
    for (const hit of result.citations) {
      assert.equal(hit.scheme, 'link');
      assert.equal(text.slice(hit.start, hit.end), hit.text);
      counts.abt_citation_links += 1;
    }
  }
  for (const [name, extra] of [['search_texts', { english: 'off' }],
    ['search_post_canonical', { books: ['vism'] }], ['search_commentary', { books: ['s0201a.att.xml'] }]]) {
    const expected = await call(name, { query: '“namo tassa”', ...extra, limit: 50 });
    const actual = await call(name, { query: '"namo tassa"', ...extra, limit: 50 });
    assert.deepEqual(actual.results, expected.results, `${name}: normalisation must preserve phrase delimiters`);
    assert.equal(actual.total_matched ?? actual.total_texts_matched, expected.total_matched ?? expected.total_texts_matched);
    assert.equal(actual.input_normalised, undefined, 'the opening quote is not a Velthuis letter');
    counts.paired_normalisation_checks += 1;
  }
  const pairedMiss = await call('search_texts', { query: '"nibbana buddha"', english: 'off' });
  assert.equal(pairedMiss.total_texts_matched, 0, 'a missing quoted phrase cannot become keyword matches');
  assert.equal(pairedMiss.input_normalised, undefined);
  counts.paired_normalisation_checks += 1;
  const pairedSpelling = await call('search_texts', { query: '"nibbaana buddha"', english: 'off' });
  assert.equal(pairedSpelling.total_texts_matched, 0);
  assert.equal(pairedSpelling.input_normalised.read_as, '"nibbāna buddha"');
  counts.paired_normalisation_checks += 1;
  for (const [name, id, language, source] of [['Pasenadi', 'sn3.13', 'english', 'Access to Insight'],
    ['Ānanda', 'ud5.8', 'english', 'dhammatalks.org'], ['Heedfulness', 'dhp21-32', 'english', 'dhammatalks.org'],
    ['Sāriputta', 'ud3.4', 'pali', canon.source().name]]) {
    const result = await call('lookup_name', { name, textLimit: 50 });
    assert.equal(result.dictionary.status, 'not-bundled', 'title evidence cannot fill the unlicensed dictionary');
    assert.equal(result.found, false);
    assert.deepEqual(result.entries, []);
    const hit = result.appears_in.title_matches.find((item) => item.text_id === id);
    assert.ok(hit?.matched_titles.some((evidence) => evidence.language === language && evidence.source === source), name);
    const ranked = result.appears_in.texts.find((item) => item.text_id === id);
    assert.ok(ranked, `${name}: title-ranked text is returned`);
    assert.deepEqual(ranked.matched_titles, hit.matched_titles);
    if (name === 'Pasenadi') assert.equal(result.appears_in.texts[0].text_id, id);
    if (name === 'Heedfulness') assert.equal(ranked.paragraphs_naming_it, undefined, 'English metadata is not a body occurrence');
    counts.proper_name_title_checks += 1;
  }
  for (const [reference, id, matched] of [['A Gallon Measure', 'sn3.13', 'A Gallon Measure'],
    ['Gallon Measure', 'sn3.13', 'Gallon Measure'], ['King Udena', 'ud7.10', 'King Udena'],
    ['Categorically sutta', 'an2.18', 'Categorically']]) {
    const result = await call('resolve_reference', { reference });
    assert.equal(result.id, id);
    assert.equal(result.matched_by, 'name');
    assert.equal(result.name_match.matched_name, matched);
    assert.match(result.name_match.via, /English title \(dhammatalks\.org/);
    counts.stored_title_resolution_checks += 1;
  }
  for (const reference of ['Categorically', 'King Udena 999']) {
    const result = await client.callTool({ name: 'resolve_reference', arguments: { reference } });
    assert.equal(result.isError, true, 'stored captions cannot bypass topic/numeric-name safeguards');
    counts.stored_title_resolution_checks += 1;
  }
  const repeatedTitle = await client.callTool({ name: 'resolve_reference', arguments: { reference: 'Heedfulness chapter' } });
  assert.equal(repeatedTitle.isError, true);
  assert.match(repeatedTitle.content[0].text, /Name matches are never guessed/);
  assert.match(repeatedTitle.content[0].text, /Dhp 21–32/);
  counts.stored_title_resolution_checks += 1;
  assert.ok(!stderr.includes('UNEXPECTED_NETWORK_ATTEMPT'), 'every checked operation must work without attempting network access');
  const summary = { ...counts, approximate_canonical_texts: canon.load().canon.units.filter((unit) => unit.approximate).length, network_attempts: 0, failures: 0 };
  if (reportAt >= 0) {
    await writeFile(resolve(process.argv[reportAt + 1]), `${JSON.stringify({ status: 'passed', summary, unaligned_commentary: missingCommentary }, null, 2)}\n`);
  }
  console.log(JSON.stringify(summary));
} catch (error) {
  if (reportAt >= 0) {
    await writeFile(resolve(process.argv[reportAt + 1]), `${JSON.stringify({ status: 'failed', error: error.message, partial_counts: counts }, null, 2)}\n`);
  }
  throw error;
} finally {
  await client.close();
  await transport?.close();
  await rm(stage, { recursive: true, force: true });
}
