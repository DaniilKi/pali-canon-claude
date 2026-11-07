/**
 * Topics and numbered lists (issues #30, #31). Works offline.
 *  - topic / list_topics: Access to Insight's General Index and Numerical Index (CC BY 4.0), topic names and
 *    links only, with every sutta link mapped to a canon ID (server/data/topics.json, scripts/build_topics.mjs).
 *  - dhamma_list: the standard numbered lists with their defining canonical passages, Pāli member names and
 *    plain-English glosses (server/data/dhamma_lists.json, curated; checked against the VRI text in tests).
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as canonModule from './canon.mjs';
import { withNormalised } from './input.mjs';

let here;
try { here = __dirname; } catch { here = dirname(fileURLToPath(import.meta.url)); }

function readData(name) {
  const candidates = [join(here, 'data', name), join(here, '..', 'server', 'data', name), join(process.cwd(), 'server', 'data', name)];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error(`Bundled data (${name}) is missing. Reinstall the extension or rebuild.`);
  return JSON.parse(readFileSync(found, 'utf8'));
}

let topicsData = null;
let listsData = null;
export function topicsIndex() { return (topicsData ||= readData('topics.json')); }
export function listsIndex() { return (listsData ||= readData('dhamma_lists.json')); }

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen'];
/** Fold diacritics and case, spell small numbers as words, drop punctuation: "5 Hindrances" → "five hindrances". */
export function key(value) {
  return canonModule.fold(value)
    .replace(/\b(\d{1,2})\b/g, (m, n) => NUMBER_WORDS[Number(n)] ?? m)
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
const stem = (k) => k.split(' ').map((w) => w.replace(/(ies|es|s)$/, '')).join(' ');

function names(entry) {
  // "Kamma (karma; intentional action)" is also found as "kamma", "karma" and "intentional action".
  const parts = entry.name.split(/\s*[();]\s*/).filter(Boolean).flatMap((p) => [p, p.replace(/^the\s+/i, '')]);
  return [entry.slug.replace(/-/g, ' '), entry.name, ...parts, entry.pali, ...(entry.aliases || [])].filter(Boolean).map(key);
}

/** Best matches for a name among entries: exact name/alias, then plural-insensitive, then all words contained. */
function match(entries, query) {
  const q = key(query);
  if (!q) return [];
  const qs = stem(q);
  const words = qs.split(' ');
  const scored = [];
  for (const entry of entries) {
    const keys = names(entry);
    let score = 0;
    if (keys.includes(q)) score = 2;
    else if (keys.some((k) => stem(k) === qs)) score = 2;
    else if (keys.some((k) => { const sk = stem(k); return words.every((w) => sk.split(' ').some((x) => x.startsWith(w))); })) score = 1;
    if (score) scored.push({ entry, score });
  }
  // Exact and plural-insensitive matches rank together; a subject topic comes before a numbered one, then shorter names.
  return scored.sort((a, b) => b.score - a.score || (a.entry.index === 'numerical') - (b.entry.index === 'numerical') || a.entry.name.length - b.entry.name.length).map((s) => s.entry);
}

function textInfo(canon, id) {
  const { unit, notes } = canon.resolve(id);
  const info = canon.describe(unit, notes);
  return { id: unit.id, citation: unit.acronym, title: unit.title || null, pts: info.pts,
    ...(info.approximate ? { approximate: true } : {}),
    ...(info.alignment ? { alignment: info.alignment, notes: info.notes } : {}),
    read_with: { tool: 'get_text', uid: unit.id } };
}

const TOPIC_NOTE = 'Topic and links from Access to Insight\'s index; each link was mapped to the canon text it names. Read a text with get_text (Pāli) or get_translation (English). The index groups texts; it is not a ruling on what they mean.';

export function topic(canon, name) {
  const all = topicsIndex().topics;
  let hits = match(all, name);
  if (!hits.length) {
    // "dependent origination" → the list's other names ("paṭiccasamuppāda", "dependent co-arising") → ATI's topic.
    const viaList = match(listsIndex().lists, name)[0];
    if (viaList) for (const alt of [viaList.pali, viaList.name, ...(viaList.aliases || [])]) { hits = match(all, alt); if (hits.length) break; }
  }
  if (!hits.length) throw new Error(`No topic matches "${name}". Use list_topics to browse or search topic names, or search_texts for the Pāli text.`);
  const t = hits[0];
  const bySlug = new Map(all.map((x) => [x.slug, x]));
  const lists = listsIndex().lists;
  // A numbered topic points only to a list with the same number of members.
  const pool = t.number ? lists.filter((l) => l.count === t.number) : lists;
  const exact = (q) => match(pool, q).find((l) => names(l).some((k) => stem(k) === stem(key(q))));
  const list = [t.name.replace(/\s*\(\d+\)$/, ''), ...names(t)].map(exact).find(Boolean) || null;
  const src = topicsIndex().source;
  return {
    topic: { slug: t.slug, name: t.name, index: t.index === 'numerical' ? 'Access to Insight Numerical Index' : 'Access to Insight General Index', ...(t.number ? { number: t.number } : {}), ...(t.aliases?.length ? { aliases: t.aliases } : {}), ati_url: t.ati_url },
    texts: t.texts.map((x) => {
      const info = textInfo(canon, x.id);
      return { ...info, ati_reference: x.ati_reference, ati_url: x.ati_url,
        ...(key(x.ati_reference) !== key(info.citation) ? { numbering_note: `Access to Insight cites this as ${x.ati_reference}; the standard ID is ${info.id}.` } : {}) };
    }),
    ...(t.see_also?.length ? { see_also: t.see_also.map((s) => ({ slug: s, name: bySlug.get(s)?.name, read_with: { tool: 'topic', name: s } })).filter((s) => s.name) } : {}),
    ...(t.further_reading?.length ? { further_reading: t.further_reading.map((r) => ({ ...r, kind: 'Access to Insight essay or study guide (commentary, not scripture)' })) } : {}),
    ...(list ? { dhamma_list: { slug: list.slug, name: list.name, read_with: { tool: 'dhamma_list', name: list.slug }, hint: `dhamma_list("${list.slug}") gives the members and defining passage.` } } : {}),
    ...(hits.length > 1 ? { other_matches: hits.slice(1, 8).map((h) => ({ slug: h.slug, name: h.name, read_with: { tool: 'topic', name: h.slug } })) } : {}),
    note: TOPIC_NOTE,
    source: { name: src.name, url: t.ati_url, license: src.license, attribution: src.attribution, commit: src.commit },
  };
}

export function listTopics({ query, index = 'all', offset = 0, limit = 50 } = {}) {
  let pool = topicsIndex().topics;
  if (index !== 'all') pool = pool.filter((t) => t.index === index);
  if (query) pool = match(pool, query);
  const src = topicsIndex().source;
  return {
    total: pool.length, offset, returned: Math.min(limit, Math.max(0, pool.length - offset)),
    next_offset: offset + limit < pool.length ? offset + limit : null,
    topics: pool.slice(offset, offset + limit).map((t) => ({ slug: t.slug, name: t.name, index: t.index, texts: t.texts.length, read_with: { tool: 'topic', name: t.slug } })),
    hint: 'Open one with topic("<slug or name>"). Numbered teaching lists with their members are in dhamma_list.',
    source: { name: src.name, license: src.license, attribution: src.attribution, commit: src.commit },
  };
}

export function dhammaList(canon, name) {
  const data = listsIndex();
  if (!name) {
    return {
      lists: data.lists.map((l) => ({ slug: l.slug, name: l.name, pali: l.pali, count: l.count, status: l.status, read_with: { tool: 'dhamma_list', name: l.slug } })),
      hint: 'Open one with dhamma_list("<slug or name>"), e.g. "five hindrances" or "four-noble-truths".',
      status_labels: data.status_labels,
    };
  }
  const hits = match(data.lists, name);
  if (!hits.length) throw new Error(`No numbered list matches "${name}". Call dhamma_list with no name to see every list, or topic("${name}") for Access to Insight's index.`);
  const l = hits[0];
  const byslug = new Map(data.lists.map((x) => [x.slug, x]));
  const topics = match(topicsIndex().topics.filter((t) => t.index === 'numerical' && t.number === l.count), l.name.replace(/\s*\(.*\)$/, '').replace(/^\S+\s+/, ''));
  return {
    slug: l.slug, name: l.name, pali: l.pali, count: l.count,
    status: l.status, status_meaning: data.status_labels[l.status], ...(l.status_note ? { status_note: l.status_note } : {}),
    members: l.members.map((m, i) => ({ n: i + 1, pali: m.pali, gloss: m.gloss, ...(m.group ? { group: m.group } : {}), ...(m.list ? { list: m.list, read_with: { tool: 'dhamma_list', name: m.list } } : {}) })),
    gloss_note: data.gloss_note,
    defined_in: l.defined_in.map((c) => ({ ...textInfo(canon, c), role: 'sets out this list (every member name checked in the VRI text)' })),
    ...(l.see_also_texts?.length ? { see_also_texts: l.see_also_texts.map((c) => textInfo(canon, c)) } : {}),
    ...(l.related?.length ? { related_lists: l.related.map((s) => ({ slug: s, name: byslug.get(s)?.name, read_with: { tool: 'dhamma_list', name: s } })).filter((r) => r.name) } : {}),
    ...(topics.length ? { topic: { slug: topics[0].slug, name: topics[0].name, read_with: { tool: 'topic', name: topics[0].slug }, hint: `topic("${topics[0].slug}") lists more texts from Access to Insight's index.` } } : {}),
    ...(hits.length > 1 ? { other_matches: hits.slice(1, 6).map((h) => ({ slug: h.slug, name: h.name, read_with: { tool: 'dhamma_list', name: h.slug } })) } : {}),
    note: 'Read the defining passage with get_text before quoting it. Pāli member names are from that passage (VRI edition); English glosses are labels, not translations.',
    source: { curated_by: 'pali-canon-mcp (server/data/dhamma_lists.json)', text: canon.source().name, terms: canon.source().terms, pali: canon.source() },
  };
}

export function register({ tool, z, canon }) {
  tool('topic', 'Texts on a topic from Access to Insight\'s subject and numerical indexes (e.g. "emptiness", "anger", "five hindrances"), each mapped to its canon ID with title and PTS page. Works offline.', {
    name: z.string().min(1).max(200).describe('A topic name or slug, e.g. "emptiness", "upekkha", "kamma", "five hindrances".'),
  }, ({ name }) => withNormalised(name, (n) => topic(canon, n)));
  tool('list_topics', 'Browse or search the topic index (over 300 topics from Access to Insight\'s General and Numerical indexes). Works offline.', {
    query: z.string().max(200).optional().describe('Words to find in topic names, e.g. "anger" or "four".'),
    index: z.enum(['all', 'subject', 'numerical']).optional().describe('Which index: subject topics, numbered topics, or all (default).'),
    offset: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  }, ({ query, index, offset, limit }) => withNormalised(query, (q) => listTopics({ query: q, index, offset, limit })));
  tool('dhamma_list', 'A standard numbered list of the teaching (four noble truths, five aggregates, seven factors of awakening, ten fetters, twelve links…) with its members in Pāli, plain-English glosses and the canonical passage that sets it out. No name lists them all. Works offline.', {
    name: z.string().max(200).optional().describe('A list name or slug, e.g. "five hindrances", "eightfold path", "37 aids", "brahmaviharas". Omit to see every list.'),
  }, ({ name }) => withNormalised(name, (n) => dhammaList(canon, n)));
}
