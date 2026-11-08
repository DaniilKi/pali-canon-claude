import { localizeText } from '../src/script.mjs';
/* Source text is retrieved through the existing, schema-validated MCP tools. Never render source HTML. */
'use strict';
const $ = id => document.getElementById(id);
const view = $('view'), status = $('status');
let serial = 0, epoch = 0, studyEpoch = 0;
const KEY = 'pali-library-v1';
let storageOK = true;
function loadLocal() { try { const x = JSON.parse(localStorage.getItem(KEY) || '{}'); return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; } catch { storageOK = false; return {}; } }
const local = loadLocal();
if (!Array.isArray(local.saved)) local.saved = [];
local.saved = local.saved.filter(x => x && typeof x.uid === 'string' && typeof x.ref === 'string' && typeof x.title === 'string').slice(0, 500);
function persist() { try { localStorage.setItem(KEY, JSON.stringify(local)); return true; } catch { storageOK = false; status.textContent = 'Browser storage is unavailable. Changes are kept only in this tab; export your saved passages.'; return false; } }
function el(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function button(text, fn) { const n = el('button', text); n.type = 'button'; n.addEventListener('click', fn); return n; }
function link(text, href, className) { const n = el('a', text, className); n.href = href; return n; }
function external(text, url) { try { const u = new URL(url); if (!['http:', 'https:'].includes(u.protocol)) return el('span', text); return link(text, u.href); } catch { return el('span', text); } }
function route(name, args = {}) { return '#' + name + '?' + new URLSearchParams(args); }
async function tool(name, args) {
  const abort = new AbortController(); const timer = setTimeout(() => abort.abort(), 180000);
  try {
    const response = await fetch('/mcp', { method: 'POST', signal: abort.signal, headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++serial, method: 'tools/call', params: { name, arguments: args } }) });
    if (!response.ok) throw new Error(response.status === 429 ? 'Too many requests. Wait a minute, then try again.' : 'The text service is unavailable. Try again.');
    const rpc = await response.json();
    if (rpc.error) throw new Error(rpc.error.message);
    const result = rpc.result;
    if (!result) throw new Error('The text service returned an incomplete response.');
    const data = result.structuredContent || JSON.parse(result.content?.find(c => c.type === 'text')?.text || '{}');
    if (result.isError || data.error) throw new Error(data.error || 'This selection could not be retrieved.');
    return data;
  } catch (error) { if (error.name === 'AbortError') throw new Error('The request timed out. Try again; no replacement passage was selected.'); throw error; }
  finally { clearTimeout(timer); }
}
function notes(data, target = view) {
  const list = [...(data.notes || []), ...(data.approximate ? ['This source selection is approximate or abbreviated. Missing text has not been reconstructed.'] : [])];
  if (data.alignment_note) list.push(data.alignment_note);
  if (data.alignment_method) list.push(data.alignment_method);
  if (data.input_romanized) list.push('Input converted from ' + data.input_script + ' to Roman Pāli: ' + data.input_romanized);
  if (data.input_normalised) list.push(typeof data.input_normalised === 'string' ? data.input_normalised : data.input_normalised.note || JSON.stringify(data.input_normalised));
  if (data.canonical === false && data.label) list.unshift(data.label);
  if (data.alignment) list.push(typeof data.alignment === 'string' ? data.alignment : JSON.stringify(data.alignment));
  if (list.length) target.append(el('div', [...new Set(list)].join('\n'), 'notice'));
}
function provenance(data, target = view) {
  const box = el('section', undefined, 'provenance'); box.setAttribute('aria-label', 'Source attribution');
  box.append(el('strong', data.edition || data.dictionary?.name || data.source?.name || (typeof data.source === 'string' ? data.source : null) || data.label || 'Source provenance'));
  const license = data.license || data.source?.terms;
  const values = [data.attribution || data.source?.attribution, typeof license === 'string' ? license : license && [license.name, license.note, license.attribution].filter(Boolean).join(' · '), data.dictionary?.version && 'Dictionary version: ' + data.dictionary.version, data.source?.commit && 'Source revision: ' + data.source.commit];
  for (const value of [...new Set(values.filter(Boolean))]) box.append(el('p', value));
  if (typeof license === 'object' && license?.url) box.append(external('Licence terms', license.url));
  if (data.url) box.append(external('Read at the original source', data.url));
  if (data.source?.inputs) {
    const details = el('details'); details.append(el('summary', 'Source-data versions'));
    for (const [name, meta] of Object.entries(data.source.inputs)) details.append(el('p', name + ' · ' + (meta.vri_commit || '') + ' · SHA-256 ' + (meta.sha256 || 'not supplied')));
    box.append(details);
  }
  target.append(box);
}
function heading(eyebrow, title) { view.append(el('p', eyebrow, 'eyebrow'), el('h2', title)); }
function focusHeading() { $('content').focus({ preventScroll: true }); }
function updateResume() { if (typeof local.last === 'string' && /^#read\?/.test(local.last)) { $('resume').href = local.last; $('resume').hidden = false; } }
function preferences() {
  const size = Math.max(16, Math.min(30, Number(local.font) || 21));
  document.documentElement.style.setProperty('--reading', size + 'px'); $('font-size').value = size;
  document.body.dataset.theme = local.theme === 'dark' ? 'dark' : 'light'; $('theme').value = document.body.dataset.theme;
  if ([...$('script').options].some(o => o.value === local.script)) $('script').value = local.script;
}
preferences(); updateResume();
$('font-size').addEventListener('input', e => { local.font = Number(e.target.value); preferences(); persist(); });
$('theme').addEventListener('change', e => { local.theme = e.target.value; preferences(); persist(); });
$('script').addEventListener('change', e => { local.script = e.target.value; persist(); if (location.hash.startsWith('#read')) render(); });
$('search-form').addEventListener('submit', e => { e.preventDefault(); location.hash = route('search', { q: $('query').value.trim(), scope: $('search-scope').value }); });
document.querySelector('.skip').addEventListener('click', e => { e.preventDefault(); $('content').focus(); });
$('reference-form').addEventListener('submit', e => { e.preventDefault(); location.hash = route('read', { uid: $('reference').value.trim() }); });
function pageControls(next, previous, action) {
  const p = el('nav', undefined, 'pager'); p.setAttribute('aria-label', 'Pagination');
  if (previous !== null) p.append(link('← Previous page', action(previous), 'button'));
  if (next !== null && next !== undefined) p.append(link('Next page →', action(next), 'button'));
  view.append(p);
}
async function browse(args, token) {
  const node = args.get('node') || 'canon', offset = offsetOf(args), limit = 40;
  const kind = node === 'commentary' ? 'commentary' : node === 'post' ? 'post' : 'canon';
  const data = kind === 'commentary' ? await tool('get_commentary', { uid: 'commentary', offset, limit }) : kind === 'post' ? await tool('get_post_canonical', { offset, limit }) : await tool('browse_canon', { node, offset, limit }); if (token !== epoch) return;
  heading('EXPLORE THE LIBRARY', kind === 'commentary' ? 'Traditional commentary' : kind === 'post' ? 'Later Pāli works' : data.name || 'The Pāli Canon');
  const nav = el('div', undefined, 'toolbar'); nav.append(link('All collections', route('browse', { node: 'canon' }), 'button'), link('Complete source books', route('browse', { node: 'books' }), 'button')); view.append(nav);
  if (data.note) view.append(el('p', data.note, 'muted')); notes(data);
  const cards = el('div', undefined, 'cards');
  for (const item of data.items || data.books || []) {
    const href = kind === 'commentary' ? route('read', { kind, uid: item.uid }) : kind === 'post' ? route('read', { kind, uid: item.id }) : item.read_with?.book ? route('read', { book: item.read_with.book }) : item.citation ? route('read', { uid: item.id }) : route('browse', { node: item.id });
    const card = link('', href, 'entry'); card.append(el('small', kind === 'canon' ? item.citation || item.pitaka || 'Collection' : kind === 'commentary' ? 'Commentary · not canon' : 'Later work · not canon'), el('strong', item.name || item.title || item.id));
    if (item.texts !== undefined) card.append(el('p', item.texts + ' texts'));
    if (item.english_available !== undefined) card.append(el('p', item.english_available ? 'English translation linked' : 'Pāli source text'));
    cards.append(card);
  }
  view.append(cards); pageControls(data.next_offset, offset ? Math.max(0, offset - limit) : null, n => route('browse', { node, offset: n }));
  if (kind !== 'canon') provenance(data);
}
function offsetOf(args) { const n = Number(args.get('offset') || 0); return Number.isSafeInteger(n) && n >= 0 && n <= 100000 ? n : 0; }
async function search(args, token) {
  const query = (args.get('q') || '').trim(); if (!query) throw new Error('Enter words or a title to search.');
  const scope = ['commentary', 'post'].includes(args.get('scope')) ? args.get('scope') : 'canon'; $('search-scope').value = scope;
  const offset = offsetOf(args), data = await tool(scope === 'commentary' ? 'search_commentary' : scope === 'post' ? 'search_post_canonical' : 'search_texts', { query, offset, limit: 15, script: $('script').value }); if (token !== epoch) return;
  heading(scope === 'canon' ? 'SEARCH THE CANON' : scope === 'commentary' ? 'SEARCH COMMENTARY · NOT CANON' : 'SEARCH LATER WORKS · NOT CANON', 'Results for “' + query + '”'); notes(data);
  if (data.expanded_from_english) view.append(el('p', 'English keywords expanded into Pāli: ' + JSON.stringify(data.expanded_from_english), 'notice'));
  const seen = new Set(), cards = el('div', undefined, 'cards');
  for (const item of [...(data.title_matches || []), ...(data.results || data.matches || [])]) {
    const command = item.read_with || {}, id = scope === 'commentary' ? command.uid : scope === 'post' ? command.citation : item.id || item.text_id || item.uid; if (!id || seen.has(id)) continue; seen.add(id);
    const a = link('', route('read', { uid: id, ...(scope !== 'canon' ? { kind: scope } : {}), ...(command.offset !== undefined ? { offset: command.offset } : {}), ...(item.segment_ref ? { ref: item.segment_ref } : {}) }), 'entry'); a.append(el('small', item.citation || id), el('strong', item.title || item.book?.title || item.citation || id));
    if (item.excerpt || item.text) a.append(el('p', item.excerpt || item.text)); cards.append(a);
  }
  view.append(cards); if (!seen.size) view.append(el('p', 'No matches on this page. Try a citation, a shorter phrase, or Pāli keywords.'));
  const next = [data.next_offset, data.title_next_offset].filter(x => x !== null && x !== undefined); pageControls(next.length ? Math.min(...next) : null, offset ? Math.max(0, offset - 15) : null, n => route('search', { q: query, scope, offset: n }));
  if (scope !== 'canon') provenance(data);
}
function readingArgs(selector) {
  if (selector.startsWith('commentary-ref:')) return { kind: 'commentary', uid: selector.slice(15) };
  if (selector.startsWith('book:')) return { book: selector.slice(5) };
  if (selector.startsWith('post:')) return { kind: 'post', uid: selector.slice(5) };
  if (selector.startsWith('commentary:')) return { kind: 'commentary', uid: selector };
  return { uid: selector };
}
function saveSegment(selector, data, segment, control, container) {
  const found = local.saved.findIndex(x => x.uid === selector && x.ref === segment.ref);
  if (found >= 0) local.saved.splice(found, 1);
  else if (local.saved.length < 500) local.saved.push({ uid: selector, ref: segment.ref, title: data.title || data.book?.title || data.citation || data.book_id, note: '', offset: data.offset + data.segments.indexOf(segment), source_commit: data.source?.commit });
  else { status.textContent = 'Your saved list is full (500 passages). Export it before removing entries.'; return; }
  const active = local.saved.some(x => x.uid === selector && x.ref === segment.ref); control.textContent = active ? 'Saved ✓' : 'Save passage'; control.setAttribute('aria-pressed', String(active)); container.classList.toggle('marked', active); persist();
}
async function read(args, token) {
  const book = args.get('book'), uid = args.get('uid') || 'dhp183', offset = offsetOf(args), kind = book ? 'book' : ['commentary', 'post'].includes(args.get('kind')) ? args.get('kind') : 'canon';
  const request = { ...(kind === 'book' ? { book } : kind === 'post' ? { citation: uid } : { uid }), offset, limit: 30, script: $('script').value };
  const data = await tool(kind === 'commentary' ? 'get_commentary' : kind === 'post' ? 'get_post_canonical' : 'get_text', request); if (token !== epoch) return;
  if (!Array.isArray(data.segments)) throw new Error('Choose an individual book or passage to read.');
  if ((kind === 'post' && data.canonical !== false) || (kind === 'commentary' && !(data.canonical === false && data.content_type === 'commentary') && !(typeof data.label === 'string' && data.label.startsWith('Commentary') && data.label.includes('not the canon')))) throw new Error('This response lacks the expected non-canonical source label.');
  const selector = kind === 'book' ? 'book:' + book : kind === 'post' ? 'post:' + uid : kind === 'canon' ? data.text_id || uid : uid.startsWith('commentary:') ? uid : 'commentary-ref:' + uid;
  heading(kind === 'book' ? 'COMPLETE VRI SOURCE BOOK' : kind === 'commentary' ? 'TRADITIONAL COMMENTARY · NOT CANON' : kind === 'post' ? 'LATER PĀLI WORK · NOT CANON' : 'CANONICAL PĀLI', (data.citation ? data.citation + ' · ' : '') + (data.title || data.book?.title || data.book_id || uid));
  notes(data); view.append(el('p', `Segments ${offset + 1}–${offset + data.returned} of ${data.total_segments}`, 'muted'));
  const toolbar = el('div', undefined, 'toolbar');
  toolbar.append(link('Back to library', route('browse', { node: 'canon' }), 'button'));
  if (kind === 'canon') { toolbar.append(button('English translations', () => translations(data, uid, token)), button('Traditional commentary', () => commentary(uid, token)), button('Related texts', () => relatedTexts(data.text_id || uid, token))); }
  toolbar.append(button('Copy reading link', async () => { try { await navigator.clipboard.writeText(location.href); status.textContent = 'Reading link copied.'; } catch { status.textContent = 'Copy the link from your browser’s address bar.'; } })); view.append(toolbar);
  const additions = el('section'); additions.id = 'study'; additions.setAttribute('aria-live', 'polite'); view.append(additions);
  const passages = el('section'); passages.setAttribute('aria-label', 'Pāli passage');
  for (const segment of data.segments || []) {
    const part = el('article', undefined, 'segment ' + (segment.type === 'heading' ? 'heading' : '')); part.id = 'seg-' + segment.ref.replace(/[^a-z0-9-]/gi, '-');
    const row = el('div', undefined, 'segment-label'); row.append(el('span', segment.ref + (segment.vri_paragraph ? ' · VRI ' + segment.vri_paragraph : '')));
    const active = local.saved.some(x => x.uid === selector && x.ref === segment.ref);
    const save = button(active ? 'Saved ✓' : 'Save passage', () => saveSegment(selector, data, segment, save, part)); save.setAttribute('aria-label', 'Save passage ' + segment.ref); save.setAttribute('aria-pressed', String(active)); const actions = el('div', undefined, 'segment-actions'); actions.append(save);
    if (kind !== 'commentary' && segment.type !== 'heading') { const study = button('Study words', () => wordStudy({ ...(kind === 'book' ? { book } : { uid: kind === 'canon' ? data.text_id || uid : uid }), segment: segment.ref, offset: 0, limit: 15 }, { ref: segment.ref, text: segment.text, source: data.source?.commit, script: $('script').value, kind }, token)); study.setAttribute('aria-label', 'Study words in ' + segment.ref); actions.append(study); }
    row.append(actions); part.classList.toggle('marked', active);
    const text = el('p', segment.text, 'passage'); text.lang = 'pi'; part.append(row, text); passages.append(part);
  }
  view.append(passages); pageControls(data.next_offset, offset ? Math.max(0, offset - 30) : null, n => route('read', { ...readingArgs(selector), offset: n })); provenance(data);
  local.last = location.hash; persist(); updateResume();
  const savedVersion = local.saved.find(x => x.uid === selector && x.source_commit && x.source_commit !== data.source?.commit);
  if (savedVersion) view.prepend(el('p', 'This source revision differs from a saved bookmark. Check its reference before reusing your notes.', 'notice'));
  const ref = args.get('ref'); if (ref) document.getElementById('seg-' + ref.replace(/[^a-z0-9-]/gi, '-'))?.scrollIntoView({ block: 'center' });
}
async function translations(data, uid, token) {
  ++studyEpoch; const target = $('study'); target.replaceChildren(el('h3', 'English translations'));
  if (!data.english_available?.length) { target.append(el('p', 'No verified English translation is linked to this text. No translation has been generated or substituted.', 'notice')); return; }
  target.append(el('p', 'English is retrieved from the named source when selected. Paragraphs are not aligned to Pāli segments.', 'muted'));
  for (const t of data.english_available) target.append(button([t.translator || t.translation_id, t.source, t.reference].filter(Boolean).join(' · '), () => englishPage({ uid, translation: t.translation_id }, token)));
}
async function englishPage(args, token) {
  const studyToken = ++studyEpoch; const target = $('study'); target.replaceChildren(el('p', 'Retrieving the selected translation…'));
  try {
    const data = await tool('get_translation', args); if (token !== epoch || studyToken !== studyEpoch) return;
    target.replaceChildren(el('h3', data.translator || 'English translation')); notes(data, target); target.append(el('p', data.text, 'translation')); provenance(data, target);
    if (data.continue_with) target.append(button('Next English page →', () => englishPage(data.continue_with.arguments || data.continue_with, token)));
  } catch (error) { if (token === epoch && studyToken === studyEpoch) target.replaceChildren(el('p', error.message, 'notice'), button('Retry selected translation', () => englishPage(args, token))); }
}
async function commentary(uid, token, offset = 0) {
  const studyToken = ++studyEpoch; const target = $('study'); target.replaceChildren(el('p', 'Opening commentary…'));
  try { const data = await tool('get_commentary', { uid, offset, limit: 20, script: $('script').value }); if (token !== epoch || studyToken !== studyEpoch) return;
    target.replaceChildren(el('h3', 'Traditional commentary · not canonical root text')); notes(data, target);
    for (const segment of data.segments || []) target.append(el('p', segment.text, 'passage'));
    if (data.next_offset !== null && data.next_offset !== undefined) target.append(button('Next commentary page →', () => commentary(uid, token, data.next_offset)));
    if (data.available === false || !data.segments?.length) target.append(el('p', 'No verified aligned commentary is available for this selection.', 'notice'));
    provenance(data, target);
  } catch (error) { if (token === epoch && studyToken === studyEpoch) target.replaceChildren(el('p', error.message, 'notice')); }
}
function studyTarget(message) {
  const target = $('study'); target.replaceChildren(el('p', message)); target.tabIndex = -1; target.setAttribute('aria-label', 'Study tools, separate from scripture'); target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'start' }); return target;
}
async function wordStudy(args, expected, token) {
  const studyToken = ++studyEpoch, target = studyTarget('Looking up the selected passage in the bundled dictionary…');
  try {
    const data = await tool('analyse_passage', args); if (token !== epoch || studyToken !== studyEpoch) return;
    if (data.segment?.ref !== expected.ref || data.text_source?.commit !== expected.source || localizeText({ segments: data.segment ? [data.segment] : [] }, expected.script).segments[0]?.text !== expected.text) throw new Error('The returned analysis does not match the selected source passage. Reload the passage; no other analysis was substituted.');
    if (expected.kind === 'post' && data.canonical !== false) throw new Error('The analysis lacks its later-work source label.');
    target.replaceChildren(el('h3', 'Word study · dictionary reference'));
    target.append(el('p', data.guidance, 'notice')); notes(data, target);
    target.append(el('p', 'Source segment: ' + data.segment.ref + ' · forms and analysis shown in Roman Pāli', 'muted'));
    if (data.dictionary_coverage_note) target.append(el('p', data.dictionary_coverage_note, 'notice'));
    const list = el('div', undefined, 'word-list');
    for (const word of data.words || []) {
      const item = el('article', undefined, 'word-card'); item.append(el('h4', word.surface));
      if (word.form && word.form !== word.surface) item.append(el('p', 'Analysed form: ' + word.form, 'muted'));
      if (word.note) item.append(el('p', word.note, 'muted'));
      if (word.status === 'unknown') item.append(el('p', word.message || 'Unknown in this dictionary subset; no meaning is guessed.', 'notice'));
      for (const analysis of word.analyses || []) {
        const d = el('details'); d.open = true; d.append(el('summary', analysis.headword + (analysis.pos ? ' · ' + analysis.pos : '')));
        if (analysis.grammar?.length) d.append(el('p', analysis.grammar.join('; '), 'muted'));
        const meanings = el('ul'); for (const sense of analysis.meanings || []) meanings.append(el('li', sense.lemma + ': ' + sense.meaning)); d.append(meanings);
        if (analysis.senses_total > (analysis.meanings || []).length) d.append(el('p', analysis.senses_total + ' total senses; this tool returns an excerpt.', 'muted'));
        if (analysis.root) d.append(el('p', 'Root: ' + analysis.root.root + (analysis.root.meaning ? ' · ' + analysis.root.meaning : ''), 'muted'));
        if (analysis.note) d.append(el('p', analysis.note)); item.append(d);
      }
      const splits = [word.split, ...(word.other_splits || [])].filter(Boolean); if (splits.length) item.append(el('p', 'Computed split suggestions, not a translation: ' + splits.join(' | '), 'notice'));
      if (word.more_headwords) item.append(el('p', word.more_headwords + ' further headwords are not displayed by this tool.', 'muted'));
      list.append(item);
    }
    target.append(list);
    const pagination = el('div', undefined, 'toolbar');
    if (args.offset > 0) pagination.append(button('← Previous words', () => wordStudy({ ...args, offset: Math.max(0, args.offset - args.limit) }, expected, token)));
    if (data.next_offset !== null && data.next_offset !== undefined) pagination.append(button('Next words →', () => wordStudy({ ...args, offset: data.next_offset }, expected, token)));
    target.append(pagination); provenance({ ...data, edition: 'Digital Pāḷi Dictionary · reference material', source: undefined }, target); provenance({ edition: 'Passage source, separate from dictionary', source: data.text_source }, target);
  } catch (error) { if (token === epoch && studyToken === studyEpoch) target.replaceChildren(el('p', error.message, 'notice'), button('Retry this word study', () => wordStudy(args, expected, token))); }
}
async function relatedTexts(uid, token, offset = 0) {
  const studyToken = ++studyEpoch, target = studyTarget('Finding recorded related passages…');
  try {
    const data = await tool('get_parallels', { uid, offset, limit: 10 }); if (token !== epoch || studyToken !== studyEpoch) return;
    if (typeof data.available !== 'boolean' || !Array.isArray(data.links)) throw new Error('The related-text response is incomplete. No absence of relationships can be inferred.');
    target.replaceChildren(el('h3', 'Related texts · evidence, not interpretation')); notes(data, target);
    if (!data.links?.length) target.append(el('p', data.available === false ? 'Related-text data is unavailable in this server copy.' : 'No related link is recorded here. That does not mean no related passage exists.', 'notice'));
    for (const relation of data.links || []) {
      const card = el('article', undefined, 'word-card');
      card.append(el('p', relation.source === 'shared-passage' ? 'SHARED WORDING · MACHINE-MATCHED' : relation.source === 'commentary-citation' ? 'CITATION IN COMMENTARY · NOT CANON' : 'REFERENCE LINK · ' + relation.source, 'eyebrow'), el('h4', (relation.text?.citation || '') + ' · ' + (relation.text?.title || 'Related passage')), el('p', relation.relation), el('p', relation.how_matched, 'muted'));
      if (relation.evidence) card.append(el('p', relation.evidence, 'notice'));
      if (relation.score !== undefined) card.append(el('p', 'Shared-word score: ' + relation.score + ' (not a probability or doctrinal-equivalence claim)', 'muted'));
      const actions = el('div', undefined, 'toolbar');
      const other = relation.other_read_with;
      if (other?.tool === 'get_text' && typeof other.uid === 'string') actions.append(link('Read shared passage', route('read', { uid: other.uid, offset: other.offset || 0, ...(relation.other_segments?.[0] ? { ref: relation.other_segments[0] } : {}) }), 'button'));
      else if (relation.text?.id) actions.append(link('Read canonical text', route('read', { uid: relation.text.id }), 'button'));
      if (relation.commentary?.read_with?.tool === 'get_commentary' && typeof relation.commentary.read_with.uid === 'string') actions.append(link('Read commentary evidence', route('read', { kind: 'commentary', uid: relation.commentary.read_with.uid }), 'button'));
      card.append(actions); target.append(card);
    }
    const pagination = el('div', undefined, 'toolbar');
    if (offset > 0) pagination.append(button('← Previous related links', () => relatedTexts(uid, token, Math.max(0, offset - 10))));
    if (data.next_offset !== null && data.next_offset !== undefined) pagination.append(button('Next related links →', () => relatedTexts(uid, token, data.next_offset)));
    target.append(pagination);
    if (data.suttacentral_parallels?.url) { target.append(el('p', data.suttacentral_parallels.note, 'muted'), external('Explore external parallels (link only)', data.suttacentral_parallels.url)); }
    provenance(data, target);
  } catch (error) { if (token === epoch && studyToken === studyEpoch) target.replaceChildren(el('p', error.message, 'notice'), button('Retry related-text lookup', () => relatedTexts(uid, token, offset))); }
}
async function dictionary(args, token) {
  const term = (args.get('term') || '').trim(), direction = ['en-pa', 'pa-en'].includes(args.get('direction')) ? args.get('direction') : 'auto';
  heading('REFERENCE MATERIAL · NOT SCRIPTURE', 'Words and meanings');
  const form = el('form'); form.id = 'glossary-form';
  const termLabel = el('label', 'Pāli word or English phrase'); termLabel.htmlFor = 'glossary-term'; const input = el('input'); input.id = 'glossary-term'; input.name = 'term'; input.maxLength = 100; input.required = true; input.value = term;
  const directionLabel = el('label', 'Direction'); directionLabel.htmlFor = 'glossary-direction'; const select = el('select'); select.id = 'glossary-direction';
  for (const [value, label] of [['auto','Both directions'],['en-pa','English → Pāli'],['pa-en','Pāli → English']]) { const option = el('option', label); option.value = value; select.append(option); } select.value = direction;
  const submit = el('button', 'Look up'); submit.type = 'submit'; form.append(termLabel, input, directionLabel, select, submit);
  form.addEventListener('submit', event => { event.preventDefault(); const next = route('glossary', { term: input.value.trim(), direction: select.value }); if (location.hash === next) render(); else location.hash = next; });
  view.append(form, el('p', 'Short sourced glosses help find terms. They are not passage translations or a decision about which meaning fits the context.', 'notice'));
  if (!term) { view.append(el('p', 'Try mindfulness, mettā or a word in a supported Pāli script. Nothing is generated.')); return; }
  const data = await tool('glossary', { term, direction, limit: 10 }); if (token !== epoch) return;
  if (typeof data.found !== 'number' || !data.sources?.dpd?.attribution || !data.sources?.dpd?.license || !['english_to_pali', 'pali_to_english'].some(key => Array.isArray(data[key]))) throw new Error('The glossary response is incomplete or missing its source terms. This is not a no-match result.');
  notes(data); if (data.note) view.append(el('p', data.note, 'notice'));
  for (const [key, title] of [['english_to_pali', 'English → Pāli'], ['pali_to_english', 'Pāli → English']]) {
    if (!data[key]?.length) continue; view.append(el('h3', title)); const cards = el('div', undefined, 'cards');
    for (const entry of data[key]) { const card = el('article', undefined, 'entry'); card.append(el('strong', entry.pali), el('p', entry.meaning || entry.gloss || ''), el('small', [entry.pos, entry.source].filter(Boolean).join(' · ')), link('Find this word in canonical texts', route('search', { q: entry.pali, scope: 'canon' }))); cards.append(card); } view.append(cards);
  }
  if (!data.found) view.append(el('p', 'No matching term was found in the bundled glossary. No meaning has been invented. Try a shorter or differently spelled term.', 'notice'));
  if (data.sources?.dpd) provenance({ edition: data.sources.dpd.name, dictionary: data.sources.dpd, attribution: data.sources.dpd.attribution, license: data.sources.dpd.license }, view);
  if (data.sources?.lists) view.append(el('p', data.sources.lists.name + ' · ' + data.sources.lists.note, 'provenance'));
}
function saved() {
  heading('YOUR PERSONAL READING', 'Saved passages'); view.append(el('p', 'Bookmarks and notes stay in this browser only. They are not scripture, synced, or backed up. Export them to keep a copy.', 'notice'));
  view.append(button('Export bookmarks and notes', () => { const blob = new Blob([JSON.stringify({ format: KEY, saved: local.saved }, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = link('', url); a.download = 'pali-library-bookmarks.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }));
  if (!local.saved.length) view.append(el('p', 'Save a passage while reading to find it here.'));
  for (const item of [...local.saved]) {
    const box = el('article', undefined, 'segment'); const index = Number.isSafeInteger(item.offset) && item.offset >= 0 ? item.offset : Number(item.ref.match(/\/c?(\d+)$/)?.[1] || 1) - 1;
    box.append(link(item.title + ' · ' + item.ref, route('read', { ...readingArgs(item.uid), offset: Math.floor(index / 30) * 30, ref: item.ref })));
    const label = el('label', 'Your personal note'); const input = el('textarea'); input.className = 'note-field'; input.maxLength = 4000; input.value = typeof item.note === 'string' ? item.note : ''; label.append(input); box.append(label);
    box.append(button('Save note', () => { const original = local.saved.find(x => x.uid === item.uid && x.ref === item.ref); if (original) original.note = input.value; if (persist()) status.textContent = 'Personal note saved in this browser.'; }), button('Remove bookmark', () => { local.saved = local.saved.filter(x => !(x.uid === item.uid && x.ref === item.ref)); persist(); render(); }));
    if (item.source_commit) box.append(el('small', 'Saved source revision: ' + item.source_commit, 'muted')); view.append(box);
  }
}
function about() {
  heading('A LIBRARY, NOT A TEACHER', 'Read with the source in view.');
  for (const text of ['The bundled Pāli is retrieved from the VRI Chaṭṭha Saṅgāyana edition. Scripture is never generated or reconstructed. Abbreviations and uncertain alignments stay labelled.', 'English translations are available for a subset of texts and fetched only after you choose them. Translators’ wording is not silently exchanged. Commentary is labelled separately from canonical text.', 'VRI and several translation/dictionary sources carry non-commercial terms. This reading interface adds no permission to redistribute, translate or commercialize their work.', 'Your saved passages, notes and preferences are stored in this browser. The app has no accounts, advertising, analytics, cloud sync or offline web download. The server may hold your IP temporarily for rate limiting; deployment providers may keep separate infrastructure logs.']) view.append(el('p', text));
  const links = el('div', undefined, 'toolbar'); links.append(external('Source and licence register', 'https://github.com/DaniilKi/pali-canon-claude/blob/dev/pali-reliability/THIRD_PARTY.md'), external('Project and complete MCP toolset', 'https://github.com/DaniilKi/pali-canon-claude')); view.append(links);
}
async function render() {
  if (location.hash === '#content' && view.childElementCount) { $('content').focus(); return; }
  const token = ++epoch; ++studyEpoch; view.replaceChildren(); status.textContent = 'Opening the library…';
  const [page, query = ''] = location.hash.slice(1).split('?'), args = new URLSearchParams(query);
  try { if (page === 'read') await read(args, token); else if (page === 'search') await search(args, token); else if (page === 'glossary') await dictionary(args, token); else if (page === 'saved') saved(); else if (page === 'about') about(); else await browse(args, token);
    if (token !== epoch) return; status.textContent = storageOK ? '' : 'Browser storage is unavailable; export personal notes before closing this tab.'; focusHeading();
  } catch (error) { if (token !== epoch) return; view.replaceChildren(); heading('UNABLE TO OPEN', 'No passage was substituted.'); view.append(el('p', error.message, 'notice'), button('Try again', render), link('Browse the library', route('browse', { node: 'canon' }), 'button')); status.textContent = 'The request failed.'; }
}
window.addEventListener('hashchange', render); render();
