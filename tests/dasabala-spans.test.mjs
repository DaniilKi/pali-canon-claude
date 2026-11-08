import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { readBundled } from '../src/bundled-data.mjs';
import * as canon from '../src/canon.mjs';
import { assertPositionPin } from '../web/reading-position.mjs';

const python = ['python3', 'python'].find(cmd => spawnSync(cmd, ['--version']).status === 0);

test('Dasabala repair validates full-book parity, changes only reviewed ownership and is atomic/idempotent', { skip: !python }, () => {
  const input = {
    canon: JSON.parse(gunzipSync(readBundled('server/data/canon.json.gz'))),
    commentary: JSON.parse(gunzipSync(readBundled('server/data/commentary.json.gz'))),
  };
  // Keep the complete reviewed root/commentary books, and metadata-only controls
  // elsewhere. Repeated atomic-refusal fixtures should not deepcopy the entire
  // Tipitaka and all commentary wording ten times.
  const bi = input.canon.units.find(u => u.id === 'sn12.21').book;
  input.canon.books = input.canon.books.map((b, i) => i === bi ? b : { ...b, blocks: [] });
  input.canon.units = input.canon.units.filter(u => u.collection === 'sn' || u.id === 'mn1');
  input.commentary.books = input.commentary.books.map(b => b.root_files.includes('s0302m.mul.xml') ? b : { ...b, blocks: [] });
  const result = spawnSync(python, ['-c', `
import copy,json,sys,tempfile,os
from unittest.mock import patch
sys.path.insert(0,'scripts/canon')
from dasabala_spans import dasabala_spans,REVISION,FILE
from repair_dasabala_spans import repair,digest
# Node writes UTF-8 bytes to this pipe; do not use Windows' locale codec.
sys.stdin.reconfigure(encoding='utf-8')
payload=json.load(sys.stdin);c=payload['canon'];a=payload['commentary']
by={u['id']:u for u in c['units']};bi=by['sn12.21']['book']
# Explicit historical fixture, independent of whether committed data is repaired.
by['sn12.21'].update(start=132,end=143,title='Dasabalasutta',approximate=True,vri='20')
by['sn12.22'].update(start=143,end=150,vri='21–22')
for key in ('sn12.21','sn12.22'):by[key].pop('index_revision',None)
a['units']['sn12.21']=[3333]
a['cited_unaligned']=[x for x in a['cited_unaligned'] if x!='sn12.21']
sn={u['id'] for u in c['units'] if u['collection']=='sn'}
cited=(set(a['units'])|set(a['cited_unaligned']))&sn
assert 'sn12.21' in cited
a['coverage']['sn']={'texts':len(sn),'with_commentary':len(sn&set(a['units'])),'cited':len(cited),'cited_aligned':len(cited&set(a['units']))}
# The parser is mocked ONLY in this offline unit test. Production CLI separately
# parses the complete pinned XML; this fixture exercises its full parity gate.
def parsed_book():
 out=[]
 for rend,n,text,notes,pages in c['books'][bi]['blocks']:
  ps={k:[tuple(map(int,p.split('.'))) for p in values] for k,values in pages.items()}
  out.append(dict(rend=rend,n=n,text=text,notes=copy.deepcopy(notes),pages=ps,page_offsets={k:[0]*len(v) for k,v in ps.items()}))
 return out
parsed=parsed_book()
with tempfile.TemporaryDirectory() as root:
 os.mkdir(os.path.join(root,'romn'))
 with open(os.path.join(root,'romn',FILE),'wb') as f:f.write(b'offline parser fixture, not source evidence')
 before_c=copy.deepcopy(c);before_a=copy.deepcopy(a)
 with patch('repair_dasabala_spans.vri.parse',return_value=parsed):report=repair(c,a,root)
 assert report['changed_spans']==['sn12.21','sn12.22']
 assert report['input_canon_sha256']==digest(before_c)
 assert report['input_commentary_sha256']==digest(before_a)
 assert report['output_canon_sha256']==digest(c)
 assert report['output_commentary_sha256']==digest(a)
 assert report['input_canon_sha256']!=report['output_canon_sha256']
 assert report['input_commentary_sha256']!=report['output_commentary_sha256']
 assert c['books']==before_c['books'] and c['source']==before_c['source']
 assert a['books']==before_a['books'] and a['passages']==before_a['passages']
 assert {k:v for k,v in a['units'].items()}=={k:v for k,v in before_a['units'].items() if k!='sn12.21'}
 assert a['cited_unaligned']==before_a['cited_unaligned']+['sn12.21']
 assert a['coverage']['sn']['with_commentary']==before_a['coverage']['sn']['with_commentary']-1
 assert a['coverage']['sn']['cited']==before_a['coverage']['sn']['cited']
 assert a['coverage']['sn']['cited_aligned']==before_a['coverage']['sn']['cited_aligned']-1
 assert {k:v for k,v in a['coverage'].items() if k!='sn'}=={k:v for k,v in before_a['coverage'].items() if k!='sn'}
 after={u['id']:u for u in c['units']}
 for u in before_c['units']:
  if u['id'] not in ('sn12.21','sn12.22'):assert after[u['id']]==u
 assert (after['sn12.21']['start'],after['sn12.21']['end'],after['sn12.21']['vri'])==(143,146,'21')
 assert (after['sn12.22']['start'],after['sn12.22']['end'],after['sn12.22']['vri'])==(146,150,'22')
 assert after['sn12.21']['title']=='Dasabalasuttaṃ' and 'approximate' not in after['sn12.21']
 assert all(after[k]['index_revision']==REVISION for k in ('sn12.21','sn12.22'))
 snapshot=copy.deepcopy((c,a))
 with patch('repair_dasabala_spans.vri.parse',return_value=parsed):second=repair(c,a,root)
 assert second['changed_spans']==[]
 assert second['input_canon_sha256']==second['output_canon_sha256']==report['output_canon_sha256']
 assert second['input_commentary_sha256']==second['output_commentary_sha256']==report['output_commentary_sha256']
 assert (c,a)==snapshot
 for case in ('parity','heading','number','terminal','state','revision','group','commentary','coverage','commit','both_commits'):
  bad_c=copy.deepcopy(before_c);bad_a=copy.deepcopy(before_a);p=copy.deepcopy(parsed)
  if case=='parity':p[-1]['notes'].append('source drift beyond reviewed span')
  if case in ('heading','number','terminal'):
   if case=='heading':p[144]['text']='Wrong heading'
   if case=='number':p[145]['n']='99'
   if case=='terminal':p[149]['text']='Wrong terminal'
   bad_c['books'][bi]['blocks']=[[b['rend'],b['n'],b['text'],b['notes'],{k:[f'{v}.{n}' for v,n in ns] for k,ns in b['pages'].items()}] for b in p]
  if case=='state':next(u for u in bad_c['units'] if u['id']=='sn12.22')['start']=144
  if case=='revision':next(u for u in bad_c['units'] if u['id']=='sn12.21')['index_revision']='unreviewed'
  if case=='group':bad_c['units'][0]['members']=['sn12.21']
  if case=='commentary':bad_a['passages'][3333][4]=21
  if case=='coverage':bad_a['coverage']['sn']['cited']+=1
  if case=='commit':bad_a['source']['commit']='different'
  if case=='both_commits':
   bad_c['source']['commit']='unreviewed';bad_a['source']['commit']='unreviewed'
  untouched=copy.deepcopy((bad_c,bad_a))
  with patch('repair_dasabala_spans.vri.parse',return_value=p):
   try:repair(bad_c,bad_a,root)
   except ValueError:pass
   else:raise AssertionError(case)
  assert (bad_c,bad_a)==untouched,case
print('reviewed ownership, full parity, commentary preservation, idempotence and 11 atomic refusal controls passed')
`], { input: JSON.stringify(input), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /11 atomic refusal controls passed/);
});

test('new SN mapping pins retain authentic edition commit and isolate changed unit locators', () => {
  const d = canon.load();
  for (const key of ['sn12.21', 'sn12.22']) {
    const u = { ...d.byId.get(key), index_revision: 'sn-dasabala-v1' };
    const source = canon.readingSource(u);
    assert.equal(source.commit, d.canon.source.commit);
    assert.equal(source.locator_revision, `${source.commit}-sn-dasabala-v1`);
    assert.notEqual(source.locator_revision, source.commit);
    const old = new URLSearchParams({ uid: key, ref: `${key}/1`, offset: '0', source: source.commit });
    assert.throws(() => assertPositionPin(old, { source }), e => e.code === 'READING_SOURCE_CHANGED');
    const fresh = new URLSearchParams(old); fresh.set('source', source.locator_revision);
    assert.doesNotThrow(() => assertPositionPin(fresh, { source }));
  }
  for (const key of ['sn12.20', 'sn12.23']) {
    assert.equal(canon.readingSource(d.byId.get(key)).locator_revision, undefined);
  }
});

test('source rebuild applies reviewed Dasabala correction after story correction before annotations', () => {
  const source = readFileSync('scripts/canon/build_canon.py', 'utf8');
  assert.ok(source.indexOf('corrected = set(story_spans(b.books, b.units))') < source.indexOf('corrected.update(dasabala_spans(b.books, b.units))'));
  assert.ok(source.indexOf('corrected.update(dasabala_spans(b.books, b.units))') < source.indexOf('b.annotate_pages()', source.indexOf('def main():')));
});
