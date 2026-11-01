import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { parseNote, parseNoteSpans, uncovered, parseSigla, textSegments, structuredInfo, SIGLA, VARIANT_MODES } from '../src/variants.mjs';

const sig = (r) => r.editions.map((e) => e.siglum + (e.part ? `/${e.part}` : ''));

test('a simple note gives one reading and its editions', () => {
  const p = parseNote('pariddavānaṃ (sī. pī.)');
  assert.equal(p.raw, 'pariddavānaṃ (sī. pī.)');
  assert.deepEqual(p.remarks, []);
  assert.equal(p.readings.length, 1);
  assert.equal(p.readings[0].reading, 'pariddavānaṃ');
  assert.deepEqual(sig(p.readings[0]), ['sī.', 'pī.']);
  assert.equal(p.readings[0].editions[0].edition, 'Sri Lankan');
  assert.equal(p.readings[0].editions[1].edition, 'Pali Text Society');
});

test('several readings in one note, with and without commas', () => {
  const p = parseNote('bhadraṃ yānaṃ (syā.), bhaddaṃ yānaṃ (pī.) cattāro māse (sī. pī.)');
  assert.deepEqual(p.readings.map((r) => r.reading), ['bhadraṃ yānaṃ', 'bhaddaṃ yānaṃ', 'cattāro māse']);
  assert.deepEqual(p.readings.map(sig), [['syā.'], ['pī.'], ['sī.', 'pī.']]);
});

test('kaṃ. and ka. are kept apart as printed', () => {
  const p = parseNote('dhammikathanti (syā. kaṃ. ka.)');
  assert.deepEqual(sig(p.readings[0]), ['syā.', 'kaṃ.', 'ka.']);
  assert.ok(SIGLA['ka.'].caveat);
});

test('commentary markers attach to the edition before them', () => {
  const p = parseNote('sakaṃ parisaṃ apaloketvā (sī. syā. kaṃ.), oloketvā (sī. aṭṭha. syā. aṭṭha.)');
  assert.deepEqual(p.readings.map(sig), [['sī.', 'syā.', 'kaṃ.'], ['sī./commentary', 'syā./commentary']]);
});

test('scope words, unspaced and misspelt sigla', () => {
  assert.deepEqual(parseSigla('sabbattha'), { editions: [], scope: { word: 'sabbattha', meaning: 'all (other) editions' } });
  assert.equal(parseSigla('bahūsu').scope.word, 'bahūsu');
  const s = parseSigla('sī.pī.');
  assert.deepEqual(s.editions.map((e) => e.siglum), ['sī.', 'pī.']);
  const t = parseSigla('ka. si. syā. pī.');
  assert.deepEqual(t.editions.map((e) => e.siglum), ['ka.', 'sī.', 'syā.', 'pī.']);
  assert.equal(t.editions[1].as_printed, 'si.');
});

test('cross-references and queries stay verbatim remarks, never readings', () => {
  assert.deepEqual(parseNote('dī. ni. 2.222'), { raw: 'dī. ni. 2.222', readings: [], omissions: [], remarks: ['dī. ni. 2.222'] });
  assert.deepEqual(parseNote('ujuṃ (?)').readings, []);
  assert.deepEqual(parseNote('ujuṃ (?)').remarks, ['ujuṃ (?)']);
  const p = parseNote('bhagavāti (syā.), dī. ni. 1.157, abbhuggatākārena pana sameti');
  assert.equal(p.readings[0].reading, 'bhagavāti');
  assert.deepEqual(p.remarks, ['dī. ni. 1.157, abbhuggatākārena pana sameti']);
  // A siglum group followed by a reference keeps the reference as the reading's remark.
  const q = parseNote('evaṃ (sī. syā. kaṃ. pī. dī. ni. 1.556)');
  assert.deepEqual(sig(q.readings[0]), ['sī.', 'syā.', 'kaṃ.', 'pī.']);
  assert.equal(q.readings[0].remark, 'dī. ni. 1.556');
  // A reference mixed into the reading text is not attributed as a reading.
  assert.deepEqual(parseNote('daḷhadhammo, a. ni. 9.38 (sabbattha)').readings, []);
  // Parenthesised text that is not a siglum group is not a reading.
  assert.deepEqual(parseNote('vācāmuniṃ (itivu.)').readings, []);
});

test('"( ) natthi" is an omission, never a reading of the word natthi', () => {
  const p = parseNote('( ) natthi (sī. pī.)');
  assert.deepEqual(p.readings, []);
  assert.deepEqual(p.remarks, []);
  assert.equal(p.omissions.length, 1);
  assert.equal(p.omissions[0].text, '( ) natthi (sī. pī.)');
  assert.equal(p.omissions[0].absent, 'the passage printed in parentheses');
  assert.deepEqual(sig(p.omissions[0]), ['sī.', 'pī.']);
  assert.deepEqual(parseNote('( ) natthi (sī. syā. kaṃ. pī.)').readings, []);
  // "idaṃ padaṃ natthi (…)": this word is absent from those editions.
  const w = parseNote('idaṃ padaṃ natthi (sī. syā. pī. potthakesu)');
  assert.deepEqual(w.readings, []);
  assert.equal(w.omissions[0].absent, 'this word');
  assert.deepEqual(sig(w.omissions[0]), ['sī.', 'syā.', 'pī.']);
  // A trailing "( ) sabbattha natthi" stays one verbatim remark; the reading before it is kept.
  const t = parseNote('aññathāpi (sī. pī.) ( ) sabbattha natthi');
  assert.deepEqual(t.readings.map((r) => r.reading), ['aññathāpi']);
  assert.deepEqual(t.remarks, ['( ) sabbattha natthi']);
  // A bare "natthi (…)" is ambiguous (omission or the word): neither reading nor omission.
  const b = parseNote('natthi (sī. pī.)');
  assert.deepEqual([b.readings, b.omissions, b.remarks], [[], [], ['natthi (sī. pī.)']]);
  // A real reading that contains natthi is still a reading.
  assert.equal(parseNote('natthi te (sī. syā. kaṃ. pī.)').readings[0].reading, 'natthi te');
});

test('editorial sentences are remarks, not readings', () => {
  const p = parseNote('idaṃ padaṃ brahmajālasutte na dissati. evaṃ (pī. ka.)');
  assert.deepEqual(p.readings, []);
  assert.deepEqual(p.remarks, ['idaṃ padaṃ brahmajālasutte na dissati. evaṃ (pī. ka.)']);
  assert.deepEqual(parseNote('imissā gāthāya pubbaddhāparaddhaṃ vipariyāyena dissati (ka.)').readings, []);
  const q = parseNote('anuddayā (sī.) evamīdisesu dvīsu padesupi dvibhāvavasena. anudā anudāyanā anudāyitattaṃ (syā. ka.)');
  assert.deepEqual(q.readings.map((r) => r.reading), ['anuddayā']);
  assert.equal(q.remarks.length, 1);
  // "dissati" on its own is an ordinary word and may be a reading.
  assert.equal(parseNote('dissati hi bhikkhave (sī. syā. kaṃ.)').readings[0].reading, 'dissati hi bhikkhave');
});

test('nested or unbalanced parentheses: the whole note is one remark', () => {
  for (const n of ['pāvālaṃ (cetiyaṃ (syā.)', 'avimanā (sī. syā. katthaci', '(anuṇṇataṃ (ka.)', 'nandi (sī.) passa saṃ. ni. 2.64)']) {
    const p = parseNote(n);
    assert.deepEqual([p.readings, p.omissions, p.remarks], [[], [], [n]], n);
  }
});

test('every reading is a verbatim substring of its note', () => {
  const d = canon.load();
  let notes = 0;
  let structured = 0;
  for (const b of d.canon.books) for (const bl of b.blocks) for (const n of bl[3]) {
    notes += 1;
    const p = parseNote(n);
    if (p.readings.length) structured += 1;
    for (const r of p.readings) {
      assert.ok(n.includes(r.reading), `${r.reading} not in ${n}`);
      for (const e of r.editions) assert.ok(SIGLA[e.siglum], e.siglum);
    }
    for (const x of p.remarks) assert.ok(n.includes(x), `${x} not in ${n}`);
    for (const o of p.omissions) {
      assert.ok(n.includes(o.text) && /natthi/.test(o.text), `${o.text} in ${n}`);
      for (const e of o.editions) assert.ok(SIGLA[e.siglum], e.siglum);
    }
    // Coverage: nothing in the note is dropped, apart from separators.
    const { spans } = parseNoteSpans(n);
    assert.equal(uncovered(n, spans), '', `text lost from ${n}`);
    // No reading is a bare omission word or contains an editorial phrase.
    for (const r of p.readings) assert.ok(!/^(sabbattha\s+)?natthi$|na dissati|potthakesu|passitabb/.test(r.reading), `${r.reading} in ${n}`);
  }
  assert.ok(notes > 18000);
  assert.ok(structured / notes > 0.85, `${structured}/${notes}`);
});

test('get_text variants modes on MN 10', () => {
  const u = canon.resolve('MN 10').unit;
  assert.deepEqual(VARIANT_MODES, ['none', 'raw', 'structured']);
  const none = textSegments(u, {}).segments;
  assert.ok(!none.some((s) => s.variant_readings || s.variants));
  const raw = textSegments(u, { includeVariants: true }).segments;
  assert.ok(raw.some((s) => s.variant_readings) && !raw.some((s) => s.variants));
  assert.deepEqual(textSegments(u, { variants: 'raw' }).segments, raw);
  const { segments } = textSegments(u, { variants: 'structured' });
  const s4 = segments.find((s) => s.ref === 'mn10/4');
  assert.equal(s4.variant_readings, undefined);
  assert.equal(s4.variants[0].raw, 'pariddavānaṃ (sī. pī.)');
  assert.deepEqual(sig(s4.variants[0].readings[0]), ['sī.', 'pī.']);
  // Same segments, same text: structured mode only adds the parsed notes.
  assert.deepEqual(segments.map((s) => s.text), none.map((s) => s.text));
  // Explicit variants wins over the boolean.
  assert.ok(!textSegments(u, { includeVariants: true, variants: 'none' }).segments.some((s) => s.variant_readings));
  const info = structuredInfo(segments);
  assert.deepEqual(Object.keys(info.variant_sigla).sort(), [...new Set(segments.flatMap((s) => (s.variants || []).flatMap((v) => v.readings.flatMap((r) => r.editions.map((e) => e.siglum)))))].sort());
  assert.match(info.variant_note, /verbatim/);
});
