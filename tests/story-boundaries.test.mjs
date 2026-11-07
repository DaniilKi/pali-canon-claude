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
