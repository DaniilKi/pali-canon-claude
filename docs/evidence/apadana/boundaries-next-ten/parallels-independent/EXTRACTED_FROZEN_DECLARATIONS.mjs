const ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];

const HEADING = new Set(['subhead', 'title', 'chapter', 'book', 'nikaya', 'subsubhead']);

const CENTRE_HEADING = /(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$/i;

const VERSE = new Set(['gatha1', 'gatha2', 'gatha3', 'gathalast']);

const VERSE_CITED = new Set(['snp', 'thag', 'thig', 'dhp']);

const PTS_ABBR = { dn: 'D', mn: 'M', sn: 'S', an: 'A', vinaya: 'Vin', ud: 'Ud', iti: 'It', snp: 'Sn', vv: 'Vv', pv: 'Pv',
  thag: 'Th', thig: 'Thī', ap: 'Ap', bv: 'Bv', cp: 'Cp', ja: 'Ja', mnd: 'Nidd I', cnd: 'Nidd II', ps: 'Paṭis', mil: 'Mil',
  ne: 'Nett', pe: 'Peṭ', ds: 'Dhs', vb: 'Vibh', dt: 'Dhātuk', pp: 'Pp', kv: 'Kv', ya: 'Yam', patthana: 'Paṭṭh', kp: 'Khp', dhp: 'Dhp' };

const fold = (value) => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/ṁ|ṃ/g, 'm');

const EDITIONS = {
  T: { key: 'thai', name: 'Thai', full: 'Thai (Siam Raṭṭha) edition' },
  M: { key: 'myanmar', name: 'Myanmar', full: 'Myanmar (Sixth Council) edition' },
  V: { key: 'vri', name: 'VRI', full: 'VRI (Vipassana Research Institute) printed edition' },
};

const SCOPE_LABEL = {
  'vin-pj': 'Pj', 'vin-pc': 'Pc', 'vin-mv': 'Mv', 'vin-cv': 'Cv', 'vin-pvr': 'Pvr',
  dn: 'DN', mn: 'MN', sn: 'SN', an: 'AN', kp: 'Kp', dhp: 'Dhp', ud: 'Ud', iti: 'Iti', snp: 'Snp', vv: 'Vv', pv: 'Pv',
  thag: 'Thag', thig: 'Thig', ap: 'Ap', bv: 'Bv', cp: 'Cp', ja: 'Ja', mnd: 'Mnd', cnd: 'Cnd', ps: 'Ps', mil: 'Mil',
  ne: 'Ne', pe: 'Pe', ds: 'Ds', vb: 'Vb', dt: 'Dt', pp: 'Pp', kv: 'Kv', ya: 'Ya', patthana: 'Paṭṭhāna',
};

function ptsLabel(collection, volume, page) {
  const abbr = PTS_ABBR[collection];
  if (!abbr || page === undefined || page === null) return null;
  // Books cited by verse number get an explicit page label so a page is never mistaken for a verse.
  if (VERSE_CITED.has(collection)) return `PTS ed. p. ${page}`;
  if (!volume) return `${abbr} ${page}`;
  if (['mnd', 'cnd', 'ps', 'mil', 'ne', 'pe', 'kp', 'dhp', 'ud', 'iti', 'snp', 'vv', 'pv', 'thag', 'thig', 'bv', 'cp', 'ds', 'dt', 'pp', 'kv'].includes(collection) && volume <= 1) {
    return `${abbr} ${page}`;
  }
  return `${abbr} ${ROMAN[volume] || volume} ${page}`;
}

function editionIndex(d) {
  if (d.editions) return d.editions;
  const { books, units } = d.canon;
  // Most specific text per block: ranges and longer texts first, so shorter texts overwrite them; approximate last resort.
  const owner = books.map((b) => new Array(b.blocks.length).fill(null));
  const fallback = books.map((b) => new Array(b.blocks.length).fill(null));
  const ordered = [...units].sort((a, b) => (b.kind === 'range') - (a.kind === 'range') || (b.end - b.start) - (a.end - a.start));
  for (const u of ordered) {
    const target = u.approximate ? fallback : owner;
    for (let i = u.start; i < u.end; i += 1) target[u.book][i] = u;
  }
  for (let b = 0; b < books.length; b += 1) for (let i = 0; i < owner[b].length; i += 1) owner[b][i] ||= fallback[b][i];

  const markers = new Map();
  books.forEach((book, bi) => {
    book.blocks.forEach((blk, k) => {
      for (const ed of Object.keys(EDITIONS)) {
        for (const at of blk[4]?.[ed] || []) {
          const key = `${ed}|${book.collection}|${at}`;
          if (!markers.has(key)) markers.set(key, []);
          markers.get(key).push({ book: bi, block: k });
        }
      }
    });
  });
  // A key is ambiguous when it occurs in more than one book of the same collection (VRI SN and AN volumes).
  const ambiguous = new Set();
  for (const [key, list] of markers) if (new Set(list.map((x) => x.book)).size > 1) ambiguous.add(key);
  const needsBook = new Set([...ambiguous].map((key) => key.split('|').slice(0, 2).join('|')));
  d.editions = { owner, markers, ambiguous, needsBook };
  return d.editions;
}

function editionLabel(d, ed, bookIndex, at) {
  const idx = editionIndex(d);
  const book = d.canon.books[bookIndex];
  const [vol, page] = at.split('.');
  const where = Number(vol) === 0 ? page : `${Number(vol)}.${page}`;
  const qualifier = idx.needsBook.has(`${ed}|${book.collection}`) ? ` (${book.title})` : '';
  return `${EDITIONS[ed].name} ${SCOPE_LABEL[book.collection] || book.collection} ${where}${qualifier}`;
}

function renderUnitSegments(u, d, { includeNotes = false, includeSourcePositions = false } = {}) {
  const blocks = d.canon.books[u.book].blocks.slice(u.start, u.end);
  const out = [];
  let stanza = null;
  const flush = () => { if (stanza) { out.push(stanza); stanza = null; } };
  // Thai, Myanmar and VRI page breaks; a break in an empty block is carried to the next segment.
  let pending = [];
  const editionLabels = (pages) => {
    const labels = [...pending];
    pending = [];
    for (const ed of Object.keys(EDITIONS)) for (const at of pages[ed] || []) labels.push([ed, editionLabel(d, ed, u.book, at)]);
    return labels;
  };
  for (const [i, [rend, n, text, notes, pages]] of blocks.entries()) {
    const pts = (pages.P || []).map((p) => {
      const [vol, page] = p.split('.').map(Number);
      return ptsLabel(u.collection, vol, page);
    });
    const eds = editionLabels(pages);
    if (rend === 'hangnum') { flush(); stanza = { type: 'verse', vri: n, text: '', pts: [], eds, start: i, end: i + 1 }; continue; }
    if (VERSE.has(rend)) {
      if (!stanza) stanza = { type: 'verse', vri: n, text: '', pts: [], eds: [], start: i, end: i + 1 };
      stanza.end = i + 1;
      stanza.text += (stanza.text ? '\n' : '') + text;
      stanza.pts.push(...pts);
      stanza.eds.push(...eds);
      if (includeNotes && notes.length) (stanza.variants ||= []).push(...notes);
      if (rend === 'gathalast') flush();
      continue;
    }
    flush();
    if (!text) { pending = eds; continue; }
    const isHeading = HEADING.has(rend) || (rend === 'centre' && CENTRE_HEADING.test(text));
    const seg = { type: isHeading ? 'heading' : 'prose', vri: n, text, pts, eds, start: i, end: i + 1 };
    if (includeNotes && notes.length) seg.variants = notes;
    out.push(seg);
  }
  flush();
  return out.map((s, i) => {
    const r = { ref: `${u.id}/${i + 1}`, type: s.type, text: s.text };
    if (includeSourcePositions) r.source_blocks = [u.start + s.start, u.start + s.end];
    if (s.vri) r.vri_paragraph = s.vri;
    if (s.pts?.length) r.pts_page_begins = [...new Set(s.pts.filter(Boolean))];
    for (const [ed, meta] of Object.entries(EDITIONS)) {
      const labels = (s.eds || []).filter(([e]) => e === ed).map(([, label]) => label);
      if (labels.length) r[`${meta.key}_page_begins`] = [...new Set(labels)];
    }
    if (s.variants?.length) r.variant_readings = s.variants;
    return r;
  });
}

function hash(str) {
  // Two FNV-1a variants combined into a 53-bit integer key.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
    h2 ^= h2 >>> 13;
  }
  return (h1 >>> 0) * 2097152 + ((h2 >>> 0) & 0x1fffff);
}

const PARAMS = { shingle_words: 8, max_texts_per_shingle: 4, stock_words: 5, stock_texts: 10, rare_word_texts: 20, min_rare_words: 2, min_shared_words: 30, min_run_words: 20, min_short_coverage: 0.7, min_short_coverage_strict: 0.9, min_short_words: 12, max_segment_refs: 12 };
