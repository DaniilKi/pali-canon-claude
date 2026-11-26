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

test('finite Apadāna pair repair preserves blocks, titles, neighbours and commentary atomically', { skip: !python }, () => {
  const input = {
    canon: canonBeforeFour(JSON.parse(gunzipSync(readBundled('server/data/canon.json.gz')))),
    commentary: JSON.parse(gunzipSync(readBundled('server/data/commentary.json.gz'))),
  };
  const bi = input.canon.units.find(u => u.id === 'thi-ap4').book;
  input.canon.books = input.canon.books.map((b, i) => i === bi ? b : { ...b, blocks: [] });
  input.canon.units = input.canon.units.filter(u => u.book === bi || u.id === 'mn1');
  input.commentary.books = input.commentary.books.map(b => ({ ...b, blocks: [] }));
  const result = spawnSync(python, ['-c', `
import copy,hashlib,json,os,sys,tempfile
from unittest.mock import patch
sys.path.insert(0,'scripts/canon')
from apadana_spans import apadana_spans,REVISION,FILE,TARGETS
from repair_apadana_spans import repair,digest
sys.stdin.reconfigure(encoding='utf-8')
payload=json.load(sys.stdin);c=payload['canon'];a=payload['commentary']
by={u['id']:u for u in c['units']};bi=by['thi-ap4']['book']
# Always exercise historical input, even after committed data is corrected.
by['thi-ap4'].update(start=6629,end=6651,vri='31–37')
by['thi-ap5'].update(start=6651,end=6675,vri='38–45')
for key in TARGETS:by[key].pop('index_revision',None)
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
  with patch('repair_apadana_spans.vri.parse',return_value=p),patch('repair_apadana_spans.BLOB',fixture_blob):return repair(cc,aa,root)
 report=run(c,a)
 assert report['changed_spans']==list(TARGETS)
 assert report['input_canon_sha256']==digest(before_c) and report['output_canon_sha256']==digest(c)
 assert report['input_commentary_sha256']==report['output_commentary_sha256']==digest(a)
 assert a==before_a and c['books']==before_c['books'] and c['source']==before_c['source']
 assert {k:v for k,v in c.items() if k!='units'}=={k:v for k,v in before_c.items() if k!='units'}
 after={u['id']:u for u in c['units']}
 for u in before_c['units']:
  if u['id'] not in TARGETS:assert after[u['id']]==u
 for key,lo,hi,vr,count in [('thi-ap4',6629,6647,'31–36',6),('thi-ap5',6647,6675,'37–45',9)]:
  u=after[key]
  assert (u['start'],u['end'],u['vri'],u['index_revision'])==(lo,hi,vr,REVISION)
  assert u['title']==by[key]['title']
  assert len([b for b in parsed[lo:hi] if b['n']])==count
  assert u['pts']==by[key]['pts']
  assert report['units'][key]['root_blocks_sha256']==digest(before_c['books'][bi]['blocks'][lo:hi])
 assert report['units']['thi-ap4']['root_sha256']=='21bf7bb0a2998c44df1b93c5fa421397060d441a063d9df15674904acf7f4ff8'
 assert report['units']['thi-ap5']['root_sha256']=='bc87b06e6c4713fe575053f88a8c7efe1a4bac017e6b830dfd371b14eeffcbaf'
 assert parsed[6631]['notes']==['koṇḍaññassa bhagavato (syā. pī.)']
 assert report['commentary']['accepted_book_passages_checked']==58
 assert report['commentary']['target_associations']=={'thi-ap4':[],'thi-ap5':[]}
 snapshot=copy.deepcopy((c,a));second=run(c,a)
 assert second['changed_spans']==[] and (c,a)==snapshot
 assert second['input_canon_sha256']==second['output_canon_sha256']==report['output_canon_sha256']
 cases=('parity_notes','parity_pages','heading','number','colophon','neighbour','title','state','revision','half_revision','group','commentary','segment','canon_commit','commentary_commit','raw_blob')
 for case in cases:
  cc=copy.deepcopy(before_c);aa=copy.deepcopy(before_a);p=copy.deepcopy(parsed)
  uu={u['id']:u for u in cc['units']}
  if case=='parity_notes':p[-1]['notes'].append('unreviewed drift')
  if case=='parity_pages':p[-1]['pages']['P']=[(99,999)]
  if case in ('heading','number','colophon'):
   if case=='heading':p[6647]['text']='5. Other poem'
   if case=='number':p[6648]['n']='38'
   if case=='colophon':p[6646]['text']='Other identity.'
   cc['books'][bi]['blocks']=[[b['rend'],b['n'],b['text'],b['notes'],{k:[f'{v}.{n}' for v,n in ps] for k,ps in b['pages'].items()}]for b in p]
  if case=='neighbour':uu['thi-ap3']['end']+=1
  if case=='title':uu['thi-ap5']['title']='A fuzzy title'
  if case=='state':uu['thi-ap5']['start']=6650
  if case=='revision':uu['thi-ap4']['index_revision']='unreviewed'
  if case=='half_revision':
   uu['thi-ap4'].update(end=6647,index_revision=REVISION);uu['thi-ap5']['start']=6647
  if case=='group':uu['mn1']['members']=['thi-ap4']
  if case=='commentary':aa['units']['thi-ap4']=[8987]
  if case=='segment':next(p for p in aa['passages'] if p[3]==bi)[9]=-1
  if case=='canon_commit':cc['source']['commit']='unknown'
  if case=='commentary_commit':aa['source']['commit']='unknown'
  untouched=copy.deepcopy((cc,aa))
  try:
   if case=='raw_blob':
    with patch('repair_apadana_spans.vri.parse',return_value=p):repair(cc,aa,root)
   else:run(cc,aa,p)
  except ValueError:pass
  else:raise AssertionError(case)
  assert (cc,aa)==untouched,case
print('pair preservation, source parity, idempotence and 16 atomic refusal controls passed')
`], { input: JSON.stringify(input), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /16 atomic refusal controls passed/);
});

test('changed pair locators reject old saved links before reader wording, neighbours retain their pins', () => {
  const d = canon.load();
  for (const key of ['thi-ap4', 'thi-ap5']) {
    const unit = { ...d.byId.get(key), index_revision: 'apadana-theri45-v1' };
    const source = canon.readingSource(unit);
    assert.equal(source.commit, d.canon.source.commit);
    assert.equal(source.locator_revision, `${source.commit}-apadana-theri45-v1`);
    const old = new URLSearchParams({ uid: key, ref: `${key}/1`, offset: '0', source: source.commit });
    assert.throws(() => assertPositionPin(old, { source }), e => e.code === 'READING_SOURCE_CHANGED');
    old.set('source', source.locator_revision);
    assert.doesNotThrow(() => assertPositionPin(old, { source }));
  }
  for (const key of ['thi-ap3', 'thi-ap6']) {
    assert.equal(canon.readingSource(d.byId.get(key)).locator_revision, undefined);
  }
});

test('monthly source rebuild applies finite pair repair before verse and page annotation', () => {
  const source = readFileSync('scripts/canon/build_canon.py', 'utf8');
  const call = source.indexOf('corrected.update(apadana_spans(b.books, b.units))');
  assert.ok(call > source.indexOf('corrected.update(dasabala_spans(b.books, b.units))'));
  assert.ok(call < source.indexOf('b.annotate_pages()', source.indexOf('def main():')));
});
