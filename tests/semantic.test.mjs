// Issue #33: search by meaning is deferred (docs/semantic-search.md). These tests keep the
// evaluation set honest (every citation resolves to the stated VRI title) and make sure no
// half-built semantic tool or embedding file slips into the package.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as canon from '../src/canon.mjs';
import * as features from '../src/features/index.mjs';

const root = new URL('../', import.meta.url);
const { queries } = JSON.parse(readFileSync(new URL('scripts/semantic/queries.json', root), 'utf8'));

test('evaluation set: every cited text resolves to the stated VRI title', () => {
  let n = 0;
  for (const q of queries) {
    for (const [ref, title] of Object.entries(q.cite ?? {})) {
      const { unit } = canon.resolve(ref);
      assert.equal(unit.title, title, `${q.query}: ${ref}`);
      n++;
    }
    for (const id of q.ids ?? []) assert.equal(canon.resolve(id).unit.id, id, `${q.query}: ${id}`);
  }
  assert.ok(n >= 15);
});

test('evaluation set: every relevance rule matches at least one text, and rare ones stay rare', () => {
  const units = canon.load().canon.units;
  for (const q of queries) {
    const pat = q.title ? new RegExp(q.title, 'i') : null;
    const ids = new Set(q.ids ?? []);
    const hits = units.filter((u) => ids.has(u.id) || (q.prefix && u.id.startsWith(q.prefix)) || (pat && pat.test(u.title)));
    assert.ok(hits.length >= 1, q.query);
    assert.ok(hits.length / units.length < 0.02, `${q.query} matches too much to measure anything`);
  }
});

test('docs: the "Chance" column matches the question set and the bundled canon', () => {
  // Chance of a hit in the top 10 = 1 - (1 - share of relevant texts)^10, as in
  // scripts/semantic/eval_embeddings.py. Recomputed here so the published table cannot drift.
  const doc = readFileSync(new URL('docs/semantic-search.md', root), 'utf8');
  const units = canon.load().canon.units;
  let expected = 0;
  for (const q of queries.filter((x) => !x.pali)) {
    const pat = q.title ? new RegExp(q.title, 'i') : null;
    const ids = new Set(q.ids ?? []);
    const n = units.filter((u) => ids.has(u.id) || (q.prefix && u.id.startsWith(q.prefix)) || (pat && pat.test(u.title))).length;
    const chance = 1 - (1 - n / units.length) ** 10;
    expected += chance;
    const row = doc.split(/\r?\n/).find((l) => l.startsWith(`| ${q.query} |`));
    assert.ok(row, `no table row for "${q.query}"`);
    const cell = row.split('|').map((c) => c.trim()).filter(Boolean).at(-1);
    assert.equal(cell, `${(chance * 100).toFixed(1)}%`, q.query);
  }
  assert.ok(doc.includes(`about ${expected.toFixed(2)} hits`), `expected-by-chance total ${expected.toFixed(2)}`);
});

test('deferred: no search_by_meaning module and no embedding data are shipped', () => {
  assert.equal(Object.keys(features).some((k) => /semantic|meaning|embed/i.test(k)), false);
  const data = readdirSync(new URL('server/data/', root));
  assert.equal(data.some((f) => /embed|vector|semantic/i.test(f)), false);
});
