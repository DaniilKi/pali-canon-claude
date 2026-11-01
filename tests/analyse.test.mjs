// analyse_passage (#22) and the offline lookup_pali fallback (#23), both from the bundled DPD subset.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Simulate a dpdict.net outage for the lookup_pali fallback test; http.mjs reads this when first imported.
process.env.PALI_CANON_SIMULATE_OUTAGE = 'www.dpdict.net,dpdict.net';
const canon = await import('../src/canon.mjs');
const analyse = await import('../src/analyse.mjs');
const providers = await import('../src/providers.mjs');
const { analysePassage, analyseToken, wordParts, tokenize, lookupOffline, loadDpd, DPD_PIN, register } = analyse;

const licensed = (r) => {
  assert.equal(r.license.name, 'CC BY-NC-SA 4.0');
  assert.match(r.license.url, /creativecommons\.org\/licenses\/by-nc-sa\/4\.0/);
  assert.match(r.attribution, /Digital Pāḷi Dictionary by Bodhirasa Bhikkhu/);
  assert.equal(r.dictionary.version, DPD_PIN.version);
};

test('bundled DPD subset is pinned to a release with checksums and its licence', () => {
  const { source, forms, headwords, roots } = loadDpd();
  assert.equal(source.version, DPD_PIN.version);
  assert.equal(source.asset_sha256, DPD_PIN.asset_sha256);
  assert.match(source.asset_sha256, /^[0-9a-f]{64}$/);
  assert.match(source.db_sha256, /^[0-9a-f]{64}$/);
  assert.match(source.asset, /^https:\/\/github\.com\/digitalpalidictionary\/dpd-db\/releases\/download\/v[\d.]+\/dpd\.db\.tar\.xz$/);
  assert.equal(source.license, 'CC BY-NC-SA 4.0');
  assert.equal(source.canon_commit, canon.source().commit);
  assert.ok(headwords.size > 80000, 'all headwords');
  assert.ok(Object.keys(roots).length > 700, 'all roots');
  assert.ok(Object.keys(forms).length > 150000, 'canon word forms');
});

test('MN 10 opening: surface, headword, grammar, root and meaning per word', () => {
  const r = analysePassage({ uid: 'MN 10', segment: 'mn10/2' });
  licensed(r);
  assert.equal(r.text_id, 'mn10');
  assert.equal(r.segment.ref, 'mn10/2');
  assert.match(r.segment.text, /^Evaṃ me sutaṃ/);
  assert.match(r.text_attribution, /Vipassana Research Institute|VRI/i);
  const byForm = (f) => r.words.find((w) => (w.form ?? w.surface.toLowerCase()) === f);
  const evam = byForm('evaṃ');
  assert.equal(evam.status, 'found');
  assert.equal(evam.analyses[0].headword, 'evaṃ');
  assert.match(evam.analyses[0].meanings[0].meaning, /thus/);
  const sutam = byForm('sutaṃ');
  const suta = sutam.analyses.find((a) => a.headword === 'suta');
  assert.ok(suta.grammar.includes('pp nt nom sg'));
  assert.equal(suta.root.root, '√su 1');
  assert.equal(suta.root.meaning, 'hear');
  const me = byForm('me');
  assert.ok(me.analyses.some((a) => a.headword === 'ahaṃ' && a.grammar.includes('pron 1st gen sg')), 'every parse is listed');
  const bhagava = byForm('bhagavā');
  assert.ok(bhagava.analyses.some((a) => a.headword === 'bhagavant' && a.grammar.includes('noun masc nom sg')));
  // "bhikkhavo’’ti" is two words: bhikkhavo + the quotation particle ti.
  const quoted = r.words.filter((w) => w.surface === 'bhikkhavo’’ti').map((w) => w.form);
  assert.deepEqual(quoted, ['bhikkhavo', 'ti']);
  assert.equal(r.words.filter((w) => w.status === 'unknown').length, 0);
  assert.match(r.guidance, /not a translation/);
});

test('quotation sandhi is undone only where DPD knows the result', () => {
  assert.deepEqual(wordParts('abhinandu’’nti').map((p) => p.form), ['abhinanduṃ', 'ti']);
  assert.match(wordParts('abhinandu’’nti')[0].note, /ṃ/);
  assert.deepEqual(wordParts('hotī’’ti').map((p) => p.form), ['hoti', 'ti']);
  assert.deepEqual(wordParts('Bhadante’’ti').map((p) => p.form), ['bhadante', 'ti']);
  assert.deepEqual(tokenize('‘‘Bhadante’’ti te bhikkhū – etadavoca.'), ['Bhadante’’ti', 'te', 'bhikkhū', 'etadavoca']);
});

test('homonyms are kept apart: each grammar tag is paired only with senses of its own part of speech', () => {
  const { headwords } = loadDpd();
  const posOf = new Map([...headwords.values()].map((h) => [h.lemma, h.pos]));
  const fits = (label, pos) => {
    const [cls, gender] = label.split(' ');
    if (label.includes(',')) return true; // DPD headword grammar of an uninflected sense ("ind, conj")
    if (cls === 'noun') return ['masc', 'nt', 'fem'].includes(pos) && (!['masc', 'nt', 'fem'].includes(gender) || gender === pos);
    if (cls === 'verb') return ['pr', 'aor', 'imp', 'opt', 'fut', 'cond', 'imperf', 'perf'].includes(pos);
    return cls === pos;
  };
  const check = (form) => {
    const { analyses } = analyseToken(form)[0];
    for (const a of analyses) {
      for (const m of a.meanings) assert.equal(posOf.get(m.lemma), a.pos, `${form}: ${m.lemma} listed under ${a.headword} (${a.pos})`);
      for (const g of a.grammar) if (a.meanings.length) assert.ok(fits(g, a.pos), `${form}: "${g}" paired with ${a.pos} senses`);
    }
    return analyses;
  };
  // ca: the conjunction ("and") is indeclinable; the vocative belongs to the letter ca.
  const ca = check('ca');
  const caInd = ca.find((a) => a.pos === 'ind');
  assert.match(caInd.meanings[0].meaning, /^and/);
  assert.ok(caInd.grammar.every((g) => !/voc/.test(g)), 'no case on the indeclinable');
  const caLetter = ca.find((a) => a.pos === 'letter');
  assert.deepEqual(caLetter.grammar, ['letter masc voc sg']);
  assert.match(caLetter.meanings[0].meaning, /letter c/);
  // nāma: "certainly; truly" (ind) is not a vocative noun; "name" (nt) is.
  const nama = check('nāma');
  assert.match(nama.find((a) => a.pos === 'ind').meanings[0].meaning, /certainly/);
  const namaNt = nama.find((a) => a.pos === 'nt');
  assert.deepEqual(namaNt.grammar, ['noun nt voc sg']);
  assert.ok(namaNt.meanings.some((m) => m.meaning === 'name'));
  assert.ok(nama.find((a) => a.pos === 'adj').grammar.includes('adj masc voc sg'));
  // so: "that" (ta, pron) and "own" (sa, pron) are separate from the letter sa.
  const so = check('so');
  const ta = so.find((a) => a.headword === 'ta');
  assert.deepEqual(ta.grammar, ['pron masc nom sg']);
  assert.equal(ta.meanings[0].meaning, 'that');
  const saLetter = so.find((a) => a.headword === 'sa' && a.pos === 'letter');
  assert.deepEqual(saLetter.grammar, ['letter masc nom sg']);
  assert.match(saLetter.meanings[0].meaning, /letter s/);
  assert.ok(so.filter((a) => a.headword === 'sa' && a.pos === 'pron').every((a) => !a.grammar.some((g) => g.startsWith('letter'))));
  // tato and ka: no letter or vocative grammar next to "that" or "who?".
  assert.ok(check('tato').filter((a) => a.meanings.some((m) => m.meaning === 'that')).every((a) => a.grammar.every((g) => g.startsWith('pron'))));
  const ka = check('ka');
  assert.ok(ka.filter((a) => a.meanings.some((m) => /who\?/.test(m.meaning))).every((a) => a.grammar.every((g) => !/voc/.test(g))));
  // A broad sample: the same invariant over the first words of MN 1.
  for (const w of analysePassage({ uid: 'MN 1', segment: 3, limit: 80 }).words) if (w.status === 'found') check(w.form ?? w.surface.toLowerCase());
});

test('sandhi rules apply only where DPD has the result and the ti that triggers them', () => {
  // -’’nti is read as -ṃ ti only when DPD has the -ṃ form; otherwise the text is left as written.
  assert.deepEqual(wordParts('pācattiya’’nti').map((p) => p.form), ['pācattiya', 'nti']);
  assert.deepEqual(wordParts('āyāmaha’’nti').map((p) => p.form), ['āyāmaha', 'nti']);
  assert.ok(wordParts('pācattiya’’nti').every((p) => !p.note));
  // A long final vowel is shortened only right before ti.
  assert.deepEqual(wordParts('hotī').map((p) => p.form), ['hotī']);
  assert.deepEqual(wordParts('anā').map((p) => p.form), ['anā']);
  assert.deepEqual(wordParts('dukkaṭassā').map((p) => p.form), ['dukkaṭassā']);
  assert.deepEqual(wordParts('paṭibhāseyyā’’si').map((p) => p.form), ['paṭibhāseyyā', 'si']);
  const [hoti] = wordParts('hotī’’ti');
  assert.equal(hoti.form, 'hoti');
  assert.match(hoti.note, /before ti/);
});

test('compound and sandhi splits come from the DPD deconstructor with glossed components', () => {
  const [w] = analyseToken('atthipaccayena');
  assert.equal(w.status, 'split-only');
  assert.equal(w.split, 'atthi + paccayena');
  assert.deepEqual(w.components.map((c) => c.form), ['atthi', 'paccayena']);
  assert.ok(w.components.every((c) => c.headword && c.meaning));
  assert.ok(w.other_splits.length >= 1, 'alternative splits are not hidden');
});

test('a word DPD does not know is reported as unknown, never guessed', () => {
  const [w] = analyseToken('qqqxyz');
  assert.equal(w.status, 'unknown');
  assert.deepEqual(w.analyses, []);
  assert.match(w.message, /no analysis is guessed/);
});

test('segment selection by ref, number and VRI paragraph; paging; errors', () => {
  const a = analysePassage({ uid: 'MN 10', segment: 2, limit: 5 });
  const b = analysePassage({ uid: 'mn10', paragraph: 105, limit: 5 });
  assert.equal(a.segment.ref, 'mn10/2');
  assert.equal(b.segment.ref, 'mn10/2');
  assert.equal(a.returned_tokens, 5);
  assert.equal(a.next_offset, 5);
  const next = analysePassage({ uid: 'MN 10', segment: 2, offset: 5, limit: 5 });
  assert.equal(next.words[0].surface, 'bhagavā');
  const first = analysePassage({ uid: 'Dhp 1' });
  assert.notEqual(first.segment.type, 'heading');
  assert.ok(first.notes.some((n) => /No segment given/.test(n)));
  assert.throws(() => analysePassage({ uid: 'MN 10', segment: 'mn11/2' }), /belongs to mn11/);
  assert.throws(() => analysePassage({ uid: 'MN 10', segment: 9999 }), /segments/);
  assert.throws(() => analysePassage({ uid: 'MN 10', paragraph: 99999 }), /no VRI paragraph/);
});

test('any segment of any text: a sample across the whole canon is analysed', () => {
  const units = canon.load().canon.units.filter((u, i) => u.kind !== 'range' && i % 97 === 0);
  assert.ok(units.length > 50);
  let words = 0;
  let unknown = 0;
  for (const u of units) {
    const segs = canon.segments(u);
    const seg = segs[Math.floor(segs.length / 2)];
    const r = analysePassage({ uid: u.id, segment: seg.ref, limit: 200 });
    licensed(r);
    words += r.words.length;
    unknown += r.words.filter((w) => w.status === 'unknown').length;
  }
  assert.ok(words > 1000);
  assert.ok(unknown / words < 0.02, `${unknown} of ${words} words unknown`);
});

test('offline lookup: inflected form, headword and headword without diacritics', () => {
  const metta = lookupOffline({ word: 'metta' });
  licensed(metta);
  assert.equal(metta.offline, true);
  assert.ok(metta.entries.some((e) => /^mettā: fem\. goodwill/.test(e)));
  const folded = lookupOffline({ word: 'satipatthana' });
  assert.equal(folded.matched, 'headword without diacritics');
  assert.ok(folded.entries.some((e) => /^satipaṭṭhāna 1:/.test(e)));
  const inflected = lookupOffline({ word: 'bhikkhūnaṃ' });
  assert.ok(inflected.entries.some((e) => /^bhikkhu: .*this form: noun masc dat pl/.test(e)));
  assert.equal(lookupOffline({ word: 'qqqxyz' }), null);
  // No inflection-table noise in the offline excerpt either.
  assert.doesNotMatch(metta.detail_excerpt, /declension|conjugation|Did you spot a mistake/i);
});

test('#23 lookup_pali falls back to the bundled DPD subset when dpdict.net is down, labelled', async () => {
  const r = await providers.lookupPali({ word: 'dhammo', limit: 3 });
  assert.equal(r.offline, true);
  assert.match(r.note, /dpdict\.net is unreachable right now/);
  assert.match(r.note, /bundled offline DPD subset/);
  assert.equal(r.entries.length, 3);
  assert.ok(r.omitted > 0);
  licensed(r);
  await assert.rejects(providers.lookupPali({ word: 'qqqxyz' }), /not in the bundled offline subset/);
});

test('list_sources records the bundled DPD release', () => {
  const dpd = providers.listSources().sources.find((s) => s.id === 'dpd');
  assert.equal(dpd.bundled.version, DPD_PIN.version);
  assert.equal(dpd.bundled.asset_sha256, DPD_PIN.asset_sha256);
});

test('register() adds analyse_passage as a local (offline) tool', async () => {
  const { z } = await import('zod');
  const tools = [];
  register({ tool: (name, description, schema, fn, opts) => tools.push({ name, description, schema, fn, opts }), z });
  assert.deepEqual(tools.map((t) => t.name), ['analyse_passage']);
  const [t] = tools;
  assert.equal(t.opts?.network ?? false, false);
  assert.match(t.description, /CC BY-NC-SA 4\.0/);
  const parsed = z.object(t.schema).parse({ uid: 'MN 10', segment: 'mn10/2' });
  assert.equal(parsed.limit, 60);
  const r = await t.fn(parsed);
  assert.equal(r.segment.ref, 'mn10/2');
});
