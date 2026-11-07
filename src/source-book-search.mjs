// Search complete root files, including source passages outside standard citation spans.
import { readBook } from './source-books.mjs';
import { fold } from './canon.mjs';
import { searchFold, searchTerms, searchExcerpt } from './search-segments.mjs';
import { withNormalised } from './input.mjs';
import { romanizeInput, localizeSearch, scriptName, SCRIPT_DESCRIPTION } from './script.mjs';

// Bound retained rendered/folded text; oversized books remain searchable without being cached.
const BUDGET = 8 * 1024 * 1024;
const indexes = new Map();
let retained = 0;
function index(book) {
  const key = String(book).replace(/\.mul\.xml$/, '');
  const cached = indexes.get(key);
  if (cached) { indexes.delete(key); indexes.set(key, cached); return cached; }
  const page = readBook({ book, limit: Number.MAX_SAFE_INTEGER });
  const folded = page.segments.map((s) => searchFold(s.text, fold));
  const bytes = page.segments.reduce((n, s, i) => n + 2 * (s.text.length + folded[i].length), 0);
  const entry = { page, folded, bytes };
  if (bytes <= BUDGET) {
    while (retained + bytes > BUDGET && indexes.size) {
      const oldest = indexes.keys().next().value;
      retained -= indexes.get(oldest).bytes; indexes.delete(oldest);
    }
    indexes.set(page.book_id, entry); retained += bytes;
  }
  return entry;
}

export function search(query, { book, offset = 0, limit = 10 } = {}) {
  const wanted = searchTerms(query, fold);
  if (!wanted.length) throw new Error('Source-book search needs at least one word of two or more letters.');
  const { page, folded } = index(book);
  const results = [];
  let total = 0;
  for (let i = 0; i < folded.length; i += 1) {
    if (!wanted.every((term) => folded[i].includes(term))) continue;
    total += 1;
    if (total <= offset || results.length >= limit) continue;
    const segment = page.segments[i];
    const location = Object.fromEntries(Object.entries(segment).filter(([key]) => key === 'vri_paragraph' || key.endsWith('_page_begins')));
    results.push({ ref: segment.ref, book_id: page.book_id, title: page.title, segment: i + 1,
      type: segment.type, ...location, excerpt: searchExcerpt(segment.text, wanted[0], fold),
      read_with: { tool: 'get_text', book: page.book_id, offset: i, limit: 1 },
      context_with: { tool: 'get_text', book: page.book_id, offset: Math.max(0, i - 1), limit: 3 } });
  }
  return { query, selection: 'source_book', canonical: true,
    book: { id: page.book_id, title: page.title, collection: page.collection, vri_file: page.vri_file },
    total_segments: page.total_segments, total_matched: total, offset, limit, returned: results.length,
    next_offset: offset + results.length < total ? offset + results.length : null, results,
    citation_note: 'These are VRI source-file segment references, not standard sutta or rule citations. A hit does not assign the passage to an individual canonical text. Cite the source file and paragraph/page shown, or resolve an individual citation separately.',
    source: page.source, attribution: page.attribution };
}

export function register({ tool, z }) {
  tool('search_source_book', 'Search a complete bundled VRI root book, including headings and front matter outside individual citation spans. Choose a book ID from browse_canon node "books" (e.g. vin02m1). Pāli search: diacritics optional, all words must match one rendered segment or complete stanza; "quoted phrases" accept line breaks. Each match has exact get_text book-mode commands for reading and context. Source-file references are not standard sutta/rule citations. Supports native-script queries/output and English-keyboard Pāli; does not search English translations. Works offline.', {
    book: z.string().trim().min(1).max(100).describe('An exact complete-root-book ID or VRI filename from browse_canon node "books". This is a source file, not an individual sutta or rule.'),
    query: z.string().trim().min(1).max(500),
    script: z.string().max(30).default('roman').describe(SCRIPT_DESCRIPTION),
    offset: z.number().int().min(0).max(1000000).default(0).describe('Offset within matching segments; continue using next_offset. read_with offsets refer to the source book instead.'),
    limit: z.number().int().min(1).max(50).default(10),
  }, async ({ book, query, script, offset, limit }) => {
    const output = scriptName(script);
    const input = romanizeInput(query);
    const result = await withNormalised(input.text, (text) => search(text, { book, offset, limit }));
    const localized = localizeSearch(result, output, input);
    localized.results = localized.results.map((hit) => ({ ...hit,
      read_with: { ...hit.read_with, script: output }, context_with: { ...hit.context_with, script: output } }));
    return localized;
  });
}
