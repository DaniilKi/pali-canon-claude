/** Finite original-edition apparatus policy; no root, locator or private data writes.
 * Self-contained: the build embeds this original factory in both widget resources.
 */
export function createSourceNotesPolicy(hash, fixedMetadata) {
  function stable(value) {
    let count = 0;
    const seen = new Set();
    function visit(item, depth) {
      if (++count > 2048 || depth > 20) throw Error('Unsupported source-note data');
      if (item === null || typeof item === 'boolean') return JSON.stringify(item);
      if (typeof item === 'string') { if (item.length > 16384) throw Error('Unsupported source-note data'); return JSON.stringify(item); }
      if (typeof item === 'number' && Number.isFinite(item)) return JSON.stringify(item);
      if (!item || typeof item !== 'object' || seen.has(item)) throw Error('Unsupported source-note data');
      seen.add(item);
      let result;
      if (Array.isArray(item)) {
        if (item.length > 256) throw Error('Unsupported source-note data');
        result = '[' + item.map(child => visit(child, depth + 1)).join(',') + ']';
      } else {
        if (Object.prototype.toString.call(item) !== '[object Object]' || Object.getOwnPropertySymbols(item).length) throw Error('Unsupported source-note data');
        const keys = Object.keys(item).sort();
        if (keys.length > 64) throw Error('Unsupported source-note data');
        result = '{' + keys.map(key => JSON.stringify(key) + ':' + visit(item[key], depth + 1)).join(',') + '}';
      }
      seen.delete(item); return result;
    }
    return visit(value, 0);
  }
  // Snapshot trusted finite metadata; mutations of a consumer's object cannot
  // change the authority against which subsequent restored events are checked.
  const profile = JSON.parse(stable(fixedMetadata));
  const warning = 'The separately indexed original edition note could not be verified. The loaded Pāli remains available; this apparatus is unavailable.';
  const owns = (object, key) => Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
  const keysEqual = (object, keys) => object && !Array.isArray(object) && stable(Object.keys(object).sort()) === stable(keys.slice().sort());
  function model(state, affected, opening, anchor, entry) {
    const view = { state, affected, opening, anchor_ref: anchor ? anchor.segment.ref : null,
      availability: state === 'available' ? JSON.parse(stable(anchor.availability)) : null,
      entry: entry || null, warning: state === 'unavailable' ? warning : null };
    view.signature = stable({ state, affected, opening, anchor_ref: view.anchor_ref, entry: Boolean(entry), record_sha256: state === 'available' ? profile.record_sha256 : null });
    return view;
  }
  function inspect(page) {
    let anchor = null, affected = false, opening = false;
    try {
      if (!page || typeof page !== 'object' || Array.isArray(page)) return model('absent', false, false, null, null);
      const isBook = page.selection === 'source_book';
      if (isBook && page.book_id === profile.anchors.book.selector.book) anchor = profile.anchors.book;
      else if (!isBook && page.text_id === profile.anchors.uid.selector.uid && page.canonical !== false && page.content_type !== 'commentary') anchor = profile.anchors.uid;
      affected = Boolean(anchor);
      if (!affected) return model(owns(page, 'source_notes') ? 'unavailable' : 'absent', false, false, null, null);
      const position = page.pali || page;
      opening = position.offset === 0;
      const unavailable = () => model('unavailable', true, opening, anchor, null);
      if (page.canonical === false || !page.source || page.source.commit !== profile.source_commit ||
          (owns(page.source, 'locator_revision') && page.source.locator_revision !== profile.source_commit) ||
          (isBook && owns(page, 'text_id') && page.text_id !== null) || (!isBook && owns(page, 'book_id'))) return unavailable();
      const envelope = page.source_notes;
      if (!keysEqual(envelope, ['schema','state','extraction_revision','record_sha256','availability','entries','error_code']) ||
          envelope.schema !== profile.schema || envelope.extraction_revision !== profile.extraction_revision ||
          envelope.record_sha256 !== profile.record_sha256 || stable(envelope.availability) !== stable(anchor.availability) ||
          !Array.isArray(envelope.entries) || envelope.entries.length > 1) return unavailable();
      if (envelope.state === 'unavailable') {
        if (envelope.error_code !== 'SOURCE_NOTE_UNAVAILABLE' || envelope.entries.length) return unavailable();
        return unavailable();
      }
      if (envelope.state !== 'available' || envelope.error_code !== null) return unavailable();
      const segments = position.segments;
      if (!Array.isArray(segments) || segments.length > 200 || !Number.isSafeInteger(position.offset) || position.offset < 0 ||
          !Number.isSafeInteger(position.returned) || position.returned !== segments.length) return unavailable();
      const relative = anchor.offset - position.offset, inPage = relative >= 0 && relative < segments.length;
      const matches = segments.filter(segment => segment && segment.ref === anchor.segment.ref);
      if (matches.length !== (inPage ? 1 : 0) || (inPage && stable(segments[relative]) !== stable(anchor.segment)) ||
          envelope.entries.length !== (inPage ? 1 : 0)) return unavailable();
      if (!inPage) return model('available', true, opening, anchor, null);
      const record = envelope.entries[0], serialized = stable(record);
      if (!keysEqual(record, profile.record_keys) || serialized.length > profile.max_record_characters ||
          hash(serialized) !== profile.record_sha256 || record.id !== profile.record_id ||
          record.extraction_revision !== profile.extraction_revision || record.text_sha256 !== profile.text_sha256 ||
          typeof record.text !== 'string' || hash(record.text) !== profile.text_sha256) return unavailable();
      return model('available', true, opening, anchor, JSON.parse(serialized));
    } catch { return model('unavailable', affected, opening, anchor, null); }
  }
  return { inspect, stable };
}
