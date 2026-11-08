import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { verifyQuote } from '../src/verify.mjs';
import { liveCache } from '../src/cache.mjs';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; liveCache.clear(); });
const python = ['python3', 'python'].find(cmd => spawnSync(cmd, ['--version']).status === 0);
const run = (code, input) => spawnSync(python, ['-c', code], {encoding:'utf8', input: JSON.stringify(input), env:{...process.env,PYTHONUTF8:'1'}});

test('the shared Mother page is no longer an individually selectable or verifiable SN 15.14 source', async () => {
  const u = canon.resolve('sn15.14').unit;
  assert.ok(canon.segments(u).some(s => s.text.includes('namātābhūtapubbo')));
  assert.deepEqual(english.available(u), []);
  const url = 'https://www.dhammatalks.org/suttas/SN/SN15_14.html';
  assert.throws(() => canon.resolve(url), /not linked/);
  let calls = 0; globalThis.fetch = async () => { calls++; throw Error('Must not fetch'); };
  await assert.rejects(english.translation(u, 'dt:SN/SN15_14'));
  await assert.rejects(verifyQuote({text:'A being who has not been your daughter',language:'english',texts:['sn15.14'],translation_ids:['dt:SN/SN15_14']}, {fetchTranslation:async()=>{calls++;throw Error('Must not retrieve');}}), /not linked|no English/i);
  assert.equal(calls, 0);
});

test('exclusion evidence pins all six related root units without changing their Pali', () => {
  const row = JSON.parse(readFileSync('scripts/canon/reviewed_exclusions.json','utf8')).exclusions[0];
  const d = canon.load(); assert.equal(row.review.vri_commit, d.canon.source.commit);
  const selected = row.subject_ids.map(id => {const u=canon.resolve(id).unit;return{id,blocks:d.canon.books[u.book].blocks.slice(u.start,u.end)};});
  assert.equal(createHash('sha256').update(JSON.stringify(selected)).digest('hex'), row.review.root_blocks_sha256);
  assert.deepEqual(row.subject_ids, ['sn15.14','sn15.15','sn15.16','sn15.17','sn15.18','sn15.19']);
});

test('post-linker exclusion is global, immutable, idempotent and cannot be bypassed by attaching scope fields', {skip:!python}, () => {
  const r = run(`import sys,json,copy,tempfile,pathlib
sys.path.insert(0,'scripts/canon')
from reviewed_exclusions import apply_reviewed_exclusions,MANIFEST
url='https://www.dhammatalks.org/suttas/SN/SN15_14.html'
a={'other':[{'source':'dhammatalks','url':url+'?test=1','shared_scope':{}},{'source':'ati','url':url.replace('https://www.','http://'),'partial_scope':{}}],'sn15.14':[{'source':'dhammatalks','url':url}],'safe':[{'source':'dhammatalks','url':'https://www.dhammatalks.org/suttas/SN/SN1_71.html'}]}
old=copy.deepcopy(a);out,removed=apply_reviewed_exclusions(a)
assert a==old and len(removed)==3 and list(out)==['safe']
assert apply_reviewed_exclusions(out)==(out,[])
x=json.loads(MANIFEST.read_text());bad=[{},dict(x,version=2),dict(x,exclusions=[]),dict(x,exclusions=x['exclusions']*2)]
for change in [{'url':'https://unreviewed.invalid/file.html'},{'reason':''},{'review':{}}]:
 y=copy.deepcopy(x);y['exclusions'][0].update(change);bad.append(y)
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp)/'manifest.json'
 for y in bad:
  p.write_text(json.dumps(y))
  try:apply_reviewed_exclusions(a,p)
  except ValueError:pass
  else:raise AssertionError('Invalid exclusion accepted')
  assert a==old
print('passed')`, {});
  assert.equal(r.status,0,r.stderr); assert.match(r.stdout,/passed/);
});

test('the ordinary translation builder cannot recreate the reviewed bad binding and preserves a control source', {skip:!python}, () => {
  const units = ['sn15.14','sn15.15','sn15.16','sn15.17','sn15.18','sn15.19','sn1.71'].map(id => canon.resolve(id).unit);
  const r = run(`import sys,json,tempfile,pathlib,gzip,subprocess
x=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp)
 with gzip.open(p/'canon.gz','wt',encoding='utf-8') as f:json.dump({'units':x},f)
 pages=[{'url':'https://www.dhammatalks.org/suttas/SN/SN15_14.html','title':'SN 15:14–19 Mother | Mātu Sutta | sutta on dhammatalks.org'},{'url':'https://www.dhammatalks.org/suttas/SN/SN1_71.html','title':'SN 1:71 Having Killed | Chetvā Sutta | sutta on dhammatalks.org'}]
 (p/'dt.json').write_text(json.dumps(pages));(p/'ati.json').write_text('[]')
 a=subprocess.run([sys.executable,'scripts/canon/build_translations.py',str(p/'canon.gz'),str(p/'dt.json'),str(p/'ati.json'),str(p/'out.json')],capture_output=True,text=True,encoding='utf-8')
 assert a.returncode==0,a.stderr
 out=json.loads((p/'out.json').read_text());assert list(out)==['sn1.71'],out
 assert out['sn1.71'][0]['source']=='dhammatalks'
 assert 'reviewed_exclusions' in a.stdout and 'SN15_14.html' in a.stdout
print('passed')`, units);
  assert.equal(r.status,0,r.stderr); assert.match(r.stdout,/passed/);
});
