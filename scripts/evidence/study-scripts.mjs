import assert from 'node:assert/strict';
import * as post from '../../src/postcanonical.mjs';
import * as commentary from '../../src/commentary.mjs';
import { SCRIPTS, transliterate } from '../../src/script.mjs';

export function expectedSegments(segments, script) {
  return segments.map(segment => ({ ...segment,
    text: script === 'roman' ? segment.text : segment.type === 'verse'
      ? segment.text.split('\n').map((line, i, lines) => transliterate(line, 'roman', script, { stanza: i === lines.length - 1 })).join('\n')
      : transliterate(segment.text, 'roman', script),
    ...(segment.variant_readings && script !== 'roman' ? { variant_readings: segment.variant_readings.map(v => transliterate(v, 'roman', script)) } : {}),
  }));
}

export async function auditStudyScripts(call) {
  const counts = { scripts: 0, postcanonical_pages: 0, catalogues: 0, search_cases: 0, exact_reads: 0, context_reads: 0, title_reads: 0 };
  const codes = ['romn', 'sinh', 'thai', 'mymr', 'deva', 'khmr', 'laoo', 'lana'];
  const commentBook = commentary.load().books[0].file;
  const searchCases = [
    ['search_post_canonical', { query: '"cittaṃ"', books: ['abhidh-s'], limit: 2 }],
    ['search_commentary', { query: '"dhamma"', books: [commentBook], limit: 2 }],
    ['search_texts', { query: '"evaṃ"', collection: 'mn10', limit: 1 }],
  ];
  for (const [index, script] of SCRIPTS.entries()) {
    const code = codes[index];
    const citation = transliterate('Vism 1.1', 'roman', script);
    const first = await call('get_post_canonical', { citation, script: code, limit: 2 });
    const roman = await post.getText('Vism 1.1', { limit: 2 });
    assert.deepEqual(first.segments, expectedSegments(roman.segments, script));
    assert.equal(first.canonical, false); assert.equal(first.citation, roman.citation);
    assert.deepEqual(first.source, roman.source); assert.deepEqual(first.notes, roman.notes);
    if (script !== 'roman') assert.equal(first.input_script, script);
    const { tool, ...args } = first.continue_with;
    assert.equal(args.script, script); assert.equal(args.citation, roman.citation);
    const next = await call(tool, args);
    assert.deepEqual(next.segments, expectedSegments((await post.getText('Vism 1.1', { offset: 2, limit: 2 })).segments, script));
    counts.postcanonical_pages += 2;
    const catalogue = await call('get_post_canonical', { script: code, limit: 200 });
    const original = post.browse('', { limit: 200 });
    assert.equal(catalogue.items.length, 109); assert.equal(catalogue.segments, undefined);
    assert.equal(catalogue.continue_with, null); assert.deepEqual(catalogue.source, original.source);
    assert.deepEqual(catalogue.items.map(i => i.id), original.items.map(i => i.id));
    for (const [i, item] of catalogue.items.entries()) assert.equal(item.title, script === 'roman' ? original.items[i].title : transliterate(original.items[i].title, 'roman', script));
    counts.catalogues++;
    for (const [name, queryArgs] of searchCases) {
      const base = await call(name, queryArgs);
      assert.ok(base.results.length);
      const result = await call(name, { ...queryArgs, query: transliterate(queryArgs.query, 'roman', script), script: code });
      if (name !== 'search_texts') assert.equal(result.canonical, false);
      assert.equal(result.total_matched ?? result.total_texts_matched, base.total_matched ?? base.total_texts_matched);
      assert.deepEqual(result.source, base.source);
      assert.deepEqual(result.results.map(h => h.segment_ref || h.citation), base.results.map(h => h.segment_ref || h.citation));
      if (script !== 'roman') assert.equal(result.input_script, script);
      for (const [i, hit] of result.results.entries()) {
        const before = base.results[i];
        assert.equal(hit.excerpt, script === 'roman' ? before.excerpt : transliterate(before.excerpt, 'roman', script));
        for (const key of ['read_with', 'context_with']) {
          assert.deepEqual(hit[key], { ...before[key], script });
          const { tool, ...args } = hit[key];
          const { tool: originalTool, ...originalArgs } = before[key];
          const originalPage = await call(originalTool, originalArgs), page = await call(tool, args);
          assert.deepEqual(page.segments, expectedSegments(originalPage.segments, script));
          if (tool !== 'get_text') assert.equal(page.canonical, false);
          assert.deepEqual(page.source, originalPage.source);
          counts[key === 'read_with' ? 'exact_reads' : 'context_reads']++;
        }
      }
      counts.search_cases++;
    }
    // The canonical search's optional post-canonical section must keep the same script commands.
    const mixed = await call('search_texts', { query: 'cittaṃ', include_post_canonical: true, script: code, limit: 1 });
    assert.ok(mixed.post_canonical.results.length);
    assert.equal(mixed.post_canonical.results[0].read_with.script, script);
    const title = await call('search_texts', { query: transliterate('satipaṭṭhāna', 'roman', script), collection: 'mn', script: code, limit: 1 });
    assert.ok(title.title_matches.length); const selected = title.title_matches[0];
    assert.equal(selected.read_with.script, script);
    const { tool: reader, ...titleArgs } = selected.read_with;
    assert.equal((await call(reader, { ...titleArgs, limit: 1 })).text_id, selected.id); counts.title_reads++;
    counts.scripts++;
  }
  return counts;
}
