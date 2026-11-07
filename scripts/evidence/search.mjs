// Source-derived search/read/context acceptance cases; no translation or external content.
import assert from 'node:assert/strict';
import * as canon from '../../src/canon.mjs';
import * as commentary from '../../src/commentary.mjs';
import * as post from '../../src/postcanonical.mjs';
import * as sourceBooks from '../../src/source-books.mjs';
import { searchFold } from '../../src/search-segments.mjs';

const phrase = (text) => {
  const excerpt = text.trim().split(/\s+/u).slice(0, 8).join(' ').slice(0, 240);
  return excerpt.includes('"') ? excerpt.match(/[\p{L}\p{M}]{2,}/u)[0] : `"${excerpt}"`;
};
const body = (segments) => segments.filter(s => s.type !== 'heading' && /[\p{L}\p{M}]{2,}/u.test(s.text));
const json = (value) => JSON.parse(JSON.stringify(value));

export async function checkSearchHit(call, hit, source, query) {
  const command = hit.read_with;
  assert.ok(command && ['get_text', 'get_commentary', 'get_post_canonical'].includes(command.tool), 'Search hit needs a reading command');
  const index = command.tool === 'get_commentary' ? hit.segment - 1 : command.offset;
  if (command.tool !== 'get_commentary') assert.equal(command.limit, 1);
  const selected = source[index];
  assert.equal(selected?.ref, hit.segment_ref || hit.ref || hit.citation, 'Search reference must select its source segment');
  const needle = query.startsWith('"') ? query.slice(1, -1) : query;
  assert.ok(searchFold(selected.text, canon.fold).includes(searchFold(needle, canon.fold)), 'Reading command misses the search phrase');
  const { tool, ...args } = command;
  const read = await call(tool, args);
  assert.equal(read.returned, 1);
  assert.deepEqual(read.segments, [selected]);
  if (tool !== 'get_text') assert.equal(read.canonical, false);
  if (tool === 'get_text') {
    if (command.book) {
      assert.equal(command.uid, undefined);
      assert.equal(read.selection, 'source_book');
      assert.equal(read.canonical, true);
      assert.equal(read.book_id, hit.book_id);
      assert.equal(read.text_id, undefined, 'Source-file search cannot invent an individual text identity');
      assert.match(selected.ref, /^vri-book:/);
    } else {
      assert.equal(read.text_id, hit.id);
      if (hit.alignment) assert.ok(read.notes.includes(hit.alignment.note), 'Reading must retain the alignment caution');
    }
  } else if (tool === 'get_post_canonical') assert.equal(read.book.id, hit.book_id);
  else assert.equal(read.book.uid, hit.book.uid);
  const context = hit.context_with;
  assert.deepEqual(context, { ...command, offset: Math.max(0, index - 1), limit: 3,
    ...(tool === 'get_commentary' ? { uid: hit.book.uid } : {}) });
  const { tool: contextTool, ...contextArgs } = context;
  const around = await call(contextTool, contextArgs);
  assert.deepEqual(around.segments, source.slice(context.offset, context.offset + context.limit), 'Context command reads the wrong source range');
  assert.ok(around.segments.some(s => s.ref === selected.ref));
  assert.equal(around.next_offset, context.offset + around.returned < source.length ? context.offset + around.returned : null);
  return { late: index >= 60, at_end: index === source.length - 1 };
}

export async function auditSearchCommands(call) {
  const counts = { canonical_search_cases: 0, canonical_title_commands: 0, source_book_search_cases: 0, commentary_search_cases: 0,
    postcanonical_search_cases: 0, context_commands: 0, late_hits: 0, end_hits: 0 };
  const root = canon.load();
  const ranges = new Set(root.ranges.map(r => r.unit));
  for (let i = 0; i < root.canon.books.length; i++) {
    const unit = root.canon.units.filter(u => u.book === i && !u.members?.length && !ranges.has(u))
      .sort((a,b) => (b.end-b.start)-(a.end-a.start))[0];
    assert.ok(unit, `No individual search fixture for ${root.canon.books[i].file}`);
    const all = canon.segments(unit);
    const candidates = body(all);
    assert.ok(candidates.length);
    for (const segment of [candidates[0], candidates.at(-1)]) {
      const query = phrase(segment.text);
      const result = await call('search_texts', { query, collection: unit.id, english: 'off', limit: 1 });
      assert.equal(result.results[0]?.id, unit.id);
      const hit = result.results[0];
      assert.equal(hit.read_with.uid, unit.id);
      const checked = await checkSearchHit(call, hit, all, query);
      if (checked.late) counts.late_hits++;
      if (checked.at_end) counts.end_hits++;
      if (canon.alignmentInfo(unit)) assert.deepEqual(hit.alignment, json(canon.alignmentInfo(unit)));
      counts.canonical_search_cases++; counts.context_commands++;
    }
    const title = await call('search_texts', { query: unit.acronym, collection: unit.id, english: 'off', limit: 1 });
    const hit = title.title_matches.find(h => h.id === unit.id);
    assert.deepEqual(hit?.read_with, { tool: 'get_text', uid: unit.id });
    const read = await call('get_text', { uid: unit.id });
    assert.deepEqual(read.segments, all.slice(0, read.limit));
    counts.canonical_title_commands++;
  }
  for (const book of sourceBooks.catalogue({ limit: 1000 }).items) {
    const all = sourceBooks.readBook({ book: book.id, limit: 1000000 }).segments;
    const candidates = body(all);
    const cases = [candidates[0], candidates.at(-1)];
    // The known printed introduction is outside any individual rule's source span.
    if (book.id === 'vin02m1') cases.push(all.find(s => s.ref === 'vri-book:vin02m1/7'));
    for (const segment of cases) {
      assert.ok(segment, book.id);
      const query = phrase(segment.text);
      const result = await call('search_source_book', { query, book: book.id, limit: 1 });
      assert.equal(result.selection, 'source_book');
      const hit = result.results[0]; assert.ok(hit, book.id);
      assert.equal(hit.book_id, book.id);
      assert.equal(hit.read_with.book, book.id);
      const checked = await checkSearchHit(call, hit, all, query);
      if (checked.late) counts.late_hits++;
      if (checked.at_end) counts.end_hits++;
      counts.source_book_search_cases++; counts.context_commands++;
    }
  }
  for (const book of commentary.load().books) {
    const info = commentary.bookInfo(book);
    const all = commentary.bookSegments(book).map((s,i) => ({ ref: `${info.uid}/c${i+1}`, ...s }));
    const candidates = body(all);
    for (const segment of [candidates[0], candidates.at(-1)]) {
      const query = phrase(segment.text);
      const result = await call('search_commentary', { query, books: [book.file], limit: 1 });
      const hit = result.results[0];
      assert.ok(hit); assert.equal(hit.book.uid, info.uid);
      // Exact commentary citations are relative to a one-segment selection, while context uses the book.
      const command = hit.read_with;
      assert.deepEqual(command, { tool: 'get_commentary', uid: hit.citation });
      const checked = await checkSearchHit(call, hit, all, query);
      if (checked.late) counts.late_hits++;
      if (checked.at_end) counts.end_hits++;
      counts.commentary_search_cases++; counts.context_commands++;
    }
  }
  for (const book of post.load().books) {
    const candidates = body(post.segmentsOf(book.blocks));
    for (const segment of [candidates[0], candidates.at(-1)]) {
      const query = phrase(segment.text);
      const result = await call('search_post_canonical', { query, books: [book.id], limit: 1 });
      const hit = result.results[0]; assert.ok(hit, book.id);
      assert.equal(hit.book_id, book.id);
      assert.equal(hit.read_with.citation, hit.citation);
      assert.equal(post.select(hit.citation).book.id, book.id, 'Search citation must stay in the selected source book');
      const all = (await post.getText(hit.citation, { limit: 1000000 })).segments;
      const checked = await checkSearchHit(call, hit, all, query);
      if (checked.late) counts.late_hits++;
      if (checked.at_end) counts.end_hits++;
      counts.postcanonical_search_cases++; counts.context_commands++;
    }
  }
  assert.ok(counts.late_hits > 0);
  assert.ok(counts.end_hits > 0);
  return counts;
}
