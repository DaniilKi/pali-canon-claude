/** Transient, revision-pinned source pages. These are never saved paragraph locators. */
import { assertReadingContext, sourceRevision } from './reading-position.mjs';

const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const pageKeys = new Set(['uid', 'book', 'kind', 'plan', 'day', 'offset', 'page_source']);
function revision(value) {
  if (typeof value !== 'string' || sourceRevision({ source: { commit: value } }) !== value) throw Error('This page has no valid source revision.');
  return value;
}
const invalid = () => { throw Error('This source page has incomplete or unsupported navigation metadata. No passage was substituted.'); };

export function readingPagePosition(context, offset, source) {
  assertReadingContext(context);
  if (!integer(offset, 0, 100000)) invalid();
  revision(source);
  return '#read?' + new URLSearchParams({ ...context, offset, page_source: source });
}

/** Run before any source/plan request. Paragraph source/ref pins keep their own grammar. */
export function assertPageRequest(args) {
  if (!args.has('page_source')) return;
  const keys = [...args.keys()];
  if (keys.some(key => !pageKeys.has(key)) || new Set(keys).size !== keys.length || args.getAll('page_source').length !== 1 || args.getAll('offset').length !== 1 || !/^(0|[1-9][0-9]*)$/.test(args.get('offset') || '') || !integer(Number(args.get('offset')), 0, 100000)) invalid();
  revision(args.get('page_source'));
  const context = Object.fromEntries(['uid', 'book', 'kind', 'plan'].filter(key => args.has(key)).map(key => [key, args.get(key)]));
  if (args.has('day')) {
    if (!/^[1-9][0-9]*$/.test(args.get('day') || '')) invalid();
    context.day = Number(args.get('day'));
  }
  assertReadingContext(context);
}

export function assertPagePin(args, data) {
  if (!args.has('page_source')) return;
  assertPageRequest(args);
  if (sourceRevision(data) !== args.get('page_source')) {
    const error = Error('The source or citation mapping revision changed since this page link was opened. Review the current source explicitly before continuing; no replacement wording was displayed.');
    error.code = 'READING_SOURCE_CHANGED'; throw error;
  }
  readingPageBounds(data);
  if (data.offset !== Number(args.get('offset'))) invalid();
}

/** Half-open bounds over actual indexed source positions, optionally a plan assignment. */
export function readingPageBounds(data, window = null) {
  if (!data || !integer(data.total_segments, 1, 100001) || !integer(data.offset, 0, 100000) || !integer(data.returned, 1, 100001) || data.offset + data.returned > data.total_segments || !Array.isArray(data.segments) || data.segments.length !== data.returned || data.next_offset !== (data.offset + data.returned < data.total_segments ? data.offset + data.returned : null)) invalid();
  let start = 0, end = data.total_segments;
  if (window !== null) {
    if (!window || !integer(window.start, 0, 100000) || !(window.end === null || integer(window.end, 1, 100001)) || !integer(window.offset, 0, 100000) || !integer(window.limit, 1, 100000) || window.offset !== data.offset || data.returned > window.limit) invalid();
    start = window.start; end = window.end === null ? data.total_segments : window.end;
  }
  if (start >= end || end > data.total_segments || data.offset < start || data.offset + data.returned > end) invalid();
  return { start, end, current: data.offset };
}

export function readingJumpOffset(text, data, window = null) {
  if (typeof text !== 'string' || !/^[1-9][0-9]*$/.test(text)) throw Error('Enter a source position using whole decimal digits only.');
  const position = Number(text), bounds = readingPageBounds(data, window);
  if (!integer(position, 1, 100001) || position - 1 < bounds.start || position - 1 >= bounds.end) throw Error('That source position is outside the current reading bounds.');
  return position - 1;
}
