import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as commentary from '../src/commentary.mjs';

test('Yasoja opening commentary precedes its later verses and stays out of Vassika', () => {
  const d = commentary.load();
  const refs = d.units['thag3.9'].map(i => d.passages[i]);
  assert.deepEqual(refs.map(p => p.slice(4, 6)), [[243, 243], [244, 245]]);
  assert.deepEqual(refs[0].slice(6, 9), [11, 8, 'paragraph+lemma']);
  const read = commentary.getCommentary('Thag 3.9', { limit: 100 });
  assert.match(read.segments[0].text, /Yasojattheragāthāvaṇṇanā/);
  assert.match(read.segments.map(s => s.text).join(' '), /Kālapabbaṅgasaṅkāso/);
  assert.equal(read.segments[0].comments_on_vri_paragraphs, '243');
  const second = read.segments.findIndex(s => s.comments_on_vri_paragraphs === '244–245');
  assert.ok(second > 0);
  assert.ok(read.segments.slice(second).every(s => s.comments_on_vri_paragraphs === '244–245'));
  assert.doesNotMatch(commentary.getCommentary('Thag 3.8', { limit: 100 }).segments.map(s => s.text).join(' '), /Yasojattheragāthāvaṇṇanā|Kālapabbaṅgasaṅkāso/);
});

const python = ['python3', 'python'].find(cmd => spawnSync(cmd, ['--version']).status === 0);
test('commentary repair preserves unrelated identities and rejects unreviewed deltas atomically', { skip: !python }, () => {
  const result = spawnSync(python, ['-c', `
import copy,sys
sys.path.insert(0,'scripts/canon')
import repair_yasoja_commentary as m
p=list(m.OPENING)
old={'source':{'commit':m.COMMIT},'books':[{'file':'other'},{'file':m.FILE,'blocks':['unchanged']}],
'passages':[[0,0,1,0,1,1,0,0,'paragraph',0,1],[1,4962,4972,34,244,245,5,5,'paragraph+lemma',0,4393],[2,1,2,1,2,2,0,0,'paragraph',0,2]],
'units':{'other':[0,2],'thag3.9':[1]},'coverage':{'thag':{'with_commentary':1}},'cited_unaligned':[]}
new={'source':copy.deepcopy(old['source']),'books':[copy.deepcopy(old['books'][1])],
'passages':[[0,*p],[0,*old['passages'][1][1:]]],'units':{'thag3.9':[0,1]}}
frozen=copy.deepcopy(old); repaired=m.repair(old,new)
assert old==frozen
assert repaired['units']=={'other':[0,3],'thag3.9':[1,2]}
assert [repaired['passages'][i] for i in repaired['units']['other']]==[old['passages'][i] for i in old['units']['other']]
assert repaired['coverage']==old['coverage'] and repaired['books']==old['books']
assert m.repair(repaired,new)==repaired
for kind in ['source','blocks','evidence','ownership','removal','reordered']:
 bad=copy.deepcopy(new)
 if kind=='reordered': bad['passages'].reverse();bad['units']['thag3.9']=[1,0]
 if kind=='source': bad['source']['commit']='wrong'
 if kind=='blocks': bad['books'][0]['blocks']=['changed']
 if kind=='evidence': bad['passages'][0][7]=7
 if kind=='ownership': bad['units']['thag3.8']=[0]
 if kind=='removal': bad['passages']=bad['passages'][:1];bad['units']['thag3.9']=[0]
 try: m.repair(old,bad)
 except ValueError: pass
 else: raise AssertionError(kind)
 assert old==frozen
`], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
