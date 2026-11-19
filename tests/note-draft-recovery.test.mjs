import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_NOTE_DRAFT_BYTES, parseNoteDraftJournal, serializeNoteDraftJournal, stageNoteDraftEntry, removeNoteDraftEntry, reconcileNoteDraftJournal, guardedNoteDraftJournalWrite } from '../web/note-draft-recovery.mjs';
import { passageNoteKey } from '../web/passage-notes.mjs';

const mark = (uid = 'mn10') => ({ uid, ref: uid + '/3', title: 'Personal source reference', note: 'Stored personal note', offset: 2, source_commit: 'source-revision-1' });
const item = (bookmark = mark(), draft = 'Unsaved personal note') => ({ bookmark, draft });
const copy = value => JSON.parse(JSON.stringify(value));

test('journal round trips exact original bookmark fields, raw notes and every existing selector without normalizing legacy absence', () => {
  for (const uid of ['mn10', 'book:vin01m', 'post:Vism 1.1', 'commentary:abh01a.att.xml', 'commentary-ref:mn10']) {
    for (const fields of ['all', 'no-note', 'legacy', 'legacy-no-note']) {
      const bookmark = mark(uid);
      if (fields.includes('no-note')) delete bookmark.note;
      if (fields.startsWith('legacy')) { delete bookmark.offset; delete bookmark.source_commit; }
      for (const draft of ['', ' ', '\r\nOriginal\rline\nnext\ttext', '<script>private & personal</script>', '😀\ud800\u0000āṃ', 'x'.repeat(4000)]) {
        const entries = [item(bookmark, draft)], raw = serializeNoteDraftJournal(entries), checked = parseNoteDraftJournal(raw);
        assert.deepEqual(checked, entries); assert.equal(Object.hasOwn(checked[0].bookmark, 'note'), Object.hasOwn(bookmark, 'note'));
        assert.equal(Object.hasOwn(checked[0].bookmark, 'source_commit'), Object.hasOwn(bookmark, 'source_commit'));
        checked[0].bookmark.title = 'Independent clone'; assert.notEqual(bookmark.title, checked[0].bookmark.title);
      }
    }
  }
  assert.deepEqual(parseNoteDraftJournal(null), []);
  assert.deepEqual(parseNoteDraftJournal(serializeNoteDraftJournal([])), []);
});

test('finite journal rejects unknown fields, malformed bookmarks, duplicate full bases and invalid draft types without changing input', () => {
  const before = item(), raw = serializeNoteDraftJournal([before]);
  for (const value of [{ version: 2, entries: [before] }, { version: 1, entries: [before], source: 'not personal data' }, { version: 1, entries: [before], query: 'private query' }, { version: 1, entries: [before], last: '#read' }, { entries: [before] }, { version: 1, entries: null }, { version: 1, entries: [{ ...before, text: 'source body' }] }, { version: 1, entries: [before, copy(before)] }]) assert.throws(() => parseNoteDraftJournal(JSON.stringify(value)), /unreadable|unsupported/);
  for (const delta of [{ uid: 'https://example.com' }, { uid: 'post:javascript:alert(1)' }, { ref: '' }, { title: '' }, { offset: -1 }, { offset: 100001 }, { offset: 1.5 }, { source_commit: '' }, { source_commit: 'bad\nsource' }, { note: null }, { note: 1 }, { source: 'wrong' }, { note: 'x'.repeat(4001) }]) assert.throws(() => serializeNoteDraftJournal([item({ ...mark(), ...delta })]));
  for (const delta of [{ note: undefined }, { offset: undefined }, { source_commit: undefined }]) assert.throws(() => stageNoteDraftEntry([], { ...mark(), ...delta }, 'Kept draft'));
  for (const draft of [null, undefined, 1, {}, [], 'x'.repeat(4001)]) assert.throws(() => stageNoteDraftEntry([], mark(), draft));
  for (const invalid of ['', '{', '[]', 'null', 'true', '{}']) assert.throws(() => parseNoteDraftJournal(invalid));
  assert.deepEqual(before, item()); assert.equal(serializeNoteDraftJournal([before]), raw);
});

test('journal bounds both entry count and serialized UTF-8 bytes rather than character count', () => {
  const maximum = Array.from({ length: 500 }, (_, i) => item(mark('mn' + (i + 1)), 'x'.repeat(4000)));
  assert.equal(parseNoteDraftJournal(serializeNoteDraftJournal(maximum)).length, 500);
  assert.throws(() => stageNoteDraftEntry(maximum, mark('mn9999'), 'No entry was evicted'));
  const excessive = maximum.map(entry => ({ bookmark: { ...entry.bookmark, note: '\u0000'.repeat(4000) }, draft: '\u0000'.repeat(4000) }));
  assert.throws(() => serializeNoteDraftJournal(excessive));
  const raw = JSON.stringify({ version: 1, entries: excessive }); assert.ok(new TextEncoder().encode(raw).length > MAX_NOTE_DRAFT_BYTES); assert.throws(() => parseNoteDraftJournal(raw));
  const mixed = '\u0000'.repeat(2000) + '漢'.repeat(2000), multibyte = maximum.map(entry => ({ bookmark: { ...entry.bookmark, note: mixed }, draft: mixed }));
  const mixedRaw = JSON.stringify({ version: 1, entries: multibyte });
  assert.ok(mixedRaw.length < MAX_NOTE_DRAFT_BYTES); assert.ok(new TextEncoder().encode(mixedRaw).byteLength > MAX_NOTE_DRAFT_BYTES);
  assert.throws(() => parseNoteDraftJournal(mixedRaw)); assert.throws(() => serializeNoteDraftJournal(multibyte));
  const unicode = maximum.map(entry => ({ bookmark: { ...entry.bookmark, note: '漢'.repeat(4000), title: '漢'.repeat(1000), uid: 'post:' + '漢'.repeat(295), ref: '漢'.repeat(400) }, draft: '漢'.repeat(4000) }));
  // Keep references unique while retaining the multibyte byte boundary exercise.
  unicode.forEach((entry, i) => { entry.bookmark.ref = String(i) + '漢'.repeat(395); });
  const encoded = JSON.stringify({ version: 1, entries: unicode });
  assert.ok(encoded.length < MAX_NOTE_DRAFT_BYTES);
  assert.equal(parseNoteDraftJournal(encoded).length, 500);
  assert.throws(() => parseNoteDraftJournal(' '.repeat(MAX_NOTE_DRAFT_BYTES + 1)));
});

test('staging preserves quarantined former bases for one identity and changes only the exact original base', () => {
  const original = mark(), current = { ...original, note: 'New saved note' }, old = item(original, 'Older unsaved note');
  const both = stageNoteDraftEntry([old], current, 'New unsaved note');
  assert.deepEqual(both, [old, item(current, 'New unsaved note')]);
  assert.deepEqual(stageNoteDraftEntry(both, { ...original }, 'Latest older-base edit'), [item(original, 'Latest older-base edit'), item(current, 'New unsaved note')]);
  assert.equal(parseNoteDraftJournal(serializeNoteDraftJournal(both)).length, 2);
  const noNote = { ...original }; delete noNote.note;
  const blankNote = { ...noNote, note: '' };
  assert.equal(stageNoteDraftEntry([item(noNote)], blankNote, '').length, 2);
  const reordered = Object.fromEntries(Object.entries(original).reverse());
  assert.equal(stageNoteDraftEntry([old], reordered, 'Updated').length, 1);
  assert.deepEqual(old, item(original, 'Older unsaved note'));
});

test('exact unchanged current records recover drafts, including an empty draft and original CRLF strings', () => {
  const first = mark(), second = mark('mn11'), entries = [item(first, ''), item(second, '\r\nraw\rnote\n')];
  const before = copy(entries), saved = [copy(first), Object.fromEntries(Object.entries(second).reverse())];
  const result = reconcileNoteDraftJournal(entries, saved);
  assert.equal(result.drafts.get(passageNoteKey(first)), ''); assert.equal(result.drafts.get(passageNoteKey(second)), '\r\nraw\rnote\n');
  assert.deepEqual(result.restored, entries); assert.deepEqual(result.pending, []); assert.deepEqual(entries, before); assert.deepEqual(saved[0], first);
  result.restored[0].bookmark.note = 'Caller clone'; assert.equal(entries[0].bookmark.note, first.note);
});

test('changed notes, missing records, altered source pins, legacy field presence and malformed current records remain pending', () => {
  const entry = item(), original = entry.bookmark;
  for (const delta of [{ note: 'Newer saved personal note' }, { note: '' }, { title: 'Changed source title' }, { source_commit: 'new-source-revision' }, { offset: 3 }]) {
    const current = { ...original, ...delta }, result = reconcileNoteDraftJournal([entry], [current]);
    assert.equal(result.drafts.size, 0); assert.deepEqual(result.pending, [{ entry, reason: 'changed-bookmark' }]); assert.deepEqual(current, { ...original, ...delta });
  }
  for (const field of ['note', 'offset', 'source_commit']) { const current = { ...original }; delete current[field]; const result = reconcileNoteDraftJournal([entry], [current]); assert.equal(result.pending[0].reason, 'changed-bookmark'); }
  assert.equal(reconcileNoteDraftJournal([entry], []).pending[0].reason, 'missing-bookmark');
  assert.equal(reconcileNoteDraftJournal([entry], [original, copy(original)]).pending[0].reason, 'ambiguous-bookmark');
  assert.equal(reconcileNoteDraftJournal([entry], [{ ...original, unexpected: 'preserved' }]).pending[0].reason, 'unreadable-bookmark');
  assert.equal(reconcileNoteDraftJournal([entry], [{ ...original, note: null }]).pending[0].reason, 'unreadable-bookmark');
});

test('only the exact already-saved result settles an old journal entry without reviving or rebasing its draft', () => {
  const first = item(), current = { ...first.bookmark, note: first.draft }, result = reconcileNoteDraftJournal([first], [current]);
  assert.deepEqual(result.settled, [first]); assert.deepEqual(result.restored, []); assert.deepEqual(result.pending, []); assert.equal(result.drafts.size, 0);
  for (const delta of [{ source_commit: 'newer-source' }, { offset: 8 }, { title: 'Newer title' }, { note: first.draft + ' newer note' }]) {
    const changed = reconcileNoteDraftJournal([first], [{ ...current, ...delta }]);
    assert.deepEqual(changed.settled, []); assert.equal(changed.pending[0].reason, 'changed-bookmark'); assert.equal(changed.drafts.size, 0);
  }
  const legacy = mark(); delete legacy.note;
  assert.deepEqual(reconcileNoteDraftJournal([item(legacy, '')], [{ ...legacy, note: '' }]).settled, [item(legacy, '')]);
  assert.equal(reconcileNoteDraftJournal([item(legacy, '')], [legacy]).restored.length, 1, 'absent note is not silently rewritten as a committed empty note');
  const active = new Map([[passageNoteKey(first.bookmark), 'Typed after durable save']]);
  const retained = reconcileNoteDraftJournal([first], [current], active); assert.deepEqual(retained.settled, [first]); assert.deepEqual(retained.drafts, active);
  const same = item(mark(), 'Stored personal note');
  assert.deepEqual(reconcileNoteDraftJournal([same], [same.bookmark]).settled, [same]);
});

test('existing active drafts always win and valid independent recoveries do not clear quarantined entries', () => {
  const first = item(), second = item(mark('mn11'), 'Second draft'), active = new Map([[passageNoteKey(first.bookmark), 'Latest in-memory edit']]);
  const result = reconcileNoteDraftJournal([first, second], [first.bookmark, second.bookmark], active);
  assert.equal(result.drafts.get(passageNoteKey(first.bookmark)), 'Latest in-memory edit'); assert.equal(result.drafts.get(passageNoteKey(second.bookmark)), 'Second draft');
  assert.deepEqual(result.pending, [{ entry: first, reason: 'active-draft' }]); assert.deepEqual(result.restored, [second]); assert.equal(active.size, 1);
  const same = reconcileNoteDraftJournal([first], [first.bookmark], new Map([[passageNoteKey(first.bookmark), first.draft]])); assert.equal(same.pending.length, 0);
  assert.deepEqual(parseNoteDraftJournal(serializeNoteDraftJournal([first, second])), [first, second]);
});

test('save and explicit discard cleanup remove only an exact base plus current draft snapshot', () => {
  const first = item(), conflict = item({ ...first.bookmark, note: 'Another base' }, 'Quarantined text'), second = item(mark('mn11'));
  const entries = [first, conflict, second];
  assert.deepEqual(removeNoteDraftEntry(entries, first), [conflict, second]);
  assert.deepEqual(removeNoteDraftEntry(entries, { ...first, draft: 'A stale callback value' }), entries);
  assert.deepEqual(removeNoteDraftEntry(entries, item({ ...first.bookmark, source_commit: 'different' }, first.draft)), entries);
  assert.deepEqual(entries, [first, conflict, second]);
  const changed = stageNoteDraftEntry(entries, first.bookmark, 'Typed after confirmation was opened');
  assert.deepEqual(removeNoteDraftEntry(changed, first), changed);
});

test('guard writes only this bounded session journal after two exact raw reads and preserves baselines on quota or read failure', () => {
  const first = item(), initial = serializeNoteDraftJournal([first]), next = stageNoteDraftEntry([first], first.bookmark, 'Latest draft');
  let raw = initial, reads = 0, writes = 0;
  const written = guardedNoteDraftJournalWrite({ expected: initial, entries: next, read: () => { reads++; return raw; }, write: value => { writes++; raw = value; } });
  assert.equal(reads, 3); assert.equal(writes, 1); assert.equal(written, raw); assert.deepEqual(parseNoteDraftJournal(raw), next);
  raw = initial;
  assert.throws(() => guardedNoteDraftJournalWrite({ expected: initial, entries: next, read: () => raw, write: () => { throw Error('QuotaExceededError'); } }), /Quota/);
  assert.equal(raw, initial); assert.equal(next[0].draft, 'Latest draft');
  assert.throws(() => guardedNoteDraftJournalWrite({ expected: initial, entries: next, read: () => { throw Error('SecurityError'); }, write: () => { throw Error('Must not write'); } }), /SecurityError/);
  raw = null;
  const start = guardedNoteDraftJournalWrite({ expected: null, entries: [first], read: () => raw, write: value => { raw = value; } }); assert.equal(start, raw);
});

test('silent no-op writes, immediate competing writes and throw-after-write outcomes never confirm cleanup', () => {
  const first = item(), expected = serializeNoteDraftJournal([first]), cleared = serializeNoteDraftJournal([]), newer = serializeNoteDraftJournal([item(mark(), 'Newer recovery value')]);
  let raw = expected;
  assert.throws(() => guardedNoteDraftJournalWrite({ expected, entries: [], read: () => raw, write: () => {} }), error => error.code === 'NOTE_DRAFT_RECOVERY_UNCONFIRMED');
  assert.equal(raw, expected, 'a silent storage no-op retains the old journal and does not confirm discard');
  assert.throws(() => guardedNoteDraftJournalWrite({ expected, entries: [], read: () => raw, write: value => { assert.equal(value, cleared); raw = newer; } }), error => error.code === 'NOTE_DRAFT_RECOVERY_UNCONFIRMED');
  assert.equal(raw, newer, 'a changed journal is never replaced in an attempt to confirm the write');
  raw = expected;
  assert.throws(() => guardedNoteDraftJournalWrite({ expected, entries: [], read: () => raw, write: value => { raw = value; throw Error('Uncertain write outcome'); } }), /Uncertain write outcome/);
  assert.equal(raw, cleared); assert.equal(expected, serializeNoteDraftJournal([first]), 'the caller retains its old baseline after an unconfirmed outcome');
  let reads = 0;
  raw = expected;
  assert.throws(() => guardedNoteDraftJournalWrite({ expected, entries: [], read: () => { if (++reads === 3) throw Error('Read-back blocked'); return raw; }, write: value => { raw = value; } }), /Read-back blocked/);
  assert.equal(raw, cleared);
});

test('an exactly unchanged journal still checks both pre-reads but performs no write or confirmation read', () => {
  const entries = [item()], expected = serializeNoteDraftJournal(entries); let reads = 0;
  const result = guardedNoteDraftJournalWrite({ expected, entries, read: () => { reads++; return expected; }, write: () => { throw Error('An unchanged journal must not be written'); } });
  assert.equal(result, expected); assert.equal(reads, 2);
  let changedReads = 0;
  assert.throws(() => guardedNoteDraftJournalWrite({ expected, entries, read: () => ++changedReads === 1 ? expected : null, write: () => { throw Error('Must not write'); } }), error => error.code === 'NOTE_DRAFT_RECOVERY_CHANGED');
});

test('stale session raw, second-read races and unreadable originals never overwrite recovery data', () => {
  const expected = serializeNoteDraftJournal([item()]), fresh = serializeNoteDraftJournal([item(mark(), 'Changed by another document')]);
  let writes = 0, reads = 0;
  assert.throws(() => guardedNoteDraftJournalWrite({ expected, entries: [], read: () => fresh, write: () => { writes++; } }), error => error.code === 'NOTE_DRAFT_RECOVERY_CHANGED');
  assert.throws(() => guardedNoteDraftJournalWrite({ expected, entries: [], read: () => ++reads === 1 ? expected : fresh, write: () => { writes++; } }), error => error.code === 'NOTE_DRAFT_RECOVERY_CHANGED');
  for (const raw of ['{unreadable private draft', JSON.stringify({ version: 1, entries: [item(), { unreadable: 'personal material' }] })]) {
    assert.throws(() => guardedNoteDraftJournalWrite({ expected: raw, entries: [], read: () => raw, write: () => { writes++; } }), /unreadable|unsupported/);
    assert.equal(typeof raw, 'string', 'the caller retains the original raw journal for explicit download or discard');
  }
  assert.equal(writes, 0);
});

test('helper is offline, does not access browser storage or source content, and is independent of structuredClone', () => {
  const fetch = globalThis.fetch, structuredClone = globalThis.structuredClone, descriptors = ['localStorage', 'sessionStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  globalThis.fetch = () => { throw Error('No network'); }; globalThis.structuredClone = undefined;
  for (const [key] of descriptors) Object.defineProperty(globalThis, key, { configurable: true, get() { throw Error('No implicit storage access'); } });
  try {
    const entry = item(), entries = stageNoteDraftEntry([], entry.bookmark, entry.draft), raw = serializeNoteDraftJournal(entries);
    assert.deepEqual(parseNoteDraftJournal(raw), entries); assert.equal(reconcileNoteDraftJournal(entries, [entry.bookmark]).drafts.size, 1);
    assert.deepEqual(removeNoteDraftEntry(entries, entry), []);
  } finally { globalThis.fetch = fetch; globalThis.structuredClone = structuredClone; for (const [key, descriptor] of descriptors) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
});
