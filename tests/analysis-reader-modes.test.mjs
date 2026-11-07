import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as pc from '../src/postcanonical.mjs';
import * as books from '../src/source-books.mjs';
import * as canon from '../src/canon.mjs';
import { analysePassage, DPD_PIN } from '../src/analyse.mjs';

test('post-canonical analysis uses the reader segment and keeps source and dictionary identities separate', async () => {
  const read = await pc.getText('Vism 1.1', { limit: 200 });
  const segment = read.segments.find((s) => s.type !== 'heading');
  const result = analysePassage({ uid: 'Vism 1.1', segment: segment.ref });
  assert.deepEqual(result.segment, segment);
  assert.equal(result.canonical, false);
  assert.equal(result.content_type, 'post_canonical');
  assert.equal(result.book.id, read.book.id);
  assert.match(result.label, /not the canon/i);
  assert.ok(!result.text_id);
  assert.deepEqual(result.text_source, read.source);
  assert.equal(result.text_attribution, read.source.attribution);
  assert.match(result.license.name, /CC BY-NC-SA/);
  assert.match(result.dictionary_coverage_note, /remain unknown/);
  assert.ok(result.words.some((w) => w.status === 'found'));
  assert.equal(analysePassage({ uid: 'Vism I', segment: 'Vism ch. 1/5' }).segment.ref, 'Vism ch. 1/5');
});

test('canonical analysis also returns the existing text pin and terms separately from the dictionary', () => {
  const result = analysePassage({ uid: 'Dhp 183' });
  assert.equal(result.text_id, 'dhp183');
  assert.deepEqual(result.text_source, canon.source());
  assert.equal(result.text_attribution, canon.source().attribution);
  assert.match(result.license.name, /CC BY-NC-SA/);
});

test('complete-book analysis reaches unindexed source text without assigning an individual citation', () => {
  const read = books.readBook({ book: 'vin02m1', offset: 6, limit: 1 });
  const result = analysePassage({ book: 'vin02m1', segment: read.segments[0].ref });
  assert.deepEqual(result.segment, read.segments[0]);
  assert.equal(result.segment.text, 'Ime kho panāyasmanto dvenavuti pācittiyā');
  assert.equal(result.selection, 'source_book');
  assert.equal(result.book_id, 'vin02m1');
  assert.ok(!result.text_id && !result.citation);
  assert.equal(result.text_source.commit, read.source.commit);
  assert.deepEqual(analysePassage({ book: 'vin02m1.mul.xml', segment: 7 }).segment, result.segment);
});

test('post-canonical word pagination preserves every source token', () => {
  const full = analysePassage({ uid: 'Abhidh-s 1.4', limit: 100000 });
  for (const limit of [1, 3, 7]) {
    let offset = 0;
    const words = [];
    do {
      const r = analysePassage({ uid: 'Abhidh-s 1.4', segment: full.segment.ref, limit, offset });
      assert.equal(r.words_total, full.words_total);
      assert.deepEqual(r.segment, full.segment);
      assert.ok(r.next_offset === null || r.next_offset === offset + r.returned_tokens);
      words.push(...r.words);offset = r.next_offset;
    } while (offset !== null);
    assert.deepEqual(words, full.words);
  }
});

test('selector and source failures never fall back to a different segment or work', () => {
  assert.throws(() => analysePassage({}), /exactly one/);
  assert.throws(() => analysePassage({ uid: 'MN 10', book: 'vin02m1' }), /exactly one/);
  assert.throws(() => analysePassage({ book: 'unknown-book' }), /Unknown VRI source book/);
  assert.throws(() => analysePassage({ uid: 'Vism 1.1', segment: 'Vism ch. 4/5' }), /belongs to/);
  assert.throws(() => analysePassage({ book: 'vin02m1', segment: 'vri-book:vin01m/7' }), /belongs to/);
  assert.throws(() => analysePassage({ uid: 'niruttidipani 2', paragraph: 63 }), /matches 2 segments/);
  assert.throws(() => analysePassage({ uid: 'Vism p. 3' }), /PTS page/);
  assert.throws(() => analysePassage({ uid: 'Vism 1.0' }), /positive paragraph/);
  assert.throws(() => analysePassage({ uid: 'Mahāvagga-Ṭīkā' }), /ambiguous/);
  assert.throws(() => analysePassage({ uid: 'Vism 1.1', segment: ' ' }), /empty or blank/);
});

test('approximate post-canonical numbering retains the reader caution', () => {
  const result = analysePassage({ uid: 'Vism 1.2' });
  assert.equal(result.approximate, true);
  assert.ok(result.notes.some((s) => /cannot be located exactly/.test(s)));
  assert.equal(result.segment.ref, 'Vism 1.2/5');
});

test('quoted non-Pali glyphs in the actual grammar books remain intact unknown tokens', async () => {
  for (const [uid, expected] of [['payogasiddhipatha', ['ऐ', 'औ']], ['padasadhanam', ['औkārasseva']]]) {
    const read = await pc.getText(uid, { limit: 100000 });
    const segment = read.segments.find((s) => expected.every((word) => s.text.includes(word)));
    assert.ok(segment, uid);
    const r = analysePassage({ uid, segment: segment.ref, limit: 100000 });
    assert.deepEqual(r.segment, segment);
    for (const surface of expected) {
      const word = r.words.find((w) => w.surface === surface);
      assert.ok(word, `${uid}: ${surface} was dropped or split`);
      assert.equal(word.status, 'unknown');
      assert.deepEqual(word.analyses, []);
    }
  }
});

test('each post-canonical book has a readable first-body analysis from the pinned subset', async () => {
  let unknown = 0;
  for (const book of pc.load().books) {
    const read = await pc.getText(book.id, { limit: 200 });
    const first = read.segments.find((s) => s.type !== 'heading');
    assert.ok(first, book.id);
    const result = analysePassage({ uid: book.id, limit: 5 });
    assert.deepEqual(result.segment, first, book.id);
    assert.equal(result.canonical, false);
    assert.equal(result.book.id, book.id);
    assert.equal(result.dictionary.version, DPD_PIN.version);
    unknown += result.unknown_words || 0;
  }
  assert.ok(unknown > 0, 'unknown words in later literature remain explicit instead of guessed');
});
