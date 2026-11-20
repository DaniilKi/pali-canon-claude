/** One additive original-edition note; never part of root/source/segment arrays. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSourceNotesPolicy } from '../web/source-notes-policy.mjs';
import { SOURCE_NOTES_PROFILE as profile } from './source-notes-profiles.mjs';

let here;
try { here = __dirname; } catch { here = dirname(fileURLToPath(import.meta.url)); }
const digest = value => createHash('sha256').update(value).digest('hex');
const fail = () => { throw Error('The separately indexed original edition note is unavailable.'); };
let policy, cachedRegistry;
const verifiedCorpora = new WeakSet();
const getPolicy = () => policy ||= createSourceNotesPolicy(digest, profile);
const freeze = value => { if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; };

function validateCorpus(record, corpus, fullBook) {
  if (!corpus || corpus.source?.commit !== profile.source_commit || !Array.isArray(corpus.books) || !Array.isArray(corpus.units)) fail();
  const location = record.physical_location;
  const bookIndex = corpus.books.findIndex(book => book.file === location.book_file);
  const book = corpus.books[bookIndex], unit = corpus.units.find(unit => unit.id === location.unit_id);
  if (!book || !unit || unit.book !== bookIndex || unit.start !== location.unit_block_span[0] || unit.end !== location.unit_block_span[1]
    || !Array.isArray(book.blocks) || (fullBook && digest(JSON.stringify(book.blocks)) !== location.canonical_book_blocks_sha256)) fail();
  if (digest(JSON.stringify(book.blocks[location.previous_block])) !== location.previous_block_sha256
    || digest(JSON.stringify(book.blocks[location.following_block])) !== location.following_block_sha256) fail();
  const existing = location.distinct_existing_373_note, oldNote = book.blocks[existing.block]?.[3]?.[existing.note_index_zero_based];
  if (typeof oldNote !== 'string' || digest(oldNote) !== existing.text_sha256) fail();
}

/** Pure finite source-artifact validation; no filesystem or corpus writes. */
export function validateSourceNoteRegistry(bytes, corpus) {
  const raw = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (raw.length > 16384 || digest(raw) !== profile.registry_sha256) fail();
  const registry = JSON.parse(raw.toString('utf8'));
  if (!registry || Object.keys(registry).sort().join(',') !== 'extraction_revision,records,schema'
    || registry.schema !== 'vri-source-note-registry-v1' || registry.extraction_revision !== profile.extraction_revision
    || !Array.isArray(registry.records) || registry.records.length !== 1) fail();
  const record = registry.records[0], serialized = getPolicy().stable(record);
  if (!record || Object.keys(record).sort().join(',') !== profile.record_keys.join(',')
    || serialized.length > profile.max_record_characters || digest(serialized) !== profile.record_sha256
    || record.id !== profile.record_id || record.extraction_revision !== profile.extraction_revision
    || typeof record.text !== 'string' || digest(record.text) !== profile.text_sha256 || record.text_sha256 !== profile.text_sha256) fail();
  validateCorpus(record, corpus, true);
  return freeze(registry);
}

function loadRegistry(corpus) {
  if (!cachedRegistry) {
    // Module-relative installed/source paths only; never borrow a cwd artifact.
    // Missing/malformed JSON is caught by the affected note path, not startup.
    let bytes;
    for (const path of [join(here, 'data', 'source-notes.json'), join(here, '..', 'server', 'data', 'source-notes.json')]) {
      try { bytes = readFileSync(path); break; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (!bytes) fail();
    cachedRegistry = validateSourceNoteRegistry(bytes, corpus);
    verifiedCorpora.add(corpus);
  } else {
    validateCorpus(cachedRegistry.records[0], corpus, !verifiedCorpora.has(corpus));
    verifiedCorpora.add(corpus);
  }
  // Only successfully byte/record/revision-pinned immutable data is cached.
  return cachedRegistry;
}

function envelope(anchor, available, record) {
  return { schema: profile.schema, state: available ? 'available' : 'unavailable',
    extraction_revision: profile.extraction_revision, record_sha256: profile.record_sha256,
    availability: JSON.parse(JSON.stringify(anchor.availability)), entries: record ? [record] : [],
    error_code: available ? null : 'SOURCE_NOTE_UNAVAILABLE' };
}

/** Attach only to the two resolved canonical selections, preserving root data. */
export function sourceNotesForPage({ corpus, unitId, bookId, source, segments, offset }) {
  const key = unitId === profile.anchors.uid.selector.uid ? 'uid'
    : bookId === profile.anchors.book.selector.book ? 'book' : null;
  if (!key) return undefined;
  const anchor = profile.anchors[key], unavailable = () => envelope(anchor, false, null);
  try {
    if ((unitId !== undefined) === (bookId !== undefined) || !source || source.commit !== profile.source_commit
      || source.locator_revision !== undefined && source.locator_revision !== profile.source_commit
      || !Array.isArray(segments) || !Number.isSafeInteger(offset) || offset < 0) return unavailable();
    const registry = loadRegistry(corpus), at = anchor.offset - offset;
    const result = envelope(anchor, true, at >= 0 && at < segments.length ? registry.records[0] : null);
    const page = { source, canonical: true, offset, returned: segments.length, segments, source_notes: result,
      ...(key === 'book' ? { selection: 'source_book', book_id: bookId } : { text_id: unitId }) };
    return getPolicy().inspect(page).state === 'available' ? result : unavailable();
  } catch { return unavailable(); }
}
