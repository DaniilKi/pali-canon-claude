// find_talks: link-only search of Ṭhānissaro Bhikkhu's evening and morning Dhamma talks on dhammatalks.org,
// through the site's own search page (https://www.dhammatalks.org/search/). Returns talk titles, dates and
// URLs only. Talk text (transcripts) and the search snippets drawn from it are never returned.
//
// robots.txt (checked 2026-11-01) allows every path for every crawler except /Archive/MachineTranscripts/,
// which is never requested or linked. Requests are cached (src/cache.mjs) and spaced at least one second apart.
import { fetchPublic, decodeHtml } from './http.mjs';
import { liveCache } from './cache.mjs';

export const SITE = 'https://www.dhammatalks.org';
export const CATEGORIES = ['evening', 'morning'];
const MIN_INTERVAL_MS = 1000;
const DISALLOWED = '/Archive/MachineTranscripts/';

export const TALKS_SOURCE = {
  name: 'dhammatalks.org — Dhamma talks by Ṭhānissaro Bhikkhu (Metta Forest Monastery)',
  url: `${SITE}/audio/`,
  search: `${SITE}/search/`,
  license: 'CC BY-NC 4.0',
  attribution: 'Talks by Ṭhānissaro Bhikkhu, dhammatalks.org. Licensed CC BY-NC 4.0; the copyright holder considers any sale, including by non-profits, commercial.',
};

const LINK_ONLY = 'Links only: titles, dates and URLs from dhammatalks.org\'s own search. The talks\' text is not fetched or returned; open a link to listen or read.';
const COMMENTARY = 'Talks are a teacher\'s commentary (Ṭhānissaro Bhikkhu), not scripture. Keep them distinct from the Pāli text and its translations.';

// Words that do not make a translated title distinctive on their own.
const MINOR = new Set(['a', 'an', 'the', 'to', 'of', 'on', 'in', 'at', 'and', 'or', 'with', 'for', 'by', 'from', 'about', 'is']);

/** Fold diacritics and typographic quotes: the site's search does not handle diacritics. */
export function plainTerms(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
}

/**
 * The English title of Ṭhānissaro's translation, taken from its dhammatalks.org citation
 * ("AN 3:66 To the Kālāmas" → "To the Kalamas"). Bracketed glosses and ordinals such as "(1)" are dropped.
 * Returns null when the title is too generic to search on: fewer than two distinctive words and fewer than three words.
 */
export function phraseFromReference(reference) {
  let title = String(reference ?? '')
    .replace(/^(?:[A-Za-z]{1,5}\s+)?[\dIVXLC]+(?:\s*[:.]\s*\d+)*(?:\s*[-–—]\s*\d+(?:[:.]\d+)*)?\s*:?\s*/, '');
  title = plainTerms(title.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/["]/g, ''));
  const words = title.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (!words.length) return null;
  const distinctive = words.filter((w) => !MINOR.has(w.toLowerCase()));
  if (distinctive.length < 2 && words.length < 3) return null;
  return words.join(' ');
}

/** Parse talk results from a dhammatalks.org search page. Only links to talk pages under /audio/evening|morning/ are kept. */
export function parseTalkResults(html) {
  const results = [];
  for (const chunk of String(html ?? '').split(/(?=<li\b[^>]*\bclass="[^"]*\bsearch-result\b)/i).slice(1)) {
    if (!/^<li\b[^>]*\bclass="[^"]*\bli-audio\b/i.test(chunk)) continue;
    const link = chunk.match(/<a\b[^>]*\bhref="(\/audio\/(evening|morning)\/(\d{4})\/[^"#?]+\.html)"[^>]*>([^]*?)<\/a>/i);
    if (!link) continue;
    const [, path, category, year] = link;
        const title = decodeHtml(link[4].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    if (!title) continue;
    let clean = decodeHtml(path);
    try { clean = decodeURI(clean); } catch { continue; }
    const result = { title, url: SITE + encodeURI(clean), category, year: Number(year) };
    const id = chunk.match(/^<li\b[^>]*\bid="(\d{2})(\d{2})(\d{2})-/i);
    if (id && Number(id[1]) === Number(year) % 100 && Number(id[2]) >= 1 && Number(id[2]) <= 12 && Number(id[3]) >= 1 && Number(id[3]) <= 31) {
      result.date = `${year}-${id[2]}-${id[3]}`;
    }
    const audio = chunk.match(/\bdata-link="(\/Archive\/[^"]+\.mp3)"/i);
    if (audio && !audio[1].startsWith(DISALLOWED)) result.audio_url = SITE + encodeURI(decodeHtml(audio[1]));
    results.push(result);
  }
  return results;
}

/** The site's own search URL for these terms (also returned so the reader can browse further). */
export function searchUrl(terms, category, page = 1) {
  const params = new URLSearchParams({ q: terms, cat: category });
  if (page > 1) params.set('page', String(page));
  return `${SITE}/search/?${params}`;
}

let lastRequest = 0;
let queue = Promise.resolve();
/** Serialise requests to the site and keep them at least MIN_INTERVAL_MS apart. */
export function politely(load, now = Date.now) {
  const run = queue.then(async () => {
    const delay = lastRequest + MIN_INTERVAL_MS - now();
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    lastRequest = now();
    return load();
  });
  queue = run.catch(() => {});
  return run;
}

const defaultFetch = (url) => politely(() => fetchPublic(url, { json: false, retries: 1, timeout: 20000 }));

async function searchCategory(terms, category, page, fetchHtml) {
  const url = searchUrl(terms, category, page);
  const html = await liveCache.wrap(`talks:${url}`, () => fetchHtml(url));
  return { url, results: parseTalkResults(html), has_more: html.includes(`page=${page + 1}`) };
}

/**
 * Search talks by topic (`query`) or by passage (`passage`, resolved with the bundled canon).
 * `fetchHtml` is injectable for tests.
 */
export async function findTalks({ query, passage, category = 'all', page = 1, limit = 10 } = {}, { canon, fetchHtml = defaultFetch } = {}) {
  query = plainTerms(query);
  page = Math.max(1, Math.trunc(Number(page) || 1));
  limit = Math.min(20, Math.max(1, Math.trunc(Number(limit) || 10)));
  if (!query && !passage) throw new Error('Give a topic (query) or a passage (for example "MN 118").');
  if (query.length > 200) throw new Error('Query is too long (200 characters at most).');
  const categories = category === 'all' ? CATEGORIES : [category];
  if (!categories.every((c) => CATEGORIES.includes(c))) throw new Error('category must be "evening", "morning" or "all".');

  const notes = [LINK_ONLY, COMMENTARY];
  let passageInfo = null;
  let terms = query;
  if (passage) {
    const { unit } = canon.resolve(passage);
    const { links, via } = canon.linksFor(unit);
    const dt = via ? null : links.find((l) => l.source === 'dhammatalks');
    const phrase = dt ? phraseFromReference(dt.reference) : null;
    passageInfo = { id: unit.id, citation: unit.acronym, title: unit.title || null, translation_url: dt?.url ?? null, translation_title: phrase };
    if (!phrase) {
      const why = via ? `${unit.acronym} has no translation page of its own on dhammatalks.org (only its chapter, ${via.acronym}, does)`
        : !dt ? `${unit.acronym} has no linked Ṭhānissaro translation on dhammatalks.org`
          : `the title of Ṭhānissaro's translation ("${dt.reference}") is too general to identify talks about this passage`;
      return { source: TALKS_SOURCE, passage: passageInfo, searched_for: null, results: [], has_more: false,
        notes: [...notes, `No search was run: ${why}. dhammatalks.org has no passage-to-talk index, and a loose keyword match would be a wrong link. Try a topic query instead.`] };
    }
    terms = `"${phrase}"${query ? ` ${query}` : ''}`;
    notes.push(`dhammatalks.org has no passage-to-talk index. These talks contain the phrase "${phrase}", the title of Ṭhānissaro Bhikkhu's translation of ${unit.acronym}${query ? `, and the words "${query}"` : ''}. A match shows the words appear in the talk, not that the talk is about this sutta.`);
  } else {
    notes.push('Matches are keyword matches found by dhammatalks.org\'s search (all words; "quoted phrases" allowed). Diacritics are removed because the site\'s search does not handle them.');
  }

  const searched = [];
  const seen = new Set();
  const results = [];
  let hasMore = false;
  for (const c of categories) {
    let found;
    try { found = await searchCategory(terms, c, page, fetchHtml); } catch (error) {
      throw new Error(`dhammatalks.org search is unavailable right now (${error.message}). Open ${searchUrl(terms, c, page)} directly or try again shortly.`);
    }
    searched.push(found.url);
    hasMore ||= found.has_more;
    for (const r of found.results) if (!seen.has(r.url)) { seen.add(r.url); results.push(r); }
  }
  return {
    source: TALKS_SOURCE,
    ...(passageInfo ? { passage: passageInfo } : {}),
    searched_for: terms,
    category,
    page,
    results: results.slice(0, limit),
    returned: Math.min(limit, results.length),
    has_more: hasMore || results.length > limit,
    ...(hasMore ? { next_page: page + 1 } : {}),
    search_urls: searched,
    notes,
  };
}

export function register({ tool, z, citation, canon }) {
  tool('find_talks', 'Find Dhamma talks by Ṭhānissaro Bhikkhu on dhammatalks.org by topic (query) or by passage (a citation such as MN 118). Link-only: returns talk titles, dates and URLs from the site\'s own search, never talk text. Talks are commentary, not scripture.', {
    query: z.string().max(200).optional().describe('Topic keywords, e.g. "jhana", "Kalamas", "\\"right resolve\\"" (diacritics are removed).'),
    passage: citation.optional().describe('A passage; talks containing the title of Ṭhānissaro\'s translation are found. Combine with query to narrow.'),
    category: z.enum(['all', 'evening', 'morning']).default('all').describe('Evening talks, short morning talks, or both.'),
    page: z.number().int().min(1).max(50).default(1),
    limit: z.number().int().min(1).max(20).default(10),
  }, (args) => findTalks(args, { canon }), { network: true });
}
