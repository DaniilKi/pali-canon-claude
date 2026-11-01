#!/usr/bin/env node
/**
 * Build server/data/anandajoti.json: links from canonical texts to Ānandajoti Bhikkhu's
 * text-and-translation pages on ancient-buddhist-texts.net (Ancient Buddhist Texts).
 *
 * Conservative policy (see docs/sources.md and AGENTS.md "Translation links"):
 *   1. A page is a candidate only for the text its own heading or index entry names
 *      (the WORKS table below records that claim, with the site's own reference).
 *   2. The Pāli printed on the page must cover most of the VRI text of that unit
 *      (word 3-gram coverage >= MIN_COVERAGE, after the page's English is set aside), and no other unit of the same collection
 *      and similar size may come within MARGIN of it (the named text must be clearly the best match). This catches numbering differences
 *      (e.g. the site's "AN 3.62" is AN 3.61 in our numbering) and partial translations.
 *   3. SN and AN additionally need the Pāli title to agree (never by number alone).
 *   Anything that fails is reported and left out: no link is better than a wrong link.
 *
 * Usage: node scripts/anandajoti/build.mjs --cache <dir> [--out server/data/anandajoti.json]
 * Fetches at most one page per second and caches pages in --cache (keep it outside the repo).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as canon from '../../src/canon.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
const CACHE = args.cache || join(ROOT, '.cache', 'anandajoti');
const OUT = args.out || join(ROOT, 'server', 'data', 'anandajoti.json');
const BASE = 'https://ancient-buddhist-texts.net';
const MIN_COVERAGE = 0.6;
// The named text must beat every other text of the collection by this much (stock passages are shared).
const MARGIN = 0.1;
const UA = 'pali-canon-claude/2.0 (scripture study; build-time link index; https://github.com/DaniilKi/pali-canon-claude)';

// Each work: the canonical unit the site says the page translates, the site's own reference,
// and either one page or an ordered list of parts. `index` + `parts: 'auto'` reads the parts from the work's index page.
const T = '/Texts-and-Translations';
const WORKS = [
  { id: 'dn16', reference: 'DN 16', title: 'The Discourse about the Great Emancipation', index: `${T}/Mahaparinibbanasuttam/index.htm`, parts: 'auto' },
  { id: 'dn22', reference: 'DN 22', title: 'The Long Discourse about the Ways of Attending to Mindfulness', index: `${T}/Satipatthana/index.htm`, parts: 'auto' },
  { id: 'mn26', reference: 'MN 26', title: 'The Discourse about the Noble Search', index: `${T}/Ariyapariyesana/index.htm`, parts: 'auto' },
  { id: 'mn44', reference: 'MN 44', title: 'The Small Discourse giving an Elaboration', page: `${T}/Culavedalla/Culavedalla.htm`, commentary: true },
  { id: 'mn62', reference: 'MN 62', title: 'The Long Discourse Giving Advice to Rāhula', page: `${T}/Short-Pieces/MahaRahulovadasuttam.htm` },
  { id: 'mn85', reference: 'MN 85', title: 'The Discourse to Prince Bodhi', index: `${T}/Bodhirajakumara/index.htm`, parts: 'auto' },
  { id: 'mn98', reference: 'MN 98', title: 'The Discourse concerning Vāseṭṭha', page: `${T}/Short-Pieces/Vasetthasuttam.htm`, commentary: true },
  { id: 'mn118', reference: 'MN 118', title: 'The Discourse about Mindfulness while Breathing', index: `${T}/Anapanasati/index.htm`, parts: 'auto' },
  { id: 'mn119', reference: 'MN 119', title: 'The Discourse about Mindfulness related to the Body', index: `${T}/Kayagatasati/index.htm`, parts: 'auto' },
  { id: 'mn141', reference: 'MN 141', title: 'The Discourse giving the Analysis of the Truths', page: `${T}/Short-Pieces/Saccavibhangasuttam.htm` },
  { id: 'mn142', reference: 'MN 142', title: 'The Analysis of Offerings', page: `${T}/Short-Pieces/Dakkhinavibhangasuttam.htm` },
  { id: 'mn146', reference: 'MN 146', title: 'Nandaka’s Advice', page: `${T}/Nandakovada/Nandakovada.htm`, commentary: true },
  { id: 'sn12.2', reference: 'SN 12.2', title: 'The Discourse giving the Analysis (of Conditional Origination)', page: `${T}/Short-Pieces/Paticcasamuppadavibhangasuttam.htm`, pali: 'Vibhaṅgasuttaṃ' },
  { id: 'sn35.95', reference: 'SN 35.95', title: 'The Discourse Concerning Māluṅkyaputta', page: `${T}/Short-Pieces/Malunkyaputtasuttam.htm`, pali: 'Mālukyaputtasuttaṃ' },
  { id: 'sn44.1', reference: 'SN 44.1', title: 'The Discourse about Khemā', page: `${T}/Short-Pieces/Khemasuttam.htm`, pali: 'Khemāsuttaṃ' },
  { id: 'sn48.10', reference: 'SN 48.10', title: 'The Second Discourse giving an Analysis of the Faculties', page: `${T}/Short-Pieces/Indriyavibhangasuttam.htm`, pali: 'Dutiyavibhaṅgasuttaṃ' },
  // The site numbers this AN 3.62; the build checks the Pāli and title against our numbering.
  { id: 'an3.62', reference: 'AN 3.62', title: 'The Belief Systems', page: `${T}/Short-Pieces/Titthayatanasuttam.htm`, pali: 'Titthāyatanasuttaṃ' },
  { id: 'an4.61', reference: 'AN 4.61', title: 'The Discourse about Suitable Deeds', page: `${T}/Short-Pieces/Pattakammasuttam.htm`, pali: 'Pattakammasuttaṃ' },
  { id: 'an4.70', reference: 'AN 4.70', title: 'The Discourse on the Dishonest', page: `${T}/Short-Pieces/Adhammikasutta.htm`, pali: 'Adhammikasuttaṃ', commentary: true },
  { id: 'an5.41', reference: 'AN 5.41', title: 'The Discourse on the Right Use (of Wealth)', page: `${T}/Short-Pieces/Adiyasuttam.htm`, pali: 'Ādiyasuttaṃ' },
  { id: 'an6.37', reference: 'AN 6.37', title: 'The Six Factors of Giving', page: `${T}/Short-Pieces/Chalangadana.htm`, pali: 'Chaḷaṅgadānasuttaṃ', commentary: true },
  { id: 'an8.51', reference: 'AN 8.51', title: 'The Discourse about Gotamī', page: `${T}/Gotamisuttani/01-Gotami.htm`, pali: 'Gotamīsuttaṃ' },
  { id: 'an8.52', reference: 'AN 8.52', title: 'The Discourse about Advising', page: `${T}/Gotamisuttani/02-Advising.htm`, pali: 'Ovādasuttaṃ' },
  { id: 'an8.53', reference: 'AN 8.53', title: 'The Brief Discourse', page: `${T}/Gotamisuttani/03-Brief.htm`, pali: 'Saṅkhittasutta' },
  { id: 'an10.60', reference: 'AN 10.60', title: 'The Discourse to Girimānanda', page: `${T}/Short-Pieces/Girimanandasuttam.htm`, pali: 'Girimānandasuttaṃ' },
  { id: 'an10.69', reference: 'AN 10.69', title: 'The First Discourse on the Bases for Talk', page: `${T}/Short-Pieces/Kathavatthu.htm`, pali: 'Paṭhamakathāvatthusuttaṃ' },
  { id: 'ds1.1', reference: 'Dhs Mātikā (triads)', title: 'The Matrix: Triads', page: `${T}/Abhidhammamatika/01-Tikamatika.htm` },
  { id: 'ds1.2', reference: 'Dhs Mātikā (pairs)', title: 'The Matrix: Pairs', page: `${T}/Abhidhammamatika/02-Dukamatika.htm` },
  { id: 'ds1.3', reference: 'Dhs Mātikā (discourse pairs)', title: 'The Matrix: Pairs from the Discourses', page: `${T}/Abhidhammamatika/03-Suttantadukamatika.htm` },
  { id: 'vb6', reference: 'Vibh 6', title: 'Analysis of Conditional Origination', index: `${T}/Paticcasamuppadavibhanga/index.htm`, parts: 'auto' },
  { id: 'vb7', reference: 'Vibh 7', title: 'Analysis of the Ways of Attending to Mindfulness', index: `${T}/Satipatthanavibhanga/index.htm`, parts: 'auto' },
];

const DHP_CHAPTERS = ['01-Pairs', '02-Heedfulness', '03-Mind', '04-Flowers', '05-Fools', '06-Wise', '07-Arahats', '08-Thousands', '09-Wickedness', '10-Stick', '11-Old-Age', '12-Self', '13-World', '14-Buddha', '15-Happiness', '16-Love', '17-Anger', '18-Stains', '19-Dhamma', '20-Path', '21-Miscellaneous', '22-Underworld', '23-Elephant', '24-Craving', '25-Monastics', '26-Brahmins'];
const UD_VAGGAS = ['Bodhivaggo', 'Mucalindavaggo', 'Nandavaggo', 'Meghiyavaggo', 'Sonavaggo', 'Jaccandhavaggo', 'Cullavaggo', 'Pataligamiyavaggo'];
const SN5 = ['Alavika', 'Soma', 'Kisagotami', 'Vijaya', 'Uppalavanna', 'Cala', 'Upacala', 'Sisupacala', 'Sela', 'Vajira'];

function generated() {
  const out = [];
  const dhpRanges = canon.load().canon.units.filter((u) => u.kind === 'range' && /^dhp\d+-\d+$/.test(u.id));
  DHP_CHAPTERS.forEach((file, i) => {
    const u = dhpRanges[i];
    out.push({ id: u.id, reference: `Dhp ${u.id.slice(3).replace('-', '–')}`, title: `Dhammapada chapter ${i + 1}`, page: `${T}/Dhammapada/${file}.htm`, match: 'chapter' });
  });
  UD_VAGGAS.forEach((v, i) => {
    for (let s = 1; s <= 10; s += 1) out.push({ id: `ud${i + 1}.${s}`, reference: `Ud ${i + 1}.${s}`, title: null, page: `${T}/Udana/${i + 1}-${v}-${String(s).padStart(2, '0')}.htm` });
  });
  // Pārāyanavagga: the site's introductory verses and sixteen questions, then two epilogues = Snp 5.1–5.19.
  const pv = ['Parayanavaggo-00-Introduction', ...Array.from({ length: 16 }, (_, i) => `Parayanavaggo-${String(i + 1).padStart(2, '0')}`), 'Parayanavaggo-Epilogue-1', 'Parayanavaggo-Epilogue-2'];
  pv.forEach((file, i) => out.push({ id: `snp5.${i + 1}`, reference: `Snp 5.${i + 1}`, title: null, page: `${T}/Parayanavagga/${file}.htm` }));
  SN5.forEach((name, i) => out.push({ id: `sn5.${i + 1}`, reference: `SN 5.${i + 1}`, title: null, page: `${T}/Bhikkhunisamyuttam/${String(i + 1).padStart(2, '0')}-${name}.htm`, pali: canon.load().byId.get(`sn5.${i + 1}`).title }));
  return out;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let lastFetch = 0;
async function get(path) {
  const file = join(CACHE, path.replace(/[^a-z0-9.-]+/gi, '_'));
  if (existsSync(file)) return readFileSync(file, 'utf8');
  const delay = 1000 - (Date.now() - lastFetch);
  if (delay > 0) await wait(delay);
  lastFetch = Date.now();
  const res = await fetch(BASE + encodeURI(path), { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  const body = await res.text();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, body);
  return body;
}

export const words = (text) => canon.fold(String(text).replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' '))
  .replace(/[-‐]/g, '').replace(/[^a-z]+/g, ' ').trim().split(' ').filter(Boolean);
export const grams = (ws) => { const s = new Set(); for (let i = 0; i + 2 < ws.length; i += 1) s.add(`${ws[i]} ${ws[i + 1]} ${ws[i + 2]}`); return s; };
/** The Pāli lines of a line-by-line page: the site prints each Pāli line in bold above its English. */
export function paliOf(html) {
  const noNotes = html.replace(/<span[^>]*class=["']TT["'][^>]*>\s*<span[^>]*>[^]*?<\/span>\s*<sup[^>]*><\/sup>\s*<\/span>/gi, ' ');
  const bold = [...noNotes.matchAll(/<(b|strong)[^>]*>([^]*?)<\/>/gi)].map((m) => m[2]).join(' ');
  return bold.length > 200 ? bold : noNotes;
}
const unitGrams = new Map();
function gramsOf(u) {
  if (!unitGrams.has(u.id)) unitGrams.set(u.id, grams(words(canon.segments(u).filter((s) => s.type !== 'heading').map((s) => s.text).join(' '))));
  return unitGrams.get(u.id);
}
const unitVocab = new Map();
function vocabOf(u) {
  if (!unitVocab.has(u.id)) unitVocab.set(u.id, new Set(words(canon.segments(u).map((s) => s.text).join(' '))));
  return unitVocab.get(u.id);
}
/**
 * Share of the unit's word 3-grams found on the page. The page interleaves Pāli lines with English
 * and notes, so the page's words are first reduced to the unit's own vocabulary; the order of the
 * remaining Pāli words must still match for a 3-gram to count.
 */
export function coverage(pageWords, u) {
  const g = gramsOf(u);
  if (!g.size) return 0;
  const vocab = vocabOf(u);
  const page = grams(pageWords.filter((w) => vocab.has(w)));
  let n = 0;
  for (const x of g) if (page.has(x)) n += 1;
  return n / g.size;
}
const foldTitle = (t) => canon.fold(t).replace(/[^a-z]/g, '').replace(/(suttam|sutta)$/, '');

async function partsOf(work) {
  if (work.page) return [work.page];
  const html = await get(work.index);
  const dir = work.index.replace(/index\.htm$/, '');
  const seen = [];
  for (const m of html.matchAll(/href="([^"#:]+\.htm)/g)) {
    const f = m[1];
    if (f.startsWith('../') || f === 'index.htm' || /Introduction/i.test(f) || seen.includes(dir + f)) continue;
    seen.push(dir + f);
  }
  // Pages are named with leading numbers; keep reading order.
  return seen.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

async function main() {
  const d = canon.load();
  const all = [...WORKS, ...generated()];
  const links = {};
  const rejected = [];
  for (const work of all) {
    const u = d.byId.get(work.id);
    if (!u) { rejected.push({ ...work, why: 'unit not in canon' }); continue; }
    const parts = await partsOf(work);
    let html = '';
    for (const p of parts) html += await get(p);
    const page = words(paliOf(html));
    const cov = coverage(page, u);
    const size = gramsOf(u).size;
    const rivals = d.canon.units.filter((o) => o.collection === u.collection && o.id !== u.id && (o.kind === 'range') === (u.kind === 'range')
      && !o.approximate && gramsOf(o).size >= size * 0.5 && !(u.members || []).includes(o.id))
      .map((o) => ({ id: o.id, cov: coverage(page, o) })).filter((r) => r.cov > cov - MARGIN)
      .sort((a, b) => b.cov - a.cov);
    const why = [];
    if (cov < MIN_COVERAGE) why.push(`Pāli coverage ${cov.toFixed(2)} < ${MIN_COVERAGE}`);
    if (rivals.length) why.push(`also matches ${rivals.slice(0, 3).map((r) => `${r.id} (${r.cov.toFixed(2)})`).join(', ')}`);
    if (/^(sn|an)\d/.test(u.id) && (!work.pali || foldTitle(work.pali) !== foldTitle(u.title))) why.push(`title "${work.pali}" does not agree with "${u.title}"`);
    if (why.length) { rejected.push({ id: work.id, page: parts[0], why: why.join('; ') }); continue; }
    const pageTitle = (html.match(/<title>([^<]*)<\/title>/i)?.[1] || '').trim();
    links[u.id] = {
      path: parts.length === 1 ? parts[0] : work.index,
      ...(parts.length > 1 ? { parts } : {}),
      reference: work.reference,
      title: work.title || pageTitle.replace(/^.*? - /, '') || null,
      match: work.match || (/^(sn|an)\d/.test(u.id) ? 'number+title+pali' : 'number+pali'),
      coverage: Number(cov.toFixed(2)),
      ...(work.commentary ? { commentary: true } : {}),
    };
  }
  const out = {
    source: {
      name: 'Ancient Buddhist Texts',
      site: 'https://ancient-buddhist-texts.net/',
      translator: 'Ānandajoti Bhikkhu',
      license: 'CC BY-SA 3.0 Unported (site Copyright Notice, 26 May 2013); page footers now link CC BY-SA 4.0. Attribution: Ānandajoti Bhikkhu.',
      license_url: 'https://creativecommons.org/licenses/by-sa/3.0/',
      notice_url: 'https://ancient-buddhist-texts.net/Miscellaneous/Copyright-Notice.htm',
      checked: '2026-11-01',
      policy: `Linked only when the site names the text and its Pāli covers at least ${MIN_COVERAGE * 100}% of the VRI text (word 3-grams) and no other text comes within ${MARGIN} of it; SN/AN also need the Pāli title to agree.`,
    },
    links: Object.fromEntries(Object.entries(links).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))),
  };
  writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
  console.log(`linked ${Object.keys(links).length}, rejected ${rejected.length}`);
  for (const r of rejected) console.log(`  rejected ${r.id}: ${r.why} (${r.page || ''})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
