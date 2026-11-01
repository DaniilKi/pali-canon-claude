/** Normalize common Pali Canon citations without guessing titles or numbering systems. */
export function resolveReference(reference) {
  let value = reference.trim();
  if (/^PTS\s/i.test(value)) throw new Error('PTS page citations require source lookup; use search_texts to find a canonical ID.');
  let segment = null;
  let language = null;
  let author = null;
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    if (url.hostname !== 'suttacentral.net' || url.protocol !== 'https:') {
      throw new Error('Use a canonical reference or an HTTPS suttacentral.net text URL.');
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 3) throw new Error('Use a SuttaCentral text URL, e.g. /mn1/en/sujato.');
    [value = '', language = null, author = null] = parts;
    if (language && !/^[a-z]{2,3}(?:-[a-z0-9]+)?$/.test(language)) throw new Error('Invalid language in source URL.');
    if (author && !/^[a-z0-9_-]{1,100}$/.test(author)) throw new Error('Invalid author in source URL.');
    segment = url.hash.slice(1) || null;
  } else {
    const parts = value.split('#');
    value = parts[0];
    segment = parts[1] || null;
  }
  value = value.toLowerCase().replace(/\s+/g, '');
  // AN 3:65 is a discourse citation; a passage uses #, preserving colon segment IDs.
  value = value.replace(/^(dn|mn|sn|an|kp|dhp|ud|iti|snp|vv|pv|thag|thig|ja)(\d+):(?=\d)/, '$1$2.');
  if (!/^[a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+)*$/.test(value) || value.length > 100) {
    throw new Error('Unrecognized reference. Use MN 1, SN 56.11, AN 3.65, dhp1-20, or a SuttaCentral URL. Search titles with search_texts.');
  }
  if (segment && !/^[a-z0-9.:_-]{1,100}$/i.test(segment)) throw new Error('Invalid segment anchor.');
  return {
    uid: value,
    segment,
    language, author,
    url: `https://suttacentral.net/${value}${language ? `/${language}` : ''}${author ? `/${author}` : ''}${segment ? `#${segment}` : ''}`,
    note: 'SuttaCentral ID normalization only; use get_metadata to verify existence. PTS page citations and title names require search.',
  };
}

export function normalizeUid(uid) { return resolveReference(uid).uid; }
