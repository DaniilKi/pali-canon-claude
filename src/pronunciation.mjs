// pali://pronunciation: a plain-English guide to reading Pāli aloud, plus links to free Pāli grammars.
// The guide is reference material written for this project, not scripture. Every example word is spelled
// exactly as it appears in the bundled VRI text (tests/pronunciation.test.mjs checks this), and every linked
// grammar has a licence we verified, with the URL of that evidence.

export const URI = 'pali://pronunciation';

/** Example words: each is spelled as it occurs in the bundled VRI text. */
export const EXAMPLES = [
  { word: 'dhammo', say: 'dhum-moh', shows: 'short a (like "u" in "but"), aspirated dh, double mm' },
  { word: 'bhagavā', say: 'bhu-guh-vaa', shows: 'aspirated bh, short a, long ā' },
  { word: 'ānando', say: 'aa-nun-doh', shows: 'long ā, long o' },
  { word: 'sati', say: 'suh-ti', shows: 'short a, short i; s is always as in "sun"' },
  { word: 'sīlaṃ', say: 'see-lung', shows: 'long ī, niggahīta ṃ' },
  { word: 'rūpaṃ', say: 'roo-pung', shows: 'long ū, niggahīta ṃ' },
  { word: 'mettā', say: 'met-taa', shows: 'e is short before a double consonant' },
  { word: 'sotthi', say: 'sot-thi', shows: 'o is short before a double consonant; tth = t + aspirated th' },
  { word: 'bhikkhu', say: 'bhik-khu', shows: 'kkh = k + aspirated kh; both are heard' },
  { word: 'buddho', say: 'bud-dhoh', shows: 'ddh = d + aspirated dh' },
  { word: 'sukhaṃ', say: 'su-khung', shows: 'kh is ONE letter, so the first syllable stays light' },
  { word: 'cittaṃ', say: 'chit-tung', shows: 'c sounds like "ch" in "church"' },
  { word: 'chandaṃ', say: 'chhun-dung', shows: 'ch is c with a puff of breath' },
  { word: 'jhānaṃ', say: 'jhaa-nung', shows: 'aspirated jh, long ā' },
  { word: 'ñāṇaṃ', say: 'nyaa-nung', shows: 'ñ = "ny" in "canyon"; ṇ is retroflex' },
  { word: 'saṅgho', say: 'sung-ghoh', shows: 'ṅ = "ng" in "sing"; aspirated gh' },
  { word: 'aṭṭha', say: 'ut-thuh', shows: 'retroflex ṭṭh (tongue tip curled back)' },
  { word: 'diṭṭhi', say: 'dit-thi', shows: 'retroflex ṭṭh against dental d' },
  { word: 'taṇhā', say: 'tun-haa', shows: 'retroflex ṇ followed by h' },
  { word: 'phalaṃ', say: 'phuh-lung', shows: 'ph = p + breath, as in "uphill", never "f"' },
  { word: 'thero', say: 'thay-roh', shows: 'th = t + breath, as in "hothouse", never as in "thin"' },
  { word: 'majjhimā', say: 'muj-jhi-maa', shows: 'jjh = j + aspirated jh' },
  { word: 'paññā', say: 'pun-nyaa', shows: 'double ññ' },
  { word: 'nibbānaṃ', say: 'nib-baa-nung', shows: 'double bb, long ā, niggahīta ṃ' },
  { word: 'evaṃ', say: 'ay-vung', shows: 'e is long when no double consonant follows' },
];

/** Grammars and courses: free ones are linked with the licence evidence we checked; others are named but not linked. */
export const GRAMMARS = [
  {
    title: 'A Practical Grammar of the Pāli Language',
    author: 'Charles Duroiselle (1871–1951)',
    edition: '3rd edition, Rangoon, 1921 (first published 1906)',
    language: 'English',
    url: 'https://archive.org/details/in.ernet.dli.2015.61817',
    licence: 'Public domain',
    licence_basis: 'Published 1921, before 1931, so public domain in the United States; the author died in 1951, so the copyright term of life plus 70 years ended on 1 January 2022.',
    verified: ['https://archive.org/metadata/in.ernet.dli.2015.61817', 'https://whowaswho-indology.info/?p=1673'],
    note: 'The most widely used free beginner grammar. A re-typeset "free distribution" edition (1997) also circulates; we link the original 1921 scan instead.',
  },
  {
    title: 'Handbook of Pāli: being an elementary grammar, a chrestomathy, and a glossary',
    author: 'Oscar Frankfurter',
    edition: 'London, 1883',
    language: 'English',
    url: 'https://archive.org/details/handbookofpalibe00franuoft',
    licence: 'Public domain',
    licence_basis: 'Published 1883. The Internet Archive record (University of Toronto scan) marks it NOT_IN_COPYRIGHT.',
    verified: ['https://archive.org/metadata/handbookofpalibe00franuoft'],
  },
  {
    title: 'A Simplified Grammar of the Pāli Language',
    author: 'Edward Müller (b. 1853)',
    edition: 'London: Trübner, 1884',
    language: 'English',
    url: 'https://archive.org/details/simplifiedgramma00mulliala',
    licence: 'Public domain',
    licence_basis: 'Published 1884. The Internet Archive record (University of California Libraries scan) marks it NOT_IN_COPYRIGHT.',
    verified: ['https://archive.org/metadata/simplifiedgramma00mulliala'],
  },
  {
    title: 'Pāli Literatur und Sprache',
    author: 'Wilhelm Geiger (1856–1943)',
    edition: 'Strassburg: K. J. Trübner, 1916',
    language: 'German',
    url: 'https://archive.org/details/paliliteraturund00geiguoft',
    licence: 'Public domain',
    licence_basis: 'Published 1916; the author died in 1943. The Internet Archive record (University of Toronto scan) marks it NOT_IN_COPYRIGHT. The later English translation is not linked because its copyright status was not verified.',
    verified: ['https://archive.org/metadata/paliliteraturund00geiguoft'],
    note: 'A scholarly reference grammar, including sound changes and phonology.',
  },
];

export const NOT_LINKED = [
  { title: 'Introduction to Pali', author: 'A. K. Warder', reason: 'In copyright and sold by the Pali Text Society; no open licence, so not linked.' },
  { title: 'A Pali Grammar for Students', author: 'Steven Collins', reason: 'In copyright; no open licence, so not linked.' },
];

const exampleTable = EXAMPLES.map((e) => `| ${e.word} | ${e.say} | ${e.shows} |`).join('\n');
const grammarList = GRAMMARS.map((g) => `- **${g.title}**, ${g.author}. ${g.edition}. ${g.language}. ${g.url}\n  Licence: ${g.licence}. ${g.licence_basis} Checked at: ${g.verified.join(' ; ')}${g.note ? `\n  ${g.note}` : ''}`).join('\n');
const notLinked = NOT_LINKED.map((g) => `- ${g.title} (${g.author}): ${g.reason}`).join('\n');

export const GUIDE = `# How to pronounce Pāli

This is a plain-English reading guide written for this project. It is reference material, not scripture and not a ruling. Monastic communities in Sri Lanka, Myanmar, Thailand and elsewhere chant Pāli with their own, long-established pronunciations; none of them is "wrong", and this guide does not choose between them. It describes the sounds that the Roman letters of the VRI edition (the text bundled with this server) stand for. Use lookup_pali (Digital Pāḷi Dictionary) for the grammar of a particular word.

## The alphabet

Pāli has no script of its own: it is written in Sinhala, Burmese, Thai, Devanāgarī and other scripts, and in Roman letters with diacritics. The traditional grammar of Kaccāyana counts 41 letters: 8 vowels and 33 consonants.

- Vowels: a ā i ī u ū e o
- Velar (back of the tongue): k kh g gh ṅ
- Palatal (tongue against the hard palate): c ch j jh ñ
- Retroflex (tongue tip curled back): ṭ ṭh ḍ ḍh ṇ
- Dental (tongue tip against the teeth): t th d dh n
- Labial (lips): p ph b bh m
- Others: y r l v s h ḷ
- Niggahīta: ṃ

A letter with h after it (kh, gh, ch, jh, ṭh, ḍh, th, dh, ph, bh) is ONE letter, not two.

## Vowels: long and short

- a: short, like "u" in "but" (not "a" in "cat").
- ā: long, like "a" in "father".
- i: short, like "i" in "pin". ī: long, like "ee" in "see".
- u: short, like "u" in "put". ū: long, like "oo" in "pool".
- e: long, like "ay" in "day" (without the glide); short, like "e" in "get", when two consonants follow (mettā).
- o: long, like "o" in "go"; short, like "o" in "hot", when two consonants follow (sotthi).

The macron (ā ī ū) marks length, not a different vowel colour. Length matters: it can change the meaning of a word, and verse metre depends on it.

## Aspirated consonants

kh, gh, ch, jh, ṭh, ḍh, th, dh, ph, bh are the plain consonant followed by a clear puff of breath, as in "backhand", "doghouse", "hothouse", "uphill", "clubhouse".

- th is never the "th" of "thin" or "this".
- ph is never "f".
- kh is never the throaty "ch" of German "Bach".

## Retroflex consonants

ṭ ṭh ḍ ḍh ṇ (and ḷ) are said with the tip of the tongue curled up and back to touch the roof of the mouth. The dental row t th d dh n is said with the tongue tip against the back of the upper teeth. English "t" and "d" fall between the two; aim for a clear difference.

## Other consonants

- c: like "ch" in "church" (never "k" or "s"). ch: the same with a puff of breath.
- j: like "j" in "jug". ñ: like "ny" in "canyon". ṅ: like "ng" in "sing".
- g: always hard, as in "go". s: always as in "sun", never "z".
- y: as in "yes". r: a light tap of the tongue. v: between English "v" and "w"; traditions differ.
- ḷ: an "l" made with the tongue curled back (retroflex).

## Niggahīta ṃ

ṃ (niggahīta) is a nasal sound after a vowel. It is often pronounced like "ng" in "sing" (evaṃ, roughly "ay-vung"); some readers nasalise the vowel instead, or let it take the place of the following consonant. The VRI text writes ṃ; other editions write ṁ. Before a consonant of the same group many words are written with that group's nasal instead: the VRI text has saṅgho, not "saṃgho".

## Double consonants

Both letters of a double consonant are pronounced: hold the first and release it into the second, as in "hot tea" or "book-keeper" (mettā = met-tā, buddho = bud-dho). With an aspirate, only the second is aspirated: kkh, ggh, cch, jjh, ṭṭh, ḍḍh, tth, ddh, pph, bbh (bhikkhu = bhik-khu, aṭṭha = aṭ-ṭha). Shortening a double to a single consonant changes the word.

## Syllable length and stress

A syllable is heavy (long) if it has a long vowel (ā ī ū, and e o when no double consonant follows), or if its vowel is followed by two consonants or by ṃ. Otherwise it is light. Remember that kh, th and the other aspirates are single letters: in sukhaṃ the first syllable su- is light.

Pāli verse is measured by syllable weight, not by stress. The Roman text marks no stress, and pronunciation traditions differ in where they place it. English speakers most often go wrong by stressing one syllable heavily and swallowing the others; giving every long vowel and every double consonant its full length matters more than where the stress falls.

## Examples

Each word below is spelled exactly as it appears in the bundled VRI text. The respellings are rough English approximations ("u" as in "but", "aa" as in "father", "ay" as in "day", "oh" as in "go").

| Pāli | Say roughly | Shows |
|---|---|---|
${exampleTable}

## Free Pāli grammars

Each link below is openly available, and its licence was checked against the record named after it.

${grammarList}

Not linked (not freely licensed):

${notLinked}
`;

/** Register the pali://pronunciation resource. */
export function register({ resource }) {
  resource('pronunciation', URI, {
    mimeType: 'text/markdown',
    description: 'Plain-English Pāli pronunciation guide (alphabet, long and short vowels, aspirates, retroflexes, niggahīta ṃ, double consonants, stress) with links to free public-domain grammars. Reference material, not scripture.',
  }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: GUIDE }] }));
}
