import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

async function session(run) {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'prompt-resource-contracts', version: '1' }), server = createServer();
  const call = async (name, args) => { const r = await client.callTool({ name, arguments: args }); assert.ok(!r.isError, JSON.stringify(r.content)); return JSON.parse(r.content[0].text); };
  try { await Promise.all([client.connect(a), server.connect(b)]); await run(client, call); }
  finally { await client.close(); await server.close(); }
}

test('all MCP prompts reject blank and oversized arguments and preserve trimmed Unicode input', async () => session(async client => {
  for (const prompt of (await client.listPrompts()).prompts) {
    const field = prompt.arguments[0].name;
    for (const value of ['', ' \n\t ', 'x'.repeat(field === 'topic' ? 201 : 301)]) {
      await assert.rejects(() => client.getPrompt({ name: prompt.name, arguments: { [field]: value } }));
    }
    const value = field === 'topic' ? 'mettā' : 'MN 10';
    const result = await client.getPrompt({ name: prompt.name, arguments: { [field]: `  ${value}  ` } });
    assert.ok(result.messages[0].content.text.includes(value));
    assert.ok(!result.messages[0].content.text.includes(`  ${value}  `));
  }
}));

test('study and memorisation guidance choose the actual post-canonical reader and preserve source labels', async () => session(async (client, call) => {
  const metadata = await call('resolve_reference', { reference: 'Vism 1.1' });
  assert.equal(metadata.canonical, false);
  const { tool, ...args } = metadata.read_with;
  const read = await call(tool, { ...args, limit: 1 });
  assert.equal(tool, 'get_post_canonical'); assert.equal(read.canonical, false);
  assert.deepEqual(read.source, metadata.source); assert.ok(read.segments.length);
  for (const name of ['study_passage', 'memorise_passage', 'compare_translations']) {
    const prompt = await client.getPrompt({ name, arguments: { reference: 'Vism 1.1' } });
    const text = prompt.messages[0].content.text;
    assert.match(text, /canonical: false/); assert.match(text, /get_post_canonical/); assert.match(text, /post-canonical label/);
  }
  const memorise = await client.getPrompt({ name: 'memorise_passage', arguments: { reference: 'Dhp 1' } });
  assert.match(memorise.messages[0].content.text, /MCP tools do not set reminders or store progress/);
  assert.doesNotMatch(memorise.messages[0].content.text, /You cannot set reminders/);
}));

test('the canon resource describes actual uncertain alignments without calling the flag proof of abbreviation', async () => session(async (client, call) => {
  const guide = (await client.readResource({ uri: 'pali://canon-guide' })).contents[0];
  assert.equal(guide.mimeType, 'text/plain');
  assert.match(guide.text, /flag alone does not prove source abbreviation or omission/);
  const uncertain = await call('resolve_reference', { reference: 'AN 1.82' });
  assert.equal(uncertain.approximate, true); assert.equal(uncertain.alignment.kind, 'unverified_alignment');
  const sources = (await client.readResource({ uri: 'pali://sources' })).contents[0];
  assert.deepEqual(JSON.parse(sources.text), await call('list_sources', {}));
}));
