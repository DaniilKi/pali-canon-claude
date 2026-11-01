/**
 * vinaya_rule: a bhikkhu Pātimokkha rule → its canonical text in the bundled VRI Vinaya, plus a link
 * to the section of Ṭhānissaro Bhikkhu's Buddhist Monastic Code (BMC I) on dhammatalks.org that
 * explains it. Link only: no BMC text is fetched or stored. Works offline.
 *
 * The mapping (server/data/bmc.json) is built by scripts/build-bmc.mjs from the book's own table of
 * contents, with every anchor checked against its page.
 */
import bmc from '../server/data/bmc.json' with { type: 'json' };

const CLASS_NAMES = {
  pj: 'Pārājika', ss: 'Saṅghādisesa', ay: 'Aniyata', np: 'Nissaggiya Pācittiya',
  pc: 'Pācittiya', pd: 'Pāṭidesanīya', sk: 'Sekhiya', as: 'Adhikaraṇa-samatha',
};
const CLASS_ABBR = { pj: 'Pj', ss: 'Ss', ay: 'Ay', np: 'Np', pc: 'Pc', pd: 'Pd', sk: 'Sk', as: 'As' };
export const RULE_COUNTS = { pj: 4, ss: 13, ay: 2, np: 30, pc: 92, pd: 4, sk: 75, as: 7 };

export const source = () => bmc.source;
export const ruleKeys = () => Object.keys(bmc.rules);

export function attribution() {
  const s = bmc.source;
  return {
    work: s.title,
    author: s.author,
    edition: s.edition,
    publisher: s.publisher,
    url: s.url,
    license: s.license,
    license_url: s.license_url,
    note: 'Linked only: the explanation is read on dhammatalks.org. The BMC is the author\'s commentary on the rules, not scripture and not a ruling for any community.',
  };
}

/** Look up one bhikkhu rule. `canon` is the bundled canon module (resolve, describe). */
export function vinayaRule(reference, canon) {
  const { unit, notes } = canon.resolve(reference);
  const m = unit.id.match(/^pli-tv-(bu|bi)-vb-([a-z]+)(\d+)(-\d+)?$/);
  if (!m) throw new Error(`"${reference}" is ${unit.acronym} (${unit.id}), not a Pātimokkha rule. Use forms like Pj 1, Ss 5, Np 18, Pc 5, Sk 26 or As 1.`);
  if (m[1] === 'bi') throw new Error(`${unit.acronym} is a bhikkhunī rule. The Buddhist Monastic Code links here cover the 227 bhikkhu rules only; read the Pāli with get_text("${unit.id}").`);
  if (m[4]) throw new Error(`${unit.acronym} is a group of rules. Ask for one rule at a time, e.g. ${CLASS_ABBR[m[2]]} ${Number(m[3])}.`);
  const key = `${m[2]}${m[3]}`;
  const entry = bmc.rules[key];
  if (!entry) throw new Error(`No Buddhist Monastic Code link is recorded for ${unit.acronym}.`);
  const text = canon.describe(unit, notes);
  const bmcNotes = [];
  if (entry.discussed_with) {
    bmcNotes.push(`The BMC explains ${CLASS_ABBR[m[2]]} ${Number(m[3])} together with ${CLASS_ABBR[m[2]]} ${entry.discussed_with.replace(/\D+/, '')}, so the link opens that shared section.`);
  }
  return {
    rule: `${CLASS_ABBR[m[2]]} ${Number(m[3])}`,
    class: CLASS_NAMES[m[2]],
    number: Number(m[3]),
    of: RULE_COUNTS[m[2]],
    canonical_text: {
      id: text.id,
      citation: text.citation,
      title: text.title,
      pts: text.pts,
      vri_book: text.vri_book,
      vri_paragraphs: text.vri_paragraphs,
      first_line: text.first_line,
      read_with: `get_text("${text.id}") for the full Pāli (VRI edition): origin story, rule and word analysis.`,
      source: text.source,
      suttacentral: text.links.suttacentral,
    },
    buddhist_monastic_code: {
      url: entry.url,
      chapter: entry.chapter,
      ...(entry.section ? { section: entry.section } : {}),
      ...(entry.discussed_with ? { discussed_with: `${CLASS_ABBR[m[2]]} ${entry.discussed_with.replace(/\D+/, '')}` } : {}),
      kind: 'commentary (modern explanation), linked only',
      attribution: attribution(),
    },
    english: 'No English translation of the rule text is bundled. Ṭhānissaro Bhikkhu\'s translation and explanation are at the BMC link.',
    notes: [...text.notes, ...bmcNotes],
  };
}

export function register({ tool, z, canon }) {
  tool('vinaya_rule', 'A monk\'s (bhikkhu) Pātimokkha rule, e.g. Pj 1, Ss 5, Np 18, Pc 5, Sk 26, As 1 (227 rules): its canonical text in the Vinaya (VRI Pāli, read with get_text) and a link to the section of Ṭhānissaro Bhikkhu\'s Buddhist Monastic Code (dhammatalks.org) that explains it, with attribution. The BMC is commentary, linked only. Works offline.', {
    rule: z.string().min(1).max(100).describe('A bhikkhu Pātimokkha rule: Pj 1–4, Ss 1–13, Ay 1–2, Np 1–30, Pc 1–92, Pd 1–4, Sk 1–75, As 1–7. Also "Bu Pc 5", "Pācittiya 5" or "pli-tv-bu-vb-pc5".'),
  }, ({ rule }) => vinayaRule(rule, canon));
}
