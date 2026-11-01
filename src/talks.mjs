// find_talks: link-only search of Ṭhānissaro Bhikkhu's evening and morning Dhamma talks on dhammatalks.org,
// through the site's own search page (https://www.dhammatalks.org/search/). Returns talk titles, dates and
// URLs only. Talk text (transcripts) and the search snippets drawn from it are never returned.
//
// robots.txt (checked 2026-11-01): for the generic user-agent * (which covers this server's user agent), everything
// except /Archive/MachineTranscripts/ is allowed; that path is never requested or linked. (About fifteen named bots,
// such as SemrushBot and AhrefsBot, are disallowed from the whole site; this server is not one of them.) Requests are cached (src/cache.mjs) and spaced at least one second apart.
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
const MINOR = new Set(['a', 'an', 'the', 'to', 'of', 'on', 'in', 'at', 'and', 'or', 'with', 'for', 'by', 'from', 'about', 'is', '&',
  'as', 'are', 'was', 'were', 'be', 'being', 'been', 'has', 'have', 'had', 'it', 'its', 'not', 'no', 'this', 'that', 'these', 'those',
  'there', 'where', 'what', 'when', 'which', 'who', 'into', 'one', 'after', 'another', 'over', 'through', 'up', 'out']);

/** Fold diacritics and typographic quotes: the site's search does not handle diacritics. */
export function plainTerms(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
}

function titleWords(reference) {
  const title = String(reference ?? '')
    .replace(/^(?:[A-Za-z]{1,5}\s+)?[\dIVXLC]+(?:\s*[:.]\s*\d+)*(?:\s*[-–—]\s*\d+(?:[:.]\d+)*)?\s*:?\s*/, '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/["“”]/g, '');
  return title.split(/\s+/).filter((w) => /\p{L}/u.test(w));
}

/**
 * The English title of Ṭhānissaro's translation, taken from its dhammatalks.org citation
 * ("AN 3:66 To the Kālāmas" → "To the Kalamas"). Bracketed glosses and ordinals such as "(1)" are dropped.
 * Returns null when the title is too generic to identify talks about the passage. A title qualifies with
 * three or more distinctive words, or with at least three words of which one is a Pāli name or term
 * (written with diacritics, such as "Kālāmas"). Common English phrases such as "Mindfulness of Breathing"
 * or "An Angry Person" do not qualify: they turn up in many talks that are not about the sutta.
 */
export function phraseFromReference(reference) {
  const raw = titleWords(reference);
  if (!raw.length) return null;
  const distinctive = raw.filter((w) => !MINOR.has(plainTerms(w).toLowerCase()));
  const pali = distinctive.some((w) => w.normalize('NFD') !== w.normalize('NFD').replace(/\p{M}/gu, ''));
  if (!(distinctive.length >= 3 || (pali && raw.length >= 3))) return null;
  return plainTerms(raw.join(' '));
}

const wordKey = (text) => ` ${plainTerms(text).toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim()} `;
let titleIndex = null;
/**
 * True when the phrase also appears, as whole words, in the title of a different dhammatalks.org translation
 * (for example a phrase that is only part of a longer title). Such a phrase cannot single out one sutta.
 */
export function sharedPhrase(phrase, url, canon) {
  if (!titleIndex) {
    titleIndex = new Map();
    for (const links of Object.values(canon.load().translations)) {
      for (const l of links) if (l.source === 'dhammatalks' && l.url && !titleIndex.has(l.url)) titleIndex.set(l.url, wordKey(titleWords(l.reference).join(' ')));
    }
  }
  const key = wordKey(phrase);
  for (const [other, title] of titleIndex) if (other !== url && title.includes(key)) return true;
  return false;
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
  // The pager links to the next page as "...&page=N"; "(?![0-9])" keeps page=2 from matching page=20.
  return { url, results: parseTalkResults(html), has_more: new RegExp(`[?&;]page=${page + 1}(?![0-9])`).test(html) };
}

const MAX_SITE_PAGE = 500;
/**
 * Position in the result list, per category: "evening:2:5,morning:1:18" means the next evening result is the
 * 6th on site page 2 and the next morning result the 19th on site page 1. Categories left out are finished.
 */
export function parseCursor(cursor, categories) {
  const state = [];
  for (const part of String(cursor).split(',')) {
    const m = part.trim().match(/^(evening|morning):(\d{1,3}):(\d{1,3})$/);
    if (!m || !categories.includes(m[1]) || state.some((s) => s.category === m[1])) throw new Error('cursor is not valid for this search: pass back next_cursor unchanged, with the same query, passage and category.');
    const page = Number(m[2]), offset = Number(m[3]);
    if (page < 1 || page > MAX_SITE_PAGE || offset > 100) throw new Error('cursor is out of range.');
    state.push({ category: m[1], page, offset });
  }
  return state;
}
const formatCursor = (state) => state.map((s) => `${s.category}:${s.page}:${s.offset}`).join(',');

/**
 * Search talks by topic (`query`) or by passage (`passage`, resolved with the bundled canon).
 * `fetchHtml` is injectable for tests.
 */
export async function findTalks({ query, passage, category = 'all', page = 1, limit = 10, cursor } = {}, { canon, fetchHtml = defaultFetch } = {}) {
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
    const candidate = dt ? phraseFromReference(dt.reference) : null;
    const shared = candidate ? sharedPhrase(candidate, dt.url, canon) : false;
    const phrase = shared ? null : candidate;
    passageInfo = { id: unit.id, citation: unit.acronym, title: unit.title || null, translation_url: dt?.url ?? null, translation_title: candidate };
    if (!phrase) {
      const why = via ? `${unit.acronym} has no translation page of its own on dhammatalks.org (only its chapter, ${via.acronym}, does)`
        : !dt ? `${unit.acronym} has no linked Ṭhānissaro translation on dhammatalks.org`
          : shared ? `the title of Ṭhānissaro's translation ("${candidate}") is also part of another of his translation titles, so it cannot single out this passage`
          : `the title of Ṭhānissaro's translation ("${dt.reference}") is too general to identify talks about this passage`;
      return { source: TALKS_SOURCE, passage: passageInfo, searched_for: null, results: [], has_more: false,
        notes: [...notes, `No search was run: ${why}. dhammatalks.org has no passage-to-talk index, and a loose keyword match would be a wrong link. Try a topic query instead.`] };
    }
    terms = `"${phrase}"${query ? ` ${query}` : ''}`;
    notes.push(`dhammatalks.org has no passage-to-talk index. These talks contain the phrase "${phrase}", the title of Ṭhānissaro Bhikkhu's translation of ${unit.acronym}${query ? `, and the words "${query}"` : ''}. A match shows the words appear in the talk, not that the talk is about this sutta.`);
  } else {
    notes.push('Matches are keyword matches found by dhammatalks.org\'s search (all words; "quoted phrases" allowed). Diacritics are removed because the site\'s search does not handle them.');
  }

  const state = cursor ? parseCursor(cursor, categories) : categories.map((c) => ({ category: c, page, offset: 0 }));
  const searched = [];
  const pages = new Map();
  const load = async (st) => {
    const key = `${st.category}:${st.page}`;
    if (!pages.has(key)) {
      let found;
      try { found = await searchCategory(terms, st.category, st.page, fetchHtml); } catch (error) {
        throw new Error(`dhammatalks.org search is unavailable right now (${error.message}). Open ${searchUrl(terms, st.category, st.page)} directly or try again shortly.`);
      }
      searched.push(found.url);
      pages.set(key, found);
    }
    return pages.get(key);
  };
  // Keep a category while results remain: later on this site page, or on the next one.
  const remaining = async (st) => {
    for (;;) {
      const found = await load(st);
      if (st.offset < found.results.length) return true;
      if (!found.has_more || !found.results.length || st.page >= MAX_SITE_PAGE) return false;
      st.page += 1; st.offset = 0;
    }
  };
  // Interleave the categories (evening, morning, evening, ...) so neither is pushed out of reach.
  let active = [];
  for (const st of state) if (await remaining(st)) active.push(st);
  const seen = new Set();
  const results = [];
  while (results.length < limit && active.length) {
    const next = [];
    for (const st of active) {
      if (results.length < limit) {
        const r = (await load(st)).results[st.offset++];
        if (!seen.has(r.url)) { seen.add(r.url); results.push(r); }
      }
      if (await remaining(st)) next.push(st);
    }
    active = next;
  }
  return {
    source: TALKS_SOURCE,
    ...(passageInfo ? { passage: passageInfo } : {}),
    searched_for: terms,
    category,
    ...(cursor ? { cursor } : { page }),
    results,
    returned: results.length,
    has_more: active.length > 0,
    ...(active.length ? { next_cursor: formatCursor(active) } : {}),
    search_urls: searched,
    notes: active.length ? [...notes, 'More talks match: call again with cursor set to next_cursor (same query, passage and category) to continue exactly where this list stopped.'] : notes,
  };
}

export function register({ tool, z, citation, canon }) {
  tool('find_talks', 'Find Dhamma talks by Ṭhānissaro Bhikkhu on dhammatalks.org by topic (query) or by passage (a citation such as MN 118). Link-only: returns talk titles, dates and URLs from the site\'s own search, never talk text. Talks are commentary, not scripture.', {
    query: z.string().max(200).optional().describe('Topic keywords, e.g. "jhana", "Kalamas", "\\"right resolve\\"" (diacritics are removed).'),
    passage: citation.optional().describe('A passage; talks containing the title of Ṭhānissaro\'s translation are found. Combine with query to narrow.'),
    category: z.enum(['all', 'evening', 'morning']).default('all').describe('Evening talks, short morning talks, or both.'),
    page: z.number().int().min(1).max(50).default(1).describe('Site results page to start from (20 talks per category per page). To continue a list, use cursor instead.'),
    limit: z.number().int().min(1).max(20).default(10),
    cursor: z.string().max(100).optional().describe('next_cursor from a previous call, to continue the same search exactly where it stopped (overrides page).'),
  }, (args) => findTalks(args, { canon }), { network: true });
}
