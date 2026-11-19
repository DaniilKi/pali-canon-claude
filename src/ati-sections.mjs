/** Finite reviewed ATI sections; owned notes never become translated body text. */
import { createHash } from 'node:crypto';
import { plainText } from './http.mjs';
import { SN27_SECTION_PROFILE, AN_MIND_SECTION_PROFILE, AN_TEN_SECTION_PROFILE, ATI_SECTION_PROFILES } from './ati-section-profiles.mjs';
import { sectionHash } from './ati-section-registry.mjs';
const rawHash = value => createHash('sha256').update(value).digest('hex');
const fail = () => { throw Error('The reviewed ATI question text, structure, notes or source changed. No question translation was returned.'); };
const elements = node => node.children.filter(value => typeof value !== 'string');
const descendants = node => [node, ...elements(node).flatMap(descendants)];

function parse(chunk) {
  const root = { children: [] }, stack = [root]; let at = 0, trailing = 0;
  for (const match of chunk.matchAll(/<[^>]*>/g)) {
    const token = match[0]; stack.at(-1).children.push(chunk.slice(at, match.index)); at = match.index + token.length;
    const close = token.match(/^<\/([a-z0-9]+)>$/);
    if (close) {
      if (stack.length === 1) { if (close[1] !== 'div' || ++trailing !== 1) fail(); continue; }
      const node = stack.pop(); if (node.tag !== close[1]) fail(); node.close = match.index; node.end = at; continue;
    }
    const start = token.match(/^<([a-z0-9]+)((?:\s+[a-zA-Z][a-zA-Z0-9_-]*\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*>$/);
    if (!start) fail();
    const attrs = {};
    for (const attribute of start[2].matchAll(/([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*(["'])(.*?)\2/g)) { if (Object.hasOwn(attrs, attribute[1])) fail(); attrs[attribute[1]] = attribute[3]; }
    const node = { tag: start[1], attrs, children: [], start: match.index, inside: at };
    stack.at(-1).children.push(node); stack.push(node);
  }
  stack.at(-1).children.push(chunk.slice(at));
  if (stack.length !== 1 || trailing !== 1) fail();
  return root;
}
const withoutNoteTags = html => html.replace(/<a\b[^>]*class=['"]noteTag['"][^>]*>[^]*?<\/a>/g, '');
export function extractAtiSection(html, row) {
  const profile = ATI_SECTION_PROFILES.find(value => value.unit_id === row?.unit_id), p = row?.section;
  if (!profile || row.path !== profile.path || row.anchor !== profile.anchor || p?.profile !== profile.profile || p.anchor !== row.anchor || p.paragraph_count !== profile.paragraphs || p.note_count !== profile.notes || typeof html !== 'string' || row.source_html_sha256 !== profile.source_html_sha256 || rawHash(html) !== row.source_html_sha256) fail();
  const begin = '<!-- BEGIN COPYRIGHTED TEXT CHUNK -->', end = '<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->';
  if (html.split(begin).length !== 2 || html.split(end).length !== 2 || html.indexOf(end) <= html.indexOf(begin)) fail();
  const chunk = html.slice(html.indexOf(begin) + begin.length, html.indexOf(end)), root = parse(chunk), chapters = elements(root);
  if (profile.profile === AN_TEN_SECTION_PROFILE) return finiteTreatment(root, chapters, chunk, row, profile);
  if (profile.profile === AN_MIND_SECTION_PROFILE) return numberedMindParagraph(root, chapters, chunk, row, profile);
  if (root.children.some(value => typeof value === 'string' && value.trim()) || chapters.length !== (profile.profile === SN27_SECTION_PROFILE || profile.path.includes('2x') ? 10 : 6) || chapters.some(node => node.tag !== 'div' || JSON.stringify(node.attrs) !== '{"class":"chapter"}')) fail();
  if (profile.profile === SN27_SECTION_PROFILE) {
    for (const [i, chapter] of chapters.entries()) {
      const children = elements(chapter), heading = children[0], body = children[1], anchor = heading && elements(heading)[0];
      if (chapter.children.some(value => typeof value === 'string' && value.trim()) || children.length !== 2 || heading.tag !== 'h1' || Object.keys(heading.attrs).length || elements(heading).length !== 1 || heading.children.some(value => typeof value === 'string' && value.trim()) || anchor?.tag !== 'a' || JSON.stringify(anchor.attrs) !== JSON.stringify({id: `sn27.${String(i + 1).padStart(3, '0')}`}) || elements(anchor).length || body.tag !== 'p' || Object.keys(body.attrs).length || elements(body).length) fail();
    }
  }
  const matches = chapters.filter(chapter => descendants(chapter).some(node => node.tag === 'a' && node.attrs.id === row.anchor));
  if (matches.length !== 1) fail();
  const chapter = matches[0], children = elements(chapter), heading = children[0];
  if (rawHash(chunk.slice(chapter.start, chapter.end)) !== p.section_html_sha256 || heading?.tag !== 'h1' || chapter.children.some(value => typeof value === 'string' && value.trim())) fail();
  const paragraphs = children.filter(node => node.tag === 'p'), notes = children.filter(node => node.tag === 'div');
  if (paragraphs.length !== profile.paragraphs || notes.length !== (profile.notes ? 1 : 0) || children.length !== 1 + paragraphs.length + notes.length || notes.some(node => JSON.stringify(node.attrs) !== '{"class":"notes"}')) fail();
  for (const node of descendants(chapter)) if (!['div', 'h1', 'a', 'span', 'p', 'dl', 'dt', 'dd', 'i'].includes(node.tag)) fail();
  const title = plainText(withoutNoteTags(chunk.slice(heading.inside, heading.close)));
  if (title !== p.heading) fail();
  const text = paragraphs.map(node => plainText(withoutNoteTags(chunk.slice(node.inside, node.close)))).join('\n\n');
  if (paragraphs.some(node => !plainText(withoutNoteTags(chunk.slice(node.inside, node.close))))) fail();
  const translator_notes = [];
  if (notes.length) {
    const children = elements(notes[0]), dl = children[1];
    if (children.length !== 2 || children[0].tag !== 'h1' || !/^Notes?$/.test(plainText(chunk.slice(children[0].inside, children[0].close))) || dl.tag !== 'dl') fail();
    const rows = elements(dl);
    if (rows.length !== profile.notes * 2) fail();
    for (let i = 0; i < profile.notes; i++) {
      const dt = rows[i * 2], dd = rows[i * 2 + 1], number = i + 1;
      if (dt.tag !== 'dt' || dd.tag !== 'dd' || plainText(chunk.slice(dt.inside, dt.close)) !== `${number}.`) fail();
      const note = plainText(chunk.slice(dd.inside, dd.close)); if (!note) fail(); translator_notes.push({ number, text: note });
    }
    const markers = descendants(chapter).filter(node => node.tag === 'a' && node.attrs.class === 'noteTag');
    if (markers.length !== profile.notes || markers.some((node, i) => node.attrs.id !== `fnt-${row.unit_id.slice(3)}-${i + 1}` || node.attrs.href !== `${profile.path.split('/').at(-1)}.html#fn-${row.unit_id.slice(3)}-${i + 1}`)) fail();
  }
  if (sectionHash(text) !== p.text_sha256 || sectionHash(translator_notes) !== p.notes_sha256) fail();
  return { text, translator_notes, title };
}

function numberedMindParagraph(root, chapters, chunk, row, profile) {
  if (root.children.some(value => typeof value === 'string' && value.trim()) || chapters.length !== 2) fail();
  const paragraphs = [];
  for (const chapter of chapters) {
    if (chapter.tag !== 'div' || JSON.stringify(chapter.attrs) !== '{"class":"chapter"}' || chapter.children.some(value => typeof value === 'string' && value.trim()) || elements(chapter).length !== 10) fail();
    for (const paragraph of elements(chapter)) {
      const number = paragraphs.length + 21, anchors = elements(paragraph), anchor = anchors[0];
      if (paragraph.tag !== 'p' || Object.keys(paragraph.attrs).length || anchors.length !== 1 || anchor.tag !== 'a' || JSON.stringify(anchor.attrs) !== JSON.stringify({id: `sutta-${number}`}) || elements(anchor).length || plainText(chunk.slice(anchor.inside,anchor.close)) !== String(number) || chunk.slice(paragraph.inside,anchor.start).trim()) fail();
      const body = chunk.slice(anchor.end,paragraph.close).match(/^\.\s+([^]*)$/);
      if (!body || /[<>]/.test(body[1])) fail();
      paragraphs.push({paragraph, anchor, text: plainText(body[1])});
    }
  }
  const selected = paragraphs.find(value => value.anchor.attrs.id === row.anchor), p = row.section;
  if (!selected || !selected.text || rawHash(chunk.slice(selected.paragraph.start,selected.paragraph.end)) !== p.section_html_sha256 || p.heading !== profile.label || sectionHash(selected.text) !== p.text_sha256 || sectionHash([]) !== p.notes_sha256) fail();
  // The printed label is not a publisher-supplied individual discourse title.
  return {text: selected.text, translator_notes: [], title: p.heading};
}

// These paragraph selectors are internal identities, not fabricated publisher anchors.
function finiteTreatment(root, chapters, chunk, row, profile) {
  const exactAttrs = (node, attrs) => JSON.stringify(node.attrs) === JSON.stringify(attrs);
  const inside = node => chunk.slice(node.inside,node.close);
  const noText = node => !node.children.some(value => typeof value === 'string' && value.trim());
  const pool = profile.path.endsWith('an01.045-046.than'), luminous = profile.path.endsWith('an01.049.than');
  const gratitude = profile.path.endsWith('an02.031.than'), voice = profile.path.endsWith('an02.125-126.than');
  if (![pool,luminous,gratitude,voice].some(Boolean) || row.section.selection_id !== profile.unit_id || row.section.heading !== null
    || row.english_title !== profile.parent_title || !noText(root) || chapters.length !== (pool ? 2 : 1)
    || chapters.some(node => node.tag !== 'div' || !exactAttrs(node,{class:'chapter'}) || !noText(node))) fail();
  const paragraphs = chapters.flatMap(chapter => elements(chapter).filter(node => node.tag === 'p'));
  if (paragraphs.length !== (pool || voice ? 2 : 4) || paragraphs.some(node => Object.keys(node.attrs).length)) fail();
  const extras = chapters.flatMap(chapter => elements(chapter).filter(node => node.tag !== 'p'));
  if (extras.length !== (pool ? 0 : 1) || !pool && (extras[0].tag !== 'div' || !exactAttrs(extras[0],{class:gratitude?'seeAlso':'notes'}))) fail();
  if (pool && chapters.some(chapter => elements(chapter).length !== 1) || !pool && (elements(chapters[0]).length !== paragraphs.length + 1 || elements(chapters[0]).at(-1) !== extras[0])) fail();
  const alts = ['{I,v,9}','{I,v,10}','{I,vi,1}','{I,vi,2}'];
  for (const [i,paragraph] of paragraphs.entries()) {
    const children = elements(paragraph), markers = children.filter(node => node.tag === 'a');
    if (pool) {if (children.length || !new RegExp('^'+(i+45)+'\\.\\s+').test(plainText(inside(paragraph)))) fail();continue;}
    if (luminous || voice) {
      if (markers.length !== (i === 0 ? 1 : 0) || children.length !== (luminous ? (i === 0 ? 2 : 1) : i === 0 ? 1 : 0)) fail();
      if (i === 0) {const marker=markers[0];if (!exactAttrs(marker,{class:'noteTag',href:profile.path.split('/').at(-1)+'.html#fn-1',id:'fnt-1'}) || elements(marker).length || plainText(inside(marker)) !== '[1]') fail();}
      if (luminous) {const alt=children.at(-1);if (alt.tag !== 'span' || !exactAttrs(alt,{class:'altID'}) || elements(alt).length || inside(alt) !== alts[i]) fail();}
    } else if (gratitude) {
      if (i < 3) {if (children.length) fail();}
      else {const alt=children[0], anchor=alt&&elements(alt)[0];if (children.length !== 1 || alt.tag !== 'span' || !exactAttrs(alt,{class:'altID'}) || elements(alt).length !== 1 || anchor.tag !== 'a' || !exactAttrs(anchor,{id:'s32'}) || elements(anchor).length || inside(alt) !== '{<a id="s32">II,iv,2</a>}') fail();}
    }
  }
  let note;
  if (luminous || voice) {
    const nodes=elements(extras[0]),h=nodes[0],dl=nodes[1],entries=dl&&elements(dl),dt=entries?.[0],dd=entries?.[1],back=dt&&elements(dt)[0];
    if (nodes.length !== 2 || h.tag !== 'h1' || !exactAttrs(h,{}) || elements(h).length || inside(h) !== 'Note' || dl.tag !== 'dl' || !exactAttrs(dl,{}) || !noText(dl)
      || entries.length !== 2 || dt.tag !== 'dt' || !exactAttrs(dt,{}) || elements(dt).length !== 1 || back.tag !== 'a'
      || !exactAttrs(back,{href:profile.path.split('/').at(-1)+'.html#fnt-1',id:'fn-1'}) || elements(back).length || inside(back) !== '1' || plainText(inside(dt)) !== '1.' || dd.tag !== 'dd' || !exactAttrs(dd,{})) fail();
    for (const node of descendants(dd)) if (!['dd','p','i','a'].includes(node.tag) || node.tag !== 'a' && Object.keys(node.attrs).length || node.tag === 'a' && (Object.keys(node.attrs).join(',') !== 'href' || !/^\.\.\//.test(node.attrs.href))) fail();
    if (elements(dd).filter(node => node.tag === 'p').length !== 3 || luminous && !noText(dd)) fail();
    note={number:1,text:plainText(inside(dd))};if (!note.text) fail();
  }
  if (gratitude) {
    const nodes=elements(extras[0]);if (nodes.length !== 1 || nodes[0].tag !== 'p' || Object.keys(nodes[0].attrs).length || !noText(extras[0])) fail();
    const links=elements(nodes[0]),expected=['../../mn/mn.110.than.html','../../sn/sn07/sn07.014.than.html','../an04/an04.073.than.html','../../kn/iti/iti.4.100-112.than.html#iti-106'];
    if (links.length !== 4 || links.some((link,i)=>link.tag !== 'a' || !exactAttrs(link,{href:expected[i]}) || elements(link).length)) fail();
  }
  const chapter=chapters[profile.chapter-1],chosen=elements(chapter).filter(node=>node.tag==='p').slice(profile.paragraph_first-1,profile.paragraph_last);
  if (chosen.length !== profile.paragraphs || rawHash(chunk.slice(chosen[0].start,chosen.at(-1).end)) !== row.section.section_html_sha256) fail();
  const text=chosen.map(node=>{
    let body=inside(node).replace(/<span class="altID">[^]*?<\/span>/g,'');
    body=withoutNoteTags(body);body=plainText(body);
    if (pool) body=body.replace(new RegExp('^'+(profile.unit_id.endsWith('.45')?45:46)+'\\.\\s+'),'');
    if (!body) fail();return body;
  }).join('\n\n');
  const translator_notes=profile.notes?[note]:[];
  if (translator_notes.some(value=>!value) || sectionHash(text) !== row.section.text_sha256 || sectionHash(translator_notes) !== row.section.notes_sha256) fail();
  return {text,translator_notes,title:profile.parent_title};
}
