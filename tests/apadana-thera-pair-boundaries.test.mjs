import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { gunzipSync, gzipSync } from 'node:zlib';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readBundled } from '../src/bundled-data.mjs';
import { canonBeforeTheraPair, THERA_PAIR_REVISION, PRE_THERA_PAIR_SHA256 } from './helpers/canon-before-thera-pair.mjs';

const python = ['python3', 'python'].find(cmd => spawnSync(cmd, ['--version']).status === 0);
const sourceRoot = process.env.VRI_SOURCE_CHECKOUT;
const loaded = () => JSON.parse(gunzipSync(readBundled('server/data/canon.json.gz')));
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const corrected = c => {
  const out = structuredClone(c);
  Object.assign(out.units.find(u => u.id === 'tha-ap107'), { end: 5248, vri: '24–28', index_revision: THERA_PAIR_REVISION });
  Object.assign(out.units.find(u => u.id === 'tha-ap108'), { start: 5248, vri: '29–35', index_revision: THERA_PAIR_REVISION });
  return out;
};

test('independently pinned inverse preserves pre-pair hash and unrelated deliberate mutations; mixed or tampered pair refuses', () => {
  const data = loaded(), historical = canonBeforeTheraPair(data);
  assert.equal(sha(historical), PRE_THERA_PAIR_SHA256);
  const fixture = { source: data.source, units: historical.units.filter(u => ['tha-ap107', 'tha-ap108', 'mn1'].includes(u.id)), extra: { deliberate: true } };
  const future = corrected(fixture);
  assert.deepEqual(canonBeforeTheraPair(future), fixture);
  assert.deepEqual(canonBeforeTheraPair(fixture), fixture);
  future.units.find(u => u.id === 'mn1').start++;
  future.extra.deliberate = 'preserved';
  const inverse = canonBeforeTheraPair(future);
  assert.equal(inverse.units.find(u => u.id === 'mn1').start, future.units.find(u => u.id === 'mn1').start);
  assert.equal(inverse.extra.deliberate, 'preserved');
  assert.equal(future.units.find(u => u.id === 'tha-ap107').end, 5248);
  const mutations = [
    c => { c.units = c.units.filter(u => u.id !== 'tha-ap107'); },
    c => c.units.push(structuredClone(c.units.find(u => u.id === 'tha-ap107'))),
    c => { c.units.find(u => u.id === 'tha-ap107').end++; },
    c => { delete c.units.find(u => u.id === 'tha-ap107').index_revision; },
    c => { c.units.find(u => u.id === 'tha-ap108').vri = '30–35'; },
    c => { c.units.find(u => u.id === 'tha-ap108').pts.end_page++; },
    c => { c.units.find(u => u.id === 'tha-ap108').pts.volume = true; },
    c => { c.units.find(u => u.id === 'tha-ap108').title += 'ṃ'; },
    c => { c.units.find(u => u.id === 'tha-ap107').unreviewed = false; },
    c => { c.source.commit = 'unreviewed'; },
    c => { c.units[c.units.findIndex(u => u.id === 'tha-ap107')] = fixture.units.find(u => u.id === 'tha-ap107'); },
    c => { c.units[c.units.findIndex(u => u.id === 'tha-ap108')] = fixture.units.find(u => u.id === 'tha-ap108'); },
  ];
  for (const mutate of mutations) {
    const c = structuredClone(future); mutate(c); const before = structuredClone(c);
    assert.throws(() => canonBeforeTheraPair(c), /Therā|reviewed/);
    assert.deepEqual(c, before);
  }
});

test('finite pair gate is atomic, source-conserving, idempotent and rejects drift before mutation', { skip: !python }, () => {
  const c = canonBeforeTheraPair(loaded());
  c.books = c.books.map((book, i) => i === 36 ? book : { ...book, blocks: [] });
  c.units = c.units.filter(u => u.book === 36 || u.id === 'mn1');
  const result = spawnSync(python, ['-c', `
import copy,json,sys
sys.path.insert(0,'scripts/canon')
from apadana_thera_pair_spans import *
c=json.load(sys.stdin)
parsed=[]
for rend,n,text,notes,pages in c['books'][36]['blocks']:
 parsed.append(dict(rend=rend,n=n,text=text,notes=notes,pages={k:[tuple(map(int,p.split('.'))) for p in ps] for k,ps in pages.items()}))
books=[dict(b,blocks=parsed)if i==36 else b for i,b in enumerate(c['books'])]
original=copy.deepcopy(c);old=copy.deepcopy(c['units'])
assert apadana_thera_pair_spans(books,c['units'])==list(TARGETS)
assert paired_state(c['units'])=='new'
assert canon_before_thera_pair(c)==original
assert digest(canon_before_thera_pair(c))==digest(original)
assert books[36]['blocks']==parsed
assert [x for x in c['units']if x['id']not in TARGETS]==[x for x in old if x['id']not in TARGETS]
assert c['books']==original['books']
assert [i for u in c['units']if u['id']in TARGETS for i in range(u['start'],u['end'])]==list(range(5231,5271))
assert apadana_thera_pair_spans(books,c['units'])==[]
for key in TARGETS:
 u=next(u for u in c['units']if u['id']==key)
 ns=[b['n']for b in parsed[u['start']:u['end']]if b['n']]
 assert ns==[str(i)for i in (range(24,29)if key==TARGETS[0]else range(29,36))]
for no_pts in (False,True):
 uu=copy.deepcopy(old)
 if no_pts:
  for u in uu:
   if u['id']in TARGETS:u.pop('pts')
 assert apadana_thera_pair_spans(books,uu)==list(TARGETS)
 for u in uu:
  if u['id']in TARGETS:assert ('pts'in u)!=no_pts
cases=['root_word','root_note','root_page','title','numbering','page','boolean_page','revision','extra','mixed107','mixed108','missing','duplicate','neighbour','owner','group','book']
for case in cases:
 bb=copy.deepcopy(books);uu=copy.deepcopy(old);by={u['id']:u for u in uu}
 if case=='root_word':bb[36]['blocks'][5248]['text']='unreviewed'
 if case=='root_note':bb[36]['blocks'][-1]['notes'].append('unreviewed')
 if case=='root_page':bb[36]['blocks'][-1]['pages']['P']=[(99,999)]
 if case=='title':by['tha-ap108']['title']+='ṃ'
 if case=='numbering':by['tha-ap107']['vri']='24–28'
 if case=='page':by['tha-ap108']['pts']['end_page']=999
 if case=='boolean_page':by['tha-ap108']['pts']['volume']=True
 if case=='revision':by['tha-ap107']['index_revision']='unreviewed'
 if case=='extra':by['tha-ap107']['unreviewed']=False
 if case in ('mixed107','mixed108'):
  key='tha-ap107'if case=='mixed107'else'tha-ap108';by[key].clear();by[key].update(copy.deepcopy(NEW_UNITS[key]))
 if case=='missing':uu.remove(by['tha-ap107'])
 if case=='duplicate':uu.append(copy.deepcopy(by['tha-ap107']))
 if case=='neighbour':by['tha-ap106']['end']+=1
 if case=='owner':by['mn1']['shares_passage_with']='tha-ap107'
 if case=='group':by['mn1']['members']=['tha-ap108']
 if case=='book':bb.append(copy.deepcopy(bb[36]))
 before=copy.deepcopy((bb,uu))
 try:apadana_thera_pair_spans(bb,uu)
 except ValueError:pass
 else:raise AssertionError(case)
 assert (bb,uu)==before,case
# The inverse independently pins all target fields even if unrelated units vary.
for case in ('old','new'):
 cc=copy.deepcopy(original)
 if case=='new':apadana_thera_pair_spans(books,cc['units'])
 next(u for u in cc['units']if u['id']=='mn1')['start']+=1
 assert next(u for u in canon_before_thera_pair(cc)['units']if u['id']=='mn1')['start']==next(u for u in cc['units']if u['id']=='mn1')['start']
assert apadana_thera_pair_spans([],[])==[]
print('17 refusal controls, full root conservation, build pre-annotation and idempotence passed')
`], { input: JSON.stringify(c), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /17 refusal controls/);
});

test('monthly source rebuild applies atomic pair after earlier repairs and before page annotation', () => {
  const text = readFileSync('scripts/canon/build_canon.py', 'utf8');
  const call = text.indexOf('corrected.update(apadana_thera_pair_spans(b.books, b.units))');
  assert.ok(call > text.indexOf('corrected.update(apadana_thera_spans(b.books, b.units))'));
  assert.ok(call < text.indexOf('b.annotate_pages()', text.indexOf('def main():')));
});

test('optional complete original XML replay checks strict freshness, all source wording and idempotence', { skip: !python || !sourceRoot }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'pali-thera-pair-original-'));
  try {
    writeFileSync(join(dir, 'canon.gz'), gzipSync(JSON.stringify(canonBeforeTheraPair(loaded()))));
    writeFileSync(join(dir, 'commentary.gz'), readBundled('server/data/commentary.json.gz'));
    const result = spawnSync(python, ['-c', `
import copy,gzip,json,os,sys,tempfile
sys.path.insert(0,'scripts/canon')
from repair_apadana_thera_pair_spans import repair,digest,FILE,ATT
from apadana_thera_pair_spans import TARGETS,canon_before_thera_pair,PRE_PAIR_SHA256
directory,root=sys.argv[1:]
with gzip.open(os.path.join(directory,'canon.gz'),'rt')as f:c=json.load(f)
with gzip.open(os.path.join(directory,'commentary.gz'),'rt')as f:a=json.load(f)
original=copy.deepcopy(c);att=copy.deepcopy(a);report=repair(c,a,root)
assert report['changed_spans']==list(TARGETS)and report['commentary_changes']=={}
assert a==att and report['input_commentary_sha256']==report['output_commentary_sha256']
assert canon_before_thera_pair(c)==original and digest(canon_before_thera_pair(c))==PRE_PAIR_SHA256
assert len(c['books'])==61 and len(c['units'])==8544
assert {k:v for k,v in c.items()if k!='units'}=={k:v for k,v in original.items()if k!='units'}
assert [u for u in c['units']if u['id']not in TARGETS]==[u for u in original['units']if u['id']not in TARGETS]
snapshot=copy.deepcopy(c);again=repair(c,a,root)
assert c==snapshot and a==att and again['changed_spans']==[]
assert report['output_canon_sha256']==again['output_canon_sha256']
for target in ('canon','commentary'):
 cc=copy.deepcopy(original);aa=copy.deepcopy(att)
 if target=='canon':cc['units'][0]['title']+=' unreviewed'
 else:aa['passages'][0][-1]+=1
 before=copy.deepcopy((cc,aa))
 try:repair(cc,aa,root)
 except ValueError:pass
 else:raise AssertionError('stale '+target)
 assert (cc,aa)==before
# The original raw Git blobs are mandatory, independently of parsed parity.
for filename in (FILE,ATT):
 with tempfile.TemporaryDirectory()as badroot:
  os.mkdir(os.path.join(badroot,'romn'))
  for name in (FILE,ATT):
   target=os.path.join(badroot,'romn',name)
   if name==filename:
    with open(target,'wb')as f:f.write(b'Unreviewed raw XML; must refuse before parsing')
   else:os.symlink(os.path.join(root,'romn',name),target)
  cc=copy.deepcopy(original);aa=copy.deepcopy(att);before=copy.deepcopy((cc,aa))
  try:repair(cc,aa,badroot)
  except ValueError as error:assert 'Git blob differs'in str(error)
  else:raise AssertionError('raw Git blob '+filename)
  assert (cc,aa)==before
print(json.dumps(dict(status='original XML and complete datasets verified',output_canon_sha256=report['output_canon_sha256'],associations=report['commentary_associations'])))
`, dir, sourceRoot], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /original XML and complete datasets verified/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
