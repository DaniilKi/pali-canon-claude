import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { findCitations, scan, foldWithOffsets, register } from '../src/find-citations.mjs';

const MIXED = 'The Satipaṭṭhāna Sutta (MN 10, also M i 55) and the first sermon (SN 56:11; S v 420) are central. '
  + 'Compare AN 3.65, Dhp 183 and Dhp 1–20, Snp 1.8 (Sn 1.8), Ud 1.10, Iti 27, Thag 1.1 and Thig 5.4. '
  + 'The Vinaya opens with Pj 1; see also Bu Pj 1, Bi Pc 5, Kd 1, Mv 1, Cv 4, Pvr 1.1 and Vin iii 1. '
  + 'Online: https://suttacentral.net/mn10, https://www.accesstoinsight.org/tipitaka/mn/mn.010.than.html and '
  + 'https://www.dhammatalks.org/suttas/MN/MN10.html. Segment sn56.11:5.1, pli-tv-bu-vb-pj1. '
  + 'Majjhima Nikāya 10, Dīgha Nikāya 16, Theragāthā 1.1, Paṭis 1.1, Kv 1.1.';

const EXPECTED = [
  ['MN 10', 'mn10'], ['M i 55', 'mn10'], ['SN 56:11', 'sn56.11'], ['S v 420', 'sn56.11'], ['AN 3.65', 'an3.65'],
  ['Dhp 183', 'dhp183'], ['Dhp 1–20', 'dhp1-20'], ['Snp 1.8', 'snp1.8'], ['Sn 1.8', 'snp1.8'], ['Ud 1.10', 'ud1.10'],
  ['Iti 27', 'iti27'], ['Thag 1.1', 'thag1.1'], ['Thig 5.4', 'thig5.4'],
  ['Pj 1', 'pli-tv-bu-vb-pj1'], ['Bu Pj 1', 'pli-tv-bu-vb-pj1'], ['Bi Pc 5', 'pli-tv-bi-vb-pc5'], ['Kd 1', 'pli-tv-kd1'],
  ['Mv 1', 'pli-tv-kd1'], ['Cv 4', 'pli-tv-kd14'], ['Pvr 1.1', 'pli-tv-pvr1.1'], ['Vin iii 1', 'pli-tv-bu-vb-pj1'],
  ['https://suttacentral.net/mn10', 'mn10'], ['https://www.accesstoinsight.org/tipitaka/mn/mn.010.than.html', 'mn10'],
  ['https://www.dhammatalks.org/suttas/MN/MN10.html', 'mn10'], ['sn56.11:5.1', 'sn56.11'], ['pli-tv-bu-vb-pj1', 'pli-tv-bu-vb-pj1'],
  ['Majjhima Nikāya 10', 'mn10'], ['Dīgha Nikāya 16', 'dn16'], ['Theragāthā 1.1', 'thag1.1'], ['Paṭis 1.1', 'ps1.1'], ['Kv 1.1', 'kv1.1'],
];

test('find_citations: a mixed paragraph yields every scheme, in order, resolved', () => {
  const result = findCitations(MIXED, canon);
  assert.deepEqual(result.citations.map((c) => [c.text, c.text_id]), EXPECTED);
  assert.equal(result.found, EXPECTED.length);
  assert.equal(result.resolved, EXPECTED.length);
  assert.equal(result.unresolved, 0);
  for (const c of result.citations) {
    assert.equal(MIXED.slice(c.start, c.end), c.text, 'offsets point at the citation in the original text');
    assert.equal(c.status, 'resolved');
    // Every reported ID is a real text in the bundled canon.
    assert.equal(canon.resolve(c.text_id).unit.id, c.text_id);
    assert.ok(c.title, `${c.text} has a title`);
  }
  assert.match(result.source.attribution, /Vipassana|VRI/i);
  assert.ok(result.source.terms);
});

test('find_citations: segment anchors and numbering notes are passed on', () => {
  const [seg] = findCitations('Read sn56.11:5.1 first.', canon).citations;
  assert.equal(seg.text_id, 'sn56.11');
  assert.ok(seg.notes.some((n) => /segment/.test(n)));
  const [pts] = findCitations('See M i 55.', canon).citations;
  assert.ok(pts.notes.some((n) => /PTS M i 55/.test(n)));
});

test('find_citations: unresolved citations are reported with the reason, never corrected', () => {
  const text = 'Bad: MN 999, Sn 1032, Kd 1.2, Cv 13, DN 99, S v 9999 and Ja i 1. Also https://www.dhammatalks.org/suttas/MN/MN999.html.';
  const result = findCitations(text, canon);
  const byText = Object.fromEntries(result.citations.map((c) => [c.text, c]));
  assert.deepEqual(Object.keys(byText), ['MN 999', 'Sn 1032', 'Kd 1.2', 'Cv 13', 'DN 99', 'S v 9999', 'Ja i 1', 'https://www.dhammatalks.org/suttas/MN/MN999.html']);
  assert.ok(result.citations.every((c) => c.status === 'unresolved' && !c.text_id));
  assert.equal(result.unresolved, 8);
  assert.match(byText['MN 999'].reason, /not in the canon index/);
  assert.match(byText['Sn 1032'].reason, /verse number/);
  assert.match(byText['Kd 1.2'].reason, /chapter number only/);
  assert.match(byText['Cv 13'].reason, /chapters 1–12/);
  assert.match(byText['S v 9999'].reason, /No text found at PTS/);
  assert.match(byText['Ja i 1'].reason, /no PTS page numbers/);
  assert.match(byText['https://www.dhammatalks.org/suttas/MN/MN999.html'].reason, /not linked/);
  for (const c of result.citations) assert.equal(text.slice(c.start, c.end), c.text);
});

test('find_citations: ordinary prose produces no citations', () => {
  const prose = [
    'I am 10 years old.', 'AN example of this.', 'Plan A 3 failed.', 'It 27 times over.', 'Ps 23 is a psalm.',
    'As 5 people said.', 'The MN 10th edition.', 'Section 3.2 of S.', 'An 8-hour day.', 'In 1999 the D 7 bus.',
    'Mn 10 and dn 3 cats.', 'They paid MN 10,000.', 'An mp3 or pp3 file.', 'Is it a Thig?', 'Volumes I, II, III.',
    'Mrs A. Smith, vol. i p. 5.', 'J 5 and Dh 3.', 'Pe 4, Ne 2, Pp 1, Ya 2, Dt 3.', 'Ganga is 2,500 km.',
    'Visit http://evil.example/an3.65 or https://suttacentral.net.evil.example/mn10.', 'Email me at mn10@example.com.',
    'Version v2.1.0 shipped; build an1x failed.', 'SNAP 5, DNS 8, MNIST 10, ANOVA 3.', 'Dhp183x and xMN 10.',
  ].join(' ');
  const result = findCitations(prose, canon);
  assert.deepEqual(result.citations, [], JSON.stringify(result.citations.map((c) => c.text)));
  assert.equal(result.found, 0);
});

test('find_citations: links keep their own boundaries and drop trailing punctuation', () => {
  const text = '(https://suttacentral.net/sn56.11), and https://www.dhammatalks.org/suttas/AN/AN7_64.html.';
  const cs = findCitations(text, canon).citations;
  assert.deepEqual(cs.map((c) => [c.text, c.text_id]), [
    ['https://suttacentral.net/sn56.11', 'sn56.11'],
    ['https://www.dhammatalks.org/suttas/AN/AN7_64.html', 'an7.68'],
  ]);
  // A link's path is not scanned again as a separate "sn56.11" citation.
  assert.equal(cs.length, 2);
});

test('find_citations: offsets are UTF-16 indices into the original, diacritics and emoji included', () => {
  const text = 'Ānanda 🙏 recited Saṃyutta Nikāya 56.11 and Aṅguttara 3.65.';
  const cs = findCitations(text, canon).citations;
  assert.deepEqual(cs.map((c) => [text.slice(c.start, c.end), c.text_id]), [['Saṃyutta Nikāya 56.11', 'sn56.11'], ['Aṅguttara 3.65', 'an3.65']]);
  assert.equal(foldWithOffsets(text).offsets.length, foldWithOffsets(text).folded.length + 1);
  // Decomposed diacritics (NFD input) keep offsets too.
  const nfd = 'See Saṃyutta 56.11.'.normalize('NFD');
  const [c] = findCitations(nfd, canon).citations;
  assert.equal(nfd.slice(c.start, c.end), c.text);
  assert.equal(c.text_id, 'sn56.11');
});

test('find_citations: Sn and SN are told apart; ranges and spans resolve as the parser says', () => {
  const cs = findCitations('SN 1.8 versus Sn 1.8; MN 10-12; Dhp 1 – 20.', canon).citations;
  assert.deepEqual(cs.map((c) => [c.text, c.text_id]), [['SN 1.8', 'sn1.8'], ['Sn 1.8', 'snp1.8'], ['MN 10-12', 'mn10'], ['Dhp 1 – 20', 'dhp1-20']]);
  assert.ok(cs[2].notes.some((n) => /spans several texts/.test(n)));
});

test('find_citations: results are capped and the cap is reported', () => {
  const text = Array.from({ length: 30 }, (_, i) => `MN ${i + 1}`).join('; ');
  assert.equal(scan(text).length, 30);
  const result = findCitations(text, canon, { limit: 10 });
  assert.equal(result.found, 30);
  assert.equal(result.returned, 10);
  assert.equal(result.truncated, true);
});

test('find_citations: registers one read-only, offline tool', () => {
  const calls = [];
  const z = { string: () => ({ min: () => ({ max: () => ({ describe: () => 'schema' }) }) }) };
  register({ tool: (...args) => calls.push(args), z, canon });
  assert.equal(calls.length, 1);
  const [name, description, shape, fn, options] = calls[0];
  assert.equal(name, 'find_citations');
  assert.match(description, /Works offline/);
  assert.deepEqual(Object.keys(shape), ['text']);
  assert.equal(options, undefined, 'no network option: openWorldHint stays false');
  assert.equal(fn({ text: 'MN 10' }).citations[0].text_id, 'mn10');
});
