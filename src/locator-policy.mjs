/** Finite compatibility gate for the independently reviewed two-poem boundary repair.
 * A bare old numeric position cannot identify its edition of the citation index.
 * These checks never migrate a locator or personal data to another passage.
 */
export const APADANA_PAIR_SOURCE_COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070';
export const APADANA_PAIR_LOCATOR_REVISION = APADANA_PAIR_SOURCE_COMMIT + '-apadana-thera105-106-v1';
export const APADANA_PAIR_INDEX_REVISION = 'apadana-thera105-106-v1';
export const isApadanaPair = id => id === 'tha-ap107' || id === 'tha-ap108';
export const isRepairedApadanaPair = (id, revision) => isApadanaPair(id) && typeof revision === 'string' && revision.endsWith('-' + APADANA_PAIR_INDEX_REVISION);

export function assertCanonicalLocator(id, revision, { expected, positional = false } = {}) {
  if (expected !== undefined && expected !== revision) {
    const error = Error('The source or citation mapping revision changed. Reopen the whole current text explicitly and compare its source positions; no replacement wording was displayed and no saved reference or note was moved.');
    error.code = 'READING_SOURCE_CHANGED';
    if (isRepairedApadanaPair(id, revision)) error.reopen = pairedReopenRoute(null, id);
    throw error;
  }
  if (positional && expected === undefined && isRepairedApadanaPair(id, revision)) {
    const error = Error('This unversioned numeric position is ambiguous after the paired Apadāna boundary repair. Reopen the whole current text explicitly, then use a returned source-pinned reading link. Keep old citations and personal notes for separate review; no passage or note was substituted.');
    error.code = 'READING_LOCATOR_AMBIGUOUS'; error.reopen = pairedReopenRoute(null, id); throw error;
  }
}

/** Whole-unit review is a new read, never approval to rebind the old position. */
export function pairedReopenRoute(args, id) {
  if (!isApadanaPair(id)) return null;
  return '#read?' + new URLSearchParams({ uid: id });
}
