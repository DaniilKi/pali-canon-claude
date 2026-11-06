import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as pc from '../src/postcanonical.mjs';

test('generic paragraph zero is refused instead of returning a chapter or book', async () => {
  for (const citation of ['mahavamsa 3.0', 'mahavamsa §0', 'silakkhandhavagga-tika 2.0']) {
    assert.throws(() => pc.select(citation), /positive VRI paragraph/i, citation);
    await assert.rejects(pc.getText(citation), /positive VRI paragraph/i, citation);
  }
});

test('restarted numbering within a chapter never silently selects the first occurrence', () => {
  for (const [citation, count] of [['niruttidipani 2.63', 2], ['pancapakarana-mulatika 4.1', 8]]) {
    assert.throws(() => pc.select(citation), (error) => {
      assert.match(error.message, new RegExp(`occurs ${count} times`));
      assert.match(error.message, /read the chapter|search/i);
      return true;
    });
  }
});

test('search citations for both distinct occurrences remain readable and contain their source blocks', () => {
  const chapter = pc.select('niruttidipani 2');
  const indices = [];
  for (let i = chapter.start; i < chapter.end; i += 1) {
    if (chapter.book.blocks[i][1] === '63') indices.push(i);
  }
  assert.equal(indices.length, 2, 'two different numbered passages in the actual bundled source');
  assert.notEqual(chapter.book.blocks[indices[0]][2], chapter.book.blocks[indices[1]][2]);
  for (const i of indices) {
    const citation = pc.citationFor(chapter.book, i);
    assert.notEqual(citation, 'niruttidipani 2.63');
    const selected = pc.select(citation);
    assert.equal(selected.book, chapter.book);
    assert.ok(selected.start <= i && i < selected.end, citation);
  }
  const unique = pc.select('mahavamsa 3.12');
  assert.equal(unique.paragraph, '12', 'unambiguous paragraph lookup is retained');
});
