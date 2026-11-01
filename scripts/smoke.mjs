import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import assert from 'node:assert/strict';

const live = process.argv.includes('--live');
const serverFlag = process.argv.indexOf('--server');
const serverPath = serverFlag >= 0 ? process.argv[serverFlag + 1] : 'server/index.cjs';
const client = new Client({ name: 'pali-canon-smoke', version: '2.0.0' });
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
  assert.ok(tools.length >= 11);
  assert.ok(tools.every((tool) => tool.annotations?.readOnlyHint));
  assert.equal((await client.listResources()).resources.length, 2);
  assert.equal((await client.listPrompts()).prompts.length, 3);
  await client.readResource({ uri: 'pali://canon-guide' });
  await client.getPrompt({ name: 'study_passage', arguments: { reference: 'MN 10' } });

  // Offline: resolution, text, search, browse.
  await call('resolve_reference', { reference: 'SN 56:11' }, (d) => { assert.equal(d.id, 'sn56.11'); assert.match(d.pts, /^S v 420/); });
  await call('resolve_reference', { reference: 'M i 55' }, (d) => assert.equal(d.id, 'mn10'));
  await call('resolve_reference', { reference: 'AN 1.300' }, (d) => assert.match(d.id, /^an1\.\d+-\d+$/));
  await call('resolve_reference', { reference: 'Sn 1.8' }, (d) => assert.equal(d.title, 'Mettasuttaṃ'));
  await call('resolve_reference', { reference: 'https://www.dhammatalks.org/suttas/AN/AN7_64.html' }, (d) => assert.equal(d.id, 'an7.68'));
  await call('resolve_reference', { reference: 'Vin iii 1' }, (d) => assert.equal(d.id, 'pli-tv-bu-vb-pj1'));
  await call('get_metadata', { uid: 'AN 3.65' }, (d) => { assert.match(d.pts, /^A i 188/); assert.ok(d.notes.some((n) => /3\.66/.test(n))); assert.ok(d.english.length); });
  const first = await call('get_text', { uid: 'MN 10', limit: 5 }, (d) => { assert.equal(d.text_id, 'mn10'); assert.equal(d.returned, 5); assert.ok(d.segments.some((s) => /Evaṃ me sutaṃ/.test(s.text))); });
  await call('get_text', { uid: 'mn10', limit: 3, offset: first.next_offset }, (d) => assert.notEqual(d.segments[0].ref, first.segments.at(-1).ref));
  await call('get_text', { uid: 'Dhp 183', includeVariants: true }, (d) => assert.ok(d.segments.some((s) => /Sabbapāpassa akaraṇaṃ/.test(s.text))));
  await call('search_texts', { query: 'anapanassati', limit: 3 }, (d) => assert.ok(d.results.length));
  await call('search_texts', { query: '"sabbe sankhara anicca"', collection: 'dhp' }, (d) => assert.ok(d.results.some((r) => r.id === 'dhp277')));
  for (const node of ['canon', 'vinaya', 'sn', 'sn56', 'abhidhamma']) await call('browse_canon', { node, limit: 3 });
  await call('list_sources', {});
  await call('abhidhamma_matika', { section: 'tika 1' }, (d) => assert.equal(d.entries[0].items[0].text, 'kusalā dhammā.'));
  await call('patthana_condition', { name: 'hetu' }, (d) => { assert.equal(d.condition.definition.citation, 'Paṭṭh 1.1'); assert.match(d.condition.gloss.label, /not scripture/); });
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
  }
  console.log(`MCP smoke passed: ${tools.length} tools, ${checks} checks. Live=${live}`);
} finally { await client.close(); }
