import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewBackupNoteConflicts, applyBackupNoteChoices } from '../web/backup-note-conflicts.mjs';
import { createStudyBackup, mergeStudyBackup } from '../web/study-backup.mjs';

const bookmark = (uid = 'mn10', note = 'Current private note') => ({ uid, ref: uid + '/1', title: 'Current bookmark title', note, offset: 0, source_commit: 'saved-locator-revision' });
const key = item => JSON.stringify([item.uid, item.ref]);
const incoming = saved => createStudyBackup({ saved, progress: [], resume: null });
const current = (saved, drafts = new Map(), progress = []) => ({ saved, progress, drafts });

test('explicit choices replace only personal notes for exact pinned tuples across all four source kinds', () => {
  for (const uid of ['mn10', 'book:abh01m.mul.xml', 'commentary:abh01a.att.xml', 'commentary-ref:dn1', 'post:Vism 1.1', 'post:postcanonical:vism']) {
    const original = bookmark(uid), replacement = { ...original, title: 'Incoming cosmetic title', note: 'Incoming private note' };
    const rows = reviewBackupNoteConflicts([original], [replacement]);
    assert.deepEqual(rows, [{ key: key(original), uid, ref: original.ref, currentNote: original.note, incomingNote: replacement.note, eligible: true, reason: null }]);
    const result = applyBackupNoteChoices([original], [replacement], new Map(), [key(original)]);
    assert.deepEqual(result.saved, [{ ...original, note: replacement.note }]);
    assert.equal(result.saved[0].offset, 0); assert.equal(result.saved[0].title, 'Current bookmark title');
    assert.equal(result.notesReplaced, 1); assert.deepEqual(result.replacedNoteKeys, [key(original)]);
    assert.equal(original.note, 'Current private note');
  }
});

test('three-argument merges retain their exact old return shape and current notes, including drafts', () => {
  const original = bookmark(), drafts = new Map([[key(original), 'Unsaved current draft']]), state = current([original], drafts);
  const file = incoming([{ ...original, note: 'Incoming note' }, bookmark('mn11', 'New reference note')]);
  const expected = { saved: [original, file.saved[1]], progress: [], bookmarkAdded: 1, bookmarkDuplicates: 0, bookmarkConflicts: 1, progressAdded: 0, progressDuplicates: 0, progressConflicts: 0 };
  assert.deepEqual(mergeStudyBackup(state, file, undefined), expected);
  const declined = mergeStudyBackup(state, file, undefined, []);
  assert.deepEqual(declined, { ...expected, notesReplaced: 0, replacedNoteKeys: [] });
  assert.equal(drafts.get(key(original)), 'Unsaved current draft');
});

test('choice-enabled merge changes only selected duplicate notes and keeps additions, metadata and old progress bytes', () => {
  const first = bookmark(), second = bookmark('mn11'), addition = bookmark('mn12', 'New note');
  const mark = { name: 'retired-plan', day: 1, signature: ' ' + JSON.stringify({ name: 'retired-plan', day: 1, source: 'old-source', readings: [{ id: 'mn10', offset: 0, limit: null, part: null, of: null }] }) + '\n' };
  const state = current([first, second], new Map([[key(first), 'Draft retained until durable write']]), [mark]);
  const file = incoming([{ ...first, title: 'Different incoming title', note: 'Chosen incoming note' }, { ...second, note: 'Unchosen incoming note' }, addition]);
  const before = structuredClone(state), result = mergeStudyBackup(state, file, undefined, [key(first)]);
  assert.deepEqual(result.saved, [{ ...first, note: 'Chosen incoming note' }, second, addition]);
  assert.deepEqual(result.progress, [mark]); assert.equal(result.progress[0].signature, mark.signature);
  assert.equal(result.bookmarkAdded, 1); assert.equal(result.bookmarkConflicts, 2); assert.equal(result.notesReplaced, 1);
  assert.deepEqual(result.replacedNoteKeys, [key(first)]); assert.deepEqual(state, before);
});

test('effective drafts include empty strings and note equality never silently selects a replacement', () => {
  const original = bookmark(), changed = { ...original, note: 'Incoming private note' };
  const empty = new Map([[key(original), '']]);
  assert.equal(reviewBackupNoteConflicts([original], [changed], empty)[0].currentNote, '');
  assert.equal(reviewBackupNoteConflicts([original], [{ ...changed, note: '' }], empty).length, 0);
  assert.throws(() => applyBackupNoteChoices([original], [{ ...changed, note: '' }], empty, [key(original)]), /unknown|eligible/);
  const differsFromDraft = new Map([[key(original), 'Edited draft']]);
  const restoreStored = applyBackupNoteChoices([original], [original], differsFromDraft, [key(original)]);
  assert.equal(restoreStored.notesReplaced, 1); assert.equal(restoreStored.saved[0].note, original.note);
  assert.equal(differsFromDraft.get(key(original)), 'Edited draft');
  assert.deepEqual(reviewBackupNoteConflicts([original], [{ ...original, title: 'Cosmetic title only' }]), []);
});

test('legacy, incomplete, mismatched or malformed source tuples are visible but cannot replace or upgrade notes', () => {
  const original = bookmark(), changed = { ...original, note: 'Incoming private note' };
  for (const delta of [{ source_commit: undefined }, { source_commit: null }, { source_commit: '' }, { source_commit: '<bad>' }, { source_commit: 'https://example.com' }, { source_commit: 'different-source' }, { offset: undefined }, { offset: null }, { offset: -1 }, { offset: 0.5 }, { offset: 100001 }, { offset: 1 }, { text: 'Unsupported source-body field' }, { note: undefined }, { title: '' }]) {
    for (const [saved, imported] of [[[original], [{ ...changed, ...delta }]], [[{ ...original, ...delta }], [changed]]]) {
      const rows = reviewBackupNoteConflicts(saved, imported);
      // The explicit undefined-note case still differs from the other note and is ineligible.
      assert.equal(rows.length, 1, JSON.stringify(delta)); assert.equal(rows[0].eligible, false); assert.equal(typeof rows[0].reason, 'string');
      const before = structuredClone({ saved, imported });
      assert.throws(() => applyBackupNoteChoices(saved, imported, new Map(), [key(original)]), /eligible/);
      assert.deepEqual({ saved, imported }, before);
    }
  }
  for (const field of ['source_commit', 'offset']) {
    const legacy = { ...original }; delete legacy[field];
    assert.equal(reviewBackupNoteConflicts([legacy], [changed])[0].eligible, false);
    const imported = { ...changed }; delete imported[field];
    assert.equal(reviewBackupNoteConflicts([original], [imported])[0].eligible, false);
  }
});

test('duplicate, unknown, identical-note and noncanonical identity choices fail atomically', () => {
  const original = bookmark(), replacement = { ...original, note: 'Incoming note' }, other = bookmark('mn11');
  for (const [saved, imported] of [[[original, { ...original }], [replacement]], [[original], [replacement, { ...replacement }]]]) {
    const rows = reviewBackupNoteConflicts(saved, imported); assert.equal(rows[0].eligible, false); assert.match(rows[0].reason, /Duplicate/);
    assert.throws(() => applyBackupNoteChoices(saved, imported, new Map(), [key(original)]));
  }
  for (const choices of [[key(original), key(original)], [key(original), key(other)], [' ["mn10","mn10/1"]'], ['mn10/1'], [null], {}, null]) assert.throws(() => applyBackupNoteChoices([original], [replacement], new Map(), choices));
  assert.throws(() => applyBackupNoteChoices([original], [original], new Map(), [key(original)]));
  const state = current([original]), file = incoming([replacement, other]), before = structuredClone(state);
  assert.throws(() => mergeStudyBackup(state, file, undefined, [key(original), key(other)]));
  assert.deepEqual(state, before);
});

test('raw incoming Unicode, CRLF, markup and explicit empty notes are copied exactly without display normalization', () => {
  const original = bookmark();
  for (const text of ['', 'Private 😀 reflection\r\nSecond line\r\n', '<b>Personal markup stays text</b>&\r\n', 'e\u0301 and é remain distinct', '😀'.repeat(2000)]) {
    const replacement = { ...original, note: text }, result = mergeStudyBackup(current([original]), incoming([replacement]), undefined, [key(original)]);
    assert.equal(result.saved[0].note, text); assert.equal(result.saved[0].note.length, text.length);
    assert.equal(result.saved[0].source_commit, original.source_commit); assert.equal(result.saved[0].offset, 0);
  }
  for (const note of ['x'.repeat(4001), null, 7]) assert.throws(() => reviewBackupNoteConflicts([original], [{ ...original, note }]));
  assert.throws(() => reviewBackupNoteConflicts([original], [{ ...original, note: 'Incoming' }], new Map([[key(original), 'x'.repeat(4001)]])));
});

test('Apply recomputes eligibility against changed source state, note state and incoming selection', () => {
  const original = bookmark(), replacement = { ...original, note: 'Incoming note' };
  assert.equal(reviewBackupNoteConflicts([original], [replacement])[0].eligible, true);
  for (const saved of [[{ ...original, source_commit: 'changed-revision' }], [{ ...original, offset: 1 }], [{ ...original, note: replacement.note }], []]) assert.throws(() => applyBackupNoteChoices(saved, [replacement], new Map(), [key(original)]));
  assert.throws(() => applyBackupNoteChoices([original], [replacement], new Map([[key(original), replacement.note]]), [key(original)]));
  assert.throws(() => applyBackupNoteChoices([original], [{ ...replacement, ref: 'mn10/2' }], new Map(), [key(original)]));
});

test('frozen personal metadata stays immutable and returned candidates/keys are independent clones', () => {
  const original = Object.freeze(bookmark()), replacement = Object.freeze({ ...original, note: 'Incoming private note' });
  const saved = Object.freeze([original]), imported = Object.freeze([replacement]), drafts = new Map([[key(original), 'Unsaved draft']]);
  const choices = Object.freeze([key(original)]), before = JSON.stringify({ saved, imported, drafts: [...drafts] });
  const result = applyBackupNoteChoices(saved, imported, drafts, choices);
  result.saved[0].title = 'Independent returned title'; result.replacedNoteKeys.push('Independent returned key');
  assert.equal(JSON.stringify({ saved, imported, drafts: [...drafts] }), before);
  assert.equal(original.title, 'Current bookmark title'); assert.equal(choices.length, 1);
});

test('note review/selection is offline and uses no DOM, storage or new native clone requirement', () => {
  const fetch = globalThis.fetch, clone = globalThis.structuredClone, storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), document = Object.getOwnPropertyDescriptor(globalThis, 'document');
  globalThis.fetch = () => { throw Error('No network'); }; globalThis.structuredClone = undefined;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('No storage'); } });
  Object.defineProperty(globalThis, 'document', { configurable: true, get() { throw Error('No DOM normalization'); } });
  try {
    const original = bookmark(), replacement = { ...original, note: 'Personal\r\n<b>raw</b>' };
    assert.equal(reviewBackupNoteConflicts([original], [replacement])[0].incomingNote, replacement.note);
    assert.equal(applyBackupNoteChoices([original], [replacement], new Map(), [key(original)]).saved[0].note, replacement.note);
  } finally {
    globalThis.fetch = fetch; globalThis.structuredClone = clone;
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage); else delete globalThis.localStorage;
    if (document) Object.defineProperty(globalThis, 'document', document); else delete globalThis.document;
  }
});
