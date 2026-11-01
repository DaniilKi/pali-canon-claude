// lookup_name (issue #32): Dictionary of Pāli Proper Names code path.
// The bundled dataset has no entries until the DPPN licence is confirmed (docs/sources.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import * as canon from '../src/canon.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { lookupName, loadDppn, matchEntries, nameStem, nameStems, register } from '../src/dppn.mjs';

test('bundled DPPN data: no entries until the licence is confirmed, with source details', () => {
  const data = loadDppn();
  assert.equal(data.source.name, 'Dictionary of Pāli Proper Names');
  assert.match(data.source.author, /Malalasekera/);
  // Licence gate: entries may only be bundled together with a licence.
  if (data.entries.length) assert.ok(data.source.license, 'entries need a confirmed licence');
  else assert.equal(data.source.license, null);
  for (const link of data.source.read_online) {
    assert.ok(['ancient-buddhist-texts.net', 'www.palikanon.com'].includes(new URL(link.url).host), link.url);
  }
  // Every citation in a bundled entry must resolve in the bundled canon.
  for (const entry of data.entries) {
    assert.ok(entry.name && entry.text, 'entries need a name and verbatim text');
    for (const ref of entry.refs || []) assert.doesNotThrow(() => canon.resolve(ref), `${entry.name}: ${ref}`);
  }
});

test('lookup_name with the bundled data: says nothing is bundled, links out, lists canon texts', () => {
  const r = lookupName({ name: 'Sāriputta', textLimit: 5 });
  assert.equal(r.found, false);
  assert.deepEqual(r.entries, []);
  assert.equal(r.dictionary.status, 'not-bundled');
  assert.match(r.note, /No dictionary entries are bundled/);
  assert.ok(r.read_online.length >= 1);
  assert.deepEqual(r.appears_in.stems, ['sariputt']);
  assert.ok(r.appears_in.total_texts_matched > 0);
  assert.ok(r.appears_in.texts.length <= 5);
  assert.match(r.appears_in.attribution, /Vipassana Research Institute/);
  // Titles that contain the name are real texts of the bundled canon.
  assert.ok(r.appears_in.title_matches.some((t) => t.text_id === 'ud3.4'));
  for (const t of [...r.appears_in.title_matches, ...r.appears_in.texts]) assert.equal(canon.resolve(t.text_id).unit.id, t.text_id);
});

test('name stems match inflected forms and ignore diacritics', () => {
  assert.equal(nameStem('Sāriputta'), 'sariputt');
  assert.equal(nameStem('Anāthapiṇḍika'), 'anathapindik');
  assert.equal(nameStem('Sāvatthī'), 'savatth');
  assert.equal(nameStem('Savatthi'), 'savatth');
  assert.equal(nameStem('Ānanda'), 'anand');
  assert.equal(nameStem('Uda'), 'uda');
  assert.deepEqual(nameStems('Ajātasattu Vedehiputta'), ['ajatasatt', 'vedehiputt']);
  assert.equal(nameStem('Mahā Moggallāna'), 'maha moggallan');
  const a = lookupName({ name: 'Anathapindika', textLimit: 3 }).appears_in;
  const b = lookupName({ name: 'Anāthapiṇḍika', textLimit: 3 }).appears_in;
  assert.deepEqual(a.texts, b.texts);
  assert.ok(a.total_texts_matched > 0);
  assert.ok(lookupName({ name: 'Sāvatthī', textLimit: 1 }).appears_in.total_texts_matched > 0);
});

test('lookup_name rejects empty or overlong names', () => {
  assert.throws(() => lookupName({ name: '' }), /proper name/);
  assert.throws(() => lookupName({ name: 'x'.repeat(101) }), /proper name/);
  assert.throws(() => lookupName({ name: '!!' }), /two letters/);
  assert.throws(() => lookupName({ name: 'a b c d e' }), /at most four words/);
});

// Code-path test only. These records are placeholders, not dictionary content: their text says so.
const FIXTURE = {
  source: { name: 'Test fixture', author: 'none', edition: 'none', license: 'test-only', attribution: 'test fixture', reason: 'n/a' },
  entries: [
    { name: 'Fixturename', aliases: ['Fixture-alias'], kind: 'person', text: '(test fixture, not dictionary content)', refs: ['MN 10', 'XYZ 999'], page: 'test' },
    { name: 'Fixturenameother', text: '(test fixture, not dictionary content)' },
  ],
};

test('code path with entries: exact before prefix, aliases, citations resolved or flagged, attribution kept', () => {
  assert.deepEqual(matchEntries(FIXTURE.entries, 'fixturename').map((e) => e.name), ['Fixturename', 'Fixturenameother']);
  assert.deepEqual(matchEntries(FIXTURE.entries, 'FIXTURE alias').map((e) => e.name), ['Fixturename']);
  assert.deepEqual(matchEntries(FIXTURE.entries, 'fixturename', 1).map((e) => e.name), ['Fixturename']);
  const r = lookupName({ name: 'Fixturename', textLimit: 1 }, FIXTURE);
  assert.equal(r.found, true);
  assert.equal(r.dictionary.status, 'bundled');
  assert.equal(r.dictionary.license, 'test-only');
  assert.equal(r.dictionary.attribution, 'test fixture');
  assert.equal(r.note, undefined);
  const [first] = r.entries;
  assert.equal(first.entry, '(test fixture, not dictionary content)');
  assert.deepEqual(first.references[0], { cited: 'MN 10', text_id: 'mn10', citation: canon.resolve('MN 10').unit.acronym, title: canon.resolve('MN 10').unit.title });
  assert.equal(first.references[1].text_id, null);
  const none = lookupName({ name: 'Nomatchhere', textLimit: 1 }, FIXTURE);
  assert.equal(none.found, false);
  assert.match(none.note, /No entry for "Nomatchhere"/);
});

test('lookup_name is registered as a read-only offline tool', async () => {
  const calls = [];
  register({ tool: (...args) => calls.push(args), z });
  assert.equal(calls.length, 1);
  const [name, description, shape, fn, options] = calls[0];
  assert.equal(name, 'lookup_name');
  assert.match(description, /Works offline/);
  assert.deepEqual(Object.keys(shape), ['name', 'limit', 'textLimit', 'exactWord']);
  assert.ok(!options?.network, 'offline tool must not be marked network');
  const parsed = z.object(shape).parse({ name: 'Sāriputta' });
  assert.equal(parsed.limit, 5);
  const result = await fn(parsed);
  assert.equal(result.name, 'Sāriputta');
});

test('multi-word names: each word is stemmed and searched separately', () => {
  const r = lookupName({ name: 'Ajātasattu Vedehiputta', textLimit: 5 }).appears_in;
  assert.deepEqual(r.stems, ['ajatasatt', 'vedehiputt']);
  assert.ok(r.total_texts_matched > 0, 'Ajātasattu Vedehiputta is found');
  assert.equal(r.texts[0].text_id, 'dn2', 'the Sāmaññaphala Sutta names him most');
  // Written as two words or one, Mahā Moggallāna finds the texts named after him first.
  for (const name of ['Mahā Moggallāna', 'Mahamoggallana']) {
    const m = lookupName({ name, textLimit: 5 }).appears_in;
    assert.match(m.texts[0].title, /^Mahāmoggallāna/, name);
    assert.match(m.texts[0].why, /title/);
  }
});

test('ranking: title matches, then the opening (nidāna), then the rest; not canon order', () => {
  const tiers = (r) => r.texts.map((t) => (/title/.test(t.why) ? 0 : /opening/.test(t.why) ? 1 : 2));
  for (const name of ['Moggallāna', 'Pasenadi', 'Rājagaha', 'Kapilavatthu', 'Sāriputta', 'Ānanda']) {
    const r = lookupName({ name, textLimit: 20 }).appears_in;
    const t = tiers(r);
    assert.deepEqual(t, [...t].sort((a, b) => a - b), `${name}: tiers in order`);
    assert.ok(t[0] <= 1, `${name}: a title or opening match comes first`);
    assert.ok(!r.texts[0].text_id.startsWith('pli-tv-bu-vb'), `${name}: not the Vinaya vibhaṅga first`);
    assert.match(r.order, /title first/);
  }
  // Pasenadi is named in the opening of MN 90 (Kaṇṇakatthala), which leads the list.
  assert.equal(lookupName({ name: 'Pasenadi', textLimit: 3 }).appears_in.texts[0].text_id, 'mn90');
  for (const t of lookupName({ name: 'Kapilavatthu', textLimit: 10 }).appears_in.texts) assert.equal(canon.resolve(t.text_id).unit.id, t.text_id);
});

test('short names are matched as whole words; exactWord narrows longer ones', () => {
  const uda = lookupName({ name: 'Uda', textLimit: 5 }).appears_in;
  assert.match(uda.match, /whole word/);
  assert.match(uda.note, /whole words/);
  const loose = lookupName({ name: 'Uda', textLimit: 1, exactWord: false }).appears_in;
  assert.ok(loose.total_texts_matched > 1000, 'as a substring, uda is in thousands of texts (udaka, udana)');
  assert.ok(uda.total_texts_matched < loose.total_texts_matched / 5);
  // Citations are not titles: Ud 1.1 does not match the name Uda.
  assert.ok(!uda.title_matches.some((t) => t.text_id.startsWith('ud')));
  const nanda = lookupName({ name: 'Nanda', textLimit: 5 }).appears_in;
  assert.match(nanda.match, /whole word/);
  assert.ok(!nanda.texts.some((t) => /ānanda/i.test(t.title)), 'Nanda does not match Ānanda');
  const stem = lookupName({ name: 'Ānanda', textLimit: 5 }).appears_in;
  const exact = lookupName({ name: 'Ānanda', textLimit: 5, exactWord: true }).appears_in;
  assert.match(stem.match, /stem/);
  assert.ok(exact.total_texts_matched < stem.total_texts_matched, 'whole words drop compounds such as ānandajāta');
  assert.ok(exact.total_texts_matched > 100);
  assert.match(exact.texts[0].title, /ānanda/i);
});

test('built server exposes lookup_name over MCP as a read-only, closed-world tool', async () => {
  const client = new Client({ name: 'dppn-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: ['server/index.cjs'], stderr: 'pipe' });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const t = tools.find((x) => x.name === 'lookup_name');
    assert.ok(t, 'lookup_name is listed');
    assert.equal(t.annotations.readOnlyHint, true);
    assert.equal(t.annotations.openWorldHint, false);
    assert.ok(t.inputSchema.properties.exactWord);
    const res = await client.callTool({ name: 'lookup_name', arguments: { name: 'Ajātasattu Vedehiputta', textLimit: 2 } });
    assert.ok(!res.isError, res.content?.[0]?.text);
    const data = JSON.parse(res.content.find((c) => c.type === 'text').text);
    assert.equal(data.dictionary.status, 'not-bundled');
    assert.ok(data.appears_in.total_texts_matched > 0);
  } finally {
    await client.close();
  }
});
