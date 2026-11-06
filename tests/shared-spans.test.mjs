import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as commentary from '../src/commentary.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('every declared shared passage uses its owner’s final boundaries and page metadata', () => {
  const d = canon.load();
  const shared = d.canon.units.filter((u) => u.shares_passage_with);
  assert.equal(shared.length, 199);
  for (const u of shared) {
    const owner = d.byId.get(u.shares_passage_with);
    assert.ok(owner, u.id);
    assert.ok(u.approximate, u.id);
    assert.deepEqual([u.book, u.start, u.end], [owner.book, owner.start, owner.end], u.id);
    assert.deepEqual(u.pts, owner.pts, u.id);
    assert.equal(u.vri, owner.vri, u.id);
  }
});

test('abbreviated bhikkhu dispute rules do not retrieve the following bhikkhunī text', () => {
  const owner = canon.resolve('pli-tv-bu-vb-as2').unit;
  const expected = canon.segments(owner).map(({ ref, ...segment }) => segment);
  const expectedCommentary = commentary.commentaryFor(owner, { limit: 10000 });
  for (let n = 3; n <= 7; n += 1) {
    const { unit, notes } = canon.resolve(`pli-tv-bu-vb-as${n}`);
    assert.ok(unit.approximate);
    assert.ok(notes.length);
    assert.deepEqual(canon.segments(unit).map(({ ref, ...segment }) => segment), expected);
    const actual = commentary.commentaryFor(unit, { limit: 10000 });
    assert.equal(actual.available, expectedCommentary.available);
    assert.deepEqual(actual.segments.map(({ ref, ...s }) => s), expectedCommentary.segments.map(({ ref, ...s }) => s));
  }
  const group = canon.resolve('pli-tv-bu-vb-as1-7').unit;
  assert.equal(group.end, owner.end);
  assert.equal(canon.segments(group).length, canon.segments(canon.resolve('pli-tv-bu-vb-as1').unit).length + expected.length);
  assert.equal(group.pts.end_page, 207);
  assert.equal(group.vri, '655');
});

const python = ['python3', 'python'].find((cmd) => spawnSync(cmd, ['-c', 'import sys; assert sys.version_info >= (3, 8)']).status === 0);
test('builder synchronizes shared records after clipping and rejects invalid relationships', { skip: !python }, () => {
  const result = spawnSync(python, ['-c', `
import sys
sys.path.insert(0, 'scripts/canon')
from shared_spans import synchronise_shared_spans, repair_compact, repair_commentary
owner = {'id':'owner', 'book':0, 'start':1, 'end':3, 'pts':{'volume':1,'page':1,'end_page':1}, 'vri':'1'}
alias = {'id':'alias', 'book':0, 'start':1, 'end':8, 'approximate':True, 'shares_passage_with':'owner'}
chain = dict(alias, id='chain', shares_passage_with='alias')
assert synchronise_shared_spans([chain, alias, owner], annotations=True) == ['alias', 'chain']
assert alias['end'] == chain['end'] == 3
assert synchronise_shared_spans([chain, alias, owner], annotations=True) == []
for bad in [dict(alias, shares_passage_with='missing'), dict(alias, book=2), dict(alias, approximate=False), dict(alias, shares_passage_with='alias')]:
    try:
        synchronise_shared_spans([bad, owner])
    except ValueError:
        pass
    else:
        raise AssertionError('Invalid relationship accepted')
alias['end'] = 8
group = {'id':'group','kind':'range','book':0,'start':1,'end':8,'members':['owner','alias'],'pts':dict(owner['pts'])}
data = {'units':[owner, alias, group], 'books':[{'blocks':[['bodytext','1','unchanged']]*8}]}
fixes = repair_compact(data)
assert fixes == {'shared_records':['alias'], 'groups':['group']}
assert group['end'] == 3
att = {'units':{'owner':[1], 'alias':[1,2], 'group':[1,2]}}
assert repair_commentary(att, data, fixes) == {'alias':1, 'group':1}
assert att['units'] == {'owner':[1], 'alias':[1], 'group':[1]}
assert repair_compact(data) == {'shared_records':[], 'groups':[]}
`], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
