import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBookmarks } from '../web/bookmark-import.mjs';
import { passageNoteKey, passageNoteState, createPassageBookmark, passageNoteRemovalNeedsConfirmation, passageNoteTransaction, restorePassageNoteTransaction } from '../web/passage-notes.mjs';

const context = (uid = 'mn10') => ({ uid, ref: uid + '/3', title: 'Synthetic local bookmark title', offset: 2, source_commit: 'source-revision-1' });
const mark = (uid = 'mn10') => ({ ...createPassageBookmark(context(uid)), note: 'Personal reflection' });
const exported = saved => JSON.stringify({ format: 'pali-library-v1', saved });

test('new notes use only the existing export schema across all reading selectors', () => {
  for (const uid of ['mn10', 'book:0', 'book:abh01m.mul.xml', 'post:Vism 1.1', 'post:postcanonical:vism', 'commentary:abh01a.att.xml', 'commentary-ref:dn1']) {
    const current = context(uid), before = structuredClone(current), item = createPassageBookmark(current);
    assert.deepEqual(item, { uid, ref: current.ref, title: current.title, note: '', offset: 2, source_commit: 'source-revision-1' });
    assert.deepEqual(parseBookmarks(exported([item])), [item]);
    assert.equal(passageNoteKey(item), JSON.stringify([uid, item.ref]));
    assert.deepEqual(current, before);
    const staged = passageNoteTransaction([], new Map(), current, { type: 'ensure' });
    assert.deepEqual(staged.saved, [item]); assert.deepEqual(staged.item, item);
  }
});

test('matching exact reference edits preserve saved metadata when the route offset or title differs', () => {
  const item = mark(), saved = [item], drafts = new Map([[passageNoteKey(item), 'Draft personal note']]);
  const before = structuredClone({ saved, drafts });
  const current = { ...context(), offset: 40, title: 'Changed display title' };
  assert.equal(passageNoteState(saved, current).eligible, true);
  const staged = passageNoteTransaction(saved, drafts, current, { type: 'save', note: 'Updated personal note' });
  assert.deepEqual(staged.saved, [{ ...item, note: 'Updated personal note' }]);
  assert.equal(staged.drafts.has(passageNoteKey(item)), false);
  assert.deepEqual({ saved, drafts }, before);
  staged.item.title = 'Independent clone'; assert.equal(staged.saved[0].title, item.title);
  const state = passageNoteState(saved, current); state.item.offset = 99; assert.equal(item.offset, 2);
});

test('stale source pins block reading association and editing without preventing Saved edits or export', () => {
  const item = { ...mark(), source_commit: 'older-revision' }, saved = [item], drafts = new Map();
  const state = passageNoteState(saved, context()); assert.equal(state.eligible, false); assert.match(state.reason, /revision differs/);
  for (const type of ['ensure', 'save', 'remove']) assert.throws(() => passageNoteTransaction(saved, drafts, context(), { type, ...(type === 'save' ? { note: 'Changed personal note' } : { confirmed: true }) }), /revision differs/);
  const staged = passageNoteTransaction(saved, drafts, { uid: item.uid, ref: item.ref }, { type: 'save', mode: 'saved', note: 'Changed personal note' });
  assert.deepEqual(staged.saved[0], { ...item, note: 'Changed personal note' });
  assert.deepEqual(parseBookmarks(exported(staged.saved)), staged.saved);
  assert.equal(saved[0].source_commit, 'older-revision');
});

test('legacy notes warn clearly and stay unversioned after ensure or edit', () => {
  for (const withOffset of [false, true]) {
    const item = { uid: 'mn10', ref: 'mn10/3', title: 'Legacy personal bookmark', note: 'Old reflection', ...(withOffset ? { offset: 1 } : {}) };
    const state = passageNoteState([item], context());
    assert.equal(state.eligible, true); assert.equal(state.legacy, true); assert.match(state.warning, /Unversioned.*no source revision.*leaves it unversioned/);
    for (const operation of [{ type: 'ensure' }, { type: 'save', note: 'Edited reflection' }]) {
      const staged = passageNoteTransaction([item], new Map(), context(), operation);
      assert.equal(Object.hasOwn(staged.saved[0], 'source_commit'), false);
      assert.equal(Object.hasOwn(staged.saved[0], 'offset'), withOffset);
      if (withOffset) assert.equal(staged.saved[0].offset, 1);
    }
  }
});

test('invalid saved or current position/revision metadata never associates a note with wording', () => {
  for (const delta of [{ offset: undefined }, { offset: null }, { offset: -1 }, { offset: 0.5 }, { offset: 100001 }, { source_commit: undefined }, { source_commit: null }, { source_commit: '' }, { source_commit: 'https://example.com' }, { source_commit: '<bad>' }]) {
    const item = { ...mark(), ...delta }, state = passageNoteState([item], context());
    assert.equal(state.eligible, false, JSON.stringify(delta));
    assert.throws(() => passageNoteTransaction([item], new Map(), context(), { type: 'save', note: 'Kept reflection' }));
    const repairedNote = passageNoteTransaction([item], new Map(), { uid: item.uid, ref: item.ref }, { type: 'save', mode: 'saved', note: 'Edited only in Saved' });
    assert.deepEqual(repairedNote.saved[0], { ...item, note: 'Edited only in Saved' });
  }
  const noOffset = mark(); delete noOffset.offset;
  assert.equal(passageNoteState([noOffset], context()).eligible, false);
  for (const delta of [{ offset: undefined }, { offset: -1 }, { source_commit: undefined }, { source_commit: '' }, { source_commit: 'a\nb' }, { note: 'Unexpected context field' }]) {
    assert.equal(passageNoteState([mark()], { ...context(), ...delta }).eligible, false);
    assert.throws(() => createPassageBookmark({ ...context(), ...delta }));
  }
});

test('identity is selector plus exact reference; no cross-kind association or ambiguous duplicate edit', () => {
  const item = mark(), saved = [item];
  for (const current of [{ ...context(), uid: 'commentary-ref:mn10' }, { ...context(), ref: 'mn10/4' }]) {
    const state = passageNoteState(saved, current); assert.equal(state.item, null);
    const staged = passageNoteTransaction(saved, new Map(), current, { type: 'ensure' });
    assert.equal(staged.saved.length, 2); assert.deepEqual(staged.saved[0], item);
    assert.throws(() => passageNoteTransaction(saved, new Map(), { uid: current.uid, ref: current.ref }, { type: 'save', mode: 'saved', note: 'Wrong identity' }), /exact existing/);
    assert.throws(() => passageNoteTransaction(saved, new Map(), current, { type: 'remove', confirmed: true }), /not saved/);
  }
  assert.equal(passageNoteState([item, { ...item }], context()).eligible, false);
  assert.throws(() => passageNoteTransaction([item, { ...item }], new Map(), { uid: item.uid, ref: item.ref }, { type: 'save', mode: 'saved', note: '' }), /one exact/);
  for (const uid of ['https://example.com', 'post:https://example.com', 'javascript:alert(1)', 'mn10\n']) assert.throws(() => createPassageBookmark(context(uid)));
});

test('deep unsupported local metadata blocks note association without interrupting passage rendering', () => {
  let extra = { value: 'Preserved personal metadata' };
  for (let depth = 0; depth < 40; depth++) extra = { nested: extra };
  const item = { ...mark(), extra }, saved = [item], before = JSON.stringify(saved);
  let state;
  assert.doesNotThrow(() => { state = passageNoteState(saved, context()); });
  assert.equal(state.eligible, false); assert.equal(state.item, null);
  assert.match(state.reason, /unsupported fields|metadata/);
  assert.equal(state.key, passageNoteKey(item));
  assert.equal(JSON.stringify(saved), before);
  assert.equal(JSON.parse(exported(saved)).saved[0].note, 'Personal reflection');
});

test('removal requires explicit confirmation for stored or draft text, including a draft that clears a note', () => {
  for (const [stored, draft] of [['Stored personal note', undefined], ['Stored personal note', ''], ['', 'Unsaved personal note'], ['', ' ']]) {
    const item = { ...mark(), note: stored }, drafts = new Map(draft === undefined ? [] : [[passageNoteKey(item), draft]]);
    const before = structuredClone({ saved: [item], drafts });
    assert.equal(passageNoteRemovalNeedsConfirmation(item, drafts), true);
    assert.throws(() => passageNoteTransaction([item], drafts, context(), { type: 'remove' }), error => error.code === 'NOTE_CONFIRMATION_REQUIRED');
    assert.deepEqual({ saved: [item], drafts }, before);
    const staged = passageNoteTransaction([item], drafts, context(), { type: 'remove', confirmed: true });
    assert.deepEqual(staged.saved, []); assert.equal(staged.drafts.has(passageNoteKey(item)), false);
    assert.deepEqual(restorePassageNoteTransaction(staged), before);
  }
  const empty = { ...mark(), note: '' }, drafts = new Map([[passageNoteKey(empty), '']]);
  assert.equal(passageNoteRemovalNeedsConfirmation(empty, drafts), false);
  assert.deepEqual(passageNoteTransaction([empty], drafts, context(), { type: 'remove' }).saved, []);
});

test('failed or uncertain transactions restore saved arrays and all drafts without changing source pins', () => {
  const item = mark(), other = mark('mn11'), saved = [item, other];
  const drafts = new Map([[passageNoteKey(item), ''], [passageNoteKey(other), 'Other draft']]);
  const staged = passageNoteTransaction(saved, drafts, context(), { type: 'save', note: 'Latest unpersisted input' });
  const rollback = restorePassageNoteTransaction(staged);
  assert.deepEqual(rollback.saved, saved); assert.equal(rollback.drafts.get(passageNoteKey(item)), 'Latest unpersisted input');
  assert.equal(rollback.drafts.get(passageNoteKey(other)), 'Other draft');
  rollback.saved[0].source_commit = 'Changed clone'; rollback.drafts.clear();
  assert.equal(saved[0].source_commit, 'source-revision-1'); assert.equal(staged.before.drafts.size, 2);
  const exportedWithDrafts = rollback.saved.map(value => staged.before.drafts.has(passageNoteKey(value)) ? { ...value, note: staged.before.drafts.get(passageNoteKey(value)) } : value);
  assert.equal(parseBookmarks(exported(exportedWithDrafts))[0].note, 'Latest unpersisted input');
  assert.throws(() => restorePassageNoteTransaction({}), /snapshot/);
});

test('capacity and note limits fail atomically, while existing notes remain editable at capacity', () => {
  const saved = Array.from({ length: 500 }, (_, index) => mark('mn' + index)), drafts = new Map(), before = structuredClone(saved);
  assert.throws(() => passageNoteTransaction(saved, drafts, context('mn999'), { type: 'ensure' }), /500/);
  assert.throws(() => passageNoteTransaction(saved, drafts, context('mn999'), { type: 'save', note: '' }), /500/);
  const staged = passageNoteTransaction(saved, drafts, context('mn1'), { type: 'save', note: 'x'.repeat(4000) });
  assert.equal(staged.saved.length, 500); assert.equal(staged.item.note.length, 4000);
  for (const note of [null, 42, 'x'.repeat(4001)]) assert.throws(() => passageNoteTransaction(saved, drafts, context('mn1'), { type: 'save', note }), /4,000/);
  assert.throws(() => passageNoteTransaction(saved, new Map([[passageNoteKey(saved[1]), 'x'.repeat(4001)]]), context('mn1'), { type: 'ensure' }), /4,000/);
  assert.deepEqual(saved, before); assert.equal(drafts.size, 0);
});

test('helpers do not perform storage/network/scripture writes and reject unsupported transaction instructions', () => {
  const originalFetch = globalThis.fetch, originalStorage = globalThis.localStorage, originalClone = globalThis.structuredClone;
  globalThis.fetch = () => { throw Error('No network allowed'); };
  globalThis.structuredClone = undefined;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('No storage allowed'); } });
  try {
    const item = mark(), saved = [item], drafts = new Map();
    assert.equal(passageNoteTransaction(saved, drafts, context(), { type: 'save', note: '<b>Personal text only</b>' }).item.note, '<b>Personal text only</b>');
    for (const operation of [{ type: 'write_source', note: '' }, { type: 'save', note: '', text: 'Not source text' }, { type: 'remove', confirmed: 'yes' }, { type: 'save', mode: 'unknown', note: '' }, { type: 'ensure', note: '' }]) assert.throws(() => passageNoteTransaction(saved, drafts, context(), operation));
    assert.throws(() => passageNoteTransaction(saved, drafts, { uid: item.uid, ref: item.ref }, { type: 'ensure', mode: 'saved' }));
    assert.deepEqual(saved, [item]); assert.equal(drafts.size, 0);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.structuredClone = originalClone;
    if (originalStorage === undefined) delete globalThis.localStorage; else Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: originalStorage });
  }
});
