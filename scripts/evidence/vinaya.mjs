// Check navigation against the bundled VRI and link index; never fetch the BMC.
import assert from 'node:assert/strict';
import bmc from '../../server/data/bmc.json' with { type: 'json' };
import * as canon from '../../src/canon.mjs';
import { readAssignment } from './study.mjs';

export async function auditVinayaCommands(call) {
  const counts = { rules: 0, grouped_rules: 0, paired_bmc_links: 0, canonical_readings: 0, canonical_pages: 0, introductions: 0 };
  const checked = new Set();
  async function read(command, id) {
    assert.deepEqual(command, { tool: 'get_text', uid: id });
    if (checked.has(id)) return;
    const result = await readAssignment(call, { uid: command.uid }, canon.resolve(id).unit);
    counts.canonical_readings++; counts.canonical_pages += result.pages;
    checked.add(id);
  }
  for (const [key, link] of Object.entries(bmc.rules)) {
    const id = `pli-tv-bu-vb-${key}`;
    const result = await call('vinaya_rule', { rule: id });
    const actual = result.canonical_text;
    assert.equal(actual.id, id, 'Keep the requested rule identity separate from its shared source');
    const shared = /^as\d+$/.test(key);
    const target = shared ? 'pli-tv-bu-vb-as2' : id;
    const described = canon.describe(canon.resolve(target).unit);
    assert.equal(actual.passage_id, shared ? target : undefined);
    assert.deepEqual(actual.source, canon.source());
    for (const field of ['title', 'pts', 'vri_book', 'vri_paragraphs', 'first_line', 'alignment']) assert.deepEqual(actual[field], described[field]);
    assert.equal(!!actual.approximate, !!described.approximate);
    await read(actual.reading_command, target);
    if (shared) {
      assert.equal(actual.passage_citation, described.citation);
      assert.equal(actual.introduction.id, 'pli-tv-bu-vb-as1');
      await read(actual.introduction.read_with, actual.introduction.id);
      assert.match(result.notes.join(' '), /one paragraph/);
      assert.equal(actual.vri_paragraphs, '655');
      counts.grouped_rules++;
    } else assert.equal(actual.introduction, undefined);
    const modern = result.buddhist_monastic_code;
    assert.equal(modern.url, link.url);
    assert.equal(modern.chapter, link.chapter);
    assert.equal(modern.section, link.section);
    assert.match(modern.kind, /commentary.*linked only/);
    for (const field of ['author', 'edition', 'publisher', 'license', 'license_url', 'url']) assert.equal(modern.attribution[field], bmc.source[field]);
    assert.equal(modern.attribution.work, bmc.source.title);
    assert.match(modern.attribution.note, /not scripture and not a ruling/);
    assert.equal(modern.text, undefined);
    assert.match(result.english, /No English translation.*bundled/);
    if (link.discussed_with) {
      assert.equal(modern.discussed_with.toLowerCase().replace(/\s/g, ''), link.discussed_with.toLowerCase());
      assert.match(result.notes.join(' '), /shared section/);
      counts.paired_bmc_links++;
    } else assert.equal(modern.discussed_with, undefined);
    counts.rules++;
  }
  assert.equal(counts.rules, 227); assert.equal(counts.grouped_rules, 7);
  assert.ok(checked.has('pli-tv-bu-vb-as1'));
  counts.introductions = 1;
  return counts;
}
