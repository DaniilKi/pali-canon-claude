import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { CitationError } from '../src/citations.mjs';
import { resolveReference, nameKey } from '../src/sutta-names.mjs';
import { translationTitle } from '../src/translation-titles.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

const storedCaptions = Object.entries(canon.load().translations).flatMap(([id, links]) => links
  .filter((link) => link.source === 'dhammatalks').map((link) => ({ id, title: translationTitle(link), link }))
);
const captions = storedCaptions.filter((entry) => entry.title && !/\d/u.test(entry.title) && nameKey(entry.title).key.length >= 3);
const wordCount = (title) => canon.fold(title).replace(/[^a-z\s]/gu, ' ').trim().split(/\s+/u).filter(Boolean).length;
function candidateIds(query) {
  try {
    const result = resolveReference(query);
    assert.equal(result.matched_by, 'name', query);
    assert.equal(result.name_match.match, 'exact', query);
    return [result.unit.id, ...(result.also_named || []).map((entry) => entry.id)];
  } catch (error) {
    assert.ok(error instanceof CitationError);
    assert.ok(error.candidates?.length > 1, query);
    return error.candidates.map((entry) => entry.id);
  }
}

test('stored dhammatalks English titles resolve with exact source attribution and article aliases', () => {
  for (const [query, id, title] of [['A Gallon Measure', 'sn3.13', 'A Gallon Measure'],
    ['Gallon Measure', 'sn3.13', 'Gallon Measure'], ['King Udena', 'ud7.10', 'King Udena'],
    ['Categorically sutta', 'an2.18', 'Categorically']]) {
    const result = resolveReference(query);
    assert.equal(result.unit.id, id, query);
    assert.equal(result.matched_by, 'name');
    assert.equal(result.name_match.matched_name, title);
    assert.match(result.name_match.via, /English title \(dhammatalks\.org/);
    assert.equal(result.name_match.match, 'exact');
  }
});

test('every eligible dhammatalks caption retains its mapped text among exact name candidates', () => {
  assert.ok(captions.length > 1000);
  for (const { title, link } of storedCaptions) if (!title) {
    assert.match(link.reference, /^\d+(?:[–—-]\d+)? Itivuttaka$/u, 'unrecognised captions must not silently lose a title');
  }
  for (const { id, title } of captions) {
    const marker = canon.resolve(id).unit.collection === 'dhp' ? 'chapter' : 'sutta';
    const query = wordCount(title) > 1 ? title : `${title} ${marker}`;
    assert.ok(candidateIds(query).includes(id), `${id}: ${query}`);
  }
});

test('duplicate English titles retain all candidates instead of selecting an arbitrary source', () => {
  const groups = new Map();
  for (const { id, title } of captions.filter((entry) => wordCount(entry.title) > 1)) {
    const key = nameKey(title).key;
    const group = groups.get(key) || { title, ids: new Set() };
    group.ids.add(id); groups.set(key, group);
  }
  const duplicates = [...groups.values()].filter((group) => group.ids.size > 1);
  assert.ok(duplicates.length);
  for (const group of duplicates) {
    const actual = new Set(candidateIds(group.title));
    for (const id of group.ids) assert.ok(actual.has(id), `${group.title}: ${id}`);
  }
});

test('English topic and numeric-name safeguards stay in force', () => {
  assert.throws(() => resolveReference('Categorically'), CitationError);
  assert.throws(() => resolveReference('King Udena 999'), CitationError);
  assert.throws(() => resolveReference('A Gallon Measure 999'), CitationError);
  assert.equal(resolveReference('MN 10').unit.id, 'mn10');
  assert.equal(resolveReference('Fire Sermon').unit.id, 'sn35.28');
});

test('MCP reference resolution exposes the stored English caption as its name evidence', async () => {
  const client = new Client({ name: 'stored-title-resolution', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), createServer().connect(b)]);
  try {
    for (const [reference, id] of [['A Gallon Measure', 'sn3.13'], ['King Udena', 'ud7.10']]) {
      const response = await client.callTool({ name: 'resolve_reference', arguments: { reference } });
      assert.ok(!response.isError, reference);
      const result = JSON.parse(response.content[0].text);
      assert.equal(result.id, id);
      assert.equal(result.name_match.matched_name, reference);
      assert.match(result.name_match.via, /dhammatalks\.org/);
    }
  } finally { await client.close(); }
});
