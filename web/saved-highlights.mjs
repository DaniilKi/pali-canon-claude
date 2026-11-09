/** Personal bookmark styling only; never a source-text or alignment claim. */
import { passageNoteState } from './passage-notes.mjs';

export function savedPassageHighlighted(saved, context, enabled = true) {
  if (enabled === false) return false;
  try {
    const state = passageNoteState(saved, context);
    return Boolean(state.eligible && !state.legacy && state.item &&
      Object.hasOwn(state.item, 'source_commit') &&
      state.item.source_commit === context.source_commit &&
      Object.hasOwn(state.item, 'offset') && state.item.offset === context.offset);
  } catch {
    // Unsupported local metadata must not interrupt reading or change a bookmark.
    return false;
  }
}
