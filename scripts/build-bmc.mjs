// Builds server/data/bmc.json: each bhikkhu Pātimokkha rule → its section in Ṭhānissaro Bhikkhu's
// Buddhist Monastic Code (BMC I) on dhammatalks.org. Link-only: no BMC text is stored.
//
// Every URL comes from the book's own table of contents (Section0000.html), and every anchor is
// checked against the section page it points to. Nothing is guessed: the build fails if any of the
// 227 rules is missing from the table of contents or its anchor is absent from the page.
//
// Usage: node scripts/build-bmc.mjs   (needs network; writes server/data/bmc.json)
import { writeFile } from 'node:fs/promises';

const BASE = 'https://www.dhammatalks.org/vinaya/bmc/';
const CLASSES = [
  // [our key, rule count, BMC anchor prefix, Pāli class name]
  ['pj', 4, 'Pr', 'Pārājika'], ['ss', 13, 'Sg', 'Saṅghādisesa'], ['ay', 2, 'Ay', 'Aniyata'],
  ['np', 30, 'NP', 'Nissaggiya Pācittiya'], ['pc', 92, 'Pc', 'Pācittiya'], ['pd', 4, 'Pd', 'Pāṭidesanīya'],
  ['sk', 75, 'Sk', 'Sekhiya'], ['as', 7, 'As', 'Adhikaraṇa-samatha'],
];

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function get(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
}

const toc = await get('Section0000.html');
// Walk the table of contents in order. Sub-chapter headings ("Two: The Silk Chapter") apply to the
// rules listed after them until the next sub-chapter or class heading.
const SUBCHAPTER = /^(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten): /;
const entries = [];
let subchapter = null;
for (const [, page, anchor, rawLabel] of toc.matchAll(/<a[^>]*href="\.\/(Section\d{4}\.html)(?:#([^"]*))?"[^>]*>([\s\S]*?)<\/a>/g)) {
  const label = decode(rawLabel);
  if (SUBCHAPTER.test(label)) { subchapter = label; continue; }
  const rule = anchor?.match(/^([A-Za-z]+)(\d+)$/);
  if (rule && /^\d+( \[\d+\])?$/.test(label)) entries.push({ page, prefix: rule[1], n: Number(rule[2]), label, subchapter });
  else if (!anchor) subchapter = null;
}

const pages = new Map();
async function page(name) {
  if (!pages.has(name)) {
    const html = await get(name);
    const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)[1]);
    pages.set(name, { html, title });
  }
  return pages.get(name);
}

const rules = {};
for (const [key, count, prefix, className] of CLASSES) {
  const own = entries.filter((e) => e.prefix === prefix);
  let chapter = null;
  for (let n = 1; n <= count; n += 1) {
    // Paired rules are discussed together under the first number: the TOC shows them as "1 [2]".
    let entry = own.find((e) => e.n === n);
    let sharedWith = null;
    if (!entry) {
      entry = own.find((e) => e.n === n - 1 && new RegExp(`^${n - 1} \\[${n}\\]$`).test(e.label));
      if (!entry) throw new Error(`BMC table of contents has no entry for ${key}${n}`);
      sharedWith = `${key}${n - 1}`;
    }
    const { html, title } = await page(entry.page);
    if (!html.includes(`id="${prefix}${entry.n}"`)) throw new Error(`${entry.page} has no anchor ${prefix}${entry.n}`);
    // Page titles look like "Pārājika | Chapter Four | The Buddhist Monastic Code…" (first page of a class)
    // or "Pācittiya Two: The Living Plant Chapter | The Buddhist Monastic Code…" (later pages).
    const parts = title.split(' | ');
    if (!chapter) {
      if (!/^Chapter /.test(parts[1] || '')) throw new Error(`Unexpected first page title for ${key}: ${title}`);
      chapter = `${parts[1]}: ${className}`;
    }
    const section = entry.subchapter;
    rules[`${key}${n}`] = {
      url: `${BASE}${entry.page}#${prefix}${entry.n}`,
      chapter,
      ...(section ? { section } : {}),
      ...(sharedWith ? { discussed_with: sharedWith } : {}),
    };
  }
}

const copyright = decode((await get('Section0002.html')).match(/Copyright[\s\S]*?International/)?.[0] || '');
if (!/Ṭhānissaro Bhikkhu/.test(copyright) || !/NonCommercial 4\.0/.test(copyright)) throw new Error(`Unexpected copyright page: ${copyright}`);
const edition = copyright.match(/(third edition, revised: \d{4})/)?.[1];
if (!edition) throw new Error('Could not read the BMC edition from its copyright page.');

const out = {
  source: {
    title: 'The Buddhist Monastic Code, Volume I: The Pāṭimokkha Rules',
    author: 'Ṭhānissaro Bhikkhu',
    edition,
    publisher: 'dhammatalks.org',
    url: `${BASE}Section0000.html`,
    license: 'CC BY-NC 4.0',
    license_url: 'https://creativecommons.org/licenses/by-nc/4.0/',
    retrieved: new Date().toISOString().slice(0, 10),
    method: 'URLs and anchors read from the book\'s table of contents and checked against each section page. Link only; no BMC text is stored.',
  },
  rules,
};
await writeFile('server/data/bmc.json', `${JSON.stringify(out, null, 1)}\n`);
console.error(`Wrote server/data/bmc.json: ${Object.keys(rules).length} rules from ${pages.size} BMC pages.`);
