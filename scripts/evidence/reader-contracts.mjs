import assert from 'node:assert/strict';
import * as commentary from '../../src/commentary.mjs';

export async function auditReaderErrors(client, call) {
  const cases = {
    get_text: [{}, { uid: 'MN 10', book: 'vin02m1' }, { uid: 'MN 999' }, { book: 'unknown-book' }, { uid: 'MN 10', translation: '' }, { uid: 'MN 10', translation: ' ' }, { uid: 'MN 10', offset: -1 }, { uid: 'MN 10', limit: 0 }, { uid: 'MN 10', script: 'unknown' }],
    get_commentary: [{ uid: 'MN 999' }, { uid: 'mn10/c0' }, { uid: 'MN 10', offset: -1 }, { uid: 'MN 10', limit: 201 }, { uid: 'MN 10', script: 'unknown' }],
    get_post_canonical: [{ citation: 'not-a-book' }, { citation: 'Mahāvagga-Ṭīkā' }, { citation: 'Vism p. 3' }, { citation: 'Vism 1.0' }, { citation: 'Vism 1.1', offset: -1 }, { citation: 'Vism 1.1', limit: 201 }, { citation: 'Vism 1.1', script: 'unknown' }],
    search_texts: [{ query: ' ' }, { query: 'dhamma', collection: 'not-a-book' }, { query: 'dhamma', offset: -1 }, { query: 'dhamma', limit: 0 }, { query: 'dhamma', script: 'unknown' }],
    search_commentary: [{ query: ' ' }, { query: 'dhamma', books: ['not-a-book'] }, { query: 'dhamma', offset: -1 }, { query: 'dhamma', limit: 0 }, { query: 'dhamma', script: 'unknown' }],
    search_post_canonical: [{ query: ' ' }, { query: 'dhamma', books: ['not-a-book'] }, { query: 'dhamma', section: 'unknown' }, { query: 'dhamma', offset: -1 }, { query: 'dhamma', limit: 0 }, { query: 'dhamma', script: 'unknown' }],
    search_source_book: [{ book: 'unknown-book', query: 'dhamma' }, { book: 'vin02m1', query: ' ' }, { book: 'vin02m1', query: 'dhamma', offset: -1 }, { book: 'vin02m1', query: 'dhamma', limit: 0 }, { book: 'vin02m1', query: 'dhamma', script: 'unknown' }],
    analyse_passage: [{}, { uid: 'MN 10', book: 'vin02m1' }, { uid: 'MN 999' }, { uid: 'Vism 1.1', segment: 'Vism ch. 4/5' }, { uid: 'niruttidipani 2', paragraph: 63 }, { uid: 'MN 10', segment: 0 }],
    get_translation: [{ uid: 'MN 10', translation: '' }, { uid: 'MN 10', translation: ' ' }, { uid: 'MN 10', translation: 'nonexistent-translator-fixture' }, { uid: 'MN 10', offset: 500 }],
    compare_translations: [{ uid: 'MN 10', translations: [''] }, { uid: 'MN 10', translations: [' '] }],
  };
  const counts = { tools: 0, rejected_requests: 0, schema_or_rpc_errors: 0, structured_errors: 0, recovery_reads: 0 };
  for (const [name, argumentsList] of Object.entries(cases)) {
    for (const args of argumentsList) {
      let response, failure;
      try { response = await client.callTool({ name, arguments: args }); } catch (error) { failure = error; }
      if (failure) { assert.ok(failure.message?.trim()); counts.schema_or_rpc_errors++; }
      else {
        assert.equal(response.isError, true, `${name} silently accepted ${JSON.stringify(args)}`);
        const text = response.content?.find(c => c.type === 'text')?.text;
        assert.ok(text?.trim());
        let data; try { data = JSON.parse(text); } catch { /* SDK schema errors are plain text. */ }
        if (data) {
          assert.ok(data.error?.trim()); assert.ok(data.recovery?.trim());
          assert.equal(data.segments, undefined); assert.equal(data.results, undefined); assert.equal(data.text_id, undefined);
          counts.structured_errors++;
        } else counts.schema_or_rpc_errors++;
      }
      counts.rejected_requests++;
    }
    counts.tools++;
  }
  const positives = [
    ['get_text', { uid: 'MN 10', limit: 1 }], ['get_commentary', { uid: 'MN 10', limit: 1 }],
    ['get_post_canonical', { citation: 'Vism 1.1', limit: 1 }],
    ['search_texts', { query: 'evaṃ', collection: 'mn10', limit: 1 }],
    ['search_commentary', { query: 'dhamma', books: [commentary.load().books[0].file], limit: 1 }],
    ['search_post_canonical', { query: 'cittaṃ', books: ['abhidh-s'], limit: 1 }],
    ['search_source_book', { book: 'vin02m1', query: 'Ime kho panāyasmanto dvenavuti pācittiyā', limit: 1 }],
    ['analyse_passage', { uid: 'Dhp 183', limit: 1 }],
  ];
  for (const [tool, args] of positives) {
    const result = await call(tool, args);
    assert.ok((result.segments || result.results || result.words)?.length, `${tool}: valid request did not recover`);
    counts.recovery_reads++;
  }
  return counts;
}
