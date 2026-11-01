// verify_quote (issue #24): genuine quotations are found with their citation; known misattributions are
// reported as not found, with the scope stated. English runs offline against a fixture of dhammatalks.org
// pages fetched once on 2026-11-01 (tests/fixtures/verify-english.json, URLs inside; CC BY-NC 4.0,
// Ṭhānissaro Bhikkhu). One live test re-fetches a page and is skipped when the network is unavailable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as canon from '../src/canon.mjs';
import { verifyQuote, detectLanguage, englishScope, similarity } from '../src/verify.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/verify-english.json', import.meta.url), 'utf8'));
const FIXTURE_TEXTS = fixture.pages.map((p) => canon.resolve(p.text_id).unit.acronym);
const fromFixture = async (unit, id) => {
  const page = fixture.pages.find((p) => p.translation_id === id);
  if (!page) throw new Error('not in the offline fixture');
  return { ...page, text_id: unit.id };
};
const english = (text, texts = FIXTURE_TEXTS) => verifyQuote({ text, language: 'english', texts }, { fetchTranslation: fromFixture });

// No scripture is typed into this file: every genuine quotation is built from the bundled VRI text
// (canon.segments) or sliced from the fixture pages, then folded or misspelt the way people write it.

/** Non-heading segments of a text, in order. */
const body = (ref) => canon.segments(canon.resolve(ref).unit).filter((s) => s.type !== 'heading');
/** Words `from`..`from+count` of a text's segment `seg` (an index into body(), or 'longest'). */
function bundledPassage(ref, count = 14, from = 0, seg = 'longest') {
  const segs = body(ref);
  const s = seg === 'longest' ? [...segs].sort((a, b) => b.text.length - a.text.length)[0] : segs[seg];
  return s.text.split(/\s+/).filter((w) => /\p{L}/u.test(w)).slice(from, from + count).join(' ');
}
/** As often written online: diacritics and punctuation dropped. */
const plain = (s) => canon.fold(s).replace(/[^a-z ]/g, '').replace(/ +/g, ' ').trim();
/** Misspelt: plain, then one letter dropped from every other long word. */
const misspell = (s) => plain(s).split(' ').map((w, i) => (i % 2 === 0 && w.length > 6 ? w.slice(0, 3) + w.slice(4) : w)).join(' ');
const asIs = (s) => s;

/** Lines of a fixture page (whitespace normalised). */
const fixtureLines = (id) => fixture.pages.find((p) => p.text_id === id).text.split(/\n\n/).map((l) => l.trim().replace(/\s+/g, ' '));
/** The lines of a fixture page that end at the verse-number line `label` (e.g. '223'). */
function fixtureVerse(id, label) {
  const lines = fixtureLines(id);
  const end = lines.findIndex((l) => l.replace('*', '') === label);
  assert.ok(end > 0, `${id}: no verse ${label}`);
  let start = end - 1;
  while (start >= 0 && !/^\d+(-\d+)?\*?$/.test(lines[start]) && !/^Dhp /.test(lines[start])) start -= 1;
  return lines.slice(start + 1, end).join(' ');
}
const fixtureSpan = (id, from, to) => fixtureLines(id).slice(from, to).join(' ');

// ---- 20 genuine quotations --------------------------------------------------

// [text, segment (index into body() or 'longest'), first word, word count, how it is written]
const PALI_GENUINE = [
  ['Dhp 1', 0, 0, 12, asIs],
  ['Dhp 5', 0, 0, 6, plain],
  ['Dhp 183', 0, 0, 12, asIs],
  ['Dhp 160', 0, 0, 8, plain],
  ['DN 16', 'longest', 10, 12, plain],
  ['SN 56.11', 1, 0, 10, asIs],
  ['MN 10', 1, 0, 8, asIs],
  ['Snp 1.8', 6, 0, 8, plain],
  ['AN 3.65', 3, 0, 12, plain],
  ['Ud 1.10', 'longest', 0, 12, plain],
  ['Dhp 277', 0, 0, 8, plain],
  ['Dhp 1', 0, 0, 6, misspell], // slightly misspelt: still the same passage
].map(([ref, seg, from, count, write]) => [write(bundledPassage(ref, count, from, seg)), ref]);
const BUNDLED_GENUINE = ['SN 22.59', 'MN 21', 'Iti 27', 'Thig 5.4'];
// [a passage sliced from the fixture page, the text it translates]; the last one lower-cased without punctuation.
const ENGLISH_GENUINE = [
  [fixtureVerse('dhp221-234', '223'), 'Dhp 221-234'],
  [fixtureSpan('dhp1-20', 33, 39), 'Dhp 1-20'],
  [fixtureVerse('dhp273-289', '277-279').split(' ').slice(0, 20).join(' '), 'Dhp 273-289'],
  [fixtureSpan('snp1.8', 27, 30).toLowerCase().replace(/[^a-z ]/g, ''), 'Snp 1.8'],
];

test('genuine Pāli quotations are found, with a citation that resolves', async () => {
  for (const [quote, ref] of PALI_GENUINE) {
    const r = await verifyQuote({ text: quote });
    const expected = canon.resolve(ref).unit.id;
    assert.equal(r.language, 'pali', quote);
    assert.equal(r.verdict, 'found', `${quote} → ${r.verdict} ${JSON.stringify(r.matches[0])}`);
    const hit = r.matches.find((m) => m.text_id === expected);
    assert.ok(hit, `${quote}: expected ${expected} among ${r.matches.map((m) => m.text_id)}`);
    assert.ok(hit.similarity >= 0.82);
    assert.equal(canon.resolve(hit.text_id).unit.id, hit.text_id);
    assert.ok(hit.segment_ref?.startsWith(`${hit.text_id}/`), hit.segment_ref);
    assert.match(r.scope.searched, /whole Pāli Tipiṭaka/);
  }
});

test('passages copied from the bundled text are found at their own text', async () => {
  for (const ref of BUNDLED_GENUINE) {
    const quote = bundledPassage(ref);
    const r = await verifyQuote({ text: quote, language: 'pali' });
    assert.equal(r.verdict, 'found', `${ref}: ${quote}`);
    const unit = canon.resolve(ref).unit;
    assert.ok(r.matches.some((m) => m.text_id === unit.id && m.similarity >= 0.95), `${ref}: ${r.matches.map((m) => m.text_id)}`);
  }
});

test('genuine English quotations are found in the translation that has them', async () => {
  for (const [quote, ref] of ENGLISH_GENUINE) {
    const r = await english(quote);
    assert.equal(r.verdict, 'found', `${quote} → ${JSON.stringify(r.matches[0])}`);
    assert.equal(r.matches[0].text_id, canon.resolve(ref).unit.id);
    assert.equal(r.matches[0].translator, 'Ṭhānissaro Bhikkhu');
    assert.match(r.matches[0].license, /CC BY-NC/);
    assert.match(r.matches[0].url, /^https:\/\/www\.dhammatalks\.org\//);
  }
});

// ---- 20 well-known misattributions -------------------------------------------

const MISATTRIBUTED = [
  'Holding on to anger is like grasping a hot coal with the intent of throwing it at someone else; you are the one who gets burned.',
  'Peace comes from within. Do not seek it without.',
  'Believe nothing, no matter where you read it, or who said it, no matter if I have said it, unless it agrees with your own reason and your own common sense.',
  'The mind is everything. What you think you become.',
  'Three things cannot be long hidden: the sun, the moon, and the truth.',
  'Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.',
  'Thousands of candles can be lighted from a single candle, and the life of the candle will not be shortened. Happiness never decreases by being shared.',
  'You yourself, as much as anybody in the entire universe, deserve your love and affection.',
  'There is no path to happiness: happiness is the path.',
  'In the end, only three things matter: how much you loved, how gently you lived, and how gracefully you let go of things not meant for you.',
  'Every morning we are born again. What we do today is what matters most.',
  'If you light a lamp for somebody, it will also brighten your path.',
  'The trouble is, you think you have time.',
  'What you are is what you have been. What you will be is what you do now.',
  'Pain is certain, suffering is optional.',
  'You will not be punished for your anger, you will be punished by your anger.',
  'To understand everything is to forgive everything.',
  'Nothing is forever except change.',
  'When you realize how perfect everything is you will tilt your head back and laugh at the sky.',
  'Your work is to discover your world and then with all your heart give yourself to it.',
];

test('known misattributions are not found, and the scope searched is stated', async () => {
  assert.equal(MISATTRIBUTED.length, 20);
  for (const quote of MISATTRIBUTED) {
    const r = await english(quote);
    assert.equal(r.language, 'english');
    assert.equal(r.verdict, 'not_found_in_scope', `${quote} → ${r.best_similarity} ${JSON.stringify(r.matches[0])}`);
    assert.equal(r.scope.translations_checked.length, fixture.pages.length);
    assert.match(r.scope.searched, /English translations linked to/);
    assert.match(r.explanation, /translation searched has this wording/);
    assert.match(r.next_step, /language "pali"/);
    assert.doesNotMatch(JSON.stringify(r), /not by the Buddha|did not say|didn't say|never said|fake/i);
  }
});

test('auto-detection picks English for misattributions and Pāli for Pāli', () => {
  for (const q of MISATTRIBUTED) assert.equal(detectLanguage(q), 'english', q);
  for (const [q] of ENGLISH_GENUINE) assert.equal(detectLanguage(q), 'english', q);
  for (const [q] of PALI_GENUINE) assert.equal(detectLanguage(q), 'pali', q);
  for (const ref of BUNDLED_GENUINE) assert.equal(detectLanguage(plain(bundledPassage(ref))), 'pali', ref);
});

test('a reworded quotation is a close paraphrase, not a match', async () => {
  // A fixture passage with every fourth word replaced.
  const reworded = fixtureSpan('dhp1-20', 33, 39).split(' ').map((w, i) => (i % 4 === 3 ? 'indeed' : w)).join(' ');
  const r = await english(reworded);
  assert.equal(r.verdict, 'close_paraphrase', `${r.best_similarity}`);
  assert.equal(r.matches[0].text_id, 'dhp1-20');
});

test('a popular wording that is in no translation searched points to the Pāli check, not to a misattribution', async () => {
  // A widely shared older rendering of Dhp 5, as people quote it. It is the input under test (a quotation as
  // circulated), not a source text: the verse itself is taken from the bundle below.
  const popular = 'Hatred does not cease by hatred, but only by love; this is the eternal rule.';
  const r = await english(popular);
  assert.equal(r.verdict, 'not_found_in_scope');
  assert.match(r.explanation, /not a finding about the saying itself/);
  assert.match(r.explanation, /older or freer translations/);
  assert.match(r.next_step, /language "pali"/);
  assert.match(r.scope.note, /check the Pāli/);
  assert.doesNotMatch(JSON.stringify(r), /misattribut|not by the Buddha|did not say|never said|fake/i);
  // The Pāli check the result points to finds the verse, with its citation.
  const pali = await verifyQuote({ text: plain(bundledPassage('Dhp 5', 12, 0, 0)) });
  assert.equal(pali.verdict, 'found');
  assert.ok(pali.matches.some((m) => m.text_id === canon.resolve('Dhp 5').unit.id));
});

test('stock passages report how many texts match equally, instead of one arbitrary source', async () => {
  // The opening formula of MN 38, folded: it opens hundreds of suttas.
  const stock = await verifyQuote({ text: plain(bundledPassage('MN 38', 8, 0, 0)) });
  assert.equal(stock.verdict, 'found');
  assert.ok(stock.equally_similar_texts >= 100, `${stock.equally_similar_texts}`);
  assert.equal(stock.equally_similar_at_least, true);
  assert.match(stock.citation_note, /at least \d+ texts equally well/);
  assert.match(stock.citation_note, /not a unique source/);
  // A verse repeated word for word in another text (Dhp 21 in the Nettippakaraṇa): the tie is stated.
  const verse = await verifyQuote({ text: bundledPassage('Dhp 21', 20, 0, 0) });
  assert.ok(verse.equally_similar_texts >= 2, `${verse.equally_similar_texts}`);
  assert.ok(verse.matches.some((m) => m.text_id === 'dhp21'));
  for (const m of verse.matches) assert.equal(canon.resolve(m.text_id).unit.id, m.text_id);
  // A passage found in one text only carries no tie note.
  const unique = await verifyQuote({ text: plain(bundledPassage('Ud 1.10', 12, 0, 'longest')), language: 'pali' });
  assert.equal(unique.verdict, 'found');
  assert.equal(unique.equally_similar_texts, undefined);
});

test('English scope: default is the Dhammapada, one page per translator; untranslated texts are listed', () => {
  const def = englishScope();
  assert.match(def.label, /Dhammapada/);
  assert.ok(def.pages.length >= 26 && def.pages.length <= 60, `${def.pages.length}`);
  assert.equal(new Set(def.pages.map((p) => p.url)).size, def.pages.length);
  for (const p of def.pages) assert.equal(canon.resolve(p.unit.id).unit.id, p.unit.id);
  const vin = englishScope(['Pj 1', 'AN 3.65']);
  assert.deepEqual(vin.withoutEnglish, [canon.resolve('Pj 1').unit.acronym]);
  assert.ok(vin.pages.every((p) => p.unit.id === 'an3.65'));
  assert.throws(() => englishScope(['Not a text 999']));
});

test('pages that cannot be fetched are reported, never silently dropped', async () => {
  const r = await verifyQuote({ text: fixtureVerse('dhp221-234', '223'), language: 'english', texts: ['AN 3.65', 'Pj 1'] }, { fetchTranslation: fromFixture });
  assert.ok(r.scope.translations_checked.length >= 1);
  assert.ok(r.scope.not_retrieved?.every((p) => /not in the offline fixture/.test(p.error)));
  assert.deepEqual(r.scope.no_english_linked, [canon.resolve('Pj 1').unit.acronym]);
  await assert.rejects(verifyQuote({ text: 'some words here', language: 'english', texts: ['AN 3.65'] }, { fetchTranslation: async () => { throw new Error('offline'); } }), /could be retrieved/);
});

test('similarity measure', () => {
  assert.equal(similarity('abc def', 'abc def'), 1);
  assert.equal(similarity('abc', 'xyz'), 0);
  const words = plain(bundledPassage('Dhp 1', 2, 0, 0));
  assert.ok(similarity(words, misspell(words)) > 0.8);
});

test('live: a genuine quote is found on dhammatalks.org (skipped offline)', async (t) => {
  if (process.env.PALI_CANON_OFFLINE) return t.skip('PALI_CANON_OFFLINE is set');
  try {
    const res = await fetch('https://www.dhammatalks.org/suttas/KN/Dhp/Ch17.html', { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return t.skip(`dhammatalks.org answered ${res.status}`);
  } catch { return t.skip('network unavailable'); }
  const r = await verifyQuote({ text: fixtureVerse('dhp221-234', '223'), texts: ['Dhp 223'] });
  if (!r.scope.translations_checked.length) return t.skip('translation pages unavailable');
  assert.equal(r.verdict, 'found');
  assert.equal(r.matches[0].text_id, 'dhp221-234');
});
