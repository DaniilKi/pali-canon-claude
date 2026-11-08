/** Pāli-only UI guard. Matching and source-position mapping belong to verify_quote. */
export function validatePaliQuote(data, quote) {
  const fail = () => { throw Error('The quotation result is incomplete or does not match this Pāli request. No verdict or substitute source was displayed.'); };
  const text = x => typeof x === 'string' && x.length > 0;
  const integer = x => Number.isSafeInteger(x) && x >= 0;
  if (!data || data.quote !== quote || data.language !== 'pali' || !['found','close_paraphrase','not_found_in_scope'].includes(data.verdict) || !text(data.explanation) || !text(data.guidance) || data.scope?.language !== 'pali' || !text(data.scope.searched) || !text(data.scope.attribution) || !text(data.scope.terms) || data.comparison?.verbatim !== 'not_assessed' || !text(data.comparison?.note) || !['normalized_fuzzy','literal_source_substring'].includes(data.comparison.method) || !text(data.thresholds?.measure) || !Array.isArray(data.matches) || data.matches.length > 5) fail();
  if (data.equally_similar_texts !== undefined && (!Number.isSafeInteger(data.equally_similar_texts) || data.equally_similar_texts < 2 || !text(data.citation_note))) fail();
  for (const m of data.matches) {
    const command=m.read_with, span=m.source_span;
    if (!/^[a-z][a-z0-9.-]*$/.test(m.text_id || '') || !text(m.citation) || !text(m.matched_text) || !text(m.edition) || !text(m.segment_ref) || typeof m.similarity !== 'number' || !Number.isFinite(m.similarity) || m.similarity < 0 || m.similarity > 1 || command?.tool !== 'get_text' || command.uid !== m.text_id || !integer(command.offset) || !integer(command.limit) || command.limit < 1 || command.limit > 200 || span?.offset !== command.offset || span.first_segment_ref !== m.segment_ref || !integer(span.end_offset) || span.end_offset <= span.offset || !text(span.last_segment_ref)) fail();
  }
  if (data.verdict !== 'not_found_in_scope' && !data.matches.length) fail();
  return data;
}
