import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPassage } from '../src/chatgpt-widget.mjs';
import { catalogue, readBook } from '../src/source-books.mjs';
import { SCRIPTS } from '../src/script.mjs';
import { expectedSegments } from '../scripts/evidence/study-scripts.mjs';

test('widget source-file mode retrieves real front matter without assigning an individual rule ID', async () => {
  for (const script of SCRIPTS) {
    const page = await readPassage({ book: 'vin02m1', offset: 6, limit: 1, script });
    const original = readBook({ book: 'vin02m1', offset: 6, limit: 1 });
    assert.equal(page.selection, 'source_book'); assert.equal(page.text_id, undefined);
    assert.equal(page.book_id, 'vin02m1'); assert.equal(page.citation, 'vri-book:vin02m1');
    assert.deepEqual(page.pali.segments, expectedSegments(original.segments, script));
    assert.deepEqual(page.source, original.source); assert.match(page.label, /not individual sutta or rule/);
    assert.equal(page.links.suttacentral, undefined); assert.equal(page.english, null);
    assert.match(page.english_error, /individual citation/);
    const args = page.pali.continue_with.arguments;
    assert.equal(args.book, 'vin02m1'); assert.equal(args.uid, undefined); assert.equal(args.script, script);
    const next = await readPassage(args);
    assert.deepEqual(next.pali.segments, expectedSegments(readBook({ book: 'vin02m1', offset: 7, limit: 1 }).segments, script));
  }
});

test('all 61 source files have a faithful widget opening and invalid selections do not substitute', async () => {
  for (const item of catalogue({ limit: 200 }).items) {
    const page = await readPassage({ book: item.id, english: false, limit: 1 });
    assert.deepEqual(page.pali.segments, readBook({ book: item.id, limit: 1 }).segments);
    assert.equal(page.text_id, undefined);
  }
  await assert.rejects(readPassage({ english: false }), /exactly one/);
  await assert.rejects(readPassage({ uid: 'Vism 1.1', book: 'vin02m1' }), /exactly one/);
  await assert.rejects(readPassage({ book: 'not-a-book' }), /Unknown VRI/);
});
