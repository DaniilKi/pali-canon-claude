/** Network-backed providers: Digital Pāḷi Dictionary and Access to Insight (with mirrors). */
import { fetchPublic, fetchMirrors, decodeHtml, plainText, shortText } from './http.mjs';
import { atiMirrors, atiContent, atiNotice } from './english.mjs';
import { load, fold as foldPali, source as canonSource } from './canon.mjs';
import { liveCache } from './cache.mjs';

const DPD = 'https://www.dpdict.net';
const ATI = 'https://accesstoinsight.org';

const DPD_CHROME = /^(?:did you spot a mistake(?: in the declension table)?\??|spot a mistake\??|something(?: out of place\??| missing\??)?|missing\??|correct it here\.?|fix it here\.?|add it here\.?|report it here\.?|log it here\.?|here\.?|can you think of a better example\??|please add more idioms|if something looks out of place,?|feedback|[✔✘◑►])$/i;

/** Remove DPD website feedback prompts and the corpus-frequency table from a plain-text entry. */
export function cleanDpdText(html) {
  let text = plainText(html);
  const footer = text.search(/\n\s*Frequency of\s*\n/);
  if (footer >= 0) text = text.slice(0, footer);
  const end = text.search(/Digital Pāḷi Dictionary is a work in progress/);
  if (end >= 0) text = text.slice(0, end);
  return text.split('\n').map(line => line.trim()).filter(line => line && !DPD_CHROME.test(line)).join('\n');
}

export async function lookupPali({ word, limit = 5 }) {
  word = String(word ?? '').trim();
  if (!word || word.length > 100) throw new Error('Give one Pāli word (1–100 characters).');
  const url = `${DPD}/search_json?q=${encodeURIComponent(word)}`;
  let data;
  try {
    data = await liveCache.wrap(`dpd:${word}`, () => fetchPublic(url, { retries: 2 }));
  } catch (error) {
    throw new Error(`Digital Pāḷi Dictionary is unavailable right now (${error.message}). Open ${DPD}/?q=${encodeURIComponent(word)} directly or try again shortly.`);
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
    detail_note: 'Plain-text excerpt of the live dictionary entry (grammar, roots, examples, compounds). Dictionary glosses are reference material, not scripture.',
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
  const [sutta, subject] = await Promise.all(['/index-sutta', '/index-subject'].map((p) => fetchMirrors(atiMirrors(p))));
  atiIndexCache = { sutta: sutta.body, subject: subject.body, mirror: Math.max(sutta.mirror, subject.mirror) };
  return atiIndexCache;
}

export async function searchAti({ query, limit = 10 }) {
  query = String(query ?? '').trim();
  if (!query) throw new Error('Give a search query.');
  const terms = foldPali(query).split(/[^a-z0-9]+/).filter(Boolean);
  let pages;
  try { pages = await atiIndexes(); } catch (error) { throw new Error(`Access to Insight indexes are unreachable on all mirrors (${error.message}).`); }
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
    ...(pages.mirror ? { note: 'accesstoinsight.org was unavailable; indexes were read from its official GitHub mirror.' } : {}),
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

export function listSources() {
  const canon = canonSource();
  return {
    sources: [
      { id: 'vri', name: canon.name, role: 'Pāli text of the whole Tipiṭaka, bundled offline (no network needed).', repository: canon.repository, version: canon.commit,
        attribution: canon.attribution, terms: canon.terms,
        numbering: 'Standard citation IDs (as used by SuttaCentral and Bhikkhu Bodhi) were aligned to the VRI text at build time; PTS page numbers come from VRI page markers.' },
      { id: 'dhammatalks', name: 'dhammatalks.org — Ṭhānissaro Bhikkhu', role: 'English translations (live).', url: 'https://www.dhammatalks.org/suttas/',
        license: 'CC BY-NC 4.0', fallback: 'Ṭhānissaro\'s earlier versions on Access to Insight.' },
      { id: 'ati', name: 'Access to Insight (BCBS)', role: 'English translations, study guides and indexes (live).', url: ATI,
        mirrors: ['raw.githubusercontent.com/bcbsit/ati (official)', 'cdn.jsdelivr.net/gh/bcbsit/ati (official, CDN)', 'raw.githubusercontent.com/digitalpalireader/accesstoinsight'],
        license: 'Per page (CC BY-NC 4.0, BPS free-distribution, public domain…); notices are returned with each text.' },
      { id: 'dpd', name: 'Digital Pāḷi Dictionary', role: 'Word lookup (live).', url: DPD, license: 'CC BY-NC-SA 4.0' },
      { id: 'suttacentral', name: 'SuttaCentral', role: 'Linked only (parallels, other translations). Its content is not fetched or bundled, respecting its request that its work not be used in AI tools.', url: 'https://suttacentral.net' },
    ],
    evidence_rule: 'Quote only retrieved text. Cite the text ID, VRI paragraph or PTS page, and the translator. Distinguish Pāli, translation, dictionary gloss and your own explanation. Numbering schemes differ (standard/Bodhi vs PTS); this tool reports both where they differ.',
    offline: 'All Pāli text, citation resolution, PTS lookup and Pāli search work without internet. English translations and the dictionary need internet.',
  };
}
