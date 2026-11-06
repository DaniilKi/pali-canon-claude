/**
 * Page references to the Thai (T), Myanmar (M) and VRI (V) printed editions.
 *
 * The VRI XML records where each page of these editions begins (`<pb ed="T" n="1.103"/>`). VRI numbers the
 * volumes *within each collection* (MN 1–3, SN 1–5…), not across the whole edition, and uses volume 0 for
 * collections printed in a single volume. So an edition page is cited with its collection:
 *   "Thai MN 1.103", "Myanmar DN 2.55", "VRI SN 1.20 (Nidānavaggo)", "Thai Dhp 15", "Thai Mv 1.10".
 * The VRI edition reuses volume numbers across the books of SN and AN; there the book name in brackets is
 * required, and labels include it. Nothing here guesses: a page that is not marked in the data is an error.
 *
 * This module holds no data of its own; it indexes the page markers already in canon.json.gz.
 */

export const EDITIONS = {
  T: { key: 'thai', name: 'Thai', full: 'Thai (Siam Raṭṭha) edition' },
  M: { key: 'myanmar', name: 'Myanmar', full: 'Myanmar (Sixth Council) edition' },
  V: { key: 'vri', name: 'VRI', full: 'VRI (Vipassana Research Institute) printed edition' },
};

// Words that introduce an edition page citation (folded, no spaces or dots).
export const EDITION_WORDS = {
  thai: 'T', thaied: 'T', thaiedition: 'T', siam: 'T', siamese: 'T', syamarattha: 'T', siamrattha: 'T',
  myanmar: 'M', myanmared: 'M', myanmaredition: 'M', burmese: 'M', burma: 'M', mya: 'M',
  vri: 'V', vried: 'V', vriedition: 'V',
};

// Collection (scope) used in edition citations → canon book collection(s). Vinaya is cited by book.
const SCOPE_LABEL = {
  'vin-pj': 'Pj', 'vin-pc': 'Pc', 'vin-mv': 'Mv', 'vin-cv': 'Cv', 'vin-pvr': 'Pvr',
  dn: 'DN', mn: 'MN', sn: 'SN', an: 'AN', kp: 'Kp', dhp: 'Dhp', ud: 'Ud', iti: 'Iti', snp: 'Snp', vv: 'Vv', pv: 'Pv',
  thag: 'Thag', thig: 'Thig', ap: 'Ap', bv: 'Bv', cp: 'Cp', ja: 'Ja', mnd: 'Mnd', cnd: 'Cnd', ps: 'Ps', mil: 'Mil',
  ne: 'Ne', pe: 'Pe', ds: 'Ds', vb: 'Vb', dt: 'Dt', pp: 'Pp', kv: 'Kv', ya: 'Ya', patthana: 'Paṭṭhāna',
};
export const VINAYA_SCOPES = {
  pj: 'vin-pj', parajika: 'vin-pj', parajikapali: 'vin-pj',
  pc: 'vin-pc', pacittiya: 'vin-pc', pacittiyapali: 'vin-pc',
  mv: 'vin-mv', mahavagga: 'vin-mv', mahavaggapali: 'vin-mv',
  cv: 'vin-cv', culavagga: 'vin-cv', cullavagga: 'vin-cv', culavaggapali: 'vin-cv',
  pvr: 'vin-pvr', parivara: 'vin-pvr', parivarapali: 'vin-pvr',
  vin: 'vinaya', vinaya: 'vinaya',
};

const fold = (value) => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const stem = (title) => fold(title).replace(/\(.*?\)/g, '').replace(/[^a-z]/g, '').replace(/pali$/, '').replace(/[aom]+$/, '');

/** Same conservative book-prefix comparison for direct page lookup and citation scanning. */
export function matchesEditionBook(title, qualifier) {
  const want = stem(qualifier);
  return want.length >= 3 && stem(title).startsWith(want);
}

/** Build (once) the index of every T/M/V marker: key "T|mn|1.103" → [{ book, block }]. */
export function editionIndex(d) {
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

/** Human-readable, round-trippable label for one marker: "Thai MN 1.103", "Thai Dhp 15", "VRI SN 1.20 (Nidānavaggo)". */
export function editionLabel(d, ed, bookIndex, at) {
  const idx = editionIndex(d);
  const book = d.canon.books[bookIndex];
  const [vol, page] = at.split('.');
  const where = Number(vol) === 0 ? page : `${Number(vol)}.${page}`;
  const qualifier = idx.needsBook.has(`${ed}|${book.collection}`) ? ` (${book.title})` : '';
  return `${EDITIONS[ed].name} ${SCOPE_LABEL[book.collection] || book.collection} ${where}${qualifier}`;
}

/** Book collections a parsed scope covers. */
function scopeCollections(scope) {
  if (scope === 'vinaya') return ['vin-pj', 'vin-pc', 'vin-mv', 'vin-cv', 'vin-pvr'];
  if (scope === 'tha-ap' || scope === 'thi-ap') return ['ap'];
  return [scope];
}

/**
 * Look up an edition page. c = { edition, scope, volume, page, book?, raw }.
 * Returns { hit: { book, block }, occurrences, label, owner } or throws Error with a helpful message.
 */
export function lookupEditionPage(d, c, ErrorClass = Error) {
  const idx = editionIndex(d);
  const edName = EDITIONS[c.edition].name;
  const collections = scopeCollections(c.scope);
  let found = [];
  for (const coll of collections) {
    const list = idx.markers.get(`${c.edition}|${coll}|${c.volume}.${c.page}`);
    if (list) found.push(...list);
  }
  if (c.book) {
    const filtered = found.filter((x) => matchesEditionBook(d.canon.books[x.book].title, c.book));
    if (!filtered.length && found.length) {
      const titles = [...new Set(found.map((x) => d.canon.books[x.book].title))];
      throw new ErrorClass(`${c.raw}: "${c.book}" does not match a book carrying ${edName} page ${c.volume ? `${c.volume}.` : ''}${c.page}. It occurs in: ${titles.join(', ')}.`);
    }
    found = filtered;
  }
  // VRI prints the Therāpadāna and the Therīapadāna in one Apadāna book (vol. 2 holds both), so the page index
  // cannot tell them apart. Keep only pages that begin in the requested part; otherwise refuse and say where it is.
  if ((c.scope === 'tha-ap' || c.scope === 'thi-ap') && found.length) {
    const ownerOf = (x) => idx.owner[x.book][x.block] || nextUnit(d, x.book, x.block);
    const kept = found.filter((x) => ownerOf(x)?.id.startsWith(c.scope));
    if (!kept.length) {
      const where = [...new Set(found.map((x) => ownerOf(x)?.acronym).filter(Boolean))].join(', ') || 'no text';
      const part = c.scope === 'thi-ap' ? 'Therīapadāna' : 'Therāpadāna';
      const at = `${c.volume ? `${c.volume}.` : ''}${c.page}`;
      throw new ErrorClass(`${c.raw}: ${edName} Apadāna page ${at} begins in ${where}, not in the ${part}. If that is the page you mean, cite it as "${edName} Ap ${at}".`);
    }
    found = kept;
  }
  if (!found.length) {
    // Explain which volumes and page ranges exist for this edition and collection.
    const vols = new Map();
    for (const [key] of idx.markers) {
      const [ed, coll, at] = key.split('|');
      if (ed !== c.edition || !collections.includes(coll)) continue;
      const [v, p] = at.split('.').map(Number);
      const r = vols.get(v) || [Infinity, -Infinity];
      vols.set(v, [Math.min(r[0], p), Math.max(r[1], p)]);
    }
    if (!vols.size) throw new ErrorClass(`The VRI data carries no ${edName} page numbers for this collection, so ${c.raw} cannot be looked up. Cite the text by number instead.`);
    // Inside the marked range of a volume: say which pages around it are marked (the data has gaps).
    const range = vols.get(c.volume);
    if (range && c.page > range[0] && c.page < range[1]) {
      let below = null;
      let above = null;
      for (const [key, list] of idx.markers) {
        const [ed, coll, at] = key.split('|');
        if (ed !== c.edition || !collections.includes(coll)) continue;
        const [v, p] = at.split('.').map(Number);
        if (v !== c.volume) continue;
        if (p < c.page && (!below || p > below.p)) below = { p, at, book: list[0].book };
        if (p > c.page && (!above || p < above.p)) above = { p, at, book: list[0].book };
      }
      const fmt = (x) => editionLabel(d, c.edition, x.book, x.at);
      throw new ErrorClass(`No ${edName} page ${c.volume ? `${c.volume}.` : ''}${c.page} is marked for this collection: the VRI data leaves the pages between ${fmt(below)} and ${fmt(above)} unmarked. Cite one of those, or the text by number.`);
    }
    const have = [...vols.entries()].sort((a, b) => a[0] - b[0]).map(([v, [a, b]]) => (v === 0 ? `pages ${a}–${b} (single volume: give the page only)` : `vol. ${v} pp. ${a}–${b}`)).join('; ');
    throw new ErrorClass(`No ${edName} page ${c.volume ? `${c.volume}.` : ''}${c.page} is marked for this collection. Marked: ${have}.`);
  }
  const books = [...new Set(found.map((x) => x.book))];
  if (books.length > 1) {
    const options = books.map((b) => {
      const first = found.find((x) => x.book === b);
      const u = idx.owner[b][first.block] || nextUnit(d, b, first.block);
      return `${editionLabel(d, c.edition, b, `${c.volume}.${c.page}`)} → ${u ? u.acronym : 'no text'}`;
    });
    throw new ErrorClass(`${c.raw} is ambiguous: the ${edName} edition as recorded by VRI repeats this volume and page in ${books.length} books. Add the book name, e.g. ${options.join('; or ')}.`);
  }
  found.sort((a, b) => a.block - b.block);
  return { hit: found[0], occurrences: found };
}

/** The first text that starts after a block (for a page break in a line between texts, e.g. a recitation formula). */
export function nextUnit(d, book, block) {
  let best = null;
  for (const u of d.canon.units) {
    if (u.book !== book || u.start <= block || u.approximate) continue;
    if (!best || u.start < best.start || (u.start === best.start && (u.end - u.start) < (best.end - best.start))) best = u;
  }
  return best;
}

/** Texts printed on the page that begins at { book, block } (up to the next marker of the same edition). */
export function textsOnPage(d, ed, { book, block }) {
  const idx = editionIndex(d);
  const blocks = d.canon.books[book].blocks;
  let end = block + 1;
  while (end < blocks.length && !(blocks[end][4]?.[ed]?.length)) end += 1;
  const seen = new Set();
  const out = [];
  for (let i = block; i < Math.min(end + 1, blocks.length); i += 1) {
    const u = idx.owner[book][i];
    if (u && !seen.has(u.id)) { seen.add(u.id); out.push(u); }
  }
  return out;
}

/** Edition page breaks inside a unit, for describe(): first and last break plus the break before the text. */
export function editionPagesFor(d, u) {
  const blocks = d.canon.books[u.book].blocks;
  const out = {};
  for (const [ed, meta] of Object.entries(EDITIONS)) {
    const inside = [];
    for (let i = u.start; i < u.end; i += 1) for (const at of blocks[i][4]?.[ed] || []) inside.push(at);
    let previous = null;
    for (let i = u.start - 1; i >= 0 && !previous; i -= 1) {
      const list = blocks[i][4]?.[ed];
      if (list?.length) previous = list[list.length - 1];
    }
    if (!inside.length && !previous) continue;
    out[meta.key] = {
      page_breaks: inside.length,
      ...(inside.length ? { first_break: editionLabel(d, ed, u.book, inside[0]), last_break: editionLabel(d, ed, u.book, inside[inside.length - 1]) } : {}),
      ...(previous ? { previous_break: editionLabel(d, ed, u.book, previous) } : {}),
    };
  }
  if (!Object.keys(out).length) return null;
  return {
    ...out,
    note: 'Page breaks of the Thai, Myanmar and VRI printed editions as recorded in the VRI XML (volumes numbered within each collection). A text with no break inside lies on the page of previous_break; otherwise it opens on that page unless first_break falls at its very start. Cite a page as e.g. "Thai MN 1.103".',
  };
}
