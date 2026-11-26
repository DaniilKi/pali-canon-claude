import { isRepairedCanonical, requiredCanonicalRevision } from '../src/locator-policy.mjs';
/** Validate canonical search identity and source snapshots before showing excerpts. */
import { parseCitation, citationId } from '../src/citations.mjs';
import { SCRIPTS } from '../src/script.mjs';
import { foldNiggahita } from '../src/pali-unicode.mjs';
import { romanizeSearchInput } from '../src/search-segments.mjs';
import { readingPosition, sourceRevision } from './reading-position.mjs';
import { readingPagePosition } from './reading-navigation.mjs';
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const own = (x, k) => Object.hasOwn(x, k);
const keysOnly = (x, keys) => object(x) && Object.keys(x).every(k => keys.includes(k));
const text = (x, max = 10000) => typeof x === 'string' && x.trim().length > 0 && x.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(x);
const integer = (x, low = 0, high = 1000000) => Number.isSafeInteger(x) && x >= low && x <= high;
const fail = () => { throw Error('Canonical search returned incomplete or inconsistent source metadata. No excerpts or reading links were substituted.'); };

/** Existing common-offset pagination retains separate title and body continuation counts. */
export function canonicalSearchSelection(args, script = 'roman', rawQuery) {
  if (rawQuery !== undefined) { try { decodeURIComponent(rawQuery.replace(/\+/g, ' ')); } catch { throw Error('The search URL has invalid character encoding.'); } }
  for (const key of args.keys()) if (!['q', 'scope', 'offset'].includes(key) || args.getAll(key).length !== 1) throw Error('This search URL has unsupported or duplicate fields.');
  const query = (args.get('q') ?? '').trim(), rawOffset = args.get('offset') ?? '0';
  if (!text(query, 300) || args.has('scope') && args.get('scope') !== 'canon' || !/^(0|[1-9][0-9]*)$/.test(rawOffset) || !integer(Number(rawOffset), 0, 100000) || !SCRIPTS.includes(script)) throw Error('Give a canonical search query and a valid result page.');
  return { query, offset: Number(rawOffset), limit: 15, collection: null, script, english: 'auto', include_post_canonical: false };
}
export function canonicalSearchRoute(selected, offset = selected.offset) {
  selection(selected);
  if (!integer(offset, 0, 100000)) fail();
  return '#search?' + new URLSearchParams({ q: selected.query, scope: 'canon', ...(offset ? { offset } : {}) });
}
function selection(value) {
  if (!keysOnly(value, ['query', 'offset', 'limit', 'collection', 'script', 'english', 'include_post_canonical']) || Object.keys(value).length !== 7 || !text(value.query, 300) || value.query !== value.query.trim() || !integer(value.offset, 0, 100000) || value.limit !== 15 || value.collection !== null || !SCRIPTS.includes(value.script) || value.english !== 'auto' || value.include_post_canonical !== false) fail();
}
function revision(value) {
  if (typeof value !== 'string' || sourceRevision({ source: { commit: value } }) !== value) fail();
  return value;
}
function source(value, edition = null) {
  if (!keysOnly(value, ['name', 'repository', 'commit', 'attribution', 'terms', 'locator_revision']) || value.name !== 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI)' || value.repository !== 'https://github.com/VipassanaTech/tipitaka-xml' || !text(value.attribution) || !text(value.terms)) fail();
  revision(value.commit);
  if (!edition && own(value, 'locator_revision')) fail();
  if (edition && ['name', 'repository', 'commit', 'attribution', 'terms'].some(k => value[k] !== edition[k])) fail();
  try { return revision(sourceRevision({ source: value })); } catch { fail(); }
}
function identity(hit) {
  if (!object(hit) || !text(hit.id, 200) || !text(hit.citation, 300) || !text(hit.title, 1000) || !text(hit.collection, 200)) fail();
  let id; try { const parsed = parseCitation(hit.citation); id = parsed.kind === 'uid' ? parsed.uid : parsed.kind === 'id' ? citationId(parsed) : null; } catch { fail(); }
  if (id !== hit.id) fail();
  if (own(hit, 'canonical') && hit.canonical !== true) fail();
  if (own(hit, 'title_roman') && !text(hit.title_roman, 1000)) fail();
}
function command(command, hit, script, body = false, context = false) {
  if (!keysOnly(command, ['tool', 'uid', 'offset', 'limit', 'script', 'source_commit']) || command.tool !== 'get_text' || command.uid !== hit.id || own(command, 'script') && command.script !== script) fail();
  const requiredPin = body && isRepairedCanonical(hit.id, sourceRevision({ source: hit.source }));
  if ((requiredPin || own(command, 'source_commit')) && command.source_commit !== sourceRevision({ source: hit.source })) fail();
  if (script !== 'roman' && command.script !== script) fail();
  if (body) {
    const offset = context ? Math.max(0, hit.read_with.offset - 1) : command.offset;
    if (!integer(command.offset, 0, 100000) || command.offset !== offset || command.limit !== (context ? 3 : 1)) fail();
  } else if (own(command, 'offset') || own(command, 'limit')) fail();
}
function checkHit(hit, edition, selected, body) {
  identity(hit); source(hit.source, edition);
  if (requiredCanonicalRevision(hit.id) && !isRepairedCanonical(hit.id, sourceRevision({ source: hit.source }))) fail();
  command(hit.read_with, hit, selected.script, body);
  if (body) {
    if (!text(hit.excerpt, 4000) || hit.segment_ref !== `${hit.id}/${hit.read_with.offset + 1}`) fail();
    command(hit.context_with, hit, selected.script, true, true);
  } else if (own(hit, 'segment_ref') || own(hit, 'excerpt') || own(hit, 'context_with')) fail();
  if (own(hit, 'approximate') && typeof hit.approximate !== 'boolean') fail();
  if (own(hit, 'alignment') && (!object(hit.alignment) || !text(hit.alignment.note))) fail();
  for (const key of ['english_available', 'partial_english_available', 'shared_english_available']) if (own(hit, key) && !integer(hit[key])) fail();
}
function stream(items, total, next, data, selected, body) {
  if (!integer(total) || !Array.isArray(items) || items.length !== Math.min(selected.limit, Math.max(0, total - selected.offset)) || next !== (selected.offset + selected.limit < total ? selected.offset + selected.limit : null)) fail();
  const seen = new Set();
  for (const hit of items) { checkHit(hit, data.source, selected, body); if (seen.has(hit.id)) fail(); seen.add(hit.id); }
}
/** Reuse conversion and explicit inference labels; do not rerun corpus-dependent inference. */
function queryProvenance(data, selected) {
  const input = romanizeSearchInput(selected.query), base = input.text;
  if (input.original) { if (data.input_script !== input.script || data.input_romanized !== base) fail(); }
  else if (own(data, 'input_script') || own(data, 'input_romanized')) fail();
  // These shared Unicode equivalences do not constitute a labelled spelling inference.
  // Source-phrase bypasses preserve the query exactly as the backend reports it.
  const allowed = input.source_phrase ? [base] : [base, base.normalize('NFC'), foldNiggahita(base.normalize('NFC'))];
  if (own(data, 'input_normalised')) {
    const value = data.input_normalised;
    if (!object(value) || value.original !== base || !text(value.read_as, 300) || !text(value.note) || !Array.isArray(value.changes) || !integer(value.changes.length, 1, 500)) fail();
    allowed.push(value.read_as);
  }
  if (!allowed.includes(data.query)) fail();
  if (input.source_phrase && (data.query_mode !== 'source_phrase' || ['input_normalised', 'expanded_from_english', 'english_words_ignored', 'spelling_note'].some(k => own(data, k))) || data.query_mode === 'source_phrase' && !input.source_phrase) fail();
}
/** Selection echoes bind the actual original MCP input, not browser-reimplemented inference. */
export function validateCanonicalSearch(data, selected) {
  selection(selected);
  if (!object(data) || !keysOnly(data.selection, Object.keys(selected)) || Object.keys(data.selection).length !== 7 || Object.keys(selected).some(k => data.selection[k] !== selected[k]) || !text(data.query, 300) || !text(data.searched) || data.offset !== selected.offset || data.limit !== selected.limit || own(data, 'post_canonical') || own(data, 'canonical') && data.canonical !== true || ['scope_resolution', 'scope_alignment', 'scope_source_span'].some(key => own(data, key))) fail();
  source(data.source);
  stream(data.title_matches, data.total_title_matches, data.title_next_offset, data, selected, false);
  stream(data.results, data.total_texts_matched, data.next_offset, data, selected, true);
  if (own(data, 'script') && data.script !== selected.script || selected.script !== 'roman' && data.script !== selected.script) fail();
  for (const key of ['script_note', 'query_note', 'spelling_note', 'input_romanized', 'tip']) if (own(data, key) && data[key] !== undefined && !text(data[key])) fail();
  if (own(data, 'input_script') && !SCRIPTS.includes(data.input_script) || own(data, 'input_script') !== own(data, 'input_romanized')) fail();
  if (own(data, 'query_mode') && !['source_phrase', 'as_typed_phrase'].includes(data.query_mode)) fail();
  if (own(data, 'input_normalised') && !(object(data.input_normalised) && text(data.input_normalised.note))) fail();
  if (own(data, 'notes') && (!Array.isArray(data.notes) || data.notes.length > 100 || data.notes.some(x => !text(x)))) fail();
  for (const key of ['expanded_from_english', 'english_words_ignored']) if (own(data, key) && (!object(data[key]) || !text(data[key].note))) fail();
  queryProvenance(data, selected);
  const result = { query: data.query, searched: data.searched, selection: { ...selected }, source: { ...data.source }, offset: data.offset, limit: data.limit, total_title_matches: data.total_title_matches, total_texts_matched: data.total_texts_matched, title_next_offset: data.title_next_offset, next_offset: data.next_offset, title_matches: data.title_matches.map(x => cloneHit(x)), results: data.results.map(x => cloneHit(x)) };
  for (const key of ['script', 'script_note', 'query_mode', 'query_note', 'spelling_note', 'input_script', 'input_romanized', 'input_normalised', 'notes', 'expanded_from_english', 'english_words_ignored']) if (own(data, key)) result[key] = JSON.parse(JSON.stringify(data[key]));
  return result;
}
function cloneHit(hit) {
  const result = {};
  for (const key of ['id', 'citation', 'title', 'title_roman', 'collection', 'covers', 'pts', 'approximate', 'alignment', 'source', 'excerpt', 'segment_ref', 'read_with', 'context_with']) if (own(hit, key) && hit[key] !== undefined) result[key] = JSON.parse(JSON.stringify(hit[key]));
  return result;
}
/** A title identifies a source page, not a verified first-paragraph match. */
export function canonicalSearchLink(hit, body = false) {
  const rev = revision(sourceRevision(hit));
  return body ? readingPosition({ uid: hit.id }, hit.read_with.offset, hit.segment_ref, rev) : readingPagePosition({ uid: hit.id }, 0, rev);
}
