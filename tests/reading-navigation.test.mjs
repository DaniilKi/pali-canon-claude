import test from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { readingPlan } from '../src/daily.mjs';
import { planWindow } from '../web/reading-plans.mjs';
import { readingPosition, assertPositionPin, sourceRevision, isReadingLocator } from '../web/reading-position.mjs';
import { readingPagePosition, assertPageRequest, assertPagePin, readingPageBounds, readingJumpOffset } from '../web/reading-navigation.mjs';

const contexts = [{ uid: 'mn10' }, { book: 's0201m' }, { kind: 'post', uid: 'Vism 1.1' }, { kind: 'commentary', uid: 'commentary:abh01a.att.xml' }, { kind: 'commentary', uid: 'mn10/31' }, { uid: 'mn10', plan: 'mn-year', day: 26 }];
const query = href => new URLSearchParams(href.slice(6));
const page = (offset = 0, returned = 30, total = 90) => ({ offset, returned, total_segments: total, next_offset: offset + returned < total ? offset + returned : null, source: { commit: 'source-revision' }, segments: Array.from({ length: returned }, (_, index) => ({ ref: 'synthetic/' + (offset + index + 1) })) });

test('page routes preserve shared source context without inventing a paragraph reference or saved locator', () => {
  for (const context of contexts) {
    const before = structuredClone(context), href = readingPagePosition(context, 30, 'source-revision'), args = query(href);
    for (const [key, value] of Object.entries(context)) assert.equal(args.get(key), String(value));
    assert.equal(args.get('offset'), '30'); assert.equal(args.get('page_source'), 'source-revision');
    assert.equal(args.has('ref'), false); assert.equal(args.has('source'), false);
    assert.equal(isReadingLocator(href), false);
    assert.doesNotThrow(() => assertPageRequest(args)); assert.doesNotThrow(() => assertPagePin(args, page(30)));
    assert.deepEqual(context, before);
    const paragraph = readingPosition(context, 30, 'actual-reference/31', 'source-revision');
    assert.equal(isReadingLocator(paragraph), true); assert.doesNotThrow(() => assertPositionPin(query(paragraph), page(30)));
  }
});

test('page and paragraph routes use the same context validator while old source/ref pin semantics stay intact', () => {
  for (const context of [{}, { uid: 'https://example.com' }, { uid: 'mn10', book: 's0201m' }, { book: 's0201m', kind: 'post' }, { uid: 'mn10', note: 'private' }, { uid: 'mn10', allow_partial: true }, { uid: 'mn10', day: 1 }, { uid: 'mn10', plan: 'mn-year' }, { uid: 'mn10', plan: 'mn-year', day: 0 }, { uid: 'mn10', kind: 'post', plan: 'mn-year', day: 1 }]) {
    assert.throws(() => readingPagePosition(context, 0, 'source-revision'));
    assert.throws(() => readingPosition(context, 0, 'actual-reference/1', 'source-revision'));
  }
  for (const offset of [-1, 0.5, 100001, '0', NaN]) assert.throws(() => readingPagePosition({ uid: 'mn10' }, offset, 'source-revision'));
  for (const revision of [undefined, null, '', '<bad>', 'https://example.com', 'a\nb']) assert.throws(() => readingPagePosition({ uid: 'mn10' }, 0, revision));
  const legacy = new URLSearchParams('uid=mn10&offset=30&ref=mn10%2F31&source=source-revision');
  assert.doesNotThrow(() => assertPageRequest(legacy)); assert.doesNotThrow(() => assertPagePin(legacy, {}));
  assert.doesNotThrow(() => assertPositionPin(legacy, page(30)));
  assert.throws(() => assertPositionPin(new URLSearchParams('source=source-revision&offset=30'), page(30)));
});

test('early page guard rejects every mixed, duplicate, unknown or malformed navigation parameter', () => {
  const good = 'uid=mn10&offset=30&page_source=source-revision';
  for (const tail of ['&source=source-revision', '&ref=mn10%2F31', '&offset=31', '&page_source=other', '&uid=mn11', '&kind=post&kind=post', '&script=thai', '&note=private', '&translation=default', '&allow_shared=true', '&plan=mn-year&day=1&day=1']) assert.throws(() => assertPageRequest(new URLSearchParams(good + tail)), tail);
  for (const offset of ['', '-1', '+1', '1.5', '1e2', ' 1', '1 ', '01', '١', '100001', '9'.repeat(100)]) assert.throws(() => assertPageRequest(new URLSearchParams({ uid: 'mn10', offset, page_source: 'source-revision' })), offset);
  for (const text of ['uid=mn10&page_source=source-revision', 'uid=mn10&offset=0&page_source=', 'offset=0&page_source=source-revision', good + '&book=s0201m', good + '&plan=mn-year', good + '&plan=mn-year&day=01', good + '&plan=mn-year&day=1e2', good + '&plan=mn-year&day=401']) assert.throws(() => assertPageRequest(new URLSearchParams(text)), text);
  assert.doesNotThrow(() => assertPageRequest(new URLSearchParams('uid=mn10&note=existing-unflagged-behavior')));
});

test('guarded responses require exact revision, offset and a nonempty internally consistent page before wording', () => {
  const args = query(readingPagePosition({ uid: 'mn10' }, 30, 'source-revision'));
  assert.doesNotThrow(() => assertPagePin(args, page(30)));
  for (const data of [page(0), { ...page(30), returned: 0, segments: [] }, { ...page(30), segments: [] }, { ...page(30), total_segments: 30 }, { ...page(30), total_segments: 29 }, { ...page(30), offset: '30' }, { ...page(30), returned: 31 }, { ...page(30), total_segments: 100002 }]) assert.throws(() => assertPagePin(args, data));
  for (const source of [{ commit: 'changed' }, {}, { commit: 'source-revision', locator_revision: 'new-mapping' }]) assert.throws(() => assertPagePin(args, { ...page(30), source }), error => error.code === 'READING_SOURCE_CHANGED');
  const mapped = { ...page(30), source: { commit: 'original-source', locator_revision: 'source-revision' } };
  assert.doesNotThrow(() => assertPagePin(args, mapped));
  for (const source of [{ commit: null }, { commit: '<bad>' }, { commit: 'source-revision', locator_revision: null }]) assert.throws(() => assertPagePin(args, { ...page(30), source }));
});

test('actual bundled source metadata supports precise page bounds and independent display-script changes', () => {
  const unit = canon.resolve('mn10').unit, segments = canon.segments(unit), source = canon.readingSource(unit);
  assert.ok(segments.length > 30);
  const returned = Math.min(30, segments.length - 30), data = { source, offset: 30, returned, total_segments: segments.length, next_offset: 30 + returned < segments.length ? 30 + returned : null, segments: segments.slice(30, 60).map(segment => ({ ref: segment.ref })) };
  const href = readingPagePosition({ uid: unit.id }, data.offset, sourceRevision(data));
  assert.doesNotThrow(() => assertPagePin(query(href), data));
  assert.deepEqual(readingPageBounds(data), { start: 0, end: segments.length, current: 30 });
  assert.equal(readingJumpOffset('1', data), 0); assert.equal(readingJumpOffset(String(segments.length), data), segments.length - 1);
  for (const script of ['roman', 'thai', 'sinhala', 'devanagari']) {
    const display = { ...data, script, title: 'धम्म · display metadata' };
    assert.deepEqual(readingPageBounds(display), readingPageBounds(data));
    assert.doesNotThrow(() => assertPagePin(query(href), display));
  }
});

test('strict numeric input refuses coercion, truncation and any position outside representable source bounds', () => {
  const data = page();
  for (const text of ['', '0', '00', '01', '-1', '+1', '1.0', '1e1', '1E1', ' 1', '1 ', '\n1', '1\n', '१', '１', '91', '100002', '9'.repeat(100), null, 1]) assert.throws(() => readingJumpOffset(text, data), String(text));
  assert.equal(readingJumpOffset('30', data), 29);
  const last = page(100000, 1, 100001);
  assert.deepEqual(readingPageBounds(last), { start: 0, end: 100001, current: 100000 });
  assert.equal(readingJumpOffset('100001', last), 100000);
  assert.throws(() => readingJumpOffset('100002', last));
  for (const change of [{ total_segments: 0 }, { total_segments: 100002 }, { total_segments: '90' }, { offset: -1 }, { offset: 100001 }, { offset: 0.5 }, { offset: 90 }, { returned: 0 }, { returned: 91 }, { returned: '30' }, { returned: NaN }, { segments: undefined }, { segments: [] }, { segments: data.segments.slice(1) }, { next_offset: undefined }, { next_offset: null }, { next_offset: 29 }, { next_offset: 31 }, { next_offset: '30' }]) assert.throws(() => readingPageBounds({ ...data, ...change }));
  for (const next_offset of [undefined, 100001, '100001', 100000]) assert.throws(() => readingPageBounds({ ...last, next_offset }));
});

test('actual finite and whole-work plan windows retain assignment bounds without guessing source positions', () => {
  const plan = readingPlan(canon, { name: 'mn-year', day: 26 }), assignment = plan.readings[0], window = planWindow(plan, assignment.id), unit = canon.resolve(assignment.id).unit, total = canon.segments(unit).length;
  const data = page(window.offset, window.limit, total);
  assert.ok(window.start > 0); assert.ok(window.end !== null);
  assert.deepEqual(readingPageBounds(data, window), { start: window.start, end: window.end, current: window.offset });
  assert.equal(readingJumpOffset(String(window.start + 1), data, window), window.start);
  assert.equal(readingJumpOffset(String(window.end), data, window), window.end - 1);
  for (const text of [String(window.start), String(window.end + 1)]) assert.throws(() => readingJumpOffset(text, data, window));
  const whole = { start: 0, end: null, offset: 0, limit: 30 };
  assert.deepEqual(readingPageBounds(page(), whole), { start: 0, end: 90, current: 0 });
  for (const change of [{ start: -1 }, { start: window.end }, { end: window.start }, { end: total + 1 }, { end: '90' }, { offset: window.offset + 1 }, { limit: 0 }, { limit: window.limit - 1 }, { start: undefined }]) assert.throws(() => readingPageBounds(data, { ...window, ...change }));
});

test('helpers keep request, source and plan metadata immutable and do not use storage or network', () => {
  const args = query(readingPagePosition({ uid: 'mn10' }, 30, 'source-revision')), data = page(30), window = { start: 30, end: 90, offset: 30, limit: 30 };
  const before = JSON.stringify({ entries: [...args], data, window });
  const fetch = globalThis.fetch, storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  globalThis.fetch = () => { throw Error('No network'); };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('No storage'); } });
  try {
    assertPageRequest(args); assertPagePin(args, data); readingPageBounds(data, window); assert.equal(readingJumpOffset('31', data, window), 30);
    assert.equal(JSON.stringify({ entries: [...args], data, window }), before);
  } finally { globalThis.fetch = fetch; if (storage) Object.defineProperty(globalThis, 'localStorage', storage); else delete globalThis.localStorage; }
});
