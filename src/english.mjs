/** English translations: Ṭhānissaro Bhikkhu (dhammatalks.org), Access to Insight (with mirrors) and Ānandajoti Bhikkhu (Ancient Buddhist Texts). */
import { fetchMirrors, plainText, decodeHtml } from './http.mjs';
import { load, linksFor, translationId, sourceName, ANANDAJOTI_BASE, ANANDAJOTI_LICENSE } from './canon.mjs';
import { liveCache } from './cache.mjs';
import { createHash } from 'node:crypto';
const prefixHash = (text, offset) => createHash('sha256').update(text.slice(0, offset)).digest('hex');

const ATI_MIRRORS = [
  (p) => `https://accesstoinsight.org${p}.html`,
  (p) => `https://raw.githubusercontent.com/bcbsit/ati/main${p}.html`,
  (p) => `https://cdn.jsdelivr.net/gh/bcbsit/ati@main${p}.html`,
  (p) => `https://raw.githubusercontent.com/digitalpalireader/accesstoinsight/master${p}.html`,
];
const MIRROR_NAMES = ['accesstoinsight.org', 'BCBS official repository (GitHub)', 'BCBS official repository (jsDelivr CDN)', 'Digital Pali Reader mirror (GitHub)'];
const DT_LICENSE = 'CC BY-NC 4.0 — Ṭhānissaro Bhikkhu, dhammatalks.org. Free for non-commercial use with attribution; "commercial" includes any sale.';

export function atiMirrors(path) {
  if (/\.\./.test(path) || (!/^\/(tipitaka|lib|ptf|noncanon)\/[a-z0-9/._-]+$/i.test(path) && !/^\/index-(sutta|subject)$/.test(path))) {
    throw new Error('Unsupported Access to Insight path.');
  }
  return ATI_MIRRORS.map((f) => f(path));
}

export function atiContent(html) {
  const start = html.indexOf('<!-- BEGIN COPYRIGHTED TEXT CHUNK -->');
  const end = html.indexOf('<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->');
  return start >= 0 && end > start ? html.slice(start, end) : html.match(/<body\b[^>]*>([^]*?)<\/body>/i)?.[1] ?? html;
}

export function atiNotice(html) {
  const p = html.search(/<div\b[^>]*id=["']F_provenance["']/i);
  const c = html.search(/<div\b[^>]*id=["']F_citation["']/i);
  const licensing = p >= 0 ? plainText(html.slice(p, c > p ? c : p + 10000)) : '';
  const citation = c >= 0 ? plainText(html.slice(c, html.indexOf('</div>', c))) : '';
  return { licensing, citation };
}

// Successful page fetches are kept briefly in memory (see cache.mjs) with their notices; failures never are.
const fetchAti = (path) => liveCache.wrap(`ati:${path}`, () => fetchAtiLive(path));
const fetchDhammatalks = (url) => liveCache.wrap(`dt:${url}`, () => fetchDhammatalksLive(url));
const fetchAnandajotiPage = (path) => liveCache.wrap(`aj:${path}`, () => fetchAnandajotiPageLive(path));

/** Only pages of the Ancient Buddhist Texts "Texts and Translations" section are fetched. */
export function anandajotiUrl(path) {
  if (/\.\./.test(path) || !/^\/Texts-and-Translations\/[A-Za-z0-9 _.-]+(\/[A-Za-z0-9 _.-]+)*\.htm$/.test(path)) {
    throw new Error('Unsupported Ancient Buddhist Texts path.');
  }
  return ANANDAJOTI_BASE + encodeURI(path);
}

/**
 * Readable text of one Ancient Buddhist Texts page: the line-by-line Pāli and English, with the
 * translator's notes marked [Note: …] and commentary blocks marked as commentary. Navigation, the
 * floating legend and the footer are dropped.
 */
export function anandajotiContent(html) {
  let body = html.match(/<body\b[^>]*>([^]*)<\/body>/i)?.[1] ?? html;
  const cut = body.search(/<div\b[^>]*id=["']infowrapper["']|<footer\b|<p\b[^>]*class=["']NavBar3["'][^>]*>\s*<a\b[^>]*History\.htm/i);
  if (cut > 0) body = body.slice(0, cut);
  body = body
    .replace(/<p\b[^>]*class=["']NavBar\d["'][^>]*>[^]*?<\/p>/gi, '')
    .replace(/<span\b[^>]*class=["']TT["'][^>]*>\s*<span\b[^>]*>([^]*?)<\/span>\s*<sup\b[^>]*><\/sup>\s*<\/span>/gi, ' [Note: $1] ')
    .replace(/<div\b[^>]*class=["']vannana["'][^>]*>([^]*?)<\/div>/gi, '<p>[Commentary (Aṭṭhakathā) begins]</p>$1<p>[Commentary ends]</p>');
  return plainText(body);
}

async function fetchAnandajotiPageLive(path) {
  const { body } = await fetchMirrors([anandajotiUrl(path)]);
  return { title: decodeHtml(body.match(/<title\b[^>]*>([^]*?)<\/title>/i)?.[1] ?? '').trim(), text: anandajotiContent(body) };
}

/** Fetch an Ānandajoti translation. Multi-page works are read part by part, only as far as `need` characters. */
async function fetchAnandajoti(link, need) {
  const parts = link.parts || [link.path];
  let text = '';
  let title = '';
  let read = 0;
  for (const part of parts) {
    const page = await fetchAnandajotiPage(part);
    if (!title) title = page.title;
    text += (text ? '\n\n' : '') + page.text;
    read += 1;
    if (text.length >= need) break;
  }
  return {
    source: 'Ancient Buddhist Texts', url: link.url, fetched_from: 'ancient-buddhist-texts.net',
    fetched_url: ANANDAJOTI_BASE + encodeURI(parts[0]), title: link.english || title, text,
    parts_read: read, parts_total: parts.length,
    attribution: 'Edited and translated from the Pāli by Ānandajoti Bhikkhu (Ancient Buddhist Texts, ancient-buddhist-texts.net).',
    license: ANANDAJOTI_LICENSE,
  };
}

async function fetchAtiLive(path) {
  const { body, url, mirror } = await fetchMirrors(atiMirrors(path));
  const notice = atiNotice(body);
  return {
    source: 'Access to Insight', url: `https://accesstoinsight.org${path}.html`, fetched_from: MIRROR_NAMES[mirror], fetched_url: url,
    title: plainText(body.match(/<title\b[^>]*>([^]*?)<\/title>/i)?.[1] ?? ''),
    text: plainText(atiContent(body)),
    attribution: notice.citation || 'Access to Insight (BCBS Edition)',
    license: notice.licensing || 'See the page for its copyright and distribution terms.',
  };
}

async function fetchDhammatalksLive(url) {
  const { body } = await fetchMirrors([url]);
  const start = body.search(/<div\b[^>]*id=["']sutta["']/i);
  const end = body.search(/<div\b[^>]*class=["'][^"']*footer/i);
  const chunk = start >= 0 ? body.slice(start, end > start ? end : undefined) : body;
  return {
    source: 'dhammatalks.org', url, fetched_from: 'dhammatalks.org', fetched_url: url,
    title: decodeHtml(body.match(/<title\b[^>]*>([^]*?)<\/title>/i)?.[1] ?? '').split(' | ').slice(0, 2).join(' — '),
    text: plainText(chunk),
    attribution: 'Translated from the Pāli by Ṭhānissaro Bhikkhu (dhammatalks.org).',
    license: DT_LICENSE,
  };
}

/** List the English translations linked to a text. */
export function available(unit) {
  return linksFor(unit).links.map((t) => ({
    translation_id: translationId(t),
    source: sourceName(t),
    translator: t.translator, reference: t.reference || undefined, ...(t.license ? { license: t.license } : {}), match: t.match,
    ...(t.commentary ? { includes_commentary: true } : {}),
  }));
}

const translatorKey = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Select only from supplied link metadata; never infer which of several translators was intended. */
export function selectTranslation(links, which, citation) {
  if (!which) return { link: links.find(link => link.source === 'dhammatalks') || links[0], matchingVersions: [] };
  if (/^(ati|dt|aj):/.test(which)) return { link: links.find(link => translationId(link) === which), matchingVersions: [] };
  const wanted = translatorKey(which);
  const exact = links.filter(link => translatorKey(link.translator) === wanted);
  const matches = exact.length ? exact : links.filter(link => translatorKey(link.translator).includes(wanted) || link.source.includes(wanted));
  if (new Set(matches.map(link => translatorKey(link.translator))).size > 1) {
    throw new Error(`Ambiguous translation selector "${which}" for ${citation}: it matches different translators. Use an exact translation_id: ${matches.map(link => `${translationId(link)} (${link.translator})`).join(', ')}.`);
  }
  return { link: matches[0], matchingVersions: matches };
}

/** Fetch one translation of a text. `which` is a translation_id, an unambiguous translator name fragment, or omitted for the default. */
export async function translation(unit, which, { offset = 0, limit = 12000, prefix_sha256: expectedPrefix } = {}) {
  if (which !== undefined) {
    if (typeof which !== 'string' || !which.trim()) throw new Error('Translation selector cannot be empty or blank. Omit it for the default, or use an available translation_id or translator name.');
    which = which.trim();
  }
  if (offset > 0 && !/^(ati|dt|aj):/.test(which || '')) {
    throw new Error('Translation continuation requires the exact translation_id returned by the previous page. Use its continue_with arguments; a default or translator name can select a different version after an outage.');
  }
  if (expectedPrefix !== undefined && (typeof expectedPrefix !== 'string' || !/^[a-f0-9]{64}$/.test(expectedPrefix) || offset <= 0)) throw new Error('prefix_sha256 requires a positive continuation offset and the unchanged SHA-256 from continue_with.');
  const { links, via } = linksFor(unit);
  if (!links.length) {
    throw new Error(`No English translation is linked for ${unit.acronym}. Read the Pāli with get_text, or see https://suttacentral.net/${unit.id} for other translations.`);
  }
  let { link, matchingVersions } = selectTranslation(links, which, unit.acronym);
  if (!link) throw new Error(`Translation "${which}" is not linked for ${unit.acronym}. Available: ${available(unit).map((a) => `${a.translation_id} (${a.translator})`).join(', ')}.`);
  let result;
  const notes = via ? [`This translation covers the whole ${via.acronym}; ${unit.acronym} is part of it.`] : [];
  try {
    result = link.source === 'ati' ? await fetchAti(link.path)
      : link.source === 'anandajoti' ? await fetchAnandajoti(link, offset + limit + 1)
        : await fetchDhammatalks(link.url);
  } catch (error) {
    // dhammatalks.org has no mirror; during an outage (not for a missing page) fall back to the same
    // translator's Access to Insight version of this same text.
    const outage = !error.failures || error.failures.some((f) => !/HTTP 404/.test(f));
    const sameTranslator = outage && link.source === 'dhammatalks' && links.find((l) => l.source === 'ati' && /thanissaro/i.test(l.translator || ''));
    if (!sameTranslator) throw new Error(`Could not retrieve the translation (${error.message}). The Pāli text is still available offline with get_text; try again later or choose another translation_id.`);
    if (offset > 0) throw new Error(`Could not continue the requested translation version (${error.message}). Its character offset cannot be transferred to the earlier Access to Insight version. Retry this translation_id later, or start another translation at offset 0. The Pāli text is still available offline with get_text.`);
    try {
      result = await fetchAti(sameTranslator.path);
    } catch {
      throw new Error('dhammatalks.org and Access to Insight (including its mirrors) are all unreachable right now. The Pāli text is still available offline with get_text.');
    }
    notes.push(`dhammatalks.org could not be reached (${error.message}); showing Ṭhānissaro Bhikkhu's earlier version from Access to Insight instead.`);
    link = sameTranslator;
  }
  if (matchingVersions.length > 1) notes.push(`Several linked versions match "${which}"; selected ${translationId(link)} (${sourceName(link)}). To choose a different version, use its exact translation_id: ${matchingVersions.map(version => translationId(version)).join(', ')}.`);
  if (link.source === 'anandajoti') {
    notes.push('A line-by-line edition: each Pāli line is followed by its English translation. [Note: …] marks are the translator\'s notes, not scripture.');
    if (link.commentary) notes.push('This page also translates the commentary (Aṭṭhakathā); those passages are marked "[Commentary (Aṭṭhakathā) begins]" and are commentary, not the canonical text.');
  }
  if (result.fetched_from !== result.source && !['dhammatalks.org', 'accesstoinsight.org', 'ancient-buddhist-texts.net'].includes(result.fetched_from)) {
    notes.push(`The primary site was unavailable; text served from ${result.fetched_from}, an identical copy of the archive.`);
  }
  const theirs = (link.reference || '').match(/^(AN|SN) (\d+):(\d+)/);
  if (theirs && `${theirs[1].toLowerCase()}${theirs[2]}.${theirs[3]}` !== unit.id) {
    notes.push(`This translation numbers the text ${theirs[1]} ${theirs[2]}:${theirs[3]} (PTS-based numbering); it is the same text as ${unit.acronym}.`);
  }
  const { parts_read: partsRead, parts_total: partsTotal, ...rest } = result;
  const text = rest.text;
  const prefix = prefixHash(text, offset);
  if (expectedPrefix !== undefined && (offset > text.length || prefix !== expectedPrefix)) throw new Error('The retrieved translation prefix changed before this character offset. Cannot safely continue: restart at offset 0 and follow the new continue_with arguments.');
  if (offset > 0 && expectedPrefix === undefined) notes.push('This manually supplied character offset is not guarded against upstream text edits. Restart at offset 0 and follow continue_with to check the preceding text prefix.');
  const complete = partsRead === undefined || partsRead === partsTotal;
  const nextOffset = offset + limit < text.length ? offset + limit : null;
  if (!complete) notes.push(`This translation is spread over ${partsTotal} pages; ${partsRead} of them ${partsRead === 1 ? 'was' : 'were'} read for this request. Use continue_with to continue with this exact translation_id and next_offset.`);
  return {
    text_id: unit.id, citation: unit.acronym, translator: link.translator, translation_id: translationId(link),
    ...rest, text: text.slice(offset, offset + limit), offset, limit, total_characters: complete ? text.length : null,
    next_offset: nextOffset, prefix_sha256: prefix,
    continue_with: nextOffset === null ? null : {
      name: 'get_translation',
      arguments: { uid: unit.id, translation: translationId(link), offset: nextOffset, limit, prefix_sha256: prefixHash(text, nextOffset) },
    },
    match: link.match, notes,
  };
}
