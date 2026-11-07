/** Search only the already bundled VRI Aṭṭhakathā, including material without root alignment. */
import * as commentary from './commentary.mjs';
import { fold } from './canon.mjs';
import { withNormalised } from './input.mjs';
import { searchFold, searchExcerpt, searchTerms } from './search-segments.mjs';
import { romanizeLookupInput, localizeCommentary, SCRIPT_DESCRIPTION, scriptName } from './script.mjs';

// Bound retained folded text; the source corpus itself is already resident once loaded.
const INDEX_BUDGET_BYTES = 8 * 1024 * 1024;
const indexes = new Map();
let indexBytes = 0;
function indexed(book) {
  const cached = indexes.get(book);
  if (cached) {
    indexes.delete(book); indexes.set(book, cached);
    return cached.text;
  }
  const text = commentary.bookSegments(book).map((segment) => searchFold(segment.text, fold));
  const bytes = text.reduce((sum, value) => sum + value.length * 2, 0);
  if (bytes <= INDEX_BUDGET_BYTES) {
    while (indexBytes + bytes > INDEX_BUDGET_BYTES && indexes.size) {
      const oldest = indexes.keys().next().value;
      indexBytes -= indexes.get(oldest).bytes;
      indexes.delete(oldest);
    }
    indexes.set(book, { text, bytes });
    indexBytes += bytes;
  }
  return text;
}
function terms(query) {
  return [...new Set(searchTerms(query, fold))];
}

export function search(query, { books, offset = 0, limit = 10 } = {}) {
  const data = commentary.load();
  if (!data) throw new Error('Bundled commentary data is missing. Reinstall the extension.');
  const wanted = terms(String(query));
  if (!wanted.length) throw new Error('Commentary search needs at least one word of two or more letters.');
  const wantedBooks = books?.length ? new Set(books.map((book) => String(book).replace(/^commentary:/u, ''))) : null;
  if (wantedBooks) for (const file of wantedBooks) {
    if (!data.books.some((book) => book.file === file)) throw new Error(`Unknown commentary book "${file}". Use get_commentary with uid "commentary" to list included books.`);
  }
  const pool = data.books.filter((book) => !wantedBooks || wantedBooks.has(book.file));
  const results = [];
  let total = 0;
  for (const book of pool) {
    const segments = commentary.bookSegments(book);
    const folded = indexed(book);
    for (let i = 0; i < folded.length; i += 1) {
      if (!wanted.every((term) => folded[i].includes(term))) continue;
      total += 1;
      if (total <= offset || results.length >= limit) continue;
      const info = commentary.bookInfo(book);
      const ref = `${info.uid}/c${i + 1}`;
      results.push({ canonical: false, content_type: 'commentary', citation: ref, book: info,
        segment: i + 1, type: segments[i].type,
        excerpt: searchExcerpt(segments[i].text, wanted[0], fold),
        ...(segments[i].commentary_pts_page_begins ? { commentary_pts_page_begins: segments[i].commentary_pts_page_begins } : {}),
        read_with: { tool: 'get_commentary', uid: ref },
        context_with: { tool: 'get_commentary', uid: info.uid, offset: Math.max(0, i - 1), limit: 3 } });
    }
  }
  const { name, repository, commit, files, attribution, terms: licence } = data.source;
  return { query, canonical: false, content_type: 'commentary', label: commentary.LABEL,
    searched_books: pool.length, total_matched: total, offset, limit, returned: results.length,
    next_offset: offset + results.length < total ? offset + results.length : null, results,
    alignment_note: 'Search covers the included commentary books, including material with no verified root-text alignment. A hit does not establish which canonical passage it explains.',
    source: { name, repository, commit, files, attribution, terms: licence } };
}

export function register({ tool, z }) {
  tool('search_commentary', 'Search the Pāli of all bundled VRI commentary books (Aṭṭhakathā), including passages not aligned to a canonical text. Diacritics optional; all words must match one prose segment or complete stanza; "quoted phrases" accept line breaks. Results are commentary, not canon, and do not assert root-text alignment. Each result includes a direct get_commentary reference for reading the exact source segment and its context. Accepts supported native-script queries and script output; exact/context commands retain the script. Works offline.', {
    query: z.string().min(2).max(500),
    script: z.string().trim().min(1).max(30).optional().describe(SCRIPT_DESCRIPTION),
    books: z.array(z.string().min(1).max(100)).max(100).optional().describe('VRI filenames or commentary:<VRI-file> book references returned by get_commentary with uid "commentary". Omit to search all included books.'),
    offset: z.number().int().min(0).max(1000000).default(0),
    limit: z.number().int().min(1).max(50).default(10),
  }, async ({ query, books, offset, limit, script }) => {
    if (script) scriptName(script);
    const input = romanizeLookupInput(query);
    const result = await withNormalised(input.text, (value) => search(value, { books, offset, limit }));
    return localizeCommentary(result, script, input);
  });
}
