/**
 * Parse how people actually cite the Pāli Canon into a normalised request.
 *
 * Returns one of:
 *   { kind: 'id', collection, path: [numbers…], end, raw }   e.g. MN 10, SN 56:11, AN 3.65, Dhp 1–20, Thag 1.1
 *   { kind: 'pts', collection, volume, page, raw }          e.g. M i 55, S v 420, A I 188, D ii 72, Vin i 1
 *   { kind: 'uid', uid, raw }                               e.g. pli-tv-bu-vb-pj1, tha-ap12, ds1.1
 *   { kind: 'url', host, path, raw }                        SuttaCentral, Access to Insight or dhammatalks.org links
 * The parser never guesses a title; canon lookup decides whether the text exists.
 */

const fold = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Collection names and abbreviations. Keys are folded (lower case, no diacritics, no spaces/dots).
const COLLECTIONS = {
  dn: 'dn', d: 'dn', digha: 'dn', dighanikaya: 'dn', dighanikayo: 'dn', longdiscourses: 'dn',
  mn: 'mn', m: 'mn', majjhima: 'mn', majjhimanikaya: 'mn', majjhimanikayo: 'mn', middlediscourses: 'mn', middlelengthdiscourses: 'mn',
  sn: 'sn', s: 'sn', samyutta: 'sn', samyuttanikaya: 'sn', samyuttanikayo: 'sn', connecteddiscourses: 'sn', linkeddiscourses: 'sn',
  an: 'an', a: 'an', anguttara: 'an', anguttaranikaya: 'an', anguttaranikayo: 'an', numericaldiscourses: 'an', numbereddiscourses: 'an', gradualsayings: 'an',
  kp: 'kp', khp: 'kp', khuddakapatha: 'kp',
  dhp: 'dhp', dh: 'dhp', dhammapada: 'dhp',
  ud: 'ud', udana: 'ud',
  iti: 'iti', it: 'iti', itivuttaka: 'iti',
  snp: 'snp', stnp: 'snp', suttanipata: 'snp',
  vv: 'vv', vimanavatthu: 'vv',
  pv: 'pv', petavatthu: 'pv',
  thag: 'thag', th: 'thag', thera: 'thag', theragatha: 'thag',
  thig: 'thig', thi: 'thig', therigatha: 'thig',
  ap: 'tha-ap', thaap: 'tha-ap', thap: 'tha-ap', apadana: 'tha-ap', therapadana: 'tha-ap',
  thiap: 'thi-ap', thiapadana: 'thi-ap', therapadanai: 'tha-ap', theriapadana: 'thi-ap',
  bv: 'bv', buddhavamsa: 'bv',
  cp: 'cp', cariyapitaka: 'cp',
  ja: 'ja', j: 'ja', jat: 'ja', jataka: 'ja',
  mnd: 'mnd', mahaniddesa: 'mnd', niddi: 'mnd', niddesai: 'mnd',
  cnd: 'cnd', culaniddesa: 'cnd', cullaniddesa: 'cnd', niddii: 'cnd', niddesaii: 'cnd',
  ps: 'ps', patis: 'ps', patisambhidamagga: 'ps',
  mil: 'mil', milindapanha: 'mil', milinda: 'mil',
  ne: 'ne', nett: 'ne', netti: 'ne', nettippakarana: 'ne',
  pe: 'pe', pet: 'pe', petakopadesa: 'pe',
  ds: 'ds', dhs: 'ds', dhammasangani: 'ds',
  vb: 'vb', vibh: 'vb', vibhanga: 'vb',
  dt: 'dt', dhatuk: 'dt', dhatukatha: 'dt',
  pp: 'pp', pug: 'pp', puggalapannatti: 'pp',
  kv: 'kv', kathavatthu: 'kv',
  ya: 'ya', yam: 'ya', yamaka: 'ya',
  patthana: 'patthana', patth: 'patthana', pt: 'patthana',
};

// Vinaya: rule classes of the two Vibhaṅgas, and the Khandhakas / Parivāra.
const VINAYA_CLASS = {
  pj: 'pj', parajika: 'pj', ss: 'ss', sanghadisesa: 'ss', ay: 'ay', aniyata: 'ay', np: 'np', nissaggiya: 'np',
  nissaggiyapacittiya: 'np', pc: 'pc', pacittiya: 'pc', pd: 'pd', patidesaniya: 'pd', sk: 'sk', sekhiya: 'sk',
  as: 'as', adhikaranasamatha: 'as',
};

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };
// PTS abbreviations used before volume/page citations (case kept where it disambiguates).
const PTS_COLLECTIONS = {
  d: 'dn', dn: 'dn', m: 'mn', mn: 'mn', s: 'sn', sn: 'sn', a: 'an', an: 'an', vin: 'vinaya', ud: 'ud', it: 'iti', iti: 'iti',
  vv: 'vv', pv: 'pv', ap: 'tha-ap', bv: 'bv', cp: 'cp', ja: 'ja', j: 'ja', nidd: 'nidd', patis: 'ps', ps: 'ps', mil: 'mil',
  nett: 'ne', pet: 'pe', dhs: 'ds', vibh: 'vb', kv: 'kv', pp: 'pp', pug: 'pp', dhatuk: 'dt', yam: 'ya', khp: 'kp',
};

export class CitationError extends Error {}

function numbers(text) {
  // "56.11", "56:11", "1.296–305", "010", "3 . 65"
  const cleaned = text.replace(/[–—−]/g, '-').replace(/\s*([.:,-])\s*/g, '$1').trim();
  const m = cleaned.match(/^(\d+(?:[.:,]\d+)*)(?:-(\d+(?:[.:]\d+)*))?$/);
  if (!m) return null;
  const path = m[1].split(/[.:,]/).map((n) => Number(n));
  let end = null;
  if (m[2]) {
    const tail = m[2].split(/[.:]/).map((n) => Number(n));
    end = tail.length === 1 ? tail[0] : tail;
  }
  return { path, end };
}

function parseUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new CitationError('That link is not a valid URL.'); }
  const host = url.hostname.replace(/^www\./, '');
  if (!['suttacentral.net', 'accesstoinsight.org', 'dhammatalks.org', 'ancient-buddhist-texts.net'].includes(host) || !/^https?:$/.test(url.protocol)) {
    throw new CitationError('Links are understood for suttacentral.net, accesstoinsight.org, dhammatalks.org and ancient-buddhist-texts.net only.');
  }
  // Ancient Buddhist Texts paths are case-sensitive, so the case is kept; the .htm extension is dropped, as the link index stores paths without it.
  // Some page names contain spaces ("02-At the-Palace.htm"); the index stores them decoded.
  if (host === 'ancient-buddhist-texts.net') {
    let path = url.pathname;
    try { path = decodeURI(path); } catch { /* keep as given */ }
    return { kind: 'url', host, path: path.replace(/\.htm$/, ''), raw };
  }
  if (host === 'suttacentral.net') {
    const first = url.pathname.split('/').filter(Boolean)[0] || '';
    if (!/^[a-z][a-z0-9.-]*$/.test(first)) throw new CitationError('Unrecognised SuttaCentral link.');
    return { kind: 'uid', uid: first, raw, via: 'suttacentral.net' };
  }
  return { kind: 'url', host, path: url.pathname.replace(/\.html?$/, ''), raw };
}

/** Parse one citation. Throws CitationError with a helpful message when it cannot. */
export function parseCitation(input) {
  if (typeof input !== 'string' || !input.trim()) throw new CitationError('Give a citation such as MN 10, SN 56.11, Dhp 183 or M i 55.');
  const raw = input.trim();
  if (raw.length > 300) throw new CitationError('Citation is too long.');
  if (/^https?:\/\//i.test(raw)) return parseUrl(raw);
  let text = raw.replace(/[‐‑–—−]/g, '-').replace(/\s+/g, ' ');
  text = text.replace(/^PTS[:\s]+/i, '');

  // Bilara-style segment reference "mn10:12.3" / "sn56.11:5.1": the part after ":" is a passage anchor.
  const seg = text.match(/^([a-z][a-z-]*\d+(?:\.\d+)*(?:-\d+)?):([\d.]+)$/);
  if (seg) {
    const inner = parseCitation(seg[1]);
    return { ...inner, segment: seg[2], raw };
  }

  // SuttaCentral-style IDs and Bilara segment IDs: mn10, an1.296-305, pli-tv-bu-vb-pj1, sn56.11:5.1, tha-ap12
  const sc = text.match(/^([a-z][a-z-]*?)(\d+(?:\.\d+)*(?:-\d+)?)(?::([\d.]+))?$/);
  if (sc && /^(pli-tv-|tha-ap|thi-ap)/.test(sc[1] + sc[2])) return { kind: 'uid', uid: (sc[1] + sc[2]).toLowerCase(), raw };

  // ATI style file names: mn.010, an03.065, sn56.011, snp.1.08, ud.1.10, dhp.01
  const ati = text.match(/^(dn|mn|sn|an|snp|ud|iti|thag|thig|khp|dhp)\.?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\.[a-z]+)?$/i);
  if (ati && /^(dn|mn)\./i.test(text)) return { kind: 'id', collection: ati[1].toLowerCase(), path: [Number(ati[2])], end: null, raw };

  // PTS volume/page: "M i 55", "S.V.420", "A I 188", "Vin ii 1", "Nidd I 23", "MN i 55"
  // The abbreviation and the roman volume must be separated ("M i 55", "M.i.55"), so "Iti 27" is not "It i 27".
  const pts = text.match(/^([A-Za-zāīūṭḍṇḷñṅṃ]+(?: I{1,2})?)(?:\.\s*|\s+)([IVXivx]+)(?:\.\s*|\s+)(\d+)$/);
  if (pts) {
    const key = fold(pts[1]).replace(/\./g, '');
    const romanVolume = ROMAN[pts[2].toLowerCase()] || null;
    if (pts[1] === 'Sn' || ['th', 'thi', 'thig', 'thag', 'dhp', 'snp', 'ud', 'it', 'iti', 'khp', 'kp'].includes(key)) {
      throw new CitationError(`${pts[1]} is not cited by PTS volume and page. Cite it by number (e.g. Snp 1.8, Thag 1.1, Dhp 183, Ud 1.10, Iti 27).`);
    }
    // "SN 5.420" is a sutta number, never a page; only roman numerals (or "PTS" prefix) mean volume/page.
    if (romanVolume && PTS_COLLECTIONS[key]) {
      return { kind: 'pts', collection: PTS_COLLECTIONS[key], volume: romanVolume, page: Number(pts[3]), raw };
    }
  }

  // Vinaya rules: "Bu Pj 1", "Bi Pc 5", "Pārājika 1", "Pj 1", "Kd 1", "Mv 1", "Cv 4", "Pvr 1.2"
  const vin = fold(text).replace(/vinaya\s*/, '').match(/^(bu|bhikkhu|bi|bhikkhuni)?\s*([a-z]+)\s*(\d+(?:\s*[.:-]\s*\d+)*)$/);
  if (vin && (VINAYA_CLASS[vin[2]] || ['kd', 'mv', 'cv', 'pvr', 'khandhaka', 'mahavagga', 'culavagga', 'cullavagga', 'parivara'].includes(vin[2]))) {
    const nums = numbers(vin[3]);
    if (VINAYA_CLASS[vin[2]]) {
      const who = vin[1] && /^(bi|bhikkhuni)/.test(vin[1]) ? 'bi' : 'bu';
      const end = nums.end === null ? '' : `-${Array.isArray(nums.end) ? nums.end.join('.') : nums.end}`;
      return { kind: 'uid', uid: `pli-tv-${who}-vb-${VINAYA_CLASS[vin[2]]}${nums.path.join('.')}${end}`, raw };
    }
    const khandhaka = (n, max, label) => {
      if (nums.path.length > 1) throw new CitationError(`${label} is cited by chapter number only (e.g. ${label.split(' ')[0]} 1); sections inside a khandhaka are reached by reading it with get_text.`);
      if (nums.end !== null) throw new CitationError(`Give one ${label.split(' ')[0]} chapter at a time.`);
      if (n < 1 || n > max) throw new CitationError(`${label} has chapters 1–${max}.`);
      return n;
    };
    if (['mv', 'mahavagga'].includes(vin[2])) return { kind: 'uid', uid: `pli-tv-kd${khandhaka(nums.path[0], 10, 'Mv (Mahāvagga)')}`, raw, note: 'Mahāvagga chapters are Khandhakas 1–10.' };
    if (['cv', 'culavagga', 'cullavagga'].includes(vin[2])) { const n = khandhaka(nums.path[0], 12, 'Cv (Cūḷavagga)'); return { kind: 'uid', uid: `pli-tv-kd${n + 10}`, raw, note: `Cūḷavagga ${n} is Khandhaka ${n + 10}.` }; }
    if (['kd', 'khandhaka'].includes(vin[2])) return { kind: 'uid', uid: `pli-tv-kd${khandhaka(nums.path[0], 22, 'Kd (Khandhaka)')}`, raw };
    return { kind: 'uid', uid: `pli-tv-pvr${nums.path.join('.')}`, raw };
  }

  // "Sn" (Sutta Nipāta) versus "SN" (Saṃyutta): standard usage is case-sensitive.
  const m = text.match(/^([A-Za-zāīūṭḍṇḷñṅṃĀĪŪṬḌṆḶÑṄṂ .-]+?)\.?\s*(\d[\d\s.:,-]*)$/);
  if (!m) throw new CitationError(`Could not read "${raw}". Use forms like MN 10, SN 56.11, AN 3.65, Dhp 183, Snp 1.8, Thag 1.1, Pj 1 or M i 55.`);
  const name = m[1].trim();
  if (/\s[ivxIVX]+$/.test(name)) throw new CitationError(`"${raw}" looks like a PTS volume/page reference for a collection that is not cited that way. Cite it by number instead.`);
  let key = fold(name).replace(/[\s.-]+/g, '');
  key = key.replace(/(nikaya|nikayo)$/, (s) => s);
  let collection = COLLECTIONS[key];
  if (name === 'Sn' || name === 'Sn.') collection = 'snp';
  if (/^(sutta ?nipata|sn ?p)$/i.test(fold(name))) collection = 'snp';
  if (/^(theri ?apadana|thi ?ap)$/.test(fold(name))) collection = 'thi-ap';
  if (/^(thera ?apadana|tha ?ap)$/.test(fold(name))) collection = 'tha-ap';
  if (!collection) throw new CitationError(`Unknown collection "${name}". Known: DN, MN, SN, AN, Kp, Dhp, Ud, Iti, Snp (Sn), Vv, Pv, Thag, Thig, Ap, Bv, Cp, Ja, Mnd, Cnd, Ps, Mil, Ne, Pe, Vinaya (Pj, Ss, Pc, Kd, Pvr…) and Abhidhamma books.`);
  const nums = numbers(m[2]);
  if (!nums) throw new CitationError(`Could not read the number in "${raw}".`);
  if (typeof nums.end === 'number' && nums.end < nums.path[nums.path.length - 1]) throw new CitationError(`"${raw}" is a reversed range.`);
  return { kind: 'id', collection, path: nums.path, end: nums.end, raw };
}

/** Build the standard text ID for an id-kind citation (mn10, sn56.11, an1.296, dhp1-20). */
export function citationId(c) {
  const body = c.path.join('.');
  const end = c.end === null || c.end === undefined ? '' : `-${Array.isArray(c.end) ? c.end.join('.') : c.end}`;
  return `${c.collection}${body}${end}`;
}

export const _test = { numbers, fold, COLLECTIONS };
