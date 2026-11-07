import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import assert from 'node:assert/strict';
import { expectedToolNames } from './expected-tools.mjs';

const live = process.argv.includes('--live');
const serverFlag = process.argv.indexOf('--server');
const serverPath = serverFlag >= 0 ? process.argv[serverFlag + 1] : 'server/index.cjs';
const client = new Client({ name: 'pali-canon-smoke', version: '2.1.0' });
// Pass the environment through so proxy settings (HTTPS_PROXY, NODE_USE_ENV_PROXY) reach the server.
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], stderr: 'pipe', env: { ...process.env } });
transport.stderr?.on('data', (data) => process.stderr.write(data));
let checks = 0;
async function call(name, args, verify) {
  const response = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
  if (response.isError) throw new Error(`${name}(${JSON.stringify(args)}): ${response.content[0].text}`);
  const data = JSON.parse(response.content.find((part) => part.type === 'text').text);
  verify?.(data);
  console.log(`PASS ${name} ${JSON.stringify(args).slice(0, 70)}`);
  checks += 1;
  return data;
}
async function fails(name, args, pattern) {
  const response = await client.callTool({ name, arguments: args });
  assert.ok(response.isError, `${name} should fail for ${JSON.stringify(args)}`);
  if (pattern) assert.match(response.content[0].text, pattern);
  console.log(`PASS ${name} rejects ${JSON.stringify(args).slice(0, 60)}`);
  checks += 1;
}
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  // 11 core tools plus the optional feature modules (src/features/index.mjs), derived from the source.
  assert.deepEqual(tools.map((tool) => tool.name).sort(), expectedToolNames());
  assert.ok(!tools.some((tool) => tool.name === 'read_passage_widget'), 'the ChatGPT widget tool is hosted-HTTP only');
  assert.ok(tools.every((tool) => tool.annotations?.readOnlyHint));
  const { resources } = await client.listResources();
  for (const uri of ['pali://sources', 'pali://canon-guide', 'pali://pronunciation']) assert.ok(resources.some((r) => r.uri === uri), uri);
  const { prompts } = await client.listPrompts();
  for (const name of ['study_passage', 'compare_translations', 'topic_research', 'memorise_passage']) assert.ok(prompts.some((p) => p.name === name), name);
  console.log(`${tools.length} tools, ${resources.length} resources, ${prompts.length} prompts`);
  await client.readResource({ uri: 'pali://canon-guide' });
  assert.match((await client.readResource({ uri: 'pali://pronunciation' })).contents[0].text, /Niggahīta/);
  await client.getPrompt({ name: 'study_passage', arguments: { reference: 'MN 10' } });
  assert.match((await client.getPrompt({ name: 'memorise_passage', arguments: { reference: 'Dhp 1' } })).messages[0].content.text, /Dhp 1[\s\S]*get_text/);

  // Offline: resolution, text, search, browse.
  await call('resolve_reference', { reference: 'SN 56:11' }, (d) => { assert.equal(d.id, 'sn56.11'); assert.match(d.pts, /^S v 420/); });
  await call('lookup_name', { name: 'Sāriputta', textLimit: 3 }, (d) => { assert.equal(d.dictionary.name, 'Dictionary of Pāli Proper Names'); assert.ok(d.appears_in.total_texts_matched > 0); });
  await call('resolve_reference', { reference: 'M i 55' }, (d) => assert.equal(d.id, 'mn10'));
  await call('resolve_reference', { reference: 'AN 1.300' }, (d) => assert.match(d.id, /^an1\.\d+-\d+$/));
  await call('resolve_reference', { reference: 'Sn 1.8' }, (d) => assert.equal(d.title, 'Mettasuttaṃ'));
  await call('resolve_reference', { reference: 'https://www.dhammatalks.org/suttas/AN/AN7_64.html' }, (d) => assert.equal(d.id, 'an7.68'));
  await call('resolve_reference', { reference: 'Vin iii 1' }, (d) => assert.equal(d.id, 'pli-tv-bu-vb-pj1'));
  await call('find_citations', { text: 'See MN 10 and S v 420, not MN 999.' }, (d) => { assert.deepEqual(d.citations.map((c) => c.text_id ?? c.status), ['mn10', 'sn56.11', 'unresolved']); });
  await call('get_metadata', { uid: 'AN 3.65' }, (d) => { assert.match(d.pts, /^A i 188/); assert.ok(d.notes.some((n) => /3\.66/.test(n))); assert.ok(d.english.length); });
  const first = await call('get_text', { uid: 'MN 10', limit: 5 }, (d) => { assert.equal(d.text_id, 'mn10'); assert.equal(d.returned, 5); assert.ok(d.segments.some((s) => /Evaṃ me sutaṃ/.test(s.text))); });
  await call('get_text', { uid: 'mn10', limit: 3, offset: first.next_offset }, (d) => assert.notEqual(d.segments[0].ref, first.segments.at(-1).ref));
  await call('get_text', { uid: 'Dhp 183', includeVariants: true }, (d) => assert.ok(d.segments.some((s) => /Sabbapāpassa akaraṇaṃ/.test(s.text))));
  await call('get_text', { uid: 'MN 10', limit: 5, script: 'sinh' }, (d) => { assert.equal(d.script, 'sinhala'); assert.equal(d.text_id, 'mn10'); assert.ok(d.segments.some((s) => /[඀-෿]/.test(s.text) && !/[ā]/.test(s.text))); });
  await call('get_text', { uid: 'MN 10', variants: 'structured' }, (d) => { const v = d.segments.flatMap((s) => s.variants || []); assert.ok(v.some((x) => x.raw && x.readings.some((r) => r.editions.length))); assert.ok(Object.keys(d.variant_sigla).length); });
  await call('resolve_reference', { reference: 'Thai MN 1.103' }, (d) => assert.equal(d.id, 'mn10'));
  await call('search_texts', { query: 'सतिपट्ठान', limit: 3, script: 'thai' }, (d) => { assert.ok(d.results.length); assert.equal(d.input_script, 'devanagari'); assert.match(d.results[0].title, /[฀-๿]/); });
  await call('search_texts', { query: 'anapanassati', limit: 3 }, (d) => assert.ok(d.results.length));
  await call('search_texts', { query: '"sabbe sankhara anicca"', collection: 'dhp' }, (d) => assert.ok(d.results.some((r) => r.id === 'dhp277')));
  for (const node of ['canon', 'vinaya', 'sn', 'sn56', 'abhidhamma']) await call('browse_canon', { node, limit: 3 });
  await call('browse_canon', { node: 'books', limit: 3 }, (d) => assert.ok(d.items.every((b) => b.read_with.tool === 'get_text' && b.read_with.book === b.id)));
  const bookOpening = await call('get_text', { book: 'vin02m1', limit: 3 }, (d) => {
    assert.equal(d.selection, 'source_book'); assert.equal(d.book_id, 'vin02m1');
    assert.ok(d.source.terms && d.segments.every((s) => s.ref.startsWith('vri-book:vin02m1/')));
  });
  await call('get_text', { book: 'vin02m1', offset: bookOpening.next_offset, limit: 3 }, (d) => assert.notEqual(d.segments[0].ref, bookOpening.segments.at(-1).ref));
  await call('search_source_book', { book: 'vin02m1', query: '"Ime kho panāyasmanto dvenavuti pācittiyā"' }, (d) => {
    assert.equal(d.total_matched, 1);
    assert.equal(d.results[0].ref, 'vri-book:vin02m1/7');
    assert.deepEqual(d.results[0].read_with, { tool: 'get_text', book: 'vin02m1', offset: 6, limit: 1, script: 'roman' });
  });
  await call('list_sources', {});
  // verify_quote on Dhp 5 as returned by get_text (no scripture typed here), without diacritics.
  const dhp5 = await call('get_text', { uid: 'Dhp 5' });
  const quote = dhp5.segments.find((s) => s.type !== 'heading').text.normalize('NFD').replace(/\p{M}/gu, '');
  await call('verify_quote', { text: quote }, (d) => { assert.equal(d.verdict, 'found'); assert.ok(d.matches.some((m) => m.text_id === 'dhp5')); });
  await call('uposatha', { from: '2025-07-01', to: '2025-07-31', tradition: 'thai-mahanikaya' }, (d) => assert.ok(d.days.some((x) => x.date === '2025-07-10' && x.phase === 'full' && x.status === 'computed')));
  await call('festivals', { year: 2025, tradition: 'sri-lanka' }, (d) => assert.equal(d.festivals.find((f) => f.id === 'asalha-puja').texts[0].id, 'sn56.11'));
  await call('daily_text', { date: '2026-11-01' }, (d) => { assert.match(d.text.id, /^dhp\d+$/); assert.ok(d.pali.length); });
  await call('reading_plan', { name: 'mn-year', day: 365 }, (d) => assert.equal(d.readings[0].id, 'mn152'));
  if (tools.some((tool) => tool.name === 'dhamma_list')) {
    await call('dhamma_list', { name: 'five hindrances' }, (d) => { assert.equal(d.count, 5); assert.equal(d.defined_in[0].id, 'sn46.51'); });
    await call('topic', { name: 'emptiness' }, (d) => assert.ok(d.texts.some((t) => t.id === 'mn121')));
    await call('list_topics', { limit: 3 }, (d) => assert.ok(d.total >= 300));
  }
  await call('vinaya_rule', { rule: 'Pc 5' }, (d) => { assert.equal(d.canonical_text.id, 'pli-tv-bu-vb-pc5'); assert.match(d.buddhist_monastic_code.url, /dhammatalks\.org\/vinaya\/bmc\/Section0016\.html#Pc5$/); });
  await call('abhidhamma_matika', { section: 'tika 1' }, (d) => assert.equal(d.entries[0].items[0].text, 'kusalā dhammā.'));
  await call('patthana_condition', { name: 'hetu' }, (d) => { assert.equal(d.condition.definition.citation, 'Paṭṭh 1.1'); assert.equal(d.condition.dictionary.tool, 'lookup_pali'); });
  if (tools.some((t) => t.name === 'get_commentary')) await call('get_commentary', { uid: 'MN 10', limit: 3 }, (d) => { assert.equal(d.available, true); assert.match(d.label, /not the canon/); assert.equal(d.commentary, 'Papañcasūdanī'); });
  const commentarySearch = await call('search_commentary', { query: 'dhamma', limit: 1 }, (d) => {
    assert.equal(d.canonical, false); assert.equal(d.content_type, 'commentary'); assert.ok(d.results.length);
  });
  await call('get_commentary', { uid: commentarySearch.results[0].read_with.uid }, (d) => {
    assert.equal(d.canonical, false); assert.equal(d.segments[0].ref, commentarySearch.results[0].citation);
    assert.ok(!('comments_on_vri_paragraphs' in d.segments[0]));
  });
  if (tools.some((t) => t.name === 'get_parallels')) await call('get_parallels', { uid: 'DN 22', limit: 50 }, (d) => { assert.equal(d.text_id, 'dn22'); assert.ok(d.links.some((l) => l.text.id === 'mn10' && l.source === 'shared-passage' && l.this_segments.length)); assert.ok(d.links.every((l) => ['commentary-citation', 'shared-passage'].includes(l.source) && l.how_matched)); assert.match(d.suttacentral_parallels.url, /^https:\/\/suttacentral\.net\/dn22$/); });
  await call('get_text', { uid: 'MN 10', limit: 2, commentary: true }, (d) => { assert.equal(d.returned, 2); assert.equal(d.commentary.available, true); assert.match(d.commentary.label, /not the canon/); });
  await call('get_post_canonical', { citation: 'Vism 1.1', limit: 3 }, (d) => { assert.equal(d.canonical, false); assert.ok(d.segments.length); });
  await call('search_post_canonical', { query: 'kasiṇa', books: ['vism'], limit: 3 }, (d) => { assert.ok(d.results.length); assert.ok(d.results.every((r) => r.canonical === false)); });
  await call('search_texts', { query: 'kasiṇa', limit: 2, include_post_canonical: true }, (d) => assert.ok(d.post_canonical.results.length));
  await call('resolve_reference', { reference: 'mahavamsa 3' }, (d) => { assert.equal(d.canonical, false); assert.equal(d.read_with.tool, 'get_post_canonical'); });
  await fails('resolve_reference', { reference: 'Vism p. 3' }, /PTS/);
  await call('analyse_passage', { uid: 'Dhp 183', limit: 4 }, (d) => { assert.ok(d.words.length); assert.match(JSON.stringify(d), /CC BY-NC-SA 4\.0/); });
  await call('analyse_passage', { uid: 'MN ๑๐', limit: 1 }, (d) => { assert.equal(d.text_id, 'mn10'); assert.equal(d.input_script, 'thai'); assert.equal(d.segment.ref, 'mn10/2'); assert.ok(d.words.length); });
  await call('analyse_passage', { uid: 'Vism 1.1', segment: 'Vism 1.1/5', limit: 3 }, (d) => {
    assert.equal(d.canonical, false); assert.equal(d.book.id, 'visuddhimagga-1');
    assert.ok(!d.text_id); assert.ok(d.words.length); assert.match(d.dictionary_coverage_note, /remain unknown/);
  });
  await call('analyse_passage', { book: 'vin02m1', segment: 'vri-book:vin02m1/7', limit: 3 }, (d) => {
    assert.equal(d.selection, 'source_book'); assert.equal(d.book_id, 'vin02m1');
    assert.ok(!d.text_id && !d.citation); assert.equal(d.segment.text, 'Ime kho panāyasmanto dvenavuti pācittiyā');
  });
  if (tools.some((t) => t.name === 'paritta')) await call('paritta', { name: 'Ratana' }, (d) => { assert.equal(d.text_id, 'kp6'); assert.ok(d.segments.length); });
  // English-keyboard input (#102)
  await call('resolve_reference', { reference: 'Satipatthana Sutta' }, (d) => { assert.equal(d.id, 'mn10'); assert.equal(d.matched_by, 'name'); });
  await fails('resolve_reference', { reference: 'Metta sutta' }, /Snp 1\.8.*never guessed|never guessed/);
  await call('search_texts', { query: 'mindfulness of breathing', limit: 3 }, (d) => { assert.ok(d.results.length); assert.deepEqual(d.expanded_from_english.mindfulness, ['sati']); });
  await call('search_texts', { query: 'sa.myutta', limit: 2 }, (d) => assert.equal(d.input_normalised.read_as, 'saṃyutta'));
  await call('glossary', { term: 'suffering' }, (d) => { assert.equal(d.english_to_pali[0].pali, 'dukkha'); assert.ok(d.english_to_pali.every((e) => e.source)); });
  await fails('get_text', { uid: '../private' });
  await fails('resolve_reference', { reference: 'MN 153' }, /not in the canon index/);
  await fails('resolve_reference', { reference: 'Ja i 1' }, /no PTS page numbers/);

  if (live) {
    await call('get_translation', { uid: 'MN 10' }, (d) => { assert.match(d.translator, /Ṭhānissaro|Thanissaro/); assert.match(d.text, /mindful/i); });
    await call('get_translation', { uid: 'AN 3.65', translation: 'ati:/tipitaka/an/an03/an03.065.than' }, (d) => assert.match(d.text, /Kalama/i));
    await call('get_text', { uid: 'SN 56.11', limit: 4, translation: 'default' }, (d) => assert.ok(d.english && /Dhamma/i.test(d.english.text)));
    await call('compare_translations', { uid: 'MN 10', limit: 1500 }, (d) => assert.ok(d.editions.filter((e) => !e.error).length >= 2));
    await call('lookup_pali', { word: 'sati', limit: 2 }, (d) => { assert.ok(d.entries.length); assert.doesNotMatch(d.detail_excerpt, /Did you spot a mistake/); });
    await call('search_access_to_insight', { query: 'metta', limit: 3 }, (d) => assert.ok(d.results.length));
    await call('get_access_to_insight_text', { path: '/tipitaka/kn/snp/snp.1.08.than.html', limit: 2000 }, (d) => assert.match(d.text, /good|kindness/i));
    if (tools.some((t) => t.name === 'find_talks')) await call('find_talks', { passage: 'AN 3.65', limit: 3 }, (d) => { assert.ok(d.results.length); assert.ok(d.results.every((r) => r.url.startsWith('https://www.dhammatalks.org/audio/'))); });
  }
  console.log(`MCP smoke passed: ${tools.length} tools, ${checks} checks. Live=${live}`);
} finally { await client.close(); }
