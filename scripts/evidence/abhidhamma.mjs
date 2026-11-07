// Follow source-derived navigation; dictionary pointers are checked without live lookup.
import assert from 'node:assert/strict';
import * as canon from '../../src/canon.mjs';
import { DICTIONARY_NOTE } from '../../src/abhidhamma.mjs';
const strip = text => text.replace(/<[^>]+>/g, '').trim();

export async function auditAbhidhammaCommands(call) {
  const counts = { sections: 0, groups: 0, entries: 0, items: 0, conditions: 0, definitions: 0, list_readings: 0, source_readings: 0 };
  function source(result) {
    assert.deepEqual(result.source, canon.source());
    assert.equal(result.attribution, canon.source().attribution);
    assert.equal(result.terms, canon.source().terms);
  }
  async function follow({ tool, ...args }) { return call(tool, args); }
  async function location(where) {
    const unit = canon.resolve(where.text_id).unit;
    assert.equal(canon.resolve(where.citation).unit.id, unit.id);
    assert.equal(canon.resolve(where.get_text.uid).unit.id, unit.id);
    const { offset, limit } = where.get_text;
    assert.deepEqual(where.read_with, { tool: 'get_text', uid: unit.id, offset, limit });
    const all = canon.segments(unit), expected = all.slice(offset, offset + limit);
    assert.equal(expected.length, limit); assert.equal(expected[0].ref, where.segment_ref);
    const page = await follow(where.read_with);
    assert.deepEqual(page.source, canon.source());
    assert.equal(page.attribution, canon.source().attribution); assert.equal(page.text_id, unit.id);
    assert.deepEqual(page.segments, expected, 'Reader must return the entire selected source window');
    assert.equal(page.offset, offset); assert.equal(page.returned, limit);
    assert.equal(page.next_offset, offset + limit < all.length ? offset + limit : null);
    if (where.vri_paragraph) assert.equal(page.segments[0].vri_paragraph, where.vri_paragraph);
    counts.source_readings++;
    return page.segments.map(s => strip(s.text));
  }
  const catalogue = await call('abhidhamma_matika', {}); source(catalogue);
  assert.deepEqual(catalogue.sections.map(s => s.entries), [22, 100, 42]);
  const numbers = [];
  for (const row of catalogue.sections) {
    assert.deepEqual(row.read_with, { tool: 'abhidhamma_matika', section: row.section });
    const section = await follow(row.read_with); source(section);
    assert.equal(section.text_id, row.text_id); assert.equal(section.entries.length, row.entries);
    for (const entry of section.entries) {
      const selector = `${entry.kind} ${entry.number}`;
      const single = await call('abhidhamma_matika', { section: selector }); source(single);
      assert.deepEqual(single.entries, [entry]);
      const lines = await location(entry);
      assert.deepEqual(lines, entry.items.map(i => `(${i.label}) ${i.text}`));
      assert.equal(entry.items.length, row.section === 'tika' ? 3 : 2);
      if (row.section !== 'tika') numbers.push(entry.number);
      counts.entries++; counts.items += entry.items.length;
    }
    const grouped = [];
    for (const group of row.groups || []) {
      assert.deepEqual(group.read_with, { tool: 'abhidhamma_matika', section: group.heading });
      const result = await follow(group.read_with); source(result);
      assert.equal(result.group, group.heading); assert.equal(result.entries.length, group.count);
      assert.deepEqual(result.entries, section.entries.filter(e => e.group === group.heading));
      assert.equal(group.dyads, `${result.entries[0].number}–${result.entries.at(-1).number}`);
      grouped.push(...result.entries.map(e => e.number)); counts.groups++;
    }
    if (row.section === 'duka') assert.deepEqual(grouped, section.entries.map(e => e.number));
    counts.sections++;
  }
  assert.deepEqual(numbers, Array.from({ length: 142 }, (_, i) => i + 1));
  const conditions = await call('patthana_condition', { name: 'all' }); source(conditions);
  assert.equal(conditions.count, 24); assert.equal(conditions.conditions.length, 24);
  for (const [index, row] of conditions.conditions.entries()) {
    assert.equal(row.number, index + 1);
    assert.deepEqual(row.read_with, { tool: 'patthana_condition', name: String(index + 1) });
    const result = await follow(row.read_with); source(result);
    const current = result.condition;
    assert.equal(current.name, row.name); assert.equal(current.number, row.number);
    assert.deepEqual(current.dictionary, { tool: 'lookup_pali', word: current.name.replace(/paccayo$/i, '').toLowerCase(), note: DICTIONARY_NOTE });
    assert.equal(current.english, undefined); assert.equal(current.gloss, undefined);
    assert.deepEqual((await call('patthana_condition', { name: row.name })).condition, current);
    const { text, ...where } = current.definition;
    assert.deepEqual(where, row.definition); assert.equal(row.definition.text, undefined);
    const definition = await location(current.definition);
    assert.deepEqual(definition, text); assert.ok(definition[0].startsWith(current.definition.opening));
    assert.ok(canon.fold(current.definition.opening).startsWith(canon.fold(current.name)));
    assert.equal(current.definition.vri_paragraph, String(index + 1));
    const listed = await location(current.listed_in);
    assert.equal(listed.length, 1);
    for (const item of conditions.conditions) assert.ok(listed[0].includes(item.name));
    counts.conditions++; counts.definitions++; counts.list_readings++;
  }
  return counts;
}
