import assert from 'node:assert/strict';
import * as canon from '../../src/canon.mjs';
import * as post from '../../src/postcanonical.mjs';
import { readBook, catalogue } from '../../src/source-books.mjs';
import { SCRIPTS, transliterate } from '../../src/script.mjs';
import { expectedSegments } from './study-scripts.mjs';

export async function auditWidget(client) {
  const counts = { scripts: 0, selection_cases: 0, continued_pages: 0, postcanonical_books: 0, root_files: 0, rejected_requests: 0 };
  const call = async args => {
    const response = await client.callTool({ name: 'read_passage_widget', arguments: args });
    assert.ok(!response.isError, JSON.stringify(response.content)); return response.structuredContent;
  };
  for (const script of SCRIPTS) {
    for (const mode of ['canonical', 'postcanonical', 'source_file']) {
      const args = mode === 'source_file' ? { book: 'vin02m1', offset: 6, limit: 1, script }
        : { uid: transliterate(mode === 'canonical' ? 'MN 10' : 'Vism 1.1', 'roman', script), limit: 2, script, ...(mode === 'canonical' ? { english: false } : {}) };
      const first = await call(args);
      const offset = args.offset || 0;
      const all = mode === 'canonical' ? canon.segments(canon.resolve('MN 10').unit)
        : mode === 'source_file' ? readBook({ book: 'vin02m1', limit: 100000 }).segments
          : (await post.getText('Vism 1.1', { limit: 100000 })).segments;
      assert.deepEqual(first.pali.segments, expectedSegments(all.slice(offset, offset + args.limit), script));
      assert.equal(first.pali.license, first.source.terms);
      if (mode === 'canonical') assert.equal(first.text_id, 'mn10');
      else {
        assert.equal(first.text_id, undefined); assert.equal(first.english, null); assert.ok(first.english_error);
        assert.equal(first.links.suttacentral, undefined);
        if (mode === 'postcanonical') { assert.equal(first.canonical, false); assert.match(first.label, /not the canon/i); }
        else { assert.equal(first.selection, 'source_book'); assert.match(first.label, /not individual sutta or rule/); }
      }
      const cursor = first.pali.continue_with;
      assert.equal(cursor.name, 'read_passage_widget'); assert.equal(cursor.arguments.script, script);
      const next = await call(cursor.arguments);
      assert.deepEqual(next.pali.segments, expectedSegments(all.slice(offset + args.limit, offset + args.limit * 2), script));
      assert.deepEqual(next.source, first.source); assert.equal(next.canonical, first.canonical);
      counts.selection_cases++; counts.continued_pages++;
    }
    counts.scripts++;
  }
  for (const book of post.load().books) {
    const page = await call({ uid: book.id, english: false, limit: 1 });
    const original = await post.getText(book.id, { limit: 1 });
    assert.equal(page.canonical, false); assert.equal(page.book.id, book.id);
    assert.deepEqual(page.pali.segments, original.segments); assert.deepEqual(page.source, original.source);
    counts.postcanonical_books++;
  }
  for (const book of catalogue({ limit: 200 }).items) {
    const page = await call({ book: book.id, english: false, limit: 1 });
    const original = readBook({ book: book.id, limit: 1 });
    assert.equal(page.selection, 'source_book'); assert.equal(page.book_id, book.id); assert.equal(page.text_id, undefined);
    assert.deepEqual(page.pali.segments, original.segments); assert.deepEqual(page.source, original.source);
    counts.root_files++;
  }
  for (const args of [{}, { uid: 'Vism 1.1', book: 'vin02m1' }, { book: 'unknown-book' }, { uid: 'Vism p. 3' }, { uid: 'Mahāvagga-Ṭīkā' }, { uid: 'Vism 1.1', script: 'unknown' }]) {
    assert.equal((await client.callTool({ name: 'read_passage_widget', arguments: args })).isError, true); counts.rejected_requests++;
  }
  assert.equal((await call({ uid: 'MN 10', english: false, limit: 1 })).text_id, 'mn10');
  return counts;
}
