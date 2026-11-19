/** Tab-session recovery for personal-note drafts only; never a saved-note write or source assertion. */
import { MAX_IMPORT_BYTES, parseBookmarks } from './bookmark-import.mjs';
import { passageNoteKey } from './passage-notes.mjs';

export const MAX_NOTE_DRAFT_BYTES = MAX_IMPORT_BYTES;
const own = (value, key) => Object.hasOwn(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => object(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const fields = ['uid', 'ref', 'title', 'note', 'offset', 'source_commit'];
const cloneBookmark = value => Object.fromEntries(fields.filter(key => own(value, key)).map(key => [key, value[key]]));
const cloneEntry = entry => ({ bookmark: cloneBookmark(entry.bookmark), draft: entry.draft });
const baseKey = bookmark => JSON.stringify(fields.map(key => own(bookmark, key) ? [key, bookmark[key]] : [key]));
const failure = () => { throw Error('This note-draft recovery journal is unreadable or unsupported. Keep or download its original contents before explicitly discarding it.'); };
const draftText = value => typeof value === 'string' && value.length <= 4000;

function bookmark(value) {
  if (!object(value) || ['uid', 'ref', 'title'].some(key => !own(value, key)) || Object.keys(value).some(key => !fields.includes(key)) || own(value, 'note') && typeof value.note !== 'string' || own(value, 'offset') && !Number.isSafeInteger(value.offset) || own(value, 'source_commit') && typeof value.source_commit !== 'string') failure();
  // Validate using the established grammar; deliberately discard its normalized
  // result so absence of note, offset or revision remains part of the base identity.
  try { parseBookmarks(JSON.stringify({ format: 'pali-library-v1', saved: [value] })); } catch { failure(); }
  return value;
}
function entry(value) {
  if (!exactKeys(value, ['bookmark', 'draft']) || !draftText(value.draft)) failure();
  bookmark(value.bookmark); return value;
}
function entries(value) {
  if (!Array.isArray(value) || value.length > 500) failure();
  const seen = new Set();
  for (const item of value) { entry(item); const key = baseKey(item.bookmark); if (seen.has(key)) failure(); seen.add(key); }
  return value;
}
function bounded(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_NOTE_DRAFT_BYTES || new TextEncoder().encode(raw).byteLength > MAX_NOTE_DRAFT_BYTES) failure();
  return raw;
}

/** Null is an absent journal. Malformed raw data throws and must remain untouched. */
export function parseNoteDraftJournal(raw) {
  if (raw === null) return [];
  bounded(raw);
  let value; try { value = JSON.parse(raw); } catch { failure(); }
  if (!exactKeys(value, ['version', 'entries']) || value.version !== 1) failure();
  return entries(value.entries).map(cloneEntry);
}
export function serializeNoteDraftJournal(value) {
  return bounded(JSON.stringify({ version: 1, entries: entries(value).map(cloneEntry) }));
}

/** Capture the editor's ORIGINAL saved record, never a later record inferred from the draft Map. */
export function stageNoteDraftEntry(value, originalBookmark, rawDraft) {
  entries(value); bookmark(originalBookmark); if (!draftText(rawDraft)) failure();
  const key = baseKey(originalBookmark), next = value.map(cloneEntry), index = next.findIndex(item => baseKey(item.bookmark) === key), staged = { bookmark: cloneBookmark(originalBookmark), draft: rawDraft };
  if (index < 0) next.push(staged); else next[index] = staged;
  // Check the complete prospective value before returning anything for persistence.
  serializeNoteDraftJournal(next); return next;
}

/** Remove one exact base-and-draft snapshot; a stale action cannot clear a newer draft. */
export function removeNoteDraftEntry(value, expectedEntry) {
  entries(value); entry(expectedEntry);
  const key = baseKey(expectedEntry.bookmark);
  return value.filter(item => baseKey(item.bookmark) !== key || item.draft !== expectedEntry.draft).map(cloneEntry);
}

/** Recover only unique unchanged saved records, preserving all existing in-memory draft values. */
export function reconcileNoteDraftJournal(value, saved, currentDrafts = new Map()) {
  entries(value);
  if (!Array.isArray(saved) || !(currentDrafts instanceof Map) || [...currentDrafts].some(([key, draft]) => typeof key !== 'string' || !draftText(draft))) failure();
  const drafts = new Map(currentDrafts), restored = [], pending = [], settled = [];
  for (const item of value) {
    const matches = saved.filter(mark => object(mark) && mark.uid === item.bookmark.uid && mark.ref === item.bookmark.ref);
    let reason;
    if (matches.length === 0) reason = 'missing-bookmark';
    else if (matches.length !== 1) reason = 'ambiguous-bookmark';
    else {
      try { bookmark(matches[0]); } catch { reason = 'unreadable-bookmark'; }
      // A durable save may have succeeded while journal cleanup failed. Recognize
      // only its exact resulting record; never rebase an old draft onto any other change.
      if (!reason && baseKey(matches[0]) === baseKey({ ...item.bookmark, note: item.draft })) { settled.push(cloneEntry(item)); continue; }
      if (!reason && baseKey(matches[0]) !== baseKey(item.bookmark)) reason = 'changed-bookmark';
    }
    const key = passageNoteKey(item.bookmark);
    if (!reason && drafts.has(key) && drafts.get(key) !== item.draft) reason = 'active-draft';
    if (reason) pending.push({ entry: cloneEntry(item), reason });
    else { drafts.set(key, item.draft); restored.push(cloneEntry(item)); }
  }
  return { drafts, restored, pending, settled };
}

/** Best-effort raw comparison, not atomic CAS or synchronization between tabs. */
export function guardedNoteDraftJournalWrite({ expected, entries: value, read, write }) {
  // A caller cannot silently replace an unreadable old journal with a fresh one.
  parseNoteDraftJournal(expected);
  const raw = serializeNoteDraftJournal(value);
  if (typeof read !== 'function' || typeof write !== 'function') failure();
  const conflict = () => { const error = Error('This tab’s note-draft recovery data changed. No recovery data was overwritten; keep or download the pending drafts.'); error.code = 'NOTE_DRAFT_RECOVERY_CHANGED'; throw error; };
  if (read() !== expected || read() !== expected) conflict();
  if (raw === expected) return raw;
  write(raw);
  if (read() !== raw) {
    const error = Error('The note-draft recovery write could not be confirmed. Keep or download the pending drafts; no cleanup was confirmed.');
    error.code = 'NOTE_DRAFT_RECOVERY_UNCONFIRMED'; throw error;
  }
  return raw;
}
