import { localizeText } from '../src/script.mjs';
import { scopeDescriptor, validateEnglishPage } from './translation-policy.mjs';
import { planCatalog, planDay, daySignature, cleanProgress, planWindow, validatePlanPage } from './reading-plans.mjs';
import { MAX_IMPORT_BYTES, parseBookmarks, bookmarkMerge } from './bookmark-import.mjs';
import { validateDaily } from './daily-reading.mjs';
import { validatePaliQuote } from './quote-check.mjs';
import { MAX_PROGRESS_BYTES, parseProgress, mergeProgress } from './progress-import.mjs';
import { topicCatalogue, topicDetail, listCatalogue, listDetail } from './topics-study.mjs';
/* Source text is retrieved through the existing, schema-validated MCP tools. Never render source HTML. */
'use strict';
const $ = id => document.getElementById(id);
const view = $('view'), status = $('status');
let serial = 0, epoch = 0, studyEpoch = 0;
const KEY = 'pali-library-v1';
let storageOK = true, storageSnapshot;
function loadLocal() { try { const raw = localStorage.getItem(KEY); storageSnapshot = raw; const x = JSON.parse(raw || '{}'); return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; } catch { storageOK = false; return {}; } }
const local = loadLocal();
local.reading_progress = cleanProgress(local.reading_progress);
if (!Array.isArray(local.saved)) local.saved = [];
local.saved = local.saved.filter(x => x && typeof x.uid === 'string' && typeof x.ref === 'string' && typeof x.title === 'string').slice(0, 500);
function persist() { try { const serialized = JSON.stringify(local); localStorage.setItem(KEY, serialized); storageSnapshot = serialized; return true; } catch { storageOK = false; status.textContent = 'Browser storage is unavailable. Changes are kept only in this tab; export your saved passages.'; return false; } }
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
function updateResume() { const valid = typeof local.last === 'string' && /^#read\?/.test(local.last); $('resume').hidden = !valid || location.hash === local.last; if (valid) $('resume').href = local.last; }
function preferences() {
  const size = Math.max(16, Math.min(30, Number(local.font) || 21));
  document.documentElement.style.setProperty('--reading', size + 'px'); $('font-size').value = size;
  document.body.dataset.theme = local.theme === 'dark' ? 'dark' : 'light'; $('theme').value = document.body.dataset.theme;
  if ([...$('script').options].some(o => o.value === local.script)) $('script').value = local.script;
}
preferences(); updateResume();
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
  const node = args.get('node') || 'canon', offset = offsetOf(args), limit = 40;
  const kind = node === 'commentary' ? 'commentary' : node === 'post' ? 'post' : 'canon';
  const data = kind === 'commentary' ? await tool('get_commentary', { uid: 'commentary', offset, limit }) : kind === 'post' ? await tool('get_post_canonical', { offset, limit }) : await tool('browse_canon', { node, offset, limit }); if (token !== epoch) return;
  heading('EXPLORE THE LIBRARY', kind === 'commentary' ? 'Traditional commentary' : kind === 'post' ? 'Later Pāli works' : data.name || 'The Pāli Canon');
  const nav = el('div', undefined, 'toolbar'); nav.append(link('All collections', route('browse', { node: 'canon' }), 'button'), link('Complete source books', route('browse', { node: 'books' }), 'button')); if (node === 'canon') nav.append(link('Study by topic', '#topics', 'button'), link('Numbered teaching lists', '#lists', 'button')); view.append(nav);
  if (data.note) view.append(el('p', data.note, 'muted')); notes(data);
  const cards = el('div', undefined, 'cards');
  for (const item of data.items || data.books || []) {
    const href = kind === 'commentary' ? route('read', { kind, uid: item.uid }) : kind === 'post' ? route('read', { kind, uid: item.id }) : item.read_with?.book ? route('read', { book: item.read_with.book }) : item.citation ? route('read', { uid: item.id }) : route('browse', { node: item.id });
    const card = link('', href, 'entry'); card.append(el('small', kind === 'canon' ? item.citation || item.pitaka || 'Collection' : kind === 'commentary' ? 'Commentary · not canon' : 'Later work · not canon'), el('strong', item.name || item.title || item.id));
    if (item.texts !== undefined) card.append(el('p', item.texts + ' texts'));
    if (item.english_available !== undefined) card.append(el('p', item.english_available ? 'English source linked' : (item.shared_english_available || item.partial_english_available) ? 'Scoped English source · review required' : 'Pāli source text'));
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
function saveSegment(selector, data, segment, control, container) {
  const found = local.saved.findIndex(x => x.uid === selector && x.ref === segment.ref);
  if (found >= 0) local.saved.splice(found, 1);
  else if (local.saved.length < 500) local.saved.push({ uid: selector, ref: segment.ref, title: data.title || data.book?.title || data.citation || data.book_id, note: '', offset: data.offset + data.segments.indexOf(segment), source_commit: data.source?.commit });
  else { status.textContent = 'Your saved list is full (500 passages). Export it before removing entries.'; return; }
  const active = local.saved.some(x => x.uid === selector && x.ref === segment.ref); control.textContent = active ? 'Saved ✓' : 'Save passage'; control.setAttribute('aria-pressed', String(active)); container.classList.toggle('marked', active); persist();
}
async function read(args, token) {
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
  if (args.has('ref') && !data.segments.some(segment => segment.ref === args.get('ref'))) throw Error('The saved passage reference was not returned at this position. No nearby passage was substituted. Open the source from the Library or check the bookmark’s revision.');
  if (plan) validatePlanPage(data, plan, uid, window);
  if ((kind === 'post' && data.canonical !== false) || (kind === 'commentary' && !(data.canonical === false && data.content_type === 'commentary') && !(typeof data.label === 'string' && data.label.startsWith('Commentary') && data.label.includes('not the canon')))) throw new Error('This response lacks the expected non-canonical source label.');
  const selector = kind === 'book' ? 'book:' + book : kind === 'post' ? 'post:' + uid : kind === 'canon' ? data.text_id || uid : uid.startsWith('commentary:') ? uid : 'commentary-ref:' + uid;
  heading(kind === 'book' ? 'COMPLETE VRI SOURCE BOOK' : kind === 'commentary' ? 'TRADITIONAL COMMENTARY · NOT CANON' : kind === 'post' ? 'LATER PĀLI WORK · NOT CANON' : 'CANONICAL PĀLI', (data.citation ? data.citation + ' · ' : '') + (data.title || data.book?.title || data.book_id || uid));
  if (plan) { view.append(link('← Return to plan day ' + plan.day, route('plans', { name: plan.name, day: plan.day }), 'button'), el('p', plan.title + ' · day ' + plan.day + (window.end === null ? ' · complete selected text' : ' · assigned segments ' + (window.start + 1) + '–' + window.end) + '. English sources and related material may cover more than this assignment; they are not aligned to this part.', 'notice')); }
  notes(data); view.append(el('p', `Segments ${offset + 1}–${offset + data.returned} of ${data.total_segments}`, 'muted'));
  const toolbar = el('div', undefined, 'toolbar');
  toolbar.append(link('Back to library', route('browse', { node: 'canon' }), 'button'));
  const copy = button('Copy reading link', async () => { try { await navigator.clipboard.writeText(location.href); status.textContent = 'Reading link copied.'; } catch { status.textContent = 'Copy the link from your browser’s address bar.'; } });
  if (kind === 'canon') {
    const panel = el('details', undefined, 'study-actions'); panel.append(el('summary', 'Study & sources')); const tools = el('div', undefined, 'toolbar');
    const invoke = action => () => { if (narrowReading.matches) panel.open = false; action(); const target = $('study'); target.tabIndex = -1; target.focus(); };
    tools.append(button('English sources', invoke(() => translations(data, uid, token))), button('Traditional commentary', invoke(() => commentary(uid, token))), button('Related texts', invoke(() => relatedTexts(data.text_id || uid, token))), copy); panel.append(tools); toolbar.append(panel);
  } else toolbar.append(copy);
  view.append(toolbar); responsivePanels();
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
  const next = plan && window.end !== null ? (offset + data.returned < window.end ? offset + data.returned : null) : data.next_offset;
  view.append(passages); pageControls(next, offset > (window?.start || 0) ? Math.max(window?.start || 0, offset - 30) : null, n => route('read', { ...readingArgs(selector), offset: n, ...(plan ? { plan: plan.name, day: plan.day } : {}) })); provenance(data);
  local.last = location.hash; persist(); updateResume();
  const savedVersion = local.saved.find(x => x.uid === selector && x.source_commit && x.source_commit !== data.source?.commit);
  if (savedVersion) view.prepend(el('p', 'This source revision differs from a saved bookmark. Check its reference before reusing your notes.', 'notice'));
  const ref = args.get('ref'); if (ref) document.getElementById('seg-' + ref.replace(/[^a-z0-9-]/gi, '-'))?.scrollIntoView({ block: 'center' });
}
function scopeSummary(descriptor, target) {
  const scope = descriptor.scope; target.append(el('h4', descriptor.label));
  if (descriptor.kind === 'shared_page') {
    target.append(el('p', 'Publisher reference: ' + scope.source_reference), el('p', 'One page concerns all of these texts. It is not a separately aligned full translation of the currently selected discourse.', 'notice'));
    const list = el('ul'); for (const id of scope.text_ids) { const li = el('li'); li.append(link(id + ' · canonical Pāli', route('read', { uid: id }))); list.append(li); } target.append(list);
  } else target.append(el('p', 'Declared Pāli span: ' + scope.first_ref + ' to ' + scope.last_ref), el('p', 'Only this span has a linked translation. The Pāli reader below still shows the selected canonical text, not an aligned or shortened English/Pāli pair.', 'notice'));
  target.append(el('p', scope.note, 'notice'));
  const details = el('details'); details.append(el('summary', 'Reviewed scope version')); details.append(el('p', 'Source revision: ' + scope.source_commit), el('p', 'Mapping SHA-256: ' + scope.scope_sha256)); target.append(details);
}
async function translations(data, uid, token) {
  ++studyEpoch; const target = $('study'); target.replaceChildren(el('h3', 'English sources'));
  if (!data.english_available?.length) { target.append(el('p', 'No verified English source is linked to this text. No translation has been generated or substituted.', 'notice')); return; }
  const context = { uid: data.text_id || uid, citation: data.citation || uid, choices: JSON.parse(JSON.stringify(data.english_available)), accepted: null };
  target.append(el('p', 'Choose a publisher’s source page. It can cover more than the current Pāli selection; paragraphs are not aligned. Shared and partial sources require a separate scope review before retrieval.', 'muted'));
  for (const choice of context.choices) {
    const card = el('article', undefined, 'translation-choice'); card.append(el('h4', choice.translator || choice.translation_id), el('p', [choice.source, choice.reference].filter(Boolean).join(' · '), 'muted'));
    try {
      if (typeof choice.translation_id !== 'string' || !/^(dt|ati|aj):.+/.test(choice.translation_id)) throw new Error('This source has no supported exact version identifier. No source was requested.');
      const descriptor = scopeDescriptor(choice, context.uid);
      if (descriptor) { card.append(el('p', descriptor.label + ' · not whole-unit coverage', 'notice'), button('Review ' + descriptor.label.toLowerCase(), () => reviewTranslationScope(choice, descriptor, context, token))); }
      else card.append(button('Read source · ' + [choice.translator, choice.source, choice.reference].filter(Boolean).join(' · '), () => englishPage({ uid: context.uid, translation: choice.translation_id, limit: 6000 }, token, context)));
    } catch (error) { card.append(el('p', error.message, 'notice')); }
    target.append(card);
  }
}
function reviewTranslationScope(choice, descriptor, context, token) {
  ++studyEpoch; const target = studyTarget('Review the source before retrieving it.'); target.replaceChildren(el('h3', 'Review English source scope'));
  target.append(el('p', 'Pāli selection: ' + context.citation), el('p', [choice.translator, choice.source, choice.reference].filter(Boolean).join(' · ')));
  scopeSummary(descriptor, target);
  const label = el('label', undefined, 'consent-row'), checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.id = 'scope-consent';
  label.append(checkbox, el('span', descriptor.kind === 'shared_page' ? 'I understand this is one shared source page with unverified individual alignment, not a full translation assigned to this one discourse.' : 'I understand this translates only the declared part of the Pāli unit, not the entire unit.'));
  const read = button(descriptor.kind === 'shared_page' ? 'Read reviewed shared page' : 'Read reviewed partial source', () => { if (checkbox.checked && token === epoch) englishPage({ uid: context.uid, translation: choice.translation_id, limit: 6000, ...descriptor.flags }, token, { ...context, accepted: descriptor }); }); read.disabled = true;
  checkbox.addEventListener('change', () => { read.disabled = !checkbox.checked; }); target.append(label, read);
}
async function englishPage(args, token, context) {
  const studyToken = ++studyEpoch; const target = studyTarget('Retrieving the selected English source page…');
  try {
    const data = await tool('get_translation', args); if (token !== epoch || studyToken !== studyEpoch) return;
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
async function plans(args, token) {
  const name = args.get('name');
  if (!name) {
    const catalog = planCatalog(await tool('reading_plan', {})); if (token !== epoch) return;
    heading('AT YOUR OWN PACE', 'Reading plans');
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
  const mark = button(active ? 'Day marked ✓ · undo' : 'Mark this day read', () => { const current = local.reading_progress.find(x => x.name === name && x.day === day), undo = current?.signature === signature; local.reading_progress = local.reading_progress.filter(x => !(x.name === name && x.day === day)); if (!undo) local.reading_progress.push({ name, day, signature }); const saved = persist(); mark.textContent = undo ? 'Mark this day read' : 'Day marked ✓ · undo'; mark.setAttribute('aria-pressed', String(!undo)); status.textContent = saved ? (undo ? 'Day mark removed from this browser.' : 'Day marked in this browser only.') : 'Browser storage is unavailable. Export reading progress before closing this tab.'; }); mark.setAttribute('aria-pressed', String(active)); view.append(mark);
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
  if (data.further_reading?.length) { view.append(el('h3', 'Further reading · commentary, not scripture')); for (const item of data.further_reading) { const card = el('article', undefined, 'entry'); card.append(external(item.title, item.url), el('p', item.kind, 'muted')); view.append(card); } }
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
    const request = ++generation, file = input.files?.[0]; preview.replaceChildren(); if (!file) return;
    try {
      if (file.size > MAX_PROGRESS_BYTES) throw Error('Choose a progress export no larger than 16 MiB. Nothing was restored.');
      const text = await file.text(); if (request !== generation || token !== epoch) return;
      if (new TextEncoder().encode(text).length > MAX_PROGRESS_BYTES) throw Error('Choose a progress export no larger than 16 MiB. Nothing was restored.');
      let snapshot; try { snapshot = localStorage.getItem(KEY); } catch {}
      if (snapshot !== undefined && snapshot !== storageSnapshot) throw Error('Browser data changed in another tab. Reload this page before restoring; no marks were restored.');
      const incoming = parseProgress(text, catalog), merge = mergeProgress(local.reading_progress, incoming), title = el('h3', 'Review reading progress'); title.tabIndex = -1;
      preview.replaceChildren(title, el('p', file.name), el('p', merge.added + ' new marks · ' + merge.duplicates + ' already saved · ' + merge.conflicts + ' conflicting days kept as they are.', 'notice'), el('p', 'Imported marks are self-reported. Their saved assignments and source revisions are retained, not verified against every current plan day. Open a day to check whether its mark still applies.', 'muted'));
      if (merge.added) preview.append(button('Add ' + merge.added + ' reading marks', () => {
        if (request !== generation || token !== epoch) return;
        try {
          if (snapshot !== undefined && localStorage.getItem(KEY) !== snapshot) throw Error('Browser data changed while previewing this file. Reload this page and preview again; no marks were restored.');
          const current = mergeProgress(local.reading_progress, incoming); local.reading_progress = current.progress; const durable = persist(); updateCounts();
          const done = el('h3', 'Reading marks restored'); done.tabIndex = -1; preview.replaceChildren(done, el('p', current.added + ' new marks added. Existing marks kept. Open a plan day to review its current source and assignment.', 'notice')); status.textContent = durable ? 'Reading marks restored in this browser only.' : 'Marks are restored in this tab only. Storage is unavailable; export them before closing.'; done.focus();
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
        preview.append(button('Add ' + merge.added.length + ' new bookmarks', () => { if (token !== epoch || request !== generation) return; try { const current = bookmarkMerge(local.saved, incoming); local.saved = current.saved; const durable = persist(); saved(); status.textContent = durable ? current.added.length + ' bookmarks restored in this browser. Existing notes kept.' : 'Bookmarks restored in this tab only. Storage is unavailable; export them before closing.'; } catch (error) { preview.replaceChildren(el('p', error.message, 'notice')); } }));
      } else preview.append(el('p', 'There are no new passages to add.'));
      preview.append(button('Cancel import', () => { ++generation; preview.replaceChildren(); input.focus(); })); title.focus();
    } catch (error) { if (request === generation && token === epoch) preview.replaceChildren(el('p', error.message, 'notice')); }
  }); return section;
}
function saved() {
  view.replaceChildren();
  heading('YOUR PERSONAL READING', 'Saved passages'); view.append(el('p', 'Bookmarks and notes stay in this browser only. They are not scripture, synced, or backed up. Export them to keep a copy.', 'notice'));
  view.append(button('Export bookmarks and notes', () => { exportPersonal({ format: KEY, saved: local.saved }, 'pali-library-bookmarks.json'); }));
  view.append(bookmarkImporter());
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
  for (const text of ['The bundled Pāli is retrieved from the VRI Chaṭṭha Saṅgāyana edition. Scripture is never generated or reconstructed. Abbreviations and uncertain alignments stay labelled.', 'English translations are available for a subset of texts and fetched only after you choose them. Translators’ wording is not silently exchanged. Commentary is labelled separately from canonical text.', 'VRI and several translation/dictionary sources carry non-commercial terms. This reading interface adds no permission to redistribute, translate or commercialize their work.', 'Your saved passages, notes, manual reading-plan marks and preferences are stored in this browser. The app has no accounts, advertising, analytics, cloud sync or offline web download. The server may hold your IP temporarily for rate limiting; deployment providers may keep separate infrastructure logs.']) view.append(el('p', text));
  const links = el('div', undefined, 'toolbar'); links.append(external('Source and licence register', 'https://github.com/DaniilKi/pali-canon-claude/blob/dev/pali-reliability/THIRD_PARTY.md'), external('Project and complete MCP toolset', 'https://github.com/DaniilKi/pali-canon-claude')); view.append(links);
}
async function render() {
  if (location.hash === '#content' && view.childElementCount) { $('content').focus(); return; }
  const token = ++epoch; ++studyEpoch; closeFinder(); updateResume(); view.replaceChildren(); status.textContent = 'Opening the library…';
  const [page, query = ''] = location.hash.slice(1).split('?'), args = new URLSearchParams(query);
  try { if (page === 'read') await read(args, token); else if (page === 'search') await search(args, token); else if (page === 'glossary') await dictionary(args, token); else if (page === 'daily') await daily(args, token); else if (page === 'verify') quoteChecker(token); else if (page === 'plans') await plans(args, token); else if (page === 'topics') await topics(args, token); else if (page === 'topic') await topicPage(args, token); else if (page === 'lists') await teachingLists(args, token); else if (page === 'saved') saved(); else if (page === 'about') about(); else await browse(args, token);
    if (token !== epoch) return; status.textContent = storageOK ? '' : 'Browser storage is unavailable; export your personal data before closing this tab.'; focusHeading();
  } catch (error) { if (token !== epoch) return; view.replaceChildren(); heading('UNABLE TO OPEN', 'No passage was substituted.'); view.append(el('p', error.message, 'notice'), button('Try again', render), link('Browse the library', route('browse', { node: 'canon' }), 'button')); status.textContent = 'The request failed.'; }
}
window.addEventListener('hashchange', render); render();
