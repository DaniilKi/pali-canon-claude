import { bookmarkLocation } from './bookmark-location.mjs';
import { savedPage, savedScope, savedScopeLabels } from './saved-passages.mjs';
import { installPagePrinting } from './print-page.mjs';
import { localizeText } from '../src/script.mjs';
import { scopeDescriptor, validateEnglishPage } from './translation-policy.mjs';
import { planCatalog, planDay, daySignature, cleanProgress, planWindow, validatePlanPage } from './reading-plans.mjs';
import { MAX_IMPORT_BYTES, parseBookmarks, bookmarkMerge } from './bookmark-import.mjs';
import { validateDaily } from './daily-reading.mjs';
import { validatePaliQuote } from './quote-check.mjs';
import { MAX_PROGRESS_BYTES, parseProgress, mergeProgress } from './progress-import.mjs';
import { topicCatalogue, topicDetail, listCatalogue, listDetail } from './topics-study.mjs';
import { createRequestPool } from './request-lifecycle.mjs';
import { readingPosition, assertPositionPin, sourceRevision, isReadingLocator } from './reading-position.mjs';
import { guardedStorageWrite, guardedPositionWrite, readingPointerOnlyChange } from './local-storage-write.mjs';
import { ENGLISH_AVAILABILITY, englishBrowseCandidate, englishSelection, englishRoute, englishCatalogue, englishBadges } from './english-catalogue.mjs';
import { comparisonChoices, comparisonSelection, validateComparisonPage } from './translation-comparison.mjs';
import { passageNoteKey, passageNoteState, passageNoteRemovalNeedsConfirmation, passageNoteTransaction, restorePassageNoteTransaction } from './passage-notes.mjs';
import { readingPagePosition, assertPageRequest, assertPagePin, readingPageBounds, readingJumpOffset } from './reading-navigation.mjs';
import { savedPassageHighlighted } from './saved-highlights.mjs';
import { validateChapterIndex, validateChapterMenu, chapterLink, readingIntro } from './reading-chapters.mjs';
import { bookSearchSelection, bookSearchRoute, bookSearchCatalogue, validateBookSearchPage, bookSearchHitLinks } from './book-search.mjs';
import { reviewBackupNoteConflicts } from './backup-note-conflicts.mjs';
import { MAX_STUDY_BACKUP_BYTES, createStudyBackup, parseStudyBackup, mergeStudyBackup } from './study-backup.mjs';
/* Source text is retrieved through the existing, schema-validated MCP tools. Never render source HTML. */
'use strict';
const $ = id => document.getElementById(id);
const view = $('view'), status = $('status');
let serial = 0, epoch = 0, studyEpoch = 0, positionTimer, activePosition = null;
const KEY = 'pali-library-v1';
let storageOK = true, storageSnapshot, positionDurable = true, positionWarning = '', storageConflict = false, storageReadFailed = false;
const noteDrafts = new Map(), noteKey = passageNoteKey;
let highlightTargets = [];
function refreshPersonalHighlights() {
  highlightTargets = highlightTargets.filter(target => target.token === epoch && target.node.isConnected);
  for (const target of highlightTargets) target.node.classList.toggle('personal-highlight', savedPassageHighlighted(local.saved, target.context, local.highlight_saved !== false));
}
function loadLocal() { try { const raw = localStorage.getItem(KEY); storageSnapshot = raw; const x = JSON.parse(raw || '{}'); if (!x || typeof x !== 'object' || Array.isArray(x)) throw Error('Unsupported browser data'); return x; } catch { storageOK = false; storageReadFailed = true; return {}; } }
const local = loadLocal();
local.reading_progress = cleanProgress(local.reading_progress);
if (!Array.isArray(local.saved)) local.saved = [];
local.saved = local.saved.filter(x => x && typeof x.uid === 'string' && typeof x.ref === 'string' && typeof x.title === 'string').slice(0, 500);
function storageWarning() { return storageConflict ? 'Another tab changed browser data. Changes are kept in this tab only; no saved data was overwritten. Export reading progress and bookmarks/notes before reloading.' : 'Browser storage is unavailable. Changes are kept in this tab only. Export reading progress and bookmarks/notes before closing.'; }
function exportBookmarks() { return { format: KEY, saved: local.saved.map(item => { return noteDrafts.has(noteKey(item)) ? { ...item, note: noteDrafts.get(noteKey(item)) } : item; }) }; }
function showStorageRecovery() {
  const panel = $('storage-recovery'); if (!panel.hidden) { panel.querySelector('p').textContent = storageWarning(); return; } panel.hidden = false;
  panel.replaceChildren(el('h2', 'Keep this tab’s changes'), el('p', storageWarning()), el('p', 'Recovery files include this tab’s unsaved note edits. Existing saved data is kept. After reloading, compare conflicting notes manually; import keeps existing notes on duplicate passages.', 'muted'));
  const actions = el('div', undefined, 'toolbar'); actions.append(button('Download study backup', downloadStudyBackup), button('Download this tab’s bookmarks and notes', () => exportPersonal(exportBookmarks(), 'pali-library-bookmarks.json')), button('Download this tab’s reading progress', () => exportPersonal({ format: 'pali-library-reading-progress-v1', progress: local.reading_progress }, 'pali-library-reading-progress.json')));
  const review = el('div'); actions.append(button('Review reload options', () => { const title = el('h3', 'Export before reloading'); title.tabIndex = -1; review.replaceChildren(title, el('p', 'Reloading replaces changes kept only in this tab with stored browser data. Download both recovery files first.', 'notice'), button('Cancel reload', () => { review.replaceChildren(); actions.querySelector('button:last-child').focus(); }), button('Reload stored browser data', () => location.reload())); title.focus(); })); panel.append(actions, review);
}
function persist() {
  try {
    if (storageConflict || storageReadFailed) { showStorageRecovery(); status.textContent = storageWarning(); return false; }
    const serialized = JSON.stringify(local); storageSnapshot = guardedStorageWrite({ expected: storageSnapshot, value: serialized, read: () => localStorage.getItem(KEY), write: value => localStorage.setItem(KEY, value) });
    if (storageSnapshot !== serialized) { const saved = JSON.parse(storageSnapshot); if (Object.hasOwn(saved, 'last')) local.last = saved.last; else delete local.last; updateResume(); }
    positionWarning = ''; storageOK = true; positionDurable = true; $('storage-recovery').hidden = true; return true;
  } catch (error) { if (error.code === 'BROWSER_DATA_CHANGED') storageConflict = true; else storageOK = false; showStorageRecovery(); status.textContent = storageWarning(); return false; }
}
function el(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function button(text, fn) { const n = el('button', text); n.type = 'button'; n.addEventListener('click', fn); return n; }
function link(text, href, className) { const n = el('a', text, className); n.href = href; return n; }
function external(text, url) { try { const u = new URL(url); if (!['http:', 'https:'].includes(u.protocol)) return el('span', text); return link(text, u.href); } catch { return el('span', text); } }
function route(name, args = {}) { return '#' + name + '?' + new URLSearchParams(args); }
const requestLabels = { get_text: 'Pāli reading', get_translation: 'English source', browse_canon: 'Library', get_commentary: 'Commentary', get_post_canonical: 'Later Pāli reading', reading_plan: 'Reading plan', search_texts: 'Text search', search_source_book: 'Source-book search', search_commentary: 'Commentary search', search_post_canonical: 'Later-work search', glossary: 'Glossary', analyse_passage: 'Word study', get_parallels: 'Related texts', daily_text: 'Daily reading', verify_quote: 'Quotation check', list_topics: 'Topic index', topic: 'Topic detail', dhamma_list: 'Teaching list' };
const requestRows = new Map();
const requests = createRequestPool({ onChange(entries) {
  const active = new Set(entries.map(x => x.id));
  for (const [id, row] of requestRows) if (!active.has(id)) { if (row.contains(document.activeElement)) (row.dataset.group === 'study' ? $('study') || $('content') : $('content')).focus({ preventScroll: true }); row.remove(); requestRows.delete(id); }
  for (const entry of entries) if (!requestRows.has(entry.id)) { const row = el('div', undefined, 'request-row'), stop = button('Stop waiting', entry.stop); row.dataset.group = entry.group; stop.setAttribute('aria-label', 'Stop waiting for ' + entry.label); row.append(el('span', 'Waiting for ' + entry.label + '…'), stop); $('request-controls').append(row); requestRows.set(entry.id, row); }
  $('pending-requests').hidden = entries.length === 0;
} });
async function tool(name, args, group = 'page', requestLabel = requestLabels[name] || 'Reading request') {
  return requests.run(async signal => {
    const response = await fetch('/mcp', { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++serial, method: 'tools/call', params: { name, arguments: args } }) });
    if (!response.ok) throw new Error(response.status === 429 ? 'Too many requests. Wait a minute, then try again.' : 'The text service is unavailable. Try again.');
    const rpc = await response.json();
    if (rpc.error) throw new Error(rpc.error.message);
    const result = rpc.result;
    if (!result) throw new Error('The text service returned an incomplete response.');
    const data = result.structuredContent || JSON.parse(result.content?.find(c => c.type === 'text')?.text || '{}');
    if (result.isError || data.error) throw new Error(data.error || 'This selection could not be retrieved.');
    return data;
  }, { group, label: requestLabel });
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
function heading(eyebrow, title, tabTitle = title) { view.append(el('p', eyebrow, 'eyebrow'), el('h2', title)); document.title = String(tabTitle).slice(0, 160) + ' · Pāli Library'; }
const narrowReading = window.matchMedia('(max-width: 760px)');
function responsivePanels() {
  for (const panel of document.querySelectorAll('#find-panel, .study-actions')) {
    const summary = panel.querySelector(':scope > summary'), active = document.activeElement; panel.open = !narrowReading.matches;
    if (narrowReading.matches && panel.contains(active) && active !== summary) summary.focus({ preventScroll: true });
    else if (!narrowReading.matches && active === summary) panel.querySelector('input, button, a, select')?.focus({ preventScroll: true });
  }
}
function closeFinder() { if (narrowReading.matches) { const panel = $('find-panel'), focused = panel.contains(document.activeElement); panel.open = false; if (focused) $('content').focus({ preventScroll: true }); } }
function navigateFromFinder(target) { closeFinder(); $('content').focus({ preventScroll: true }); if (location.hash === target) render(); else location.hash = target; }
if (narrowReading.addEventListener) narrowReading.addEventListener('change', responsivePanels); else narrowReading.addListener(responsivePanels); responsivePanels();
function focusHeading() { $('content').focus({ preventScroll: true }); }
function updateResume() { const valid = local.remember_position !== false && typeof local.last === 'string' && /^#read\?/.test(local.last); $('resume').hidden = !valid || location.hash === local.last || activePosition?.token === epoch && activePosition.links.some(x => x.href === local.last); if (valid) $('resume').href = local.last; }
function rememberPosition(href) {
  if (local.remember_position === false || !href || local.last === href) return;
  local.last = href; updateResume();
  if (storageReadFailed) { positionDurable = false; showStorageRecovery(); status.textContent = storageWarning(); return; }
  try {
    const result = guardedPositionWrite({ expected: storageSnapshot, locator: href, read: () => localStorage.getItem(KEY), write: value => localStorage.setItem(KEY, value) }); storageSnapshot = result.snapshot;
    if (result.disabled) { local.remember_position = false; delete local.last; $('remember-position').checked = false; updateResume(); }
    positionDurable = true; positionWarning = '';
  } catch (error) { positionDurable = false; if (error.code === 'BROWSER_DATA_CHANGED') positionWarning = 'Reading position is kept in this tab only because browser data changed while saving. No notes were replaced.'; else { storageOK = false; showStorageRecovery(); } status.textContent = positionWarning || storageWarning(); }
}
function visibleReadingPosition() { if (activePosition?.token !== epoch) return; return activePosition.links.find(x => { const rect = x.node.getBoundingClientRect(); return rect.bottom > 1 && rect.top < innerHeight; }); }
function flushReadingPosition() {
  clearTimeout(positionTimer); if (local.remember_position === false || activePosition?.token !== epoch) return;
  const visible = visibleReadingPosition();
  if (visible) rememberPosition(visible.href);
}
window.addEventListener('scroll', () => { clearTimeout(positionTimer); if (activePosition?.token === epoch && local.remember_position !== false) positionTimer = setTimeout(flushReadingPosition, 350); }, { passive: true });
window.addEventListener('pagehide', flushReadingPosition);
function preferences() {
  $('remember-position').checked = local.remember_position !== false;
  $('highlight-saved').checked = local.highlight_saved !== false;
  const size = Math.max(16, Math.min(30, Number(local.font) || 21));
  document.documentElement.style.setProperty('--reading', size + 'px'); $('font-size').value = size;
  document.body.dataset.theme = local.theme === 'dark' ? 'dark' : 'light'; $('theme').value = document.body.dataset.theme;
  if ([...$('script').options].some(o => o.value === local.script)) $('script').value = local.script;
}
preferences(); updateResume();
$('remember-position').addEventListener('change', e => { local.remember_position = e.target.checked; if (!e.target.checked) { clearTimeout(positionTimer); delete local.last; } persist(); if (e.target.checked) flushReadingPosition(); updateResume(); });
$('highlight-saved').addEventListener('change', e => { local.highlight_saved = e.target.checked; persist(); refreshPersonalHighlights(); });
$('font-size').addEventListener('input', e => { local.font = Number(e.target.value); preferences(); persist(); });
$('theme').addEventListener('change', e => { local.theme = e.target.value; preferences(); persist(); });
$('script').addEventListener('change', e => { local.script = e.target.value; persist(); if (location.hash.startsWith('#read') || location.hash.startsWith('#daily')) render(); });
$('search-form').addEventListener('submit', e => { e.preventDefault(); navigateFromFinder(route('search', { q: $('query').value.trim(), scope: $('search-scope').value })); });
document.querySelector('.skip').addEventListener('click', e => { e.preventDefault(); $('content').focus(); });
$('reference-form').addEventListener('submit', e => { e.preventDefault(); navigateFromFinder(route('read', { uid: $('reference').value.trim() })); });
function pageControls(next, previous, action) {
  const p = el('nav', undefined, 'pager'); p.setAttribute('aria-label', 'Pagination');
  if (previous !== null) p.append(link('← Previous page', action(previous), 'button'));
  if (next !== null && next !== undefined) p.append(link('Next page →', action(next), 'button'));
  view.append(p);
}
async function browse(args, token) {
  if (englishBrowseCandidate(args)) return browseEnglish(args, token);
  const node = args.get('node') || 'canon', offset = offsetOf(args), limit = 40;
  const kind = node === 'commentary' ? 'commentary' : node === 'post' ? 'post' : 'canon';
  const data = kind === 'commentary' ? await tool('get_commentary', { uid: 'commentary', offset, limit }) : kind === 'post' ? await tool('get_post_canonical', { offset, limit }) : await tool('browse_canon', { node, offset, limit }); if (token !== epoch) return;
  heading('EXPLORE THE LIBRARY', kind === 'commentary' ? 'Traditional commentary' : kind === 'post' ? 'Later Pāli works' : data.name || 'The Pāli Canon');
  const nav = el('div', undefined, 'toolbar'); nav.append(link('All collections', route('browse', { node: 'canon' }), 'button'), link('Complete source books', route('browse', { node: 'books' }), 'button'), link('Find English sources', '#browse?node=english', 'button')); if (node === 'canon') nav.append(link('Study by topic', '#topics', 'button'), link('Numbered teaching lists', '#lists', 'button')); view.append(nav);
  if (data.note) view.append(el('p', data.note, 'muted')); notes(data);
  const cards = el('div', undefined, 'cards');
  for (const item of data.items || data.books || []) {
    const href = kind === 'commentary' ? route('read', { kind, uid: item.uid }) : kind === 'post' ? route('read', { kind, uid: item.id }) : item.read_with?.book ? route('read', { book: item.read_with.book }) : item.citation ? route('read', { uid: item.id }) : route('browse', { node: item.id });
    const card = link('', href, 'entry'); card.append(el('small', kind === 'canon' ? item.citation || item.pitaka || 'Collection' : kind === 'commentary' ? 'Commentary · not canon' : 'Later work · not canon'), el('strong', item.name || item.title || item.id));
    if (item.texts !== undefined) card.append(el('p', item.texts + ' texts'));
    if (item.english_available !== undefined) card.append(el('p', item.english_available ? 'English source linked' : (item.shared_english_available || item.partial_english_available) ? 'Scoped English source · review required' : 'Pāli source text'));
    if (node === 'books' && kind === 'canon' && item.read_with?.tool === 'get_text' && item.read_with.book === item.id) {
      try { const searchHref = bookSearchRoute({ book: item.id, query: '', offset: 0, limit: 15, source: null }), wrapper = el('article', undefined, 'book-catalogue-card'); wrapper.append(card, link('Search this source book', searchHref, 'button')); cards.append(wrapper); }
      catch { cards.append(card); }
    } else cards.append(card);
  }
  view.append(cards); pageControls(data.next_offset, offset ? Math.max(0, offset - limit) : null, n => route('browse', { node, offset: n }));
  if (kind !== 'canon') provenance(data);
}
async function browseEnglish(args, token) {
  const selection = englishSelection(args);
  const request = { node: 'english', availability: selection.availability, offset: selection.offset, limit: selection.limit, ...(selection.collection === null ? {} : { collection: selection.collection }) };
  const response = await tool('browse_canon', request); if (token !== epoch) return;
  const data = englishCatalogue(response, selection);
  heading('EXPLORE THE LIBRARY', 'Find English sources');
  const nav = el('nav', undefined, 'toolbar'); nav.setAttribute('aria-label', 'Library views');
  nav.append(link('All collections', '#browse?node=canon', 'button'), link('Complete source books', '#browse?node=books', 'button')); view.append(nav);
  const form = el('form', undefined, 'english-catalogue-filters'); form.setAttribute('aria-label', 'English source filters');
  const availabilityLabel = el('label', 'English availability'), availability = el('select'); availability.id = 'english-availability'; availability.name = 'availability'; availabilityLabel.htmlFor = availability.id;
  for (const [value, title] of Object.entries(ENGLISH_AVAILABILITY)) { const option = el('option', title); option.value = value; availability.append(option); } availability.value = selection.availability;
  const collectionLabel = el('label', 'Collection'), collection = el('select'); collection.id = 'english-collection'; collection.name = 'collection'; collectionLabel.htmlFor = collection.id;
  const all = el('option', 'All collections'); all.value = ''; collection.append(all);
  for (const item of data.collections) { const option = el('option', item.name); option.value = item.id; collection.append(option); } collection.value = selection.collection || '';
  const apply = el('button', 'Apply'); apply.type = 'submit';
  form.append(availabilityLabel, availability, collectionLabel, collection, apply);
  form.addEventListener('submit', event => { event.preventDefault(); if (token !== epoch) return; const href = englishRoute({ availability: availability.value, collection: collection.value || null }, 0); focusHeading(); if (location.hash === href) render(); else location.hash = href; });
  view.append(form, el('p', data.total + ' matching indexed record' + (data.total === 1 ? '' : 's'), 'english-catalogue-count'), el('p', data.note, 'notice'), el('p', 'A link is not a guarantee of a complete individual English translation. Review the publisher reference and any scope before retrieving English.', 'muted'));
  if (!data.total) view.append(el('p', 'No matching records in this index for these filters. This does not mean that no translation exists elsewhere.', 'notice'));
  else if (selection.offset >= data.total) view.append(el('p', 'This page is beyond the matching records.'), link('Return to first matching page', englishRoute(selection, 0), 'button'));
  else view.append(el('p', 'Showing ' + (selection.offset + 1) + '–' + (selection.offset + data.items.length) + ' of ' + data.total, 'muted'));
  const cards = el('div', undefined, 'cards');
  for (const item of data.items) {
    const card = link('', route('read', { uid: item.id }), 'entry'); card.append(el('small', item.citation + ' · ' + item.collection), el('strong', item.title));
    for (const badge of englishBadges(item)) card.append(el('p', badge, 'source-badge'));
    if (item.source_context) card.append(el('p', 'Linked through ' + item.source_context.citation + ' · ' + item.source_context.title + '. The containing chapter or group link does not establish a separately aligned translation.', 'muted'));
    cards.append(card);
  }
  view.append(cards);
  pageControls(data.next_offset, selection.offset > 0 && selection.offset < data.total ? Math.max(0, selection.offset - selection.limit) : null, offset => englishRoute(selection, offset));
}
function offsetOf(args) { const n = Number(args.get('offset') || 0); return Number.isSafeInteger(n) && n >= 0 && n <= 100000 ? n : 0; }
function bookSearchForm(selection, token) {
  const form = el('form', undefined, 'book-search-form'), label = el('label', 'Search this source book'), input = el('input'), submit = el('button', 'Search book'), error = el('p');
  form.setAttribute('aria-label', 'Source book search'); form.noValidate = true; input.type = 'search'; input.maxLength = 500; input.value = selection.query; label.append(input); submit.type = 'submit'; error.setAttribute('role', 'alert'); error.hidden = true;
  form.append(label, submit, error);
  form.addEventListener('submit', event => {
    event.preventDefault(); if (token !== epoch || !form.isConnected) return;
    try { const query = input.value.trim(); if (!query) throw Error('Enter a Pāli search query.'); const href = bookSearchRoute({ ...selection, query, offset: 0 }); error.hidden = true; input.removeAttribute('aria-invalid'); if (location.hash === href) render(); else location.hash = href; }
    catch (failure) { error.textContent = failure.message; error.hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus({ preventScroll: true }); }
  }); return form;
}
async function bookSearch(args, token) {
  const selection = bookSearchSelection(args);
  if (!selection.query) {
    const catalogue = await tool('browse_canon', { node: 'books', offset: 0, limit: 200 }); if (token !== epoch) return;
    const book = bookSearchCatalogue(catalogue, selection);
    heading('COMPLETE VRI SOURCE FILE', 'Search · ' + book.title, 'Source-book search');
    view.append(el('p', catalogue.note, 'notice'), bookSearchForm(selection, token), link('Read this source book', selection.source ? readingPagePosition({ book: selection.book }, 0, selection.source) : route('read', { book: selection.book }), 'button'), el('p', 'Search and reading results show the actual source attribution and licence terms. Source-file references are not standard discourse or rule citations. English translations are not searched.', 'muted')); return;
  }
  const response = await tool('search_source_book', { book: selection.book, query: selection.query, offset: selection.offset, limit: 15, script: $('script').value }); if (token !== epoch) return;
  const data = validateBookSearchPage(response, selection), pinned = { ...selection, source: sourceRevision(data) };
  heading('COMPLETE VRI SOURCE FILE', 'Search · ' + data.book.title, 'Source-book search');
  view.append(bookSearchForm(pinned, token), el('p', 'Search query: ' + selection.query, 'muted'), el('p', data.citation_note, 'notice')); notes(data); if (data.query_note) view.append(el('p', 'Search interpretation: ' + data.query_note, 'notice')); if (data.script_note) view.append(el('p', 'Script display: ' + data.script_note, 'notice'));
  const count = el('p', data.returned ? `Matching source segments: ${data.total_matched} · showing ${data.offset + 1}–${data.offset + data.returned}` : data.total_matched ? `This page is beyond the ${data.total_matched} matching source segments.` : 'No matching source segments in this book. Try a different Pāli word or phrase.'); count.setAttribute('role', 'status'); view.append(count); if (!data.returned && data.total_matched) view.append(link('First search results', bookSearchRoute(pinned, 0), 'button'));
  const results = el('section', undefined, 'book-search-results'); results.setAttribute('aria-label', 'Source book search results');
  for (const hit of data.results) {
    const locations = bookSearchHitLinks(data, hit, selection), card = el('article', undefined, 'segment');
    card.append(el('h3', hit.ref), el('p', `Source position ${hit.segment} · ${hit.type}`, 'muted'));
    const excerpt = el('p', hit.excerpt, 'passage'); excerpt.lang = 'pi'; card.append(el('p', 'Search excerpt · open the source to read its context.', 'muted'), excerpt, link('Read match · ' + hit.ref, locations.read, 'button'));
    if (locations.context) card.append(link('Read surrounding source · ' + hit.ref, locations.context, 'button')); results.append(card);
  }
  view.append(results); pageControls(data.next_offset, selection.offset > 0 ? Math.max(0, selection.offset - 15) : null, offset => bookSearchRoute(pinned, offset)); provenance(data);
}
async function search(args, token) {
  const query = (args.get('q') || '').trim(); if (!query) throw new Error('Enter words or a title to search.');
  const scope = ['commentary', 'post'].includes(args.get('scope')) ? args.get('scope') : 'canon'; $('search-scope').value = scope;
  const offset = offsetOf(args), data = await tool(scope === 'commentary' ? 'search_commentary' : scope === 'post' ? 'search_post_canonical' : 'search_texts', { query, offset, limit: 15, script: $('script').value }); if (token !== epoch) return;
  heading(scope === 'canon' ? 'SEARCH THE CANON' : scope === 'commentary' ? 'SEARCH COMMENTARY · NOT CANON' : 'SEARCH LATER WORKS · NOT CANON', 'Results for “' + query + '”', 'Search results'); notes(data);
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
const copySavedRecord = item => item === undefined ? undefined : JSON.parse(JSON.stringify(item));
const savedRecord = item => local.saved.find(x => x.uid === item.uid && x.ref === item.ref);
const sameSavedRecord = (expected, token) => token === epoch && JSON.stringify(savedRecord(expected)) === JSON.stringify(expected);
function replaceNoteDrafts(drafts) { noteDrafts.clear(); for (const [key, value] of drafts) noteDrafts.set(key, value); }
function commitNoteChange(transaction, keepNewBookmark = false) {
  local.saved = transaction.saved;
  if (persist()) { replaceNoteDrafts(transaction.drafts); refreshPersonalHighlights(); return true; }
  if (!keepNewBookmark) { const before = restorePassageNoteTransaction(transaction); local.saved = before.saved; replaceNoteDrafts(before.drafts); }
  refreshPersonalHighlights(); status.textContent = storageWarning(); return false;
}
function personalNoteEditor(item, context, token, { mode = 'reading', onSaved = () => {}, onClose } = {}) {
  let expected = copySavedRecord(item);
  const editor = el('div', undefined, 'personal-note-editor'), label = el('label', mode === 'saved' ? 'Your personal note' : 'Your personal note for ' + item.ref), input = el('textarea');
  input.className = 'note-field'; input.maxLength = 4000; input.value = noteDrafts.get(noteKey(item)) ?? (typeof item.note === 'string' ? item.note : ''); label.append(input);
  const message = el('p', noteDrafts.has(noteKey(item)) ? 'Unsaved personal note in this tab.' : 'Personal note · not scripture.', 'muted'); message.setAttribute('role', 'status');
  const valid = () => editor.isConnected && sameSavedRecord(expected, token);
  input.addEventListener('input', () => { if (!valid()) { message.textContent = 'This bookmark changed. Reopen it before editing; no note was overwritten.'; return; } noteDrafts.set(noteKey(expected), input.value); message.textContent = 'Unsaved personal note in this tab. Save or export before closing this browser tab.'; });
  const controls = el('div', undefined, 'toolbar');
  controls.append(button('Save note', () => {
    if (!valid()) { message.textContent = 'This bookmark changed. Reopen it before saving; no note was overwritten.'; return; }
    try {
      const change = passageNoteTransaction(local.saved, noteDrafts, context, { type: 'save', mode, note: input.value });
      const durable = commitNoteChange(change); expected = copySavedRecord(savedRecord(item));
      message.textContent = durable ? 'Personal note saved in this browser.' : 'Not saved to browser storage. Your draft remains in this tab; export it before reloading.';
      if (durable) status.textContent = 'Personal note saved in this browser.';
      onSaved(durable);
    } catch (error) { message.textContent = error.message; }
  }));
  if (onClose) controls.append(button('Close note editor', () => { if (token === epoch) onClose(); }));
  editor.append(label, message, controls); return editor;
}
function removePersonalBookmark(item, token, host, trigger, onRemoved) {
  if (!sameSavedRecord(item, token)) { status.textContent = 'This bookmark changed. Review it again before removing it.'; return; }
  const snapshot = copySavedRecord(item), key = noteKey(item), hadDraft = noteDrafts.has(key), draft = noteDrafts.get(key);
  const valid = () => host.isConnected && sameSavedRecord(snapshot, token) && noteDrafts.has(key) === hadDraft && noteDrafts.get(key) === draft;
  function remove(confirmed) {
    if (!valid()) { status.textContent = 'The bookmark or draft changed. Cancel removal and review it again; nothing was removed.'; return; }
    try {
      const change = passageNoteTransaction(local.saved, noteDrafts, { uid: item.uid, ref: item.ref }, { type: 'remove', mode: 'saved', confirmed });
      if (commitNoteChange(change)) { status.textContent = 'Bookmark removed from this browser.'; onRemoved(); }
    } catch (error) { status.textContent = error.message; }
  }
  if (!passageNoteRemovalNeedsConfirmation(item, noteDrafts)) { remove(false); return; }
  host.querySelector('.note-removal-confirmation')?.remove();
  const confirmation = el('div', undefined, 'note-removal-confirmation'); confirmation.setAttribute('role', 'group'); confirmation.setAttribute('aria-label', 'Confirm bookmark and note removal');
  const cancel = button('Cancel removal', () => { if (token !== epoch) return; confirmation.remove(); if (trigger.isConnected) trigger.focus({ preventScroll: true }); });
  confirmation.append(el('p', 'Remove this saved reference and its stored or unsaved personal note? Export first if you want to keep them.', 'notice'), cancel, button('Remove bookmark and note', () => remove(true)));
  host.append(confirmation); cancel.focus({ preventScroll: true });
}
function attachPassageNote(selector, data, segment, container, control, token) {
  const region = el('section', undefined, 'personal-note'); region.setAttribute('aria-label', 'Personal note for ' + segment.ref); container.append(region);
  let context, open = false;
  try { context = { uid: selector, ref: segment.ref, title: data.title || data.book?.title || data.citation || data.book_id || selector, offset: data.offset + data.segments.indexOf(segment), source_commit: sourceRevision(data) }; }
  catch (error) { region.append(el('p', 'This source has no safe note reference: ' + error.message, 'notice'), link('See saved bookmark and note', '#saved')); return; }
  highlightTargets.push({ node: container, context, token });
  const key = noteKey(context); open = noteDrafts.has(key) || Boolean(savedRecord(context)?.note);
  function mark() { const active = Boolean(savedRecord(context)); control.textContent = active ? 'Saved ✓' : 'Save passage'; control.setAttribute('aria-pressed', String(active)); container.classList.toggle('marked', active); container.classList.toggle('personal-highlight', savedPassageHighlighted(local.saved, context, local.highlight_saved !== false)); }
  function ensure() {
    const change = passageNoteTransaction(local.saved, noteDrafts, context, { type: 'ensure' });
    const durable = commitNoteChange(change, true); mark();
    if (durable) status.textContent = 'Passage reference saved. Personal notes remain separate from scripture.';
    return savedRecord(context);
  }
  function show() {
    if (token !== epoch) return;
    region.replaceChildren(); mark(); const state = passageNoteState(local.saved, context);
    if (!state.eligible) { region.append(el('p', state.reason + ' No personal note was associated with this reading.', 'notice'), link('See saved bookmark and note', '#saved')); return; }
    if (state.warning) region.append(el('p', state.warning, 'notice'));
    if (open && state.item) {
      region.append(el('p', 'Personal note · not scripture. Only the saved reference and your note are stored in this browser, not the source text.', 'muted'), personalNoteEditor(state.item, context, token, { onSaved: mark, onClose: () => { open = false; show(); region.querySelector('button')?.focus({ preventScroll: true }); } }));
    } else region.append(button(state.item ? 'View/edit personal note' : 'Add personal note', () => { if (token !== epoch) return; try { if (!savedRecord(context)) ensure(); open = true; show(); region.querySelector('textarea')?.focus({ preventScroll: true }); } catch (error) { status.textContent = error.message; } }));
  }
  control.addEventListener('click', () => {
    if (token !== epoch) return;
    const current = savedRecord(context);
    if (current) removePersonalBookmark(current, token, region, control, () => { open = false; show(); control.focus({ preventScroll: true }); });
    else try { ensure(); show(); } catch (error) { status.textContent = error.message; }
  });
  show();
}
function attachChapterNavigation(data, args, host, token) {
  const section = el('section', undefined, 'chapter-navigation'); section.setAttribute('aria-label', 'Source chapters');
  let generation = 0, authority;
  const alive = () => token === epoch && section.isConnected;
  const warning = error => {
    const message = el('p', error.message, 'notice'); message.setAttribute('role', 'alert'); section.replaceChildren(message);
    if (error.code === 'READING_SOURCE_CHANGED') { const review = new URLSearchParams(args); review.delete('source'); review.delete('page_source'); section.append(link('Review current reading source', '#read?' + review, 'button')); }
  };
  function show(menu, focusOwned = false) {
    if (!alive()) return;
    const form = el('form', undefined, 'chapter-picker'), label = el('label', menu.scope === 'work' ? 'Chapter in this work' : 'Chapter in this source file'), select = el('select'), open = el('button', 'Open chapter'), error = el('p');
    form.setAttribute('aria-label', 'Chapter navigation'); form.noValidate = true;
    const placeholder = el('option', 'Choose a chapter'); placeholder.value = ''; select.append(placeholder);
    for (const row of menu.chapters) { const option = el('option', row.citation + ' · ' + row.title); option.value = row.citation; select.append(option); }
    label.append(select); open.type = 'submit'; open.disabled = true; error.setAttribute('role', 'alert'); error.hidden = true;
    form.append(label, open, el('p', menu.scope === 'work' ? 'Chapters of the selected work, including its source volumes where applicable. Choose a chapter, then open it.' : 'Headings in this source file, including any appended works. Numbering belongs to the file.', 'muted'), error);
    select.addEventListener('change', () => { if (alive() && form.isConnected) open.disabled = !select.value; });
    form.addEventListener('submit', event => {
      event.preventDefault(); if (!alive() || !form.isConnected || !select.value) return;
      try { const row = menu.chapters.find(value => value.citation === select.value), href = chapterLink(row, menu); error.hidden = true; select.removeAttribute('aria-invalid'); if (location.hash === href) render(); else location.hash = href; }
      catch (failure) { error.textContent = failure.message; error.hidden = false; select.setAttribute('aria-invalid', 'true'); select.focus({ preventScroll: true }); }
    });
    section.replaceChildren(form); if (focusOwned) select.focus({ preventScroll: true });
  }
  async function load(trigger) {
    if (!alive() || !trigger.isConnected) return;
    const focusOwned = document.activeElement === trigger, ticket = ++generation, pending = el('p', 'Loading chapter list…', 'muted'); pending.setAttribute('role', 'status'); pending.tabIndex = -1; section.replaceChildren(pending); if (focusOwned) pending.focus({ preventScroll: true });
    try {
      const command = authority.read_with;
      const root = await tool(command.tool, { citation: command.citation, offset: command.offset, limit: command.limit, script: $('script').value }, 'study', 'Chapter list');
      if (!alive() || generation !== ticket) return;
      show(validateChapterMenu(data, root), document.activeElement === pending);
    } catch (error) {
      if (!alive() || generation !== ticket) return;
      const retainedFocus = document.activeElement === pending; warning(error); const retry = button('Retry chapter list', () => load(retry)); section.append(retry); if (retainedFocus) retry.focus({ preventScroll: true });
    }
  }
  host.append(section);
  try {
    authority = validateChapterIndex(data);
    if (!authority && Array.isArray(data.chapters) && data.chapters.length === 0) section.remove();
    else if (Object.hasOwn(data, 'chapters')) show(validateChapterMenu(data, data));
    else if (authority) { const choose = button('Choose chapter', () => load(choose)); section.append(choose); }
    else section.remove();
  } catch (error) { warning(error); }
}
async function read(args, token) {
  assertPageRequest(args);
  const book = args.get('book'), uid = args.get('uid') || 'dhp183'; let offset = offsetOf(args), plan = null, window = null;
  if (args.has('plan')) {
    if (book || args.has('kind')) throw Error('Reading plans require their canonical text selection.');
    const name = args.get('plan'), day = Number(args.get('day'));
    plan = planDay(await tool('reading_plan', { name, day }), name, day); if (token !== epoch) return;
    window = planWindow(plan, uid, args.has('offset') ? Number(args.get('offset')) : undefined); offset = window.offset;
  }
  const kind = book ? 'book' : ['commentary', 'post'].includes(args.get('kind')) ? args.get('kind') : 'canon';
  const request = { ...(kind === 'book' ? { book } : kind === 'post' ? { citation: uid } : { uid }), offset, limit: window?.limit || 30, script: $('script').value };
  const data = await tool(kind === 'commentary' ? 'get_commentary' : kind === 'post' ? 'get_post_canonical' : 'get_text', request); if (token !== epoch) return;
  if (!Array.isArray(data.segments)) throw new Error('Choose an individual book or passage to read.');
  assertPositionPin(args, data); assertPagePin(args, data);
  if (args.has('ref') && !data.segments.some(segment => segment.ref === args.get('ref'))) throw Error('The saved passage reference was not returned at this position. No nearby passage was substituted. Open the source from the Library or check the bookmark’s revision.');
  if (plan) validatePlanPage(data, plan, uid, window);
  if ((kind === 'post' && data.canonical !== false) || (kind === 'commentary' && !(data.canonical === false && data.content_type === 'commentary') && !(typeof data.label === 'string' && data.label.startsWith('Commentary') && data.label.includes('not the canon')))) throw new Error('This response lacks the expected non-canonical source label.');
  const selector = kind === 'book' ? 'book:' + book : kind === 'post' ? 'post:' + uid : kind === 'canon' ? data.text_id || uid : uid.startsWith('commentary:') ? uid : 'commentary-ref:' + uid;
  heading(kind === 'book' ? 'COMPLETE VRI SOURCE BOOK' : kind === 'commentary' ? 'TRADITIONAL COMMENTARY · NOT CANON' : kind === 'post' ? 'LATER PĀLI WORK · NOT CANON' : 'CANONICAL PĀLI', (data.citation ? data.citation + ' · ' : '') + (data.title || data.book?.title || data.book_id || uid));
  if (plan) { view.append(link('← Return to plan day ' + plan.day, route('plans', { name: plan.name, day: plan.day }), 'button'), el('p', plan.title + ' · day ' + plan.day + (window.end === null ? ' · complete selected text' : ' · assigned segments ' + (window.start + 1) + '–' + window.end) + '. English sources and related material may cover more than this assignment; they are not aligned to this part.', 'notice')); }
  let intro; try { intro = readingIntro(data, kind); } catch { intro = { critical: data, context: [], status: null }; }
  if (intro.status) view.append(el('p', intro.status, 'muted reading-context-status')); notes(intro.critical); view.append(el('p', `Segments ${offset + 1}–${offset + data.returned} of ${data.total_segments}`, 'muted'));
  const toolbar = el('div', undefined, 'toolbar'); let sourceTools;
  toolbar.append(link('Back to library', route('browse', { node: 'canon' }), 'button'));
  const copyFallback = link('Exact reading link · open or long-press to copy', location.hash); copyFallback.hidden = true;
  const copy = button('Copy reading link', async () => { clearTimeout(positionTimer); const href = new URL(activePosition?.links.find(x => x.href === local.last)?.href || activePosition?.links[0]?.href || location.hash, location.href).href; try { await navigator.clipboard.writeText(href); status.textContent = 'Reading link copied.'; } catch { copyFallback.href = href; copyFallback.hidden = false; status.textContent = 'Clipboard unavailable. Use the exact reading link beside the button.'; } });
  if (kind === 'canon') {
    const panel = el('details', undefined, 'study-actions'); panel.append(el('summary', 'Study & sources')); const tools = el('div', undefined, 'toolbar'); sourceTools = tools;
    const invoke = action => () => { if (narrowReading.matches) panel.open = false; action(); const target = $('study'); target.tabIndex = -1; target.focus(); };
    tools.append(button('English sources', invoke(() => translations(data, uid, token))), button('Traditional commentary', invoke(() => commentary(uid, token))), button('Related texts', invoke(() => relatedTexts(data.text_id || uid, token))), copy, copyFallback); panel.append(tools); toolbar.append(panel);
  } else { const panel = el('details', undefined, 'study-actions'); sourceTools = el('div', undefined, 'toolbar'); sourceTools.append(copy, copyFallback); panel.append(el('summary', 'Reading tools'), sourceTools); toolbar.append(panel); }
  view.append(toolbar); responsivePanels();
  if (intro.context.length) { const context = el('section', undefined, 'source-context'); context.setAttribute('aria-label', 'Source context'); context.append(el('h3', 'Source context')); for (const original of intro.context) context.append(el('p', original, 'notice')); sourceTools.append(context); }
  if (kind === 'post') attachChapterNavigation(data, args, sourceTools, token);
  const positionContext = { ...readingArgs(selector), ...(plan ? { plan: plan.name, day: plan.day } : {}) };
  let navigation = null;
  try {
    const bounds = readingPageBounds(data, window), revision = sourceRevision(data);
    // Validate the current route before offering any new offset or guessed reference.
    readingPagePosition(positionContext, bounds.current, revision);
    navigation = { bounds, revision };
    const form = el('form', undefined, 'source-position'), label = el('label', 'Go to source position'), input = el('input'), submit = el('button', 'Go'), help = el('p', `Position in this work, not a citation number. Available positions ${bounds.start + 1}–${bounds.end}.`, 'muted'), error = el('p');
    form.setAttribute('aria-label', 'Source position navigation'); form.noValidate = true; input.type = 'text'; input.inputMode = 'numeric'; input.maxLength = 32; input.value = String(bounds.current + 1); input.required = true;
    const suffix = String(++serial); help.id = 'source-position-help-' + suffix; error.id = 'source-position-error-' + suffix; error.setAttribute('role', 'alert'); error.hidden = true; input.setAttribute('aria-describedby', help.id + ' ' + error.id); label.append(input); submit.type = 'submit'; form.append(label, submit, help, error);
    form.addEventListener('submit', event => {
      event.preventDefault(); if (token !== epoch || !form.isConnected) return;
      try { const jump = readingJumpOffset(input.value, data, window), href = readingPagePosition(positionContext, jump, revision); error.hidden = true; input.removeAttribute('aria-invalid'); if (location.hash === href) render(); else location.hash = href; }
      catch (failure) { error.textContent = failure.message; error.hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus({ preventScroll: true }); }
    });
    const panel = el('section', undefined, 'source-position-panel'); panel.append(form); sourceTools.append(panel);
  } catch { view.append(el('p', 'Source-position navigation is unavailable because this page has incomplete or unsupported position/revision metadata. The loaded source remains below; no destination was guessed.', 'notice')); }
  if (kind === 'book') {
    try { const selection = { book: data.book_id, query: '', offset: 0, limit: 15, source: sourceRevision(data) }; bookSearchRoute(selection); sourceTools.append(bookSearchForm(selection, token)); }
    catch { sourceTools.append(el('p', 'Search is unavailable because this source book has incomplete identity or revision metadata.', 'notice')); }
  }
  const additions = el('section'); additions.id = 'study'; additions.setAttribute('aria-live', 'polite'); view.append(additions);
  const passages = el('section'); passages.setAttribute('aria-label', 'Pāli passage'); const positions = [];
  for (const segment of data.segments || []) {
    const part = el('article', undefined, 'segment ' + (segment.type === 'heading' ? 'heading' : '')); part.id = 'seg-' + segment.ref.replace(/[^a-z0-9-]/gi, '-');
    let positionHref; try { positionHref = readingPosition(positionContext, data.offset + data.segments.indexOf(segment), segment.ref, sourceRevision(data)); } catch {}
    const row = el('div', undefined, 'segment-label'), reference = el('span'); if (positionHref) { const exact = link(segment.ref, positionHref); exact.setAttribute('aria-label', 'Open exact passage ' + segment.ref); reference.append(exact); } else reference.textContent = segment.ref; if (segment.vri_paragraph) reference.append(document.createTextNode(' · VRI ' + segment.vri_paragraph)); row.append(reference);
    const active = local.saved.some(x => x.uid === selector && x.ref === segment.ref);
    const save = button(active ? 'Saved ✓' : 'Save passage', () => {}); save.setAttribute('aria-label', 'Save passage ' + segment.ref); save.setAttribute('aria-pressed', String(active)); const actions = el('div', undefined, 'segment-actions'); actions.append(save);
    if (kind !== 'commentary' && segment.type !== 'heading') { const study = button('Study words', () => wordStudy({ ...(kind === 'book' ? { book } : { uid: kind === 'canon' ? data.text_id || uid : uid }), segment: segment.ref, offset: 0, limit: 15 }, { ref: segment.ref, text: segment.text, source: data.source?.commit, script: $('script').value, kind }, token)); study.setAttribute('aria-label', 'Study words in ' + segment.ref); actions.append(study); }
    row.append(actions); part.classList.toggle('marked', active);
    const text = el('p', segment.text, 'passage'); text.lang = 'pi'; part.append(row, text); attachPassageNote(selector, data, segment, part, save, token); passages.append(part);
    if (positionHref) positions.push({ node: part, heading: segment.type === 'heading', href: positionHref });
  }
  view.append(passages);
  if (navigation) {
    const { bounds, revision } = navigation, next = data.next_offset !== null && data.next_offset < bounds.end ? data.next_offset : null;
    pageControls(next, bounds.current > bounds.start ? Math.max(bounds.start, bounds.current - 30) : null, n => readingPagePosition(positionContext, n, revision));
  }
  provenance(data);
  activePosition = { token, links: positions }; rememberPosition(positions.find(x => args.get('ref') === new URLSearchParams(x.href.split('?')[1]).get('ref'))?.href || positions[0]?.href || location.hash); updateResume();
  let savedRevision; try { savedRevision = sourceRevision(data); } catch {}
  const savedVersion = savedRevision === undefined ? null : local.saved.find(x => x.uid === selector && x.source_commit && x.source_commit !== savedRevision);
  if (savedVersion) view.prepend(el('p', 'This source revision differs from a saved bookmark. Check its reference before reusing your notes.', 'notice'));
  const ref = args.get('ref'); if (ref) document.getElementById('seg-' + ref.replace(/[^a-z0-9-]/gi, '-'))?.scrollIntoView({ block: 'center' });
}
function scopeSummary(descriptor, target) {
  const scope = descriptor.scope; target.append(el('h4', descriptor.label));
  if (descriptor.kind === 'shared_page') {
    target.append(el('p', 'Publisher reference: ' + scope.source_reference), el('p', 'One page concerns all of these texts. It is not a separately aligned full translation of the currently selected discourse.', 'notice'));
    const list = el('ul'); for (const id of scope.text_ids) { const li = el('li'); li.append(link(id + ' · canonical Pāli', route('read', { uid: id }))); list.append(li); } target.append(list);
  } else {
    target.append(el('p', 'Declared Pāli span: ' + scope.first_ref + ' to ' + scope.last_ref));
    if(scope.version===2){
      target.append(el('p', 'Only part of this paragraph is translated. Exact original Pāli excerpt:', 'notice'));
      const quote=el('blockquote',scope.pali_excerpt.text,'passage');quote.lang='pi';target.append(quote);
      target.append(el('p','The Pāli reader below includes surrounding context outside this translation. No complete paragraph or discourse translation is implied.','notice'));
    }else target.append(el('p', 'Only this span has a linked translation. The Pāli reader below still shows the selected canonical text, not an aligned or shortened English/Pāli pair.', 'notice'));
  }
  target.append(el('p', scope.note, 'notice'));
  const details = el('details'); details.append(el('summary', 'Reviewed scope version')); details.append(el('p', 'Source revision: ' + scope.source_commit), el('p', 'Mapping SHA-256: ' + scope.scope_sha256)); target.append(details);
}
async function translations(data, uid, token) {
  const pickerToken = ++studyEpoch; requests.cancelGroup('study'); const target = $('study'); target.replaceChildren(el('h3', 'English sources'));
  if (!data.english_available?.length) { target.append(el('p', 'No verified English source is linked to this text. No translation has been generated or substituted.', 'notice')); return; }
  const context = { uid: data.text_id || uid, citation: data.citation || uid, choices: JSON.parse(JSON.stringify(data.english_available)), accepted: null };
  target.append(el('p', 'Choose a publisher’s source page. It can cover more than the current Pāli selection; paragraphs are not aligned. Shared and partial sources require a separate scope review before retrieval.', 'muted'));
  const selected = new Set(), comparisonInputs = [];
  let ordinary = [];
  try { ordinary = comparisonChoices(context.choices, context.uid); }
  catch (error) { target.append(el('p', error.message, 'notice')); }
  const comparison = el('section', undefined, 'comparison-selection'); comparison.setAttribute('aria-label', 'Compare English source versions');
  const selectionStatus = el('p', 'Select 2–4 ordinary source versions. No English is fetched until you press Compare.', 'muted'); selectionStatus.setAttribute('role', 'status');
  const compare = button('Compare selected sources', () => { if (token === epoch && pickerToken === studyEpoch) compareEnglishSources([...selected], token, context); }); compare.disabled = true;
  comparison.append(el('p', 'Shared and partial sources are excluded from comparison. Use their individual scope review and consent controls.', 'notice'), selectionStatus, compare);
  if (ordinary.length >= 2) target.append(comparison);
  else target.append(el('p', 'Comparison requires at least two ordinary source versions. Shared and partial sources keep their individual review and consent controls.', 'muted'));
  function updateComparison() {
    compare.disabled = selected.size < 2 || selected.size > 4;
    selectionStatus.textContent = selected.size + ' of 4 source versions selected. Select 2–4 to compare; selections alone do not retrieve English.';
    for (const input of comparisonInputs) input.disabled = !input.checked && selected.size >= 4;
  }
  for (const choice of context.choices) {
    const card = el('article', undefined, 'translation-choice'); card.append(el('h4', choice.translator || choice.translation_id), el('p', [choice.source, choice.reference].filter(Boolean).join(' · '), 'muted'));
    try {
      if (typeof choice.translation_id !== 'string' || !/^(dt|ati|aj):.+/.test(choice.translation_id)) throw new Error('This source has no supported exact version identifier. No source was requested.');
      const descriptor = scopeDescriptor(choice, context.uid);
      if (!descriptor && ordinary.length >= 2 && ordinary.some(c => c.translation_id === choice.translation_id)) {
        const label = el('label', undefined, 'comparison-checkbox'), input = el('input'); input.type = 'checkbox'; input.value = choice.translation_id;
        label.append(input, el('span', 'Compare · ' + [choice.translator, choice.source, choice.reference, choice.translation_id].filter(Boolean).join(' · ')));
        input.addEventListener('change', () => { if (token !== epoch || pickerToken !== studyEpoch) return; if (input.checked) selected.add(choice.translation_id); else selected.delete(choice.translation_id); updateComparison(); });
        comparisonInputs.push(input); card.append(label);
      }
      if (descriptor) { card.append(el('p', descriptor.label + ' · not whole-unit coverage', 'notice'), button('Review ' + descriptor.label.toLowerCase(), () => reviewTranslationScope(choice, descriptor, context, token))); }
      else card.append(button('Read source · ' + [choice.translator, choice.source, choice.reference].filter(Boolean).join(' · '), () => englishPage({ uid: context.uid, translation: choice.translation_id, limit: 6000 }, token, context)));
    } catch (error) { card.append(el('p', error.message, 'notice')); }
    target.append(card);
  }
}
function compareEnglishSources(selected, token, context) {
  if (token !== epoch) return;
  let ids;
  try { ids = comparisonSelection(selected, context.choices, context.uid); }
  catch (error) { $('study').append(el('p', error.message, 'notice')); return; }
  const studyToken = ++studyEpoch, target = studyTarget('Opening the explicitly selected source comparison…');
  target.replaceChildren(el('h3', 'Compare English sources'), el('p', 'These are separate publisher pages, not aligned paragraphs or translations of only the displayed Pāli passage. Each source may extend beyond your current reading-plan assignment. Review each source’s notes, reference and licence before quoting.', 'notice'));
  target.append(button('Choose English sources', () => { if (token === epoch && studyToken === studyEpoch) translations({ text_id: context.uid, citation: context.citation, english_available: context.choices }, context.uid, token); }));
  const grid = el('div', undefined, 'comparison-grid'); target.append(grid);
  let focusIntent = 0;
  for (const id of ids) {
    const choice = context.choices.find(c => c.translation_id === id), panel = el('article', undefined, 'comparison-panel');
    panel.setAttribute('aria-label', 'English comparison source · ' + id); panel.setAttribute('aria-busy', 'false');
    panel.append(el('h4', [choice.translator, choice.source, choice.reference].filter(Boolean).join(' · ')), el('p', 'Source version: ' + id, 'muted'));
    const message = el('p', 'No English requested yet.', 'comparison-panel-status'); message.setAttribute('role', 'status'); message.setAttribute('aria-label', 'Comparison status · ' + id);
    const progress = el('p', undefined, 'comparison-progress'), body = el('div', undefined, 'comparison-panel-body'), actions = el('div', undefined, 'toolbar comparison-actions');
    panel.append(message, progress, body, actions); grid.append(panel);
    const state = { serial: 0, busy: false };
    const current = () => token === epoch && studyToken === studyEpoch && panel.isConnected;
    async function loadPage(args, moveFocus = false) {
      if (!current() || state.busy) return;
      const requestSerial = ++state.serial, focusTicket = moveFocus ? ++focusIntent : null; state.busy = true; panel.setAttribute('aria-busy', 'true');
      const ownsFocus = () => moveFocus && focusTicket === focusIntent && (panel.contains(document.activeElement) || document.activeElement === document.body);
      for (const control of actions.querySelectorAll('button')) control.disabled = true;
      message.textContent = 'Retrieving this exact source page…';
      const sameRequest = () => current() && requestSerial === state.serial;
      try {
        const data = await tool('get_translation', args, 'study', 'English comparison ' + id); if (!sameRequest()) return;
        const next = validateComparisonPage(data, args, { uid: context.uid, choices: [choice], accepted: null });
        const content = el('div'); notes(data, content); content.append(el('p', data.text, 'translation')); provenance(data, content);
        body.replaceChildren(content);
        progress.textContent = 'English characters ' + (data.offset + 1) + '–' + (data.offset + data.text.length) + (next ? ' · more pages available' : ' · end of this source');
        message.textContent = 'Selected source page loaded.';
        actions.replaceChildren();
        if (next) actions.append(button('Next English page →', () => loadPage(next, true)));
        if (ownsFocus()) { progress.tabIndex = -1; progress.focus({ preventScroll: true }); }
      } catch (error) {
        if (!sameRequest()) return;
        message.textContent = error.message + (body.textContent ? ' The previously loaded page remains shown.' : '');
        actions.replaceChildren(button('Retry this source page', () => loadPage(args, true)));
        if (!body.textContent) progress.textContent = 'No source text has been displayed.';
        if (ownsFocus()) { message.tabIndex = -1; message.focus({ preventScroll: true }); }
      } finally {
        if (sameRequest()) { state.busy = false; panel.setAttribute('aria-busy', 'false'); for (const control of actions.querySelectorAll('button')) control.disabled = false; }
      }
    }
    loadPage({ uid: context.uid, translation: id, limit: 6000 });
  }
}
function reviewTranslationScope(choice, descriptor, context, token) {
  ++studyEpoch; const target = studyTarget('Review the source before retrieving it.'); target.replaceChildren(el('h3', 'Review English source scope'));
  target.append(el('p', 'Pāli selection: ' + context.citation), el('p', [choice.translator, choice.source, choice.reference].filter(Boolean).join(' · ')));
  scopeSummary(descriptor, target);
  if(typeof choice.mapping_note==='string'&&choice.mapping_note.trim())target.append(el('p',choice.mapping_note,'notice'));
  const label = el('label', undefined, 'consent-row'), checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.id = 'scope-consent';
  label.append(checkbox, el('span', descriptor.kind === 'shared_page' ? 'I understand this is one shared source page with unverified individual alignment, not a full translation assigned to this one discourse.' : 'I understand this translates only the declared part of the Pāli unit, not the entire unit.'));
  const read = button(descriptor.kind === 'shared_page' ? 'Read reviewed shared page' : 'Read reviewed partial source', () => { if (checkbox.checked && token === epoch) englishPage({ uid: context.uid, translation: choice.translation_id, limit: 6000, ...descriptor.flags }, token, { ...context, accepted: descriptor }); }); read.disabled = true;
  checkbox.addEventListener('change', () => { read.disabled = !checkbox.checked; }); target.append(label, read);
}
async function englishPage(args, token, context) {
  const studyToken = ++studyEpoch; const target = studyTarget('Retrieving the selected English source page…');
  try {
    const data = await tool('get_translation', args, 'study'); if (token !== epoch || studyToken !== studyEpoch) return;
    const next = validateEnglishPage(data, args, context), actualChoice = context.choices.find(c => c.translation_id === data.translation_id);
    target.replaceChildren(el('h3', (context.accepted?.kind === 'shared_page' ? 'Shared English source page · ' : context.accepted ? 'Partial English source · ' : 'English source page · ') + data.translator));
    target.append(el('p', 'Pāli selection: ' + context.citation + ' · publisher reference: ' + (actualChoice.reference || data.citation), 'muted'), el('p', 'Source version: ' + data.translation_id, 'muted'));
    if (context.accepted) scopeSummary(context.accepted, target);
    if (data.translation_id !== args.translation) target.append(el('p', 'The server returned a different listed source version. Read its source and fallback notes before quoting.', 'notice'));
    notes(data, target); target.append(el('p', data.text, 'translation')); provenance(data, target);
    if (next) target.append(button('Next English page →', () => englishPage(next, token, context)));
    target.append(button('Reload passage and review sources', render));
  } catch (error) { if (token === epoch && studyToken === studyEpoch) target.replaceChildren(el('p', error.message, 'notice'), button('Retry selected source', () => englishPage(args, token, context)), button('Reload passage and review sources', render)); }
}
async function commentary(uid, token, offset = 0) {
  const studyToken = ++studyEpoch; requests.cancelGroup('study'); const target = $('study'); target.replaceChildren(el('p', 'Opening commentary…'));
  try { const data = await tool('get_commentary', { uid, offset, limit: 20, script: $('script').value }, 'study'); if (token !== epoch || studyToken !== studyEpoch) return;
    target.replaceChildren(el('h3', 'Traditional commentary · not canonical root text')); notes(data, target);
    for (const segment of data.segments || []) target.append(el('p', segment.text, 'passage'));
    if (data.next_offset !== null && data.next_offset !== undefined) target.append(button('Next commentary page →', () => commentary(uid, token, data.next_offset)));
    if (data.available === false || !data.segments?.length) target.append(el('p', 'No verified aligned commentary is available for this selection.', 'notice'));
    provenance(data, target);
  } catch (error) { if (token === epoch && studyToken === studyEpoch) target.replaceChildren(el('p', error.message, 'notice')); }
}
function studyTarget(message) {
  requests.cancelGroup('study'); const target = $('study'); target.replaceChildren(el('p', message)); target.tabIndex = -1; target.setAttribute('aria-label', 'Study tools, separate from scripture'); target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'start' }); return target;
}
async function wordStudy(args, expected, token) {
  const studyToken = ++studyEpoch, target = studyTarget('Looking up the selected passage in the bundled dictionary…');
  try {
    const data = await tool('analyse_passage', args, 'study'); if (token !== epoch || studyToken !== studyEpoch) return;
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
    const data = await tool('get_parallels', { uid, offset, limit: 10 }, 'study'); if (token !== epoch || studyToken !== studyEpoch) return;
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
async function daily(args, token) {
  const kind = args.get('kind') || 'verse', date = args.get('date') || undefined;
  if (!['verse', 'sutta'].includes(kind)) throw Error('Choose a daily verse or discourse.');
  const data = validateDaily(await tool('daily_text', { kind, ...(date ? { date } : {}) }), { date, kind }); if (token !== epoch) return;
  heading('DATED SOURCE READING · UTC', kind === 'verse' ? 'Daily Dhammapada verse' : 'Daily discourse');
  view.append(el('p', data.date + ' · fixed source rotation, not a personal recommendation. The selection may change when the underlying source index changes.', 'muted'));
  const form = el('form'); form.className = 'daily-picker'; const dateLabel = el('label', 'Reading date (UTC)'), dateInput = el('input'); dateInput.type = 'date'; dateInput.min = '0001-01-01'; dateInput.max = '9999-12-31'; dateInput.required = true; dateInput.value = data.date; dateLabel.append(dateInput);
  const kindLabel = el('label', 'Reading type'), select = el('select'); for (const [value, title] of [['verse', 'Dhammapada verse'], ['sutta', 'Discourse opening']]) { const option = el('option', title); option.value = value; select.append(option); } select.value = kind; select.id = 'daily-kind'; kindLabel.htmlFor = select.id; const kindField = el('div'); kindField.append(kindLabel, select);
  const go = el('button', 'Open dated reading'); go.type = 'submit'; form.append(dateLabel, kindField, go); form.addEventListener('submit', e => { e.preventDefault(); if (form.reportValidity()) location.hash = route('daily', { date: dateInput.value, kind: select.value }); }); view.append(form, button('Use today’s UTC date', () => { const target = route('daily', { kind }); if (location.hash === target) render(); else location.hash = target; }));
  const card = el('article', undefined, 'daily-reading'); card.append(el('h3', data.text.citation + (data.text.title ? ' · ' + data.text.title : '')));
  card.append(el('p', kind === 'verse' ? 'Referenced Pāli verse' : 'Opening preview only · ' + data.segments + ' source segments in the discourse. Open the source to read the full text.', 'notice'));
  const display = localizeText({ segments: kind === 'verse' ? data.pali : [{ text: data.first_line, type: 'paragraph' }] }, $('script').value);
  for (const segment of display.segments) { if (segment.ref) card.append(el('small', segment.ref, 'muted')); const passage = el('p', segment.text, 'passage'); passage.lang = 'pi'; card.append(passage); }
  if (display.script) card.append(el('p', 'Display transliteration from the bundled VRI Roman source; not a separate script-edition collation. ' + (['lao', 'lanna'].includes(display.script) ? 'Native-reader validation is still pending for this script.' : ''), 'muted'));
  const actions = el('div', undefined, 'toolbar'); actions.append(link('Read Pāli source · ' + data.text.citation, route('read', { uid: data.text.id }), 'button')); if (kind === 'verse' && data.chapter?.id) actions.append(link('Read chapter context · ' + data.chapter.citation, route('read', { uid: data.chapter.id }), 'button')); card.append(actions, el('p', 'English sources, commentary, word study and saved passages are available in the full reader. English text is not retrieved automatically.', 'muted')); view.append(card); notes(data);
  const details = el('details'); details.append(el('summary', 'How this reading was selected'), el('p', data.how_chosen), el('p', 'Rotation position ' + data.rotation.position + ' of ' + data.rotation.of + ' · source revision ' + data.source.pali.commit)); view.append(details); provenance({ source: data.source.pali });
}
function exportPersonal(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = link('', url); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadStudyBackup() {
  try { const omitted = local.remember_position !== false && Object.hasOwn(local, 'last') && !isReadingLocator(local.last); exportPersonal(createStudyBackup({ saved: exportBookmarks().saved, progress: local.reading_progress, resume: local.remember_position !== false && isReadingLocator(local.last) ? local.last : null }), 'pali-library-study-backup.json'); if (omitted) status.textContent = 'Study backup downloaded. The unsupported reading position was omitted; saved passages, personal notes and plan marks were included. Browser data was not changed.'; }
  catch (error) { status.textContent = error.message + ' Individual bookmark and progress exports remain available in Saved, Plans and browser recovery.'; }
}
function studyBackup(token) {
  heading('PERSONAL DATA · ON THIS DEVICE', 'Study backup');
  view.append(el('p', 'Download saved references, personal notes (including unsaved edits), plan marks and an optional reading position. This file includes personal data: keep it somewhere private. The source-text library, accounts and browser preferences are excluded; your own notes are included.', 'notice'), button('Download study backup', downloadStudyBackup));
  const section = el('section'), label = el('label', 'Restore study backup from JSON'), input = el('input'), preview = el('section', undefined, 'import-preview');
  input.type = 'file'; input.accept = '.json,application/json'; label.append(input); preview.setAttribute('aria-label', 'Study backup preview'); preview.setAttribute('aria-live', 'polite');
  section.append(label, el('p', 'The file stays on this device. Maximum 32 MiB. Preview before applying: notes and drafts are kept by default; replacements require explicit eligible choices. Source pins and conflicting marks are kept. This is an additive restore, not account sync or an atomic cross-tab transaction.', 'muted'), preview); view.append(section, link('Saved passages and individual exports', '#saved', 'button'), link('Reading plans and individual exports', '#plans', 'button'));
  let generation = 0;
  const active = request => token === epoch && request === generation && section.isConnected;
  const personalState = () => JSON.stringify({ saved: local.saved, progress: local.reading_progress, drafts: [...noteDrafts], rememberPresent: Object.hasOwn(local, 'remember_position'), remember: local.remember_position });
  function storageNow() {
    if (storageConflict || storageReadFailed) throw Error(storageWarning());
    let raw; try { raw = localStorage.getItem(KEY); } catch { storageOK = false; showStorageRecovery(); throw Error(storageWarning()); }
    if (raw !== storageSnapshot && !readingPointerOnlyChange(storageSnapshot, raw)) { storageConflict = true; showStorageRecovery(); throw Error(storageWarning()); }
    return raw;
  }
  function failure(error, request, retry, filename) {
    if (!active(request)) return;
    const title = el('h3', 'Unable to restore study backup'); title.tabIndex = -1;
    preview.replaceChildren(title, el('p', error.message, 'notice'));
    if (filename) preview.append(el('p', 'Local file: ' + filename, 'muted'));
    if (retry) preview.append(button('Retry plan verification', retry));
    preview.append(button('Cancel restore', cancel)); title.focus();
  }
  function cancel() { ++generation; input.value = ''; preview.replaceChildren(); input.focus(); }
  async function prepare(incoming, request, filename) {
    if (!active(request)) return;
    try {
      const state = personalState(), raw = storageNow(), localLastPresent = Object.hasOwn(local, 'last'), localLast = local.last;
      preview.replaceChildren(el('p', incoming.progress.length ? 'Verifying current reading-plan assignments…' : 'Preparing local preview…'));
      const catalog = incoming.progress.length ? planCatalog(await tool('reading_plan', {})) : [];
      if (!active(request)) return;
      if (personalState() !== state) throw Error('Personal study data changed while preparing this preview. Choose the file again. Nothing was restored.');
      const merged = mergeStudyBackup({ saved: local.saved, progress: local.reading_progress, drafts: noteDrafts }, incoming, catalog);
      const noteRows = reviewBackupNoteConflicts(local.saved, incoming.saved, noteDrafts), choices = new Set();
      let applying = false, applied = false, lockReview = () => {};
      const title = el('h3', 'Review study backup'); title.tabIndex = -1;
      preview.replaceChildren(title, el('p', 'Local file: ' + filename, 'muted'), el('p', `Saved passages: ${merged.bookmarkAdded} new · ${merged.bookmarkDuplicates} duplicates · ${merged.bookmarkConflicts} conflicts kept`), el('p', `Plan marks: ${merged.progressAdded} new · ${merged.progressDuplicates} duplicates · ${merged.progressConflicts} conflicts kept`), el('p', 'Existing notes and drafts are kept unless you explicitly select an eligible incoming note below. Source pins, titles and existing conflicting plan marks are always kept; no source identity is upgraded.', 'muted'));
      const savedCount = preview.children[2];
      if (noteRows.length) {
        const review = el('section', undefined, 'backup-note-review'); review.setAttribute('aria-label', 'Review personal note differences');
        const count = el('p'), rows = el('div'), selection = el('p'); count.setAttribute('role', 'status'); count.tabIndex = -1; selection.setAttribute('role', 'status');
        const clear = button('Clear incoming note choices', () => { if (!validReview()) return; choices.clear(); draw(); });
        review.append(el('h4', 'Personal note differences · not scripture'), el('p', 'Current notes include unsaved edits in this tab. Only matching, source-pinned positions allow replacement. Selecting an empty incoming note clears the old note and its draft after a confirmed save. Download your current backup first if you want to keep both versions.', 'notice'), button('Download current study backup', downloadStudyBackup), selection, clear, count, rows); preview.append(review);
        let page = 0;
        function validReview() { return active(request) && review.isConnected && !applying && !applied; }
        const identity = item => noteKey(item);
        const metadata = item => `${item.uid} · ${item.ref} · source revision: ${item.source_commit ?? 'unpinned legacy'} · source offset: ${item.offset ?? 'not recorded'}`;
        function draw(moveFocus = false) {
          if (!active(request) || !review.isConnected) return;
          selection.textContent = choices.size + ' incoming notes selected'; clear.disabled = applied || applying || !choices.size;
          savedCount.textContent = choices.size ? `Saved passages: ${merged.bookmarkAdded} new · ${merged.bookmarkDuplicates} duplicates · ${merged.bookmarkConflicts} original conflicts · ${choices.size} incoming notes selected; all other metadata kept` : `Saved passages: ${merged.bookmarkAdded} new · ${merged.bookmarkDuplicates} duplicates · ${merged.bookmarkConflicts} conflicts kept`;
          const start = page * 10, end = Math.min(noteRows.length, start + 10); count.textContent = `Showing note differences ${start + 1}–${end} of ${noteRows.length}`; rows.replaceChildren();
          for (const row of noteRows.slice(start, end)) {
            const current = local.saved.find(item => identity(item) === row.key), incomingRecord = incoming.saved.find(item => identity(item) === row.key), card = el('article', undefined, 'backup-note-difference'); card.setAttribute('aria-label', 'Note difference ' + row.uid + ' · ' + row.ref);
            card.append(el('h5', row.uid + ' · ' + row.ref), el('p', 'Current reference: ' + metadata(current), 'muted'), el('p', 'Incoming reference: ' + metadata(incomingRecord), 'muted'), el('p', row.eligible ? 'Same source revision and position. Only the note text may be replaced.' : 'Read-only difference: ' + row.reason, row.eligible ? 'muted' : 'notice'));
            const columns = el('div', undefined, 'backup-note-columns');
            for (const [name, text] of [['Note before restore (including draft)', row.currentNote], ['Incoming personal note', row.incomingNote]]) { const label = el('label', name + ' · ' + row.uid + ' · ' + row.ref), field = el('textarea'); field.readOnly = true; field.value = text; label.append(field); columns.append(label); }
            card.append(columns);
            if (row.eligible) {
              const label = el('label', undefined, 'backup-note-choice'), choose = el('input'); choose.type = 'checkbox'; choose.checked = choices.has(row.key); choose.disabled = applied || applying; label.append(choose, document.createTextNode('Use incoming note for ' + row.uid + ' · ' + row.ref));
              choose.addEventListener('change', () => { if (!validReview()) { choose.checked = choices.has(row.key); return; } if (choose.checked) choices.add(row.key); else choices.delete(row.key); selection.textContent = choices.size + ' incoming notes selected'; clear.disabled = !choices.size; savedCount.textContent = choices.size ? `Saved passages: ${merged.bookmarkAdded} new · ${merged.bookmarkDuplicates} duplicates · ${merged.bookmarkConflicts} original conflicts · ${choices.size} incoming notes selected; all other metadata kept` : `Saved passages: ${merged.bookmarkAdded} new · ${merged.bookmarkDuplicates} duplicates · ${merged.bookmarkConflicts} conflicts kept`; }); card.append(label);
              if (row.incomingNote === '') card.append(el('p', 'The incoming note is empty. Selecting it will clear the current note, including its unsaved draft, only after the restore is saved.', 'notice'));
            }
            rows.append(card);
          }
          const pager = el('nav', undefined, 'pager'); pager.setAttribute('aria-label', 'Note difference pages');
          if (page > 0) { const previous = button('Previous note differences', () => { if (!validReview()) return; --page; draw(true); }); previous.disabled = applied || applying; pager.append(previous); }
          if (end < noteRows.length) { const next = button('Next note differences', () => { if (!validReview()) return; ++page; draw(true); }); next.disabled = applied || applying; pager.append(next); }
          rows.append(pager); if (moveFocus) count.focus({ preventScroll: true });
        }
        draw(); lockReview = () => { selection.textContent = choices.size + ' incoming notes applied'; if (choices.size) savedCount.textContent = `Saved passages: ${merged.bookmarkAdded} new · ${merged.bookmarkDuplicates} duplicates · ${merged.bookmarkConflicts} original conflicts · ${choices.size} incoming notes applied; reference metadata kept`; for (const control of review.querySelectorAll('input, button')) if (control.textContent !== 'Download current study backup') control.disabled = true; };
      }
      const resumeLabel = el('label', undefined, 'backup-resume'), resume = el('input'); resume.type = 'checkbox'; resume.checked = false; resume.disabled = !incoming.resume || local.remember_position === false; resumeLabel.append(resume, document.createTextNode('Restore incoming reading position')); preview.append(resumeLabel);
      if (local.remember_position === false) preview.append(el('p', 'Remember reading position is off. Restoring a position is disabled; your privacy preference will not change.', 'muted'));
      if (incoming.resume) { preview.append(link('Open incoming reading position', incoming.resume), el('p', 'Opening is your choice. Source-pinned positions are checked by the reader before displaying wording. Restoring does not open a passage.', 'muted')); if (!new URLSearchParams(incoming.resume.slice(6)).has('source')) preview.append(el('p', 'Legacy reading position: its source revision was not recorded. It stays unpinned and is not upgraded.', 'notice')); }
      const apply = button('Apply study backup', () => {
        if (!active(request) || applying || applied) return;
        try {
          if (personalState() !== state) throw Error('Personal study data changed since preview. Choose the file again. Nothing was restored.');
          const currentRaw = storageNow();
          if (currentRaw !== raw && !readingPointerOnlyChange(raw, currentRaw)) throw Error('Browser data changed since preview. Nothing was restored.');
          if (resume.checked && (currentRaw !== raw || Object.hasOwn(local, 'last') !== localLastPresent || local.last !== localLast)) throw Error('The reading position changed since preview. Preview the file again before restoring its position.');
          if (resume.checked && (local.remember_position === false || !incoming.resume)) throw Error('Restoring the reading position is no longer available.');
          const finalMerged = mergeStudyBackup({ saved: local.saved, progress: local.reading_progress, drafts: noteDrafts }, incoming, catalog, [...choices]);
          const beforeSaved = local.saved, beforeProgress = local.reading_progress, beforeLastPresent = Object.hasOwn(local, 'last'), beforeLast = local.last, beforeStorageSnapshot = storageSnapshot;
          applying = true; apply.disabled = true;
          local.saved = finalMerged.saved; local.reading_progress = finalMerged.progress;
          if (resume.checked) { local.last = incoming.resume; storageSnapshot = currentRaw; }
          if (!persist()) {
            local.saved = beforeSaved; local.reading_progress = beforeProgress; storageSnapshot = beforeStorageSnapshot; if (beforeLastPresent) local.last = beforeLast; else delete local.last; updateResume();
            throw Error('The study backup was not confirmed saved. This tab’s original study data and drafts remain available. Keep the file and export your data before reloading. ' + storageWarning());
          }
          for (const key of finalMerged.replacedNoteKeys) noteDrafts.delete(key);
          applied = true; resume.disabled = true; lockReview(); updateResume();
          const done = el('h3', 'Study backup restored in this browser'); done.tabIndex = -1; preview.append(done, el('p', finalMerged.notesReplaced ? `${finalMerged.notesReplaced} selected incoming personal notes replaced their current text and drafts. Existing reference metadata, other notes, conflicting marks and preferences were kept. No passage was opened.` : 'Existing personal data and preferences were kept. No passage was opened.')); done.focus();
        } catch (error) { preview.append(el('p', error.message, 'notice')); status.textContent = storageConflict || !storageOK ? storageWarning() : error.message; }
        finally { applying = false; apply.disabled = applied; }
      });
      preview.append(apply, button('Cancel restore', cancel)); title.focus();
    } catch (error) { failure(error, request, incoming.progress.length ? () => prepare(incoming, ++generation, filename) : null, filename); }
  }
  input.addEventListener('change', async () => {
    const request = ++generation, file = input.files?.[0]; input.value = ''; preview.replaceChildren(); if (!file) return;
    try {
      if (file.size > MAX_STUDY_BACKUP_BYTES) throw Error('Choose a study backup no larger than 32 MiB. Nothing was restored.');
      const text = await file.text(); if (!active(request)) return;
      if (new TextEncoder().encode(text).length > MAX_STUDY_BACKUP_BYTES) throw Error('Choose a study backup no larger than 32 MiB. Nothing was restored.');
      const incoming = parseStudyBackup(text); await prepare(incoming, request, file.name);
    } catch (error) { failure(error, request, null, file.name); }
  });
}
async function plans(args, token) {
  const name = args.get('name');
  if (!name) {
    const catalog = planCatalog(await tool('reading_plan', {})); if (token !== epoch) return;
    heading('AT YOUR OWN PACE', 'Reading plans'); view.append(link('Study backup', '#backup', 'button'));
    view.append(el('p', 'Follow the existing sourced reading orders. Day numbers are steps, not deadlines. Marks record your choice only; they do not prove comprehension or completion of every passage.', 'notice'));
    const cards = el('div', undefined, 'cards'), counts = new Map();
    for (const plan of catalog) { const card = link('', route('plans', { name: plan.name, day: 1 }), 'entry'); card.append(el('strong', plan.title), el('p', plan.description), el('small', plan.days + ' days · ' + local.reading_progress.filter(x => x.name === plan.name).length + ' saved day marks')); counts.set(plan.name, card.querySelector('small')); cards.append(card); } view.append(cards);
    const updateCounts = () => { for (const plan of catalog) counts.get(plan.name).textContent = plan.days + ' days · ' + local.reading_progress.filter(x => x.name === plan.name).length + ' saved day marks'; };
    view.append(progressImporter(catalog, token, updateCounts));
    view.append(el('p', 'Progress stays in this browser only. A changed assignment or source revision requires review; saved marks are not automatically transferred.', 'muted'), button('Export reading progress', () => exportPersonal({ format: 'pali-library-reading-progress-v1', progress: local.reading_progress }, 'pali-library-reading-progress.json'))); return;
  }
  const day = Number(args.get('day') || 1), data = planDay(await tool('reading_plan', { name, day }), name, day); if (token !== epoch) return;
  heading('SOURCED READING ORDER', data.title); view.append(link('← All reading plans', '#plans', 'button'), el('p', data.description, 'muted'), el('h3', 'Day ' + day + ' of ' + data.days));
  const form = el('form'); form.className = 'plan-picker'; const label = el('label', 'Go to day'), input = el('input'); input.type = 'number'; input.min = '1'; input.max = String(data.days); input.value = day; input.required = true; label.append(input); const submit = el('button', 'Go'); submit.type = 'submit'; form.append(label, submit); form.addEventListener('submit', e => { e.preventDefault(); if (form.reportValidity()) location.hash = route('plans', { name, day: input.value }); }); view.append(form);
  for (const reading of data.readings) {
    const card = el('article', undefined, 'entry'); card.append(el('h4', reading.citation + (reading.title ? ' · ' + reading.title : '')));
    if (reading.part) card.append(el('p', 'Part ' + reading.part + ' of ' + reading.of + ' · assigned Pāli segments ' + ((reading.get_text.offset || 0) + 1) + '–' + ((reading.get_text.offset || 0) + reading.get_text.limit), 'notice'));
    notes(reading, card); card.append(link('Read assigned Pāli · ' + reading.citation, route('read', { uid: reading.id, plan: name, day, ...(reading.get_text.offset !== undefined ? { offset: reading.get_text.offset } : {}) }), 'button'));
    if (reading.guide_link?.url) card.append(el('p', 'The guide’s cited English source (external; its own scope and terms apply):'), external(reading.guide_link.reference || 'Publisher’s source page', reading.guide_link.url)); view.append(card);
  }
  const signature = daySignature(data), prior = local.reading_progress.find(x => x.name === name && x.day === day), active = prior?.signature === signature;
  if (prior && !active) view.append(el('p', 'This day was marked against a different assignment or source revision. Review it before marking the current day.', 'notice'));
  const mark = button(active ? 'Day marked ✓ · undo' : 'Mark this day read', () => { const current = local.reading_progress.find(x => x.name === name && x.day === day), undo = current?.signature === signature; local.reading_progress = local.reading_progress.filter(x => !(x.name === name && x.day === day)); if (!undo) local.reading_progress.push({ name, day, signature }); const saved = persist(); mark.textContent = undo ? 'Mark this day read' : 'Day marked ✓ · undo'; mark.setAttribute('aria-pressed', String(!undo)); status.textContent = saved ? (undo ? 'Day mark removed from this browser.' : 'Day marked in this browser only.') : storageWarning(); }); mark.setAttribute('aria-pressed', String(active)); view.append(mark);
  const daysNav = el('nav', undefined, 'pager'); daysNav.setAttribute('aria-label', 'Plan days'); if (day > 1) daysNav.append(link('← Previous day', route('plans', { name, day: day - 1 }), 'button')); if (day < data.days) daysNav.append(link('Next day →', route('plans', { name, day: day + 1 }), 'button')); view.append(daysNav);
  if (data.guide) { const guide = el('section', undefined, 'provenance'); guide.append(el('h3', 'Study guide · links only'), el('p', data.guide.cite), el('p', [data.guide.copyright, data.guide.license].filter(Boolean).join(' · ')), el('p', data.guide.note), external('Read the original study guide', data.guide.url)); view.append(guide); if (data.omitted?.length) { const omitted = el('details'); omitted.append(el('summary', 'Unplaced guide links (' + data.omitted.length + ')')); for (const item of data.omitted) omitted.append(el('p', item.reason), external('Original unplaced source link', item.url)); view.append(omitted); } }
  provenance({ source: data.source.pali });
}
function studyIndexNav() { const nav = el('nav', undefined, 'toolbar'); nav.setAttribute('aria-label', 'Study indexes'); nav.append(link('All topics', '#topics', 'button'), link('Numbered teaching lists', '#lists', 'button'), link('Back to library', '#browse?node=canon', 'button')); view.append(nav); }
function topicProvenance(data) { provenance({ source: { ...data.source, terms: data.source.license }, url: data.source.url }); }
function studySourceCards(items) {
  const cards = el('div', undefined, 'cards');
  for (const item of items) { const card = el('article', undefined, 'entry'); card.append(el('h4', item.citation + (item.title ? ' · ' + item.title : ''))); if (item.pts) card.append(el('p', 'PTS: ' + item.pts, 'muted')); if (item.numbering_note) card.append(el('p', item.numbering_note, 'notice')); notes(item, card); if (item.role) card.append(el('p', item.role, 'muted')); card.append(link('Read Pāli · ' + item.citation, route('read', { uid: item.id }), 'button')); if (item.ati_url) card.append(el('p', 'Publisher citation: ' + item.ati_reference), external('ATI linked page · separate source terms', item.ati_url)); cards.append(card); }
  view.append(cards);
}
async function topics(args, token) {
  const query = (args.get('q') || '').trim(), index = args.get('index') || 'all', offset = offsetOf(args), limit = 24;
  if (!['all', 'subject', 'numerical'].includes(index)) throw Error('Choose a supported topic index.');
  const data = topicCatalogue(await tool('list_topics', { ...(query ? { query } : {}), index, offset, limit }), { offset, limit }); if (token !== epoch) return;
  heading('EDITORIAL INDEX · NOT SCRIPTURE', 'Study by topic', 'Study by topic'); studyIndexNav();
  view.append(el('p', 'Explore Access to Insight’s subject and numerical indexes, mapped to bundled canonical texts. Index entries are editorial groupings, not a ruling on what a passage means. English documents have their own terms; no translation is fetched automatically.', 'notice'));
  const form = el('form'); form.className = 'topic-picker'; const label = el('label', 'Find a topic'), input = el('input'), filterLabel = el('label', 'Topic index'), filter = el('select'), submit = el('button', 'Find topics'); input.value = query; input.maxLength = 200; label.append(input); for (const [value, text] of [['all', 'All entries'], ['subject', 'Subject index'], ['numerical', 'Numerical index']]) { const option = el('option', text); option.value = value; filter.append(option); } filter.value = index; filter.id = 'topic-index'; filterLabel.htmlFor = filter.id; const filterField = el('div', undefined, 'topic-filter'); filterField.append(filterLabel, filter); submit.type = 'submit'; form.append(label, filterField, submit); form.addEventListener('submit', e => { e.preventDefault(); navigateFromFinder(route('topics', { ...(input.value.trim() ? { q: input.value.trim() } : {}), index: filter.value })); }); view.append(form); notes(data);
  view.append(el('p', data.total + ' matching index entries · this page: ' + data.returned, 'muted')); const cards = el('div', undefined, 'cards');
  for (const item of data.topics) { const card = link('', route('topic', { name: item.slug }), 'entry'); card.append(el('strong', item.name), el('small', (item.index === 'subject' ? 'Subject index' : 'Numerical index') + ' · ' + item.texts + ' mapped texts')); cards.append(card); } view.append(cards); if (!data.topics.length) view.append(el('p', 'No index entry matched. Try a shorter topic name, Pāli term or the text search.'));
  pageControls(data.next_offset, offset ? Math.max(0, offset - limit) : null, n => route('topics', { ...(query ? { q: query } : {}), index, offset: n })); topicProvenance(data);
}
async function topicPage(args, token) {
  const name = args.get('name'), data = topicDetail(await tool('topic', { name }), name); if (token !== epoch) return;
  heading('EDITORIAL TOPIC · NOT SCRIPTURE', data.topic.name); studyIndexNav(); notes(data); view.append(el('p', data.topic.index, 'muted'), el('p', data.note, 'notice'), external('Original ATI index entry', data.topic.ati_url));
  if (data.dhamma_list) view.append(el('p', 'Related numbered list:', 'muted'), link(data.dhamma_list.name, route('lists', { name: data.dhamma_list.slug }), 'button'));
  view.append(el('h3', 'Mapped canonical readings')); if (!data.texts.length) view.append(el('p', 'No safely mapped canonical link is recorded for this entry. Read the original index; no text was inferred.')); studySourceCards(data.texts);
  if (data.see_also?.length) { view.append(el('h3', 'See also · index cross-references')); for (const item of data.see_also) { const p = el('p'); p.append(link(item.name, route('topic', { name: item.slug }))); view.append(p); } }
  if (data.further_reading?.length) { view.append(el('h3', 'External publisher links')); for (const item of data.further_reading) { const card = el('article', undefined, 'entry'); card.append(external(item.title, item.url), el('p', item.kind, 'muted')); view.append(card); } }
  if (data.other_matches?.length) { const more = el('details'); more.append(el('summary', 'Other matching index entries')); for (const item of data.other_matches) { const p = el('p'); p.append(link(item.name, route('topic', { name: item.slug }))); more.append(p); } view.append(more); } topicProvenance(data);
}
async function teachingLists(args, token) {
  const name = args.get('name');
  if (!name) {
    const data = listCatalogue(await tool('dhamma_list', {})); if (token !== epoch) return;
    heading('CURATED REFERENCE · NOT SCRIPTURE', 'Numbered teaching lists'); studyIndexNav(); view.append(el('p', 'Pāli member names and short English labels lead to their defining passages. A later collective name or a later list is explicitly labelled. Read the source passage before quoting.', 'notice')); const cards = el('div', undefined, 'cards');
    for (const item of data.lists) { const card = link('', route('lists', { name: item.slug }), 'entry'); card.append(el('strong', item.name), el('p', item.pali), el('small', item.status + ' · ' + data.status_labels[item.status])); cards.append(card); } view.append(cards); return;
  }
  const data = listDetail(await tool('dhamma_list', { name }), name); if (token !== epoch) return;
  heading('CURATED TEACHING LIST · READ THE SOURCE', data.name); studyIndexNav(); notes(data); view.append(el('p', data.pali, 'passage'), el('p', data.status + ' · ' + data.status_meaning + (data.status_note ? '\n' + data.status_note : ''), 'notice'), el('p', data.gloss_note, 'notice'));
  if (data.count !== data.members.length) view.append(el('p', 'Traditional count: ' + data.count + '. The source groups this list into ' + data.members.length + ' entries below; these rows are not a new enumeration.', 'muted'));
  const members = el('ol'); members.className = 'teaching-members';
  for (const member of data.members) { const item = el('li'), pali = el('strong', member.pali); pali.lang = 'pi'; item.append(pali, el('p', member.gloss)); if (member.group) item.append(el('p', member.group, 'muted')); if (member.list) item.append(link('Open group · ' + member.gloss, route('lists', { name: member.list }), 'button')); members.append(item); } view.append(members, el('h3', 'Defining canonical passages'), el('p', data.note, 'muted')); studySourceCards(data.defined_in);
  if (data.see_also_texts?.length) { view.append(el('h3', 'Additional source context')); studySourceCards(data.see_also_texts); }
  if (data.related_lists?.length) { view.append(el('h3', 'Related curated lists')); for (const item of data.related_lists) { const p = el('p'); p.append(link(item.name, route('lists', { name: item.slug }))); view.append(p); } }
  if (data.topic) view.append(link('ATI index topic · ' + data.topic.name, route('topic', { name: data.topic.slug }), 'button')); view.append(el('p', 'Curated by: ' + data.source.curated_by, 'muted')); provenance({ source: data.source.pali });
}
function progressImporter(catalog, token, updateCounts) {
  const section = el('section'), label = el('label', 'Restore reading progress from JSON'), input = el('input'), preview = el('div'); section.setAttribute('aria-label', 'Restore reading progress'); input.type = 'file'; input.accept = '.json,application/json'; label.append(input); preview.className = 'import-preview'; section.append(label, el('p', 'Choose your exported plan marks. The file stays on this device. Preview before adding marks; existing days and source signatures are kept. Maximum 16 MiB and 1,600 marks.', 'muted'), preview); let generation = 0;
  const failure = error => { const title = el('h3', 'Unable to restore reading progress'); title.tabIndex = -1; preview.replaceChildren(title, el('p', error.message, 'notice')); title.focus(); };
  input.addEventListener('change', async () => {
    const request = ++generation, file = input.files?.[0]; input.value = ''; preview.replaceChildren(); if (!file) return;
    try {
      if (file.size > MAX_PROGRESS_BYTES) throw Error('Choose a progress export no larger than 16 MiB. Nothing was restored.');
      const text = await file.text(); if (request !== generation || token !== epoch) return;
      if (new TextEncoder().encode(text).length > MAX_PROGRESS_BYTES) throw Error('Choose a progress export no larger than 16 MiB. Nothing was restored.');
      let snapshot; try { snapshot = localStorage.getItem(KEY); } catch {}
      if (snapshot !== undefined && snapshot !== storageSnapshot && !readingPointerOnlyChange(storageSnapshot, snapshot)) throw Error('Browser data changed in another tab. Reload this page before restoring; no marks were restored.');
      const incoming = parseProgress(text, catalog), merge = mergeProgress(local.reading_progress, incoming), title = el('h3', 'Review reading progress'); title.tabIndex = -1;
      preview.replaceChildren(title, el('p', file.name), el('p', merge.added + ' new marks · ' + merge.duplicates + ' already saved · ' + merge.conflicts + ' conflicting days kept as they are.', 'notice'), el('p', 'Imported marks are self-reported. Their saved assignments and source revisions are retained, not verified against every current plan day. Open a day to check whether its mark still applies.', 'muted'));
      if (merge.added) preview.append(button('Add ' + merge.added + ' reading marks', () => {
        if (request !== generation || token !== epoch) return;
        try {
          if (snapshot !== undefined) {
            const currentRaw = localStorage.getItem(KEY);
            if (currentRaw !== snapshot && !readingPointerOnlyChange(snapshot, currentRaw)) throw Error('Browser data changed while previewing this file. Reload this page and preview again; no marks were restored.');
          }
          const current = mergeProgress(local.reading_progress, incoming); local.reading_progress = current.progress; const durable = persist(); updateCounts();
          const done = el('h3', 'Reading marks restored'); done.tabIndex = -1; preview.replaceChildren(done, el('p', current.added + ' new marks added. Existing marks kept. Open a plan day to review its current source and assignment.', 'notice')); status.textContent = durable ? 'Reading marks restored in this browser only.' : storageWarning(); done.focus();
        } catch (error) { failure(error); }
      })); else preview.append(el('p', 'No new marks to add.'));
      preview.append(button('Cancel progress import', () => { ++generation; preview.replaceChildren(); input.focus(); })); title.focus();
    } catch (error) { if (request === generation && token === epoch) failure(error); }
  }); return section;
}
function quoteChecker(token) {
  heading('CHECK AGAINST SOURCE TEXT', 'Check a Pāli quotation');
  view.append(el('p', 'Pāli only · Roman or a supported Pāli script · up to 2,000 characters and 120 comparison words. English checking is not offered here; no translations are fetched.', 'notice'), el('p', 'Your quotation is sent to this server for matching, but is not put in the URL, browser storage or page title. Hosting infrastructure may keep request logs. A match does not establish authorship or exact spelling.', 'muted'));
  const form = el('form'), label = el('label', 'Pāli quotation'), input = el('textarea'), submit = el('button', 'Check bundled Pāli'), result = el('section');
  input.id = 'quote-input'; input.className = 'note-field'; input.minLength = 8; input.maxLength = 2000; input.required = true; input.spellcheck = false; label.htmlFor = input.id; submit.type = 'submit'; form.append(label, input, submit); result.id = 'quote-result'; result.tabIndex = -1; result.setAttribute('aria-label', 'Quotation comparison result'); view.append(form, result);
  let generation = 0;
  form.addEventListener('submit', async event => {
    event.preventDefault(); const request = ++generation, quote = input.value.trim(); result.replaceChildren(el('p', 'Comparing with bundled canonical Pāli…')); result.setAttribute('aria-busy', 'true'); submit.disabled = true;
    try {
      const data = await tool('verify_quote', { text: quote, language: 'pali', limit: 5 }); if (token !== epoch || request !== generation) return;
      validatePaliQuote(data, quote);
      const labels = { found: 'Matching wording found', close_paraphrase: 'Similar wording found', not_found_in_scope: 'Not found in the searched scope' };
      result.replaceChildren(el('h3', labels[data.verdict]), el('p', 'Submitted quotation', 'muted'), el('p', quote, 'translation'), el('p', data.explanation, 'notice'), el('p', data.scope.searched), el('p', data.comparison.note), el('p', data.guidance, 'muted')); notes(data, result);
      if (data.citation_note) result.append(el('p', data.citation_note, 'notice'));
      if (data.verdict === 'not_found_in_scope' && data.matches.length) result.append(el('h4', 'Lower-scoring candidates · not verified matches'));
      for (const match of data.matches) {
        const card = el('article', undefined, 'word-card'); card.append(el('h4', match.citation + (match.title ? ' · ' + match.title : '')), el('p', match.matched_text, 'passage'), el('p', 'Source span: ' + match.source_span.first_segment_ref + ' to ' + match.source_span.last_segment_ref, 'muted'));
        if (match.matched_text_truncated) card.append(el('p', 'Excerpt shortened by the source tool. Open the source for the complete context.', 'notice'));
        card.append(el('p', data.comparison.method === 'literal_source_substring' ? 'Unchanged source substring located; source correctness and authorship are not established.' : 'Normalized similarity: ' + match.similarity + ' (0–1), not a probability of truth or authorship.', 'muted'));
        card.querySelector('.passage').lang = 'pi'; notes(match, card); card.append(link('Open source at match start · ' + match.citation, route('read', { uid: match.text_id, offset: match.read_with.offset, ref: match.segment_ref }), 'button')); result.append(card);
      }
      result.append(el('p', data.thresholds.measure, 'muted')); provenance({ edition: 'Bundled canonical Pāli comparison', attribution: data.scope.attribution, license: data.scope.terms }, result); result.focus({ preventScroll: true }); result.scrollIntoView({ block: 'start' });
    } catch (error) { if (token !== epoch || request !== generation) return; result.replaceChildren(el('h3', 'Unable to check this quotation'), el('p', error.message, 'notice')); result.focus({ preventScroll: true }); }
    finally { if (token === epoch && request === generation) { submit.disabled = false; result.removeAttribute('aria-busy'); } }
  });
}
function bookmarkImporter() {
  const token = epoch, section = el('section'); section.setAttribute('aria-label', 'Restore bookmark export'); const label = el('label', 'Restore bookmarks and notes from a JSON export'), input = el('input'); input.type = 'file'; input.accept = '.json,application/json'; label.append(input); section.append(label, el('p', 'Files stay on this device. Preview first; existing bookmarks and notes are kept. References are checked against the source only when opened. Maximum file size: 16 MiB.', 'muted'));
  const preview = el('div'); preview.className = 'import-preview'; preview.setAttribute('aria-live', 'polite'); section.append(preview); let generation = 0;
  input.addEventListener('change', async () => {
    const file = input.files[0], request = ++generation; input.value = ''; if (!file) return; preview.replaceChildren(el('p', 'Reading the local export…'));
    try {
      if (file.size > MAX_IMPORT_BYTES) throw Error('This file exceeds 16 MiB. Nothing was imported.');
      const incoming = parseBookmarks(await file.text()); if (request !== generation || token !== epoch) return;
      const merge = bookmarkMerge(local.saved, incoming), title = el('h3', 'Review bookmark import'); title.tabIndex = -1;
      preview.replaceChildren(title, el('p', file.name), el('p', merge.added.length + ' new bookmarks · ' + merge.skipped + ' already saved. Existing notes will not be overwritten.', 'notice'));
      if (merge.added.length) {
        const list = el('ul'); for (const item of merge.added.slice(0, 10)) list.append(el('li', item.title + ' · ' + item.ref)); preview.append(list); if (merge.added.length > 10) preview.append(el('p', 'And ' + (merge.added.length - 10) + ' more.'));
        preview.append(button('Add ' + merge.added.length + ' new bookmarks', () => { if (token !== epoch || request !== generation) return; try { const current = bookmarkMerge(local.saved, incoming); local.saved = current.saved; const durable = persist(); saved(); status.textContent = durable ? current.added.length + ' bookmarks restored in this browser. Existing notes kept.' : storageWarning(); } catch (error) { preview.replaceChildren(el('p', error.message, 'notice')); } }));
      } else preview.append(el('p', 'There are no new passages to add.'));
      preview.append(button('Cancel import', () => { ++generation; preview.replaceChildren(); input.focus(); })); title.focus();
    } catch (error) { if (request === generation && token === epoch) preview.replaceChildren(el('p', error.message, 'notice')); }
  }); return section;
}
const savedFilters = { query: '', scope: 'all', page: 0 };
function saved() {
  const token = epoch;
  view.replaceChildren();
  heading('YOUR PERSONAL READING', 'Saved passages'); view.append(el('p', 'Bookmarks and notes stay in this browser only. They are not scripture, synced, or backed up. Export them to keep a copy.', 'notice'));
  view.append(link('Study backup', '#backup', 'button'));
  view.append(button('Export bookmarks and notes', () => { exportPersonal(exportBookmarks(), 'pali-library-bookmarks.json'); }));
  view.append(el('p', 'Unsaved note edits stay in this tab while you navigate. Save or export them before closing or reloading.', 'muted'), bookmarkImporter());
  const filters = el('form', undefined, 'saved-filters'); filters.setAttribute('aria-label', 'Find saved passages');
  const searchLabel = el('label', 'Search saved passages and notes'), query = el('input'); query.type = 'search'; query.maxLength = 300; query.value = savedFilters.query; searchLabel.append(query);
  const scopeLabel = el('label', 'Saved source type'), scope = el('select'); scope.setAttribute('aria-label', 'Saved source type');
  for (const [value, name] of [['all', 'All source types'], ...Object.entries(savedScopeLabels)]) { const option = el('option', name); option.value = value; scope.append(option); }
  scope.value = savedFilters.scope; scopeLabel.append(scope);
  const clear = button('Clear saved filters', () => { if (token !== epoch) return; query.value = ''; scope.value = 'all'; refresh(); query.focus(); });
  filters.append(searchLabel, scopeLabel, clear);
  view.append(filters, el('p', 'Search stays in this tab. It checks saved titles, references and personal notes, not the full scripture text.', 'muted'));
  const count = el('p'); count.id = 'saved-count'; count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite'); count.tabIndex = -1; view.append(count);
  const results = el('section'); results.setAttribute('aria-label', 'Saved passage results'); view.append(results);
  function refresh() {
    if (token !== epoch) return;
    savedFilters.query = query.value; savedFilters.scope = scope.value; savedFilters.page = 0; show();
  }
  filters.addEventListener('submit', event => { event.preventDefault(); refresh(); });
  query.addEventListener('input', refresh); scope.addEventListener('change', refresh);
  function show(moveFocus = false) {
    if (token !== epoch) return;
    const page = savedPage(local.saved, noteDrafts, savedFilters); savedFilters.page = page.page;
    count.textContent = page.total ? `Showing ${page.start}–${page.end} of ${page.total} matching saved passages · ${page.all} saved in this tab` : `No matching saved passages · ${page.all} saved in this tab`;
    results.replaceChildren();
    if (!local.saved.length) results.append(el('p', 'Save a passage while reading to find it here.'));
    else if (!page.total) results.append(el('p', 'Try a different saved title, reference, note or source type, or clear the filters.'));
    for (const item of page.items) {
      const box = el('article', undefined, 'segment');
      box.append(el('small', savedScopeLabels[savedScope(item)], 'muted'));
      try {
        const target = bookmarkLocation(item, readingArgs(item.uid));
        box.append(link(item.title + ' · ' + item.ref, target.href), el('p', target.notice, 'muted'));
      } catch (error) {
        box.append(el('strong', item.title + ' · ' + item.ref), el('p', 'This saved reference cannot be opened safely: ' + error.message, 'notice'));
      }
      box.append(personalNoteEditor(item, { uid: item.uid, ref: item.ref }, token, { mode: 'saved' }));
      const remove = button('Remove bookmark', () => removePersonalBookmark(savedRecord(item) || item, token, box, remove, () => show(true))); box.append(remove);
      if (item.source_commit) box.append(el('small', 'Saved source revision: ' + item.source_commit, 'muted')); results.append(box);
    }
    if (page.pages > 1) {
      const pager = el('nav', undefined, 'pager'); pager.setAttribute('aria-label', 'Saved passage pages');
      if (page.page > 0) pager.append(button('Previous saved page', () => { if (token !== epoch) return; savedFilters.page = page.page - 1; show(true); }));
      pager.append(el('span', `Page ${page.page + 1} of ${page.pages}`));
      if (page.page + 1 < page.pages) pager.append(button('Next saved page', () => { if (token !== epoch) return; savedFilters.page = page.page + 1; show(true); }));
      results.append(pager);
    }
    if (moveFocus) { count.focus({ preventScroll: true }); count.scrollIntoView({ block: 'start' }); }
  }
  show();
}
function about() {
  heading('A LIBRARY, NOT A TEACHER', 'Read with the source in view.');
  for (const text of ['The bundled Pāli is retrieved from the VRI Chaṭṭha Saṅgāyana edition. Scripture is never generated or reconstructed. Abbreviations and uncertain alignments stay labelled.', 'English translations are available for a subset of texts and fetched only after you choose them. Translators’ wording is not silently exchanged. Commentary is labelled separately from canonical text.', 'VRI and several translation/dictionary sources carry non-commercial terms. This reading interface adds no permission to redistribute, translate or commercialize their work.', 'Your saved passages, notes, manual reading-plan marks and preferences are stored in this browser. The app has no accounts, advertising, analytics, cloud sync or offline web download. The server may hold your IP temporarily for rate limiting; deployment providers may keep separate infrastructure logs.']) view.append(el('p', text));
  const links = el('div', undefined, 'toolbar'); links.append(external('Source and licence register', 'https://github.com/DaniilKi/pali-canon-claude/blob/dev/pali-reliability/THIRD_PARTY.md'), external('Project and complete MCP toolset', 'https://github.com/DaniilKi/pali-canon-claude')); view.append(links);
}
async function render() {
  if (location.hash === '#content' && view.childElementCount) { $('content').focus(); return; }
  activePosition = null; highlightTargets = []; clearTimeout(positionTimer); const token = ++epoch; ++studyEpoch; requests.cancelAll(); closeFinder(); updateResume(); view.replaceChildren(); status.textContent = 'Opening the library…';
  const hash = location.hash.slice(1), queryIndex = hash.indexOf('?'), page = queryIndex < 0 ? hash : hash.slice(0, queryIndex), args = new URLSearchParams(queryIndex < 0 ? '' : hash.slice(queryIndex + 1));
  try { if (page === 'read') await read(args, token); else if (page === 'search') await search(args, token); else if (page === 'book-search') await bookSearch(args, token); else if (page === 'glossary') await dictionary(args, token); else if (page === 'daily') await daily(args, token); else if (page === 'verify') quoteChecker(token); else if (page === 'plans') await plans(args, token); else if (page === 'topics') await topics(args, token); else if (page === 'topic') await topicPage(args, token); else if (page === 'lists') await teachingLists(args, token); else if (page === 'saved') saved(); else if (page === 'backup') studyBackup(token); else if (page === 'about') about(); else await browse(args, token);
    if (token !== epoch) return; status.textContent = storageConflict || !storageOK ? storageWarning() : !positionDurable ? positionWarning || storageWarning() : ''; focusHeading();
  } catch (error) { if (token !== epoch) return; view.replaceChildren(); const stopped = error.code === 'REQUEST_STOPPED'; heading(stopped ? 'BROWSER WAIT STOPPED' : 'UNABLE TO OPEN', stopped ? 'Reading request stopped' : 'No passage was substituted.'); view.append(el('p', error.message, 'notice'), button('Try again', render), link('Browse the library', route('browse', { node: 'canon' }), 'button')); if (error.code === 'READING_SOURCE_CHANGED') { const review = new URLSearchParams(args); review.delete('source'); review.delete('page_source'); view.append(link(page === 'book-search' ? 'Review current source book search' : args.has('page_source') ? 'Review current source at this position' : 'Review current source at this reference', (page === 'book-search' ? '#book-search?' : '#read?') + review, 'button')); } status.textContent = stopped ? 'Stopped waiting in this browser.' : error.code === 'REQUEST_DEADLINE' ? 'The request timed out.' : 'The request failed.'; }
}
installPagePrinting();
window.addEventListener('hashchange', render); render();
