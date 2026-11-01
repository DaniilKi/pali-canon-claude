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

/** A passage copied from the bundled text itself: words `from`..`from+count` of a text's longest segment. */
function bundledPassage(ref, count = 14, from = 0) {
  const unit = canon.resolve(ref).unit;
  const seg = canon.segments(unit).filter((s) => s.type !== 'heading').sort((a, b) => b.text.length - a.text.length)[0];
  return seg.text.split(/\s+/).slice(from, from + count).join(' ');
}

// ---- 20 genuine quotations --------------------------------------------------

const PALI_GENUINE = [
  // [quotation as people write it (often without diacritics), a text that must be among the matches]
  ['Manopubbaṅgamā dhammā, manoseṭṭhā manomayā; manasā ce paduṭṭhena, bhāsati vā karoti vā', 'Dhp 1'],
  ['Na hi verena verani sammantidha kudacanam, averena ca sammanti, esa dhammo sanantano', 'Dhp 5'],
  ['Sabbapāpassa akaraṇaṃ, kusalassa upasampadā; sacittapariyodapanaṃ, etaṃ buddhāna sāsanaṃ', 'Dhp 183'],
  ['atta hi attano natho, ko hi natho paro siya', 'Dhp 160'],
  ['vayadhamma sankhara, appamadena sampadetha', 'DN 16'],
  ['Dveme, bhikkhave, antā pabbajitena na sevitabbā', 'SN 56.11'],
  ['Ekāyano ayaṃ, bhikkhave, maggo sattānaṃ visuddhiyā', 'MN 10'],
  ['Mata yatha niyam puttam ayusa ekaputtamanurakkhe', 'Snp 1.8'],
  ['ma anussavena, ma paramparaya, ma itikiraya, ma pitakasampadanena', 'AN 3.65'],
  ['diṭṭhe diṭṭhamattaṃ bhavissati, sute sutamattaṃ bhavissati', 'Ud 1.10'],
  ['Sabbe sankhara aniccati, yada pannaya passati', 'Dhp 277'],
  // Slightly misspelt (dropped letters, ṃ/m, v/b): still the same passage.
  ['Manopubangama dhamma manosetha manomaya', 'Dhp 1'],
];
const BUNDLED_GENUINE = ['SN 22.59', 'MN 21', 'Iti 27', 'Thig 5.4'];
const ENGLISH_GENUINE = [
  ['Conquer anger with lack of anger; bad with good; stinginess with a gift; a liar with truth.', 'Dhp 221-234'],
  ['Hostilities aren’t stilled through hostility, regardless. Hostilities are stilled through non-hostility: this, an unending truth.', 'Dhp 1-20'],
  ['When you see with discernment, all fabrications are inconstant, you grow disenchanted with stress. This is the path to purity.', 'Dhp 273-289'],
  ['As a mother would risk her life to protect her child, her only child, even so should one cultivate the heart limitlessly with regard to all beings.', 'Snp 1.8'],
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
    assert.match(r.explanation, /texts searched/);
    assert.doesNotMatch(JSON.stringify(r), /not by the Buddha|did not say|didn't say|never said|fake/i);
  }
});

test('auto-detection picks English for misattributions and Pāli for Pāli', () => {
  for (const q of MISATTRIBUTED) assert.equal(detectLanguage(q), 'english', q);
  for (const [q] of PALI_GENUINE) assert.equal(detectLanguage(q), 'pali', q);
});

test('a reworded quotation is a close paraphrase, not a match', async () => {
  const r = await english('Conquer anger with non-anger; conquer bad with good; conquer the stingy with a gift.');
  assert.equal(r.verdict, 'close_paraphrase', `${r.best_similarity}`);
  assert.equal(r.matches[0].text_id, 'dhp221-234');
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
  const r = await verifyQuote({ text: 'Conquer anger with lack of anger', language: 'english', texts: ['AN 3.65', 'Pj 1'] }, { fetchTranslation: fromFixture });
  assert.ok(r.scope.translations_checked.length >= 1);
  assert.ok(r.scope.not_retrieved?.every((p) => /not in the offline fixture/.test(p.error)));
  assert.deepEqual(r.scope.no_english_linked, [canon.resolve('Pj 1').unit.acronym]);
  await assert.rejects(verifyQuote({ text: 'some words here', language: 'english', texts: ['AN 3.65'] }, { fetchTranslation: async () => { throw new Error('offline'); } }), /could be retrieved/);
});

test('similarity measure', () => {
  assert.equal(similarity('abc def', 'abc def'), 1);
  assert.equal(similarity('abc', 'xyz'), 0);
  assert.ok(similarity('manopubbangama dhamma', 'manopubangama dhamma') > 0.8);
});

test('live: a genuine quote is found on dhammatalks.org (skipped offline)', async (t) => {
  if (process.env.PALI_CANON_OFFLINE) return t.skip('PALI_CANON_OFFLINE is set');
  try {
    const res = await fetch('https://www.dhammatalks.org/suttas/KN/Dhp/Ch17.html', { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return t.skip(`dhammatalks.org answered ${res.status}`);
  } catch { return t.skip('network unavailable'); }
  const r = await verifyQuote({ text: 'Conquer anger with lack of anger; bad with good; stinginess with a gift; a liar with truth.', texts: ['Dhp 223'] });
  if (!r.scope.translations_checked.length) return t.skip('translation pages unavailable');
  assert.equal(r.verdict, 'found');
  assert.equal(r.matches[0].text_id, 'dhp221-234');
});
