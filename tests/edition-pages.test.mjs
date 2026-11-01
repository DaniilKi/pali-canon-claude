// Thai, Myanmar and VRI edition page references (issue #27).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCitation, CitationError } from '../src/citations.mjs';
import * as canon from '../src/canon.mjs';

const id = (ref) => canon.resolve(ref).unit.id;

test('edition page citations parse as collection + volume.page', () => {
  assert.deepEqual(parseCitation('Thai MN 1.103'), { kind: 'edition', edition: 'T', scope: 'mn', volume: 1, page: 103, raw: 'Thai MN 1.103' });
  assert.equal(parseCitation('Myanmar DN 2.55').edition, 'M');
  assert.equal(parseCitation('VRI MN 1.71').edition, 'V');
  const loose = parseCitation('Thai ed. MN vol. 1 p. 103');
  assert.equal(loose.volume, 1);
  assert.equal(loose.page, 103);
  const single = parseCitation('Thai Dhp 15');
  assert.equal(single.volume, 0);
  assert.equal(single.page, 15);
  assert.equal(parseCitation('VRI SN 1.20 (Nidānavaggo)').book, 'Nidānavaggo');
  assert.equal(parseCitation('Thai Mv 1.10').scope, 'vin-mv');
  assert.equal(parseCitation('Thai Pp 150').scope, 'pp', '"Pp" is the Puggalapaññatti, not a page word');
});

test('edition pages resolve to the text in which the page begins', () => {
  for (const ref of ['Thai MN 1.103', 'Myanmar MN 1.70', 'VRI MN 1.71', 'Thai ed. MN vol. 1 p. 103', 'thai mn 1:103']) assert.equal(id(ref), 'mn10', ref);
  const r = canon.resolve('Thai MN 1.103');
  assert.ok(r.notes.some((n) => /Thai MN 1\.103 begins within MN 10 \(VRI paragraph 105\)/.test(n)));
  assert.equal(id('Thai Dhp 15'), 'dhp1');
  assert.equal(id('Thai Mv 1.10'), 'pli-tv-kd1');
  assert.equal(id('VRI SN 1.20 (Nidānavaggo)'), 'sn12.17');
  assert.equal(id('VRI SN 1.20 (Nidanavagga)'), 'sn12.17', 'book name without diacritics');
  assert.equal(id('VRI SN 1.20 (Sagāthāvaggo)'), 'sn1.31');
});

test('edition citations never guess', () => {
  // No collection: VRI numbers volumes within each collection, so a bare volume.page is meaningless.
  assert.throws(() => canon.resolve('Thai 9.55'), /needs a collection/);
  assert.throws(() => canon.resolve('VRI 1.55'), /needs a collection/);
  // VRI repeats volume numbers across the books of SN and AN: the book must be named.
  assert.throws(() => canon.resolve('VRI SN 1.20'), (e) => e instanceof CitationError && /ambiguous/.test(e.message) && /Nidānavaggo/.test(e.message));
  assert.throws(() => canon.resolve('Thai Vin 1.10'), /ambiguous.*Thai Mv 1\.10/);
  assert.throws(() => canon.resolve('VRI SN 1.20 (Khandhavaggo)'), /does not match/);
  assert.throws(() => canon.resolve('Thai MN 1.9999'), /No Thai page 1\.9999.*vol\. 1 pp\. 1–611/);
  assert.throws(() => canon.resolve('Thai Mil 5'), /no Thai page numbers/);
  assert.throws(() => canon.resolve('Thai Xyz 1.5'), /Unknown collection/);
  // Ordinary citations are untouched.
  assert.equal(id('MN 10'), 'mn10');
  assert.equal(id('Thag 1.1'), 'thag1.1');
  assert.equal(id('Pp 1.1').startsWith('pp1'), true);
});

test('a page break between texts points to the text that follows, and says so', () => {
  const r = canon.resolve('Thai Pc 2.153');
  assert.equal(r.unit.id, 'pli-tv-bu-vb-pc1');
  assert.ok(r.notes.some((n) => /printed between texts/.test(n)));
});

test('get_text segments carry Thai, Myanmar and VRI page breaks', () => {
  const segs = canon.segments(canon.resolve('MN 10').unit);
  const opening = segs.find((s) => s.vri_paragraph === '105');
  assert.deepEqual(opening.thai_page_begins, ['Thai MN 1.103']);
  assert.deepEqual(opening.myanmar_page_begins, ['Myanmar MN 1.70']);
  assert.deepEqual(opening.vri_page_begins, ['VRI MN 1.71']);
  // Every label shown resolves back to this text.
  for (const s of segs) for (const label of [...(s.thai_page_begins || []), ...(s.myanmar_page_begins || []), ...(s.vri_page_begins || [])]) {
    assert.equal(id(label), 'mn10', label);
  }
  // Labels in VRI SN carry the book name, because VRI repeats volume numbers there.
  const sn = canon.segments(canon.resolve('SN 12.2').unit).flatMap((s) => s.vri_page_begins || []);
  assert.ok(sn.length && sn.every((l) => /\(Nidānavaggo\)$/.test(l)), sn.join());
});

test('describe reports edition page breaks', () => {
  const e = canon.describe(canon.resolve('MN 10').unit).edition_pages;
  assert.equal(e.thai.first_break, 'Thai MN 1.103');
  assert.equal(e.thai.previous_break, 'Thai MN 1.102');
  assert.equal(e.myanmar.first_break, 'Myanmar MN 1.70');
  assert.equal(e.vri.first_break, 'VRI MN 1.71');
  assert.ok(e.thai.page_breaks > 1);
  assert.match(e.note, /recorded in the VRI XML/);
  // Mil has no Thai markers in the VRI data: no Thai entry rather than a guess.
  const mil = canon.describe(canon.resolve('Mil 2').unit).edition_pages;
  assert.equal(mil.thai, undefined);
  assert.ok(mil.myanmar);
});
