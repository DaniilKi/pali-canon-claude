import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as canon from '../src/canon.mjs';
import { readBundled } from '../src/bundled-data.mjs';
import { gunzipSync } from 'node:zlib';

test('all 136 Vv/Pv stories begin at their own heading and stop before the next story', () => {
  const d = canon.load();
  for (const [collection, count] of [['vv', 85], ['pv', 51]]) {
    const units = d.canon.units.filter((u) => u.collection === collection);
    assert.equal(units.length, count);
    const blocks = d.canon.books[units[0].book].blocks;
    const heads = blocks.flatMap((b, i) => b[0] === 'subhead' ? [i] : []);
    assert.equal(heads.length, count);
    for (let n = 1; n <= count; n++) {
      const u = d.byId.get(`${collection}${n}`);
      assert.equal(u.start, heads[n - 1], u.id);
      assert.equal(u.end, heads[n] ?? blocks.length, u.id);
      assert.equal(blocks.slice(u.start, u.end).filter((b) => b[0] === 'subhead').length, 1, u.id);
      const numbers = blocks.slice(u.start, u.end).filter((b) => b[1]).map((b) => b[1]);
      assert.equal(u.vri, numbers.length === 1 ? numbers[0] : `${numbers[0]}–${numbers.at(-1)}`, u.id);
    }
  }
});

test('Pv 5 excludes and Pv 6 includes the first verse of the next dialogue', () => {
  const fifth = canon.segments(canon.resolve('Pv 5').unit).map((s) => s.text).join(' ');
  const sixth = canon.segments(canon.resolve('Pv 6').unit).map((s) => s.text).join(' ');
  assert.doesNotMatch(fifth, /Naggā dubbaṇṇarūpāsi/);
  assert.match(sixth, /Naggā dubbaṇṇarūpāsi/);
  assert.equal(canon.resolve('Pv 5').unit.vri, '14–25');
  assert.equal(canon.resolve('Pv 6').unit.vri, '26–34');
});

test('Vassika does not contain Yasoja’s opening; Yasoja retains all three stanzas', () => {
  const left = canon.resolve('Thag 3.8').unit;
  const right = canon.resolve('Thag 3.9').unit;
  const d = canon.load();
  assert.equal(left.vri, '240–242');
  assert.equal(right.vri, '243–245');
  assert.equal(left.end, right.start);
  assert.equal(d.canon.books[right.book].blocks[right.start][2], '9. Yasojattheragāthā');
  const first = canon.segments(left).map(s => s.text).join(' ');
  const second = canon.segments(right).map(s => s.text).join(' ');
  assert.doesNotMatch(first, /Kālapabbaṅgasaṅkāso/);
  assert.match(second, /Kālapabbaṅgasaṅkāso/);
  assert.match(second, /Phuṭṭho ḍaṃsehi/);
  assert.match(second, /Yathā brahmā/);
  assert.equal(d.canon.books[right.book].blocks.slice(right.start, right.end).filter(b => b[0] === 'hangnum').length, 3);
});

test('story commentary assignments are based on contained root paragraphs', () => {
  const d = canon.load();
  const c = JSON.parse(gunzipSync(readBundled('server/data/commentary.json.gz')));
  for (const u of d.canon.units.filter((u) => ['pv', 'vv'].includes(u.collection))) {
    const blocks = d.canon.books[u.book].blocks;
    for (const pi of c.units[u.id] || []) {
      const p = c.passages[pi];
      assert.equal(p[3], u.book);
      assert.ok(blocks.slice(u.start, u.end).some((b) => b[1] && Number(b[1]) >= p[4] && Number(b[1]) <= p[5]), `${u.id}: passage ${pi}`);
    }
  }
});

const python = ['python3', 'python'].find((cmd) => spawnSync(cmd, ['--version']).status === 0);
test('builder repairs only the reviewed Yasoja boundary and refuses identity drift', { skip: !python }, () => {
  const r = spawnSync(python, ['-c', `
import sys,copy
sys.path.insert(0,'scripts/canon')
from story_spans import story_spans
def block(r,text='',n=None):return {'rend':r,'text':text,'n':n}
blocks=[block('subhead','8. Vassikattheragāthā')]
for n in [240,241,242]:blocks += [block('hangnum',n=str(n)),block('gathalast','Synthetic fixture')]
split=len(blocks);blocks += [block('subhead','9. Yasojattheragāthā')]
for n in [243,244,245]:blocks += [block('hangnum',n=str(n)),block('gathalast','Synthetic fixture')]
end=len(blocks);blocks += [block('subhead','10. Sāṭimattiyattheragāthā')]
books=[{'file':'s0508m.mul.xml','blocks':blocks}]
units=[{'id':'thag3.8','book':0,'title':'Vassikattheragāthā','start':0,'end':split+3},
       {'id':'thag3.9','book':0,'title':'Yasojattheragāthā','start':split+3,'end':end}]
assert story_spans(books,units)==['thag3.8','thag3.9']
assert units[0]['end']==units[1]['start']==split
assert story_spans(books,units)==[]
for kind in ['title','verse','adjacency','ending']:
 b=copy.deepcopy(books);u=copy.deepcopy(units)
 if kind=='title':u[1]['title']='Wrong person'
 if kind=='verse':b[0]['blocks'][split+1]['n']='999'
 if kind=='adjacency':u[0]['end']+=1
 if kind=='ending':u[1]['end']-=1
 before=copy.deepcopy(u)
 try:story_spans(b,u)
 except ValueError:pass
 else:raise AssertionError(kind)
 assert u==before
`], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('story boundary builder refuses mismatched source identities before mutating units', { skip: !python }, () => {
  const result = spawnSync(python, ['-c', `
import copy, sys
sys.path.insert(0, 'scripts/canon')
from story_spans import story_spans
books = [{'file':'s0507m.mul.xml','blocks':[
 {'rend':'subhead','text':'1. First','n':None},
 {'rend':'hangnum','text':'','n':'1'},
 {'rend':'subhead','text':'2. Second','n':None},
 {'rend':'hangnum','text':'','n':'2'}]}]
units = [{'id':'pv1','book':0,'title':'First','start':1,'end':3},
         {'id':'pv2','book':0,'title':'Second','start':3,'end':4}]
assert story_spans(books,units) == ['pv1','pv2']
assert [(u['start'],u['end']) for u in units] == [(0,2),(2,4)]
assert story_spans(books,units) == []
for change in ['title','id','approximate']:
 bad=copy.deepcopy(units); bad[1][change]={'title':'Wrong','id':'pv3','approximate':True}[change]
 before=copy.deepcopy(bad)
 try: story_spans(books,bad)
 except ValueError: pass
 else: raise AssertionError(change)
 assert bad == before
`], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
