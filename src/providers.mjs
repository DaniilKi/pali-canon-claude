/** Network-backed providers: Digital Pāḷi Dictionary and Access to Insight (with mirrors). */
import { fetchPublic, fetchMirrors, decodeHtml, plainText, shortText } from './http.mjs';
import { atiMirrors, atiContent, atiNotice } from './english.mjs';
import { load, linksFor, fold as foldPali, source as canonSource } from './canon.mjs';
import { liveCache } from './cache.mjs';
import { lookupOffline, DPD_PIN } from './analyse.mjs';

const DPD = 'https://www.dpdict.net';
const ATI = 'https://accesstoinsight.org';

const DPD_CHROME = /^(?:did you spot a mistake(?: in the declension table)?\??|spot a mistake\??|something(?: out of place\??| missing\??)?|missing\??|correct it here\.?|fix it here\.?|add it here\.?|report it here\.?|log it here\.?|here\.?|can you think of a better example\??|please add more idioms|if something looks out of place,?|feedback|[✔✘◑►])$/i;

// DPD sections that are tables or site chrome rather than dictionary prose: inflection tables
// (declension for nouns, conjugation for verbs), corpus frequency, feedback forms and the tab buttons.
const DPD_NOISE_DIV = /<div\b[^>]*(?:\bid\s*=\s*["'](?:declension|conjugation|inflection|frequency|feedback)_[^"']*["']|\bclass\s*=\s*["'](?:button-box|dpd-footer)["'])[^>]*>/gi;

/** Remove whole <div> elements (with nested divs) whose opening tag matches DPD_NOISE_DIV. */
function dropDpdNoise(html) {
  let out = '';
  let pos = 0;
  DPD_NOISE_DIV.lastIndex = 0;
  for (let m = DPD_NOISE_DIV.exec(html); m; m = DPD_NOISE_DIV.exec(html)) {
    if (m.index < pos) continue;
    out += html.slice(pos, m.index);
    const tags = /<div\b[^>]*>|<\/div\s*>/gi;
    tags.lastIndex = m.index + m[0].length;
    let depth = 1;
    let end = html.length;
    for (let t = tags.exec(html); t; t = tags.exec(html)) {
      depth += t[0][1] === '/' ? -1 : 1;
      if (depth === 0) { end = t.index + t[0].length; break; }
    }
    pos = end;
    DPD_NOISE_DIV.lastIndex = end;
  }
  return out + html.slice(pos);
}

/** Remove DPD inflection tables, tab buttons, website feedback prompts and the corpus-frequency table from an entry. */
export function cleanDpdText(html) {
  let text = plainText(dropDpdNoise(String(html ?? '')));
  const footer = text.search(/\n\s*Frequency of\s*\n/);
  if (footer >= 0) text = text.slice(0, footer);
  const end = text.search(/Digital Pāḷi Dictionary is a work in progress/);
  if (end >= 0) text = text.slice(0, end);
  return text.split('\n').map(line => line.trim()).filter(line => line && !DPD_CHROME.test(line)).join('\n');
}

class DpdResponseError extends Error {}

function validateDpdResponse(data) {
  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!record(data) || typeof data.summary_html !== 'string' || typeof data.dpd_html !== 'string') {
    throw new DpdResponseError('Expected string summary_html and dpd_html fields.');
  }
  if (data.license != null && (!record(data.license) || ['name', 'url', 'attribution'].some((key) => typeof data.license[key] !== 'string' || !data.license[key].trim()))) {
    throw new DpdResponseError('The supplied licence metadata is incomplete or malformed.');
  }
  return data;
}

export async function lookupPali({ word, limit = 5 }) {
  word = String(word ?? '').trim();
  if (!word || word.length > 100) throw new Error('Give one Pāli word (1–100 characters).');
  const url = `${DPD}/search_json?q=${encodeURIComponent(word)}`;
  let data;
  try {
    data = await liveCache.wrap(`dpd:${word}`, async () => validateDpdResponse(await fetchPublic(url, { retries: 2 })));
  } catch (error) {
    // Outage fallback (#23): answer from the bundled DPD subset, labelled as such.
    let offline = null;
    try { offline = lookupOffline({ word, limit }); } catch { /* bundled data missing: report the outage below */ }
    // Say what actually failed: an outage (network error, timeout, 5xx, 429, broken JSON) or a refused request (other 4xx).
    const outage = error?.retryable !== false;
    const malformed = error instanceof DpdResponseError;
    const what = malformed ? `dpdict.net returned an unusable dictionary response (${error.message})`
      : outage ? `dpdict.net is unreachable right now (${error.message})` : `dpdict.net did not answer this lookup (${error.message})`;
    if (offline) return { ...offline, note: `${what}; this answer comes from the bundled offline DPD subset (${offline.dictionary.version}), not the live site.` };
    const diagnosis = malformed ? 'Digital Pāḷi Dictionary returned an unusable response'
      : outage ? 'Digital Pāḷi Dictionary is unavailable right now' : 'Digital Pāḷi Dictionary did not answer this lookup';
    throw new Error(`${diagnosis} (${error.message}) and "${word}" is not in the bundled offline subset. Open ${DPD}/?q=${encodeURIComponent(word)} directly${outage ? ' or try again shortly' : ''}.`);
  }
  const summary = String(data.summary_html ?? '');
  const entries = [...summary.matchAll(/<p\b[^>]*class=["'][^"']*summary[^"']*["'][^>]*>([^]*?)<\/p>/gi)].map((m) => plainText(m[1]));
  const license = data.license ?? {
    name: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    attribution: 'Digital Pāḷi Dictionary by Bodhirasa Bhikkhu CC BY-NC-SA 4.0', note: 'Non-commercial use only. Derivatives must be shared alike.',
  };
  return {
    word, source: 'Digital Pāḷi Dictionary', url: `${DPD}/?q=${encodeURIComponent(word)}`,
    entries: entries.slice(0, limit), total_summary_entries: entries.length, omitted: Math.max(0, entries.length - limit),
    detail_excerpt: shortText(cleanDpdText(data.dpd_html ?? ''), 8000),
    detail_note: 'Plain-text excerpt of the live dictionary entry (grammar, roots, examples, compounds). Declension and conjugation tables are left out; open the url to see them. Dictionary glosses are reference material, not scripture.',
    attribution: license.attribution, license,
  };
}

function atiPath(value) {
  let path = String(value ?? '').trim();
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    if (!/^(www\.)?accesstoinsight\.org$/.test(url.hostname)) throw new Error('Only accesstoinsight.org links are supported.');
    path = url.pathname;
  }
  path = path.replace(/[#?].*$/, '').replace(/\.html?$/, '');
  if (!path.startsWith('/')) path = `/${path}`;
  if (/\.\.|%2f|%5c|%2e/i.test(path)) throw new Error('Invalid path.');
  if (!/^\/(tipitaka|lib|ptf|noncanon)\/[a-z0-9/._-]+$/i.test(path)) throw new Error('Use a text or study-guide path returned by search_access_to_insight, e.g. /tipitaka/mn/mn.010.than.');
  return path;
}

function anchors(fragment) {
  const out = [];
  for (const m of fragment.matchAll(/<a\b[^>]*href\s*=\s*(["'])([^]*?)\1[^>]*>([^]*?)<\/a>/gi)) {
    try {
      const url = new URL(decodeHtml(m[2]), `${ATI}/index.html`);
      if (!/(^|\.)accesstoinsight\.org$/.test(url.hostname) || !/^\/(tipitaka|lib|ptf|noncanon)\//.test(url.pathname)) continue;
      const path = url.pathname.replace(/\.html?$/, '');
      out.push({ title: plainText(m[3]), path, url: `${ATI}${path}.html` });
    } catch { /* not a usable link */ }
  }
  return out;
}

let atiIndexCache = null;

async function atiIndexes() {
  if (atiIndexCache) return atiIndexCache;
  const paths = ['/index-sutta', '/index-subject'];
  // When the site and GitHub raw are down, the CDN is the only remaining host.
  // Give transient failures there one retry, rather than abandoning the search immediately.
  const results = await Promise.allSettled(paths.map((p) => fetchMirrors(atiMirrors(p), { mirrorRetries: 1 })));
  const failures = results.flatMap((r, i) => r.status === 'rejected' ? [`${paths[i]}: ${r.reason.message}`] : []);
  if (failures.length) throw new Error(failures.join('\n'));
  const [sutta, subject] = results.map((r) => r.value);
  atiIndexCache = {
    sutta: sutta.body, subject: subject.body, mirror: Math.max(sutta.mirror, subject.mirror),
    sources: { sutta: sutta.url, subject: subject.url },
  };
  return atiIndexCache;
}

export async function searchAti({ query, limit = 10 }) {
  query = String(query ?? '').trim();
  if (!query) throw new Error('Give a search query.');
  const terms = foldPali(query).split(/[^a-z0-9]+/).filter(Boolean);
  let pages;
  try { pages = await atiIndexes(); } catch (error) { throw new Error(`Could not load the Access to Insight search indexes. Failed indexes and mirror errors:\n${error.message}`); }
  const matches = [];
  const collect = (fragment, index, heading = '') => {
    const context = plainText(`${heading} ${fragment}`);
    if (!terms.every((t) => foldPali(context).includes(t))) return;
    for (const a of anchors(fragment)) matches.push({ ...a, context: shortText(context, 600), index: index });
  };
  for (const m of atiContent(pages.sutta).matchAll(/<li\b[^>]*>([^]*?)<\/li>/gi)) collect(m[1], 'sutta index');
  for (const subject of atiContent(pages.subject).split(/(?=<dt\b)/i)) {
    const heading = subject.match(/<dt\b[^>]*>([^]*?)<\/dt>/i)?.[1] ?? '';
    for (const m of subject.matchAll(/<dd\b[^>]*>([^]*?)<\/dd>/gi)) collect(m[1], 'subject index', heading);
  }
  const d = load();
  const unique = [...new Map(matches.map((r) => [r.path, r])).values()].map((r) => {
    const textId = d.urlIndex.get(`accesstoinsight.org${r.path}`);
    return textId ? { ...r, canon_text_id: textId } : r;
  });
  return {
    query, scope: 'Access to Insight sutta and subject indexes (titles and topics, not full text).',
    results: unique.slice(0, limit), total_index_matches: unique.length, omitted: Math.max(0, unique.length - limit),
    index_sources: pages.sources,
    ...(pages.mirror ? { note: 'Some Access to Insight indexes were read from archive mirrors; index_sources lists the URL used for each index.' } : {}),
    attribution: 'Access to Insight, Barre Center for Buddhist Studies; translators and authors retain their copyrights.',
  };
}

export async function getAtiText({ path, offset = 0, limit = 12000 }) {
  path = atiPath(path);
  let result;
  try { result = await liveCache.wrap(`ati-page:${path}`, () => fetchMirrors(atiMirrors(path))); } catch (error) { throw new Error(`Could not read ${path} from Access to Insight or its mirrors (${error.message}).`); }
  const text = plainText(atiContent(result.body));
  const notice = atiNotice(result.body);
  const textId = load().urlIndex.get(`accesstoinsight.org${path}`);
  return {
    source: 'Access to Insight', url: `${ATI}${path}.html`, path,
    ...(result.mirror ? { served_from_mirror: result.url } : {}),
    ...(textId ? { canon_text_id: textId } : {}),
    title: plainText(result.body.match(/<title\b[^>]*>([^]*?)<\/title>/i)?.[1] ?? ''),
    offset, limit, total_characters: text.length, next_offset: offset + limit < text.length ? offset + limit : null,
    text: text.slice(offset, offset + limit),
    attribution: notice.citation || 'Access to Insight (BCBS Edition)', licensing: notice.licensing || 'See the page for its terms.',
  };
}

const COVERAGE_SOURCES = ['dhammatalks', 'ati', 'anandajoti'];
let coverageCache = null;

/** English translation coverage per collection (#37): texts, texts with a direct link, texts reached through a
 *  containing text (verses of a linked chapter), and links per source, with how many were matched by content. */
export function translationCoverage() {
  if (coverageCache) return coverageCache;
  const d = load();
  const rows = new Map();
  const total = { texts: 0, with_english: 0, with_english_including_inherited: 0, links: 0, content_matched_links: 0, by_source: {} };
  const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
  for (const u of d.canon.units) {
    const key = u.collection.startsWith('vin') ? 'vinaya' : u.collection;
    if (!rows.has(key)) {
      const c = d.canon.collections[u.collection] || {};
      rows.set(key, { collection: key, name: key === 'vinaya' ? 'Vinaya Piṭaka' : (c.name || key), texts: 0, with_english: 0,
        with_english_including_inherited: 0, links: 0, content_matched_links: 0, by_source: {} });
    }
    const row = rows.get(key);
    const own = d.translations[u.id] || [];
    const reach = linksFor(u).links;
    for (const o of [row, total]) {
      o.links += own.length;
      for (const l of own) {
        bump(o.by_source, COVERAGE_SOURCES.includes(l.source) ? l.source : 'other');
        if (String(l.match || '').startsWith('content')) o.content_matched_links += 1;
      }
      if (u.kind === 'range') continue;   // grouped texts count once, through their members
      o.texts += 1;
      if (own.length) o.with_english += 1;
      if (reach.length) o.with_english_including_inherited += 1;
    }
  }
  const pct = (o) => ({ ...o, percent_with_english: o.texts ? Math.round((1000 * o.with_english_including_inherited) / o.texts) / 10 : 0 });
  coverageCache = {
    note: 'Counts of texts (grouped ranges counted through their members) with an English translation link; links counts every link, including those on grouped ranges. "including_inherited" adds verses whose chapter is linked. content_matched_links were placed by the content-based linker (names, numbers and PTS spans in the translation compared with the Pāli) and audited; a text without a link may still have a translation we could not place with confidence.',
    total: pct(total),
    collections: [...rows.values()].map(pct),
  };
  return coverageCache;
}

export function listSources() {
  const canon = canonSource();
  return {
    sources: [
      { id: 'vri', name: canon.name, role: 'Pāli text of the whole Tipiṭaka, bundled offline (no network needed).', repository: canon.repository, version: canon.commit,
        attribution: canon.attribution, terms: canon.terms,
        numbering: 'Standard citation IDs (as used by SuttaCentral and Bhikkhu Bodhi) were aligned to the VRI text at build time; PTS page numbers come from VRI page markers.' },
      { id: 'vri-atthakatha', name: 'Chaṭṭha Saṅgāyana Aṭṭhakathā (VRI), romn/*.att.xml', role: 'Commentaries (get_commentary), bundled offline (server/data/commentary.json.gz), aligned to the texts by VRI paragraph number and checked against the words they quote. Commentary, not scripture.',
        repository: canon.repository, version: canon.commit, attribution: canon.attribution, terms: canon.terms },
      { id: 'parallels', name: 'Parallels and cross-references (built from the VRI canon and Aṭṭhakathā)', role: 'get_parallels: passages two canonical texts share word for word, and texts the commentary cites, built offline (server/data/parallels.json.gz, scripts/parallels/build.mjs). Every link names its source and how it was matched. No SuttaCentral data is used.',
        repository: canon.repository, version: canon.commit, attribution: canon.attribution, terms: canon.terms },
      { id: 'vri-postcanonical', name: 'Chaṭṭha Saṅgāyana Ṭīkā and Añña books (VRI), romn/*.tik.xml, *.nrf.xml and the Visuddhimagga', role: 'Post-canonical books (get_post_canonical, search_post_canonical, search_texts include_post_canonical): the Visuddhimagga and its Mahāṭīkā, the Abhidhammatthasaṅgaha, the sub-commentaries and other later works, 109 books bundled offline (server/data/postcanonical.json.gz). Not the canon: every result is labelled canonical: false. Visuddhimagga PTS pages are not available.',
        repository: canon.repository, version: canon.commit, attribution: canon.attribution, terms: canon.terms },
      { id: 'dhammatalks', name: 'dhammatalks.org — Ṭhānissaro Bhikkhu', role: 'English translations (live).', url: 'https://www.dhammatalks.org/suttas/',
        license: 'CC BY-NC 4.0', fallback: 'Ṭhānissaro\'s earlier versions on Access to Insight.' },
      { id: 'dhammatalks-talks', name: 'dhammatalks.org — Dhamma talks by Ṭhānissaro Bhikkhu', role: 'Talk titles, dates and links found through the site\'s own search (find_talks; live, link-only: talk text is never fetched). Commentary, not scripture.',
        url: 'https://www.dhammatalks.org/audio/', search: 'https://www.dhammatalks.org/search/', license: 'CC BY-NC 4.0' },
      { id: 'ati', name: 'Access to Insight (BCBS)', role: 'English translations, study guides and indexes (live).', url: ATI,
        mirrors: ['raw.githubusercontent.com/bcbsit/ati (official)', 'cdn.jsdelivr.net/gh/bcbsit/ati (official, CDN)', 'raw.githubusercontent.com/digitalpalireader/accesstoinsight'],
        license: 'Per page (CC BY-NC 4.0, BPS free-distribution, public domain…); notices are returned with each text.',
        note: 'Study-guide reading plans (reading_plan) store only the guides’ citations and links.' },
      { id: 'anandajoti', name: 'Ancient Buddhist Texts — Ānandajoti Bhikkhu', role: 'English (line-by-line Pāli/English) translations (live), 153 audited links; translation_id prefix aj:.', url: 'https://ancient-buddhist-texts.net/Texts-and-Translations/index.htm',
        license: 'CC BY-SA 3.0 Unported (site Copyright Notice, 2013; page footers link CC BY-SA 4.0). Attribute Ānandajoti Bhikkhu.', notice: 'https://ancient-buddhist-texts.net/Miscellaneous/Copyright-Notice.htm' },
      { id: 'ati-indexes', name: 'Access to Insight General Index and Numerical Index (BCBS)', role: 'Topic names and links for topic and list_topics, bundled offline (server/data/topics.json).', url: 'https://www.accesstoinsight.org/index-subject.html',
        version: '45fedca341497120651efa20e756b04a13e61089', license: 'CC BY 4.0', attribution: '“General Index” and “Numerical Index”, by Access to Insight (BCBS Edition).' },
      { id: 'dhamma-lists', name: 'Numbered lists (pali-canon-mcp curation)', role: 'dhamma_list: standard lists with defining passages; Pāli from the bundled VRI text, English glosses written for the index (not translations).', license: 'MIT (curation); Pāli under VRI terms' },
      { id: 'bmc', name: 'The Buddhist Monastic Code, Vol. I — Ṭhānissaro Bhikkhu (dhammatalks.org)', role: 'Linked only: vinaya_rule links each bhikkhu Pātimokkha rule to the section that explains it (commentary). Section URLs bundled; no text fetched or stored.', url: 'https://www.dhammatalks.org/vinaya/bmc/Section0000.html', license: 'CC BY-NC 4.0' },
      { id: 'dppn', name: 'Dictionary of Pāli Proper Names (G. P. Malalasekera, 1937–38)', role: 'Proper-name lookup (lookup_name). Linked only: entries not bundled while the licence is unconfirmed (#32).', url: 'https://ancient-buddhist-texts.net/Textual-Studies/DPPN/index.htm', license: 'Unconfirmed; probably in copyright. Nothing bundled.' },
      { id: 'calendar', name: 'Uposatha and festival calendar (computed)', role: 'Offline uposatha and festival dates for Thai Mahānikāya, Thai Dhammayut, Myanmar and Sri Lanka, computed from published rules; not official announcements.',
        code: ['splendidmoons (MIT, © 2023 Gambhiro Bhikkhu)', 'pythaidate (MIT, © 2023 Mark Hollow)', 'mmcal ceMmDateTime.js (MIT, © 2018 Yan Naing Aye)', 'Meeus, Astronomical Algorithms (2nd ed.)'], docs: 'https://github.com/DaniilKi/pali-canon-claude/blob/main/docs/calendar.md' },
      { id: 'grammars', name: 'Public-domain Pāli grammars (Duroiselle 1921, Frankfurter 1883, Müller 1884, Geiger 1916)', role: 'Linked only from pali://pronunciation; not bundled.', url: 'https://archive.org/details/in.ernet.dli.2015.61817', license: 'Public domain (verified per item; see docs/sources.md)' },
      { id: 'dpd', name: 'Digital Pāḷi Dictionary', role: 'Word lookup (live), with a bundled offline subset (headwords, grammar, roots, meanings, compound and sandhi splits) used for word-by-word passage analysis and when dpdict.net is unreachable.', url: DPD, license: 'CC BY-NC-SA 4.0',
        bundled: { ...DPD_PIN, subset: 'All headwords and roots; inflection map and deconstructor splits for the word forms of the bundled VRI root texts (server/data/dpd.json.gz). A second subset, server/data/glossary.json.gz, holds the DPD English index, multi-word meanings and sutta names (no SuttaCentral columns) for the glossary tool, English search and sutta names.' } },
      { id: 'suttacentral', name: 'SuttaCentral', role: 'Linked only (parallels, other translations). Its content is not fetched or bundled, respecting its request that its work not be used in AI tools.', url: 'https://suttacentral.net' },
    ],
    evidence_rule: 'Quote only retrieved text. Cite the text ID, VRI paragraph or PTS page, and the translator. Distinguish Pāli, translation, dictionary gloss and your own explanation. Numbering schemes differ (standard/Bodhi vs PTS); this tool reports both where they differ.',
    translation_coverage: translationCoverage(),
    offline: 'All Pāli text, citation resolution, PTS lookup and Pāli search work without internet, and so do topics, numbered lists, proper-name occurrences, paritta, Abhidhamma and Vinaya-rule lookups, daily texts, reading plans, citation finding, Pāli quotation checks, the commentary, the post-canonical books, word-by-word analysis and the uposatha and festival calendar. English translations and Dhamma talks need internet; the full dictionary is live, with a bundled DPD subset used offline.',
  };
}
