/** Explicit local note choices only. Never merge source metadata or rewrite source pins. */
import { parseBookmarks } from './bookmark-import.mjs';
import { sourceRevision } from './reading-position.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fields = new Set(['uid', 'ref', 'title', 'note', 'offset', 'source_commit']);
const key = item => JSON.stringify([item.uid, item.ref]);
function note(value) {
  if (typeof value !== 'string' || value.length > 4000) throw Error('Personal-note conflict review needs text of at most 4,000 characters.');
  return value;
}
function groups(items) {
  if (!Array.isArray(items) || items.length > 500) throw Error('Unsupported saved passages for personal-note conflict review.');
  const result = new Map();
  for (const item of items) {
    if (!object(item) || typeof item.uid !== 'string' || typeof item.ref !== 'string') throw Error('Personal-note conflict review needs exact saved identities.');
    const identity = key(item), matches = result.get(identity) ?? []; matches.push(item); result.set(identity, matches);
  }
  return result;
}
function validRecord(item) {
  try {
    if (Object.keys(item).some(field => !fields.has(field) || item[field] === undefined)) return false;
    parseBookmarks(JSON.stringify({ format: 'pali-library-v1', saved: [item] }));
    return true;
  } catch { return false; }
}
function pinned(item) {
  try {
    return Object.hasOwn(item, 'source_commit') && typeof item.source_commit === 'string' && sourceRevision({ source: { commit: item.source_commit } }) === item.source_commit && Object.hasOwn(item, 'offset') && Number.isSafeInteger(item.offset) && item.offset >= 0 && item.offset <= 100000;
  } catch { return false; }
}
function reason(current, incoming) {
  if (current.length !== 1 || incoming.length !== 1) return 'Duplicate saved identities need manual review; no personal note was chosen.';
  if (!validRecord(current[0]) || !validRecord(incoming[0])) return 'Unsupported bookmark metadata prevents an automatic personal-note replacement.';
  if (!pinned(current[0]) || !pinned(incoming[0])) return 'Both bookmarks need a valid saved source revision and exact offset; legacy references stay unchanged.';
  if (current[0].source_commit !== incoming[0].source_commit) return 'The saved source revisions differ; no source pin will be upgraded.';
  if (current[0].offset !== incoming[0].offset) return 'The saved source offsets differ; no nearby passage will be substituted.';
  if (typeof incoming[0].note !== 'string') return 'The incoming bookmark has no explicit personal-note text to replace with.';
  return null;
}

/** Return differing duplicate notes against effective local drafts, including an empty draft. */
export function reviewBackupNoteConflicts(currentSaved, incomingSaved, drafts = new Map()) {
  if (!(drafts instanceof Map)) throw Error('Personal-note drafts must be a Map.');
  const current = groups(currentSaved), incoming = groups(incomingSaved), rows = [];
  for (const [identity, incomingItems] of incoming) {
    const currentItems = current.get(identity); if (!currentItems) continue;
    const currentNote = drafts.has(identity) ? note(drafts.get(identity)) : note(currentItems[0].note === undefined ? '' : currentItems[0].note);
    const differing = incomingItems.find(item => note(item.note === undefined ? '' : item.note) !== currentNote);
    if (!differing) continue;
    const why = reason(currentItems, incomingItems);
    rows.push({ key: identity, uid: differing.uid, ref: differing.ref, currentNote, incomingNote: note(differing.note === undefined ? '' : differing.note), eligible: why === null, reason: why });
  }
  return rows;
}

/** Recompute eligibility at Apply; validation completes before any candidate is changed. */
export function applyBackupNoteChoices(currentSaved, incomingSaved, drafts, choices) {
  if (!Array.isArray(choices) || choices.length > 500 || choices.some(identity => typeof identity !== 'string') || new Set(choices).size !== choices.length) throw Error('Choose each supported personal-note conflict at most once. Nothing was restored.');
  const rows = new Map(reviewBackupNoteConflicts(currentSaved, incomingSaved, drafts).map(row => [row.key, row]));
  for (const identity of choices) {
    const row = rows.get(identity);
    if (!row || !row.eligible) throw Error('A selected personal-note conflict is unknown or no longer eligible. Nothing was restored.');
  }
  const selected = new Set(choices), incoming = new Map(incomingSaved.map(item => [key(item), item]));
  const saved = JSON.parse(JSON.stringify(currentSaved));
  for (const item of saved) if (selected.has(key(item))) item.note = incoming.get(key(item)).note;
  return { saved, notesReplaced: choices.length, replacedNoteKeys: [...choices] };
}
