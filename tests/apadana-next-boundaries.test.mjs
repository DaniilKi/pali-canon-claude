import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { readBundled } from '../src/bundled-data.mjs';
import * as canon from '../src/canon.mjs';
import { assertPositionPin } from '../web/reading-position.mjs';

const python = ['python3', 'python'].find(cmd => spawnSync(cmd, ['--version']).status === 0);

test('finite second-vagga repair preserves source wording, older pair, future holds and commentary atomically', { skip: !python }, () => {
  const input = {
    canon: JSON.parse(gunzipSync(readBundled('server/data/canon.json.gz'))),
    commentary: JSON.parse(gunzipSync(readBundled('server/data/commentary.json.gz'))),
  };
  const bi = input.canon.units.find(u => u.id === 'thi-ap15').book;
  input.canon.books = input.canon.books.map((b, i) => i === bi ? b : { ...b, blocks: [] });
  input.canon.units = input.canon.units.filter(u => u.book === bi || u.id === 'mn1');
  input.commentary.books = input.commentary.books.map(b => ({ ...b, blocks: [] }));
  const result = spawnSync(python, ['-c', `
import copy,hashlib,json,os,sys,tempfile
from unittest.mock import patch
sys.path.insert(0,'scripts/canon')
from apadana_next_spans import apadana_next_spans,REVISION,FILE,TARGETS,SPANS
from repair_apadana_next_spans import repair,digest
sys.stdin.reconfigure(encoding='utf-8')
payload=json.load(sys.stdin);c=payload['canon'];a=payload['commentary']
by={u['id']:u for u in c['units']};bi=by['thi-ap15']['book']
# Always exercise historical input, even after committed data is corrected.
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
# Offline fixture is not publisher/source evidence. Production separately
# verifies the unmodified exact Git blob and parses the complete original XML.
raw=b'Apadana offline fixture, not source evidence'
fixture_blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\\0'+raw).hexdigest()
with tempfile.TemporaryDirectory() as root:
 os.mkdir(os.path.join(root,'romn'))
 with open(os.path.join(root,'romn',FILE),'wb') as f:f.write(raw)
 before_c=copy.deepcopy(c);before_a=copy.deepcopy(a)
 def run(cc,aa,p=parsed):
  with patch('repair_apadana_next_spans.vri.parse',return_value=p),patch('repair_apadana_next_spans.BLOB',fixture_blob):return repair(cc,aa,root)
 report=run(c,a)
 assert report['changed_spans']==list(TARGETS)
 assert report['input_canon_sha256']==digest(before_c) and report['output_canon_sha256']==digest(c)
 assert report['input_commentary_sha256']==report['output_commentary_sha256']==digest(a)
 assert a==before_a and c['books']==before_c['books'] and c['source']==before_c['source']
 assert {k:v for k,v in c.items() if k!='units'}=={k:v for k,v in before_c.items() if k!='units'}
 after={u['id']:u for u in c['units']}
 for u in before_c['units']:
  if u['id'] not in TARGETS:assert after[u['id']]==u
 for key in TARGETS:
  lo,hi,first,last=SPANS[key][2:6];u=after[key]
  assert (u['start'],u['end'],u['vri'],u['index_revision'])==(lo,hi,f'{first}–{last}',REVISION)
  assert u['title']==by[key]['title'] and u['pts']==by[key]['pts']
  assert len([b for b in parsed[lo:hi] if b['n']])==last-first+1
  assert report['units'][key]['root_blocks_sha256']==digest(before_c['books'][bi]['blocks'][lo:hi])
 expected_roots={
  'thi-ap15':'315579ea2da355a265b62145a875ffe46ae56bbbaf9aaa0657dd735fd3010459',
  'thi-ap16':'a3e30dbff9432a9c3c02bfa8f090fa2020811bc635c3f356cd1f86a271320289',
  'thi-ap17':'483fc05030a8ae4c74145634b8d9ae9216fa424c5bda2042b7e950b191b6adea',
  'thi-ap18':'30da05306d87e9d353e750af13e030b9ac064e45ddc98abccf906c65ddb72723',
  'thi-ap19':'e9efc0259984d179c7dcb3cf69232a759235125224ef1f1a83ba88844c153a5e',
  'thi-ap20':'0df732f6540bf82fe511ca848f8fb39ca6815a303d4f1e6a753b692704a785c7',
  'thi-ap21':'4f1011602b013dd2a1f2081da422e25f8d35ed65ac31d44bb111c6778a063d3a'}
 assert {k:report['units'][k]['root_sha256'] for k in TARGETS}==expected_roots
 assert report['commentary']['accepted_book_passages_checked']==58
 assert report['commentary']['target_associations']=={key:[] for key in TARGETS}
 snapshot=copy.deepcopy((c,a));second=run(c,a)
 assert second['changed_spans']==[] and (c,a)==snapshot
 assert second['input_canon_sha256']==second['output_canon_sha256']==report['output_canon_sha256']
 cases=('parity_notes','parity_pages','heading','number','colophon','neighbour','title','state','revision','half_revision','group','commentary','segment','canon_commit','commentary_commit','raw_blob','partial_pair','partial_component','interior_heading','summary_owner')
 for case in cases:
  cc=copy.deepcopy(before_c);aa=copy.deepcopy(before_a);p=copy.deepcopy(parsed)
  uu={u['id']:u for u in cc['units']}
  if case=='parity_notes':p[-1]['notes'].append('unreviewed drift')
  if case=='parity_pages':p[-1]['pages']['P']=[(99,999)]
  if case in ('heading','number','colophon'):
   if case=='heading':p[7192]['text']='6. Other poem'
   if case=='number':p[7193]['n']='87'
   if case=='colophon':p[7191]['text']='Other identity.'
   cc['books'][bi]['blocks']=[[b['rend'],b['n'],b['text'],b['notes'],{k:[f'{v}.{n}' for v,n in ps] for k,ps in b['pages'].items()}]for b in p]
  if case=='neighbour':uu['thi-ap14']['end']+=1
  if case=='title':uu['thi-ap16']['title']='A fuzzy title'
  if case=='state':uu['thi-ap16']['start']=7195
  if case=='revision':uu['thi-ap15']['index_revision']='unreviewed'
  if case=='half_revision':
   uu['thi-ap15'].update(end=7192,index_revision=REVISION);uu['thi-ap16']['start']=7192
  if case=='group':uu['mn1']['members']=['thi-ap15']
  if case=='commentary':aa['units']['thi-ap15']=[8987]
  if case=='segment':next(p for p in aa['passages'] if p[3]==bi)[9]=-1
  if case=='canon_commit':cc['source']['commit']='unknown'
  if case=='commentary_commit':aa['source']['commit']='unknown'
  if case in ('partial_pair','partial_component'):
   keys=TARGETS[:2] if case=='partial_pair' else TARGETS[:4]
   for key in keys:uu[key].update(start=SPANS[key][2],end=SPANS[key][3],index_revision=REVISION)
  if case in ('interior_heading','summary_owner'):
   if case=='interior_heading':p[7194]['rend']='subhead'
   else:p[8472]['text']='Changed chapter owner'
   cc['books'][bi]['blocks']=[[b['rend'],b['n'],b['text'],b['notes'],{k:[f'{v}.{n}' for v,n in ps] for k,ps in b['pages'].items()}]for b in p]
  untouched=copy.deepcopy((cc,aa))
  try:
   if case=='raw_blob':
    with patch('repair_apadana_next_spans.vri.parse',return_value=p):repair(cc,aa,root)
   else:run(cc,aa,p)
  except ValueError:pass
  else:raise AssertionError(case)
  assert (cc,aa)==untouched,case
print('pair preservation, source parity, idempotence and 20 atomic refusal controls passed')
`], { input: JSON.stringify(input), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /20 atomic refusal controls passed/);
});

test('all seven changed locators reject stale saved links while older pair and future holds retain their revisions', () => {
  const d = canon.load();
  for (const key of ['thi-ap15', 'thi-ap16', 'thi-ap17', 'thi-ap18', 'thi-ap19', 'thi-ap20', 'thi-ap21']) {
    const unit = { ...d.byId.get(key), index_revision: 'apadana-theri11-20-v1' };
    const source = canon.readingSource(unit);
    assert.equal(source.commit, d.canon.source.commit);
    assert.equal(source.locator_revision, `${source.commit}-apadana-theri11-20-v1`);
    const old = new URLSearchParams({ uid: key, ref: `${key}/1`, offset: '0', source: source.commit });
    assert.throws(() => assertPositionPin(old, { source }), e => e.code === 'READING_SOURCE_CHANGED');
    old.set('source', source.locator_revision);
    assert.doesNotThrow(() => assertPositionPin(old, { source }));
  }
  for (const key of ['thi-ap14', 'thi-ap22', 'thi-ap31', 'thi-ap32', 'thi-ap38', 'thi-ap39', 'thi-ap40']) {
    assert.equal(canon.readingSource(d.byId.get(key)).locator_revision, undefined);
  }
  for (const key of ['thi-ap4', 'thi-ap5']) {
    assert.equal(canon.readingSource(d.byId.get(key)).locator_revision,
      `${d.canon.source.commit}-apadana-theri45-v1`);
  }
});

test('monthly source rebuild retains the older repair before finite next-vagga repair and annotation', () => {
  const source = readFileSync('scripts/canon/build_canon.py', 'utf8');
  const call = source.indexOf('corrected.update(apadana_next_spans(b.books, b.units))');
  assert.ok(call > source.indexOf('corrected.update(apadana_spans(b.books, b.units))'));
  assert.ok(call < source.indexOf('b.annotate_pages()', source.indexOf('def main():')));
});
