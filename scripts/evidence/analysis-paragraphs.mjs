import assert from 'node:assert/strict';
import { SCRIPTS, transliterate } from '../../src/script.mjs';

// Repeated labels in the pinned VRI canon. They are source labels, not unique segment IDs.
export const repeatedParagraphs = [
  ['snp2.5', 274, ['snp2.5/7', 'snp2.5/8']],
  ['thag20.1', 1204, ['thag20.1/58', 'thag20.1/59']],
  ['ja526', 21, ['ja526/23', 'ja526/24']],
  ['ps3.2', 10, ['ps3.2/3', 'ps3.2/9']],
  ['ne3', 4, ['ne3/2', 'ne3/7']],
];

export async function auditAnalysisParagraphs(call) {
  for (const [uid, paragraph, refs] of repeatedParagraphs) {
    const read = await call('get_text', { uid, limit: 200 });
    assert.ok(!read.isError, JSON.stringify(read.content));
    const segments = read.structuredContent.segments.filter(s => String(s.vri_paragraph) === String(paragraph));
    assert.deepEqual(segments.map(s => s.ref), refs);
    for (const script of SCRIPTS) {
      const result = await call('analyse_passage', { uid: transliterate(uid, 'roman', script), paragraph, limit: 1 });
      assert.equal(result.isError, true);
      const message = JSON.parse(result.content[0].text).error;
      assert.match(message, /matches 2 segments/);
      for (const ref of refs) assert.ok(message.includes(ref), message);
      assert.doesNotMatch(message, /undefined/);
      for (const segment of segments) {
        const args = { uid: transliterate(uid, 'roman', script), segment: segment.ref, limit: 1 };
        const result = await call('analyse_passage', args);
        assert.ok(!result.isError, JSON.stringify(result.content));
        assert.equal(result.structuredContent.segment.text, segment.text);
        assert.equal(result.structuredContent.segment.ref, segment.ref);
        assert.equal(result.structuredContent.text_source.commit, read.structuredContent.source.commit);
        const next = await call('analyse_passage', { ...args, offset: result.structuredContent.next_offset });
        assert.ok(!next.isError);
        assert.deepEqual(next.structuredContent.segment, result.structuredContent.segment);
        assert.equal(next.structuredContent.offset, 1);
      }
    }
  }
}
