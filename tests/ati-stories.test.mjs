import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { liveCache } from '../src/cache.mjs';
import { partialScope, scopeHash } from '../src/translation-scope.mjs';
const manifest = JSON.parse(readFileSync('scripts/canon/reviewed_ati_stories.json', 'utf8'));
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; liveCache.clear(); });

test('source-reviewed whole-text links retain exact edition identity and provenance', () => {
  assert.deepEqual(manifest.links.map(r => r.unit_id), ['pv5', 'vv16', 'vv35', 'thig5.11', 'thig5.11', 'thag19.1', 'snp2.6', 'thag3.9', 'thag21.1', 'sn1.42', 'sn4.8', 'sn17.5', 'sn3.7', 'sn9.11', 'sn1.3', 'sn12.16', 'sn7.21', 'sn22.109', 'sn22.110', 'sn22.121', 'sn25.5', 'sn47.35', 'sn40.9', 'sn22.7', 'sn35.238', 'sn55.24', 'an4.77', 'an3.136', 'an5.130', 'an3.52', 'an3.89', 'an3.90', 'an4.262', 'an5.64', 'an6.102', 'an6.104', 'an7.23', 'an7.33', 'an7.51', 'an3.109', 'an4.124', 'an4.173', 'an11.9', 'an2.9', 'an2.19', 'an2.24', 'an3.39', 'an3.86', 'an3.87', 'an10.13', 'an1.47', 'an1.48', 'an2.119', 'an10.219', 'sn1.71', 'sn17.5', 'an7.54', 'an2.9']);
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
    if (row.path.startsWith('/tipitaka/sn/') || row.path.startsWith('/tipitaka/an/')) assert.match(row.root_blocks_sha256, /^[a-f0-9]{64}$/);
    if (row.root_blocks_sha256) assert.equal(createHash('sha256').update(JSON.stringify(blocks)).digest('hex'), row.root_blocks_sha256);
    assert.equal(blocks.filter(b => b[0] === 'hangnum').length, row.evidence.vri_stanzas ?? row.evidence.vri_numbered_paragraphs);
    if (row.evidence.vri_verse_groups) assert.equal(blocks.filter(b => b[0] === 'gathalast').length, row.evidence.vri_verse_groups);
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

test('Yasoja is linked to the corrected poem, never the differently numbered Vassika', async () => {
  const id = 'ati:/tipitaka/kn/thag/thag.03.08.than';
  const source = english.available(canon.resolve('Thag 3.9').unit).find(l => l.translation_id === id);
  assert.ok(source);
  assert.equal(canon.resolve('https://www.accesstoinsight.org/tipitaka/kn/thag/thag.03.08.than.html').unit.id, 'thag3.9');
  assert.equal(canon.resolve('https://www.accesstoinsight.org/tipitaka/kn/thag/thag.21.00.irel.html').unit.id, 'thag21.1');
  assert.match(source.mapping_note, /ATI calls Yasoja Thag 3.8.*Thag 3.9/);
  assert.equal(english.available(canon.resolve('Thag 3.8').unit).some(l => l.translation_id === id), false);
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw Error('Must not fetch'); };
  await assert.rejects(english.translation(canon.resolve('Thag 3.8').unit, id));
  assert.equal(calls, 0);
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
test('source verse scopes expand explicit combined labels but reject omissions and repeats', { skip: !python }, () => {
  const r = spawnSync(python, ['-c', `
import sys
sys.path.insert(0,'scripts/canon')
from reviewed_ati_stories import check_numbered_verses
def source(labels):return ('<!-- BEGIN COPYRIGHTED TEXT CHUNK -->'+''.join('<small><a id="verse-'+str(a)+'">'+str(a)+'</a>'+('-'+str(b) if b else '')+'.</small>' for a,b in labels)+'<!-- #COPYRIGHTED_TEXT_CHUNK -->').encode()
check_numbered_verses(source([(1234,None),(1235,36),(1237,None)]),1234,1237)
for labels in [[(1234,None),(1235,None),(1237,None)],[(1234,None),(1234,None),(1235,37)],[(1234,None),(1235,38)]]:
 try:check_numbered_verses(source(labels),1234,1237)
 except ValueError:pass
 else:raise AssertionError(labels)
`], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

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
 row['root_blocks_sha256']=hashlib.sha256(json.dumps(canon['books'][0]['blocks'],ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
 mod.MANIFEST.write_text(json.dumps(manifest))
 out={}; assert mod.apply_reviewed_links(out,canon,root)==['pv1']; before=copy.deepcopy(out)
 mod.apply_reviewed_links(out,canon,root);assert out==before
 second=copy.deepcopy(row);second['path']='/tipitaka/kn/pv/fixture2';second['translator']='Another synthetic translator'
 (root/'tipitaka/kn/pv/fixture2.html').write_bytes(raw)
 manifest['links'].append(second);mod.MANIFEST.write_text(json.dumps(manifest))
 mod.apply_reviewed_links(out,canon,root);assert len(out['pv1'])==2
 stable=copy.deepcopy(out);mod.apply_reviewed_links(out,canon,root);assert out==stable
 for kind in ['scope','unhashed_block','identity','source','conflict','other_owner']:
  c=copy.deepcopy(canon);o=copy.deepcopy(out)
  if kind=='scope': c['books'][0]['blocks'][0][2]='Different'
  if kind=='unhashed_block': c['books'][0]['blocks'].insert(0,['subhead',None,'Injected heading']);c['units'][0]['end']=2
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

test('Kindada gains a complete first English choice, without linking its neighbours', () => {
  const id = 'ati:/tipitaka/sn/sn01/sn01.042.than';
  const links = english.available(canon.resolve('SN 1.42').unit);
  assert.equal(links.length, 1);
  assert.equal(links[0].translation_id, id);
  assert.match(links[0].mapping_note, /food, clothing, vehicle, lamp, residence and Dhamma/);
  assert.equal(canon.resolve('https://www.accesstoinsight.org/tipitaka/sn/sn01/sn01.042.than.html').unit.id, 'sn1.42');
  for (const uid of ['sn1.41', 'sn1.43']) assert.ok(english.available(canon.resolve(uid).unit).every(l => l.translation_id !== id));
});

test('reviewed SN choices distinguish repeated verses and preserve abbreviation cautions', async () => {
  const cases = [['sn4.8', '/tipitaka/sn/sn04/sn04.008.than', /Mara.*SN 1.12/],
    ['sn17.5', '/tipitaka/sn/sn17/sn17.005.than', /VRI abbreviates.*SN 17.1/],
    ['sn3.7', '/tipitaka/sn/sn03/sn03.007.than', /VRI abbreviates.*ATI spells it out/]];
  for (const [uid, path, note] of cases) {
    const links = english.available(canon.resolve(uid).unit).filter(l => l.translation_id === `ati:${path}`);
    assert.equal(links.length, 1);
    assert.equal(links[0].translation_id, `ati:${path}`);
    assert.match(links[0].mapping_note, note);
    assert.equal(canon.resolve(`https://www.accesstoinsight.org${path}.html`).unit.id, uid);
  }
  const id = 'ati:/tipitaka/sn/sn04/sn04.008.than';
  assert.ok(english.available(canon.resolve('sn1.12').unit).every(l => l.translation_id !== id));
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw Error('Must not fetch'); };
  await assert.rejects(english.translation(canon.resolve('sn1.12').unit, id));
  assert.equal(calls, 0);
  const u = canon.resolve('sn17.5').unit;
  const blocks = canon.load().canon.books[u.book].blocks.slice(u.start, u.end);
  assert.match(blocks.map(b => b[2]).join(' '), /…pe…/);
  assert.equal(blocks.filter(b => ['gatha1', 'gatha2', 'gatha3', 'gathalast'].includes(b[0])).length, 0);
});

test('SN source review refuses a verse-only scope even if its verse hash matches', { skip: !python }, () => {
  const result = spawnSync(python, ['-c', `
import sys,json,hashlib,tempfile,pathlib
sys.path.insert(0,'scripts/canon')
import reviewed_ati_stories as m
with tempfile.TemporaryDirectory() as tmp:
 root=pathlib.Path(tmp);(root/'tipitaka/sn/sn17').mkdir(parents=True)
 raw=b'Synthetic source with licence';(root/'tipitaka/sn/sn17/fixture.html').write_bytes(raw)
 blocks=[['bodytext',None,'Synthetic prose']]
 row={'unit_id':'sn17.1','path':'/tipitaka/sn/sn17/fixture','pali_title':'Fixture','vri_verses':'1','pali_sha256':hashlib.sha256(b'').hexdigest(),'source_html_sha256':hashlib.sha256(raw).hexdigest(),'english_title':'Fixture','translator':'Synthetic','license':'Synthetic','source_reference':'SN fixture','mapping_note':'Synthetic note'}
 manifest={'ati_commit':'test','vri_commit':'test','links':[row]};m.MANIFEST=root/'manifest.json'
 c={'books':[{'blocks':blocks}],'units':[{'id':'sn17.1','book':0,'start':0,'end':1,'title':'Fixture','vri':'1'}]}
 m.MANIFEST.write_text(json.dumps(manifest))
 try:m.reviewed_links(c,root)
 except ValueError as e:assert 'complete root block' in str(e)
 else:raise AssertionError('verse-only SN scope accepted')
 row['root_blocks_sha256']=hashlib.sha256(json.dumps(blocks,ensure_ascii=False,separators=(',',':')).encode()).hexdigest();m.MANIFEST.write_text(json.dumps(manifest))
 assert 'sn17.1' in m.reviewed_links(c,root)
 c['books'][0]['blocks'][0][2]='Different prose with same empty verse hash'
 try:m.reviewed_links(c,root)
 except ValueError as e:assert 'Complete root scope changed' in str(e)
 else:raise AssertionError('prose drift accepted')
`], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('expanded introductions and condensed repetitions remain explicit, with wrong-discourse selection refused', async () => {
  const cases = [['sn9.11','sn09/sn09.011.than', /different titles.*See also/s],
    ['sn1.3','sn01/sn01.003.wlsh', /note 1.*SN 1.1.*numbered Notes/s],
    ['sn12.16','sn12/sn12.016.wlsh', /repetitions condensed.*SN 22.115.*bracketed summary.*numbered Notes/s]];
  for (const [uid,path,note] of cases) {
    const links = english.available(canon.resolve(uid).unit);
    assert.equal(links.length, 1);
    assert.equal(links[0].translation_id, `ati:/tipitaka/sn/${path}`);
    assert.match(links[0].mapping_note, note);
    assert.equal(canon.resolve(`https://www.accesstoinsight.org/tipitaka/sn/${path}.html`).unit.id, uid);
  }
  let calls=0;
  globalThis.fetch=async()=>{ calls++; throw Error('Must not fetch'); };
  for (const [uid,id] of [['sn1.1','ati:/tipitaka/sn/sn01/sn01.003.wlsh'],['sn22.115','ati:/tipitaka/sn/sn12/sn12.016.wlsh']]) {
    assert.ok(english.available(canon.resolve(uid).unit).every(l=>l.translation_id!==id));
    await assert.rejects(english.translation(canon.resolve(uid).unit,id));
  }
  assert.equal(calls,0);
});

test('paired attainment editions retain their distinct endings and do not splice another page', async()=>{
 const a=english.available(canon.resolve('sn22.109').unit)[0];
 const b=english.available(canon.resolve('sn22.110').unit)[0];
 assert.match(a.translation_id,/sn22\.109\.wlsh$/);assert.match(b.translation_id,/sn22\.110\.wlsh$/);
 assert.match(a.mapping_note,/stream-enterer.*SN 22.110/);
 assert.match(b.mapping_note,/As above.*does not silently fetch or splice.*fully expanded standalone opening/);
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch');};
 await assert.rejects(english.translation(canon.resolve('sn22.109').unit,b.translation_id));
 await assert.rejects(english.translation(canon.resolve('sn22.110').unit,a.translation_id));
 await assert.rejects(english.translation(canon.resolve('sn1.25').unit,b.translation_id));
 assert.equal(calls,0);
 for(const [uid,re] of [['sn7.21',/stage directions.*Note/],['sn22.121',/desire-passion.*…pe…/],['sn25.5',/six contacts.*SN 25.1/],['sn47.35',/feelings, thoughts and perceptions/]]){
  const choices=english.available(canon.resolve(uid).unit);assert.equal(choices.length,1);assert.match(choices[0].mapping_note,re);
 }
});

test('an editorial reference to a shared opening never fetches or splices the other translation',async()=>{
 const calls=[];
 globalThis.fetch=async url=>{
  calls.push(String(url));assert.match(String(url),/sn22\.110\.wlsh/);
  return new Response(`<body><div><!-- BEGIN COPYRIGHTED TEXT CHUNK -->[As above (in <a href="sn22.109.wlsh.html">SN 22.109</a>)] Synthetic arahant ending.<h2>Notes</h2>Editorial explanation.<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) --></div><div id="F_provenance">Synthetic licence.</div><div id="F_citation">Synthetic citation.</div></body>`,{status:200});
 };
 const out=await english.translation(canon.resolve('sn22.110').unit,'ati:/tipitaka/sn/sn22/sn22.110.wlsh');
 assert.match(out.text,/As above.*SN 22.109.*Synthetic arahant ending/s);
 assert.match(out.notes.join(' '),/does not silently fetch or splice/);
 assert.equal(out.next_offset,null);assert.ok(calls.length>0);
 assert.ok(calls.every(url=>!url.includes('sn22.109')));
});

test('reviewed edition-number differences never attach the source to the numerically named unit',async()=>{
 const cases=[['sn35.238','sn35.197','ati:/tipitaka/sn/sn35/sn35.197.than'],['an3.136','an3.134','ati:/tipitaka/an/an03/an03.134.than']];
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch');};
 for(const [right,wrong,id] of cases){
  const source=english.available(canon.resolve(right).unit).find(x=>x.translation_id===id);assert.ok(source);
  assert.match(source.mapping_note,/edition numbering.*no general|edition numbering.*not a general/s);
  const url='https://www.accesstoinsight.org'+id.slice(4)+'.html';assert.equal(canon.resolve(url).unit.id,right);
  assert.ok(english.available(canon.resolve(wrong).unit).every(x=>x.translation_id!==id));
  await assert.rejects(english.translation(canon.resolve(wrong).unit,id));
 }
 assert.equal(calls,0);
});

test('earlier-concentration preface is editorial, and the shorter Ananda source has no whole approval beyond its exact partial prefix',async()=>{
 const id='ati:/tipitaka/sn/sn40/sn40.009.wlsh';
 const source=english.available(canon.resolve('sn40.9').unit).find(x=>x.translation_id===id);assert.ok(source);
 assert.match(source.mapping_note,/earlier eight discourses.*not translated here.*eight numbered Notes/s);
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch');};
 for(const uid of ['sn40.1','sn40.8']){
  assert.ok(english.available(canon.resolve(uid).unit).every(x=>x.translation_id!==id));
  await assert.rejects(english.translation(canon.resolve(uid).unit,id));
 }
 assert.equal(calls,0);
 const held='/tipitaka/sn/sn36/sn36.015.nypo';
 assert.ok(manifest.links.every(r=>r.path!==held));
 const unit=canon.resolve('sn36.15').unit,meta=canon.describe(unit),partial=english.available(unit).find(x=>x.translation_id===`ati:${held}`);
 assert.ok(partial);assert.equal(meta.english_available,0);assert.equal(meta.partial_english_available,1);
 const scope=partial.translation_scope;
 assert.equal(scope.kind,'partial_unit');assert.equal(scope.version,2);assert.equal(scope.whole_unit_coverage,false);
 assert.deepEqual([scope.first_ref,scope.last_ref,scope.pali_excerpt.start_char,scope.pali_excerpt.end_char],['sn36.15/2','sn36.15/2',0,794]);
 assert.equal(scope.pali_excerpt.text,canon.segments(unit).find(s=>s.ref==='sn36.15/2').text.slice(0,794));
 assert.doesNotMatch(scope.pali_excerpt.text,/anupubbasaṅkhārānaṃ (nirodho|vūpasamo|paṭippassaddhi)/);
 assert.equal(scope.read_with,undefined);assert.equal(scope.read_pages,undefined);
 await assert.rejects(english.translation(unit),/Only partial/);
 await assert.rejects(english.translation(unit,`ati:${held}`),/partial/);
 await assert.rejects(english.translation(unit,`ati:${held}`,{allow_shared:true}),/shared-page scope/);
 assert.equal(calls,0,'Neither editorial prefaces nor implicit whole/shared requests authorize fetching the partial');
 const u=canon.resolve('sn36.15').unit;const b=canon.load().canon.books[u.book].blocks.slice(u.start,u.end).map(x=>x[2]).join(' ');
 assert.match(b,/anupubbasaṅkhārānaṃ nirodho/);assert.match(b,/anupubbasaṅkhārānaṃ vūpasamo/);assert.match(b,/anupubbasaṅkhārānaṃ paṭippassaddhi/);
});

test('reviewed AN pages require full prose scope and retain AN path restrictions', {skip:!python},()=>{
 const r=spawnSync(python,['-c',`
import sys,json,hashlib,tempfile,pathlib
sys.path.insert(0,'scripts/canon')
import reviewed_ati_stories as m
with tempfile.TemporaryDirectory() as tmp:
 root=pathlib.Path(tmp);(root/'tipitaka/an/an04').mkdir(parents=True)
 raw=b'Synthetic source with licence';(root/'tipitaka/an/an04/fixture.html').write_bytes(raw)
 blocks=[['bodytext',None,'Synthetic prose']]
 row={'unit_id':'an4.1','path':'/tipitaka/an/an04/fixture','pali_title':'Fixture','vri_verses':'1','pali_sha256':hashlib.sha256(b'').hexdigest(),'source_html_sha256':hashlib.sha256(raw).hexdigest(),'english_title':'Fixture','translator':'Synthetic','license':'Synthetic','source_reference':'AN fixture','mapping_note':'Synthetic note'}
 manifest={'ati_commit':'test','vri_commit':'test','links':[row]};m.MANIFEST=root/'manifest.json'
 c={'books':[{'blocks':blocks}],'units':[{'id':'an4.1','book':0,'start':0,'end':1,'title':'Fixture','vri':'1'}]}
 m.MANIFEST.write_text(json.dumps(manifest))
 try:m.reviewed_links(c,root)
 except ValueError as e:assert 'complete root block' in str(e)
 else:raise AssertionError('verse-only AN review accepted')
 row['root_blocks_sha256']=hashlib.sha256(json.dumps(blocks,ensure_ascii=False,separators=(',',':')).encode()).hexdigest();m.MANIFEST.write_text(json.dumps(manifest))
 assert 'an4.1' in m.reviewed_links(c,root)
 for path in ['/tipitaka/dn/fixture','/tipitaka/an/../fixture','https://other.example/fixture']:
  row['path']=path;m.MANIFEST.write_text(json.dumps(manifest))
  try:m.reviewed_links(c,root)
  except ValueError:pass
  else:raise AssertionError(path)
`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});

test('new AN edition numbers resolve by reviewed ownership, never a shared arithmetic offset',async()=>{
 const rows=[['an3.89','an3.88','an03/an03.088.than'],['an3.90','an3.89','an03/an03.089.than'],['an4.262','an4.259','an04/an04.259.than'],['an7.23','an7.21','an07/an07.021.than'],['an7.33','an7.32','an07/an07.032.than'],['an7.51','an7.48','an07/an07.048.than']];
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch');};
 for(const [right,wrong,path]of rows){
  const id='ati:/tipitaka/an/'+path;assert.ok(english.available(canon.resolve(right).unit).some(l=>l.translation_id===id));
  assert.equal(canon.resolve('https://www.accesstoinsight.org/tipitaka/an/'+path+'.html').unit.id,right);
  assert.ok(english.available(canon.resolve(wrong).unit).every(l=>l.translation_id!==id));
  await assert.rejects(english.translation(canon.resolve(wrong).unit,id));
 }
 assert.equal(calls,0);
});

test('the two training versions keep their distinct wisdom definition and final verse scope',async()=>{
 const first='ati:/tipitaka/an/an03/an03.088.than',second='ati:/tipitaka/an/an03/an03.089.than';
 const a=canon.resolve('an3.89').unit,b=canon.resolve('an3.90').unit;
 const text=u=>canon.segments(u).map(s=>s.text).join(' ');
 assert.match(text(a),/idaṃ dukkha/);assert.doesNotMatch(text(a),/Pajjotasseva/);
 assert.match(text(b),/āsavānaṃ khayā/);assert.match(text(b),/Pajjotasseva nibbānaṃ/);
 assert.match(english.available(a).find(l=>l.translation_id===first).mapping_note,/four noble truths/);
 assert.match(english.available(b).find(l=>l.translation_id===second).mapping_note,/five concluding stanzas/);
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch');};
 await assert.rejects(english.translation(a,second));await assert.rejects(english.translation(b,first));assert.equal(calls,0);
});

test('close growth and Anodhi versions are distinguished by actual subject and item scope',async()=>{
 const female='ati:/tipitaka/an/an05/an05.064.than';
 assert.match(english.available(canon.resolve('an5.64').unit).find(l=>l.translation_id===female).mapping_note,/female.*AN 5.63/);
 const one='ati:/tipitaka/an/an06/an06.102.than',three='ati:/tipitaka/an/an06/an06.104.than';
 assert.match(english.available(canon.resolve('an6.104').unit).find(l=>l.translation_id===three).mapping_note,/both final items remain represented/);
 assert.match(english.available(canon.resolve('an7.33').unit).find(l=>l.path?.includes('an07.032')||l.translation_id.includes('an07.032')).mapping_note,/three circuits.*without a count/);
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch');};
 for(const [uid,id]of [['an5.63',female],['an6.102',three],['an6.104',one],['an6.103',one],['an6.103',three]])await assert.rejects(english.translation(canon.resolve(uid).unit,id));
 assert.equal(calls,0);
});

test('SN 36.15 cannot mislabel its single entire prose segment as a reviewed partial span',()=>{
 const u=canon.resolve('sn36.15').unit,segs=canon.segments(u),body=segs.filter(s=>s.type!=='heading');assert.equal(body.length,1);
 const selected=body.map(({ref,type,text})=>({ref,type,text}));
 const source=canon.load().canon.source;
 const link={source:'ati',path:'/tipitaka/sn/sn36/sn36.015.nypo',partial_scope:{version:1,status:'reviewed',unit_id:u.id,first_ref:body[0].ref,last_ref:body[0].ref,source_commit:source.commit,pali_sha256:scopeHash(selected),text_sha256:'0'.repeat(64)}};
 assert.throws(()=>partialScope(link,u,segs,source),/Invalid or unreviewed partial translation scope/);
});

test('roof and contact-media pages resolve by discourse content rather than overlapping PTS pages', async () => {
  const cases = [
    ['an3.109', '/tipitaka/an/an03/an03.105.than', ['an3.105', 'an3.107', 'an3.108'], /guarded\/unguarded.*roof similes/],
    ['an4.173', '/tipitaka/an/an04/an04.174.than', ['an4.174'], /four rejected alternatives/],
    ['an11.9', '/tipitaka/an/an11/an11.010.than', ['an11.10'], /Sandha.*Saddha/],
  ];
  let calls = 0; globalThis.fetch = async () => { calls++; throw Error('Must not fetch'); };
  for (const [uid, path, wrong, note] of cases) {
    const link = english.available(canon.resolve(uid).unit).find(l => l.translation_id === `ati:${path}`);
    assert.ok(link); assert.match(link.mapping_note, note);
    assert.equal(canon.resolve(`https://www.accesstoinsight.org${path}.html`).unit.id, uid);
    for (const other of wrong) await assert.rejects(english.translation(canon.resolve(other).unit, `ati:${path}`));
  }
  assert.equal(calls, 0);
});

test('the second absorption discourse retains publisher abbreviations and three Sandha homage occurrences and source-wording caution are pinned', () => {
  const jhana = manifest.links.find(r => r.unit_id === 'an4.124');
  assert.match(jhana.mapping_note, /Both editions abbreviate/);
  const sandha = manifest.links.find(r => r.unit_id === 'an11.9');
  assert.equal(sandha.evidence.vri_verse_groups, 3);
  assert.match(sandha.mapping_note, /ATI says.*obsessed with uncertainty.*VRI has na vicikicchāparetena.*not obsessed/s);
  assert.match(sandha.mapping_note, /three homage occurrences.*two Notes are editorial/);
});

test('early AN pages retain slander polarity, distinct training outcomes and individual edition numbering', async () => {
  const cases = [
    ['an2.9', '/tipitaka/an/an02/an02.009.than', ['an2.8', 'an2.10']],
    ['an2.19', '/tipitaka/an/an02/an02.019.than', ['an2.20']],
    ['an2.24', '/tipitaka/an/an02/an02.025.than', ['an2.25']],
    ['an3.39', '/tipitaka/an/an03/an03.038.than', ['an3.38']],
    ['an3.86', '/tipitaka/an/an03/an03.085.than', ['an3.85', 'an3.87']],
    ['an3.87', '/tipitaka/an/an03/an03.086.than', ['an3.86']],
    ['an10.13', '/tipitaka/an/an10/an10.013.than', ['an10.12', 'an10.14']],
  ];
  let calls = 0; globalThis.fetch = async () => { calls++; throw Error('Must not fetch'); };
  for (const [uid, path, wrong] of cases) {
    assert.ok(english.available(canon.resolve(uid).unit).some(t => t.translation_id === `ati:${path}`));
    assert.equal(canon.resolve(`https://www.accesstoinsight.org${path}.html`).unit.id, uid);
    for (const other of wrong) await assert.rejects(english.translation(canon.resolve(other).unit, `ati:${path}`));
  }
  assert.equal(calls, 0);
});

test('combined refinement edition and distinct training editorial material stay explicit; fetters primary survives', () => {
  const note = id => manifest.links.find(r => r.unit_id === id).mapping_note;
  assert.match(note('an3.39'), /PTS III.38\/III.39.*one VRI unit/);
  assert.match(note('an3.39'), /Subject to birth.*Byādhidhammā.*illness/);
  assert.match(note('an3.86'), /four ordered accomplishment.*two Notes/);
  assert.match(note('an3.87'), /five non-returner subclasses.*Four Notes.*translator criticism/);
  const unit = canon.resolve('an10.13').unit, links = canon.linksFor(unit).links;
  assert.equal(links.length, 2); assert.equal(links[0].source, 'dhammatalks');
  assert.ok(links[0].url.endsWith('/AN10_13.html'));
  assert.equal(english.selectTranslation(links, 'ati:/tipitaka/an/an10/an10.013.than', unit.id).link.source, 'ati');
});

test('AN 2.47 omitted foremost-assembly ending cannot be hidden by whole-segment partial scope', () => {
  const u = canon.resolve('an2.47').unit, segs = canon.segments(u);
  assert.equal(segs.length, 2); assert.ok(segs.every(s => s.type !== 'heading'));
  assert.match(segs[1].text.slice(828), /Imā kho.*Etadaggaṃ/s);
  const path = '/tipitaka/an/an02/an02.046.than';
  assert.ok(!manifest.links.some(l => l.path === path));
  const actual = canon.describe(u);
  assert.equal(actual.english_available, 0);
  assert.equal(actual.partial_english_available, 1);
  const choice = actual.english.find(l => l.translation_id === 'ati:' + path);
  assert.ok(choice);
  assert.deepEqual([choice.translation_scope.version, choice.translation_scope.first_ref, choice.translation_scope.last_ref, choice.translation_scope.whole_unit_coverage], [2, 'an2.47/2', 'an2.47/2', false]);
  assert.deepEqual([choice.translation_scope.pali_excerpt.start_char, choice.translation_scope.pali_excerpt.end_char], [66, 827]);
  assert.equal(choice.translation_scope.pali_excerpt.text, segs[1].text.slice(66, 827));
  assert.ok(!choice.translation_scope.pali_excerpt.text.includes('Imā kho'));
  const source = canon.load().canon.source;
  const link = {source:'ati', path, partial_scope:{version:1,status:'reviewed',unit_id:u.id,first_ref:segs[0].ref,last_ref:segs[1].ref,source_commit:source.commit,pali_sha256:scopeHash(segs.map(({ref,type,text}) => ({ref,type,text}))),text_sha256:'0'.repeat(64)}};
  assert.throws(() => partialScope(link, u, segs, source), /Invalid or unreviewed partial translation scope/);
});

test('softness, quick mind, gratitude and sublime-attitude pages have content-specific ownership', async () => {
  const cases = [
    ['an1.47', '/tipitaka/an/an01/an01.047.than', ['an1.41', 'an1.44']],
    ['an1.48', '/tipitaka/an/an01/an01.048.than', ['an1.49', 'an1.50']],
    ['an2.119', '/tipitaka/an/an02/an02.119.than', ['an2.120']],
    ['an10.219', '/tipitaka/an/an10/an10.208.than', ['an10.208', 'an10.218']],
  ];
  let calls = 0; globalThis.fetch = async () => { calls++; throw Error('Must not fetch'); };
  for (const [uid, path, wrong] of cases) {
    assert.ok(english.available(canon.resolve(uid).unit).some(l => l.translation_id === `ati:${path}`));
    assert.equal(canon.resolve(`https://www.accesstoinsight.org${path}.html`).unit.id, uid);
    for (const other of wrong) await assert.rejects(english.translation(canon.resolve(other).unit, `ati:${path}`));
  }
  assert.equal(calls, 0);
});

test('reviewed PTS discrepancy, paragraph numbering and abbreviated sublime attitudes remain explicit', () => {
  const row = uid => manifest.links.find(r => r.unit_id === uid);
  assert.equal(row('an1.47').source_verses, 'AN 1.47; PTS A i 8');
  assert.equal(canon.resolve('an1.47').unit.pts.page, 9);
  assert.match(row('an1.47').mapping_note, /ATI prints A i 8.*VRI unit starts at A i 9/);
  assert.equal(row('an2.119').vri_verses, '120');
  assert.match(row('an10.219').mapping_note, /Both published editions abbreviate compassion and appreciation.*Two Notes.*editorial/);
});

test('four-text Luminous and six-text Mother pages remain withheld as ordinary individual ATI translations', () => {
  for (const path of ['/tipitaka/an/an01/an01.049.than', '/tipitaka/sn/sn15/sn15.014.than']) {
    assert.ok(!manifest.links.some(r => r.path === path));
    assert.ok(!Object.values(canon.load().translations).flat().some(l => l.path === path && !Object.hasOwn(l, 'shared_scope')));
  }
});

test('three alternate versions retain current choices and reject neighbouring text owners before fetch', async () => {
  const cases = [
    ['sn1.71','/tipitaka/sn/sn01/sn01.071.than',['sn1.70','sn1.72'],'dhammatalks'],
    ['sn17.5','/tipitaka/sn/sn17/sn17.005.wlsh',['sn17.4'],'ati'],
    ['an7.54','/tipitaka/an/an07/an07.051.than',['an7.51','an7.53'],'dhammatalks'],
  ];
  let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch');};
  for(const[uid,path,wrong,first]of cases){
    const u=canon.resolve(uid).unit,links=canon.linksFor(u).links;
    assert.equal(links.length,2);assert.equal(links[0].source,first);
    assert.equal(english.selectTranslation(links,`ati:${path}`,uid).link.path,path);
    assert.equal(canon.resolve(`https://www.accesstoinsight.org${path}.html`).unit.id,uid);
    for(const other of wrong)await assert.rejects(english.translation(canon.resolve(other).unit,`ati:${path}`));
  }
  assert.equal(calls,0);
});

test('alternate edition omissions, source typo and BPS terms are disclosed rather than silently corrected',()=>{
 const row=path=>manifest.links.find(r=>r.path===path);
 const w=row('/tipitaka/sn/sn17/sn17.005.wlsh');assert.equal(w.license,'BPS');assert.match(w.mapping_note,/50-print-copy.*not CC/);
 assert.match(row('/tipitaka/sn/sn01/sn01.071.than').mapping_note,/omits the Sāvatthī setting formula/);
 const note=row('/tipitaka/an/an07/an07.051.than').mapping_note;
 assert.match(note,/omits VRI’s final causal restatement.*no new assertion is lost/);
 assert.match(note,/both does and doesn’t after death.*omits “exist”/);
 assert.ok(!manifest.links.some(r=>r.path==='/tipitaka/sn/sn01/sn01.025.wlsh'));
});
