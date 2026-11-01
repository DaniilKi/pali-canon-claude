/** English translations: Ṭhānissaro Bhikkhu (dhammatalks.org) and Access to Insight, with mirrors. */
import { fetchMirrors, plainText, decodeHtml } from './http.mjs';
import { load } from './canon.mjs';

const ATI_MIRRORS = [
  (p) => `https://accesstoinsight.org${p}.html`,
  (p) => `https://raw.githubusercontent.com/bcbsit/ati/main${p}.html`,
  (p) => `https://cdn.jsdelivr.net/gh/bcbsit/ati@main${p}.html`,
  (p) => `https://raw.githubusercontent.com/digitalpalireader/accesstoinsight/master${p}.html`,
];
const MIRROR_NAMES = ['accesstoinsight.org', 'BCBS official repository (GitHub)', 'BCBS official repository (jsDelivr CDN)', 'Digital Pali Reader mirror (GitHub)'];
const DT_LICENSE = 'CC BY-NC 4.0 — Ṭhānissaro Bhikkhu, dhammatalks.org. Free for non-commercial use with attribution; "commercial" includes any sale.';

export function atiMirrors(path) {
  if (!/^\/(tipitaka|lib|ptf|noncanon)\/[a-z0-9/._-]+$/i.test(path) && !/^\/index-(sutta|subject)$/.test(path)) {
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

async function fetchAti(path) {
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

async function fetchDhammatalks(url) {
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
  return (load().translations[unit.id] || []).map((t) => ({
    translation_id: t.source === 'ati' ? `ati:${t.path}` : `dt:${t.url.split('/suttas/')[1].replace(/\.html$/, '')}`,
    source: t.source === 'ati' ? 'Access to Insight' : 'dhammatalks.org',
    translator: t.translator, reference: t.reference || undefined, ...(t.license ? { license: t.license } : {}), match: t.match,
  }));
}

/** Fetch one translation of a text. `which` is a translation_id, a translator name fragment, or omitted for the default. */
export async function translation(unit, which, { offset = 0, limit = 12000 } = {}) {
  const links = load().translations[unit.id] || [];
  if (!links.length) {
    throw new Error(`No English translation is linked for ${unit.acronym}. Read the Pāli with get_text, or see https://suttacentral.net/${unit.id} for other translations.`);
  }
  let link;
  if (!which) {
    link = links.find((l) => l.source === 'dhammatalks') || links[0];
  } else if (/^(ati|dt):/.test(which)) {
    link = links.find((l) => (l.source === 'ati' ? `ati:${l.path}` : `dt:${l.url.split('/suttas/')[1].replace(/\.html$/, '')}`) === which);
  } else {
    const w = which.toLowerCase();
    link = links.find((l) => (l.translator || '').toLowerCase().includes(w) || l.source.includes(w));
  }
  if (!link) throw new Error(`Translation "${which}" is not linked for ${unit.acronym}. Available: ${available(unit).map((a) => `${a.translation_id} (${a.translator})`).join(', ')}.`);
  let result;
  const notes = [];
  try {
    result = link.source === 'ati' ? await fetchAti(link.path) : await fetchDhammatalks(link.url);
  } catch (error) {
    // dhammatalks.org has no mirror; fall back to the same translator's earlier version on Access to Insight.
    const sameTranslator = link.source === 'dhammatalks' && links.find((l) => l.source === 'ati' && /thanissaro/i.test(l.translator || ''));
    if (!sameTranslator) throw new Error(`Could not retrieve the translation (${error.message}). The Pāli text is still available offline with get_text; try again later or choose another translation_id.`);
    try {
      result = await fetchAti(sameTranslator.path);
    } catch {
      throw new Error('dhammatalks.org and Access to Insight (including its mirrors) are all unreachable right now. The Pāli text is still available offline with get_text.');
    }
    notes.push(`dhammatalks.org could not be reached (${error.message}); showing Ṭhānissaro Bhikkhu's earlier version from Access to Insight instead.`);
    link = sameTranslator;
  }
  if (result.fetched_from !== result.source && result.fetched_from !== 'dhammatalks.org' && result.fetched_from !== 'accesstoinsight.org') {
    notes.push(`The primary site was unavailable; text served from ${result.fetched_from}, an identical copy of the archive.`);
  }
  if (link.reference && /^(AN|SN) \d+:\d+/.test(link.reference) && !link.reference.toLowerCase().replace(/[ :]/g, '').startsWith(unit.id.replace('.', ''))) {
    notes.push(`This translation numbers the text "${link.reference.split(' ').slice(0, 2).join(' ')}" (PTS-based numbering); it is the same text as ${unit.acronym}.`);
  }
  const text = result.text;
  return {
    text_id: unit.id, citation: unit.acronym, translator: link.translator, translation_id: link.source === 'ati' ? `ati:${link.path}` : `dt:${link.url.split('/suttas/')[1].replace(/\.html$/, '')}`,
    ...result, text: text.slice(offset, offset + limit), offset, limit, total_characters: text.length,
    next_offset: offset + limit < text.length ? offset + limit : null, match: link.match, notes,
  };
}
