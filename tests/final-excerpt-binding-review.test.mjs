import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { scopeHash } from '../src/translation-scope.mjs';
import { mappingFingerprint } from '../scripts/source-scope-screen.mjs';
import { translationCoverage } from '../src/providers.mjs';
import { dailyText } from '../src/daily.mjs';
import { historicalSutta } from './helpers/daily-epochs.mjs';
import { liveCache } from '../src/cache.mjs';
import { createServer } from '../src/server.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const json = path => JSON.parse(readFileSync(path, 'utf8'));
const review = json('docs/data/final-excerpt-binding-review.json');
const exclusions = json('scripts/canon/reviewed_exclusions.json');
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; liveCache.clear(); });

test('fourteen exact reviewed holds preserve complete indexed roots and all remaining independent ordinary alternatives', () => {
  assert.equal(review.rows.length, 14);
  assert.equal(new Set(review.rows.map(r => r.translation_id)).size, 14);
  assert.equal(review.new_partial_activations, 0);
  for (const row of review.rows) {
    assert.equal(row.decision, 'hold-whole-binding-partial-unit');
    // Independent receipts explicitly use two serializations: MN reviews hash
    // the link itself; SN reviews hash {owner,link}. Neither is a content hash.
    assert.equal(row.owner.startsWith('sn') ? mappingFingerprint(row.owner, row.original_link) : scopeHash(row.original_link), row.link_metadata_sha256);
    const unit = canon.resolve(row.owner).unit;
    for (const root of row.root_units) {
      const actual = canon.resolve(root.id).unit;
      for (const key of ['id', 'title', 'vri', 'book', 'start', 'end']) assert.deepEqual(actual[key], root[key], root.id + ':' + key);
      assert.equal(scopeHash(canon.load().canon.books[actual.book].blocks.slice(actual.start, actual.end)), root.root_blocks_sha256);
    }
    const choices = canon.describe(unit).english.filter(l => !l.translation_scope).map(l => l.translation_id);
    assert.deepEqual(choices, row.remaining_ordinary_alternatives, row.owner);
    for (const id of choices) assert.ok(row.baseline_alternatives.includes(id), 'No invented replacement: ' + id);
    const hold = exclusions.exclusions.find(e => e.source === row.source && e.url === row.url);
    assert.ok(hold, row.translation_id);
    assert.deepEqual(hold.subject_ids, [row.owner]);
    assert.deepEqual(hold.review.root_units, row.root_units);
  }
  assert.equal(canon.describe(canon.resolve('mn54').unit).english.length, 0);
  assert.ok(canon.segments(canon.resolve('mn54').unit).some(s => s.type === 'prose' && s.text.length > 100), 'MN54 Pali remains available offline');
});

test('every held version refuses globally before network access despite partial/shared flags', async () => {
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw Error('Held source fetched'); };
  const key = url => { const u = new URL(url); return u.hostname.replace(/^www\./, '') + u.pathname; };
  for (const row of review.rows) {
    for (const [owner, links] of Object.entries(canon.load().translations)) {
      assert.ok(!links.some(l => key(l.url) === key(row.url)), owner + ':' + row.translation_id);
    }
    assert.throws(() => canon.resolve(row.url), /not linked/);
    for (const flags of [{}, { allow_partial: true }, { allow_shared: true }, { allow_partial: true, allow_shared: true }]) {
      await assert.rejects(english.translation(canon.resolve(row.owner).unit, row.translation_id, flags), /not linked|not available|No English/);
    }
  }
  assert.equal(requests, 0);
});

test('historical exclusions, seven retained reviews and fourteen partial descriptors remain immutable; counts distinguish whole and scoped access', () => {
  assert.equal(scopeHash(canon.load().canon), '1ba8593937abe0284f87e3d8b2a4abd1d732fcc1d6117c36d5a671e968b4d73c', 'No canonical wording, repaired boundaries or saved-position metadata changes');
  assert.equal(exclusions.exclusions.length, 38);
  assert.equal(scopeHash(exclusions.exclusions.slice(0, 24)), '74ea8c7d11dc3de1b97e6cc86d93668577360296507dfcbfb5b4b5ddee4f5c15');
  assert.deepEqual(exclusions.exclusions.slice(24).map(e => [e.source, e.url]).sort(), review.rows.map(r => [r.source, r.url]).sort());
  const retained = json('scripts/canon/retained_ordinary_pages.json');
  assert.equal(retained.rows.length, 7);
  assert.equal(scopeHash(retained), '7a87796d81e4e3917a2e06057cf4a9269a28a3d453d27c6d729e9583a9764e55');
  assert.equal(scopeHash(json('scripts/canon/reviewed_partial_pages.json')), '1386fcdcffbe94a4179c2ed04ecbb5f064ee2598d4f086872865aca74a3ad89e');
  const queue = json('docs/data/ordinary-excerpt-review-queue.json');
  assert.deepEqual([queue.ordinary_ati_bindings_checked, queue.candidate_bindings, queue.reviewed_retained_snapshots, queue.unreviewed_bindings], [1116, 3, 3, 0]);
  assert.ok(queue.rows.every(r => r.review_status === 'reviewed-retained-at-snapshot' && r.approved === false));
  const t = translationCoverage({ refresh: true }).total;
  assert.deepEqual([t.links, t.with_english, t.with_english_including_inherited, t.partial_links, t.partial_only, t.shared_links, t.with_shared_english, t.shared_only], [2542, 1411, 1834, 14, 8, 12, 110, 52]);
  const daily = dailyText({ ...canon }, { date: '2026-11-01', kind: 'sutta' });
  assert.deepEqual([daily.rotation.of, daily.text.id], [1260, 'sn22.121']);
  assert.deepEqual(historicalSutta('d212'), {of:1261,id:'sn55.32'}, 'Old daily eligibility remains test metadata without restoring withdrawn sources');
});

const python = ['python3', 'python'].find(cmd => spawnSync(cmd, ['--version']).status === 0);
test('rendered-web exclusion requires complete primary evidence without invented raw hashes; aliases and fabricated scopes cannot bypass any hold', { skip: !python }, () => {
  const r = spawnSync(python, ['-c', `
import copy,json,sys,tempfile
from pathlib import Path
sys.path.insert(0,'scripts/canon')
from reviewed_exclusions import apply_reviewed_exclusions
sys.stdin.reconfigure(encoding='utf-8')
x=json.load(sys.stdin)
base=x['manifest']
dt=next(e for e in base['exclusions'] if e['source']=='dhammatalks' and e['status']=='withheld-partial-unit')
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'manifest.json'
 def run(manifest, incoming):
  p.write_text(json.dumps(manifest,ensure_ascii=False),encoding='utf-8')
  return apply_reviewed_exclusions(incoming,p)
 incoming={'wrong-owner':[],'independent':[x['alternative']]}
 for row in x['rows']:
  link=copy.deepcopy(row['original_link'])
  link['url']=link['url'].replace('https://www.','https://')+'?synthetic=1#scope'
  link['partial_scope']={'version':1,'status':'reviewed','unit_id':'wrong-owner'}
  incoming['wrong-owner'].append(link)
 before=copy.deepcopy(incoming)
 result,removed=run(base,incoming)
 assert len(removed)==14 and result=={'independent':[x['alternative']]}
 assert incoming==before and run(base,result)==(result,[])
 mutations=[lambda r:r.pop('rendered_view'),lambda r:r.update(rendered_view=None),
  lambda r:r['rendered_view'].update(first_line=1),lambda r:r['rendered_view'].update(last_line=69),
  lambda r:r['rendered_view'].update(total_lines=True),lambda r:r['rendered_view'].update(scripture_lines=[30,72]),
  lambda r:r.pop('root_units'),lambda r:r['root_units'][0].update(id='mn55'),
  lambda r:r['root_units'][0].pop('root_blocks_sha256'),lambda r:r['root_units'][0].update(root_blocks_sha256='bad'),
  lambda r:r.update(source_url='https://www.dhammatalks.org/suttas/MN/MN55.html'),
  lambda r:r.pop('evidence_kind'),lambda r:r.update(vri_commit='bad'),lambda r:r.pop('observed_on'),
  lambda r:r.update(method=' ')]
 for pin in ['source_html_sha256','text_sha256','notice_sha256']:
  mutations.append(lambda r,pin=pin:r.update({pin:'0'*64}))
 for mutate in mutations:
  m=copy.deepcopy(base);target=next(e for e in m['exclusions'] if e['url']==dt['url'])
  mutate(target['review'])
  try:run(m,incoming)
  except ValueError:pass
  else:raise AssertionError('Malformed primary-web evidence accepted')
  assert incoming==before
 print('14 held aliases blocked; 18 malformed web receipts rejected atomically')
`], { input: JSON.stringify({ manifest: exclusions, rows: review.rows, alternative: canon.load().translations.mn21[0] }), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /18 malformed web receipts rejected atomically/);
});

test('D212 MCP retains numbering and provider notes without mutating the provider cache', async () => {
  liveCache.clear();
  let requests = 0;
  globalThis.fetch = async () => { requests++; return new Response('<body><div id="sutta">Synthetic numbering fixture only.</div></body>'); };
  const resolution = canon.resolve('an3.65');
  assert.ok(resolution.notes.length);
  const id = english.available(resolution.unit).find(l => l.translation_id.startsWith('dt:')).translation_id;
  const provider = await english.translation(resolution.unit, id);
  const before = structuredClone(provider);
  const [ct, st] = InMemoryTransport.createLinkedPair(), server = createServer();
  const client = new Client({ name: 'final-excerpt-notes-test', version: '1' }, { capabilities: {} });
  await server.connect(st); await client.connect(ct);
  try {
    const result = await client.callTool({ name: 'get_translation', arguments: { uid: 'an3.65', translation: id } });
    assert.ok(!result.isError, JSON.stringify(result));
    assert.deepEqual(JSON.parse(result.content.find(c => c.type === 'text').text), result.structuredContent);
    assert.deepEqual(result.structuredContent.notes, [...resolution.notes, ...provider.notes]);
    assert.deepEqual(await english.translation(resolution.unit, id), before);
  } finally { await client.close(); }
  assert.equal(requests, 1);
});
