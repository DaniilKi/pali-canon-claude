import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { appearsIn, lookupName } from '../src/dppn.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

// Temporary title metadata below is explicitly a code-path fixture, never dictionary or scripture content.
function withLinks(links, run) {
  const data = canon.load(), original = data.translations.mn10;
  data.translations.mn10 = links;
  try { return run(); } finally { data.translations.mn10 = original; }
}
const fixture = (english, reference = 'Referencefixtureword') => ({ source: 'fixture', translator: 'Test fixture', english, reference });

test('proper-name ranking includes the existing English Pasenadi title with exact source evidence', () => {
  const link = canon.load().translations['sn3.13'].find((item) => item.english?.includes('Pasenadi'));
  assert.ok(link);
  const result = appearsIn('Pasenadi', 50);
  assert.equal(result.texts[0].text_id, 'sn3.13');
  assert.match(result.texts[0].why, /title/);
  const hit = result.title_matches.find((item) => item.text_id === 'sn3.13');
  assert.ok(hit);
  assert.ok(hit.matched_titles.some((evidence) => evidence.title === link.english && evidence.language === 'english'
    && evidence.source === canon.sourceName(link) && evidence.translator === link.translator));
  assert.deepEqual(result.texts[0].matched_titles, hit.matched_titles);
  assert.equal(hit.title, canon.resolve('SN 3.13').unit.title, 'retain the canonical Pāli title separately');
});

test('legacy dhammatalks captions retain their English title without the citation prefix', () => {
  for (const [name, id, title] of [['Ānanda', 'ud5.8', 'Ānanda'], ['Heedfulness', 'dhp21-32', 'Heedfulness']]) {
    const result = appearsIn(name, 1000);
    const hit = result.title_matches.find((item) => item.text_id === id);
    assert.ok(hit, name);
    assert.ok(hit.matched_titles.some((evidence) => evidence.language === 'english'
      && evidence.source === 'dhammatalks.org' && evidence.title === title), name);
    if (name === 'Ānanda') {
      const link = canon.load().translations[id].find((item) => item.source === 'anandajoti');
      assert.ok(hit.matched_titles.some((evidence) => evidence.title === link.english && evidence.source === canon.sourceName(link)));
    }
    if (name === 'Heedfulness') assert.equal(result.texts.find((item) => item.text_id === id).paragraphs_naming_it, undefined);
  }
});

test('bibliographic references alone never become proper-name title evidence', () => {
  withLinks([fixture('Titlefixtureword (test fixture)')], () => {
    const result = appearsIn('Referencefixtureword', 1000);
    assert.equal(result.total_texts_matched, 0);
    assert.deepEqual(result.title_matches, []);
  });
});

test('every word must occur in one actual title, not across different title fields', () => {
  withLinks([fixture('Titlefixturealpha (test fixture)'), fixture('Titlefixturebeta (test fixture)')], () => {
    assert.equal(appearsIn('Titlefixturealpha Titlefixturebeta', 1000).total_texts_matched, 0);
    assert.equal(appearsIn('Satipatthana Titlefixturealpha', 1000).total_texts_matched, 0);
  });
  withLinks([fixture('Titlefixturealpha Titlefixturebeta (test fixture)')], () => {
    const result = appearsIn('Titlefixturealpha Titlefixturebeta', 1000);
    assert.equal(result.total_texts_matched, 1);
    assert.equal(result.texts[0].text_id, 'mn10');
    assert.equal(result.texts[0].paragraphs_naming_it, undefined, 'metadata is not a Pāli-body occurrence');
    assert.equal(result.texts[0].matched_titles[0].language, 'english');
  });
});

test('MCP lookup_name exposes title evidence while preserving the DPPN licence gate', async () => {
  const client = new Client({ name: 'proper-name-title-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), createServer().connect(b)]);
  try {
    const response = await client.callTool({ name: 'lookup_name', arguments: { name: 'Pasenadi', textLimit: 5 } });
    assert.ok(!response.isError);
    const result = JSON.parse(response.content[0].text);
    assert.equal(result.found, false);
    assert.equal(result.dictionary.status, 'not-bundled');
    assert.deepEqual(result.entries, []);
    assert.equal(result.appears_in.texts[0].text_id, 'sn3.13');
    assert.ok(result.appears_in.texts[0].matched_titles.some((evidence) => evidence.language === 'english'));
    const pali = lookupName({ name: 'Sāriputta', textLimit: 50 }).appears_in;
    assert.ok(pali.title_matches.find((hit) => hit.text_id === 'ud3.4').matched_titles.some((evidence) => evidence.language === 'pali'));
  } finally { await client.close(); }
});
