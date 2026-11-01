import { fetchPublic, decodeHtml, plainText, shortText } from './http.mjs';

const SC = 'https://suttacentral.net';
const ATI = 'https://www.accesstoinsight.org';
const DPD = 'https://www.dpdict.net';
const SC_LICENSE = 'https://suttacentral.net/licensing';

function integer(value, fallback, max) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 0 || value > max) throw new Error(`Expected an integer from 0 to ${max}.`);
  return value;
}

function page(offset, limit, fallback = 40, max = 200) {
  offset = integer(offset, 0, 1000000);
  limit = integer(limit, fallback, max);
  if (limit < 1) throw new Error('limit must be at least 1.');
  return { offset, limit };
}

function token(value, label = 'identifier') {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_.-]{0,119}$/i.test(value)) throw new Error(`Invalid ${label}. Use the identifier returned by the source.`);
  return value.toLowerCase();
}

function checkedQuery(value, label = 'query') {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) throw new Error(`${label} must contain 1–500 characters.`);
  return value.trim();
}

function scApi(path, params = {}) {
  const url = new URL(`/api/${path}`, SC);
  for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, String(value));
  return url.href;
}

function provenance(url, author, extra = {}) {
  return { source: 'SuttaCentral', url, attribution: author ? `${author}, via SuttaCentral` : 'SuttaCentral', licensing_url: SC_LICENSE, ...extra };
}

function translationInfo(item, uid) {
  return {
    language: item.lang, language_name: item.lang_name, author: item.author,
    author_uid: item.author_uid, title: plainText(item.title), segmented: Boolean(item.segmented),
    is_root: Boolean(item.is_root), publication_date: item.publication_date ?? null,
    url: `${SC}/${uid}/${item.lang}/${item.author_uid}`,
  };
}

function metadata(item) {
  return {
    uid: item.uid, reference: item.acronym ?? item.uid, title: plainText(item.translated_title || item.original_title),
    original_title: plainText(item.original_title), root_language: item.root_lang,
    description: plainText(item.blurb), type: item.type, volume_pages: item.volpages,
    translations: (item.translations ?? []).map(t => translationInfo(t, item.uid)),
    ...provenance(`${SC}/${item.uid}`),
  };
}

export async function searchTexts({ query, language = 'en', limit = 10, offset = 0, titleOffset = 0 }) {
  query = checkedQuery(query);
  language = token(language, 'language');
  ({ offset, limit } = page(offset, limit, 10, 30));
  titleOffset = integer(titleOffset, 0, 1000000);
  const url = scApi('search/instant', {
    query, language, limit, offset, selectedLanguages: JSON.stringify([...new Set([language, 'pli'])]),
  });
  const data = await fetchPublic(url);
  const hits = Array.isArray(data.hits) ? data.hits : [];
  const suttaplex = Array.isArray(data.suttaplex) ? data.suttaplex : [];
  const mappedHits = hits.map(item => ({
      category: item.category ?? 'text_match', uid: item.uid ?? null,
      reference: item.acronym, title: plainText(item.name || item.heading?.title || item.root_name),
      language: item.lang, root_language: item.root_lang, author: item.author,
      author_uid: item.author_uid, segment_id: item.segmented_uid ?? null,
      excerpts: (item.highlight?.content ?? []).slice(0, 3).map(text => shortText(text)),
      url: item.url ? new URL(item.url, SC).href : (item.uid ? `${SC}/${item.uid}` : `${SC}/search?query=${encodeURIComponent(query)}`),
    }));
  const results = mappedHits.filter(item => item.category !== 'dictionary');
  const titleMatches = suttaplex.slice(titleOffset, titleOffset + limit).map(item => ({
    uid: item.uid, reference: item.acronym, title: plainText(item.translated_title || item.original_title),
    root_language: item.root_lang, description: shortText(item.blurb, 700),
    editions_in_requested_language: (item.translations ?? []).filter(t => t.lang === language).map(t => ({ author_uid: t.author_uid, author: t.author })),
    url: `${SC}/${item.uid}`,
  }));
  return {
    query, language, scope: 'SuttaCentral texts, titles and dictionary matches; includes non-Pāli parallel traditions.',
    upstream_total: data.total ?? null, offset, limit, results: results.slice(0, limit),
    title_matches: titleMatches, total_title_matches: suttaplex.length, title_offset: titleOffset,
    next_title_offset: titleOffset + limit < suttaplex.length ? titleOffset + limit : null,
    dictionary_matches: mappedHits.filter(item => item.category === 'dictionary').slice(0, 2),
    returned: Math.min(results.length, limit),
    next_offset: Number(data.total) > offset + limit ? offset + limit : null,
    pagination_note: 'offset/next_offset page upstream content hits; titleOffset/next_title_offset independently page title matches. Dictionary additions may affect page sizes; upstream_total is not an exact count of unique suttas.',
    shortened_result_count: Math.max(0, results.length - limit),
    ...provenance(`${SC}/search?query=${encodeURIComponent(query)}`, undefined, { api_url: url }),
  };
}

export async function getMetadata({ uid }) {
  uid = token(uid);
  const data = await fetchPublic(scApi(`suttaplex/${uid}`));
  const items = Array.isArray(data) ? data.filter(item => item.uid) : [];
  const exact = items.find(item => item.uid === uid);
  if (exact) return metadata(exact);
  if (!items.length) throw new Error(`No SuttaCentral text or collection found for ${uid}. Use search_texts or browse_canon to discover a valid identifier.`);
  return { uid, type: 'collection', items: items.slice(0, 100).map(metadata), omitted: Math.max(0, items.length - 100), ...provenance(`${SC}/${uid}`) };
}

export async function getText({ uid, language = 'en', author = 'sujato', offset = 0, limit = 60, includePali = true, includeNotes = false, segment }) {
  uid = token(uid); language = token(language, 'language'); author = token(author, 'author');
  ({ offset, limit } = page(offset, limit, 60, 200));
  const data = await fetchPublic(scApi(`suttas/${uid}/${author}`, { lang: language }));
  if (!data.suttaplex?.uid) throw new Error(`No text found for ${uid}. Check its identifier with search_texts or browse_canon.`);
  const selected = [data.translation, data.bilara_translated_text, data.root_text, data.bilara_root_text]
    .find(item => item?.author_uid === author && item?.lang === language);
  if (!selected) {
    const available = (data.suttaplex.translations ?? []).filter(t => t.lang === language).map(t => t.author_uid);
    throw new Error(`The requested ${language}/${author} edition is unavailable for ${uid}. Available authors in this language: ${available.join(', ') || 'none'}. Use get_metadata to inspect all editions; no translation was substituted.`);
  }
  const url = `${SC}/${uid}/${language}/${author}`;
  const common = {
    uid, reference: data.suttaplex.acronym ?? uid, language, author_uid: author, author: selected.author,
    root_language: data.suttaplex.root_lang,
    title: plainText(selected.title || data.suttaplex.translated_title || data.suttaplex.original_title),
    root_title: plainText(data.suttaplex.original_title),
    ...provenance(url, selected.author),
  };
  if (data.segmented || data.bilara_translated_text?.author_uid === author) {
    const bilara = await fetchPublic(scApi(`bilarasuttas/${uid}/${author}`, { lang: language }));
    const root = bilara.root_text ?? {};
    const translated = bilara.translation_text ?? {};
    const keys = Array.isArray(bilara.keys_order) && bilara.keys_order.length ? bilara.keys_order : [...new Set([...Object.keys(root), ...Object.keys(translated)])];
    if (!keys.length) throw new Error(`The ${uid}/${language}/${author} edition returned no segments.`);
    if (segment !== undefined) {
      if (typeof segment !== 'string' || !/^(?:[a-z0-9_.-]+:)?[a-z0-9_.-]+$/i.test(segment)) throw new Error('Invalid segment. Use an exact segment ID returned by get_text.');
      const requested = segment.includes(':') ? segment : `${uid}:${segment}`;
      const position = keys.indexOf(requested);
      if (position < 0) throw new Error(`Segment ${requested} is unavailable in this edition. Retrieve the text to inspect actual segment IDs.`);
      offset = position;
    }
    const segments = [];
    let outputCharacters = 0;
    for (const id of keys.slice(offset, offset + limit)) {
      const segment = {
        id, text: plainText(language === 'pli' && author === 'ms' ? root[id] : translated[id]),
        ...(includePali ? { pali: data.suttaplex.root_lang === 'pli' ? plainText(root[id]) : null } : {}),
        ...(includeNotes ? { note: plainText(bilara.comment_text?.[id]), variants: plainText(bilara.variant_text?.[id]), references: plainText(bilara.reference_text?.[id]) } : {}),
        url: `${url}#${id.slice(id.indexOf(':') + 1)}`,
      };
      const length = JSON.stringify(segment).length;
      if (segments.length && outputCharacters + length > 80000) break;
      segments.push(segment); outputCharacters += length;
    }
    return {
      ...common, format: 'aligned_segments', total_segments: keys.length, offset, limit,
      returned: segments.length, next_offset: offset + segments.length < keys.length ? offset + segments.length : null,
      has_more: offset + segments.length < keys.length,
      segments, notes_included: includeNotes,
      licensing_note: 'Bilara translations are CC0. Root editions, legacy translations and other material retain their own source terms.',
      license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    };
  }
  if (segment !== undefined) throw new Error('This is an unsegmented legacy edition. Exact Bilara segments are unavailable; use paragraph offset and limit.');
  const html = selected.text;
  if (!html) throw new Error(`This edition exists but the provider returned no readable text. Open ${url}.`);
  const text = plainText(html);
  // Legacy texts use paragraphs, not fabricated Bilara segment IDs.
  const paragraphs = text.split(/\n+/).filter(Boolean);
  const selectedParagraphs = [];
  let characters = 0;
  for (const paragraph of paragraphs.slice(offset, offset + limit)) {
    if (selectedParagraphs.length && characters + paragraph.length > 80000) break;
    selectedParagraphs.push(paragraph); characters += paragraph.length;
  }
  return {
    ...common, format: 'legacy_paragraphs', offset, limit, total_paragraphs: paragraphs.length,
    returned: selectedParagraphs.length, next_offset: offset + selectedParagraphs.length < paragraphs.length ? offset + selectedParagraphs.length : null,
    has_more: offset + selectedParagraphs.length < paragraphs.length,
    paragraphs: selectedParagraphs, pali: null,
    alignment_note: 'This edition is not segmented. Paragraph offsets are local extraction positions, not canonical references. Pāli alignment is unavailable for this edition.',
    licensing_note: 'Legacy translation: consult the linked edition and SuttaCentral licensing page for its specific terms; do not assume CC0.',
  };
}

export async function getParallels({ uid, offset = 0, limit = 50 }) {
  uid = token(uid);
  ({ offset, limit } = page(offset, limit, 50, 200));
  const data = await fetchPublic(scApi(`parallels/${uid}`));
  const parallels = [];
  for (const [anchor, entries] of Object.entries(data ?? {})) {
    if (!Array.isArray(entries)) continue;
    for (const item of entries) {
      const target = item.to ?? {};
      parallels.push({
        from: anchor, uid: target.uid, reference: target.acronym, title: plainText(target.translated_title || target.original_title),
        root_language: target.root_lang, relationship: item.type ?? target.type, remark: plainText(item.remark),
        resembling: Boolean(item.resembling), url: target.uid ? `${SC}/${target.uid}` : null,
        translations: (target.translations ?? []).map(t => translationInfo(t, target.uid)),
      });
    }
  }
  return { uid, parallels: parallels.slice(offset, offset + limit), total: parallels.length, offset, limit, next_offset: offset + limit < parallels.length ? offset + limit : null, interpretation: 'Relationships are supplied by SuttaCentral. Full, partial and resembling parallels are distinct; a parallel is not a claim of identical wording. Empty results mean no indexed relationships were returned, not proof that no parallel exists.', ...provenance(`${SC}/${uid}`) };
}

export async function browseCanon({ uid = 'sutta', offset = 0, limit = 40 }) {
  uid = token(uid);
  ({ offset, limit } = page(offset, limit, 40, 100));
  const data = await fetchPublic(scApi(`menu/${uid}`, { language: 'en' }));
  const node = Array.isArray(data) ? data.find(item => item.uid === uid) : null;
  if (!node) throw new Error(`No browse node found for ${uid}. Start with sutta, vinaya, abhidhamma, dn, mn, sn, an or minor.`);
  const children = node.children ?? [];
  return {
    uid, title: plainText(node.translated_name || node.root_name), original_title: plainText(node.root_name),
    description: plainText(node.blurb), root_language: node.root_lang_iso,
    offset, limit, total_children: children.length,
    next_offset: offset + limit < children.length ? offset + limit : null,
    children: children.slice(offset, offset + limit).map(item => ({
      uid: item.uid, reference: item.acronym, title: plainText(item.translated_name || item.root_name),
      original_title: plainText(item.root_name), root_language: item.root_lang_iso,
      type: item.node_type, has_children: Boolean(item.has_children), range: item.child_range,
      url: `${SC}/${item.uid}`,
    })),
    note: 'SuttaCentral covers several Buddhist textual traditions. Follow nodes marked pli for Pāli. Translation availability varies, especially in Vinaya and Abhidhamma. A leaf may be opened with get_metadata/get_text even if it has no menu children.',
    ...provenance(`${SC}/${uid}`),
  };
}

export async function lookupPali({ word, limit = 5 }) {
  word = checkedQuery(word, 'word');
  limit = integer(limit, 5, 20);
  if (limit < 1) throw new Error('limit must be at least 1.');
  const url = `${DPD}/search_json?q=${encodeURIComponent(word)}`;
  const data = await fetchPublic(url);
  const summary = String(data.summary_html ?? '');
  const entries = [...summary.matchAll(/<p\b[^>]*class=["'][^"']*summary[^"']*["'][^>]*>([^]*?)<\/p>/gi)].map(m => plainText(m[1]));
  const license = data.license ?? {
    name: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    attribution: 'Digital Pāḷi Dictionary by Bodhirasa Bhikkhu CC BY-NC-SA 4.0',
    note: 'Non-commercial use only. Derivatives must be shared alike.',
  };
  return {
    word, source: 'Digital Pāḷi Dictionary', url: `${DPD}/?q=${encodeURIComponent(word)}`,
    entries: entries.slice(0, limit), total_summary_entries: entries.length, omitted: Math.max(0, entries.length - limit),
    // The live API supplies HTML rather than structured headwords. Keep the full source link and the license.
    detail_excerpt: shortText(data.dpd_html ?? '', 12000),
    detail_note: 'Plain-text excerpt of the live dictionary response, capped at 12,000 characters. Entries may include grammar, roots, examples and compounds. Open the source for complete entries.',
    attribution: license.attribution, license,
  };
}

function fold(value) { return plainText(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

function atiUrl(path, base = ATI) {
  if (typeof path !== 'string' || path.length > 1000 || /[\\\x00-\x1f]/.test(path)) throw new Error('Invalid Access to Insight path.');
  const url = new URL(path, base);
  if (!['www.accesstoinsight.org', 'accesstoinsight.org'].includes(url.hostname) || url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Only public Access to Insight URLs are supported.');
  if (/%(?:2f|5c|2e)/i.test(url.pathname)) throw new Error('Encoded path separators are not accepted.');
  if (!/^\/(?:tipitaka|lib|ptf|noncanon)\//.test(url.pathname) && !/^\/(?:index-(?:sutta|subject|number|title|author|names|similes)|glossary|abbrev|faq|begin|befriending|help)(?:\.html)?$/.test(url.pathname)) throw new Error('Use a text, study guide, or index path returned by search_access_to_insight.');
  if (/\.(?:zip|pdf|mp3|exe|js|css|jpg|png|xml)$/i.test(url.pathname)) throw new Error('This tool reads HTML texts only.');
  url.search = '';
  return url;
}

function atiContent(html) {
  const start = html.indexOf('<!-- BEGIN COPYRIGHTED TEXT CHUNK -->');
  const end = html.indexOf('<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->');
  return start >= 0 && end > start ? html.slice(start, end) : html.match(/<body\b[^>]*>([^]*?)<\/body>/i)?.[1] ?? html;
}

function anchors(fragment, base) {
  const results = [];
  for (const match of fragment.matchAll(/<a\b[^>]*href\s*=\s*(["'])([^]*?)\1[^>]*>([^]*?)<\/a>/gi)) {
    try {
      const url = atiUrl(decodeHtml(match[2]), base);
      if (!/^\/(?:tipitaka|lib|ptf|noncanon)\//.test(url.pathname)) continue;
      results.push({ title: plainText(match[3]), path: url.pathname + url.hash, url: url.href });
    } catch { /* Offsite, navigation and unsupported media are not search results. */ }
  }
  return results;
}

export async function searchAti({ query, limit = 10 }) {
  query = checkedQuery(query); limit = integer(limit, 10, 30);
  if (limit < 1) throw new Error('limit must be at least 1.');
  const indexes = ['/index-sutta.html', '/index-subject.html'];
  const pages = await Promise.all(indexes.map(path => fetchPublic(`${ATI}${path}`, { json: false })));
  const terms = fold(query).split(' ');
  const matches = [];
  function collect(fragment, index, heading = '') {
    const context = plainText(`${heading} ${fragment}`);
    const folded = fold(context);
    if (!terms.every(term => folded.includes(term))) return;
    for (const result of anchors(fragment, `${ATI}${index}`)) matches.push({ ...result, context: shortText(context, 700), index_url: `${ATI}${index}` });
  }
  for (const match of atiContent(pages[0]).matchAll(/<li\b[^>]*>([^]*?)<\/li>/gi)) collect(match[1], indexes[0]);
  const subjects = atiContent(pages[1]).split(/(?=<dt\b)/i);
  for (const subject of subjects) {
    const heading = subject.match(/<dt\b[^>]*>([^]*?)<\/dt>/i)?.[1] ?? '';
    for (const match of subject.matchAll(/<dd\b[^>]*>([^]*?)<\/dd>/gi)) collect(match[1], indexes[1], heading);
  }
  const unique = [...new Map(matches.map(result => [result.url, result])).values()];
  return {
    query, scope: 'Access to Insight sutta-title/reference and subject indexes; not a full-text search of every document.',
    results: unique.slice(0, limit), total_index_matches: unique.length, omitted: Math.max(0, unique.length - limit),
    source: 'Access to Insight', url: `${ATI}/index-subject.html`,
    attribution: 'Access to Insight, Barre Center for Buddhist Studies; original translators and authors retain their copyrights.',
    licensing_url: `${ATI}/faq.html#copyright`,
    note: 'This archive is selective, not the complete Tipiṭaka. Use a returned path with get_access_to_insight_text. Individual texts have distinct free-distribution or Creative Commons terms.',
  };
}

export async function getAtiText({ path, offset = 0, limit = 12000 }) {
  const url = atiUrl(path, ATI);
  ({ offset, limit } = page(offset, limit, 12000, 30000));
  const fetchUrl = new URL(url); fetchUrl.hash = '';
  const html = await fetchPublic(fetchUrl.href, { json: false });
  const text = plainText(atiContent(html));
  const provenanceStart = html.search(/<div\b[^>]*id=["']F_provenance["']/i);
  const citationStart = html.search(/<div\b[^>]*id=["']F_citation["']/i);
  const licensingHtml = provenanceStart >= 0 ? html.slice(provenanceStart, citationStart > provenanceStart ? citationStart : provenanceStart + 10000) : '';
  const citation = citationStart >= 0 ? plainText(html.slice(citationStart, html.indexOf('</div>', citationStart))) : '';
  return {
    source: 'Access to Insight', url: url.href, path: url.pathname + url.hash,
    title: plainText(html.match(/<title\b[^>]*>([^]*?)<\/title>/i)?.[1] ?? ''),
    format: 'plain_text_characters', offset, limit, total_characters: text.length,
    next_offset: offset + limit < text.length ? offset + limit : null,
    text: text.slice(offset, offset + limit),
    attribution: citation || 'Access to Insight (BCBS Edition); see source page for author and translator.',
    licensing: plainText(licensingHtml) || 'Consult the original page for the specific copyright and distribution terms.',
    licensing_url: `${ATI}/faq.html#copyright`,
    extraction_note: 'HTML formatting removed. Offsets count extracted characters, not canonical verses. URL fragments identify the source anchor; extraction starts at the page beginning unless an offset is supplied. Includes original notes where present.',
  };
}

export function listSources() {
  return {
    sources: [
      { id: 'suttacentral', name: 'SuttaCentral', url: SC, tools: ['search_texts', 'get_text', 'get_metadata', 'get_parallels', 'browse_canon'], coverage: 'Pāli Sutta, Vinaya and Abhidhamma collections plus parallels in other traditions; available texts and translations vary.', licensing: 'Bilara translations CC0; legacy and other material have edition-specific terms.', licensing_url: SC_LICENSE },
      { id: 'access-to-insight', name: 'Access to Insight', url: ATI, tools: ['search_access_to_insight', 'get_access_to_insight_text'], coverage: 'Selected English sutta translations, study guides and Theravāda articles; search is title/reference and subject indexes.', licensing: 'Per-page copyright and license; many texts CC BY-NC, others free-distribution terms. Preserve notices. No bundled text corpus.', licensing_url: `${ATI}/faq.html#copyright` },
      { id: 'digital-pali-dictionary', name: 'Digital Pāḷi Dictionary', url: DPD, tools: ['lookup_pali'], coverage: 'Live Pāli/English dictionary queries, grammar, roots and examples as supplied by DPD.', licensing: 'CC BY-NC-SA 4.0. Attribution required; noncommercial use only; derivatives shared alike.', licensing_url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
      { id: 'dhammatalks', name: 'Dhammatalks.org', url: 'https://www.dhammatalks.org/suttas/', tools: [], coverage: 'Supplementary reading link: Ṭhānissaro Bhikkhu translations and study guides. Not an implemented retrieval provider.', licensing: 'Consult each publication’s free-distribution terms.' },
    ],
    access: 'Public read-only requests. No API keys, account access, paid services, or bundled text corpus. Internet required.',
    evidence_rule: 'Cite the retrieved edition, translator, stable text ID and segment anchor where available. Distinguish scripture, translator notes and model explanation. A failed or empty search does not prove absence from the canon.',
  };
}
