import test from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { readingPlan } from '../src/daily.mjs';
import { daySignature, planCatalog } from '../web/reading-plans.mjs';
import { readingPosition } from '../web/reading-position.mjs';
import { parseProgress, parseProgressMetadata } from '../web/progress-import.mjs';
import { MAX_STUDY_BACKUP_BYTES, createStudyBackup, parseStudyBackup, mergeStudyBackup, snapshotStudyState, restoreStudyState } from '../web/study-backup.mjs';

const catalog = planCatalog(readingPlan(canon, {}));
const bookmark = (uid = 'mn10') => ({ uid, ref: uid + '/3', title: 'Synthetic personal bookmark', note: 'Personal reflection', offset: 2, source_commit: 'older-source-pin' });
const mark = (day = 1) => ({ name: 'mn-year', day, signature: daySignature(readingPlan(canon, { name: 'mn-year', day })) });
const oldMark = name => ({ name, day: 1, signature: JSON.stringify({ name, day: 1, source: 'old-source', readings: [{ id: 'mn10', offset: 0, limit: null, part: null, of: null }] }) });
const resume = readingPosition({ uid: 'mn10' }, 2, 'mn10/3', 'old-source');
const input = (saved = [], progress = [], locator = null) => ({ saved, progress, resume: locator });
const backup = (...args) => createStudyBackup(input(...args));
const current = (saved = [], progress = [], drafts = new Map()) => ({ saved, progress, drafts });
const progressFile = progress => JSON.stringify({ format: 'pali-library-reading-progress-v1', progress });

test('single-file round trip reuses all bookmark selector formats and preserves legacy and stale source pins', () => {
  const saved = ['mn10', 'book:0', 'book:abh01m.mul.xml', 'post:Vism 1.1', 'post:postcanonical:vism', 'commentary:abh01a.att.xml', 'commentary-ref:dn1'].map(bookmark);
  saved.push({ uid: 'dhp183', ref: 'dhp183/1', title: 'Legacy personal bookmark' });
  const result = backup(saved, [mark()], resume), decoded = parseStudyBackup(JSON.stringify(result));
  assert.deepEqual(Object.keys(result), ['format', 'saved', 'progress', 'resume']);
  assert.equal(result.format, 'pali-library-study-backup-v1'); assert.deepEqual(decoded, result);
  assert.equal(decoded.saved.at(-1).note, ''); assert.equal(Object.hasOwn(decoded.saved.at(-1), 'source_commit'), false);
  for (const item of decoded.saved.slice(0, -1)) assert.equal(item.source_commit, 'older-source-pin');
  assert.equal(decoded.resume, resume);
});

test('metadata parser/export preserves unknown old plans without claiming current catalogue authority', () => {
  const original = oldMark('retired-plan'), signature = JSON.parse(original.signature);
  original.signature = JSON.stringify({ readings: signature.readings, source: signature.source, day: signature.day, name: signature.name }, null, 2);
  const canonical = parseProgressMetadata(progressFile([original]));
  assert.equal(canonical[0].signature, oldMark('retired-plan').signature);
  const file = backup([], [original]); assert.equal(file.progress[0].signature, original.signature);
  assert.equal(parseStudyBackup(JSON.stringify(file)).progress[0].signature, canonical[0].signature);
  assert.throws(() => parseProgress(progressFile([original]), catalog));
  assert.throws(() => mergeStudyBackup(current(), file, catalog));
  for (const metadata of [undefined, null, [], {}]) assert.throws(() => mergeStudyBackup(current(), backup([], [mark()]), metadata), /Current reading-plan/);
  assert.equal(mergeStudyBackup(current(), backup()).progressAdded, 0);
});

test('restore uses actual catalogue names/day bounds while preserving existing progress signature bytes', () => {
  const old = oldMark('retired-plan'); old.signature = '  ' + old.signature + '\n';
  const state = current([], [old]), before = JSON.stringify(state.progress);
  const result = mergeStudyBackup(state, backup([], [mark()]), catalog);
  assert.equal(result.progressAdded, 1); assert.equal(result.progress[0].signature, old.signature);
  assert.equal(JSON.stringify(state.progress), before);
  const plan = catalog.find(item => item.days < 400);
  assert.ok(plan, 'an actual shorter plan exercises catalogue day bounds');
  const tooLate = oldMark(plan.name); tooLate.day = plan.days + 1;
  const signature = JSON.parse(tooLate.signature); signature.day = tooLate.day; tooLate.signature = JSON.stringify(signature);
  assert.throws(() => mergeStudyBackup(current(), backup([], [tooLate]), catalog));
});

test('additive bookmark merge distinguishes identical effective drafts from note/metadata conflicts', () => {
  const first = bookmark(), second = bookmark('mn11'), third = bookmark('mn12');
  const drafts = new Map([[JSON.stringify([first.uid, first.ref]), 'Unsaved local reflection']]);
  const state = current([first, second], [], drafts), before = snapshotStudyState(state);
  const incoming = backup([{ ...first, note: 'Unsaved local reflection' }, { ...second, source_commit: 'other-source' }, third]);
  const result = mergeStudyBackup(state, incoming);
  assert.equal(result.bookmarkAdded, 1); assert.equal(result.bookmarkDuplicates, 1); assert.equal(result.bookmarkConflicts, 1);
  assert.deepEqual(result.saved, [first, second, third]); assert.deepEqual(state, before);
  assert.equal(mergeStudyBackup(state, backup([{ ...first, note: '' }])).bookmarkConflicts, 1);
  const clearing = current([first], [], new Map([[JSON.stringify([first.uid, first.ref]), '']]));
  assert.equal(mergeStudyBackup(clearing, backup([{ ...first, note: '' }])).bookmarkDuplicates, 1);
  result.saved[0].note = 'Independent clone'; assert.equal(first.note, 'Personal reflection');
});

test('progress merge keeps conflicting current signatures and counts identical versus added marks', () => {
  const first = mark(), second = mark(2), different = { ...first, signature: first.signature.replace('"source":"', '"source":"old-') };
  const result = mergeStudyBackup(current([], [first]), backup([], [different, second]), catalog);
  assert.deepEqual(result.progress, [first, second]); assert.equal(result.progressAdded, 1); assert.equal(result.progressDuplicates, 0); assert.equal(result.progressConflicts, 1);
  assert.equal(mergeStudyBackup(current([], [first]), backup([], [first]), catalog).progressDuplicates, 1);
});

test('bookmark and progress capacity failures are atomic and do not mutate drafts or any arrays', () => {
  const saved = Array.from({ length: 500 }, (_, index) => bookmark('mn' + index));
  const state = current(saved, [], new Map([[JSON.stringify([saved[0].uid, saved[0].ref]), 'Draft to keep']])), before = snapshotStudyState(state);
  assert.throws(() => mergeStudyBackup(state, backup([bookmark('mn999')], [mark()]), catalog), /500/);
  assert.deepEqual(state, before);
  const full = current([bookmark()], Array.from({ length: 1600 }, (_, index) => oldMark('retired-' + index)));
  const original = snapshotStudyState(full);
  assert.throws(() => mergeStudyBackup(full, backup([bookmark('mn11')], [mark()]), catalog), /1,600/);
  assert.deepEqual(full, original);
  assert.throws(() => backup([...saved, bookmark('mn999')]));
  assert.throws(() => backup([], [...full.progress, oldMark('extra')]));
});

test('malformed rows, unknown fields, source bodies, settings and duplicate identities fail as one file', () => {
  const good = backup([bookmark()], [mark()]);
  for (const bad of [{ ...good, body: 'Not a source bundle' }, { ...good, settings: {} }, { ...good, account: 'private' }, { ...good, format: 'other' }, { ...good, saved: [{ ...bookmark(), text: 'No source body field' }] }, { ...good, saved: [{ ...bookmark(), translation_scope: null }] }, { ...good, saved: [bookmark(), bookmark()] }, { ...good, saved: [{ ...bookmark(), note: 'x'.repeat(4001) }] }, { ...good, saved: [{ ...bookmark(), offset: -1 }] }, { ...good, progress: [mark(), mark()] }, { ...good, progress: [{ ...mark(), text: 'No scripture' }] }, { ...good, progress: [{ ...mark(), signature: '{}' }] }]) assert.throws(() => parseStudyBackup(JSON.stringify(bad)));
  for (const bad of [undefined, {}, { saved: [], progress: [] }, { ...input(), settings: false }, { ...input(), saved: [{ ...bookmark(), body: undefined }] }, { ...input(), progress: [{ ...mark(), signature: undefined }] }]) assert.throws(() => createStudyBackup(bad));
  assert.throws(() => parseStudyBackup('{'));
  const state = current([bookmark()]), before = snapshotStudyState(state);
  assert.throws(() => mergeStudyBackup(state, { ...good, saved: [{ ...bookmark('mn11'), note: null }] }, catalog));
  assert.deepEqual(state, before);
});

test('resume uses only existing reading-locator grammar and merge never applies preferences or resume', () => {
  const locators = [resume, '#read?uid=mn10', readingPosition({ book: '0' }, 2, 'source/3', 'old-source'), readingPosition({ kind: 'post', uid: 'Vism 1.1' }, 2, 'post/3', 'old-source'), readingPosition({ kind: 'commentary', uid: 'commentary:dn' }, 2, 'commentary/3', 'old-source')];
  for (const locator of locators) assert.equal(parseStudyBackup(JSON.stringify(backup([], [], locator))).resume, locator);
  for (const locator of ['', '#saved', 'https://example.com', '#read?uid=mn10&note=private', '#read?uid=mn10&translation=default', '#read?uid=mn10&allow_partial=true', '#read?uid=mn10&source=old-source', '#read?uid=mn10&uid=mn11', '#read?uid=mn10&offset=-1']) assert.throws(() => backup([], [], locator));
  const result = mergeStudyBackup(current(), backup([], [], resume));
  assert.equal(Object.hasOwn(result, 'resume'), false); assert.equal(Object.hasOwn(result, 'remember_position'), false);
});

test('outer 32 MiB and serialized component 16 MiB limits are enforced before merge', () => {
  const small = JSON.stringify(backup());
  assert.deepEqual(parseStudyBackup(small + ' '.repeat(MAX_STUDY_BACKUP_BYTES - new TextEncoder().encode(small).length)), backup());
  assert.throws(() => parseStudyBackup(' '.repeat(MAX_STUDY_BACKUP_BYTES + 1)), /32 MiB/);
  const padded = Array.from({ length: 1450 }, (_, index) => {
    const item = oldMark('stress-' + index); item.signature += ' '.repeat(11900 - item.signature.length); return item;
  });
  assert.ok(new TextEncoder().encode(JSON.stringify({ format: 'pali-library-reading-progress-v1', progress: padded })).length > 16 * 1024 * 1024);
  assert.throws(() => backup([], padded), /16 MiB/);
  assert.throws(() => parseStudyBackup(JSON.stringify({ format: 'pali-library-study-backup-v1', ...input([], padded) })), /16 MiB/);
});

test('snapshot/restore preserve saved metadata, signature bytes and empty-clearing drafts without shared references', () => {
  const item = bookmark(), progress = [oldMark('retired-plan')], drafts = new Map([[JSON.stringify([item.uid, item.ref]), '']]);
  const state = current([item], progress, drafts), snapshot = snapshotStudyState(state), restored = restoreStudyState(snapshot);
  assert.deepEqual(restored, state); restored.saved[0].source_commit = 'Independent pin'; restored.progress[0].signature = 'Independent signature'; restored.drafts.clear();
  assert.equal(item.source_commit, 'older-source-pin'); assert.equal(drafts.size, 1); assert.deepEqual(snapshot, state);
  assert.throws(() => snapshotStudyState({ ...state, drafts: new Map([['key', 'x'.repeat(4001)]]) }));
});

test('backup export and policy helpers are offline, portable and never mutate local metadata', () => {
  const originalFetch = globalThis.fetch, originalClone = globalThis.structuredClone, descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  globalThis.fetch = () => { throw Error('No network'); }; globalThis.structuredClone = undefined;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('No storage'); } });
  try {
    const state = current([bookmark()], [oldMark('retired-plan')]), before = snapshotStudyState(state);
    const file = createStudyBackup({ saved: state.saved, progress: state.progress, resume: null });
    assert.equal(parseStudyBackup(JSON.stringify(file)).saved[0].note, 'Personal reflection');
    assert.equal(mergeStudyBackup(state, backup()).bookmarkAdded, 0); assert.deepEqual(state, before);
  } finally {
    globalThis.fetch = originalFetch; globalThis.structuredClone = originalClone;
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage;
  }
});
