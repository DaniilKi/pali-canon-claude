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
  if (data.alignment) list.push(typeof data.alignment === 'string' ? data.alignment : JSON.stringify(data.alignment));
  if (list.length) target.append(el('div', [...new Set(list)].join('\n'), 'notice'));
}
function provenance(data, target = view) {
  const box = el('section', undefined, 'provenance'); box.setAttribute('aria-label', 'Source attribution');
  box.append(el('strong', data.edition || data.label || 'Source provenance'));
  for (const value of [data.attribution || data.source?.attribution, data.license || data.source?.terms, data.source?.commit && 'Source revision: ' + data.source.commit]) if (value) box.append(el('p', typeof value === 'string' ? value : JSON.stringify(value)));
  if (data.url) box.append(external('Read at the original source', data.url));
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
$('search-form').addEventListener('submit', e => { e.preventDefault(); location.hash = route('search', { q: $('query').value.trim() }); });
$('reference-form').addEventListener('submit', e => { e.preventDefault(); location.hash = route('read', { uid: $('reference').value.trim() }); });
function pageControls(next, previous, action) {
  const p = el('nav', undefined, 'pager'); p.setAttribute('aria-label', 'Pagination');
  if (previous !== null) p.append(link('← Previous page', action(previous), 'button'));
  if (next !== null && next !== undefined) p.append(link('Next page →', action(next), 'button'));
  view.append(p);
}
async function browse(args, token) {
  const node = args.get('node') || 'canon', offset = offsetOf(args), limit = 40;
  const data = await tool('browse_canon', { node, offset, limit }); if (token !== epoch) return;
  heading('EXPLORE THE LIBRARY', data.name || 'The Pāli Canon');
  const nav = el('div', undefined, 'toolbar'); nav.append(link('All collections', route('browse', { node: 'canon' }), 'button'), link('Complete source books', route('browse', { node: 'books' }), 'button')); view.append(nav);
  if (data.note) view.append(el('p', data.note, 'muted'));
  const cards = el('div', undefined, 'cards');
  for (const item of data.items || []) {
    const href = item.read_with?.book ? route('read', { book: item.read_with.book }) : item.citation ? route('read', { uid: item.id }) : route('browse', { node: item.id });
    const card = link('', href, 'entry'); card.append(el('small', item.citation || item.pitaka || 'Collection'), el('strong', item.name || item.title || item.id));
    if (item.texts !== undefined) card.append(el('p', item.texts + ' texts'));
    if (item.english_available !== undefined) card.append(el('p', item.english_available ? 'English translation linked' : 'Pāli source text'));
    cards.append(card);
  }
  view.append(cards); pageControls(data.next_offset, offset ? Math.max(0, offset - limit) : null, n => route('browse', { node, offset: n }));
}
function offsetOf(args) { const n = Number(args.get('offset') || 0); return Number.isSafeInteger(n) && n >= 0 && n <= 100000 ? n : 0; }
async function search(args, token) {
  const query = (args.get('q') || '').trim(); if (!query) throw new Error('Enter words or a title to search.');
  const offset = offsetOf(args), data = await tool('search_texts', { query, offset, limit: 15, script: $('script').value }); if (token !== epoch) return;
  heading('SEARCH THE CANON', 'Results for “' + query + '”'); notes(data);
  if (data.expanded_from_english) view.append(el('p', 'English keywords expanded into Pāli: ' + JSON.stringify(data.expanded_from_english), 'notice'));
  const seen = new Set(), cards = el('div', undefined, 'cards');
  for (const item of [...(data.title_matches || []), ...(data.results || data.matches || [])]) {
    const id = item.id || item.text_id || item.uid; if (!id || seen.has(id)) continue; seen.add(id);
    const a = link('', route('read', { uid: id, ...(item.read_with?.offset !== undefined ? { offset: item.read_with.offset } : {}), ...(item.segment_ref ? { ref: item.segment_ref } : {}) }), 'entry'); a.append(el('small', item.citation || id), el('strong', item.title || item.citation || id));
    if (item.excerpt || item.text) a.append(el('p', item.excerpt || item.text)); cards.append(a);
  }
  view.append(cards); if (!seen.size) view.append(el('p', 'No matches on this page. Try a citation, a shorter phrase, or Pāli keywords.'));
  const next = [data.next_offset, data.title_next_offset].filter(x => x !== null && x !== undefined); pageControls(next.length ? Math.min(...next) : null, offset ? Math.max(0, offset - 15) : null, n => route('search', { q: query, offset: n }));
}
function saveSegment(selector, data, segment, control, container) {
  const found = local.saved.findIndex(x => x.uid === selector && x.ref === segment.ref);
  if (found >= 0) local.saved.splice(found, 1);
  else if (local.saved.length < 500) local.saved.push({ uid: selector, ref: segment.ref, title: data.title || data.citation || data.book_id, note: '', source_commit: data.source?.commit });
  else { status.textContent = 'Your saved list is full (500 passages). Export it before removing entries.'; return; }
  const active = local.saved.some(x => x.uid === selector && x.ref === segment.ref); control.textContent = active ? 'Saved ✓' : 'Save passage'; control.setAttribute('aria-pressed', String(active)); container.classList.toggle('marked', active); persist();
}
async function read(args, token) {
  const book = args.get('book'), uid = args.get('uid') || 'dhp183', offset = offsetOf(args), selector = book ? 'book:' + book : uid;
  const request = { ...(book ? { book } : { uid }), offset, limit: 30, script: $('script').value };
  const data = await tool('get_text', request); if (token !== epoch) return;
  heading(book ? 'COMPLETE VRI SOURCE BOOK' : 'CANONICAL PĀLI', (data.citation ? data.citation + ' · ' : '') + (data.title || data.book_id || uid));
  notes(data); view.append(el('p', `Segments ${offset + 1}–${offset + data.returned} of ${data.total_segments}`, 'muted'));
  const toolbar = el('div', undefined, 'toolbar');
  toolbar.append(link('Back to library', route('browse', { node: 'canon' }), 'button'));
  if (!book) { toolbar.append(button('English translations', () => translations(data, uid, token)), button('Traditional commentary', () => commentary(uid, token))); }
  toolbar.append(button('Copy reading link', async () => { try { await navigator.clipboard.writeText(location.href); status.textContent = 'Reading link copied.'; } catch { status.textContent = 'Copy the link from your browser’s address bar.'; } })); view.append(toolbar);
  const additions = el('section'); additions.id = 'study'; additions.setAttribute('aria-live', 'polite'); view.append(additions);
  const passages = el('section'); passages.setAttribute('aria-label', 'Pāli passage');
  for (const segment of data.segments || []) {
    const part = el('article', undefined, 'segment ' + (segment.type === 'heading' ? 'heading' : '')); part.id = 'seg-' + segment.ref.replace(/[^a-z0-9-]/gi, '-');
    const row = el('div', undefined, 'segment-label'); row.append(el('span', segment.ref + (segment.vri_paragraph ? ' · VRI ' + segment.vri_paragraph : '')));
    const active = local.saved.some(x => x.uid === selector && x.ref === segment.ref);
    const save = button(active ? 'Saved ✓' : 'Save passage', () => saveSegment(selector, data, segment, save, part)); save.setAttribute('aria-label', 'Save passage ' + segment.ref); save.setAttribute('aria-pressed', String(active)); row.append(save); part.classList.toggle('marked', active);
    const text = el('p', segment.text, 'passage'); text.lang = 'pi'; part.append(row, text); passages.append(part);
  }
  view.append(passages); pageControls(data.next_offset, offset ? Math.max(0, offset - 30) : null, n => route('read', { ...(book ? { book } : { uid }), offset: n })); provenance(data);
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
function saved() {
  heading('YOUR PERSONAL READING', 'Saved passages'); view.append(el('p', 'Bookmarks and notes stay in this browser only. They are not scripture, synced, or backed up. Export them to keep a copy.', 'notice'));
  view.append(button('Export bookmarks and notes', () => { const blob = new Blob([JSON.stringify({ format: KEY, saved: local.saved }, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = link('', url); a.download = 'pali-library-bookmarks.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }));
  if (!local.saved.length) view.append(el('p', 'Save a passage while reading to find it here.'));
  for (const item of [...local.saved]) {
    const box = el('article', undefined, 'segment'); const index = Number(item.ref.match(/\/(\d+)$/)?.[1] || 1) - 1;
    box.append(link(item.title + ' · ' + item.ref, route('read', { ...(item.uid.startsWith('book:') ? { book: item.uid.slice(5) } : { uid: item.uid }), offset: Math.floor(index / 30) * 30, ref: item.ref })));
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
  const token = ++epoch; ++studyEpoch; view.replaceChildren(); status.textContent = 'Opening the library…';
  const [page, query = ''] = location.hash.slice(1).split('?'), args = new URLSearchParams(query);
  try { if (page === 'read') await read(args, token); else if (page === 'search') await search(args, token); else if (page === 'saved') saved(); else if (page === 'about') about(); else await browse(args, token);
    if (token !== epoch) return; status.textContent = storageOK ? '' : 'Browser storage is unavailable; export personal notes before closing this tab.'; focusHeading();
  } catch (error) { if (token !== epoch) return; view.replaceChildren(); heading('UNABLE TO OPEN', 'No passage was substituted.'); view.append(el('p', error.message, 'notice'), button('Try again', render), link('Browse the library', route('browse', { node: 'canon' }), 'button')); status.textContent = 'The request failed.'; }
}
window.addEventListener('hashchange', render); render();
