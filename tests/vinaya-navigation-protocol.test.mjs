import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as canon from '../src/canon.mjs';

async function session(run) {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'vinaya-navigation', version: '1' }), server = createServer();
  const call = async (name, args) => {
    const r = await client.callTool({ name, arguments: args });
    assert.ok(!r.isError, JSON.stringify(r.content));
    return JSON.parse(r.content[0].text);
  };
  const follow = ({ tool, ...args }) => call(tool, args);
  try { await Promise.all([client.connect(a), server.connect(b)]); await run({ call, follow }); }
  finally { await client.close(); await server.close(); }
}

test('Vinaya commands open the selected root passage and retain the separate BMC attribution', async () => session(async ({ call, follow }) => {
  const rule = await call('vinaya_rule', { rule: 'Sk 62' });
  const page = await follow(rule.canonical_text.reading_command);
  assert.equal(page.text_id, 'pli-tv-bu-vb-sk62');
  assert.deepEqual(page.source, canon.source());
  assert.deepEqual(page.segments, canon.segments(canon.resolve(page.text_id).unit).slice(0, page.limit));
  assert.equal(rule.buddhist_monastic_code.discussed_with, 'Sk 61');
  assert.match(rule.buddhist_monastic_code.url, /#Sk61$/);
  assert.match(rule.buddhist_monastic_code.kind, /commentary.*linked only/);
  assert.match(rule.buddhist_monastic_code.attribution.note, /not scripture/);
  assert.equal(rule.buddhist_monastic_code.text, undefined);
  assert.match(rule.canonical_text.read_with, /get_text/, 'Keep the previous prose instructions');
}));

test('all seven samatha commands open the shared paragraph and its separate introduction', async () => session(async ({ call, follow }) => {
  for (let n = 1; n <= 7; n++) {
    const rule = await call('vinaya_rule', { rule: `As ${n}` });
    const text = rule.canonical_text;
    assert.equal(text.id, `pli-tv-bu-vb-as${n}`);
    assert.deepEqual(text.reading_command, { tool: 'get_text', uid: 'pli-tv-bu-vb-as2' });
    const shared = await follow(text.reading_command);
    assert.equal(shared.text_id, text.passage_id);
    assert.deepEqual(shared.segments, canon.segments(canon.resolve('pli-tv-bu-vb-as2').unit));
    assert.equal(shared.segments.filter(s => s.vri_paragraph === '655').length, 1);
    assert.doesNotMatch(shared.segments.map(s => s.text).join(' '), /Bhikkhunīvibhaṅg/);
    const intro = await follow(text.introduction.read_with);
    assert.equal(intro.text_id, 'pli-tv-bu-vb-as1');
    assert.deepEqual(intro.segments, canon.segments(canon.resolve(intro.text_id).unit));
    assert.deepEqual(text.source, shared.source);
    assert.match(rule.notes.join(' '), /one paragraph/);
    assert.match(rule.buddhist_monastic_code.url, new RegExp(`#As${n}$`));
  }
}));
