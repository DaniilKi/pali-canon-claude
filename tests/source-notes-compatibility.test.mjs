import {currentAuthority} from './helpers/current-apadana.mjs';
import {intake382Authority as historical382Authority} from './helpers/intake382-metadata.mjs';
const liveCurrentSource=currentAuthority(),historical382Source=historical382Authority();
import {INTAKE382_IDS} from './helpers/intake382-metadata.mjs';
import {historicalF3SourceFixture} from './helpers/historical389390-source-canon.mjs';
// Current380 app/API inputs remain actual R; historical375 and H368 remain separately named. Named H metadata below is source-derived, never an API projection.
import {intake380Authority} from './helpers/intake380-metadata.mjs';
import {requireCurrentProfiles as requireProfiles380,requireCurrentMetadata as requireMetadata380} from './helpers/current-apadana.mjs';
import {assertCurrentSourceClosure as assertCurrent389390SourceClosure} from './helpers/current-apadana.mjs';
assertCurrent389390SourceClosure(new URL('../',import.meta.url));
const current380Source=intake380Authority();
assert.equal(current380Source.historical375.ids.length,375);assert.deepEqual(current380Source.ids.slice(0,375),current380Source.historical375.ids);
const HistoricalH368Profiles=current380Source.historical368.profiles;
const HistoricalH368Catalogue={version:1,source:current380Source.historical368.manifest_source,vri_commit:current380Source.manifest.vri_commit,held:current380Source.historical368.manifest_held,links:current380Source.historical368.links};
requireProfiles380(APADANA_PROFILES);
import {canonBeforeFour} from './helpers/canon-before-four.mjs';
// Regression oracle captured from approved ff798f6 before the additive note repair.
// It hashes complete segment objects, including existing variants and citations.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as canon from '../src/canon.mjs';
import { textSegments } from '../src/variants.mjs';
import { APADANA_PROFILES } from '../src/apadana-profiles.mjs';
import { CURRENT_APADANA_IDS } from './helpers/apadana-intake-expectations.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { readPassage } from '../src/chatgpt-widget.mjs';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/source-notes-baseline.json', import.meta.url)));
const sha = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('separately indexed note preserves all old unit and book identities, source objects and 420 downstream spans', () => {
  const data = canonBeforeFour(historicalF3SourceFixture(canon.load().canon));
  assert.equal(sha(data), baseline.canonical_sha256);
  const units = data.units;
  const books = data.books.map((book, i) => ({
    id: `vri-book:${book.file.replace(/\.mul\.xml$/, '')}`, book: i,
    start: 0, end: book.blocks.length,
    collection: book.pitaka === 'vinaya' ? 'vinaya' : book.collection,
  }));
  const affected = units.filter((u) => u.book === 36 && u.end > 1130);
  assert.equal(units.length, baseline.units);
  assert.equal(books.length, baseline.books);
  assert.equal(affected.length, baseline.affected_spans);
  assert.equal(sha(affected.map((u) => [u.id, [u.book, u.start, u.end]])), baseline.affected_spans_sha256);
  for (const [kind, list] of [['unit', units], ['book', books]]) {
    assert.equal(sha(list.map((u) => [u.id, sha(u), [u.book, u.start, u.end]])), baseline[`${kind}_metadata_sha256`]);
    assert.equal(sha(list.map((u) => [u.id, canon.readingSource(u)])), baseline[`${kind}_sources_sha256`]);
  }
  const heldBytes = readFileSync(new URL('../docs/evidence/apadana/THERA_HELD234_APPROVAL.json', import.meta.url));
  assert.equal(createHash('sha256').update(heldBytes).digest('hex'), '14b739ffe5f3e6f01718ccd1c247dd35454d71abb6cf4d0de672295cef8f4aa7');
  const historicalIds = JSON.parse(heldBytes).expected_profile_ids;
  assert.equal(historicalIds.length, 285);assert.equal(historicalIds.length, baseline.profile_count);assert.equal(new Set(historicalIds).size, 285);
  assert.equal(current380Source.historical368.ids.length,368);assert.equal(current380Source.ids.length,380);assert.deepEqual(CURRENT_APADANA_IDS.slice(0,380),current380Source.ids);assert.deepEqual(CURRENT_APADANA_IDS.slice(380,382),INTAKE382_IDS);assert.equal(historical382Source.ids.length,382);assert.deepEqual(CURRENT_APADANA_IDS,liveCurrentSource.ids);assert.deepEqual(Object.keys(APADANA_PROFILES), CURRENT_APADANA_IDS);
  assert.deepEqual(CURRENT_APADANA_IDS.slice(0, 285), historicalIds);
  const historicalProfiles = Object.fromEntries(historicalIds.map(id => { assert.ok(Object.hasOwn(APADANA_PROFILES, id), id + ' prior profile retained');return [id, APADANA_PROFILES[id]]; }));
  assert.equal(sha(historicalProfiles), baseline.profiles_sha256);
  const { links } = JSON.parse(readFileSync(new URL('../server/data/apadana.json', import.meta.url)));
  assert.deepEqual(Object.keys(links), CURRENT_APADANA_IDS);
  const historicalLinks = Object.fromEntries(historicalIds.map(id => { assert.ok(Object.hasOwn(links, id), id + ' prior translation retained');return [id, links[id]]; }));
  assert.equal(sha(historicalLinks), baseline.links_sha256);
});

test('complete old segment objects remain unchanged in all 8544 units and 61 books under every existing variant mode', () => {
  const data = canonBeforeFour(historicalF3SourceFixture(canon.load().canon));
  const books = data.books.map((book, i) => ({
    id: `vri-book:${book.file.replace(/\.mul\.xml$/, '')}`, book: i,
    start: 0, end: book.blocks.length,
    collection: book.pitaka === 'vinaya' ? 'vinaya' : book.collection,
  }));
  const render = {
    none: (u) => canon.segments(u),
    raw: (u) => textSegments(u, { variants: 'raw' }).segments,
    structured: (u) => textSegments(u, { variants: 'structured' }).segments,
    source_positions: (u) => canon.segments(u, { includeNotes: true, includeSourcePositions: true }),
  };
  for (const [mode, segmentsOf] of Object.entries(render)) {
    for (const [kind, list] of [['units', data.units], ['books', books]]) {
      const actual = list.map((u) => {
        const segments = segmentsOf(u);
        return [u.id, segments.length, sha(segments)];
      });
      assert.equal(sha(actual), baseline.mode_digests[mode][kind], `${kind}/${mode}: all existing fields and citation fingerprints`);
    }
  }
});

test('additive edition apparatus preserves the entire old API result across 342 page, script, variant and citation cases', async () => {
  const old = JSON.parse(readFileSync(new URL('./fixtures/source-notes-api-baseline.json', import.meta.url)));
  assert.equal(old.baseline, baseline.baseline);
  assert.equal(old.cases.length, 342);
  const [left, right] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  const client = new Client({ name: 'source-note-api-compatibility', version: '1' });
  try {
    await Promise.all([server.connect(right), client.connect(left)]);
    for (const entry of old.cases) {
      let result;
      if (entry.transport === 'get_text') {
        const response = await client.callTool({ name: 'get_text', arguments: entry.args });
        assert.ok(!response.isError, JSON.stringify(response));
        result = JSON.parse(response.content.find((part) => part.type === 'text').text);
      } else {
        assert.equal(entry.transport, 'readPassage');
        result = await readPassage(entry.args);
      }
      const { source_notes: separateApparatus, ...existingResult } = result;
      assert.equal(sha(existingResult), entry.hash, `${entry.transport} ${JSON.stringify(entry.args)}: no old field may change`);
    }
  } finally {
    await client.close();
    await server.close();
  }
});
