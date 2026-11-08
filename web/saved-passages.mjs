/** Search only browser-local bookmark metadata/notes, never scripture or providers. */
export const SAVED_PAGE_SIZE = 25;
export function savedScope(item) {
  const uid = typeof item?.uid === 'string' ? item.uid : '';
  if (uid.startsWith('book:')) return 'books';
  if (uid.startsWith('post:')) return 'post';
  if (uid.startsWith('commentary:') || uid.startsWith('commentary-ref:')) return 'commentary';
  return 'canon';
}
export const savedScopeLabels = Object.freeze({ canon: 'Canonical text', books: 'Complete root source book', commentary: 'Commentary · not canon', post: 'Later work · not canon' });
const fold = value => (typeof value === 'string' ? value : '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export function savedPage(items, drafts, { query = '', scope = 'all', page = 0 } = {}) {
  const tokens = fold(query).trim().split(/\s+/u).filter(Boolean);
  const selected = Object.hasOwn(savedScopeLabels, scope) ? scope : 'all';
  const matches = items.filter(item => {
    if (selected !== 'all' && savedScope(item) !== selected) return false;
    const key = JSON.stringify([item.uid, item.ref]);
    const note = drafts?.has(key) ? drafts.get(key) : item.note;
    const text = fold([item.title, item.uid, item.ref, note].filter(x => typeof x === 'string').join(' '));
    return tokens.every(token => text.includes(token));
  });
  const pages = Math.max(1, Math.ceil(matches.length / SAVED_PAGE_SIZE));
  const current = Number.isSafeInteger(page) ? Math.max(0, Math.min(page, pages - 1)) : 0;
  return { items: matches.slice(current * SAVED_PAGE_SIZE, (current + 1) * SAVED_PAGE_SIZE), total: matches.length, all: items.length, pages, page: current, start: matches.length ? current * SAVED_PAGE_SIZE + 1 : 0, end: Math.min((current + 1) * SAVED_PAGE_SIZE, matches.length) };
}
