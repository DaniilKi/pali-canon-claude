import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { atiPartialExcerpt } from '../src/ati-excerpt.mjs';
import { partialScope, scopeHash } from '../src/translation-scope.mjs';
import { reviewedPartialLink, assertRegisteredPartial } from '../src/partial-source-registry.mjs';
import { scopeDescriptor } from '../web/translation-policy.mjs';
import { translationCoverage } from '../src/providers.mjs';
import { historicalSutta } from './helpers/daily-epochs.mjs';
const report = JSON.parse(readFileSync('docs/data/walshe-excerpt-batch.json', 'utf8'));
const registry = JSON.parse(readFileSync('scripts/canon/reviewed_partial_pages.json', 'utf8'));
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const begin = '<!-- BEGIN COPYRIGHTED TEXT CHUNK -->';
const end = '<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->';
const profiles = [
  ['ati-chapter-p2-of2-v1', 2, 2, ''],
  ['ati-chapter-p11-of11-v1', 11, 11, '<h4>Seeing the Dhamma</h4>'],
  ['ati-chapter-p1-of4-v1', 4, 1, ''],
];
function paragraphFixture(total, heading = '') {
  const ps = Array.from({ length: total }, (_, i) => `<p>Synthetic paragraph ${i + 1}.<a class='noteTag'>[${i + 1}]</a></p>`);
  return `${begin}<div class="chapter">${heading}${ps.join('')}<div class='notes'><h1>Notes</h1><dl><dd>Synthetic editorial note, never scripture.</dd></dl></div></div>${end}`;
}

test('finite paragraph selectors select only the intended paragraph and refuse source structure drift', () => {
  for (const [selector, total, selected, heading] of profiles) {
    const html = paragraphFixture(total, heading);
    assert.equal(atiPartialExcerpt(html, selector), `Synthetic paragraph ${selected}.`);
    const variants = [
      html.replace("<div class='notes'>", "<p>Extra synthetic paragraph.</p><div class='notes'>"),
      html.replace(/<p>[^]*?<\/p>/, ''),
      html.replace('<p>', '<p><script>Synthetic unsafe markup</script>'),
      html.replace('<p>', '<p><style>synthetic{}</style>'),
      html.replace('<div class="chapter">', '<div class="chapter"></div><div class="chapter">'),
      html.replace("class='notes'", "class='unknown'"),
      html.replace("<div class='notes'>", "<div class='notes'></div><div class='notes'>"),
      html.replace('<p>', '<pre>Synthetic unexpected pre</pre><p>'),
      html + html,
      heading ? html.replace(heading, '<h4>Changed heading</h4>') : html.replace('<p>', '<h4>Unexpected heading</h4><p>'),
    ];
    for (const [i, changed] of variants.entries()) {
      assert.throws(() => atiPartialExcerpt(changed, selector), /extraction structure changed/, `${selector}: drift ${i}`);
    }
  }
  assert.throws(() => atiPartialExcerpt(paragraphFixture(2), 'ati-chapter-p3-of2-v1'), /Unsupported/);
});

test('preformatted verse extraction excludes external editorial links and refuses duplicate or nested source structure', () => {
  const html = `${begin}<div class='chapter'><div class="excerpt verse"><pre>Synthetic verse one.\nSynthetic verse two.</pre></div><div class='seeAlso'><p>Synthetic editorial links.</p></div></div>${end}`;
  assert.equal(atiPartialExcerpt(html, 'ati-excerpt-verse-pre-v1'), 'Synthetic verse one.\nSynthetic verse two.');
  const variants = [
    html.replace('</pre>', '</pre><pre>Another synthetic verse.</pre>'),
    html.replace('<pre>', '<pre><script>Synthetic unsafe markup</script>'),
    html.replace('<pre>', '<pre><div>Synthetic nested note</div>'),
    html.replace('<pre>', '<pre><p>Synthetic paragraph</p>'),
    html.replace('excerpt verse', 'freeverse'),
    html.replace('<pre>Synthetic verse one.\nSynthetic verse two.</pre>', '<pre>   </pre>'),
    html.replace('<div class="excerpt verse">', '<div class="excerpt verse"></div><div class="excerpt verse">'),
    html.replace("<div class='chapter'>", "<div class='chapter'></div><div class='chapter'>"),
    html + html,
  ];
  for (const [i, changed] of variants.entries()) assert.throws(() => atiPartialExcerpt(changed, 'ati-excerpt-verse-pre-v1'), /extraction structure changed/, `preformatted drift ${i}`);
});

test('four actual source declarations preserve exact reviewed Pali, complete notice pins and partial-only availability', async () => {
  assert.equal(report.rows.length, 4);
  assert.equal(canon.source().commit, report.vri_commit);
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw Error('No provider request without explicit partial consent'); };
  const expected = {
    'sn12.60': ['sn12.60/3', 'sn12.60/3', 1, 402],
    'sn22.87': ['sn22.87/4', 'sn22.87/4', 1, 185],
    'sn35.244': ['sn35.244/2', 'sn35.244/2', 1, 511],
    'sn56.22': ['sn56.22/5', 'sn56.22/8', 4, 610],
  };
  for (const row of report.rows) {
    const r = row.manifest, u = canon.resolve(row.owner).unit;
    assert.deepEqual(registry.links.find(x => x.unit_id === row.owner), r);
    assert.equal(scopeHash(canon.load().canon.books[u.book].blocks.slice(u.start, u.end)), r.root.root_blocks_sha256);
    const meta = canon.describe(u), id = 'ati:' + r.path, choice = meta.english.find(x => x.translation_id === id);
    assert.ok(choice);
    assert.deepEqual(row.merged_ordinary_alternatives, []);
    assert.deepEqual(meta.english.filter(x => !x.translation_scope).map(x => x.translation_id), row.merged_ordinary_alternatives);
    assert.equal(meta.english_available, 0); assert.equal(meta.partial_english_available, 1);
    const s = choice.translation_scope;
    assert.deepEqual([s.first_ref, s.last_ref, s.pali_segments, row.selected_english_characters], expected[row.owner]);
    assert.equal(s.version, 1); assert.equal(s.whole_unit_coverage, false);
    assert.equal(s.text_sha256, r.partial_scope.text_sha256); assert.equal(s.notice_sha256, r.partial_scope.notice_sha256);
    assert.match(s.notice_sha256, /^[a-f0-9]{64}$/); assert.equal(r.license, 'BPS-free-distribution-1985');
    assert.equal(choice.translator, "Maurice O'Connell Walshe");
    assert.match(r.mapping_note, /Derived excerpt/); assert.match(r.mapping_note, /identified derivatives/); assert.match(r.mapping_note, /50-copy/);
    assert.equal(scopeDescriptor(choice, u.id).flags.allow_partial, true);
    await assert.rejects(english.translation(u), /Only partial/);
    await assert.rejects(english.translation(u, id), /partial unit/);
    const registered = reviewedPartialLink(r, registry);
    assert.doesNotThrow(() => assertRegisteredPartial(registered, u, registry));
    for (const mutate of [x => { delete x.partial_scope; }, x => { x.partial_scope.extractor = 'ati-freeverse-v1'; }, x => { x.partial_scope.notice_sha256 = '0'.repeat(64); }]) {
      const bad = structuredClone(registered); mutate(bad);
      assert.throws(() => assertRegisteredPartial(bad, u, registry), /lost or changed/);
    }
  }
  assert.equal(requests, 0);
  const colophon = report.rows.find(r => r.owner === 'sn56.22').manifest;
  assert.match(colophon.mapping_note, /untranslated inline colophon/);
  assert.match(colophon.mapping_note, /not translated/);
  assert.match(canon.segments(canon.resolve('sn56.22').unit).at(-1).text, /dutiyaṃ;$/);
  assert.match(report.rows.find(r => r.owner === 'sn35.244').manifest.source_reference, /publisher SN35.203.*SN35.244/);
  const t = translationCoverage({ refresh: true }).total;
  assert.deepEqual([t.links, t.with_english, t.with_english_including_inherited, t.partial_links, t.partial_only], [2538, 1408, 1831, 18, 12]);
  assert.deepEqual(historicalSutta('d209'), { of: 1265, id: 'dn32' });
});

// Independently captured from the actual e24a1eb implementation in the second
// checkout. Hashes retain the regression without requiring that local checkout
// or publisher bodies in CI.
const baselineDescriptors = [
  ['thag17.3', '0b26befec244d141ffcd1628f208e8d5b43f318638f6e20f8397e34547b4cb67'],
  ['thag6.13', '10092363c33ed636624fc9f15b980dda9b408d0a23ee8439285164621e044453'],
  ['thag10.1', 'ef035d8e1046c0a5d2da9e855ddab765e279656700935084e793ef4d9eb018f2'],
  ['thag15.2', 'ce4cf547c73b97e412e5a7c20830e94e9102377a5c18f1dae88a1a1ca1de9259'],
  ['thag16.8', '932244a4263a2f4f56ab4fd607c581314d3b16dea79ca221be745959836b2c09'],
  ['thag2.13', 'eaf8e6e3a5fe4cbce50eeb6d85d2c610a715bfb4cf9aaa38f466b84c63383718'],
  ['thag15.1', '7b18d25a1a2fd7d3d0b67b3d8589d99ead25cc33770b4d799c2280bbecc7b5e1'],
  ['snp3.11', '43142a543768b0038588370e4f7e238524a70f23538d58aa9cb8f272084812c1'],
  ['mn34', '45272e82eae61414226d7cb9efcafde459abe424af8ae41413707c0783dca9bb'],
  ['sn12.22', 'ca590e4ec14b2d2c5a1aaaa3494cbbf7d4b3a46b5696b4c6011539fd665acbf9'],
];
function currentPreviousScopes() {
  assert.equal(report.previous_partial_rows_count, 10);
  assert.equal(scopeHash(registry.links.slice(0, 10)), report.previous_partial_manifest_rows_sha256);
  return baselineDescriptors.map(([id, hash]) => {
    const row = registry.links.find(x => x.unit_id === id), u = canon.resolve(id).unit;
    const link = reviewedPartialLink(row, registry), args = [link, u, canon.segments(u), canon.source()];
    const scope = partialScope(...args);
    assert.equal(scopeHash(scope), hash, id);
    return { id, args, scope };
  });
}

test('all ten previous descriptors retain the independently frozen source-scope contract', () => { currentPreviousScopes(); });
const previousRoot = process.env.PALI_PREVIOUS_SCOPE_ROOT || '/workspace/pali-outage-diagnostics';
const previousModule = previousRoot + '/src/translation-scope.mjs';
const previousHead = existsSync(previousModule) ? spawnSync('git', ['-C', previousRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }) : null;
const baselineAvailable = previousHead?.status === 0 && previousHead.stdout.trim() === report.baseline_commit;
test('all ten previous descriptors equal the independently loaded e24a1eb implementation', { skip: !baselineAvailable && 'Exact baseline checkout unavailable or advanced; frozen descriptor hashes remain mandatory' }, async () => {
  assert.equal(previousHead.stdout.trim(), report.baseline_commit);
  const previous = await import(pathToFileURL(previousModule));
  for (const { id, args, scope } of currentPreviousScopes()) assert.deepEqual(scope, previous.partialScope(...args), id);
});

const python = ['python3', 'python'].find(cmd => spawnSync(cmd, ['--version']).status === 0);
test('manifest profiles reject selector/subject/path/version drift before source activation', { skip: !python }, () => {
  const r = spawnSync(python, ['-c', `
import copy,json,pathlib,sys,tempfile
sys.path.insert(0,'scripts/canon')
from reviewed_partial_pages import manifest_rows
sys.stdin.reconfigure(encoding='utf-8')
m=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as tmp:
 path=pathlib.Path(tmp)/'metadata.json'
 for row in m['links']:
  for case in ['subject','selector','version','path','license']:
   x=copy.deepcopy(row)
   if case=='subject':x['unit_id']=x['root']['id']=x['partial_scope']['unit_id']='sn12.61'
   if case=='selector':x['partial_scope']['extractor']='ati-freeverse-v1'
   if case=='version':x['partial_scope']['version']=2
   if case=='path':x['path']='/tipitaka/sn/sn12/unapproved-synthetic.wlsh'
   if case=='license':x['license']='CC-BY'
   data={k:v for k,v in m.items() if k!='links'};data['links']=[x]
   path.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
   try:manifest_rows(path)
   except ValueError:pass
   else:raise AssertionError((row['unit_id'],case))
print('20 exact profile refusal cases passed')
`], { input: JSON.stringify({ ...registry, links: report.rows.map(r => r.manifest) }), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /20 exact profile refusal cases passed/);
});
