/** Finite compatibility gates for independently reviewed citation boundary repairs.
 * A bare old numeric position cannot identify its edition of the citation index.
 * These checks never migrate a locator or personal data to another passage.
 */
export const APADANA_PAIR_SOURCE_COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070';
export const APADANA_PAIR_LOCATOR_REVISION = APADANA_PAIR_SOURCE_COMMIT + '-apadana-thera105-106-v1';
export const APADANA_PAIR_INDEX_REVISION = 'apadana-thera105-106-v1';
export const isApadanaPair = id => id === 'tha-ap107' || id === 'tha-ap108';
export const isRepairedApadanaPair = (id, revision) => isApadanaPair(id) && typeof revision === 'string' && revision.endsWith('-' + APADANA_PAIR_INDEX_REVISION);

/** Closed, reviewed citation namespaces. Never infer a revision from an ID pattern. */
export const APADANA_FOUR_INDEX_REVISION = 'apadana-thera333-336-v1';
export const APADANA_FOUR_LOCATOR_REVISION = APADANA_PAIR_SOURCE_COMMIT + '-' + APADANA_FOUR_INDEX_REVISION;
export const REPAIRED_CANONICAL_LOCATORS = Object.freeze({
  'tha-ap107': APADANA_PAIR_LOCATOR_REVISION, 'tha-ap108': APADANA_PAIR_LOCATOR_REVISION,
  'tha-ap333': APADANA_FOUR_LOCATOR_REVISION, 'tha-ap334': APADANA_FOUR_LOCATOR_REVISION,
  'tha-ap335': APADANA_FOUR_LOCATOR_REVISION, 'tha-ap336': APADANA_FOUR_LOCATOR_REVISION,
});
export const requiredCanonicalRevision = id => Object.hasOwn(REPAIRED_CANONICAL_LOCATORS, id) ? REPAIRED_CANONICAL_LOCATORS[id] : null;
export const isRepairedCanonical = (id, revision) => requiredCanonicalRevision(id) !== null && revision === requiredCanonicalRevision(id);
export const isCanonicalReopenRoute = route => typeof route === 'string' && Object.keys(REPAIRED_CANONICAL_LOCATORS).some(id => route === '#read?uid=' + id);
export function canonicalReopenRoute(args, id) {
  return requiredCanonicalRevision(id) ? '#read?' + new URLSearchParams({ uid: id }) : null;
}

export function assertCanonicalLocator(id, revision, { expected, positional = false } = {}) {
  if (requiredCanonicalRevision(id) && !isRepairedCanonical(id, revision)) {
    const error = Error('The reviewed citation mapping is unavailable or changed. Reopen the whole current text explicitly; no saved position or note was moved.');
    error.code = 'READING_SOURCE_CHANGED'; error.reopen = canonicalReopenRoute(null, id); throw error;
  }
  if (expected !== undefined && expected !== revision) {
    const error = Error('The source or citation mapping revision changed. Reopen the whole current text explicitly and compare its source positions; no replacement wording was displayed and no saved reference or note was moved.');
    error.code = 'READING_SOURCE_CHANGED';
    if (isRepairedCanonical(id, revision)) error.reopen = canonicalReopenRoute(null, id);
    throw error;
  }
  if (positional && expected === undefined && isRepairedCanonical(id, revision)) {
    const error = Error('This unversioned numeric position is ambiguous after the reviewed Apadāna boundary repair. Reopen the whole current text explicitly, then use a returned source-pinned reading link. Keep old citations and personal notes for separate review; no passage or note was substituted.');
    error.code = 'READING_LOCATOR_AMBIGUOUS'; error.reopen = canonicalReopenRoute(null, id); throw error;
  }
}

/** Whole-unit review is a new read, never approval to rebind the old position. */
export function pairedReopenRoute(args, id) {
  if (!isApadanaPair(id)) return null;
  return '#read?' + new URLSearchParams({ uid: id });
}
