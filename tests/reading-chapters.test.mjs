import test from 'node:test';
import assert from 'node:assert/strict';
import * as post from '../src/postcanonical.mjs';
import * as books from '../src/source-books.mjs';
import { assertPageRequest, assertPagePin } from '../web/reading-navigation.mjs';
import { isReadingLocator } from '../web/reading-position.mjs';
import { localizePostCanonical } from '../src/script.mjs';
import { validateChapterIndex, validateChapterMenu, chapterLink, readingIntro } from '../web/reading-chapters.mjs';

const get = citation => post.getText(citation, { offset: 0, limit: 1 });
const clone = value => JSON.parse(JSON.stringify(value));
const params = href => new URLSearchParams(href.slice(6));

test('all 95 actual logical-work/generic chapter entries resolve with exact pinned parent authority after reload', async () => {
  let total = 0;
  for (const [citation, count, scope] of [['Vism', 23, 'work'], ['Abhidh-s', 9, 'work'], ['mahavamsa', 63, 'source_file']]) {
    const root = await get(citation), index = validateChapterIndex(root), menu = validateChapterMenu(root, root);
    assert.equal(root.chapters.length, count); assert.equal(menu.chapters.length, count); assert.equal(index.scope, scope);
    assert.deepEqual(index.read_with, { tool: 'get_post_canonical', citation, offset: 0, limit: 1 });
    for (const row of menu.chapters) {
      const child = await get(row.citation); assert.equal(Object.hasOwn(child, 'chapters'), false);
      assert.equal(child.citation, row.citation); assert.equal(child.title, row.title);
      const childIndex = validateChapterIndex(child); assert.deepEqual(childIndex.read_with, index.read_with);
      assert.equal(childIndex.revision, index.revision);
      const reloadedParent = await get(childIndex.read_with.citation), restored = validateChapterMenu(child, reloadedParent);
      assert.deepEqual(restored.chapters, menu.chapters);
      const href = chapterLink(row, restored), args = params(href);
      assert.equal(args.get('kind'), 'post'); assert.equal(args.get('uid'), row.citation); assert.equal(args.get('offset'), '0');
      assert.equal(args.get('page_source'), root.source.commit); assert.equal(args.has('ref'), false); assert.equal(args.has('source'), false);
      assert.equal(isReadingLocator(href), false); assert.doesNotThrow(() => assertPageRequest(args)); assert.doesNotThrow(() => assertPagePin(args, child));
      total++;
    }
  }
  assert.equal(total, 95);
});

test('raw source files, Nidānakathā and Mahāṭīkā keep exact catalogue precedence and their own menus', async () => {
  for (const [citation, count] of [['visuddhimagga-1', 11], ['visuddhimagga-2', 12], ['abhidhammatthasangaho', 18], ['visuddhimagga-nidanakatha', 37], ['visuddhimagga-mahatika-1', 11], ['visuddhimagga-mahatika-2', 12]]) {
    const root = await get(citation), index = validateChapterIndex(root), menu = validateChapterMenu(root, root);
    assert.equal(index.scope, 'source_file'); assert.equal(index.read_with.citation, citation); assert.equal(menu.chapters.length, count);
    for (const row of menu.chapters) assert.ok(row.citation.startsWith(citation + ' '));
    const child = await get(menu.chapters[0].citation), childIndex = validateChapterIndex(child);
    assert.deepEqual(childIndex.read_with, index.read_with); assert.equal(validateChapterMenu(child, await get(citation)).chapters.length, count);
  }
  const rawSecond = await get('visuddhimagga-2 1'); assert.equal(rawSecond.title, '12. Iddhividhaniddeso');
  const appended = await get('abhidhammatthasangaho 10'); assert.equal(appended.title, '1. Cittaparicchedavaṇṇanā');
  assert.equal(validateChapterIndex(rawSecond).read_with.citation, 'visuddhimagga-2');
  assert.equal(validateChapterIndex(appended).read_with.citation, 'abhidhammatthasangaho');
});

test('actual Sinhala and Thai chapter menus preserve optional Roman titles and exact citation/source authority', async () => {
  for (const script of ['sinhala', 'thai']) {
    for (const [parentCitation, childCitation] of [['Vism', 'Vism ch. 12'], ['Abhidh-s', 'Abhidh-s 4'], ['mahavamsa', 'mahavamsa 3']]) {
      const original = await get(parentCitation), root = localizePostCanonical(original, script), child = localizePostCanonical(await get(childCitation), script);
      const menu = validateChapterMenu(child, root);
      assert.equal(menu.chapters.length, original.chapters.length);
      for (const [index, row] of menu.chapters.entries()) {
        assert.equal(row.citation, original.chapters[index].citation);
        assert.equal(row.title_roman, original.chapters[index].title);
        assert.equal(row.title, root.chapters[index].title);
        const args = params(chapterLink(row, menu)); assert.equal(args.get('uid'), row.citation); assert.equal(args.get('page_source'), original.source.commit);
      }
      const row = menu.chapters[0], withoutRoman = { citation: row.citation, title: row.title };
      assert.throws(() => chapterLink(withoutRoman, menu));
      assert.throws(() => chapterLink({ ...row, title_roman: 'Different Roman title' }, menu));
      for (const title_roman of ['', null, 42, 'x'.repeat(1001)]) {
        const malformed = clone(root); malformed.chapters[0].title_roman = title_roman;
        assert.throws(() => validateChapterMenu(child, malformed));
      }
    }
  }
});

test('chapter-start, approximate and exact paragraph selections receive only tiny authoritative parent commands', async () => {
  for (const [citation, parent] of [['Vism 1.1', 'Vism'], ['Vism 4.19', 'Vism'], ['Vism §19', 'Vism'], ['Abhidh-s 1.4', 'Abhidh-s'], ['mahavamsa 3.1', 'mahavamsa']]) {
    const child = await get(citation), info = validateChapterIndex(child);
    assert.equal(info.read_with.citation, parent); assert.equal(Object.hasOwn(child, 'chapters'), false);
    assert.ok(JSON.stringify(child.chapter_index).length < 200);
    assert.ok(validateChapterMenu(child, await get(parent)).chapters.length > 0);
  }
  const root = books.readBook({ book: 'vin02m1', limit: 1 });
  assert.equal(Object.hasOwn(root, 'chapters'), false); assert.equal(validateChapterIndex(root), null);
  assert.equal(validateChapterIndex({ canonical: false }), null);
});

test('malformed optional authority fails closed without changing the loaded source or accepting selector heuristics', async () => {
  const data = await get('Vism ch. 12'), before = clone(data);
  for (const change of [{ canonical: true }, { label: '' }, { book: { ...data.book, canonical: true } }, { chapter_index: null }, { chapter_index: { ...data.chapter_index, scope: 'unknown' } }, { chapter_index: { ...data.chapter_index, extra: true } }]) assert.throws(() => validateChapterIndex({ ...data, ...change }));
  for (const command of [{ ...data.chapter_index.read_with, tool: 'get_text' }, { ...data.chapter_index.read_with, citation: 'visuddhimagga-2' }, { ...data.chapter_index.read_with, offset: 1 }, { ...data.chapter_index.read_with, limit: 30 }, { ...data.chapter_index.read_with, script: 'thai' }]) assert.throws(() => validateChapterIndex({ ...data, chapter_index: { scope: 'work', read_with: command } }));
  const unrelated = await get('visuddhimagga-nidanakatha'); unrelated.chapter_index = clone(data.chapter_index);
  assert.throws(() => validateChapterIndex(unrelated));
  const raw = await get('visuddhimagga-2'); raw.chapter_index = clone(data.chapter_index); assert.throws(() => validateChapterIndex(raw));
  assert.deepEqual(data, before);
});

test('fetched menu requires the exact requested parent, full source terms, same revision and literal unique rows', async () => {
  const child = await get('Vism ch. 12'), root = await get('Vism');
  for (const parent of [await get('visuddhimagga-2'), await get('Abhidh-s'), { ...root, citation: 'Vism ch. 1' }, { ...root, chapters: [] }, { ...root, chapters: root.chapters.slice(1) }, { ...root, source: { ...root.source, terms: '' } }, { ...root, source: { ...root.source, repository: 'https://example.com' } }]) assert.throws(() => validateChapterMenu(child, parent));
  assert.throws(() => validateChapterMenu(child, { ...root, source: { ...root.source, commit: 'changed-revision' } }), error => error.code === 'READING_SOURCE_CHANGED');
  const mapped = { ...root, source: { ...root.source, locator_revision: 'changed-mapping' } };
  assert.throws(() => validateChapterMenu(child, mapped), error => error.code === 'READING_SOURCE_CHANGED');
  for (const change of [{ citation: 'Vism ch. 2' }, { citation: 'mahavamsa 1' }, { title: '' }, { ref: 'guessed/1' }]) {
    const bad = clone(root); bad.chapters[0] = { ...bad.chapters[0], ...change }; assert.throws(() => validateChapterMenu(child, bad));
  }
  const menu = validateChapterMenu(child, root), badMenu = clone(menu); badMenu.chapters[0].citation = 'mahavamsa 1';
  assert.throws(() => chapterLink(badMenu.chapters[0], badMenu));
  assert.throws(() => chapterLink({ ...menu.chapters[0], title: 'Different row' }, menu));
  assert.equal(Object.hasOwn(menu, 'segments'), false);
});

test('only exact root-file boilerplate moves to context and a compact file-reference/abbreviation caution stays visible', () => {
  const data = books.readBook({ book: 'vin02m1', limit: 1 }), before = clone(data), unknown = 'Unknown source warning must remain visible.';
  const input = { ...data, notes: [...data.notes, unknown], approximate: true, alignment_note: 'Exact alignment caution', alignment_method: 'Source ownership label', input_normalised: { note: 'Inferred spelling must be checked.' } };
  const intro = readingIntro(input, 'book');
  assert.deepEqual(intro.context, data.notes); assert.deepEqual(intro.critical.notes, [unknown]);
  assert.equal(intro.status, 'VRI file references are not standard citations. Abbreviations remain unexpanded.');
  assert.equal(intro.critical.approximate, true); assert.equal(intro.critical.alignment_note, input.alignment_note);
  assert.equal(intro.critical.alignment_method, input.alignment_method); assert.deepEqual(intro.critical.input_normalised, input.input_normalised);
  assert.equal(intro.critical.segments, input.segments, 'source wording is neither copied nor rewritten');
  assert.deepEqual(data, before);
  const changed = { ...data, notes: data.notes.map(note => note + ' New warning.') };
  assert.deepEqual(readingIntro(changed, 'book').critical.notes, changed.notes); assert.deepEqual(readingIntro(changed, 'book').context, []);
});

test('all four exact post backgrounds may move, while only the approved full Vism scope note can also move', async () => {
  for (const citation of ['visuddhimagga-1', 'abhidhammatthasangaho', 'Vism', 'Abhidh-s']) {
    const data = await get(citation), intro = readingIntro(data, 'post');
    assert.deepEqual(intro.context, citation === 'Vism' ? [data.label, ...data.notes] : [data.label]); assert.equal(Object.hasOwn(intro.critical, 'label'), false);
    assert.match(intro.status, citation === 'Vism' ? /Not canon/ : /not the canon/); assert.deepEqual(intro.critical.notes, citation === 'Vism' ? [] : data.notes);
    const unknown = { ...data, label: data.label + ' Additional source warning.' };
    assert.equal(readingIntro(unknown, 'post').critical.label, unknown.label); assert.deepEqual(readingIntro(unknown, 'post').context, []);
  }
  const approximate = await get('Vism 4.19'), intro = readingIntro(approximate, 'post');
  assert.equal(intro.critical.approximate, true); assert.deepEqual(intro.critical.notes, approximate.notes); assert.ok(intro.critical.notes[0].includes('cannot be located exactly'));
  const root = books.readBook({ book: 'vin02m1', limit: 1 }), data = { ...approximate, notes: [...approximate.notes, ...root.notes] };
  assert.deepEqual(readingIntro(data, 'post').critical.notes, data.notes, 'root boilerplate in a post selection is never hidden');
  for (const kind of ['canon', 'commentary']) {
    const same = readingIntro(data, kind); assert.deepEqual(same.critical, data); assert.deepEqual(same.context, []); assert.equal(same.status, null);
  }
});

test('finite full-Vism compact status preserves volume scope and all unknown/approximation/alignment/input warnings', async () => {
  const root = await get('Vism'), scope = root.notes[0], unknown = 'Unfamiliar source warning stays above the source.';
  const input = { ...root, notes: [scope, unknown], approximate: true, alignment_note: 'Alignment caution', alignment_method: 'Exact method metadata', input_romanized: 'Converted query', input_script: 'sinhala', input_normalised: { note: 'Inferred spelling warning' } };
  const before = clone(input), intro = readingIntro(input, 'post');
  assert.equal(intro.status, 'Not canon. Volume 1: chapters 1–11 of 23.');
  assert.deepEqual(intro.context, [root.label, scope]); assert.deepEqual(intro.critical.notes, [unknown]);
  for (const field of ['approximate', 'alignment_note', 'alignment_method', 'input_romanized', 'input_script', 'input_normalised']) assert.deepEqual(intro.critical[field], input[field]);
  assert.equal(intro.critical.segments, input.segments); assert.deepEqual(input, before);
  for (const script of ['sinhala', 'thai']) {
    const native = localizePostCanonical(root, script), compact = readingIntro(native, 'post');
    assert.equal(compact.status, intro.status); assert.deepEqual(compact.context, [root.label, scope]);
  }
  for (const change of [{ notes: [scope + ' Reworded warning.'] }, { chapter_index: null }, { chapters: root.chapters.slice(1) }, { book: { ...root.book, id: 'visuddhimagga-2' } }, { citation: 'Vism ch. 1' }]) {
    const changed = { ...root, ...change }, visible = readingIntro(changed, 'post');
    assert.deepEqual(visible.critical.notes, changed.notes); assert.deepEqual(visible.context, [root.label]);
    assert.equal(visible.status.includes('Volume 1'), false);
  }
});

test('helpers remain offline, portable and immutable and expose metadata only for chapter menus', async () => {
  const data = await get('Vism ch. 12'), root = await get('Vism'), before = JSON.stringify({ data, root });
  const fetch = globalThis.fetch, nativeClone = globalThis.structuredClone, storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  globalThis.fetch = () => { throw Error('No network'); }; globalThis.structuredClone = undefined;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('No storage'); } });
  try {
    const menu = validateChapterMenu(data, root); chapterLink(menu.chapters[11], menu); readingIntro(data, 'post');
    menu.chapters[0].title = 'Independent clone'; menu.source.commit = 'Independent clone';
    assert.equal(JSON.stringify({ data, root }), before);
  } finally { globalThis.fetch = fetch; globalThis.structuredClone = nativeClone; if (storage) Object.defineProperty(globalThis, 'localStorage', storage); else delete globalThis.localStorage; }
});
