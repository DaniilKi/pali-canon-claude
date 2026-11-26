import {canonBeforeFour} from './helpers/canon-before-four.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { readBundled } from '../src/bundled-data.mjs';
import * as canon from '../src/canon.mjs';
import { assertPositionPin } from '../web/reading-position.mjs';

const python = ['python3', 'python'].find(cmd => spawnSync(cmd, ['--version']).status === 0);

test('finite third-vagga pair repair preserves earlier repairs, future holds and commentary atomically', { skip: !python }, () => {
  const input = {
    canon: canonBeforeFour(JSON.parse(gunzipSync(readBundled('server/data/canon.json.gz')))),
    commentary: JSON.parse(gunzipSync(readBundled('server/data/commentary.json.gz'))),
  };
  const bi = input.canon.units.find(u => u.id === 'thi-ap23').book;
  input.canon.books = input.canon.books.map((b, i) => i === bi ? b : { ...b, blocks: [] });
  input.canon.units = input.canon.units.filter(u => u.book === bi || u.id === 'mn1');
  input.commentary.books = input.commentary.books.map(b => ({ ...b, blocks: [] }));
  const result = spawnSync(python, ['-c', `
import copy,hashlib,json,os,sys,tempfile
from unittest.mock import patch
sys.path.insert(0,'scripts/canon')
from apadana_third_spans import apadana_third_spans,REVISION,FILE,TARGETS,SPANS
from repair_apadana_third_spans import repair,digest
sys.stdin.reconfigure(encoding='utf-8')
payload=json.load(sys.stdin);c=payload['canon'];a=payload['commentary']
by={u['id']:u for u in c['units']};bi=by['thi-ap23']['book']
# Always exercise the historical defect, including after bundled data changes.
for key in TARGETS:
 lo,hi=SPANS[key][:2];by[key].update(start=lo,end=hi);by[key].pop('index_revision',None)
 ns=[b[1] for b in c['books'][bi]['blocks'][lo:hi] if b[1]]
 by[key]['vri']=ns[0]+'–'+ns[-1]
def parse_fixture():
 out=[]
 for rend,n,text,notes,pages in c['books'][bi]['blocks']:
  ps={k:[tuple(map(int,p.split('.'))) for p in values] for k,values in pages.items()}
  out.append(dict(rend=rend,n=n,text=text,notes=copy.deepcopy(notes),pages=ps,page_offsets={k:[0]*len(v) for k,v in ps.items()}))
 return out
parsed=parse_fixture()
# Offline fixtures test control flow; production verifies the complete original
# exact Git blob and full parsed book, and is separate source evidence.
raw=b'Apadana third-vagga offline fixture, not source evidence'
fixture_blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\\0'+raw).hexdigest()
with tempfile.TemporaryDirectory() as root:
 os.mkdir(os.path.join(root,'romn'))
 with open(os.path.join(root,'romn',FILE),'wb') as f:f.write(raw)
 before_c=copy.deepcopy(c);before_a=copy.deepcopy(a)
 def run(cc,aa,p=parsed):
  with patch('repair_apadana_third_spans.vri.parse',return_value=p),patch('repair_apadana_third_spans.BLOB',fixture_blob):return repair(cc,aa,root)
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
  'thi-ap23':'a457920710bb058996af0ebb98f588c0ddba51421af2a3fe60cad85c17e57999',
  'thi-ap24':'46abcdad17e69e6488b276c332aed0ee3c7a1aff2d613254c3f686f292fe5d67'}
 assert {k:report['units'][k]['root_sha256'] for k in TARGETS}==expected_roots
 assert report['commentary']['accepted_book_passages_checked']==58
 assert report['commentary']['target_associations']=={key:[] for key in TARGETS}
 snapshot=copy.deepcopy((c,a));second=run(c,a)
 assert second['changed_spans']==[] and (c,a)==snapshot
 assert second['input_canon_sha256']==second['output_canon_sha256']==report['output_canon_sha256']
 cases=('parity_notes','parity_pages','heading','duplicate_heading','number','number_rend','colophon','neighbour','title','state','revision','half_revision','group','shared','commentary','segment','canon_commit','commentary_commit','raw_blob','partial_pair','interior_heading')
 for case in cases:
  cc=copy.deepcopy(before_c);aa=copy.deepcopy(before_a);p=copy.deepcopy(parsed)
  uu={u['id']:u for u in cc['units']}
  if case=='parity_notes':p[-1]['notes'].append('unreviewed drift')
  if case=='parity_pages':p[-1]['pages']['P']=[(99,999)]
  if case in ('heading','duplicate_heading','number','number_rend','colophon','interior_heading'):
   if case=='heading':p[8873]['text']='4. Other poem'
   if case=='duplicate_heading':p[9000].update(rend='subhead',text=p[8873]['text'])
   if case=='number':p[8874]['n']='132'
   if case=='number_rend':p[8874]['rend']='bodytext'
   if case=='colophon':p[8872]['text']='Other identity.'
   if case=='interior_heading':p[8875]['rend']='subhead'
   cc['books'][bi]['blocks']=[[b['rend'],b['n'],b['text'],b['notes'],{k:[f'{v}.{n}' for v,n in ps] for k,ps in b['pages'].items()}]for b in p]
  if case=='neighbour':uu['thi-ap22']['end']+=1
  if case=='title':uu['thi-ap24']['title']='A fuzzy title'
  if case=='state':uu['thi-ap24']['start']=8875
  if case=='revision':uu['thi-ap23']['index_revision']='unreviewed'
  if case=='half_revision':
   uu['thi-ap23'].update(end=8873,index_revision=REVISION);uu['thi-ap24']['start']=8873
  if case=='group':uu['mn1']['members']=['thi-ap23']
  if case=='shared':uu['mn1']['shares_passage_with']='thi-ap24'
  if case=='commentary':aa['units']['thi-ap23']=[8987]
  if case=='segment':next(p for p in aa['passages'] if p[3]==bi)[9]=-1
  if case=='canon_commit':cc['source']['commit']='unknown'
  if case=='commentary_commit':aa['source']['commit']='unknown'
  if case=='partial_pair':uu['thi-ap23'].update(end=8873,index_revision=REVISION)
  untouched=copy.deepcopy((cc,aa))
  try:
   if case=='raw_blob':
    with patch('repair_apadana_third_spans.vri.parse',return_value=p):repair(cc,aa,root)
   else:run(cc,aa,p)
  except ValueError:pass
  else:raise AssertionError(case)
  assert (cc,aa)==untouched,case
 assert apadana_third_spans([],[])==[]
print('pair preservation, source parity, idempotence and 21 atomic refusal controls passed')
`], { input: JSON.stringify(input), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /21 atomic refusal controls passed/);
});

test('both changed locators reject old saved links and preserve intentional current-revision links', () => {
  const d = canon.load();
  for (const key of ['thi-ap23', 'thi-ap24']) {
    const unit = { ...d.byId.get(key), index_revision: 'apadana-theri21-30-v1' };
    const source = canon.readingSource(unit);
    assert.equal(source.commit, d.canon.source.commit);
    assert.equal(source.locator_revision, `${source.commit}-apadana-theri21-30-v1`);
    const old = new URLSearchParams({ uid: key, ref: `${key}/1`, offset: '0', source: source.commit });
    assert.throws(() => assertPositionPin(old, { source }), e => e.code === 'READING_SOURCE_CHANGED');
    old.set('source', source.locator_revision);
    assert.doesNotThrow(() => assertPositionPin(old, { source }));
  }
  for (const key of ['thi-ap22', 'thi-ap25', 'thi-ap31', 'thi-ap32', 'thi-ap38', 'thi-ap39', 'thi-ap40']) {
    assert.equal(canon.readingSource(d.byId.get(key)).locator_revision, undefined);
  }
  for (const key of ['thi-ap20', 'thi-ap21']) {
    assert.equal(canon.readingSource(d.byId.get(key)).locator_revision,
      `${d.canon.source.commit}-apadana-theri11-20-v1`);
  }
  for (const key of ['thi-ap4', 'thi-ap5']) {
    assert.equal(canon.readingSource(d.byId.get(key)).locator_revision,
      `${d.canon.source.commit}-apadana-theri45-v1`);
  }
});

test('monthly rebuild runs third-vagga pair after both older repairs and before page annotation', () => {
  const source = readFileSync('scripts/canon/build_canon.py', 'utf8');
  const call = source.indexOf('corrected.update(apadana_third_spans(b.books, b.units))');
  assert.ok(call > source.indexOf('corrected.update(apadana_next_spans(b.books, b.units))'));
  assert.ok(call > source.indexOf('corrected.update(apadana_spans(b.books, b.units))'));
  assert.ok(call < source.indexOf('b.annotate_pages()', source.indexOf('def main():')));
});
