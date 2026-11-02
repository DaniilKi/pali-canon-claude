// English-keyboard input and English keyword search (#102): the shared normaliser, spelling variants, sutta names in
// resolve_reference, lookup_pali without diacritics and the English → Pāli glossary, through the MCP protocol.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// lookup_pali must answer offline here: simulate a dpdict.net outage (http.mjs reads this when first imported).
process.env.PALI_CANON_SIMULATE_OUTAGE = 'www.dpdict.net,dpdict.net';
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
const { createServer, TOOL_TITLES } = await import('../src/server.mjs');
const input = await import('../src/input.mjs');
const names = await import('../src/sutta-names.mjs');
const glossaryMod = await import('../src/glossary.mjs');
const { loadGlossary } = await import('../src/glossary-data.mjs');
const { DPD_PIN } = await import('../src/analyse.mjs');

let client;
before(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'english-input-test', version: '1.0.0' });
  await Promise.all([createServer().connect(serverSide), client.connect(clientSide)]);
});
after(async () => { await client?.close(); });

const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  return { error: !!r.isError, body: JSON.parse(r.content[0].text) };
};
const ok = async (name, args) => {
  const r = await call(name, args);
  assert.equal(r.error, false, `${name} ${JSON.stringify(args)}: ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body;
};

// ---- the normaliser ------------------------------------------------------------------------------------------

test('Velthuis table: every sequence of emacs-pali-velthuis (Unlicense) and the alternates', () => {
  // Fixture: the quail rules of matko/emacs-pali-velthuis, pali-velthuis.el.
  const quail = [['AA', 'Ā'], ['aa', 'ā'], ['II', 'Ī'], ['ii', 'ī'], ['UU', 'Ū'], ['uu', 'ū'], ['"N', 'Ṅ'], ['"n', 'ṅ'],
    ['.M', 'Ṃ'], ['.m', 'ṃ'], ['~N', 'Ñ'], ['~n', 'ñ'], ['.T', 'Ṭ'], ['.t', 'ṭ'], ['.D', 'Ḍ'], ['.d', 'ḍ'], ['.N', 'Ṇ'],
    ['.n', 'ṇ'], ['.L', 'Ḷ'], ['.l', 'ḷ']];
  for (const [from, to] of quail) assert.equal(input.fromVelthuis(from), to, from);
  assert.equal(input.fromVelthuis('.h'), 'ḥ');
  for (const [typed, want] of [['sa.myutta', 'saṃyutta'], ['pa~n~naa', 'paññā'], ['sa"ngha', 'saṅgha'], ['sam..yutta', 'saṃyutta'],
    ['pa,,n,,naa', 'paññā'], ['sa.mn..gha', 'saṃṅgha'], ['Mahaasatipa.t.thaana', 'Mahāsatipaṭṭhāna'], ['nibbaana.m', 'nibbānaṃ']]) {
    const n = input.normalizeInput(typed);
    assert.equal(n.text, want, typed);
    assert.equal(n.scheme, 'velthuis');
    assert.equal(n.changes[0].rule, 'velthuis');
  }
});

test('Harvard-Kyoto, doubled vowels, anglicised spellings, ṁ = ṃ, NFD and aliases are read and labelled', () => {
  const cases = [
    ['saMyutta', 'saṃyutta', 'harvard-kyoto'], ['nibbAna', 'nibbāna', 'harvard-kyoto'],
    ['nibbaana', 'nibbāna', 'doubled vowels'], ['sanyutta', 'saṃyutta', 'anglicised'], ['nyana', 'ñana', 'anglicised'],
    ['nirvana', 'nibbāna', 'alias'], ['dharma', 'dhamma', 'alias'],
  ];
  for (const [typed, want, rule] of cases) {
    const n = input.normalizeInput(typed);
    assert.equal(n.text, want, typed);
    assert.equal(n.changes[0].rule, rule, typed);
    assert.ok(input.normalizationNote(n).note.includes(typed));
  }
  assert.equal(input.normalizeInput('saṁyutta').text, 'saṃyutta');
  assert.equal(input.normalizeInput('saṁyutta').changed, false, 'ṁ → ṃ is not an inference');
  assert.equal(input.normalizeInput('nibbāna').text, 'nibbāna', 'NFD → NFC');
  assert.equal(input.normalizeInput('alias karma').changes.find((c) => c.rule === 'alias').label, 'Sanskrit or English loan form of the Pāli word');
});

test('ordinary English and citations are not mangled; an all-caps word is not Harvard-Kyoto', () => {
  for (const s of ['MN 10', 'SN 56.11', 'SN 56:11', 'M i 55', 'Dhp 183', 'Snp 1.8', 'AN 3.65', 'Thai MN 1.103', 'DPD', 'MN', 'NASA',
    'mindfulness of breathing', 'The skiing bazaar, a vacuum and an aardvark.', 'McDonald LinkedIn iPhone JavaScript', 'e.g. a.m. i.e.',
    'https://www.dhammatalks.org/suttas/MN/MN10.html', 'suffering', 'Samyutta Nikaya 56.11']) {
    const n = input.normalizeInput(s);
    assert.equal(n.text, s, s);
    assert.equal(n.changed, false, s);
  }
});

test('fuzzy key and spelling variants follow DPD\'s English key (aspirates, doubled consonants, ny/ñ, ṃ/n)', () => {
  assert.equal(input.fuzzyKey('saṃyutta'), input.fuzzyKey('sanyutta'));
  assert.equal(input.fuzzyKey('ñāṇa'), input.fuzzyKey('nyana'));
  assert.equal(input.fuzzyKey('satipaṭṭhāna'), input.fuzzyKey('satipatana'));
  assert.ok(input.spellingVariants('anapanasati').includes('anapanassati'));
  assert.ok(input.spellingVariants('satipatana').includes('satipatthana'));
});

// ---- search_texts --------------------------------------------------------------------------------------------

test('search_texts: samyutta and nibbana already match by folding; sanyutta, sa.myutta and saMyutta are normalised and labelled', async () => {
  const plain = await ok('search_texts', { query: 'samyutta', limit: 2 });
  assert.ok(plain.total_texts_matched > 0);
  assert.equal(plain.input_normalised, undefined);
  assert.ok((await ok('search_texts', { query: 'nibbana', limit: 2 })).total_texts_matched > 0);
  for (const q of ['sanyutta', 'sa.myutta', 'saMyutta']) {
    const r = await ok('search_texts', { query: q, limit: 2 });
    assert.equal(r.total_texts_matched, plain.total_texts_matched, q);
    assert.equal(r.input_normalised.read_as, 'saṃyutta', q);
    assert.equal(r.input_normalised.original, q);
  }
});

test('search_texts: nyana finds ñāṇa, labelled', async () => {
  const r = await ok('search_texts', { query: 'nyana', limit: 3 });
  assert.ok(r.total_texts_matched > 100);
  assert.equal(r.input_normalised.read_as, 'ñana');
  assert.ok(r.results.some((h) => /ñāṇ/i.test(h.excerpt)));
});

test('search_texts: a rare spelling is widened to the canon\'s spellings, labelled spelling_note', async () => {
  const r = await ok('search_texts', { query: 'anapanasati', limit: 3 });
  assert.ok(r.total_texts_matched > r.exact_search.total_texts_matched);
  assert.match(r.spelling_note, /No exact match for "anapanasati"/);
  assert.match(r.spelling_note, /ānāpānassati/);
  // A common word is never widened.
  assert.equal((await ok('search_texts', { query: 'satipatthana', limit: 2 })).spelling_note, undefined);
});

test('search_texts: English concepts are expanded into Pāli from the glossary, labelled with the source', async () => {
  const breathing = await ok('search_texts', { query: 'mindfulness of breathing', limit: 5 });
  assert.ok(breathing.total_texts_matched > 0);
  const e = breathing.expanded_from_english;
  assert.deepEqual(e.mindfulness, ['sati']);
  assert.ok(e.breathing.includes('assāsapassāsa'));
  assert.equal(e.source, 'DPD English index');
  assert.match(e.note, /not translations/);
  assert.ok(breathing.title_matches.some((t) => t.id === 'mn118'), 'MN 118 by its English title "Mindfulness of Breathing"');
  const suffering = await ok('search_texts', { query: 'suffering', limit: 3 });
  assert.ok(suffering.total_texts_matched > 100);
  assert.equal(suffering.expanded_from_english.suffering[0], 'dukkha');
  assert.ok(suffering.expanded_from_english.dropped_terms > 0, 'the cap is stated');
  assert.match(suffering.expanded_from_english.dropped_note, /not searched/);
});

test('search_texts english: "off" never expands, "only" always does, Pāli queries are not expanded', async () => {
  const off = await ok('search_texts', { query: 'suffering', english: 'off', limit: 2 });
  assert.equal(off.expanded_from_english, undefined);
  assert.equal(off.total_texts_matched, 0);
  const only = await ok('search_texts', { query: 'craving', english: 'only', limit: 2 });
  assert.ok(only.expanded_from_english.craving.includes('taṇhā'));
  const pali = await ok('search_texts', { query: 'dukkha', limit: 2 });
  assert.equal(pali.expanded_from_english, undefined);
  assert.equal(glossaryMod.looksEnglish('sati'), false);
  assert.equal(glossaryMod.looksEnglish('the noble path'), true);
});

// ---- resolve_reference ---------------------------------------------------------------------------------------

test('resolve_reference: sutta names resolve, labelled matched_by: name', async () => {
  for (const [name, id] of [['Satipatthana Sutta', 'mn10'], ['anapanasati sutta', 'mn118'], ['Dhammacakkappavattana', 'sn56.11'],
    ['Dhammacakkappavattana Sutta', 'sn56.11'], ['Mindfulness of Breathing', 'mn118'], ['Ānāpānassatisuttaṃ', 'mn118'],
    ['Brahmajala sutta', 'dn1'], ['Mahaasatipa.t.thaana sutta', null]]) {
    const r = await call('resolve_reference', { reference: name });
    if (id === null) { assert.equal(r.error, true, 'DN 22 and MN 10 both carry this name (DPD): candidates are listed'); assert.match(r.body.error, /DN 22/); assert.match(r.body.error, /MN 10/); continue; }
    assert.equal(r.error, false, `${name}: ${JSON.stringify(r.body)}`);
    assert.equal(r.body.id, id, name);
    assert.equal(r.body.matched_by, 'name');
    assert.ok(r.body.name_match.matched_name);
    assert.ok(r.body.notes.some((n) => /Resolved by name/.test(n)));
  }
  const sati = await ok('resolve_reference', { reference: 'Satipatthana Sutta' });
  assert.deepEqual(sati.also_named.map((a) => a.id).sort(), ['an4.274', 'sn43.5']);
  assert.ok(sati.notes.some((n) => /also_named/.test(n)));
});

test('resolve_reference: an ambiguous name lists every candidate with its citation and never guesses', async () => {
  const r = await call('resolve_reference', { reference: 'Metta sutta' });
  assert.equal(r.error, true);
  for (const c of ['Snp 1.8', 'Kp 9', 'Iti 22', 'AN 7.62']) assert.ok(r.body.error.includes(c), c);
  assert.match(r.body.error, /never guessed/);
  assert.throws(() => names.resolveName('Metta sutta'), (e) => e.candidates.length >= 5 && e.candidates.every((c) => c.citation));
});

test('resolve_reference: collection words with spaced numbers, only for unambiguous collection words', async () => {
  const r = await ok('resolve_reference', { reference: 'samyutta 56 11' });
  assert.equal(r.id, 'sn56.11');
  assert.equal(r.matched_by, 'collection and numbers');
  assert.equal((await ok('resolve_reference', { reference: 'majjhima 10 ' })).id, 'mn10');
  assert.equal(names.spacedNumbers('s 56 11'), null);
  assert.equal(names.spacedNumbers('it 1 1'), null);
  assert.equal(names.spacedNumbers('anguttara 3 65'), 'anguttara 3.65');
});

test('resolve_reference: citations are unchanged; a name with a number never reaches SN or AN through the name index', async () => {
  for (const [ref, id] of [['MN 10', 'mn10'], ['SN 56.11', 'sn56.11'], ['AN 3.65', 'an3.65'], ['M i 55', 'mn10']]) {
    const r = await ok('resolve_reference', { reference: ref });
    assert.equal(r.id, id);
    assert.equal(r.matched_by, undefined);
  }
  // "Kalama Sutta 65" has digits: the name index is never consulted, so no SN/AN text is reached by its number.
  const r = await call('resolve_reference', { reference: 'Kalama Sutta 65' });
  assert.equal(r.error, true);
  const unknown = await call('resolve_reference', { reference: 'Nonexistentname sutta' });
  assert.equal(unknown.error, true);
  assert.match(unknown.body.error, /no text in the canon has that name/);
});

test('analyse_passage accepts a sutta name through the same resolver', async () => {
  const r = await ok('analyse_passage', { uid: 'Dhammacakkappavattana sutta', limit: 3 });
  assert.equal(r.text_id, 'sn56.11');
});

// ---- lookup_pali ---------------------------------------------------------------------------------------------

test('lookup_pali "nibbana" offers both nibbāna and nibbana, labelled inferred_spelling', async () => {
  const r = await ok('lookup_pali', { word: 'nibbana' });
  assert.ok(r.inferred_spelling.spellings.includes('nibbāna'));
  assert.ok(r.inferred_spelling.spellings.includes('nibbana'));
  assert.match(r.inferred_spelling.note, /inferred/);
  assert.equal(r.offline, true, 'dpdict.net is simulated down: the offline fallback still answers');
});

test('lookup_pali "samyutta" finds saṃyutta; "nyana" finds ñāṇa', async () => {
  const s = await ok('lookup_pali', { word: 'samyutta' });
  assert.ok(s.inferred_spelling.spellings.includes('saṃyutta'));
  assert.ok(s.entries.length > 0);
  const n = await ok('lookup_pali', { word: 'nyana' });
  assert.deepEqual(n.inferred_spelling.spellings, ['ñāṇa']);
  assert.equal(n.input_normalised.read_as, 'ñana');
  assert.ok(n.entries.some((e) => /ñāṇa/.test(e)));
});

// ---- glossary ------------------------------------------------------------------------------------------------

test('glossary data: DPD pin, licence and no SuttaCentral columns', () => {
  const g = loadGlossary();
  assert.equal(g.source.version, DPD_PIN.version);
  assert.equal(g.source.asset_sha256, DPD_PIN.asset_sha256);
  assert.equal(g.source.license, 'CC BY-NC-SA 4.0');
  assert.ok(g.headwords.length > 30000);
  assert.ok(Object.keys(g.en).length > 30000);
  assert.ok(!/suttacentral|sc_/i.test(JSON.stringify(g.source.tables).replace(/sc_\*/g, '')), 'no SuttaCentral data');
  for (const [id, variants] of g.names) { assert.match(id, /^[a-z]/); assert.ok(variants.every((v) => typeof v === 'string')); }
  assert.ok(g.names.some(([id, v]) => id === 'mn10' && v.includes('satipaṭṭhānasutta')));
});

test('glossary tool: both directions, every entry sourced, glosses labelled as not translations', async () => {
  const { tools } = await client.listTools();
  const t = tools.find((x) => x.name === 'glossary');
  assert.ok(t);
  assert.equal(t.annotations.readOnlyHint, true);
  assert.equal(t.annotations.openWorldHint, false);
  assert.equal(TOOL_TITLES.glossary, 'Look up English–Pāli glossary terms');
  const en = await ok('glossary', { term: 'mindfulness' });
  assert.equal(en.english_to_pali[0].pali, 'sati');
  assert.equal(en.english_to_pali[0].source, 'DPD English index');
  assert.ok(en.english_to_pali.every((e) => e.source));
  assert.match(en.note, /not translations/);
  assert.equal(en.sources.dpd.license.name, 'CC BY-NC-SA 4.0');
  const lists = await ok('glossary', { term: 'hindrance', direction: 'en-pa' });
  assert.ok(lists.english_to_pali.some((e) => /dhamma_lists/.test(e.source)));
  const pa = await ok('glossary', { term: 'dukkha', direction: 'pa-en' });
  assert.ok(pa.pali_to_english.some((e) => e.pali === 'dukkha' && e.source === 'DPD headword'));
  const none = await ok('glossary', { term: 'xylophonic' });
  assert.equal(none.found, 0);
  assert.match(none.hint, /nothing is guessed/);
});

// ---- other tools share the normaliser -----------------------------------------------------------------------

test('topic, dhamma_list, paritta and search_post_canonical accept Velthuis input, labelled', async () => {
  const p = await ok('paritta', { name: 'Ratana', limit: 1 });
  assert.ok(p);
  const dl = await ok('dhamma_list', { name: 'brahmavihaara' });
  assert.equal(dl.input_normalised.read_as, 'brahmavihāra');
  const pc = await ok('search_post_canonical', { query: 'kasi.na', books: ['vism'], limit: 2 });
  assert.ok(pc.results.length);
  assert.equal(pc.input_normalised.read_as, 'kasiṇa');
});

// Review of #105.
test('English words are never rewritten into Pāli: any, many, Kenya, Tony, tiny, pony; no rewrite ends in ñ', () => {
  for (const w of ['any', 'many', 'Kenya', 'Tony', 'tiny', 'pony', 'panya', 'canyon', 'Bunyan', 'onyx']) {
    const r = input.normalizeWord(w);
    assert.equal(r.rule, null, `${w} -> ${r.word}`);
  }
  for (const w of ['sanyutta', 'nyana', 'sanyojana', 'Sanyutta']) {
    const r = input.normalizeWord(w);
    assert.equal(r.rule, 'anglicised', w);
    assert.doesNotMatch(r.word, /ñ$/);
  }
  assert.equal(input.isPaliForm('any'), false);
  assert.equal(input.isPaliForm('saṃyutt'), true);
});

test('abbreviations and "ed.Name" are not Harvard-Kyoto or Velthuis; "sutra" is "sutta" only in a Pāli name', () => {
  for (const w of ['DhA', 'ItI', 'ThagA', 'SnA', 'ed.Norman', 'cf.Nyanaponika']) assert.equal(input.normalizeWord(w).rule, null, w);
  assert.equal(input.normalizeWord('saMyutta').word, 'saṃyutta');
  assert.equal(input.normalizeInput('Heart Sutra').text, 'Heart Sutra');
  assert.equal(input.normalizeInput('Metta sutra').text, 'Metta sutta');
});

test('search_texts: English questions with common words are expanded or searched for their Pāli words', async () => {
  for (const q of ['Is there any teaching on anger?', 'Is there a teaching on anger?']) {
    const b = await ok('search_texts', { query: q, limit: 3 });
    assert.ok(b.total_texts_matched > 0, q);
    assert.ok(b.expanded_from_english.anger.includes('kodha'), q);
    assert.equal(b.input_normalised, undefined, q);
  }
  const j = await ok('search_texts', { query: 'How many jhanas are there', limit: 3 });
  assert.ok(j.total_texts_matched > 0);
  assert.deepEqual(j.english_words_ignored.searched_pali, ['jhana']);
  // A Pāli loan word is still Pāli, not English.
  const n = await ok('search_texts', { query: 'nibbana', limit: 2 });
  assert.equal(n.expanded_from_english, undefined);
  assert.equal(glossaryMod.looksEnglish('Is there a teaching on anger?'), true);
  assert.equal(glossaryMod.looksEnglish('dukkha'), false);
});

test('resolve_reference: Adittapariyaya is ambiguous (SN 35.28 on ATI, SN 35.235 in VRI); "Fire Sermon" finds SN 35.28', async () => {
  const r = await call('resolve_reference', { reference: 'Adittapariyaya' });
  assert.equal(r.error, true);
  assert.match(JSON.stringify(r.body), /SN 35\.28/);
  assert.match(JSON.stringify(r.body), /SN 35\.235/);
  for (const ref of ['Fire Sermon', 'The Fire Sermon']) {
    const b = await ok('resolve_reference', { reference: ref });
    assert.equal(b.id, 'sn35.28', ref);
    assert.equal(b.matched_by, 'name');
  }
});

test('resolve_reference: a bare common noun is not a name through an English chapter title; "Heart Sutra" is not MN 29/30', async () => {
  assert.equal((await call('resolve_reference', { reference: 'Anger' })).error, true);
  assert.equal((await ok('resolve_reference', { reference: 'Anger chapter' })).id, 'dhp221-234');
  assert.equal((await call('resolve_reference', { reference: 'Heart Sutra' })).error, true);
  assert.equal((await ok('resolve_reference', { reference: 'Mindfulness of Breathing' })).id, 'mn118');
});
