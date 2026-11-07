import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as books from '../src/source-books.mjs';
import { search } from '../src/source-book-search.mjs';

const preamble = 'Ime kho panāyasmanto dvenavuti pācittiyā';
test('source-book search reaches the printed Vinaya introduction without inventing a rule citation', () => {
  assert.equal(canon.search(`"${preamble}"`).total_texts_matched, 0, 'outside individual citation spans');
  const r = search(`"${preamble}"`, { book: 'vin02m1' });
  assert.equal(r.selection, 'source_book');
  assert.equal(r.canonical, true);
  assert.equal(r.total_matched, 1);
  const hit = r.results[0];
  assert.equal(hit.ref, 'vri-book:vin02m1/7');
  assert.ok(!hit.text_id && !hit.citation, 'no inferred individual identity');
  assert.equal(books.readBook(hit.read_with).segments[0].text, preamble);
  assert.equal(books.readBook(hit.read_with).segments[0].ref, hit.ref);
  assert.deepEqual(hit.thai_page_begins, ['Thai Pc 2.153']);
  assert.match(r.citation_note, /not standard sutta or rule citations/);
  assert.equal(r.source.commit, canon.source().commit);
  assert.equal(r.attribution, canon.source().attribution);
  assert.equal(search(`"${preamble}"`, { book: 's0101m' }).total_matched, 0, 'other books stay excluded');
});

test('whole-stanza phrases and source segment boundaries match the reader', () => {
  const unit = canon.resolve('Dhp 183').unit;
  const id = books.bookId(canon.load().canon.books[unit.book]);
  const stanza = canon.segments(unit).find((s) => s.type === 'verse').text;
  const r = search(`"${stanza.replace(/\n/g, ' ')}"`, { book: id });
  assert.ok(r.results.some((hit) => books.readBook(hit.read_with).segments[0].text === stanza));
  const all = books.readBook({ book: 'vin02m1', limit: 100000 }).segments;
  const query = `"${all[6].text} ${all[7].text}"`;
  assert.equal(search(query, { book: 'vin02m1' }).total_matched, 0, 'separate rendered segments never combine');
});

test('matching-segment pagination is stable and separate from source reading offsets', () => {
  const base = search('dhamma', { book: 's0101m', limit: 100000 });
  assert.ok(base.total_matched > 10);
  for (const limit of [1, 3, 7]) {
    let offset = 0;
    const refs = [];
    do {
      const r = search('dhamma', { book: 's0101m', offset, limit });
      assert.equal(r.total_matched, base.total_matched);
      assert.equal(r.returned, r.results.length);
      refs.push(...r.results.map((hit) => hit.ref));
      assert.ok(r.next_offset === null || r.next_offset === offset + r.returned);
      offset = r.next_offset;
    } while (offset !== null);
    assert.deepEqual(refs, base.results.map((hit) => hit.ref));
  }
  const end = search('dhamma', { book: 's0101m', offset: base.total_matched });
  assert.deepEqual(end.results, []);
  assert.equal(end.next_offset, null);
  assert.deepEqual(search('dhamma', { book: 's0101m.mul.xml', limit: 100000 }).results, base.results);
});

test('every root book yields exact readable source references', () => {
  for (const book of canon.load().canon.books) {
    const id = books.bookId(book);
    const all = books.readBook({ book: id, limit: 1000000 });
    const segment = all.segments.find((s) => s.type !== 'heading' && s.text.trim());
    const query = `"${segment.text.split(/\s+/).slice(0, 6).join(' ')}"`;
    const r = search(query, { book: id, limit: 1000000 });
    assert.ok(r.results.some((hit) => hit.ref === segment.ref), id);
    for (const hit of r.results.slice(0, 3)) {
      const exact = books.readBook(hit.read_with);
      assert.equal(exact.segments[0].ref, hit.ref);
      assert.equal(exact.total_segments, r.total_segments);
    }
  }
});

test('invalid source identifiers and empty searches fail clearly', () => {
  for (const book of ['not-a-book', '../vin02m1', 'MN 10', '']) assert.throws(() => search('dhamma', { book }), /Unknown VRI source book/);
  assert.throws(() => search('?', { book: 'vin02m1' }), /two or more letters/);
  assert.equal(search('"zzzzabsentprintedphrase"', { book: 'vin02m1' }).total_matched, 0);
});
