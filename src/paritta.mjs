/**
 * Paritta and other commonly recited texts, read from the bundled VRI Pāli.
 *
 * Each entry only names canonical citations (resolved with canon.resolve). The Pāli always comes
 * from the bundle; nothing here is typed in. Where a chanting-book version differs from the canon
 * (Āṭānāṭiya, Bojjhaṅga, Aṅgulimāla), the entry says so and returns the canonical text only.
 * English is offered only as links to dhammatalks.org / Access to Insight that the existing
 * conservative translation index already holds; read them with get_translation.
 */
import { fold } from './canon.mjs';
import { withNormalised } from './input.mjs';
import { romanizeLookupInput, inputNote } from './script.mjs';

/**
 * The set. `texts` are citations; the first is the default, the rest are canonical alternatives
 * (same text in another book, or companion suttas). `passage` narrows a long sutta to the segments
 * containing a phrase (folded match); tests check every phrase is found in the bundle.
 */
export const PARITTA = [
  { key: 'mangala', name: 'Maṅgala Sutta', aliases: ['mangala sutta', 'mahamangala', 'blessings'], texts: ['Kp 5', 'Snp 2.4'],
    note: 'The same sutta appears in the Khuddakapāṭha (Kp 5) and the Sutta Nipāta (Snp 2.4).' },
  { key: 'ratana', name: 'Ratana Sutta', aliases: ['ratana sutta', 'jewel', 'treasures'], texts: ['Kp 6', 'Snp 2.1'],
    note: 'The same sutta appears in the Khuddakapāṭha (Kp 6) and the Sutta Nipāta (Snp 2.1).' },
  { key: 'karaniya-metta', name: 'Karaṇīyamettā Sutta', aliases: ['metta sutta', 'karaniya metta', 'karaniyametta', 'goodwill', 'loving kindness', 'loving-kindness'], texts: ['Kp 9', 'Snp 1.8'],
    note: 'The same sutta appears in the Khuddakapāṭha (Kp 9) and the Sutta Nipāta (Snp 1.8). VRI titles it Mettasuttaṃ.' },
  { key: 'khandha', name: 'Khandha Paritta', aliases: ['khandha', 'ahiraja', 'ahiraja sutta', 'snakes'], texts: ['AN 4.67'],
    note: 'Canonical source: the Ahirājasutta (AN 4.67).' },
  { key: 'metta-nisamsa', name: 'Mettānisaṃsa Sutta', aliases: ['mettanisamsa', 'benefits of metta', 'metta benefits'], texts: ['AN 11.15'],
    note: 'Canonical source: AN 11.15 (Mettāsuttaṃ), the eleven benefits of mettā.' },
  { key: 'mora', name: 'Mora Paritta', aliases: ['mora', 'peacock', 'mora jataka'], texts: ['Ja 159'],
    note: 'Canonical source: the verses of the Mora Jātaka (Ja 159). The bundled Jātaka holds the verses only; the prose story belongs to the commentary.' },
  { key: 'vatta', name: 'Vaṭṭa Paritta', aliases: ['vatta', 'vattaka', 'quail', 'vattaka jataka', 'vattapotaka', 'vattapotakacariya'], texts: ['Cp 29', 'Ja 35'],
    note: 'Canonical source: the Vaṭṭapotakacariyā of the Cariyāpiṭaka (Cp 29), which holds the verses of the chant. The Vaṭṭaka Jātaka (Ja 35) shares part of them; pass text: "Ja 35" to read it.' },
  { key: 'dhajagga', name: 'Dhajagga Sutta', aliases: ['dhajagga', 'banner', 'top of the standard', 'crest of the banner'], texts: ['SN 11.3'],
    note: 'Canonical source: SN 11.3 (Dhajaggasuttaṃ).' },
  { key: 'atanatiya', name: 'Āṭānāṭiya Sutta', aliases: ['atanatiya', 'atanatiya paritta'], texts: ['DN 32'],
    note: 'The Āṭānāṭiya Paritta in chanting books is not identical to DN 32; this entry returns the canonical DN 32 text only (long: use offset and limit).' },
  { key: 'angulimala', name: 'Aṅgulimāla Paritta', aliases: ['angulimala', 'safe childbirth'], texts: ['MN 86'],
    passage: 'ariyaya jatiya jato',
    note: 'The protective declaration is a passage in MN 86 (Aṅgulimālasuttaṃ). Only the segments containing it are returned; read the whole sutta with get_text("MN 86").' },
  { key: 'bojjhanga', name: 'Bojjhaṅga Sutta', aliases: ['bojjhanga', 'bojjhanga paritta', 'factors of awakening', 'gilana'], texts: ['SN 46.14', 'SN 46.15', 'SN 46.16'],
    note: 'The Bojjhaṅga Paritta of chanting books is a later verse composition, not canonical text. The canonical sources are the three Gilāna suttas (SN 46.14–16); pass text to choose one.' },
  { key: 'girimananda', name: 'Girimānanda Sutta', aliases: ['girimananda', 'ten perceptions'], texts: ['AN 10.60'] },
  { key: 'isigili', name: 'Isigili Sutta', aliases: ['isigili'], texts: ['MN 116'] },
  { key: 'dhammacakka', name: 'Dhammacakkappavattana Sutta', aliases: ['dhammacakka', 'dhammacakkappavattana', 'first sermon', 'wheel of dhamma'], texts: ['SN 56.11'] },
  { key: 'anattalakkhana', name: 'Anattalakkhaṇa Sutta', aliases: ['anattalakkhana', 'anatta lakkhana', 'not-self'], texts: ['SN 22.59'] },
  { key: 'aditta', name: 'Ādittapariyāya Sutta', aliases: ['aditta', 'adittapariyaya', 'fire sermon'], texts: ['SN 35.28'], note: 'VRI titles it Ādittasuttaṃ.' },
  { key: 'mahasamaya', name: 'Mahāsamaya Sutta', aliases: ['mahasamaya', 'great meeting'], texts: ['DN 20'], note: 'Long: use offset and limit.' },
  { key: 'saranagamana', name: 'Saraṇagamana', aliases: ['saranagamana', 'saranattaya', 'refuges', 'three refuges', 'going for refuge'], texts: ['Kp 1'] },
  { key: 'dasasikkhapada', name: 'Dasasikkhāpada', aliases: ['dasasikkhapada', 'ten precepts', 'ten training rules'], texts: ['Kp 2'] },
  { key: 'dvattimsakara', name: 'Dvattiṃsākāra', aliases: ['dvattimsakara', '32 parts', 'thirty-two parts', 'parts of the body'], texts: ['Kp 3'] },
  { key: 'kumarapanha', name: 'Kumārapañhā', aliases: ['kumarapanha', 'samanera panha', 'novice questions'], texts: ['Kp 4'] },
  { key: 'tirokutta', name: 'Tirokuṭṭa Sutta', aliases: ['tirokutta', 'tirokudda', 'outside the walls', 'hungry ghosts'], texts: ['Kp 7'] },
  { key: 'nidhikanda', name: 'Nidhikaṇḍa Sutta', aliases: ['nidhikanda', 'reserve fund', 'treasure'], texts: ['Kp 8'] },
];

/**
 * Chanting-book layouts and English renderings (Amaravati, Abhayagiri). Permission has not been
 * obtained (request letters drafted in docs/outreach/, not yet sent), so `granted` is false and no
 * content is bundled. `status` records where the request stands; keep it in step with docs/outreach/. When a publisher
 * agrees, record it in docs/sources.md, add the data file and set `granted`.
 */
export const CHANTING_BOOKS = [
  { id: 'amaravati', publisher: 'Amaravati Publications', granted: false, status: 'request letter drafted, not yet sent', letter: 'docs/outreach/amaravati.md' },
  { id: 'abhayagiri', publisher: 'Abhayagiri Buddhist Monastery', granted: false, status: 'request letter drafted, not yet sent', letter: 'docs/outreach/abhayagiri.md' },
];

export function chantingBooks() {
  return CHANTING_BOOKS.map((b) => ({
    publisher: b.publisher,
    available: b.granted,
    ...(b.granted ? {} : { reason: `Permission to reproduce this chanting book's layout and English has not been obtained (${b.status}), so none of it is included.` }),
  }));
}

const keyOf = (s) => fold(s).replace(/[^a-z0-9]+/g, ' ').trim();

const strip = (s) => s.replace(/\b(sutta|suttam|paritta)\b/g, ' ').replace(/\s+/g, ' ').trim();
const MIN_PARTIAL = 4;

/**
 * Find an entry by key, name or alias (diacritics optional). An exact label match wins. Otherwise
 * the query (at least MIN_PARTIAL letters) must appear as whole words inside a label; a query that
 * merely contains a label (e.g. "metta bhavana") does not match. Returns null when nothing matches
 * and throws when the query fits more than one entry.
 */
export function find(name) {
  const q = strip(keyOf(name ?? ''));
  if (!q) return null;
  const labels = (e) => [e.key, e.name, ...e.aliases].map(keyOf).flatMap((l) => [l, strip(l)]).filter(Boolean);
  const ambiguous = (hits) => new Error(`"${name}" matches more than one paritta (${hits.map((e) => e.key).join(', ')}). Use one of those keys.`);
  const exact = PARITTA.filter((e) => labels(e).includes(q));
  if (exact.length > 1) throw ambiguous(exact);
  if (exact.length === 1) return exact[0];
  if (q.replace(/ /g, '').length < MIN_PARTIAL) return null;
  const re = new RegExp(`(^| )${q}( |$)`); // q holds only [a-z0-9 ]
  const hits = PARITTA.filter((e) => labels(e).some((l) => re.test(l)));
  if (hits.length > 1) throw ambiguous(hits);
  return hits[0] ?? null;
}

function englishLinks(described) {
  return described.english.map(({ source, translator, reference, url, license, translation_id, translation_scope, includes_commentary }) => ({
    source, translator, reference, url, ...(license ? { license } : {}), translation_id,
    ...(translation_scope ? { translation_scope, whole_unit_coverage: false } : {}),
    ...(includes_commentary ? { includes_commentary: true } : {}),
  }));
}

/** List the set, or return one entry with its Pāli from the bundled VRI text. */
export function paritta(canon, { name, text, offset = 0, limit = 60 } = {}) {
  if (!name) {
    if (text !== undefined) throw new Error('Choose a paritta name before selecting its canonical source with text. Omit both fields to list the set.');
    return {
      paritta: PARITTA.map((e) => {
        const units = e.texts.map((t) => canon.resolve(t).unit);
        return { key: e.key, name: e.name, read_with: { tool: 'paritta', name: e.key },
          texts: units.map((u) => ({ citation: u.acronym, text_id: u.id, title: u.title, read_with: { tool: 'paritta', name: e.key, text: u.id } })) };
      }),
      note: 'Pass name (e.g. "ratana", "Karaṇīyamettā") to read the Pāli. Texts are the canonical sources as printed in the VRI edition; chanting books may arrange or extend them.',
      chanting_books: chantingBooks(),
    };
  }
  const input = romanizeLookupInput(name);
  const entry = find(input.text);
  if (!entry) throw new Error(`No paritta named "${name}". Available: ${PARITTA.map((e) => e.key).join(', ')}.`);
  let ref = entry.texts[0];
  const textInput = text !== undefined ? romanizeLookupInput(text) : null;
  if (textInput) {
    const want = canon.resolve(textInput.text).unit.id;
    ref = entry.texts.find((t) => canon.resolve(t).unit.id === want);
    if (!ref) throw new Error(`${text} is not a source of ${entry.name}. Its sources: ${entry.texts.join(', ')}.`);
  }
  const { unit, notes } = canon.resolve(ref);
  const described = canon.describe(unit, notes);
  let all = canon.segments(unit);
  let passageNote;
  if (entry.passage) {
    const needle = keyOf(entry.passage);
    const hits = all.filter((s) => keyOf(s.text).includes(needle));
    if (!hits.length) throw new Error(`The passage for ${entry.name} was not found in ${unit.acronym}. Read it with get_text("${unit.acronym}").`);
    all = [...all.filter((s) => s.type === 'heading').slice(0, 1), ...hits];
    passageNote = `Selected ${hits.length} of ${canon.segments(unit).length} segments of ${unit.acronym}.`;
  }
  const page = all.slice(offset, offset + limit);
  return {
    key: entry.key,
    name: entry.name, ...inputNote(input),
    ...(textInput?.original ? { text_input_script: textInput.script, text_input_romanized: textInput.text } : {}),
    text_id: unit.id,
    citation: unit.acronym,
    title: unit.title,
    pts: described.pts,
    ...(entry.texts.length > 1 ? { other_sources: entry.texts.filter((t) => t !== ref) } : {}),
    edition: 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI), Pāli',
    attribution: canon.source().attribution,
    terms: canon.source().terms,
    source: canon.source(),
    total_segments: all.length, offset, limit, returned: page.length,
    next_offset: offset + page.length < all.length ? offset + page.length : null,
    continue_with: offset + page.length < all.length
      ? { tool: 'paritta', name: entry.key, text: unit.id, offset: offset + page.length, limit } : null,
    canonical_read_with: { tool: 'get_text', uid: unit.id },
    segments: page,
    notes: [...(entry.note ? [entry.note] : []), ...(passageNote ? [passageNote] : []), ...described.notes],
    english: englishLinks(described),
    english_note: described.english.length
      ? 'Links only. Read with get_translation and the exact translation_id. Scoped sources require explicit allow_partial or allow_shared according to their metadata; they do not establish whole-unit coverage or individual alignment.'
      : `No English translation is linked for ${unit.acronym} in this tool. See https://suttacentral.net/${unit.id} for other translations.`,
    chanting_books: chantingBooks(),
  };
}

export function register({ tool, z, canon }) {
  tool('paritta', 'Paritta and other commonly recited texts (Maṅgala, Ratana, Karaṇīyamettā, Khandha, Mora, Dhajagga, Bojjhaṅga, Khuddakapāṭha chants and more) in Pāli from the bundled VRI edition, with their canonical citations and links to English translations. Call with no name or text to list the set. Follow continue_with for pagination pinned to the chosen source. Works offline.', {
    name: z.string().max(100).optional().describe('Paritta name, e.g. "Ratana", "Karaṇīyamettā", "Khandha", "Mora" in Roman or a supported native script (conversion labelled). Diacritics optional in Roman. Omit to list all.'),
    text: z.string().trim().min(1).max(100).optional().describe('With name: choose one of the entry\'s canonical sources, e.g. "Snp 2.1" instead of the default "Kp 6", or "SN 46.16" for Bojjhaṅga. Native-script citations are converted and labelled separately. Omit for its default source.'),
    offset: z.number().int().min(0).max(100000).default(0).describe('Offset in the selected paritta, which may be an excerpt. Use continue_with; original canonical segment numbers use a separate numbering.'),
    limit: z.number().int().min(1).max(200).default(60).describe('Segments per page.'),
  }, (args) => {
    const input = romanizeLookupInput(args.name);
    // Native letter choices are exact input, not English-keyboard spelling guesses.
    return input.original ? paritta(canon, args) : withNormalised(args.name, (name) => paritta(canon, { ...args, name }));
  });
}
