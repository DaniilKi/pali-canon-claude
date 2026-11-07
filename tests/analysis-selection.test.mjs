import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { analysePassage } from '../src/analyse.mjs';
import * as canon from '../src/canon.mjs';
import { repeatedParagraphs, auditAnalysisParagraphs } from '../scripts/evidence/analysis-paragraphs.mjs';

test('every repeated canonical paragraph requires an exact analysis segment', () => {
  const repeated = [];
  for (const unit of canon.load().canon.units) {
    const labels = new Map();
    for (const segment of canon.segments(unit)) {
      if (segment.vri_paragraph == null) continue;
      const label = String(segment.vri_paragraph);
      if (!labels.has(label)) labels.set(label, []);
      labels.get(label).push(segment.ref);
    }
    for (const [label, refs] of labels) if (refs.length > 1) {
      repeated.push([unit.id, Number(label), refs]);
      assert.throws(() => analysePassage({ uid: unit.id, paragraph: label, limit: 1 }), /matches .* segments/);
    }
  }
  assert.deepEqual(repeated, repeatedParagraphs);
});

test('MCP ambiguous-paragraph errors preserve exact reading and analysis recovery across scripts', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'analysis-paragraph-fixture', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
  try { await auditAnalysisParagraphs((name, args) => client.callTool({ name, arguments: args })); }
  finally { await client.close(); }
});

const nativeCitations = [
  ['thai', 'MN ๑๐', 'mn10', 'MN 10'],
  ['myanmar', 'MN ၁၀', 'mn10', 'MN 10'],
  ['devanagari', 'MN १०', 'mn10', 'MN 10'],
  ['khmer', 'MN ១០', 'mn10', 'MN 10'],
  ['lao', 'MN ໑໐', 'mn10', 'MN 10'],
  ['lanna', 'MN ᪑᪐', 'mn10', 'MN 10'],
  ['sinhala', 'ධම්මපද 183', 'dhp183', 'dhammapada 183'],
];

test('a paragraph cannot bypass a conflicting segment reference from another text', () => {
  assert.throws(() => analysePassage({ uid: 'MN 10', segment: 'mn11/2', paragraph: 105, limit: 1 }), /either segment or paragraph.*not both/i);
});

test('two passage selectors are rejected even if they happen to identify the same segment', () => {
  assert.throws(() => analysePassage({ uid: 'MN 10', segment: 'mn10/2', paragraph: 105, limit: 1 }), /either segment or paragraph.*not both/i);
});

test('a supplied blank or null selector never silently selects the first body segment', () => {
  for (const value of ['', ' ', null]) {
    assert.throws(() => analysePassage({ uid: 'MN 10', segment: value, limit: 1 }), /segment.*empty|segment.*blank/i);
    assert.throws(() => analysePassage({ uid: 'MN 10', paragraph: value, limit: 1 }), /paragraph.*empty|paragraph.*blank/i);
  }
});

test('a missing source paragraph field cannot match a literal undefined selector', () => {
  for (const paragraph of ['undefined', 'null']) {
    assert.throws(() => analysePassage({ uid: 'MN 10', paragraph, limit: 1 }), /no VRI paragraph/);
  }
});

test('explicit selections preserve their source passage and word continuation', () => {
  for (const selector of [{ segment: 2 }, { segment: 'mn10/2' }, { paragraph: 105 }]) {
    const first = analysePassage({ uid: 'MN 10', ...selector, limit: 2 });
    const next = analysePassage({ uid: 'MN 10', ...selector, offset: first.next_offset, limit: 2 });
    assert.equal(first.segment.ref, 'mn10/2');
    assert.equal(next.segment.ref, first.segment.ref);
    assert.equal(next.segment.text, first.segment.text);
    assert.equal(next.offset, 2);
    assert.notEqual(next.words[0].surface, first.words[0].surface);
  }
});

test('MCP rejects ambiguous and blank selectors and allows an intentional default read', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'analysis-selection-fixture', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
  try {
    for (const selector of [{ segment: 'mn11/2', paragraph: 105 }, { segment: '' }, { paragraph: ' ' }, { paragraph: 'undefined' }]) {
      const result = await client.callTool({ name: 'analyse_passage', arguments: { uid: 'MN 10', ...selector, limit: 1 } });
      assert.equal(result.isError, true, JSON.stringify(selector));
    }
    const result = await client.callTool({ name: 'analyse_passage', arguments: { uid: 'MN 10', limit: 1 } });
    assert.ok(!result.isError);
    assert.equal(result.structuredContent.segment.ref, 'mn10/2');
    assert.match(result.structuredContent.notes.join(' '), /No segment given/);
    assert.equal(result.structuredContent.license.name, 'CC BY-NC-SA 4.0');
  } finally { await client.close(); }
});

test('native citations select exactly the same source and DPD analyses as Roman citations', () => {
  for (const [script, uid, id, roman] of nativeCitations) {
    const expected = analysePassage({ uid: id, limit: 4 });
    const actual = analysePassage({ uid, limit: 4 });
    assert.equal(actual.text_id, id);
    assert.equal(actual.input_script, script);
    assert.equal(actual.input_romanized, roman);
    assert.deepEqual(actual.segment, expected.segment);
    assert.deepEqual(actual.words, expected.words);
    assert.equal(actual.license.name, 'CC BY-NC-SA 4.0');
    assert.ok(!Object.hasOwn(expected, 'input_script'));
  }
});

test('native citation normalization preserves exact segment checks and word continuation', () => {
  const uid = 'MN ๑๐';
  assert.throws(() => analysePassage({ uid, segment: 'mn11/2' }), /belongs to mn11/);
  assert.throws(() => analysePassage({ uid, segment: 2, paragraph: 105 }), /not both/);
  assert.throws(() => analysePassage({ uid: 'MN ๙๙๙' }), /999/);
  const first = analysePassage({ uid, segment: 'mn10/2', limit: 2 });
  const next = analysePassage({ uid, segment: first.segment.ref, offset: first.next_offset, limit: 2 });
  assert.equal(next.segment.ref, first.segment.ref);
  assert.equal(next.offset, 2);
  assert.equal(next.input_script, 'thai');
});

test('the MCP analysis tool accepts the same handwritten native citations as get_text', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'analysis-native-input-fixture', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
  try {
    for (const [script, uid, id] of nativeCitations) {
      const read = await client.callTool({ name: 'get_text', arguments: { uid, limit: 1 } });
      const result = await client.callTool({ name: 'analyse_passage', arguments: { uid, limit: 1 } });
      assert.ok(!result.isError, JSON.stringify(result.content));
      assert.equal(result.structuredContent.text_id, read.structuredContent.text_id);
      assert.equal(result.structuredContent.text_id, id);
      assert.equal(result.structuredContent.input_script, script);
    }
  } finally { await client.close(); }
});
