import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { matika, condition, buildMatika, buildConditions, GLOSSES, GLOSS_LABEL } from '../src/abhidhamma.mjs';

// Every location must resolve through the citation the tool hands out, and the segment it points to
// must carry the heading text and VRI paragraph the tool reports.
function assertLocation(where, expectedTexts, vriParagraph) {
  const { unit } = canon.resolve(where.citation);
  assert.equal(unit.id, where.text_id, where.citation);
  assert.equal(canon.resolve(where.get_text.uid).unit.id, where.text_id);
  const segs = canon.segments(unit);
  const window = segs.slice(where.get_text.offset, where.get_text.offset + where.get_text.limit);
  assert.equal(window.length, where.get_text.limit, `${where.segment_ref} window is inside the text`);
  assert.equal(window[0].ref, where.segment_ref);
  if (vriParagraph) assert.equal(window[0].vri_paragraph, vriParagraph, where.segment_ref);
  const joined = window.map((s) => s.text).join('\n');
  for (const t of expectedTexts) assert.ok(joined.includes(t), `${where.segment_ref} contains "${t}"`);
}

test('Dhammasaṅgaṇī mātikā: 22 triads, 100 Abhidhamma dyads, 42 Suttanta dyads', () => {
  const [tika, duka, suttantika] = buildMatika();
  assert.equal(tika.entries.length, 22);
  assert.equal(duka.entries.length, 100);
  assert.equal(suttantika.entries.length, 42);
  assert.deepEqual(tika.entries.map((e) => e.number), Array.from({ length: 22 }, (_, i) => i + 1));
  assert.deepEqual([...duka.entries, ...suttantika.entries].map((e) => e.number), Array.from({ length: 142 }, (_, i) => i + 1));
  for (const e of tika.entries) assert.equal(e.items.length, 3, `tika ${e.number}`);
  for (const e of [...duka.entries, ...suttantika.entries]) assert.equal(e.items.length, 2, `duka ${e.number}`);
  assert.equal(tika.heading, '1. Tikamātikā');
  assert.equal(duka.heading, '2. Dukamātikā');
  assert.equal(suttantika.heading, 'Suttantikadukamātikā');
  assert.deepEqual(tika.entries[0].items.map((i) => i.text), ['kusalā dhammā.', 'akusalā dhammā.', 'abyākatā dhammā.']);
  assert.equal(duka.entries[0].group, 'Hetugocchakaṃ');
  assert.equal(duka.entries[99].group, 'Piṭṭhidukaṃ');
});

test('every mātikā reference resolves to bundled text containing the heading', () => {
  for (const section of buildMatika()) {
    assert.equal(canon.resolve(section.citation).unit.id, section.text_id);
    for (const e of section.entries) {
      assertLocation(e, e.items.map((i) => `(${i.label}) ${i.text}`), e.vri_paragraph);
      if (e.group) {
        const segs = canon.segments(canon.resolve(e.citation).unit);
        assert.ok(segs.some((s) => s.type === 'heading' && s.text === e.group), `group heading ${e.group}`);
      }
    }
  }
});

test('abhidhamma_matika section selection', () => {
  const overview = matika();
  assert.deepEqual(overview.sections.map((s) => s.section), ['tika', 'duka', 'suttantika']);
  assert.equal(overview.sections[1].groups.length, 13);
  assert.match(overview.attribution, /VRI/);
  assert.equal(matika('Tikamātikā').entries.length, 22);
  assert.equal(matika('duka').entries.length, 100);
  assert.equal(matika('Ds 1.3').entries.length, 42);
  assert.deepEqual(matika('āsava').entries.map((e) => e.number), [14, 15, 16, 17, 18, 19]);
  assert.equal(matika('Hetugocchakaṃ').group, 'Hetugocchakaṃ');
  assert.equal(matika('tika 5').entries[0].items[0].text, 'saṃkiliṭṭhasaṃkilesikā dhammā.');
  assert.equal(matika('duka 101').entries[0].citation, 'Ds 1.3');
  assert.throws(() => matika('tika 23'), /1–22/);
  assert.throws(() => matika('nonsense'), /Unknown mātikā section/);
});

test('24 Paṭṭhāna conditions: names from the paccayuddesa, definitions from the paccayaniddesa', () => {
  const conditions = buildConditions();
  assert.equal(conditions.length, 24);
  const unit = canon.resolve('Paṭṭh 1.1').unit;
  const uddesa = canon.segments(unit).find((s) => s.text.startsWith('Hetupaccayo, ārammaṇapaccayo'));
  for (const c of conditions) {
    assert.ok(uddesa.text.includes(c.name), `${c.name} is listed in the uddesa`);
    assert.equal(c.definition.vri_paragraph, String(c.number), c.name);
    assert.ok(c.definition.text[0].startsWith(c.definition.opening));
    assertLocation(c.definition, [c.definition.opening, ...c.definition.text], String(c.number));
    assert.ok(canon.fold(c.definition.opening).startsWith(canon.fold(c.name)), c.name);
    assertLocation(c.listed_in, [c.name]);
    assert.ok(GLOSSES[c.key], `gloss for ${c.key}`);
  }
  assert.equal(Object.keys(GLOSSES).length, 24);
});

test('patthana_condition lookup and gloss labelling', () => {
  for (const [input, number] of [['hetu', 1], ['Hetupaccayo', 1], ['ārammaṇa', 2], ['arammana paccaya', 2], ['decisive support', 9], ['upanissaya', 9], ['kamma-result', 14], ['root condition', 1], ['24', 24], ['avigatapaccayo', 24]]) {
    assert.equal(condition(input).condition.number, number, input);
  }
  const c = condition('anantara').condition;
  assert.equal(c.name, 'anantarapaccayo');
  assert.equal(c.gloss.label, GLOSS_LABEL);
  assert.match(c.gloss.label, /not scripture/);
  assert.match(c.definition.text[0], /^Anantarapaccayoti – /);
  const all = condition('all');
  assert.equal(all.count, 24);
  assert.equal(all.conditions[23].definition.text, undefined);
  assert.throws(() => condition('foo'), /Unknown Paṭṭhāna condition/);
  assert.throws(() => condition('25'), /Unknown Paṭṭhāna condition/);
});
