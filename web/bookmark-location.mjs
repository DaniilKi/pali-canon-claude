/** A saved reference is not a frozen copy; enforce its known revision before wording. */
import {readingPosition} from './reading-position.mjs';
export function bookmarkLocation(item, context) {
  if (!item || typeof item.ref !== 'string' || !item.ref) throw Error('This bookmark has no valid passage reference. Export it before repairing its metadata.');
  if (item.offset !== undefined && (!Number.isSafeInteger(item.offset) || item.offset < 0 || item.offset > 100000)) throw Error('This bookmark has invalid saved-position metadata. Keep/export it before reviewing its source separately.');
  const pinned = item.source_commit !== undefined;
  if (pinned && (!Number.isSafeInteger(item.offset) || item.offset < 0)) throw Error('This versioned bookmark has no exact saved position. Its source version was not dropped or guessed. Keep/export the bookmark and review its source separately.');
  const index = Number.isSafeInteger(item.offset) && item.offset >= 0 ? item.offset : Number(item.ref.match(/\/c?(\d+)$/)?.[1] || 1) - 1;
  // Existing minimal exports may have no offset. Exact-ref checks still run on open.
  const offset = pinned ? item.offset : Math.floor(index / 30) * 30;
  const href = readingPosition(context, offset, item.ref, pinned ? item.source_commit : 'legacy');
  if (pinned) return {href, pinned: true, notice: 'Saved source version: opening checks the revision before displaying wording.'};
  const args = new URLSearchParams(href.slice(6)); args.delete('source');
  return {href: '#read?' + args, pinned: false, notice: 'Legacy bookmark: no source version was saved. Opening checks its reference against the current source; this is not a saved copy of the old wording.'};
}
