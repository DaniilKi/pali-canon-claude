import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import assert from 'node:assert/strict';

const live = process.argv.includes('--live');
const serverFlag = process.argv.indexOf('--server');
const serverPath = serverFlag >= 0 ? process.argv[serverFlag + 1] : 'server/index.cjs';
const client = new Client({ name: 'pali-canon-smoke', version: '1.0.0' });
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], stderr: 'pipe' });
transport.stderr?.on('data', (data) => process.stderr.write(data));
let checks = 0;
async function call(name, args, verify) {
  const response = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
  if (response.isError) throw new Error(`${name}: ${JSON.stringify(response.content)}`);
  const text = response.content.find((part) => part.type === 'text').text;
  const data = JSON.parse(text);
  verify?.(data);
  console.log(`PASS ${name} (${text.length} chars)`);
  checks++;
  return data;
}
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 11);
  assert.ok(tools.every((tool) => tool.annotations?.readOnlyHint));
  const { resources } = await client.listResources();
  assert.equal(resources.length, 2);
  const { prompts } = await client.listPrompts();
  assert.equal(prompts.length, 3);
  await client.readResource({ uri: 'pali://canon-guide' });
  await client.readResource({ uri: 'pali://sources' });
  await client.getPrompt({ name: 'study_passage', arguments: { reference: 'MN 1' } });
  await call('resolve_reference', { reference: 'SN 56.11' }, (data) => assert.equal(data.uid, 'sn56.11'));
  await call('list_sources', {});
  const invalid = await client.callTool({ name: 'get_text', arguments: { uid: '../private' } });
  assert.ok(invalid.isError);
  if (live) {
    await call('search_texts', { query: 'loving kindness', limit: 3 }, (data) => assert.ok(data.results.length));
    await call('get_metadata', { uid: 'MN 1' }, (data) => assert.ok(data.translations.some((edition) => edition.author_uid === 'sujato')));
    const first = await call('get_text', { uid: 'MN 1', limit: 5, includeNotes: true }, (data) => {
      assert.equal(data.uid, 'mn1'); assert.ok(data.segments.some((segment) => segment.pali && segment.text)); assert.equal(data.next_offset, 5);
    });
    const second = await call('get_text', { uid: 'mn1', limit: 3, offset: first.next_offset });
    assert.notEqual(first.segments.at(-1).id, second.segments[0].id);
    await call('get_text', { uid: 'https://suttacentral.net/mn1/en/sujato#1.2', limit: 1 }, (data) => assert.equal(data.segments[0].id, 'mn1:1.2'));
    await call('get_text', { uid: 'https://suttacentral.net/mn1/en/suddhaso', limit: 1 }, (data) => assert.equal(data.author_uid, 'suddhaso'));
    await call('get_text', { uid: 'mn1', language: 'pli', author: 'ms', limit: 3 }, (data) => assert.ok(data.segments.some((segment) => segment.text)));
    await call('compare_translations', { uid: 'mn1', authors: ['sujato', 'suddhaso'], limit: 3 }, (data) => assert.ok(data.editions.every((edition) => edition.data?.author_uid === edition.author)));
    await call('get_parallels', { uid: 'mn1' });
    for (const uid of ['sutta', 'vinaya', 'abhidhamma']) await call('browse_canon', { uid, limit: 3 });
    await call('lookup_pali', { word: 'sati', limit: 2 }, (data) => assert.ok(data.entries.length));
    await call('search_access_to_insight', { query: 'metta', limit: 3 }, (data) => assert.ok(data.results.length));
    await call('get_access_to_insight_text', { path: '/tipitaka/kn/snp/snp.1.08.than.html', limit: 2000 }, (data) => assert.match(data.text, /good|kindness/i));
  }
  console.log(`MCP smoke passed: ${tools.length} tools, ${resources.length} resources, ${prompts.length} prompts, ${checks} calls. Live=${live}`);
} finally { await client.close(); }
