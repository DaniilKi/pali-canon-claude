/** Browser-local personal metadata only. These checks do not authenticate source wording. */
import { parseBookmarks } from './bookmark-import.mjs';

const own = (value, key) => Object.hasOwn(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const position = value => Number.isSafeInteger(value) && value >= 0 && value <= 100000;
const revision = value => typeof value === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(value);
// Stored records are JSON metadata; draft Maps contain strings. Keep this usable
// in the reader's ES2020 browsers without introducing a structuredClone dependency.
function clone(value, depth = 0) {
  if (depth > 32) throw Error('Personal-note metadata is nested too deeply. Keep/export it before repairing it.');
  if (value instanceof Map) return new Map([...value].map(([key, item]) => [clone(key, depth + 1), clone(item, depth + 1)]));
  if (Array.isArray(value)) return value.map(item => clone(item, depth + 1));
  if (object(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item, depth + 1)]));
  return value;
}
const noteText = value => {
  if (typeof value !== 'string' || value.length > 4000) throw Error('Personal notes must be text of at most 4,000 characters.');
  return value;
};
function bookmarkShape(item) {
  // Reuse the existing export grammar, without rewriting legacy or saved pins.
  parseBookmarks(JSON.stringify({ format: 'pali-library-v1', saved: [item] }));
  if (own(item, 'offset') && !position(item.offset)) throw Error('This bookmark has invalid saved-position metadata.');
  if (own(item, 'source_commit') && (!revision(item.source_commit) || !position(item.offset))) throw Error('This bookmark has invalid saved revision or position metadata.');
}
function currentContext(context) {
  if (!object(context) || Object.keys(context).some(key => !['uid', 'ref', 'title', 'offset', 'source_commit'].includes(key))) throw Error('This passage has unsupported personal-note reference metadata.');
  bookmarkShape({ ...context, note: '' });
  if (!position(context.offset) || !revision(context.source_commit)) throw Error('This passage has no valid current position and source revision.');
}

/** The existing draft identity, shared with the Saved view and local export. */
export function passageNoteKey(item) {
  if (!object(item) || typeof item.uid !== 'string' || !item.uid || typeof item.ref !== 'string' || !item.ref) throw Error('A personal note needs an exact source selector and passage reference.');
  return JSON.stringify([item.uid, item.ref]);
}

/** A stale or malformed record remains in Saved; it is never rebound in context. */
export function passageNoteState(saved, context) {
  if (!Array.isArray(saved)) throw Error('Saved passages must be an array.');
  let key, item = null;
  try {
    currentContext(context);
    key = passageNoteKey(context);
    const matches = saved.filter(value => object(value) && value.uid === context.uid && value.ref === context.ref);
    if (matches.length > 1) throw Error('Duplicate saved references need review in Saved before editing a note here.');
    item = matches[0] ?? null;
    if (item) bookmarkShape(item);
    if (item && own(item, 'source_commit') && item.source_commit !== context.source_commit) throw Error('The saved source revision differs. Review or edit this personal note in Saved; it was not associated with the current passage.');
    const legacy = Boolean(item && !own(item, 'source_commit'));
    return { eligible: true, reason: null, warning: legacy ? 'Unversioned bookmark: no source revision was saved. Check the reference before using this personal note; editing leaves it unversioned.' : null, legacy, item: clone(item), key };
  } catch (error) {
    // Unsupported local metadata stays stored/exportable. Do not clone a rejected
    // record here: its nesting may itself be why safe in-context editing failed.
    return { eligible: false, reason: error.message, warning: null, legacy: false, item: null, key: key ?? null };
  }
}

export function createPassageBookmark(context) {
  currentContext(context);
  return { uid: context.uid, ref: context.ref, title: context.title, note: '', offset: context.offset, source_commit: context.source_commit };
}

/** Removal must also protect a stored note when its current draft clears it. */
export function passageNoteRemovalNeedsConfirmation(item, drafts) {
  if (!(drafts instanceof Map)) throw Error('Personal-note drafts must be a Map.');
  const key = passageNoteKey(item);
  const stored = item.note === undefined ? '' : noteText(item.note);
  const draft = drafts.has(key) ? noteText(drafts.get(key)) : '';
  return stored.length > 0 || draft.length > 0;
}

/** Stage changes; callers persist explicitly, then apply or restore these local snapshots. */
export function passageNoteTransaction(saved, drafts, context, operation) {
  if (!(drafts instanceof Map) || !object(operation) || Object.keys(operation).some(key => !['type', 'note', 'confirmed', 'mode'].includes(key)) || !['ensure', 'save', 'remove'].includes(operation.type) || own(operation, 'mode') && !['reading', 'saved'].includes(operation.mode)) throw Error('Unsupported personal-note change.');
  let state;
  if (operation.mode === 'saved') {
    if (!Array.isArray(saved) || !object(context) || Object.keys(context).some(key => !['uid', 'ref'].includes(key)) || operation.type === 'ensure') throw Error('Saved note edits require an exact existing bookmark identity.');
    parseBookmarks(JSON.stringify({ format: 'pali-library-v1', saved: [{ ...context, title: 'Personal bookmark', note: '' }] }));
    const matches = saved.filter(item => object(item) && item.uid === context.uid && item.ref === context.ref);
    if (matches.length !== 1) throw Error('Saved note edits require one exact existing bookmark.');
    state = { eligible: true, key: passageNoteKey(context), item: clone(matches[0]) };
  } else state = passageNoteState(saved, context);
  if (!state.eligible) throw Error(state.reason);
  const { key } = state;
  if (drafts.has(key)) noteText(drafts.get(key));
  if (operation.type !== 'save' && own(operation, 'note')) throw Error('Only saving a personal note accepts note text.');
  if (own(operation, 'confirmed') && typeof operation.confirmed !== 'boolean') throw Error('Removal confirmation must be explicit.');
  const note = operation.type === 'save' ? noteText(operation.note) : undefined;
  if (operation.type === 'remove' && !state.item) throw Error('This exact passage is not saved.');
  if (operation.type === 'remove' && passageNoteRemovalNeedsConfirmation(state.item, drafts) && operation.confirmed !== true) {
    const error = Error('Confirm removal of this bookmark and its personal note first.'); error.code = 'NOTE_CONFIRMATION_REQUIRED'; throw error;
  }
  if (!state.item && saved.length >= 500) throw Error('Your saved list is full (500 passages). Export or remove passages before adding a note.');
  const before = { saved: clone(saved), drafts: clone(drafts) };
  // Failed note writes must retain the user's latest text even if input was not staged yet.
  if (operation.type === 'save') before.drafts.set(key, note);
  const result = { saved: clone(saved), drafts: clone(drafts), before, item: null, removed: operation.type === 'remove' };
  const index = result.saved.findIndex(item => object(item) && item.uid === context.uid && item.ref === context.ref);
  if (operation.type === 'remove') result.saved.splice(index, 1);
  else {
    const item = state.item ?? createPassageBookmark(context);
    if (operation.type === 'save') item.note = note;
    if (index < 0) result.saved.push(item); else result.saved[index] = item;
    result.item = clone(item);
  }
  if (operation.type !== 'ensure') result.drafts.delete(key);
  return result;
}

/** Use for failed/uncertain persistence; no retry, storage access or source-pin changes. */
export function restorePassageNoteTransaction(transaction) {
  if (!object(transaction?.before) || !Array.isArray(transaction.before.saved) || !(transaction.before.drafts instanceof Map)) throw Error('No personal-note transaction snapshot is available.');
  return clone(transaction.before);
}
