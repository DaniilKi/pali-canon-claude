import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { liveCache } from '../src/cache.mjs';
const manifest = JSON.parse(readFileSync('scripts/canon/reviewed_ati_stories.json', 'utf8'));
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; liveCache.clear(); });

test('source-reviewed whole-text links retain exact edition identity and provenance', () => {
  assert.deepEqual(manifest.links.map(r => r.unit_id), ['pv5', 'vv16', 'vv35', 'thig5.11', 'thig5.11', 'thag19.1', 'snp2.6']);
  for (const row of manifest.links) {
    const u = canon.resolve(row.unit_id).unit;
    const link = canon.load().translations[u.id].find(t => t.match === 'reviewed-story' && t.path === row.path);
    assert.ok(link);
    assert.equal(link.path, row.path);
    assert.equal(link.reference, row.source_reference);
    assert.equal(link.translator, row.translator);
    assert.equal(link.license, row.license);
    assert.equal(u.title, row.pali_title);
    assert.equal(u.vri, row.vri_verses);
    const blocks = canon.load().canon.books[u.book].blocks.slice(u.start, u.end);
    const pali = blocks.filter(b => ['gatha1', 'gatha2', 'gatha3', 'gathalast'].includes(b[0])).map(b => b[2]).join('\n');
    assert.equal(createHash('sha256').update(pali).digest('hex'), row.pali_sha256);
    assert.equal(blocks.filter(b => b[0] === 'hangnum').length, row.evidence.vri_stanzas);
    assert.deepEqual(link.review, { ati_commit: manifest.ati_commit, vri_commit: manifest.vri_commit,
      source_html_sha256: row.source_html_sha256, pali_sha256: row.pali_sha256 });
    const meta = canon.describe(u).english.find(t => t.translation_id === canon.translationId(link));
    assert.equal(meta.mapping_note, row.mapping_note);
    assert.equal(english.available(u).find(t => t.translation_id === meta.translation_id).mapping_note, row.mapping_note);
    assert.match(meta.mapping_note, /not line-by-line/);
    assert.equal(meta.translation_scope, undefined);
  }
});

test('Vv edition offsets and Sesavati/Pesavatī are explicit rather than numerical inference', () => {
  const sirima = english.available(canon.resolve('Vv 16').unit)[0];
  const pesavati = english.available(canon.resolve('Vv 35').unit)[0];
  assert.match(sirima.mapping_note, /136-148.*137–149/);
  assert.match(pesavati.mapping_note, /647-658.*646–657/);
  assert.match(pesavati.mapping_note, /Sesavati.*Pesavatī/);
  assert.equal(english.available(canon.resolve('Vv 34').unit).some(l => l.translation_id.includes('vv.3.07')), false);
});

test('two independent translations of the thirty nuns remain independently selectable', () => {
  const unit = canon.resolve('Thig 5.11').unit;
  const links = canon.linksFor(unit).links;
  assert.equal(links.length, 2);
  assert.equal(english.selectTranslation(links, 'Thanissaro', unit.id).link.path, '/tipitaka/kn/thig/thig.05.11.than');
  assert.equal(english.selectTranslation(links, 'Hecker', unit.id).link.path, '/tipitaka/kn/thig/thig.05.11.hekh');
  for (const link of links) assert.equal(english.selectTranslation(links, canon.translationId(link), unit.id).link, link);
  assert.ok(canon.linksFor(canon.resolve('Thig 5.10').unit).links.every(l => !l.path?.includes('thig.05.11')));
});

test('story retrieval preserves edition notes, full copyright notice and source citation through mirrors', async () => {
  for (const row of manifest.links) {
    const calls = [];
    globalThis.fetch = async url => {
      calls.push(String(url));
      if (['www.accesstoinsight.org', 'accesstoinsight.org'].includes(new URL(url).hostname)) return new Response('', { status: 503 });
      return new Response(`<body><div id='COPYRIGHTED_TEXT_CHUNK'><!-- BEGIN COPYRIGHTED TEXT CHUNK -->Synthetic story fixture.<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) --></div><div id='F_provenance'>Copyright Synthetic Author. Free of charge. Reprinting limit 50. Include full licence.</div><div id='F_citation'>Synthetic source citation.</div></body>`, { status: 200 });
    };
    const u = canon.resolve(row.unit_id).unit;
    const result = await english.translation(u, `ati:${row.path}`);
    assert.equal(result.text_id, row.unit_id);
    assert.match(result.text, /Synthetic story fixture/);
    assert.match(result.license, /Copyright Synthetic Author.*Include full licence/);
    assert.match(result.attribution, /Synthetic source citation/);
    assert.ok(result.notes.includes(row.mapping_note));
    assert.ok(calls.some(url => url.includes('raw.githubusercontent.com/bcbsit/ati')));
    liveCache.clear();
  }
});

const python = ['python3', 'python'].find(cmd => spawnSync(cmd, ['--version']).status === 0);
test('reviewed-link builder checks source drift, scope and conflicts before changing output', { skip: !python }, () => {
  const result = spawnSync(python, ['-c', `
import sys,copy,json,hashlib,tempfile,pathlib
sys.path.insert(0,'scripts/canon')
import reviewed_ati_stories as mod
with tempfile.TemporaryDirectory() as tmp:
 root=pathlib.Path(tmp); (root/'tipitaka/kn/pv').mkdir(parents=True)
 raw=b'<p>Synthetic licensed page</p>'; (root/'tipitaka/kn/pv/fixture.html').write_bytes(raw)
 row={'unit_id':'pv1','path':'/tipitaka/kn/pv/fixture','pali_title':'Fixture','vri_verses':'1',
 'source_html_sha256':hashlib.sha256(raw).hexdigest(),'pali_sha256':hashlib.sha256(b'Synthetic Pali').hexdigest(),
 'english_title':'Fixture','translator':'Synthetic','license':'Synthetic licence','source_reference':'Pv fixture',
 'mapping_note':'Synthetic scope note'}
 manifest={'ati_commit':'test','vri_commit':'test','links':[row]}
 mod.MANIFEST=root/'manifest.json';mod.MANIFEST.write_text(json.dumps(manifest))
 canon={'books':[{'blocks':[['gatha1',None,'Synthetic Pali']]}],
 'units':[{'id':'pv1','book':0,'start':0,'end':1,'title':'Fixture','vri':'1'}]}
 out={}; assert mod.apply_reviewed_links(out,canon,root)==['pv1']; before=copy.deepcopy(out)
 mod.apply_reviewed_links(out,canon,root);assert out==before
 second=copy.deepcopy(row);second['path']='/tipitaka/kn/pv/fixture2';second['translator']='Another synthetic translator'
 (root/'tipitaka/kn/pv/fixture2.html').write_bytes(raw)
 manifest['links'].append(second);mod.MANIFEST.write_text(json.dumps(manifest))
 mod.apply_reviewed_links(out,canon,root);assert len(out['pv1'])==2
 stable=copy.deepcopy(out);mod.apply_reviewed_links(out,canon,root);assert out==stable
 for kind in ['scope','identity','source','conflict','other_owner']:
  c=copy.deepcopy(canon);o=copy.deepcopy(out)
  if kind=='scope': c['books'][0]['blocks'][0][2]='Different'
  if kind=='identity': c['units'][0]['title']='Wrong'
  if kind=='source': (root/'tipitaka/kn/pv/fixture.html').write_bytes(b'Changed')
  if kind=='conflict': o['pv1'][0]['url']='https://www.accesstoinsight.org/other.html'
  if kind=='other_owner': o['pv2']=[copy.deepcopy(o['pv1'][0])]
  frozen=copy.deepcopy(o)
  try: mod.apply_reviewed_links(o,c,root)
  except ValueError: pass
  else: raise AssertionError(kind)
  assert o==frozen
  (root/'tipitaka/kn/pv/fixture.html').write_bytes(raw)
`], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
