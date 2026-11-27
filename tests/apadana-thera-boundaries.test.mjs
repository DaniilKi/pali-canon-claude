import {canonBeforeFour} from './helpers/canon-before-four.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {findPython,runPythonFixture} from './helpers/verse-scope-python.mjs';
import {writeSync} from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { readBundled } from '../src/bundled-data.mjs';
import * as canon from '../src/canon.mjs';
import * as commentary from '../src/commentary.mjs';
import { readPassage } from '../src/chatgpt-widget.mjs';
import { assertPositionPin } from '../web/reading-position.mjs';

// Fixed source labels correlate this file with the existing helper's PID/stage
// rows. No source/input/output text or exception messages are logged here.
function boundaryProbeStage(phase){
 const row={schema:'boundary-python-probe-stage-v1',fixture:'thera-boundaries',phase,node_pid:process.pid,platform:process.platform,at_ms:performance.now()};
 writeSync(2,'BOUNDARY_PYTHON_PROBE:'+JSON.stringify(row)+'\n');
}
boundaryProbeStage('start');
const python = await findPython(); // One10s total; only genuine missing commands allow the old local optional skip.
boundaryProbeStage('end');
const revision = 'apadana-thera11-30-v1';
const bounds = {
  'tha-ap19': [2322, 2364, 2322, 2360], 'tha-ap20': [2364, 2408, 2360, 2408],
  'tha-ap23': [2507, 2671, 2507, 2667], 'tha-ap24': [2671, 2834, 2667, 2834],
};

test('both Therā boundary pairs and false commentary ownership change atomically with exact original source parity', { skip: !python, timeout: 125000 }, async () => {
  const input = {
    canon: canonBeforeFour(JSON.parse(gunzipSync(readBundled('server/data/canon.json.gz')))),
    commentary: JSON.parse(gunzipSync(readBundled('server/data/commentary.json.gz'))),
  };
  const bi = input.canon.units.find(u => u.id === 'tha-ap19').book;
  input.canon.books = input.canon.books.map((b, i) => i === bi ? b : { ...b, blocks: [] });
  input.canon.units = input.canon.units.filter(u => u.book === bi || u.id === 'mn1');
  input.commentary.books = input.commentary.books.map((b, i) => i === 28 ? b : { ...b, blocks: [] });
  const result = await runPythonFixture(python, {stage:'thera-boundary-offline',code:`
import copy,hashlib,json,os,sys,tempfile
from unittest.mock import patch
sys.path.insert(0,'scripts/canon')
from apadana_thera_spans import apadana_thera_spans,REVISION,FILE,TARGETS,SPANS
from repair_apadana_thera_spans import repair,digest,ATT,PASSAGE
sys.stdin.reconfigure(encoding='utf-8')
payload=json.load(sys.stdin);c=payload['canon'];a=payload['commentary']
by={u['id']:u for u in c['units']};bi=by['tha-ap19']['book']
# Always exercise the historical defects, even after installed data changes.
for key in TARGETS:
 lo,hi=SPANS[key][:2];by[key].update(start=lo,end=hi);by[key].pop('index_revision',None)
 ns=[b[1] for b in c['books'][bi]['blocks'][lo:hi] if b[1]];by[key]['vri']=ns[0]+'–'+ns[-1]
a['units']['tha-ap19']=[8915,8916,8917,8918]
parsed=[]
for rend,n,text,notes,pages in c['books'][bi]['blocks']:
 ps={k:[tuple(map(int,p.split('.'))) for p in values] for k,values in pages.items()}
 parsed.append(dict(rend=rend,n=n,text=text,notes=copy.deepcopy(notes),pages=ps,page_offsets={k:[0]*len(v) for k,v in ps.items()}))
att=[]
for rend,n,text,pages in a['books'][28]['blocks']:
 att.append(dict(rend=rend,n=n,text=text,notes=[],pages={'P':[tuple(map(int,p.split('.'))) for p in pages]} if pages else {}))
# These offline fixtures verify guard/mutation logic, not source authority.
# Production independently parses both complete original pinned XML blobs.
raw={FILE:b'Thera root offline fixture, not source evidence',ATT:b'Thera commentary offline fixture, not source evidence'}
blobs={k:hashlib.sha1(b'blob '+str(len(v)).encode()+b'\\0'+v).hexdigest() for k,v in raw.items()}
with tempfile.TemporaryDirectory() as root:
 os.mkdir(os.path.join(root,'romn'))
 for name,value in raw.items():
  with open(os.path.join(root,'romn',name),'wb') as f:f.write(value)
 def run(cc,aa,p=parsed,q=att):
  with patch('repair_apadana_thera_spans.vri.parse',side_effect=lambda path:p if path.endswith(FILE) else q),patch('repair_apadana_thera_spans.BLOB',blobs[FILE]),patch('repair_apadana_thera_spans.ATT_BLOB',blobs[ATT]):return repair(cc,aa,root)
 before_c=copy.deepcopy(c);before_a=copy.deepcopy(a);report=run(c,a)
 assert report['changed_spans']==list(TARGETS)
 assert report['commentary_changes']=={'tha-ap19':{'before':[8915,8916,8917,8918],'after':[8915,8916,8917]}}
 assert report['commentary']['accepted_book_passages_checked']==588
 assert report['input_canon_sha256']==digest(before_c) and report['output_canon_sha256']==digest(c)
 assert report['input_commentary_sha256']==digest(before_a) and report['output_commentary_sha256']==digest(a)
 assert {k:v for k,v in c.items() if k!='units'}=={k:v for k,v in before_c.items() if k!='units'}
 assert {k:v for k,v in a.items() if k!='units'}=={k:v for k,v in before_a.items() if k!='units'}
 assert a['units']['tha-ap20']==before_a['units']['tha-ap20']==[8918,8919,8920,8921]
 for key,value in before_a['units'].items():
  if key!='tha-ap19':assert a['units'][key]==value
 after={u['id']:u for u in c['units']}
 for u in before_c['units']:
  if u['id']not in TARGETS:assert after[u['id']]==u
 for key in TARGETS:
  lo,hi,first,last=SPANS[key][2:6];u=after[key]
  assert (u['start'],u['end'],u['vri'],u['index_revision'])==(lo,hi,f'{first}–{last}',REVISION)
  assert u['title']==by[key]['title']
  expected_pages={'tha-ap19':(61,62),'tha-ap20':(62,64),'tha-ap23':(66,70),'tha-ap24':(70,74)}
  page,end_page=expected_pages[key]
  assert u['pts']=={'volume':1,'page':page,'end_page':end_page}
 expected_roots={'tha-ap19':'bedb9a1b62717941fb7a6eb1790e2d1b260db21f45cb0c084ffc0d4661310505','tha-ap20':'9ea073a89739013aa0cb8a36046c822cfd1692525717476cf0c38c66b9bb203b','tha-ap23':'a68bdbe0e1cc8e5f810b17a903fe234a02430782db85d0481f796f9e26dadd1e','tha-ap24':'abe4d1bc9f57a0f187efd0f0d18247113d641a912ad1d6b7854f845194c75a4d'}
 assert {k:report['units'][k]['root_sha256'] for k in TARGETS}==expected_roots
 snapshot=copy.deepcopy((c,a));again=run(c,a)
 assert again['changed_spans']==[] and again['commentary_changes']=={} and (c,a)==snapshot
 assert again['output_canon_sha256']==report['output_canon_sha256'] and again['output_commentary_sha256']==report['output_commentary_sha256']
 cases=('root_notes','root_pages','att_wording','att_pages','heading','number','colophon','recitation','chapter_owner','neighbour','title','foreign_revision','group','shared','source_commit','att_commit','passage_identity','passage_root_segment','passage_heading','att_number','correct_owner','unrelated_association','commentary_only','canon_only','missing_unit','duplicate_unit')
 for case in cases:
  cc=copy.deepcopy(before_c);aa=copy.deepcopy(before_a);p=copy.deepcopy(parsed);q=copy.deepcopy(att);uu={u['id']:u for u in cc['units']}
  if case=='root_notes':p[-1]['notes'].append('unreviewed drift')
  if case=='root_pages':p[-1]['pages']['P']=[(99,999)]
  if case=='att_wording':q[-1]['text']='unreviewed drift'
  if case=='att_pages':q[-1]['pages']['P']=[(99,999)]
  if case in ('heading','number','colophon','recitation','chapter_owner'):
   if case=='heading':p[2360]['text']='8. Other poem'
   if case=='number':p[2361]['n']='98'
   if case=='colophon':p[2358]['text']='Other identity'
   if case=='recitation':p[2359]['text']='Different recitation owner'
   if case=='chapter_owner':p[2507]['rend']='bodytext'
   cc['books'][bi]['blocks']=[[b['rend'],b['n'],b['text'],b['notes'],{k:[f'{v}.{n}'for v,n in ps]for k,ps in b['pages'].items()}]for b in p]
  if case=='neighbour':uu['tha-ap22']['end']+=1
  if case=='title':uu['tha-ap20']['title']='A fuzzy title'
  if case=='foreign_revision':uu['tha-ap19']['index_revision']='unknown'
  if case=='group':uu['mn1']['members']=['tha-ap19']
  if case=='shared':uu['mn1']['shares_passage_with']='tha-ap20'
  if case=='source_commit':cc['source']['commit']='unknown'
  if case=='att_commit':aa['source']['commit']='unknown'
  if case=='passage_identity':aa['passages'][PASSAGE][4]=98
  if case=='passage_root_segment':aa['passages'][PASSAGE][9]=-1
  if case in ('passage_heading','att_number'):
   if case=='passage_heading':q[2237]['text']='Different commentary owner'
   else:q[2293]['n']='98'
   aa['books'][28]['blocks']=[[b['rend'],b['n'],b['text'],[f'{v}.{p}'for v,p in b['pages'].get('P',[])]]for b in q]
  if case=='correct_owner':aa['units']['tha-ap20'].remove(PASSAGE)
  if case=='unrelated_association':aa['units']['tha-ap18'].append(PASSAGE)
  if case=='commentary_only':aa['units']['tha-ap19'].remove(PASSAGE)
  if case=='canon_only':
   for key in TARGETS:uu[key].update(start=SPANS[key][2],end=SPANS[key][3],index_revision=REVISION)
  if case=='missing_unit':cc['units'].remove(uu['tha-ap19'])
  if case=='duplicate_unit':cc['units'].append(copy.deepcopy(uu['tha-ap19']))
  untouched=copy.deepcopy((cc,aa))
  try:run(cc,aa,p,q)
  except ValueError:pass
  else:raise AssertionError(case)
  assert (cc,aa)==untouched,case
 for mask in range(1,(1<<len(TARGETS))-1):
  cc=copy.deepcopy(before_c);aa=copy.deepcopy(before_a);uu={u['id']:u for u in cc['units']}
  for i,key in enumerate(TARGETS):
   if mask&(1<<i):uu[key].update(start=SPANS[key][2],end=SPANS[key][3],index_revision=REVISION)
  untouched=copy.deepcopy((cc,aa))
  try:run(cc,aa)
  except ValueError:pass
  else:raise AssertionError('partial migration '+str(mask))
  assert (cc,aa)==untouched
 for target in ('BLOB','ATT_BLOB'):
  cc=copy.deepcopy(before_c);aa=copy.deepcopy(before_a);untouched=copy.deepcopy((cc,aa))
  try:
   with patch('repair_apadana_thera_spans.BLOB',blobs[FILE]),patch('repair_apadana_thera_spans.ATT_BLOB',blobs[ATT]),patch('repair_apadana_thera_spans.'+target,'unreviewed'),patch('repair_apadana_thera_spans.vri.parse',side_effect=lambda path:parsed if path.endswith(FILE) else att):repair(cc,aa,root)
  except ValueError:pass
  else:raise AssertionError(target)
  assert (cc,aa)==untouched
 assert apadana_thera_spans([],[])==[]
print('source conservation, one association removal, idempotence, 28 refusal controls and all14partial states passed')
`,input}); // Existing helper:120s including owned cleanup,1MiB/output stream,16MiB JSON input.
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /all14partial states passed/);
});

test('all four changed source locators refuse stale saved positions and widget tails before replacement wording', async () => {
  const d = canon.load();
  for (const [key, [oldStart, oldEnd, start, end]] of Object.entries(bounds)) {
    const unit = d.byId.get(key), before = { ...unit };
    const oldSegments = canon.segmentsFromCorpus({ ...unit, start: oldStart, end: oldEnd }, d.canon);
    const currentSegments = canon.segmentsFromCorpus({ ...unit, start, end }, d.canon);
    // A bounded in-memory locator fixture, not source/rights evidence.
    Object.assign(unit, { start, end, index_revision: revision });
    try {
      const source = canon.readingSource(unit), current = `${d.canon.source.commit}-${revision}`;
      assert.equal(source.locator_revision, current);
      for (const ref of [`${key}/1`, oldSegments.at(-1).ref]) {
        const args = new URLSearchParams({ uid: key, ref, offset: String(Number(ref.split('/').at(-1)) - 1), source: d.canon.source.commit });
        assert.throws(() => assertPositionPin(args, { source }), e => e.code === 'READING_SOURCE_CHANGED');
        await assert.rejects(readPassage({ uid: key, segment: ref, english: false, source_commit: d.canon.source.commit }), /locator revision changed/);
      }
      if (oldSegments.length > currentSegments.length) await assert.rejects(readPassage({ uid: key, segment: oldSegments.at(-1).ref, english: false, source_commit: current }), /does not belong/);
      assert.equal((await readPassage({ uid: key, english: false, source_commit: current, limit: 1 })).pali.segments[0].ref, `${key}/1`);
    } finally {
      for (const property of Object.keys(unit)) delete unit[property]; Object.assign(unit, before);
    }
  }
  for (const key of ['tha-ap18', 'tha-ap21', 'tha-ap22', 'tha-ap25', 'tha-ap32']) assert.equal(canon.readingSource(d.byId.get(key)).locator_revision, undefined);
  for (const [key, previous] of [['thi-ap4','apadana-theri45-v1'],['thi-ap21','apadana-theri11-20-v1'],['thi-ap23','apadana-theri21-30-v1'],['thi-ap33','apadana-theri31-40-v1']]) assert.equal(canon.readingSource(d.byId.get(key)).locator_revision, `${d.canon.source.commit}-${previous}`);
});

test('monthly full source rebuild applies the Therā correction after retained repairs and before annotation', () => {
  const source = readFileSync('scripts/canon/build_canon.py', 'utf8');
  const call = source.indexOf('corrected.update(apadana_thera_spans(b.books, b.units))');
  assert.ok(call > source.indexOf('corrected.update(apadana_fourth_spans(b.books, b.units))'));
  assert.ok(call < source.indexOf('b.annotate_pages()', source.indexOf('def main():')));
});

test('removing only Upasena’s false commentary tail preserves earlier refs and all Raṭṭhapāla wording', async () => {
  const data = commentary.load(), original = data.units['tha-ap19'];
  // Reproduce old and corrected association lists in this process only;
  // original-XML source authority is checked separately by the repair replay.
  try {
    data.units['tha-ap19'] = [8915, 8916, 8917, 8918];
    const old = commentary.getCommentary('tha-ap19', { limit: 1000 });
    const correctOwner = commentary.getCommentary('tha-ap20', { limit: 1000 });
    data.units['tha-ap19'] = [8915, 8916, 8917];
    const current = commentary.getCommentary('tha-ap19', { limit: 1000 });
    assert.ok(current.total_segments > 0 && current.total_segments < old.total_segments);
    assert.deepEqual(current.segments, old.segments.slice(0, current.total_segments));
    assert.deepEqual(commentary.getCommentary('tha-ap20', { limit: 1000 }).segments, correctOwner.segments);
    for (const tail of [`tha-ap19/c${current.total_segments + 1}`, `tha-ap19/c${old.total_segments}`]) {
      assert.throws(() => commentary.getCommentary(tail), /segment does not exist/);
      await assert.rejects(readPassage({ commentary: tail, english: false }), /segment does not exist/);
    }
    assert.equal(commentary.getCommentary('tha-ap19/c1').segments[0].ref, 'tha-ap19/c1');
  } finally {
    data.units['tha-ap19'] = original;
  }
});
