/* Refresh only routes whose displayed source text consumes the script preference. */
export function scriptRefreshEligible(hash) {
  return typeof hash === 'string' && hash.startsWith('#')
    && ['read', 'daily', 'resolve', 'search', 'book-search'].includes(hash.slice(1).split('?')[0]);
}

/* One transient source-book input, owned by the entire unchanged executed route. */
export function retainBookSearchDraft(previous, hash, input) {
  if (!scriptRefreshEligible(hash)) return null;
  if (!input) return previous?.hash === hash ? previous : null;
  return { hash, value: input.value, start: input.selectionStart, end: input.selectionEnd,
    direction: input.selectionDirection, toolsOpen: input.toolsOpen };
}
