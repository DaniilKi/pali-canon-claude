import {historicalF3SourceFixture} from './helpers/historical389390-source-canon.mjs';
import {canonBeforeFour} from './helpers/canon-before-four.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { readBundled } from '../src/bundled-data.mjs';
import * as canon from '../src/canon.mjs';
import { readPassage } from '../src/chatgpt-widget.mjs';
import { assertPositionPin } from '../web/reading-position.mjs';

const python = ['python3', 'python'].find(cmd => spawnSync(cmd, ['--version']).status === 0);
const revision = 'apadana-theri31-40-v1';
const bounds = {
  'thi-ap33': [10121, 10200, 10121, 10196],
  'thi-ap34': [10200, 10289, 10196, 10285],
  'thi-ap35': [10289, 10382, 10285, 10382],
  'thi-ap36': [10382, 10461, 10382, 10457],
  'thi-ap37': [10461, 10505, 10457, 10505],
};

test('three finite fourth-vagga splits preserve all earlier repairs, source blocks and commentary atomically', { skip: !python }, () => {
  const input = {
    canon: canonBeforeFour(historicalF3SourceFixture(JSON.parse(gunzipSync(readBundled('server/data/canon.json.gz'))))),
    commentary: JSON.parse(gunzipSync(readBundled('server/data/commentary.json.gz'))),
  };
  const bi = input.canon.units.find(u => u.id === 'thi-ap33').book;
  input.canon.books = input.canon.books.map((b, i) => i === bi ? b : { ...b, blocks: [] });
  input.canon.units = input.canon.units.filter(u => u.book === bi || u.id === 'mn1');
  input.commentary.books = input.commentary.books.map(b => ({ ...b, blocks: [] }));
  const result = spawnSync(python, ['-c', `
import copy,hashlib,json,os,sys,tempfile
from unittest.mock import patch
sys.path.insert(0,'scripts/canon')
from apadana_fourth_spans import apadana_fourth_spans,REVISION,FILE,TARGETS,SPANS
from repair_apadana_fourth_spans import repair,digest
sys.stdin.reconfigure(encoding='utf-8')
payload=json.load(sys.stdin);c=payload['canon'];a=payload['commentary']
by={u['id']:u for u in c['units']};bi=by['thi-ap33']['book']
# Exercise the historical defect even after corrected data is installed.
for key in TARGETS:
 lo,hi=SPANS[key][:2];by[key].update(start=lo,end=hi);by[key].pop('index_revision',None)
 ns=[b[1] for b in c['books'][bi]['blocks'][lo:hi] if b[1]]
 by[key]['vri']=ns[0]+'–'+ns[-1]
parsed=[]
for rend,n,text,notes,pages in c['books'][bi]['blocks']:
 ps={k:[tuple(map(int,p.split('.'))) for p in values] for k,values in pages.items()}
 parsed.append(dict(rend=rend,n=n,text=text,notes=copy.deepcopy(notes),pages=ps,page_offsets={k:[0]*len(v) for k,v in ps.items()}))
# Offline fixture is control-flow evidence only. Production independently
# verifies the complete original Git blob, then every book block/note/page.
raw=b'Apadana fourth-vagga offline fixture, not source evidence'
fixture_blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\\0'+raw).hexdigest()
with tempfile.TemporaryDirectory() as root:
 os.mkdir(os.path.join(root,'romn'))
 with open(os.path.join(root,'romn',FILE),'wb') as f:f.write(raw)
 before_c=copy.deepcopy(c);before_a=copy.deepcopy(a)
 def run(cc,aa,p=parsed):
  with patch('repair_apadana_fourth_spans.vri.parse',return_value=p),patch('repair_apadana_fourth_spans.BLOB',fixture_blob):return repair(cc,aa,root)
 report=run(c,a)
 assert report['changed_spans']==list(TARGETS)
 assert report['input_canon_sha256']==digest(before_c) and report['output_canon_sha256']==digest(c)
 assert report['input_commentary_sha256']==report['output_commentary_sha256']==digest(a)
 assert a==before_a and c['books']==before_c['books']
 assert {k:v for k,v in c.items() if k!='units'}=={k:v for k,v in before_c.items() if k!='units'}
 after={u['id']:u for u in c['units']}
 for u in before_c['units']:
  if u['id'] not in TARGETS:assert after[u['id']]==u
 for key in TARGETS:
  lo,hi,first,last=SPANS[key][2:6];u=after[key]
  assert (u['start'],u['end'],u['vri'],u['index_revision'])==(lo,hi,f'{first}–{last}',REVISION)
  assert u['title']==by[key]['title'] and u['pts']==by[key]['pts']
  assert report['units'][key]['root_blocks_sha256']==digest(before_c['books'][bi]['blocks'][lo:hi])
 expected_roots={
  'thi-ap33':'5eca076afa0b14d18aad94f539e4abd0ce32e9995bda286bb16d80d3ade150f0', 'thi-ap34':'86b5a7670aa587cfee9f9b0488c382caac9540d3f314d5b49b728c3a993a1dce', 'thi-ap35':'4ac405d1255b3a8305d84b5adfcd8f7c01685b97044a7146b2c6868a20c46d71',
  'thi-ap36':'f47836eeda85a4ff088935edf1948251f614a01d07b1b42597459625b93e36b4', 'thi-ap37':'ce1a7dcbee24ae04a376c33a716abf0b9bd9e3d51b75c7e12f695d07c5f5d74f'}
 assert {k:report['units'][k]['root_sha256'] for k in TARGETS}==expected_roots
 assert report['commentary']['accepted_book_passages_checked']==58
 assert report['commentary']['target_associations']=={key:[] for key in TARGETS}
 snapshot=copy.deepcopy((c,a));second=run(c,a)
 assert second['changed_spans']==[] and (c,a)==snapshot
 assert second['input_canon_sha256']==second['output_canon_sha256']==report['output_canon_sha256']
 cases=('parity_notes','parity_pages','heading','duplicate_heading','number','number_rend','colophon','recitation','neighbour','title','state','revision','half_revision','group','shared','commentary','segment','canon_commit','commentary_commit','raw_blob','interior_heading','duplicate_unit','missing_unit','foreign_book','approximate')
 for case in cases:
  cc=copy.deepcopy(before_c);aa=copy.deepcopy(before_a);p=copy.deepcopy(parsed)
  uu={u['id']:u for u in cc['units']}
  if case=='parity_notes':p[-1]['notes'].append('unreviewed drift')
  if case=='parity_pages':p[-1]['pages']['P']=[(99,999)]
  if case in ('heading','duplicate_heading','number','number_rend','colophon','recitation','interior_heading'):
   if case=='heading':p[10196]['text']='4. Other poem'
   if case=='duplicate_heading':p[10205].update(rend='subhead',text=p[10196]['text'])
   if case=='number':p[10197]['n']='83'
   if case=='number_rend':p[10197]['rend']='bodytext'
   if case=='colophon':p[10195]['text']='Other identity.'
   if case=='recitation':p[10381]['text']='Unreviewed recitation owner'
   if case=='interior_heading':p[10198]['rend']='subhead'
   cc['books'][bi]['blocks']=[[b['rend'],b['n'],b['text'],b['notes'],{k:[f'{v}.{n}' for v,n in ps] for k,ps in b['pages'].items()}]for b in p]
  if case=='neighbour':uu['thi-ap32']['end']+=1
  if case=='title':uu['thi-ap34']['title']='A fuzzy title'
  if case=='state':uu['thi-ap34']['start']=10198
  if case=='revision':uu['thi-ap33']['index_revision']='unreviewed'
  if case=='half_revision':
   uu['thi-ap33'].update(end=10196,index_revision=REVISION);uu['thi-ap34']['start']=10196
  if case=='group':uu['mn1']['members']=['thi-ap33']
  if case=='shared':uu['mn1']['shares_passage_with']='thi-ap37'
  if case=='commentary':aa['units']['thi-ap33']=[8987]
  if case=='segment':next(p for p in aa['passages'] if p[3]==bi)[9]=-1
  if case=='canon_commit':cc['source']['commit']='unknown'
  if case=='commentary_commit':aa['source']['commit']='unknown'
  if case=='duplicate_unit':cc['units'].append(copy.deepcopy(uu['thi-ap33']))
  if case=='missing_unit':cc['units'].remove(uu['thi-ap33'])
  if case=='foreign_book':uu['thi-ap33']['book']=0
  if case=='approximate':uu['thi-ap33']['approximate']=True
  untouched=copy.deepcopy((cc,aa))
  try:
   if case=='raw_blob':
    with patch('repair_apadana_fourth_spans.vri.parse',return_value=p):repair(cc,aa,root)
   else:run(cc,aa,p)
  except ValueError:pass
  else:raise AssertionError(case)
  assert (cc,aa)==untouched,case
 # Every nonempty proper subset is an unauthorized partial migration,
 # including either whole connected component repaired without the other.
 for mask in range(1,(1<<len(TARGETS))-1):
  cc=copy.deepcopy(before_c);aa=copy.deepcopy(before_a);uu={u['id']:u for u in cc['units']}
  for i,key in enumerate(TARGETS):
   if mask&(1<<i):uu[key].update(start=SPANS[key][2],end=SPANS[key][3],index_revision=REVISION)
  untouched=copy.deepcopy((cc,aa))
  try:run(cc,aa)
  except ValueError:pass
  else:raise AssertionError('partial state '+str(mask))
  assert (cc,aa)==untouched,mask
 assert apadana_fourth_spans([],[])==[]
print('preservation, source parity, idempotence, 25 refusal controls and all 30 partial states passed')
`], { input: JSON.stringify(input), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /all 30 partial states passed/);
});

test('all five changed locators reject stale saved positions while earlier repairs and other chapter units keep their revisions', () => {
  const d = canon.load();
  for (const key of Object.keys(bounds)) {
    const unit = { ...d.byId.get(key), index_revision: revision }, source = canon.readingSource(unit);
    assert.equal(source.commit, d.canon.source.commit);
    assert.equal(source.locator_revision, `${source.commit}-${revision}`);
    const old = new URLSearchParams({ uid: key, ref: `${key}/1`, offset: '0', source: source.commit });
    assert.throws(() => assertPositionPin(old, { source }), e => e.code === 'READING_SOURCE_CHANGED');
    old.set('source', source.locator_revision);
    assert.doesNotThrow(() => assertPositionPin(old, { source }));
  }
  for (const key of ['thi-ap31', 'thi-ap32', 'thi-ap38', 'thi-ap39', 'thi-ap40']) {
    assert.equal(canon.readingSource(d.byId.get(key)).locator_revision, undefined);
  }
  for (const [keys, previous] of [[['thi-ap4', 'thi-ap5'], 'apadana-theri45-v1'], [['thi-ap20', 'thi-ap21'], 'apadana-theri11-20-v1'], [['thi-ap23', 'thi-ap24'], 'apadana-theri21-30-v1']]) {
    for (const key of keys) assert.equal(canon.readingSource(d.byId.get(key)).locator_revision, `${d.canon.source.commit}-${previous}`);
  }
});

test('widget refuses old pins before resolving vanished tails or returning changed wording', async () => {
  const d = canon.load();
  // Bounded in-process metadata fixture works before or after installation.
  // Production repair/source receipts independently establish these boundaries.
  for (const [key, [oldStart, oldEnd, start, end]] of Object.entries(bounds)) {
    const unit = d.byId.get(key), before = { ...unit };
    const old = { ...unit, start: oldStart, end: oldEnd };
    const oldSegments = canon.segmentsFromCorpus(old, d.canon);
    const currentSegments = canon.segmentsFromCorpus({ ...unit, start, end }, d.canon);
    const oldLast = oldSegments.at(-1).ref;
    if (key === 'thi-ap33' || key === 'thi-ap36') assert.ok(oldSegments.length > currentSegments.length);
    Object.assign(unit, { start, end, index_revision: revision });
    try {
      for (const request of [{ offset: 0 }, { offset: oldSegments.length - 1 }, { segment: `${key}/1` }, { segment: oldLast }]) {
        await assert.rejects(readPassage({ uid: key, english: false, source_commit: d.canon.source.commit, ...request }), /locator revision changed/);
      }
      const current = `${d.canon.source.commit}-${revision}`;
      const result = await readPassage({ uid: key, english: false, source_commit: current, limit: 1 });
      assert.equal(result.pali.segments[0].ref, `${key}/1`);
      assert.equal(result.source.locator_revision, current);
      if (oldSegments.length > currentSegments.length) {
        await assert.rejects(readPassage({ uid: key, english: false, source_commit: current, segment: oldLast }), /does not belong/);
      }
    } finally {
      for (const property of Object.keys(unit)) delete unit[property];
      Object.assign(unit, before);
    }
  }
});

test('monthly rebuild retains all older repairs before the finite fourth-vagga migration and annotation', () => {
  const source = readFileSync('scripts/canon/build_canon.py', 'utf8');
  const call = source.indexOf('corrected.update(apadana_fourth_spans(b.books, b.units))');
  for (const previous of ['apadana_spans', 'apadana_next_spans', 'apadana_third_spans']) {
    assert.ok(call > source.indexOf(`corrected.update(${previous}(b.books, b.units))`));
  }
  assert.ok(call < source.indexOf('b.annotate_pages()', source.indexOf('def main():')));
});
