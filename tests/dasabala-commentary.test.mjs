import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { readBundled } from '../src/bundled-data.mjs';
const python = ['python3', 'python'].find(cmd => spawnSync(cmd, ['--version']).status === 0);

test('short Dasabala commentary migration derives natural evidence and preserves every prior passage atomically', { skip: !python }, () => {
  const c = JSON.parse(gunzipSync(readBundled('server/data/canon.json.gz')));
  const a = JSON.parse(gunzipSync(readBundled('server/data/commentary.json.gz')));
  // Full reviewed source books; unrelated wording need not be copied in each
  // negative fixture. Unrelated units/mappings remain immutability controls.
  c.books = c.books.map((b, i) => i === 12 ? b : { ...b, blocks: [] });
  c.units = c.units.filter(u => u.collection === 'sn' || u.id === 'mn1');
  a.books = a.books.map((b, i) => i === 10 ? b : { ...b, blocks: [] });
  const result = spawnSync(python, ['-c', `
import copy,json,os,sys,tempfile
from unittest.mock import patch
sys.path.insert(0,'scripts/canon')
from repair_dasabala_commentary import repair,TUPLE
from repair_dasabala_spans import digest
sys.stdin.reconfigure(encoding='utf-8')
payload=json.load(sys.stdin);c=payload['canon'];a=payload['commentary']
# Reconstruct only this migration's historical association state, not any
# source wording, permission, translation registry or corpus boundary.
matching=[i for i,p in enumerate(a['passages']) if p==TUPLE]
assert len(matching)<=1
if matching:
 i=matching[0];a['passages'].pop(i)
 a['units']={k:[v-(v>i) for v in vs if v!=i] for k,vs in a['units'].items() if k!='sn12.21'}
else:a['units'].pop('sn12.21',None)
if 'sn12.21' not in a['cited_unaligned']:a['cited_unaligned'].append('sn12.21')
a['coverage']['sn']={'texts':1954,'with_commentary':1799,'cited':1800,'cited_aligned':1799}
parsed=[]
for rend,n,text,pages in a['books'][10]['blocks']:
 parsed.append(dict(rend=rend,n=n,text=text,pages={'P':[tuple(map(int,p.split('.'))) for p in pages]} if pages else {},bold=[],divs=[{'id':'sn2'},{'id':'sn2_1'}]))
with tempfile.TemporaryDirectory() as root:
 os.mkdir(os.path.join(root,'romn'))
 with open(os.path.join(root,'romn','s0302a.att.xml'),'wb') as f:f.write(b'offline parser fixture; not actual source evidence')
 before_c=copy.deepcopy(c);before_a=copy.deepcopy(a)
 with patch('repair_dasabala_commentary.vri.parse',return_value=copy.deepcopy(parsed)):r=repair(c,a,root)
 assert r['changed'] and r['passage']==TUPLE
 assert c==before_c
 assert a['books']==before_a['books']
 assert a['passages'][:-1]==before_a['passages'] and a['passages'][-1]==TUPLE
 assert a['units']['sn12.21']==[len(before_a['passages'])]
 assert {k:v for k,v in a['units'].items() if k!='sn12.21'}==before_a['units']
 assert a['cited_unaligned']==[k for k in before_a['cited_unaligned'] if k!='sn12.21']
 assert a['coverage']['sn']=={'texts':1954,'with_commentary':1800,'cited':1800,'cited_aligned':1800}
 assert {k:v for k,v in a['coverage'].items() if k!='sn'}=={k:v for k,v in before_a['coverage'].items() if k!='sn'}
 assert r['input_canon_sha256']==r['output_canon_sha256']==digest(c)
 assert r['input_commentary_sha256']==digest(before_a) and r['output_commentary_sha256']==digest(a)
 snapshot=copy.deepcopy(a)
 with patch('repair_dasabala_commentary.vri.parse',return_value=copy.deepcopy(parsed)):again=repair(c,a,root)
 assert not again['changed'] and a==snapshot
 assert again['input_commentary_sha256']==again['output_commentary_sha256']==r['output_commentary_sha256']
 for case in ['source_drift','body_drift','root_drift','boundary','pin','prior_binding','duplicate','overlap','counts','commit','neighbour','lemma']:
  badc=copy.deepcopy(before_c);bada=copy.deepcopy(before_a);p=copy.deepcopy(parsed)
  if case=='source_drift':p[-1]['text']+=' Source drift outside reviewed paragraph.'
  if case=='body_drift':
   p[154]['text']='Synthetic wrong short paragraph';bada['books'][10]['blocks'][154][2]=p[154]['text']
  if case=='root_drift':badc['books'][12]['blocks'][-1][2]+=' Source drift elsewhere.'
  if case=='boundary':next(u for u in badc['units'] if u['id']=='sn12.21')['end']=150
  if case=='pin':next(u for u in badc['units'] if u['id']=='sn12.22')['index_revision']='wrong'
  if case=='prior_binding':bada['units']['sn12.21']=[3334]
  if case=='duplicate':bada['passages']+= [TUPLE[:],TUPLE[:]]
  if case=='overlap':
   other=TUPLE[:];other[8]='paragraph+heading';bada['passages'].append(other)
  if case=='counts':bada['coverage']['sn']['cited']+=1
  if case=='commit':badc['source']['commit']=bada['source']['commit']='unreviewed'
  if case=='neighbour':bada['units']['sn12.22']=[3333]
  if case=='lemma':p[154]['bold']=['Synthetic metadata change']
  untouched=copy.deepcopy((badc,bada))
  with patch('repair_dasabala_commentary.vri.parse',return_value=p):
   try:repair(badc,bada,root)
   except ValueError:pass
   else:raise AssertionError(case)
  assert (badc,bada)==untouched,case
print('natural tuple, unchanged prior passages/books/associations, exact receipts, idempotence and 12 atomic refusal controls passed')
`], { input: JSON.stringify({ canon: c, commentary: a }), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /12 atomic refusal controls passed/);
});
