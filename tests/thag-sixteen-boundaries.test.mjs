import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readBundled } from '../src/bundled-data.mjs';

const python = ['python3', 'python'].find(cmd => spawnSync(cmd, ['--version']).status === 0);
const sourceRoot = process.env.VRI_SOURCE_CHECKOUT;
const expectedRoots = {
  'thag16.3': '03b63fd958c92cb84d64815f0bb69b2b1c64dcc355da1054865c760d854b2163', 'thag16.4': '7981cb03e231e1a351ab7c551f57ffcda88ce699cd743e32559fd8d8cc1815ba', 'thag16.5': '729a74c8b50b10f425578e81e55ad5513d8aaf697e55855d4cb7b1bc01ce7c6d',
};

test('two Thag16.4 cuts and all three locator revisions are atomic, source-exact and preserve every commentary owner', { skip: !python }, () => {
  const input = {
    canon: JSON.parse(gunzipSync(readBundled('server/data/canon.json.gz'))),
    commentary: JSON.parse(gunzipSync(readBundled('server/data/commentary.json.gz'))),
  };
  input.canon.books = input.canon.books.map((b, i) => i === 34 ? b : { ...b, blocks: [] });
  input.canon.units = input.canon.units.filter(u => u.book === 34 || u.id === 'mn1');
  input.commentary.books = input.commentary.books.map((b, i) => i === 26 ? b : { ...b, blocks: [] });
  const result = spawnSync(python, ['-c', `
import copy,hashlib,json,os,sys,tempfile
from unittest.mock import patch
sys.path.insert(0,'scripts/canon')
from thag_sixteen_spans import thag_sixteen_spans,REVISION,FILE,TARGETS,SPANS
from repair_thag_sixteen_spans import repair,digest,ATT,BINDINGS
sys.stdin.reconfigure(encoding='utf-8')
x=json.load(sys.stdin);c=x['canon'];a=x['commentary'];by={u['id']:u for u in c['units']}
old_pages={'thag16.3':(73,75),'thag16.4':(75,77),'thag16.5':(77,78)}
# Reproduce the actual historical metadata, even after integration.
for key in TARGETS:
 lo,hi=SPANS[key][:2];u=by[key];u.update(start=lo,end=hi);u.pop('index_revision',None)
 ns=[b[1]for b in c['books'][34]['blocks'][lo:hi]if b[1]];u['vri']=ns[0]+'–'+ns[-1]
 page,end_page=old_pages[key];u['pts']={'volume':0,'page':page,'end_page':end_page}
p=[]
for rend,n,text,notes,pages in c['books'][34]['blocks']:
 ps={k:[tuple(map(int,p.split('.')))for p in values]for k,values in pages.items()}
 p.append(dict(rend=rend,n=n,text=text,notes=copy.deepcopy(notes),pages=ps,page_offsets={k:[0]*len(v)for k,v in ps.items()}))
q=[]
for rend,n,text,pages in a['books'][26]['blocks']:
 q.append(dict(rend=rend,n=n,text=text,notes=[],pages={'P':[tuple(map(int,p.split('.')))for p in pages]}if pages else {}))
# Control-flow fixtures only. The optional source replay separately verifies
# both unmodified original Git blobs and every complete-book source block.
raw={FILE:b'Thag root offline fixture, not source evidence',ATT:b'Thag commentary offline fixture, not source evidence'}
blobs={k:hashlib.sha1(b'blob '+str(len(v)).encode()+b'\\0'+v).hexdigest()for k,v in raw.items()}
with tempfile.TemporaryDirectory()as root:
 os.mkdir(os.path.join(root,'romn'))
 for name,value in raw.items():
  with open(os.path.join(root,'romn',name),'wb')as f:f.write(value)
 def run(cc,aa,pp=p,qq=q):
  with patch('repair_thag_sixteen_spans.vri.parse',side_effect=lambda path:pp if path.endswith(FILE)else qq),patch('repair_thag_sixteen_spans.BLOB',blobs[FILE]),patch('repair_thag_sixteen_spans.ATT_BLOB',blobs[ATT]):return repair(cc,aa,root)
 before_c=copy.deepcopy(c);before_a=copy.deepcopy(a);report=run(c,a)
 assert report['changed_spans']==list(TARGETS)
 assert report['input_canon_sha256']==digest(before_c)and report['output_canon_sha256']==digest(c)
 assert report['input_commentary_sha256']==report['output_commentary_sha256']==digest(a)
 assert a==before_a and c['books']==before_c['books']
 assert {k:v for k,v in c.items()if k!='units'}=={k:v for k,v in before_c.items()if k!='units'}
 after={u['id']:u for u in c['units']}
 for u in before_c['units']:
  if u['id']not in TARGETS:assert after[u['id']]==u
 for key in TARGETS:
  lo,hi,first,last=SPANS[key][2:6];u=after[key]
  assert (u['start'],u['end'],u['vri'],u['index_revision'])==(lo,hi,f'{first}–{last}',REVISION)
  assert u['title']==by[key]['title']
 assert report['commentary']['accepted_book_passages_checked']==439
 assert report['commentary']['target_associations']==BINDINGS
 assert {k:report['units'][k]['root_sha256']for k in TARGETS}==x['roots']
 # A separate Mālukyaputta poem has an identical heading in nipāta6.
 assert after['thag6.5']==by['thag6.5']
 snapshot=copy.deepcopy((c,a));again=run(c,a)
 assert again['changed_spans']==[]and(c,a)==snapshot
 assert again['input_canon_sha256']==again['output_canon_sha256']==report['output_canon_sha256']
 cases=('root_notes','root_pages','att_wording','att_pages','heading','duplicate_heading','other_malukyaputta','nipata','number','number_rend','colophon','neighbour','title','foreign_revision','group','shared','overlapping_owner','canon_commit','att_commit','passage_tuple','target_association','other_association','commentary_heading','root_segment','vri_metadata','pts_metadata','missing_unit','duplicate_unit')
 for case in cases:
  cc=copy.deepcopy(before_c);aa=copy.deepcopy(before_a);pp=copy.deepcopy(p);qq=copy.deepcopy(q);uu={u['id']:u for u in cc['units']}
  if case=='root_notes':pp[-1]['notes'].append('Unreviewed source drift')
  if case=='root_pages':pp[-1]['pages']['P']=[(99,999)]
  if case=='att_wording':qq[-1]['text']='Unreviewed source drift'
  if case=='att_pages':qq[-1]['pages']['P']=[(99,999)]
  if case in('heading','duplicate_heading','other_malukyaputta','nipata','number','number_rend','colophon'):
   if case=='heading':pp[3041]['text']='4. Other poem'
   if case=='duplicate_heading':pp[3043].update(rend='subhead',text=pp[3041]['text'])
   if case=='other_malukyaputta':pp[1795]['text']='5. Other poem'
   if case=='nipata':pp[2842]['text']='Other nipata'
   if case=='number':pp[3042]['n']='770'
   if case=='number_rend':pp[3042]['rend']='bodytext'
   if case=='colophon':pp[3117]['text']='Other identity'
   cc['books'][34]['blocks']=[[b['rend'],b['n'],b['text'],b['notes'],{k:[f'{v}.{n}'for v,n in ps]for k,ps in b['pages'].items()}]for b in pp]
  if case=='neighbour':uu['thag16.2']['end']+=1
  if case=='title':uu['thag16.4']['title']='A fuzzy title'
  if case=='foreign_revision':uu['thag16.4']['index_revision']='unreviewed'
  if case=='group':uu['mn1']['members']=['thag16.4']
  if case=='shared':uu['mn1']['shares_passage_with']='thag16.4'
  if case=='overlapping_owner':uu['mn1'].update(book=34,start=3041,end=3045)
  if case=='canon_commit':cc['source']['commit']='unknown'
  if case=='att_commit':aa['source']['commit']='unknown'
  if case=='passage_tuple':aa['passages'][8212][4]=769
  if case=='target_association':aa['units']['thag16.4'].append(8211)
  if case=='other_association':aa['units']['thag16.2'].remove(8208)
  if case=='commentary_heading':
   qq[3405]['text']='Other commentary owner'
   aa['books'][26]['blocks']=[[b['rend'],b['n'],b['text'],[f'{v}.{p}'for v,p in b['pages'].get('P',[])]]for b in qq]
  if case=='root_segment':aa['passages'][8208][9]=-1
  if case=='vri_metadata':uu['thag16.4']['vri']='769–793'
  if case=='pts_metadata':uu['thag16.4']['pts']['page']=1
  if case=='missing_unit':cc['units'].remove(uu['thag16.4'])
  if case=='duplicate_unit':cc['units'].append(copy.deepcopy(uu['thag16.4']))
  untouched=copy.deepcopy((cc,aa))
  try:run(cc,aa,pp,qq)
  except ValueError:pass
  else:raise AssertionError(case)
  assert(cc,aa)==untouched,case
 for mask in range(1,(1<<len(TARGETS))-1):
  cc=copy.deepcopy(before_c);aa=copy.deepcopy(before_a);uu={u['id']:u for u in cc['units']}
  for i,key in enumerate(TARGETS):
   if mask&(1<<i):uu[key].update(start=SPANS[key][2],end=SPANS[key][3],index_revision=REVISION)
  untouched=copy.deepcopy((cc,aa))
  try:run(cc,aa)
  except ValueError:pass
  else:raise AssertionError('partial migration '+str(mask))
  assert(cc,aa)==untouched
 for target in('BLOB','ATT_BLOB'):
  cc=copy.deepcopy(before_c);aa=copy.deepcopy(before_a);untouched=copy.deepcopy((cc,aa))
  try:
   with patch('repair_thag_sixteen_spans.BLOB',blobs[FILE]),patch('repair_thag_sixteen_spans.ATT_BLOB',blobs[ATT]),patch('repair_thag_sixteen_spans.'+target,'unreviewed'),patch('repair_thag_sixteen_spans.vri.parse',side_effect=lambda path:p if path.endswith(FILE)else q):repair(cc,aa,root)
  except ValueError:pass
  else:raise AssertionError(target)
  assert(cc,aa)==untouched
 assert thag_sixteen_spans([],[])==[]
print('source parity, complete preservation, idempotence, 30 refusal controls and all6partial states passed')
`], { input: JSON.stringify({ ...input, roots: expectedRoots }), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /all6partial states passed/);
});

test('optional original-XML replay preserves all61books,8541otherunits and complete commentary with deterministic outputs', { skip: !python || !sourceRoot }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'pali-thag-original-'));
  try {
    writeFileSync(join(dir, 'canon.json.gz'), readBundled('server/data/canon.json.gz'));
    writeFileSync(join(dir, 'commentary.json.gz'), readBundled('server/data/commentary.json.gz'));
    const result = spawnSync(python, ['-c', `
import copy,gzip,json,os,sys
sys.path.insert(0,'scripts/canon')
from repair_thag_sixteen_spans import repair,digest
from thag_sixteen_spans import SPANS,TARGETS
from shared_spans import write_gzip
folder,root=sys.argv[1:]
with gzip.open(os.path.join(folder,'canon.json.gz'),'rt',encoding='utf-8')as f:c=json.load(f)
with gzip.open(os.path.join(folder,'commentary.json.gz'),'rt',encoding='utf-8')as f:a=json.load(f)
by={u['id']:u for u in c['units']};pages={'thag16.3':(73,75),'thag16.4':(75,77),'thag16.5':(77,78)}
for key in TARGETS:
 lo,hi=SPANS[key][:2];u=by[key];u.update(start=lo,end=hi);u.pop('index_revision',None)
 ns=[b[1]for b in c['books'][34]['blocks'][lo:hi]if b[1]];u['vri']=ns[0]+'–'+ns[-1]
 page,end_page=pages[key];u['pts']={'volume':0,'page':page,'end_page':end_page}
before=copy.deepcopy(c['units']);outside=digest({k:v for k,v in c.items()if k!='units'});att=digest(a)
r=repair(c,a,root);after={u['id']:u for u in c['units']}
assert r['changed_spans']==list(TARGETS)and len(c['books'])==61 and len(c['units'])==8544
assert len(c['books'][34]['blocks'])==4669 and len(a['books'][26]['blocks'])==6605
assert digest(a)==att and digest({k:v for k,v in c.items()if k!='units'})==outside
assert all(after[u['id']]==u for u in before if u['id']not in TARGETS)
assert r['commentary']['accepted_book_passages_checked']==439
write_gzip(os.path.join(folder,'once.gz'),c);again=repair(c,a,root);write_gzip(os.path.join(folder,'twice.gz'),c)
assert again['changed_spans']==[]and again['input_canon_sha256']==again['output_canon_sha256']==r['output_canon_sha256']
assert open(os.path.join(folder,'once.gz'),'rb').read()==open(os.path.join(folder,'twice.gz'),'rb').read()
print('Original pinned root/commentary full-book parity, 8541 unrelated units and deterministic idempotence verified')
`, dir, sourceRoot], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /8541 unrelated units/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('monthly full source rebuild applies both reviewed cuts after previous repairs and before annotation', () => {
  const source = readFileSync('scripts/canon/build_canon.py', 'utf8');
  const call = source.indexOf('corrected.update(thag_sixteen_spans(b.books, b.units))');
  assert.ok(call > source.indexOf('corrected.update(apadana_thera_spans(b.books, b.units))'));
  assert.ok(call < source.indexOf('b.annotate_pages()', source.indexOf('def main():')));
});
