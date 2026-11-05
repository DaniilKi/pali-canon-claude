// Read complete bundled VRI root files, including front matter outside individual citation spans.
import * as canon from './canon.mjs';
import { textSegments, structuredInfo } from './variants.mjs';

export const bookId = (book) => book.file.replace(/\.mul\.xml$/, '');
const collectionOf = (book) => book.pitaka === 'vinaya' ? 'vinaya' : book.collection;

export function catalogue({ offset = 0, limit = 60 } = {}) {
  const root = canon.load().canon;
  const items = root.books.map((book) => ({
    id: bookId(book), title: book.title, collection: collectionOf(book), pitaka: book.pitaka,
    vri_file: book.file, read_with: { tool: 'get_text', book: bookId(book) },
  }));
  return {
    node: 'books', name: 'Complete VRI source books',
    note: 'These are the complete bundled root-text files, including headings, invocations and front matter. Read with get_text using book, or use uid for an individual citation.',
    total: items.length, offset, limit, next_offset: offset + limit < items.length ? offset + limit : null,
    items: items.slice(offset, offset + limit),
  };
}

export function readBook({ book, offset = 0, limit = 60, includeVariants = false, variants }) {
  const root = canon.load().canon;
  // Resolve only exact catalogue IDs/files in the already loaded data; never read a caller-supplied path.
  const index = root.books.findIndex((b) => bookId(b) === book || b.file === book);
  if (index < 0) throw new Error(`Unknown VRI source book "${book}". Choose a book ID from browse_canon with node "books".`);
  const sourceBook = root.books[index];
  const id = bookId(sourceBook);
  const unit = { id: `vri-book:${id}`, book: index, start: 0, end: sourceBook.blocks.length, collection: collectionOf(sourceBook) };
  const { segments, mode } = textSegments(unit, { includeVariants, variants });
  const page = segments.slice(offset, offset + limit);
  return {
    selection: 'source_book', canonical: true, book_id: id, title: sourceBook.title,
    collection: unit.collection, vri_file: sourceBook.file,
    edition: 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI), Pāli', attribution: root.source.attribution, source: root.source,
    total_segments: segments.length, offset, limit, returned: page.length,
    next_offset: offset + page.length < segments.length ? offset + page.length : null,
    segments: page,
    ...(mode === 'structured' ? structuredInfo(page) : {}),
    notes: [
      'Complete VRI source book, including headings, invocations and front matter outside individual citation spans. Abbreviations remain as printed; no omitted text has been reconstructed.',
      'The vri-book segment references identify this source-file reading, not a standard sutta or rule citation. Cite the VRI file and paragraph/page shown, or read an individual text with uid to obtain its standard citation and linked English/commentary.',
    ],
  };
}
