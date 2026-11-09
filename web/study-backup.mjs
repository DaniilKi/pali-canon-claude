/** A local personal-data file, never a source-text bundle or source authority. */
import { MAX_IMPORT_BYTES, parseBookmarks, bookmarkMerge } from './bookmark-import.mjs';
import { MAX_PROGRESS_BYTES, parseProgressMetadata, parseProgress, mergeProgress } from './progress-import.mjs';
import { isReadingLocator } from './reading-position.mjs';
import { applyBackupNoteChoices } from './backup-note-conflicts.mjs';

export const MAX_STUDY_BACKUP_BYTES = 32 * 1024 * 1024;
const FORMAT = 'pali-library-study-backup-v1';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const bytes = text => new TextEncoder().encode(text).length;
const clone = value => JSON.parse(JSON.stringify(value));
const key = item => JSON.stringify([item.uid, item.ref]);
function jsonData(value, depth = 0) {
  if (depth > 12) throw Error('Unsupported nested study-backup metadata. Nothing was restored.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) { for (const item of value) jsonData(item, depth + 1); return; }
  if (object(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))) { for (const item of Object.values(value)) jsonData(item, depth + 1); return; }
  throw Error('Study backups accept only supported JSON metadata. Nothing was restored.');
}
function component(value, format, field, max) {
  const text = JSON.stringify({ format, [field]: value });
  if (bytes(text) > max) throw Error('A study-backup component exceeds the 16 MiB limit. Nothing was restored.');
  return text;
}
function validate(data, canonicalizeProgress) {
  if (!exact(data, ['format', 'saved', 'progress', 'resume']) || data.format !== FORMAT || !Array.isArray(data.saved) || !Array.isArray(data.progress) || !(data.resume === null || isReadingLocator(data.resume))) throw Error('This is not a supported study backup. Nothing was restored.');
  jsonData(data);
  if (bytes(JSON.stringify(data)) > MAX_STUDY_BACKUP_BYTES) throw Error('Choose a study backup no larger than 32 MiB. Nothing was restored.');
  const saved = parseBookmarks(component(data.saved, 'pali-library-v1', 'saved', MAX_IMPORT_BYTES));
  const normalized = parseProgressMetadata(component(data.progress, 'pali-library-reading-progress-v1', 'progress', MAX_PROGRESS_BYTES));
  return { format: FORMAT, saved, progress: canonicalizeProgress ? normalized : clone(data.progress), resume: data.resume };
}

/** Validate syntax offline; unknown old plan names are not evidence of current assignments. */
export function createStudyBackup(data) {
  if (!exact(data, ['saved', 'progress', 'resume'])) throw Error('Choose only saved passages, progress and an optional reading locator for backup.');
  return validate({ format: FORMAT, ...data }, false);
}
export function parseStudyBackup(text) {
  if (typeof text !== 'string' || bytes(text) > MAX_STUDY_BACKUP_BYTES) throw Error('Choose a study backup no larger than 32 MiB. Nothing was restored.');
  let data; try { data = JSON.parse(text); } catch { throw Error('Choose a valid JSON study backup. Nothing was restored.'); }
  return validate(data, true);
}

/** Additive candidate only. Resume and preferences are deliberately never applied here. */
export function mergeStudyBackup(current, incoming, catalog, choices) {
  if (!object(current) || Object.keys(current).some(field => !['saved', 'progress', 'drafts'].includes(field)) || !Array.isArray(current.saved) || !Array.isArray(current.progress) || current.drafts !== undefined && !(current.drafts instanceof Map)) throw Error('Unsupported current personal-study metadata. Nothing was restored.');
  const validatedCurrent = createStudyBackup({ saved: current.saved, progress: current.progress, resume: null });
  const validatedIncoming = validate(incoming, true);
  let progress = validatedIncoming.progress;
  if (progress.length) {
    if (!Array.isArray(catalog) || !catalog.length) throw Error('Current reading-plan metadata is required before restoring marks. Nothing was restored.');
    progress = parseProgress(component(progress, 'pali-library-reading-progress-v1', 'progress', MAX_PROGRESS_BYTES), catalog);
  }
  const effective = validatedCurrent.saved.map(item => {
    if (!current.drafts?.has(key(item))) return item;
    const note = current.drafts.get(key(item));
    if (typeof note !== 'string' || note.length > 4000) throw Error('A current personal-note draft exceeds the supported note format. Nothing was restored.');
    return { ...item, note };
  });
  const bookmarks = bookmarkMerge(current.saved, validatedIncoming.saved), marks = mergeProgress(current.progress, progress);
  const existing = new Map(effective.map(item => [key(item), item]));
  let bookmarkDuplicates = 0, bookmarkConflicts = 0;
  for (const item of validatedIncoming.saved) {
    const prior = existing.get(key(item));
    if (prior) { if (JSON.stringify(prior) === JSON.stringify(item)) bookmarkDuplicates++; else bookmarkConflicts++; }
  }
  const result = { saved: clone(bookmarks.saved), progress: clone(marks.progress), bookmarkAdded: bookmarks.added.length, bookmarkDuplicates, bookmarkConflicts, progressAdded: marks.added, progressDuplicates: marks.duplicates, progressConflicts: marks.conflicts };
  if (choices !== undefined) {
    const notes = applyBackupNoteChoices(current.saved, validatedIncoming.saved, current.drafts ?? new Map(), choices);
    result.saved = clone([...notes.saved, ...bookmarks.added]);
    result.notesReplaced = notes.notesReplaced; result.replacedNoteKeys = notes.replacedNoteKeys;
  }
  return result;
}

/** A local rollback snapshot only; no persistence or preference/locator changes. */
export function snapshotStudyState(current) {
  if (!object(current) || !Array.isArray(current.saved) || !Array.isArray(current.progress) || !(current.drafts instanceof Map)) throw Error('A personal-study snapshot needs saved passages, marks and draft notes.');
  jsonData({ saved: current.saved, progress: current.progress });
  const drafts = new Map();
  for (const [identity, note] of current.drafts) {
    if (typeof identity !== 'string' || typeof note !== 'string' || note.length > 4000) throw Error('Unsupported personal-note draft metadata.');
    drafts.set(identity, note);
  }
  return { saved: clone(current.saved), progress: clone(current.progress), drafts };
}
export function restoreStudyState(snapshot) { return snapshotStudyState(snapshot); }
