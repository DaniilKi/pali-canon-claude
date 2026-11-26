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

function modelCandidateStage123(corpus){
 const started=Date.now(),snapshot={canon:corpus},byId=new Map(corpus.units.map(u=>[u.id,u]));
 // Exact DD eligibility: truthy shared owner, then every resolvable range member.
 const docs=corpus.units.filter(u=>!u.shares_passage_with&&!(u.kind==='range'&&(u.members||[]).every(m=>byId.get(m)&&byId.get(m)!==u)));
 if(docs.length>=16384)throw Error('Frozen DF/doc packing bound exceeded');
 const K=PARAMS.shingle_words,S=PARAMS.stock_words,df=new Map(),df5=new Map(),wdf=new Map();let wordOccurrences=0,shingleOccurrences=0,fiveOccurrences=0;
 const perDoc=docs.map((u,di)=>{
  const shingles=[],g5=new Map(),seen=new Set();let pos=0,words=0,runs=0,segments=0;
  renderUnitSegments(u,snapshot).forEach(segment=>{
   if(segment.type==='heading')return;segments++;
   for(const piece of segment.text.split(/…\s*pe\s*…|\.\.\.\s*pe\s*\.\.\.|…|\bpe\b/)){
    const tokens=fold(piece).replace(/[^a-z]+/g,' ').trim().split(' ').filter(w=>w&&w!=='pe');if(!tokens.length)continue;runs++;words+=tokens.length;
    for(const w of tokens)if(!seen.has(w)){seen.add(w);wdf.set(w,(wdf.get(w)||0)+1);}
    for(let i=0;i+S<=tokens.length;i++){const key=hash(tokens.slice(i,i+S).join(' '));g5.set(pos+i,key);const v=df5.get(key);if(v===undefined)df5.set(key,16384+di);else if(v%16384!==di)df5.set(key,(Math.floor(v/16384)+1)*16384+di);fiveOccurrences++;}
    for(let i=0;i+K<=tokens.length;i++){const key=hash(tokens.slice(i,i+K).join(' '));shingles.push(key,pos+i);const v=df.get(key);if(v===undefined)df.set(key,16384+di);else if(v%16384!==di)df.set(key,(Math.floor(v/16384)+1)*16384+di);shingleOccurrences++;}
    pos+=tokens.length+K;
   }
  });wordOccurrences+=words;return {shingles,g5,words,runs,segments};
 });
 const stage1ms=Date.now()-started;
 // Position/segment sets are NOT used to decide candidate membership. Keep every
 // occurrence for stock-skipped count; retain unique accepted doc IDs per hash.
 const occ=new Map();let stockSkipped=0,rareOccurrences=0;
 perDoc.forEach((p,di)=>{for(let i=0;i<p.shingles.length;i+=2){const key=p.shingles[i],pos=p.shingles[i+1],n=Math.floor(df.get(key)/16384);if(n<2||n>PARAMS.max_texts_per_shingle)continue;let common=0;for(let j=pos;j+S<=pos+K;j++){if(!p.g5.has(j))throw Error('Unexpected absent stock window');if(Math.floor(df5.get(p.g5.get(j))/16384)>PARAMS.stock_texts)common++;}if(common*2>=K-S+1){stockSkipped++;continue;}let accepted=occ.get(key);if(!accepted)occ.set(key,accepted=new Set());accepted.add(di);rareOccurrences++;}});
 const stage2ms=Date.now()-started-stage1ms,pairs=new Set();
 for(const accepted of occ.values()){const ids=[...accepted].sort((a,b)=>a-b);for(let x=0;x<ids.length;x++)for(let y=x+1;y<ids.length;y++)pairs.add(ids[x]*16384+ids[y]);}
 const stage3ms=Date.now()-started-stage1ms-stage2ms;
 return {stats:{documents:docs.length,shingles:df.size,rare_shingles:occ.size,stock_shingles_skipped:stockSkipped,candidate_pairs:pairs.size},model_details:{word_occurrences:wordOccurrences,word_types:wdf.size,rare_word_types_le20:[...wdf.values()].filter(n=>n<=PARAMS.rare_word_texts).length,shingle_occurrences:shingleOccurrences,fivegram_types:df5.size,fivegram_occurrences:fiveOccurrences,stock_fivegram_types:[...df5.values()].filter(v=>Math.floor(v/16384)>PARAMS.stock_texts).length,accepted_rare_occurrences:rareOccurrences,stage1_ms:stage1ms,stage2_ms:stage2ms,stage3_ms:stage3ms},document_ids:docs.map(u=>u.id),per_uid:Object.fromEntries(docs.map((u,i)=>[u.id,{words:perDoc[i].words,runs:perDoc[i].runs,nonheading_segments:perDoc[i].segments,shingle_occurrences:perDoc[i].shingles.length/2,fivegram_positions:perDoc[i].g5.size}])),candidate_keys:[...pairs].sort((a,b)=>a-b)};
}

export {modelCandidateStage123,PARAMS};
