import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as canon from '../src/canon.mjs';
import { URI, GUIDE, EXAMPLES, GRAMMARS, NOT_LINKED, register } from '../src/pronunciation.mjs';

test('pali://pronunciation is registered and served as markdown', async () => {
  const server = createServer();
  const client = new Client({ name: 'test', version: '0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const { resources } = await client.listResources();
  const entry = resources.find((r) => r.uri === URI);
  assert.ok(entry, 'resource listed');
  assert.equal(entry.mimeType, 'text/markdown');
  assert.ok(resources.some((r) => r.uri === 'pali://sources') && resources.some((r) => r.uri === 'pali://canon-guide'), 'core resources untouched');
  const { contents } = await client.readResource({ uri: URI });
  assert.equal(contents[0].text, GUIDE);
  await client.close();
});

test('register only adds a resource', () => {
  const calls = [];
  register({ resource: (...args) => calls.push(args), tool: () => assert.fail('no tools'), prompt: () => assert.fail('no prompts') });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], URI);
});

test('guide covers every topic the issue asks for and says it is not scripture', () => {
  for (const heading of ['## The alphabet', '## Vowels: long and short', '## Aspirated consonants', '## Retroflex consonants',
    '## Niggahīta ṃ', '## Double consonants', '## Syllable length and stress', '## Free Pāli grammars']) assert.ok(GUIDE.includes(heading), heading);
  assert.match(GUIDE, /not scripture/);
  for (const letter of 'a ā i ī u ū e o k kh g gh ṅ c ch j jh ñ ṭ ṭh ḍ ḍh ṇ t th d dh n p ph b bh m y r l v s h ḷ ṃ'.split(' ')) {
    assert.ok(GUIDE.includes(letter), letter);
  }
  assert.equal('a ā i ī u ū e o'.split(' ').length + 'k kh g gh ṅ c ch j jh ñ ṭ ṭh ḍ ḍh ṇ t th d dh n p ph b bh m y r l v s h ḷ ṃ'.split(' ').length, 41);
});

test('every example word is spelled as it occurs in the bundled VRI text', () => {
  const d = canon.load();
  const wanted = new Set(EXAMPLES.map((e) => e.word));
  const found = new Set();
  let samgho = 0;
  for (const book of d.canon.books) {
    for (const block of book.blocks) {
      for (const w of String(block[2]).toLowerCase().split(/[^a-zāīūṃṅñṭḍṇḷ]+/)) {
        if (wanted.has(w)) found.add(w);
        if (w === 'saṃgho') samgho += 1;
      }
    }
  }
  assert.deepEqual([...wanted].filter((w) => !found.has(w)), []);
  for (const e of EXAMPLES) assert.ok(GUIDE.includes(`| ${e.word} |`), e.word);
  // The VRI edition writes saṅgho, never "saṃgho", as the guide says.
  assert.ok(found.has('saṅgho'));
  assert.equal(samgho, 0);
});

test('only openly available grammars with verified licences are linked', () => {
  assert.ok(GRAMMARS.length >= 1);
  for (const g of GRAMMARS) {
    assert.match(g.url, /^https:\/\/archive\.org\/details\/[\w.]+$/, g.title);
    assert.equal(g.licence, 'Public domain', g.title);
    assert.ok(g.licence_basis.length > 20, g.title);
    assert.ok(g.verified.length >= 1 && g.verified.every((u) => u.startsWith('https://')), g.title);
    assert.ok(GUIDE.includes(g.url), g.title);
  }
  assert.ok(GRAMMARS.some((g) => /Duroiselle/.test(g.author)));
  for (const g of NOT_LINKED) {
    assert.ok(GUIDE.includes(g.title));
    assert.ok(!('url' in g), `${g.title} must not be linked`);
  }
  assert.doesNotMatch(GUIDE, /suttacentral/i);
});
