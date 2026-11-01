// Builds server/data/topics.json from two Access to Insight indexes, pinned to one commit of bcbsit/ati:
//   * the General Index (index-subject.html): subject topics;
//   * the Numerical Index (index-number.html): numbered topics ("Extremes (2)", "Hindrances (5)").
// Both pages are CC BY 4.0, by Access to Insight. Only topic names, cross-references and links are taken;
// ATI's own descriptive wording is not copied.
// Sutta links are mapped to canon texts like this:
//   * through the bundled translation index (the exact ATI URL, already verified when it was built), or
//   * for DN, MN, Dhp, Khp, Iti and Ud only (numbered identically in every scheme), by the link's own
//     citation, when the URL agrees with it.
// SN, AN, Snp, Thag, Thig and the rest are never mapped by number alone. Unmapped links are skipped.
//
//   node scripts/build_topics.mjs              # fetch the pinned commit of bcbsit/ati from GitHub
//   node scripts/build_topics.mjs --from DIR   # read DIR/index-subject.html and DIR/index-number.html
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as canon from '../src/canon.mjs';

const ATI_COMMIT = '45fedca341497120651efa20e756b04a13e61089';
const RAW = `https://raw.githubusercontent.com/bcbsit/ati/${ATI_COMMIT}/`;
const ATI = 'https://www.accesstoinsight.org';
const root = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolvePath(root, 'server', 'data', 'topics.json');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };
const decode = (s) => s
  .replace(/&([aeiou])macr;/gi, (_, v) => v + '̄')
  .replace(/&([nN])tilde;/g, (_, v) => v + '̃')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
  .normalize('NFC');
const text = (html) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const slugify = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function readIndex(file) {
  const i = process.argv.indexOf('--from');
  if (i > 0) return readFileSync(resolvePath(process.argv[i + 1], file), 'utf8');
  const res = await fetch(RAW + file);
  if (!res.ok) throw new Error(`${RAW + file}: HTTP ${res.status}`);
  return res.text();
}

// Collections whose text numbers are the same in the VRI/standard scheme and on Access to Insight.
const SAFE_BY_NUMBER = /^(DN|MN|Dhp|Khp|Iti|Ud) \d/;
const tryResolve = (ref) => { try { return canon.resolve(ref).unit; } catch { return null; } };

function resolveAti(href, rawLabel) {
  const label = rawLabel.replace(/\s*\(.*\)$/, '');
  const path = href.replace(/#.*$/, '');
  const byUrl = tryResolve(`${ATI}/${path}`);
  if (SAFE_BY_NUMBER.test(label) && !/[-–,]/.test(label)) {
    const byLabel = tryResolve(label);
    if (!byLabel) return null;
    // The URL maps to the same text, or to the range that contains it.
    if (byUrl && (byUrl.id === byLabel.id || byUrl.members?.includes(byLabel.id))) return byLabel;
    const nums = label.match(/\d+/g).map(Number);
    // A page holding several texts (iti.1.001-027, khp.1-9): the label's number must fall in the file's span.
    const span = /^(Iti|Khp) /.test(label) && path.match(/(\d+)-(\d+)\.\w+\.html$/);
    if (span) return nums.at(-1) >= Number(span[1]) && nums.at(-1) <= Number(span[2]) ? byLabel : null;
    // A single-text page (mn.137, dn.16.5-6 parts, ud.5.05): the file name must carry the same numbers.
    const file = path.match(/\/[a-z]+\.([\d.]+?)(?:\.\d+-\d+|\.\d+x|x)?\.[a-z]+\.html$/)?.[1]?.split('.').map(Number) ?? [];
    if (file.length && file.join('.') === nums.join('.')) return byLabel;
    return null;
  }
  // Anything else only through the URL index. A fragment inside a multi-text page keeps the page's text.
  return byUrl;
}

const unresolved = new Map();

function links(html) {
  const texts = [];
  const reading = [];
  const seen = new Set();
  for (const dd of html.matchAll(/<dd\b[^>]*>([^]*?)<\/dd>/gi)) {
    for (const a of dd[1].matchAll(/<a\s+href="([^"]+)"[^>]*>([^]*?)<\/a>/gi)) {
      const [, href, labelHtml] = a;
      const label = text(labelHtml);
      if (/^(https?:|mailto:|index-)/.test(href)) continue;
      if (href.startsWith('tipitaka/')) {
        const unit = resolveAti(href, label);
        if (!unit) { unresolved.set(href, label); continue; }
        if (seen.has(unit.id)) continue;
        seen.add(unit.id);
        texts.push({ id: unit.id, citation: unit.acronym, ati_reference: label, ati_url: `${ATI}/${href.replace(/#.*$/, '')}` });
      } else if (href.startsWith('lib/') && reading.length < 8) {
        if (label && !reading.some((r) => r.url.endsWith(href))) reading.push({ title: label, url: `${ATI}/${href}` });
      }
    }
  }
  return { texts, reading };
}

const subjectHtml = await readIndex('index-subject.html');
const numberHtml = await readIndex('index-number.html');

// ---- General Index ----------------------------------------------------------
const body = subjectHtml.slice(subjectHtml.indexOf('COPYRIGHTED TEXT CHUNK'));
const subject = [];
const redirects = [];
for (const entry of body.split(/(?=<dt\b)/i).slice(1)) {
  const dt = entry.match(/<dt\b[^>]*>([^]*?)<\/dt>/i)?.[1];
  if (!dt) continue;
  const anchor = dt.match(/<a id="([^"]+)"/)?.[1] ?? null;
  const head = text(dt);
  // "Name (gloss). See also …" or "Name — see Other."
  const name = head.split(/\s*—\s*see\b|\.\s*See also\b/i)[0].replace(/\.$/, '').trim();
  const refs = [...dt.matchAll(/href="index-subject\.html#([^"]+)"/g)].map((m) => m[1]);
  if (/—\s*see\b/i.test(head)) {
    if (name && refs.length) redirects.push({ name, see: refs[0] });
    continue;
  }
  const { texts, reading } = links(entry);
  if (!anchor || !texts.length || subject.some((t) => t.slug === anchor)) continue;
  subject.push({ slug: anchor, name, index: 'subject', see_also: refs, ati_url: `${ATI}/index-subject.html#${anchor}`, texts, ...(reading.length ? { further_reading: reading } : {}) });
}
// Redirects ("Equanimity — see Upekkha") become aliases of the topic they point to.
const bySlug = new Map(subject.map((t) => [t.slug, t]));
for (const r of redirects) {
  const target = bySlug.get(r.see);
  if (target) (target.aliases ||= []).push(r.name);
}
for (const t of subject) t.see_also = [...new Set(t.see_also.filter((s) => bySlug.has(s) && s !== t.slug))];

// ---- Numerical Index ---------------------------------------------------------
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen'];
const numbered = [];
for (const chapter of numberHtml.split(/(?=<h1\b)/i).slice(1)) {
  const n = Number(chapter.match(/id='num-(\d+)'/)?.[1]);
  if (!n) continue;
  let last = '';
  for (const entry of chapter.split(/(?=<dt\b)/i).slice(1)) {
    const dt = entry.match(/<dt\b[^>]*>([^]*?)<\/dt>/i)?.[1] ?? '';
    // An empty <dt> continues the previous heading.
    const label = text(dt).replace(/:$/, '').trim() || last;
    last = label;
    if (!label || /^see also:?$/i.test(label)) continue;
    const { texts, reading } = links(entry);
    if (!texts.length) continue;
    const slug = `n${n}-${slugify(label)}`;
    const existing = numbered.find((t) => t.slug === slug);
    if (existing) { for (const t of texts) if (!existing.texts.some((x) => x.id === t.id)) existing.texts.push(t); continue; }
    numbered.push({
      slug, name: `${label} (${n})`, index: 'numerical', number: n,
      // "Hindrances" → "five hindrances"; labels like "Assistance, kinds of" get no alias.
      ...(/[,(:/]/.test(label) ? {} : { aliases: [`${WORDS[n] ?? n} ${label.toLowerCase()}`] }),
      see_also: [], ati_url: `${ATI}/index-number.html#num-${n}`, texts, ...(reading.length ? { further_reading: reading } : {}),
    });
  }
}

const topics = [...subject, ...numbered];
const result = {
  source: {
    name: 'Access to Insight, General Index and Numerical Index',
    publisher: 'Barre Center for Buddhist Studies',
    urls: [`${ATI}/index-subject.html`, `${ATI}/index-number.html`],
    repository: 'https://github.com/bcbsit/ati',
    commit: ATI_COMMIT,
    license: 'CC BY 4.0 (the index pages); linked documents carry their own terms.',
    attribution: '“General Index” and “Numerical Index”, by Access to Insight (BCBS Edition), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Topic names, cross-references and links only; sutta links mapped to canon IDs by this project.',
  },
  built_with: 'scripts/build_topics.mjs',
  topics,
};
writeFileSync(out, `${JSON.stringify(result)}\n`);
console.log(`${topics.length} topics (${subject.length} subject, ${numbered.length} numerical), ${topics.reduce((n, t) => n + t.texts.length, 0)} text links; ${unresolved.size} ATI sutta links could not be mapped safely and were skipped.`);
if (process.argv.includes('--verbose')) for (const [href, label] of unresolved) console.log('  skipped', label, href);
