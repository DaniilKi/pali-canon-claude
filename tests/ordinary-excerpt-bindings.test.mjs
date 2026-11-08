import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { scopeHash } from '../src/translation-scope.mjs';
import { mappingFingerprint, scopeScreen } from '../scripts/source-scope-screen.mjs';
import { translationCoverage } from '../src/providers.mjs';
import { dailyText } from '../src/daily.mjs';
const review = JSON.parse(readFileSync('docs/data/ordinary-excerpt-bindings-review.json', 'utf8'));
const retained = JSON.parse(readFileSync('scripts/canon/retained_ordinary_pages.json', 'utf8'));
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const holds = review.rows.filter(r => r.decision !== 'retain');
const keep = review.rows.filter(r => r.decision === 'retain');

function rootFor(row) { return row.root || row.root_units[0]; }

test('eight reviewed bindings preserve their exact Pali roots and source evidence while distinguishing two valid whole versions', () => {
  assert.equal(review.rows.length, 8); assert.equal(holds.length, 6); assert.equal(keep.length, 2);
  assert.deepEqual(keep.map(r => r.owner).sort(), ['an3.35', 'thig3.5']);
  for (const row of review.rows) {
    const unit = canon.resolve(row.owner).unit, root = rootFor(row);
    assert.equal(mappingFingerprint(row.owner, row.original_link), row.link_metadata_sha256);
    assert.deepEqual(Object.fromEntries(['id', 'title', 'vri', 'book', 'start', 'end'].map(k => [k, unit[k]])), Object.fromEntries(['id', 'title', 'vri', 'book', 'start', 'end'].map(k => [k, root[k]])));
    assert.equal(scopeHash(canon.load().canon.books[unit.book].blocks.slice(unit.start, unit.end)), root.root_blocks_sha256);
    for (const name of ['source_html_sha256', 'text_sha256', 'notice_sha256']) assert.match(row[name], /^[a-f0-9]{64}$/, row.owner + ': ' + name);
    const choices = canon.describe(unit).english.filter(l => !l.translation_scope);
    assert.deepEqual(choices.filter(l => l.translation_id !== 'ati:' + row.path).map(l => l.translation_id), row.merged_ordinary_alternatives);
    if (row.decision === 'retain') {
      const actual = canon.load().translations[unit.id].find(l => l.path === row.path);
      assert.deepEqual(actual, row.original_link);
      assert.equal(mappingFingerprint(unit.id, actual), row.link_metadata_sha256);
      assert.ok(choices.some(l => l.translation_id === 'ati:' + row.path));
    } else {
      assert.deepEqual(choices.map(l => l.translation_id), row.merged_ordinary_alternatives);
      assert.ok(choices.length, row.owner + ': independent whole version retained');
    }
  }
  // Publisher numbering/chapter labels do not override complete-body review.
  assert.equal(canon.resolve('an3.35').unit.vri, '35');
  assert.equal(keep.find(r => r.owner === 'an3.35').path, '/tipitaka/an/an03/an03.034.than');
  assert.equal(canon.resolve('thig3.5').unit.vri, '51–53');
  assert.equal(canon.segments(canon.resolve('thig3.5').unit).filter(s => s.type === 'verse').length, 3);
});

test('six exact held bindings are absent globally and cannot fetch even when scope flags are supplied', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw Error('Held version must refuse before provider access'); };
  for (const row of holds) {
    const uid = row.owner, unit = canon.resolve(uid).unit, id = 'ati:' + row.path;
    for (const [owner, links] of Object.entries(canon.load().translations)) {
      assert.ok(!links.some(l => l.path === row.path || l.url?.replace('https://www.', 'https://') === row.original_link.url.replace('https://www.', 'https://')), `${owner}: held binding leaked`);
    }
    assert.throws(() => canon.resolve(row.original_link.url), /not linked/);
    for (const flags of [{}, { allow_partial: true }, { allow_shared: true }, { allow_partial: true, allow_shared: true }]) {
      await assert.rejects(english.translation(unit, id, flags), /not linked|not available|No English/);
    }
  }
  assert.equal(calls, 0);
});

test('shared retained-source registry preserves the five historical reviews and scopes new annotations to exact current identities', () => {
  const historical = JSON.parse(readFileSync('docs/data/verse-scope-review.json', 'utf8')).rows.filter(r => r.decision === 'retain');
  assert.equal(historical.length, 5); assert.deepEqual(retained.rows.slice(0, 5), historical);
  assert.equal(retained.rows.length, 7);
  assert.deepEqual(retained.rows.slice(5), keep);
  const d = canon.load();
  const current = scopeScreen(d, { review: retained });
  const selected = current.rows.find(r => r.owner === 'thig3.5' && r.translation_id === 'ati:/tipitaka/kn/thig/thig.03.05.than');
  assert.equal(selected.review_status, 'reviewed-retained-at-snapshot');
  for (const field of ['title', 'vri']) {
    const byId = new Map(d.byId);
    byId.set('thig3.5', { ...byId.get('thig3.5'), [field]: 'Synthetic metadata drift, source blocks unchanged' });
    const result = scopeScreen({ ...d, byId }, { review: retained });
    assert.equal(result.rows.find(r => r.owner === selected.owner && r.translation_id === selected.translation_id).review_status, 'stale-reviewed-snapshot');
  }
  const cli = spawnSync(process.execPath, ['scripts/source-scope-screen.mjs'], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout), current);
  assert.match(readFileSync('scripts/canon/ordinary_excerpt_packet.py', 'utf8'), /Path\(__file__\)\.with_name\('retained_ordinary_pages\.json'\)/);
});

test('withholding alternative versions does not alter complete coverage, partial/shared availability or the current daily pool', () => {
  const t = translationCoverage({ refresh: true }).total;
  assert.deepEqual([t.links, t.with_english, t.with_english_including_inherited, t.partial_links, t.partial_only], [2556, 1412, 1835, 14, 8]);
  assert.deepEqual([t.shared_links, t.with_shared_english, t.shared_only], [12, 110, 52]);
  const daily = dailyText({ ...canon }, { date: '2026-11-01', kind: 'sutta' });
  assert.deepEqual([daily.rotation.of, daily.text.id], [1261, 'sn55.32']);
});

const python = ['python3', 'python'].find(cmd => spawnSync(cmd, ['--version']).status === 0);
test('global exclusions reject held URL aliases under a wrong owner and fabricated scope while preserving an independent version', { skip: !python }, () => {
  const alternative = canon.load().translations[holds[0].owner].find(l => !l.partial_scope && !l.shared_scope);
  const r = spawnSync(python, ['-c', `
import copy,json,sys
sys.path.insert(0,'scripts/canon')
from reviewed_exclusions import apply_reviewed_exclusions
sys.stdin.reconfigure(encoding='utf-8')
x=json.load(sys.stdin)
links=[]
for row in x['rows']:
 link=copy.deepcopy(row['original_link'])
 link['url']=link['url'].replace('https://www.','https://')+'?synthetic=1#scope'
 link['partial_scope']={'version':1,'status':'reviewed','unit_id':'synthetic-wrong-owner'}
 links.append(link)
original={'synthetic-wrong-owner':links,'independent':[x['alternative']]}
before=copy.deepcopy(original)
result,removed=apply_reviewed_exclusions(original)
assert original==before
assert len(removed)==6 and result=={'independent':[x['alternative']]}
assert apply_reviewed_exclusions(result)==(result,[])
print('all six alias/scope bypasses blocked without mutating input or independent source')
`], { input: JSON.stringify({ rows: holds, alternative }), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /all six alias\/scope bypasses blocked/);
});
