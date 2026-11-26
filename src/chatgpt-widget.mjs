import { assertCanonicalLocator, REPAIRED_CANONICAL_LOCATORS } from './locator-policy.mjs';
/**
 * ChatGPT app (OpenAI Apps SDK / MCP Apps) reading widget, served by the hosted HTTP endpoint only.
 *
 * Adds one tool, `read_passage_widget`, and its UI template: Pāli (VRI) and English side by side, with the
 * citation, PTS page and translator. The tool returns the same kind of data as get_text and get_translation
 * (retrieved text only, with attribution and licence); the widget only displays it.
 *
 * Two copies of the same HTML are registered, because ChatGPT accepts both linking styles:
 *   - MCP Apps standard: `_meta.ui.resourceUri` → `text/html;profile=mcp-app` (preferred by current docs)
 *   - Apps SDK compatibility alias: `_meta["openai/outputTemplate"]` → `text/html+skybridge`
 *
 * Why not the feature registry: `tool()` in src/server.mjs cannot attach `_meta`, and the widget should not
 * appear in the stdio server (Claude Desktop, Claude Code, Codex, Gemini). src/http-server.mjs calls
 * registerChatgptWidget(server) when CHATGPT_WIDGET is on. See docs/listings/chatgpt.md.
 */
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { contentSha256 } from '../web/content-sha256.mjs';
import { createSourceNotesPolicy } from '../web/source-notes-policy.mjs';
import { SOURCE_NOTES_PROFILE } from './source-notes-profiles.mjs';
import { sourceNotesForPage } from './source-notes.mjs';
import * as canon from './canon.mjs';
import * as english from './english.mjs';
import { APADANA_BASE, APADANA_COMMIT, APADANA_LICENSE, APADANA_LICENSE_URL, APADANA_PROFILES, APADANA_TRANSLATOR } from './apadana-profiles.mjs';
import { romanizeInput, inputNote, localizeText, scriptName, SCRIPT_DESCRIPTION, SCRIPT_CHOICES } from './script.mjs';
import * as postcanonical from './postcanonical.mjs';
import { readBook } from './source-books.mjs';
import { getCommentary, commentaryReadingSource } from './commentary.mjs';
import { HostedToolError } from './hosted-tool-error.mjs';

export const WIDGET_TOOL = 'read_passage_widget';
export const WIDGET_VERSION = 'v45';
// Covers the reproduced 54–55 second cold queue without removing the finite UI deadline.
export const NAVIGATION_TIMEOUT_MS = 90000;
export const WIDGET_URI = `ui://pali-canon/reader-${WIDGET_VERSION}.html`;
export const SKYBRIDGE_URI = `ui://pali-canon/reader-${WIDGET_VERSION}.skybridge.html`;
export const MCP_APP_MIME = 'text/html;profile=mcp-app';
export const SKYBRIDGE_MIME = 'text/html+skybridge';

// Unbundled imports use the original function. Production bundles receive the
// same source literal before compiler formatting or local-name changes.
const WIDGET_HASH_SOURCE = typeof __PALI_WIDGET_HASH_SOURCE__ === 'string' ? __PALI_WIDGET_HASH_SOURCE__ : contentSha256.toString();
const SOURCE_NOTES_POLICY_SOURCE = typeof __PALI_SOURCE_NOTES_POLICY_SOURCE__ === 'string' ? __PALI_SOURCE_NOTES_POLICY_SOURCE__ : createSourceNotesPolicy.toString();

const APADANA_PINS = ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'];
const PINNED_NEW_PARATEXT_IDS = ["tha-ap44","tha-ap63","tha-ap64","tha-ap65","tha-ap66","tha-ap67","tha-ap68","tha-ap69","tha-ap70","tha-ap71","tha-ap73","tha-ap74","tha-ap75","tha-ap76","tha-ap77","tha-ap78","tha-ap79","tha-ap80","tha-ap81","tha-ap82","tha-ap83","tha-ap84","tha-ap85","tha-ap86","tha-ap87","tha-ap88","tha-ap89","tha-ap90","tha-ap91","tha-ap92","tha-ap93","tha-ap94","tha-ap95","tha-ap96","tha-ap97","tha-ap98","tha-ap99","tha-ap100","tha-ap101","tha-ap102","tha-ap103","tha-ap104","tha-ap105","tha-ap106","tha-ap107","tha-ap108","tha-ap109","tha-ap110","tha-ap111","tha-ap112","tha-ap113","tha-ap114","tha-ap115","tha-ap116","tha-ap117","tha-ap118","tha-ap119","tha-ap120","tha-ap121","tha-ap122","tha-ap123","tha-ap124","tha-ap125","tha-ap126","tha-ap127","tha-ap128","tha-ap129","tha-ap130","tha-ap131","tha-ap132","tha-ap133","tha-ap134","tha-ap135","tha-ap136","tha-ap137","tha-ap138","tha-ap139","tha-ap140","tha-ap141","tha-ap143","tha-ap144","tha-ap145","tha-ap146","tha-ap147","tha-ap148","tha-ap149","tha-ap150","tha-ap151","tha-ap152","tha-ap153","tha-ap154","tha-ap155","tha-ap156","tha-ap157","tha-ap158","tha-ap159","tha-ap162","tha-ap163","tha-ap164","tha-ap165","tha-ap166","tha-ap167","tha-ap168","tha-ap169","tha-ap170","tha-ap171","tha-ap172","tha-ap173","tha-ap174","tha-ap175","tha-ap176","tha-ap177","tha-ap178","tha-ap179","tha-ap180","tha-ap181","tha-ap182","tha-ap183","tha-ap184","tha-ap185","tha-ap186","tha-ap187","tha-ap188","tha-ap189","tha-ap190","tha-ap191","tha-ap192","tha-ap193","tha-ap194","tha-ap195","tha-ap196","tha-ap197","tha-ap198","tha-ap199","tha-ap200","tha-ap201","tha-ap202","tha-ap203","tha-ap204","tha-ap205","tha-ap206","tha-ap207","tha-ap208","tha-ap209","tha-ap210","tha-ap211","tha-ap212","tha-ap213","tha-ap214","tha-ap215","tha-ap216","tha-ap217","tha-ap218","tha-ap219","tha-ap220","tha-ap221","tha-ap222","tha-ap243","tha-ap244","tha-ap245","tha-ap246","tha-ap247","tha-ap248","tha-ap249","tha-ap250","tha-ap251","tha-ap252","tha-ap223","tha-ap224","tha-ap225","tha-ap226","tha-ap227","tha-ap228","tha-ap229","tha-ap230","tha-ap231","tha-ap232","tha-ap233","tha-ap234","tha-ap235","tha-ap237","tha-ap238","tha-ap239","tha-ap240","tha-ap241","tha-ap242","tha-ap253","tha-ap254","tha-ap255","tha-ap256","tha-ap257","tha-ap258","tha-ap259","tha-ap260","tha-ap261","tha-ap236","tha-ap263","tha-ap264","tha-ap265","tha-ap266","tha-ap267","tha-ap269","tha-ap270","tha-ap271","tha-ap272","tha-ap273","tha-ap274","tha-ap275","tha-ap276","tha-ap277","tha-ap278","tha-ap279","tha-ap280","tha-ap281","tha-ap283","tha-ap284","tha-ap285","tha-ap286","tha-ap287","tha-ap289","tha-ap290","tha-ap294","tha-ap295","tha-ap296","tha-ap297","tha-ap298","tha-ap300","tha-ap301","tha-ap303","tha-ap304","tha-ap305","tha-ap306","tha-ap307","tha-ap310","tha-ap311","tha-ap312","tha-ap314","tha-ap315","tha-ap316","tha-ap317","tha-ap318","tha-ap319","tha-ap320","tha-ap321","tha-ap323","tha-ap325","tha-ap326","tha-ap327","tha-ap328","tha-ap331","tha-ap333","tha-ap334","tha-ap335","tha-ap336","tha-ap337","tha-ap338","tha-ap339","tha-ap340","tha-ap341","tha-ap342","tha-ap343","tha-ap344","tha-ap345","tha-ap346","tha-ap347","tha-ap348","tha-ap349","tha-ap350","tha-ap351","tha-ap352"];

const WIDGET_APADANA = Object.fromEntries(Object.entries(APADANA_PROFILES).map(([id, p]) => [id, {
  translation_id: canon.translationId(p), url: p.url, fetched_url: p.raw_url, note_count: p.note_count,
  mapping_notes: p.mapping_notes,
  ...(p.publisher_preface ? { publisher_preface: p.publisher_preface } : {}),
  ...(p.collection_summary ? { collection_summary: p.collection_summary } : {}),
  ...(p.chapter_summary ? { chapter_summary: p.chapter_summary } : {}),
  ...(p.publisher_divisions ? { publisher_divisions: p.publisher_divisions } : {}),
  ...(p.editorial_gap ? { editorial_gap: p.editorial_gap } : {}),
  ...(p.note_numbers ? { note_numbers: p.note_numbers } : {}),
  ...Object.fromEntries(APADANA_PINS.map(key => [key, p[key]])),
}]));

const WIDGET_DESCRIPTION = 'Shows canonical Pāli, distinctly labelled commentary or post-canonical Pāli, or complete VRI root source files, with English where linked, with the citation, PTS page, translator, attribution and licence. Everything shown was retrieved by the tool; nothing is generated.';

// The widget loads nothing from the network: no scripts, styles, fonts or API calls. Links open through the host
// (window.openai.openExternal / ui/open-link). redirect_domains marks the only link targets the widget makes as
// trusted openExternal destinations: the English sources already on the src/http.mjs allowlist, and
// dedicated publisher/terms links (Apadāna and Creative Commons) plus SuttaCentral (all link-only). `_meta.ui.csp` has no equivalent field, so it is set only here.
export const REDIRECT_DOMAINS = [
  'https://www.dhammatalks.org', 'https://dhammatalks.org',
  'https://www.accesstoinsight.org', 'https://accesstoinsight.org',
  'https://ancient-buddhist-texts.net', 'https://apadanatranslation.com', 'https://creativecommons.org',
  'https://suttacentral.net',
];
export const RESOURCE_META = {
  ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [], frameDomains: [] } },
  'openai/widgetDescription': WIDGET_DESCRIPTION,
  'openai/widgetPrefersBorder': true,
  'openai/widgetCSP': { connect_domains: [], resource_domains: [], redirect_domains: REDIRECT_DOMAINS },
};

export const TOOL_META = {
  ui: { resourceUri: WIDGET_URI, visibility: ['model', 'app'] },
  'openai/widgetAccessible': true,
  'openai/outputTemplate': SKYBRIDGE_URI,
  'openai/toolInvocation/invoking': 'Opening the passage…',
  'openai/toolInvocation/invoked': 'Reader updated.',
};

/** Data for the widget: Pāli segments (VRI) plus one English translation, each with its attribution. */
export async function readPassage({ uid, book, commentary, segment, context = 0, source_commit: sourceCommit, anchor_sha256: anchorHash, translation, english: wantEnglish = true, offset: requestedOffset, limit = 40, english_offset: englishOffset = 0, english_prefix_sha256: englishPrefix, english_translation_revision: englishRevision, englishCharacters = 6000, script }) {
  const offset = requestedOffset ?? 0;
  if ([uid, book, commentary].filter(value => value !== undefined).length !== 1) throw new Error('Give exactly one of uid (canonical/post-canonical), book (complete root file), or commentary (aligned citation or direct commentary reference).');
  const checkSource = source => { if (sourceCommit !== undefined && sourceCommit !== (source.locator_revision || source.commit)) throw new Error('The requested VRI source version or locator revision changed. Reopen the selection from the current source; no continuation or context was substituted.'); };
  if (!Number.isInteger(context) || context < 0 || context > 20) throw new Error('Context must be an integer from 0 to 20 neighbouring segments on each side.');
  if (uid !== undefined) {
    const reference = romanizeInput(uid).text;
    if (reference.startsWith('commentary:') || /^[^/]+\/c[1-9]\d*$/.test(reference)) { commentary = uid; uid = undefined; }
  }
  const commentaryAnchor = commentary !== undefined ? romanizeInput(commentary).text.match(/^(.+)\/c([1-9]\d*)$/) : null;
  if (segment === undefined && !commentaryAnchor && (context !== 0 || anchorHash !== undefined)) throw new Error('Context and anchor_sha256 require an exact segment selection.');
  if (commentaryAnchor && (context !== 0 || anchorHash !== undefined) && (offset !== 0 || englishOffset !== 0)) throw new Error('Commentary context cannot be combined with continuation offsets.');
  if (englishRevision !== undefined && (!wantEnglish || typeof englishRevision !== 'string' || !/^[a-f0-9]{40}$/.test(englishRevision))) throw new Error('Use the exact English source revision returned by the selected Apadāna source.');
  if (englishPrefix !== undefined && (!wantEnglish || englishOffset <= 0 || typeof englishPrefix !== 'string' || !/^[a-f0-9]{64}$/.test(englishPrefix))) throw new Error('english_prefix_sha256 requires English continuation and its unchanged prefix hash.');
  if (translation !== undefined) {
    if (typeof translation !== 'string' || !translation.trim()) throw new Error('Translation selector cannot be empty or blank. Omit it for the default, or use an available translation_id or translator name.');
    translation = translation.trim();
  }
  if (script) scriptName(script);
  if (segment !== undefined) {
    if (commentary !== undefined) throw new Error('For exact commentary, give its /cN reference in commentary instead of segment.');
    if (offset !== 0 || englishOffset !== 0) throw new Error('An exact segment cannot be combined with Pāli or English continuation offsets.');
    if (typeof segment !== 'string' || segment !== segment.trim() || segment.length > 400) throw new Error('Give the exact segment reference from the selected reader.');
    const match = segment.match(/^.+\/([1-9]\d*)$/);
    const index = match ? Number(match[1]) - 1 : -1;
    if (!Number.isSafeInteger(index) || index < 0 || index > 100000) throw new Error('Give the exact segment reference from the selected reader, ending in a positive /N.');
    const exact = await readPassage({ uid, book, offset: index, limit: 1, english: false, script, ...(sourceCommit ? { source_commit: sourceCommit } : {}) });
    if (exact.pali.segments[0]?.ref !== segment) throw new Error(`Segment ${segment} does not belong to this selection. Copy its exact reference from get_text or get_post_canonical; no other segment was selected.`);
    const fingerprint = createHash('sha256').update(JSON.stringify(exact.pali.segments[0])).digest('hex');
    if (anchorHash !== undefined && anchorHash !== fingerprint) throw new Error('The exact source segment has changed. Reopen it before requesting context; no neighbouring passage was substituted.');
    const selector = book !== undefined ? { book: exact.book_id } : { uid: exact.text_id || exact.citation };
    const args = { ...selector, segment, english: false, source_commit: exact.source.locator_revision || exact.source.commit, anchor_sha256: fingerprint, ...(script ? { script: scriptName(script) } : {}) };
    const start = Math.max(0, index - context);
    const page = context ? await readPassage({ ...selector, offset: start, limit: index - start + context + 1, english: false, script, source_commit: args.source_commit }) : exact;
    const caution = `${context ? 'This is surrounding Pāli from the same source selection.' : 'This is one exact Pāli source segment.'} English translations are linked to whole texts, with no verified segment-level English alignment here. Read the whole citation without segment to inspect English availability.`;
    return { ...page, segment_ref: segment, ...(context ? { context_for: segment } : {}), notes: [...(page.notes || []), caution],
      pali: { ...page.pali, ...(context ? {} : { next_offset: null, continue_with: null }),
        read_with: { name: WIDGET_TOOL, arguments: { ...args, ...(context ? { context } : {}) } },
        context_with: !context && exact.pali.total_segments > 1 ? { name: WIDGET_TOOL, arguments: { ...args, context: 2 } } : null,
        exact_with: context ? { name: WIDGET_TOOL, arguments: args } : null },
      ...(wantEnglish || translation !== undefined ? { english_error: caution } : {}),
    };
  }
  if (commentary !== undefined) {
    const input = romanizeInput(commentary);
    checkSource(commentaryReadingSource(input.text));
    const page = getCommentary(input.text, { offset, limit });
    if (!Array.isArray(page.segments)) throw new Error('Choose a commentary passage or book reference, not the commentary catalogue. Use get_commentary with uid commentary to list book references.');
    if (!page.source) throw new Error(page.notes?.join(' ') || 'Bundled commentary data is unavailable.');
    checkSource(page.source);
    const available = page.available !== false;
    const selector = page.segment_ref || (page.book ? page.citation : page.text_id) || input.text;
    const result = {
      canonical: false, content_type: 'commentary', selection: page.book ? 'commentary_book' : 'commentary_for_reference',
      label: page.label, available, citation: page.segment_ref || page.citation || input.text,
      title: page.commentary || page.book?.title || null, collection: 'Commentary (Aṭṭhakathā)',
      ...(page.book ? { book: page.book } : {}), ...(page.text_id ? { requested_on: { id: page.text_id, citation: page.citation } } : {}),
      ...(page.approximate ? { approximate: true } : {}), ...(page.alignment ? { alignment: page.alignment } : {}),
      ...(page.alignment_note ? { alignment_note: page.alignment_note } : {}),
      ...(page.alignment_method ? { alignment_method: page.alignment_method } : {}),
      ...(page.passages ? { passages: page.passages } : {}),
      source: page.source, notes: page.notes || [],
      ...(!available ? { availability_note: 'No verified commentary alignment is available for this selection. No root text, neighbouring commentary or later work has been substituted.' } : {}),
      pali: { edition: 'Chaṭṭha Saṅgāyana Aṭṭhakathā (VRI), Pāli', attribution: page.source.attribution,
        license: page.source.terms, source: page.source, total_segments: page.total_segments || 0,
        offset, limit, returned: page.returned || 0, next_offset: page.next_offset ?? null, segments: page.segments },
      english: null, english_available: [], links: {},
      ...(wantEnglish || englishOffset > 0 || translation !== undefined ? { english_error: 'No English commentary translation is linked through this server for this selection. No English version or character-offset continuation is available.' } : {}),
    };
    const displayed = widgetDisplay(result, { input, script, commentary: selector, wantEnglish, translation, limit });
    if (!commentaryAnchor || !displayed.pali.returned) {
      if (anchorHash !== undefined) throw new Error('The exact commentary anchor is unavailable; no context was substituted.');
      return displayed;
    }
    const fingerprint = createHash('sha256').update(JSON.stringify(displayed.pali.segments[0])).digest('hex');
    if (anchorHash !== undefined && anchorHash !== fingerprint) throw new Error('The exact commentary segment has changed. Reopen it before requesting context; no neighbouring passage was substituted.');
    const anchor = displayed.pali.segments[0].ref;
    const parent = anchor.replace(/\/c[1-9]\d*$/, '');
    const index = Number(commentaryAnchor[2]) - 1;
    const args = { commentary: anchor, english: false, source_commit: displayed.source.locator_revision || displayed.source.commit, anchor_sha256: fingerprint, ...(script ? { script: scriptName(script) } : {}) };
    if (context) {
      const start = Math.max(0, index - context);
      const surrounding = await readPassage({ commentary: parent, offset: start, limit: index - start + context + 1, english: false, script, source_commit: args.source_commit });
      if (!surrounding.pali.segments.some(item => item.ref === anchor)) throw new Error('The commentary anchor is not in this source context; no neighbouring passage was substituted.');
      return { ...surrounding, context_for: anchor, ...(displayed.english_error ? { english_error: displayed.english_error } : {}),
        pali: { ...surrounding.pali, read_with: { name: WIDGET_TOOL, arguments: { ...args, context } }, context_with: null, exact_with: { name: WIDGET_TOOL, arguments: args } } };
    }
    const parentPage = getCommentary(parent, { limit: 1 });
    return { ...displayed, pali: { ...displayed.pali, read_with: { name: WIDGET_TOOL, arguments: args }, context_with: parentPage.total_segments > 1 ? { name: WIDGET_TOOL, arguments: { ...args, context: 2 } } : null, exact_with: null } };
  }
  if (book !== undefined) {
    checkSource(canon.source());
    const page = readBook({ book, offset, limit });
    const result = {
      canonical: true, selection: 'source_book', book_id: page.book_id,
      citation: 'vri-book:' + page.book_id, title: page.title, collection: 'VRI root source file',
      label: 'Complete VRI root source file, including front matter. Source-file positions are not individual sutta or rule identities.',
      source: page.source, notes: page.notes,
      ...(page.source_notes ? { source_notes: page.source_notes } : {}),
      pali: { edition: 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI), Pāli', attribution: page.source.attribution,
        license: page.source.terms, source: page.source, total_segments: page.total_segments,
        offset, limit, returned: page.returned, next_offset: page.next_offset, segments: page.segments },
      english: null, english_available: [], links: {},
      ...(wantEnglish || englishOffset > 0 || translation !== undefined ? { english_error: 'English translation is selected by an individual citation, not a complete source file. The retrieved Pāli source file is shown on its own; no English character-offset continuation is available.' } : {}),
    };
    return widgetDisplay(result, { script, book: page.book_id, wantEnglish, translation, limit });
  }
  const input = romanizeInput(uid);
  let resolved;
  try { resolved = canon.resolve(input.text); }
  catch (error) {
    if (!postcanonical.isPostCanonical(input.text)) throw error;
    checkSource(canon.source());
    const page = await postcanonical.getText(input.text, { offset, limit });
    const result = {
      canonical: false, content_type: 'post_canonical', label: page.label,
      citation: page.citation, title: page.title, book: page.book, collection: 'Post-canonical',
      ...(page.approximate ? { approximate: true } : {}), source: page.source, notes: page.notes,
      pali: { edition: 'Chaṭṭha Saṅgāyana edition (VRI), post-canonical Pāli', attribution: page.source.attribution,
        license: page.source.terms, source: page.source, total_segments: page.total_segments,
        offset, limit, returned: page.returned, next_offset: page.next_offset, segments: page.segments },
      english: null, english_available: [], links: {},
      ...(wantEnglish || englishOffset > 0 || translation !== undefined ? { english_error: 'No English translation is linked through this server for this post-canonical selection. The retrieved Pāli is shown on its own; no English version or character-offset continuation is available.' } : {}),
    };
    return widgetDisplay(result, { input, script, uid: page.citation, wantEnglish, translation, limit });
  }
  const { unit, notes } = resolved;
  checkSource(canon.readingSource(unit));
  assertCanonicalLocator(unit.id, canon.readingSource(unit).locator_revision || canon.source().commit, { expected: sourceCommit, positional: requestedOffset !== undefined || englishOffset > 0 });
  const described = canon.describe(unit, notes);
  const all = canon.segments(unit);
  const page = all.slice(offset, offset + limit);
  const vri = canon.source();
  const result = {
    text_id: unit.id, canonical: true, source: canon.readingSource(unit), ...inputNote(input),
    citation: unit.acronym,
    title: unit.title || null,
    collection: described.collection,
    pts: described.pts,
    vri_paragraphs: described.vri_paragraphs,
    ...(unit.approximate ? { approximate: true } : {}),
    pali: {
      edition: 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI), Pāli',
      attribution: vri.attribution,
      license: vri.terms,
      total_segments: all.length, offset, limit, returned: page.length,
      next_offset: offset + page.length < all.length ? offset + page.length : null,
      segments: page,
    },
    english: null,
    english_available: english.available(unit),
    notes: described.notes,
    links: { suttacentral: described.links.suttacentral },
  };
  const sourceNotes = sourceNotesForPage({ corpus: canon.load().canon, unitId: unit.id,
    source: result.source, segments: page, offset });
  if (sourceNotes) result.source_notes = sourceNotes;
  if (wantEnglish && result.english_available.length) {
    try {
      if (englishOffset > 0 && !/^(dt|ati|aj|ap):/.test(translation || '')) {
        throw new Error('To continue English, use the exact translation_id from the previous result (english.continue_with gives the full arguments). Character offsets cannot be transferred between versions; start at english_offset 0 to choose a new translation.');
      }
      const t = await english.translation(unit, translation && translation !== 'default' ? translation : undefined, { offset: englishOffset, limit: englishCharacters, prefix_sha256: englishPrefix, translation_revision: englishRevision });
      if (englishOffset > 0 && t.translation_id !== translation) {
        throw new Error('Cannot continue at this character offset: the requested translation is unavailable and the fallback is a different version. Retry the original translation later, or restart the fallback with english_offset 0.');
      }
      result.english = {
        translator: t.translator, translation_id: t.translation_id, source: t.source, url: t.url,
        reference: (canon.describe(unit).english.find((e) => e.translation_id === t.translation_id) || {}).reference,
        ...(t.translation_revision ? { translation_revision: t.translation_revision, mapping_notes: t.mapping_notes, translator_notes: t.translator_notes, publisher_paratext: t.publisher_paratext, ...(t.publisher_preface ? { publisher_preface: t.publisher_preface } : {}), ...(t.collection_summary ? { collection_summary: t.collection_summary } : {}), ...(t.chapter_summary ? { chapter_summary: t.chapter_summary } : {}), ...(t.publisher_divisions ? { publisher_divisions: t.publisher_divisions } : {}), ...(t.editorial_gap ? { editorial_gap: t.editorial_gap } : {}), license_url: t.license_url, changes: t.changes, fetched_url: t.fetched_url, ...Object.fromEntries(APADANA_PINS.map(key => [key, t[key]])) } : {}),
        fetched_from: t.fetched_from, attribution: t.attribution, license: t.license,
        text: t.text, prefix_sha256: t.prefix_sha256, offset: t.offset, total_characters: t.total_characters, next_offset: t.next_offset, truncated: t.next_offset !== null, notes: t.notes,
        read_with: { name: WIDGET_TOOL, arguments: { uid: unit.id, source_commit: result.source.locator_revision || vri.commit, translation: t.translation_id, english: true, offset, limit, english_offset: t.offset, ...(t.translation_revision ? { english_translation_revision: t.translation_revision } : {}), ...(t.offset > 0 ? { english_prefix_sha256: t.prefix_sha256 } : {}), ...(script ? { script: scriptName(script) } : {}) } },
        continue_with: t.next_offset !== null ? {
          name: WIDGET_TOOL,
          arguments: { uid: unit.id, source_commit: result.source.locator_revision || vri.commit, translation: t.translation_id, english: true, offset, limit, english_offset: t.next_offset, english_prefix_sha256: t.continue_with.arguments.prefix_sha256, ...(t.translation_revision ? { english_translation_revision: t.translation_revision } : {}), ...(script ? { script: scriptName(script) } : {}) },
        } : null,
      };
    } catch (error) {
      result.english_error = error.message;
    }
  } else if (wantEnglish) {
    result.english_error = `No English translation is linked for ${unit.acronym}. The Pāli is shown on its own; see ${described.links.suttacentral} for other translations.`;
  }
  return widgetDisplay(result, { input, script, uid: unit.id, wantEnglish, translation, limit });
}

function widgetDisplay(result, { input, script, uid, book, commentary, wantEnglish, translation, limit }) {
  const { segments, ...display } = localizeText({ title: result.title, segments: result.pali.segments }, script, input);
  const version = result.english?.translation_id || translation;
  const args = { ...(commentary ? { commentary } : book ? { book } : { uid }), source_commit: result.source.locator_revision || result.source.commit, english: wantEnglish, offset: result.pali.next_offset, limit,
    ...(version ? { translation: version } : {}), ...(script ? { script: scriptName(script) } : {}) };
  return { ...result, ...display, pali: { ...result.pali, segments,
    read_with: { name: WIDGET_TOOL, arguments: { ...args, english: false, offset: result.pali.offset } },
    continue_with: result.pali.next_offset === null ? null : { name: WIDGET_TOOL, arguments: args } } };
}

/** Register the hosted widget on the HTTP frontend or its internal worker; stdio does not advertise it. */
export function registerChatgptWidget(server, { executeTool } = {}) {
  for (const [name, uri, mimeType] of [['reader-widget', WIDGET_URI, MCP_APP_MIME], ['reader-widget-skybridge', SKYBRIDGE_URI, SKYBRIDGE_MIME]]) {
    server.registerResource(name, uri, { mimeType, description: WIDGET_DESCRIPTION, _meta: RESOURCE_META },
      async (u) => ({ contents: [{ uri: u.href, mimeType, text: WIDGET_HTML, _meta: RESOURCE_META }] }));
  }
  server.registerTool(WIDGET_TOOL, {
    title: 'Read a passage (Pāli and English)',
    description: 'Show an individual text in a reading view: Pāli (VRI) and one English translation, with citation, PTS page, translator, attribution and licence. Use when the user wants to read a sutta or passage. Accepts canonical or post-canonical citations (e.g. Vism 1.1), including native-script input. Post-canonical texts stay explicitly labelled not the canon and have no linked English here. Set script for supported native-script Pāli display; source references stay Roman. For complete root files including front matter, give book instead of uid; file refs are not individual sutta/rule citations and have no English here. Unambiguous commentary: book refs and /cN commentary anchors are also accepted in uid. For aligned commentary, give commentary instead of uid/book: an aligned root citation or direct commentary book/segment ref. Missing alignments remain explicitly unavailable; no text is substituted. Follow pali.continue_with for selection-preserving continuation. The Pāli works offline; English is fetched live. For English continuation use the exact english.continue_with arguments from the previous result.',
    inputSchema: {
      uid: z.string().min(1).max(300).optional().describe('Canonical or post-canonical citation (Vism 1.1); choose exactly one of uid, book or commentary. Other citations: MN 10, SN 56:11, AN 3.65, Dhp 183, Snp 1.8, a PTS page such as M i 55, or a suttacentral.net / accesstoinsight.org / dhammatalks.org link.'),
      commentary: z.string().trim().min(1).max(300).optional().describe('Commentary selection instead of uid/book: MN 10 for aligned commentary, mn10/c66 for its exact segment, or commentary:<VRI-file>[/cN] for a direct source book/segment. Commentary stays distinct from canon and later works. Use get_commentary uid commentary for the catalogue.'),
      book: z.string().trim().min(1).max(100).optional().describe('Complete VRI root source file ID from browse_canon node books, including front matter. Give book instead of uid/commentary. File refs do not identify individual suttas or rules; no English is selected here.'),
      segment: z.string().trim().min(1).max(400).optional().describe('One exact segment ref from the selected get_text/get_post_canonical reader, e.g. mn10/66, Vism 1.1/2 or vri-book:vin02m1/7. Keep uid or book as its source selection. No Pāli/English continuation offsets or segment-aligned English. For commentary use its exact /cN reference in commentary instead.'),
      context: z.number().int().min(0).max(20).default(0).describe('With segment, include this many neighbouring Pāli segments on each side within the same selection. Follow pali.context_with for a source/anchor-pinned request, or pali.exact_with to return.'),
      source_commit: z.string().regex(/^[a-f0-9]{40}(?:-[a-zA-Z0-9._-]{1,40})?$/).optional().describe('Expected source locator pin from a returned cursor: VRI commit plus any reviewed index revision. A changed source or mapping refuses before reading.'),
      anchor_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional().describe('Expected exact source-segment fingerprint from pali.context_with/exact_with. Preserve the command unchanged; a changed segment fails rather than substituting context.'),
      script: z.string().trim().min(1).max(30).optional().describe(SCRIPT_DESCRIPTION),
      translation: z.string().trim().min(1).max(200).optional().describe('At the start: "default", a translation_id from get_metadata, or an unambiguous translator name; omit for default. For non-zero english_offset, use the exact translation_id returned by the previous result.'),
      english: z.boolean().default(true).describe('Fetch an English translation (live). false shows the Pāli only.'),
      offset: z.number().int().min(0).max(100000).optional().describe('Pāli segment offset for continuation. Every explicit position in a registered repaired canonical unit, including 0, requires the returned current source_commit locator pin.'),
      limit: z.number().int().min(1).max(80).default(40).describe('Pāli segments to show.'),
      english_translation_revision: z.string().regex(/^[a-f0-9]{40}$/).optional().describe('Exact source revision for a pinned Apadāna selection or continuation.'),
      english_prefix_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional().describe('Unchanged prefix hash from english.continue_with. Rejects continuation when preceding upstream text changed. Requires English and a positive english_offset.'),
      english_offset: z.number().int().min(0).max(10000000).default(0).describe('English character offset for continuation. Use english.continue_with.arguments from the previous result: non-zero offsets require its exact translation_id, so a source recovery/outage cannot transfer offsets to another version. Shows up to 6,000 characters per call.'),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    _meta: TOOL_META,
  }, async (args) => {
    try {
      if (executeTool) return await executeTool(WIDGET_TOOL, args);
      const result = await readPassage(args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
    } catch (error) {
      if (error instanceof HostedToolError) {
        const result = error.response();
        return { isError: true, content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
      }
      const result = {
        error: error.message || 'Request failed.',
        recovery: 'Check the citation with resolve_reference or browse_canon. Never invent missing text.',
      };
      return { isError: true, content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
    }
  });
}

// Self-contained page: no external resources. Data is rendered with textContent only (never as HTML).
export const WIDGET_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pāli Canon reader</title>
<style>
  :root { --bg:#fffdf8; --fg:#1f1d1a; --muted:#6b645a; --line:#e6dfd2; --accent:#8a5a14; --chip:#f3ecdf; }
  :root[data-theme="dark"] { --bg:#1d1b18; --fg:#ece6dc; --muted:#a59d90; --line:#3a352e; --accent:#e0b66e; --chip:#2a2620; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.55 Georgia, "Times New Roman", serif; }
  header { padding:14px 16px 10px; border-bottom:1px solid var(--line); }
  h1 { margin:0; font-size:18px; }
  .meta { margin-top:6px; display:flex; flex-wrap:wrap; gap:6px; font:12px/1.4 system-ui, sans-serif; }
  .chip { background:var(--chip); border-radius:999px; padding:2px 9px; color:var(--muted); }
  .cols { display:grid; grid-template-columns:1fr 1fr; }
  .col { padding:12px 16px; min-width:0; }
  .col + .col { border-left:1px solid var(--line); }
  .col h2 { margin:0 0 8px; font:600 12px/1.4 system-ui, sans-serif; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); }
  .seg { margin:0 0 10px; white-space:pre-wrap; overflow-wrap:anywhere; }
  .seg.heading { font-weight:bold; }
  .seg.verse { padding-left:12px; border-left:2px solid var(--line); }
  .pts { font:11px/1 system-ui, sans-serif; color:var(--accent); margin-right:6px; }
  .vri { font:11px/1 system-ui, sans-serif; color:var(--muted); margin-right:6px; }
  .en { white-space:pre-wrap; }
  .note, footer { font:12px/1.5 system-ui, sans-serif; color:var(--muted); }
  .note { margin:0 0 8px; }
  footer { padding:10px 16px 14px; border-top:1px solid var(--line); }
  footer p { margin:4px 0; }
  a { color:var(--accent); }
  nav { padding:0 16px 12px; display:flex; flex-wrap:wrap; gap:8px; }
  nav button { font:inherit; color:var(--accent); background:var(--bg); border:1px solid var(--line); border-radius:6px; padding:8px 12px; cursor:pointer; max-width:100%; box-sizing:border-box; }
  nav button:disabled { opacity:.6; cursor:wait; }
  nav button:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
  .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; border:0; }
  .empty { color:var(--muted); font-style:italic; }
  .source-notes-status, .original-edition-note { margin:10px 0; padding:10px; border:1px solid var(--line); border-radius:6px; overflow-wrap:anywhere; }
  .source-notes-status p, .original-edition-note p { display:block; margin:6px 0; }
  .source-notes-status, .edition-note-provenance { font:12px/1.5 system-ui, sans-serif; color:var(--muted); }
  .original-edition-note h3 { margin:0 0 6px; font:600 13px/1.4 system-ui, sans-serif; }
  .edition-note-text { white-space:pre-wrap; }
  .source-notes-status button { font:inherit; color:var(--accent); background:var(--bg); border:1px solid var(--line); border-radius:6px; padding:8px; cursor:pointer; }
  .source-notes-status button:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
  @media (max-width: 640px) { .cols { grid-template-columns:1fr; } .col + .col { border-left:0; border-top:1px solid var(--line); } }
</style>
</head>
<body>
<header><h1 id="title" tabindex="-1">Loading the passage…</h1><div class="meta" id="meta"></div></header>
<p id="status" class="sr-only" role="status" aria-live="polite" aria-atomic="true">Waiting for a passage.</p>
<main class="cols">
  <section class="col" aria-labelledby="pali-h"><h2 id="pali-h">Pāli</h2><div id="pali"></div></section>
  <section class="col" aria-labelledby="en-h"><h2 id="en-h">English</h2><div id="english"></div></section>
</main>
<nav id="navigation" aria-label="Passage navigation"></nav>
<p id="context-status" class="note" role="note" aria-live="polite" aria-atomic="true" style="padding:0 16px">Reading-context sharing has not been established.</p>
<p id="link-status" class="note" role="status" aria-live="polite" aria-atomic="true" style="padding:0 16px"></p>
<footer id="footer"></footer>
<script>
(function () {
  var rendered = null, renderedInput = null, renderedSnapshot = null, renderedNoteFrame = null, renderedHeaderFrame = null;
  var closed = false;
  var generation = 0, requestId = 2, pending = null, serverTools = false, awaitingSelection = false, lastInput, lastOutput, lastOutputSnapshot, lastMetadata, lastResultSnapshot;
  var modelCapabilities, modelChannel, modelModality, modelDesired, modelFlight, modelAccepted, modelFailure, modelRevision = 0, modelBlocked = false;
  var linkFlight = null, hostLinks = false;
  var sizeChannel, sizeObserver, sizeFrame, sizeHeight, sizeBlocked = false;
  var sourceNotesProfile = ${JSON.stringify(SOURCE_NOTES_PROFILE)};
  var sourceNotesPolicy = (${SOURCE_NOTES_POLICY_SOURCE})(${WIDGET_HASH_SOURCE}, sourceNotesProfile);
  var sourceNoteUi = [], sourceNoteSignature = null, sourceNoteAnchorNode = null, sourceNoteRootBinding = null, sourceNoteRootRelevant = false, sourceNoteJump = null;
  var sourceNoteWarning = 'The separately indexed original edition note could not be verified. The loaded Pāli remains available; this apparatus is unavailable.';
  function stopSizing() {
    if (sizeObserver) sizeObserver.disconnect();
    sizeObserver = null;
    if (sizeFrame != null && window.cancelAnimationFrame) window.cancelAnimationFrame(sizeFrame);
    sizeFrame = null;
  }
  function queueSize() {
    if (closed || sizeBlocked || !sizeChannel || sizeFrame != null || !window.requestAnimationFrame) return;
    sizeFrame = window.requestAnimationFrame(function () {
      sizeFrame = null;
      if (closed || sizeBlocked) return;
      // Measure intrinsic body content, not viewport/scrollHeight: the latter prevents shrinkage
      // when the host resizes the frame to our previous height. Report height only; width is host-owned.
      var height = Math.ceil(document.body.getBoundingClientRect().height);
      if (!Number.isFinite(height) || height <= 0 || height === sizeHeight) return;
      sizeHeight = height;
      try {
        if (sizeChannel === 'mcp') post({ jsonrpc: '2.0', method: 'ui/notifications/size-changed', params: { height: height } });
        else {
          var result = window.openai.notifyIntrinsicHeight(height);
          if (result && typeof result.then === 'function') Promise.resolve(result).catch(function () { sizeBlocked = true; stopSizing(); });
        }
      } catch (error) { sizeBlocked = true; stopSizing(); }
    });
  }
  function startSizing(channel) {
    if (closed || sizeBlocked || sizeChannel) return;
    sizeChannel = channel;
    if (window.ResizeObserver) {
      try { sizeObserver = new window.ResizeObserver(queueSize); sizeObserver.observe(document.body); }
      catch (error) { stopSizing(); }
    }
    queueSize();
  }
  window.addEventListener('resize', queueSize);
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function modelStatus(message) { if (!closed) { document.getElementById('context-status').textContent = message; queueSize(); } }
  function modelAdvice() { return modelDesired && modelDesired.snapshot.state === 'displayed' ? ' Tell the assistant the displayed citation.' : ' No current reading has been confirmed for the assistant.'; }
  function vacantContext(state) { return { schema: 'pali-reader-selection-v1', widget_version: '${WIDGET_VERSION}', state: state,
    quotation: state === 'loading' ? 'A new reading is pending; do not assume an earlier page is the requested selection.' : 'No retrieved passage is displayed. Reopen a source before quoting.' }; }
  function readingContext(d) {
    if (!d || !d.pali) return vacantContext(d && d.cancelled ? 'cancelled' : 'error');
    var source = d.source || {}, book = d.book || {}, p = d.pali, e = d.english;
    return { schema: 'pali-reader-selection-v1', widget_version: '${WIDGET_VERSION}', state: 'displayed',
      kind: d.selection === 'source_book' ? 'source_book' : d.content_type || (d.canonical === true ? 'canonical' : 'unknown'),
      canonical: d.canonical, selection: d.selection, citation: d.citation, text_id: d.text_id, book_id: d.book_id,
      book: { id: book.id, uid: book.uid, file: book.file, title: book.title }, requested_on: d.requested_on,
      segment_ref: d.segment_ref, context_for: d.context_for, script: d.script || 'roman', available: d.available,
      approximate: !!d.approximate, alignment: d.alignment, alignment_note: d.alignment_note, alignment_method: d.alignment_method,
      availability_note: d.availability_note, notes: d.notes || [],
      source: { name: source.name, repository: source.repository, commit: source.commit, ...(source.locator_revision ? { locator_revision: source.locator_revision } : {}), files: source.files, attribution: source.attribution, terms: source.terms },
      pali: { offset: p.offset, returned: p.returned, total_segments: p.total_segments, refs: (p.segments || []).map(function (s) { return s.ref; }), read_with: p.read_with },
      english: e ? { state: 'displayed', translation_id: e.translation_id, translator: e.translator, source: e.source, url: e.url,
        translation_revision: e.translation_revision, fetched_from: e.fetched_from, prefix_sha256: e.prefix_sha256, offset: e.offset, next_offset: e.next_offset, total_characters: e.total_characters,
        attribution: e.attribution, license: e.license, notes: e.notes || [], read_with: e.read_with }
        : { state: 'not_displayed', note: d.english_error || 'No English translation requested.', linked_versions: (d.english_available || []).map(function (version) { return version.translation_id; }) },
      quotation: 'Reading metadata only; no passage text is included. Retrieve read_with and verify its source, references and cautions before quoting. No scholarly or native-reader approval is implied.' };
  }
  function wantModelContext(snapshot) {
    if (closed) return;
    var key = JSON.stringify(snapshot);
    if (!modelDesired || modelDesired.key !== key) modelDesired = { key: key, snapshot: Object.assign(JSON.parse(key), { revision: ++modelRevision }) };
    pumpModelContext();
  }
  function pumpModelContext() {
    if (closed || !modelDesired) return;
    if (modelBlocked) { modelStatus(modelFailure + modelAdvice()); return; }
    if (!modelChannel) {
      function advertised(value) { return value && typeof value === 'object' && !Array.isArray(value); }
      if (modelCapabilities && (advertised(modelCapabilities.structuredContent) || advertised(modelCapabilities.text))) {
        modelChannel = 'mcp'; modelModality = advertised(modelCapabilities.structuredContent) ? 'structured' : 'text';
      } else if (window.openai && typeof window.openai.setWidgetState === 'function') modelChannel = 'widget-state';
      else { modelStatus('This host has not exposed reading-context sharing.' + modelAdvice()); return; }
    }
    if (modelFlight) {
      modelStatus(modelFlight.timedOut ? 'The host has not confirmed the reading context.' + modelAdvice() : 'Updating the reading state available to the host…');
      return;
    }
    if (modelAccepted === modelDesired.key) return;
    var desired = modelDesired, payload = { pali_reader: desired.snapshot };
    if (modelChannel === 'widget-state') {
      modelFlight = { key: desired.key };
      try {
        var saved = window.openai.setWidgetState({ modelContent: JSON.stringify(payload) });
        modelFlight = null;
        if (saved && typeof saved.then === 'function') {
          Promise.resolve(saved).then(function () {}, function () {});
          if (closed) return;
          failModelContext('This host could not confirm reading-context storage. Sharing is unconfirmed.'); return;
        }
        if (closed) return;
        modelAccepted = desired.key;
        if (modelDesired.key === desired.key) modelStatus('The updated reading state was passed to the host. Model delivery is not verified.');
        else Promise.resolve().then(pumpModelContext);
      } catch (error) { modelFlight = null; if (!closed) failModelContext('The host could not store the reading context.'); }
      return;
    }
    var flight = { id: requestId++, key: desired.key }; modelFlight = flight;
    modelStatus('Updating the reading state available to the host…');
    flight.timer = setTimeout(function () {
      if (closed || modelFlight !== flight) return;
      flight.timedOut = true; modelStatus('The host has not confirmed the reading context.' + modelAdvice());
    }, 30000);
    post({ jsonrpc: '2.0', id: flight.id, method: 'ui/update-model-context', params: modelModality === 'structured' ? { structuredContent: payload } : { content: [{ type: 'text', text: JSON.stringify(payload) }] } });
  }
  function failModelContext(message) { modelBlocked = true; modelFailure = message; modelStatus(message + modelAdvice()); }
  function modelReply(message) {
    if (closed) return;
    var flight = modelFlight;
    if (!flight || message.id !== flight.id) return;
    clearTimeout(flight.timer); modelFlight = null;
    if (message.error) { failModelContext('The host rejected reading-context sharing.'); return; }
    if (!message.result || typeof message.result !== 'object' || Array.isArray(message.result)) { failModelContext('The host did not confirm reading-context sharing.'); return; }
    modelAccepted = flight.key;
    if (modelDesired.key === flight.key) modelStatus('The host accepted the current reading state. Model delivery is not verified.');
    else pumpModelContext();
  }
  function canNavigate() { return !closed && (!!(window.openai && typeof window.openai.callTool === 'function') || serverTools); }
  function abandon() {
    resetLink();
    if (pending) { clearTimeout(pending.timer); pending = null; }
    document.getElementById('navigation').setAttribute('aria-busy', 'false');
  }
  function navigation() {
    queueSize();
    if (sourceNoteJump) sourceNoteJump.disabled = !!pending || awaitingSelection || !canNavigate();
    var nav = document.getElementById('navigation'); clear(nav);
    if (closed) return;
    if (awaitingSelection) { nav.appendChild(el('p', 'note', 'Opening the requested passage…')); return; }
    if (!canNavigate() || !rendered || !rendered.pali) return;
    if (pending) {
      nav.appendChild(el('p', 'note', 'Loading the requested passage… Waiting up to 90 seconds.'));
      var active = pending, stop = el('button', '', 'Stop waiting'); stop.type = 'button';
      stop.addEventListener('click', function () {
        if (pending !== active || closed) return;
        render({ cancelled: true, error: 'Stopped waiting for this passage. Ask to open it again when you are ready.' });
        var title = document.getElementById('title'); if (typeof title.focus === 'function') title.focus();
      });
      nav.appendChild(stop);
    }
    var d = rendered;
    [[d.pali.context_with, 'Surrounding Pāli'], [d.pali.exact_with, 'Return to exact segment'], [d.pali.continue_with, 'Continue Pāli'], [d.english && d.english.continue_with, 'Continue English']].forEach(function (entry) {
      var command = entry[0];
      if (!command || command.name !== '${WIDGET_TOOL}' || !command.arguments || typeof command.arguments !== 'object' || Array.isArray(command.arguments)) return;
      var button = el('button', '', entry[1]); button.type = 'button'; button.disabled = !!pending;
      button.addEventListener('click', function () { if (rendered === d) navigate(command); }); nav.appendChild(button);
    });
  }
  function finish(call, result, error) {
    if (closed || pending !== call || call.generation !== generation) return;
    abandon();
    var data = result && result.structuredContent, args = call.command.arguments;
    var readable = data && data.pali && Array.isArray(data.pali.segments) &&
      data.pali.segments.every(function (segment) { return segment && typeof segment.text === 'string'; }) &&
      Number.isInteger(data.pali.returned) && data.pali.returned === data.pali.segments.length &&
      Number.isInteger(data.pali.total_segments) && data.pali.total_segments >= data.pali.returned &&
      Number.isInteger(data.pali.offset) && data.pali.offset >= 0;
    if (!error && result && !result.isError && readable) {
      if ((args.source_commit && (!data.source || (data.source.locator_revision || data.source.commit) !== args.source_commit)) ||
          (args.script && (data.script || 'roman') !== args.script) ||
          (args.book && data.book_id !== args.book) ||
          (args.uid && data.text_id !== args.uid && data.citation !== args.uid) ||
          (args.commentary && (data.content_type !== 'commentary' || (data.context_for !== args.commentary && data.citation !== args.commentary && !(data.requested_on && data.requested_on.id === args.commentary)))) ||
          (args.context > 0 && data.context_for !== (args.segment || args.commentary)) ||
          (args.english_translation_revision && data.english && args.english_translation_revision !== data.english.translation_revision) ||
          (args.english_offset > 0 && data.english && (data.english.translation_id !== args.translation || (args.english_prefix_sha256 && data.english.prefix_sha256 !== args.english_prefix_sha256)))) {
        error = new Error('The host returned a different source, selection, script or translation version. Ask to reopen the selection.');
      }
    }
    if (error) render({ error: error.message || String(error) });
    else if (!result || (!result.isError && !readable)) render({ error: 'The host did not return a readable passage. Ask to reopen the selection.' });
    else toolResult(result);
    if (closed) return;
    navigation();
    var title = document.getElementById('title'); if (typeof title.focus === 'function') title.focus();
  }
  function navigate(command) {
    if (pending || awaitingSelection || !canNavigate()) return;
    resetLink();
    var call = { id: requestId++, generation: generation, command: command }; pending = call;
    document.getElementById('navigation').setAttribute('aria-busy', 'true'); navigation();
    document.getElementById('status').textContent = 'Loading the requested passage…';
    wantModelContext(vacantContext('loading'));
    if (closed || pending !== call) return;
    call.timer = setTimeout(function () { finish(call, null, new Error('The host did not respond within 90 seconds. Ask to reopen the selection.')); }, ${NAVIGATION_TIMEOUT_MS});
    try {
      if (serverTools) post({ jsonrpc: '2.0', id: call.id, method: 'tools/call', params: command });
      else if (window.openai && typeof window.openai.callTool === 'function') {
        Promise.resolve(window.openai.callTool(command.name, command.arguments)).then(function (result) { finish(call, result); }, function (error) { finish(call, null, error); });
      }
    } catch (error) { finish(call, null, error); }
  }
  function post(msg) { try { window.parent.postMessage(msg, '*'); } catch (e) {} }
  function linkStatus(text) {
    var node = document.getElementById('link-status');
    if (node) node.textContent = text;
    queueSize();
  }
  function resetLink() {
    if (linkFlight) clearTimeout(linkFlight.timer);
    linkFlight = null; linkStatus('');
  }
  function finishLink(call, failed, accepted) {
    if (closed || linkFlight !== call) return;
    clearTimeout(call.timer); linkFlight = null;
    linkStatus(failed === 'unconfirmed' ? 'The host did not confirm the link request. Opening the destination is not verified. Use the link address to open it yourself.' : failed ? 'The host could not open this link. Use the link address to open it yourself.' :
      accepted ? 'The host accepted the link request. Opening the destination is not verified.' : 'Link request sent to the host. Opening the destination is not verified.');
  }
  function openLink(url) {
    if (closed || linkFlight) return;
    var legacy = window.openai && typeof window.openai.openExternal === 'function';
    if (!legacy && !hostLinks) { linkStatus('Host link opening is unavailable. Use the link address to open it yourself.'); return; }
    var call = { id: requestId++ };
    linkFlight = call; linkStatus('Asking the host to open the link…');
    call.timer = setTimeout(function () { finishLink(call, 'unconfirmed'); }, 30000);
    try {
      if (legacy) {
        var result = window.openai.openExternal({ href: url });
        if (result && typeof result.then === 'function') Promise.resolve(result).then(function (reply) { finishLink(call, !!(reply && reply.isError)); }, function () { finishLink(call, true); });
        else finishLink(call, !!(result && result.isError));
      } else post({ jsonrpc: '2.0', id: call.id, method: 'ui/open-link', params: { url: url } });
    } catch (error) { finishLink(call, true); }
  }
  function link(url, text) {
    if (typeof url !== 'string' || !/^https:\\/\\//.test(url)) return el('span', '', text);
    var a = el('a', '', text); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.addEventListener('click', function (ev) { ev.preventDefault(); openLink(url); });
    return a;
  }
  function setTheme(theme) { if (theme === 'dark' || theme === 'light') document.documentElement.setAttribute('data-theme', theme); }
  function characterPosition(at, total) { return 'character ' + at + (typeof total === 'number' && Number.isFinite(total) ? ' of ' + total : ''); }
  function checkedChapterSummary(e, p) {
    if (!p.chapter_summary) return !Object.prototype.hasOwnProperty.call(e, 'chapter_summary');
    var s = e.chapter_summary, expected = p.chapter_summary;
    return s && typeof s === 'object' && !Array.isArray(s) && Object.keys(s).sort().join(',') === Object.keys(expected).concat(['text', 'translator_notes']).sort().join(',') &&
      Object.keys(expected).every(function (key) { return JSON.stringify(s[key]) === JSON.stringify(expected[key]); }) &&
      typeof s.text === 'string' && s.text.trim() && s.text.length <= 50000 && Array.isArray(s.translator_notes) && s.translator_notes.length === expected.note_numbers.length &&
      s.translator_notes.every(function (n, i) { return n && Object.keys(n).sort().join(',') === 'number,text' && n.number === expected.note_numbers[i] && typeof n.text === 'string' && n.text.trim() && n.text.length <= 50000; }) &&
      (['tha-ap82','tha-ap92','tha-ap102','tha-ap112','tha-ap122','tha-ap132','tha-ap152','tha-ap162','tha-ap172','tha-ap182','tha-ap192','tha-ap202','tha-ap212','tha-ap222','tha-ap252','tha-ap232','tha-ap242','tha-ap272','tha-ap312','tha-ap342','tha-ap352'].indexOf(expected.parent_id) === -1 || checkedPinnedContent(s, expected));
  }
  function checkedPublisherPreface(e, p, uid) {
    if (!p.publisher_preface) return uid !== 'tha-ap333' && !Object.prototype.hasOwnProperty.call(e, 'publisher_preface');
    var label = uid === 'thi-ap31' ? 'Fourth Therī chapter preface'
      : uid === 'tha-ap333' ? 'Thirty-fourth Therā chapter preface' : null;
    var s = e.publisher_preface, expected = p.publisher_preface;
    return Boolean(label) && expected.kind === 'publisher_preface' && expected.parent_id === uid && expected.label === label &&
      Object.keys(expected).sort().join(',') === 'body_sha256,kind,label,note_numbers,notes_sha256,parent_id' &&
      expected.body_sha256 === p.paratext_sha256 && JSON.stringify(expected.note_numbers) === '[1]' &&
      s && typeof s === 'object' && !Array.isArray(s) && Object.keys(s).sort().join(',') === Object.keys(expected).concat(['translator_notes']).sort().join(',') &&
      Object.keys(expected).every(function (key) { return JSON.stringify(s[key]) === JSON.stringify(expected[key]); }) &&
      Array.isArray(s.translator_notes) && s.translator_notes.length === 1 && s.translator_notes.every(function (n) {
        return n && typeof n === 'object' && !Array.isArray(n) && Object.keys(n).sort().join(',') === 'number,text' && n.number === 1 && typeof n.text === 'string' && n.text.trim() && n.text.length <= 50000;
      }) && (uid !== 'tha-ap333' || typeof e.publisher_paratext === 'string' && e.publisher_paratext.length <= 50000 &&
        checkedContentHash(e.publisher_paratext, expected.body_sha256) && checkedContentHash(JSON.stringify(s.translator_notes), expected.notes_sha256));
  }
  function checkedCollectionSummary(e, p, uid) {
    if (!p.collection_summary) return !Object.prototype.hasOwnProperty.call(e, 'collection_summary');
    var expected = p.collection_summary;
    return expected.kind === 'canonical_collection_summary' && expected.parent_id === uid &&
      (uid === 'thi-ap40' ? JSON.stringify(expected.note_numbers) === '[11,12]' : uid === 'tha-ap102' ?
        JSON.stringify(expected.note_numbers) === '[4]' && expected.label === 'Therā Apadāna first-hundred chapter summary and colophons' &&
        expected.root_start === 5145 && expected.root_end === 5152 && expected.first_ref === 'tha-ap102/12' && expected.last_ref === 'tha-ap102/15' : uid === 'tha-ap202' &&
        JSON.stringify(expected.note_numbers) === '[6,7]' && expected.label === 'Therā Apadāna second-hundred chapter summary and colophons' &&
        expected.root_start === 7417 && expected.root_end === 7424 && expected.first_ref === 'tha-ap202/11' && expected.last_ref === 'tha-ap202/15') &&
      checkedChapterSummary({chapter_summary: e.collection_summary}, {chapter_summary: expected});
  }
  function checkedPublisherDivisions(e, p, uid) {
    if (!p.publisher_divisions) return !Object.prototype.hasOwnProperty.call(e, 'publisher_divisions');
    return Array.isArray(e.publisher_divisions) && e.publisher_divisions.length === p.publisher_divisions.length && e.publisher_divisions.every(function (s, i) {
      var expected = p.publisher_divisions[i];
      return s && typeof s === 'object' && !Array.isArray(s) && Object.keys(s).sort().join(',') === Object.keys(expected).concat(['text', 'translator_notes']).sort().join(',') &&
        Object.keys(expected).every(function (key) { return JSON.stringify(s[key]) === JSON.stringify(expected[key]); }) &&
        typeof s.text === 'string' && s.text.trim() && s.text.length <= 50000 && Array.isArray(s.translator_notes) && s.translator_notes.length === expected.note_numbers.length &&
        s.translator_notes.every(function (n, j) { return n && Object.keys(n).sort().join(',') === 'number,text' && n.number === expected.note_numbers[j] && typeof n.text === 'string' && n.text.trim() && n.text.length <= 50000; }) &&
        (uid !== 'tha-ap76' || checkedPinnedContent(s, expected));
    });
  }
  function checkedContentHash(text, expected) {
    try {
      var hash = ${WIDGET_HASH_SOURCE};
      return hash(text) === expected;
    } catch (error) { return false; }
  }
  function checkedPinnedContent(value, expected) {
    return checkedContentHash(value.text, expected.body_sha256) && checkedContentHash(JSON.stringify(value.translator_notes), expected.notes_sha256);
  }
  function checkedEditorialGap(e, p, uid) {
    if (!p.editorial_gap) return !Object.prototype.hasOwnProperty.call(e, 'editorial_gap');
    var s = e.editorial_gap, expected = p.editorial_gap;
    if (uid !== 'tha-ap44' || p.raw_sha256 !== '71d18cea42a26ac2fc490f43c5265f83d517d8794f2df5d652d0fadbf17a4533' ||
        Object.keys(expected).sort().join(',') !== 'after_local_label,after_publisher_label,before_local_label,before_publisher_label,body_sha256,kind,note_numbers,notes_sha256,parent_id,placement' ||
        expected.kind !== 'publisher_editorial_gap' || expected.parent_id !== uid || expected.placement !== 'before_local_label' ||
        expected.after_local_label !== '25' || expected.after_publisher_label !== '1164' || expected.before_local_label !== '26' || expected.before_publisher_label !== '1165' ||
        JSON.stringify(expected.note_numbers) !== '[12]' || !s || typeof s !== 'object' || Array.isArray(s) ||
        Object.keys(s).sort().join(',') !== Object.keys(expected).concat(['text', 'translator_notes']).sort().join(',') ||
        !Object.keys(expected).every(function (key) { return JSON.stringify(s[key]) === JSON.stringify(expected[key]); }) ||
        typeof s.text !== 'string' || !s.text.trim() || s.text.length > 50000 || !Array.isArray(s.translator_notes) || s.translator_notes.length !== 1 ||
        !s.translator_notes.every(function (n) { return n && typeof n === 'object' && !Array.isArray(n) && Object.keys(n).sort().join(',') === 'number,text' && n.number === 12 && typeof n.text === 'string' && n.text.trim() && n.text.length <= 50000; })) return false;
    return checkedPinnedContent(s, expected);
  }
  function checkedApadana(d) {
    var e = d.english, checked = e && (e.source === 'apadana' || Object.prototype.hasOwnProperty.call(e, 'chapter_summary') || Object.prototype.hasOwnProperty.call(e, 'publisher_divisions') || Object.prototype.hasOwnProperty.call(e, 'publisher_preface') || Object.prototype.hasOwnProperty.call(e, 'collection_summary') || Object.prototype.hasOwnProperty.call(e, 'editorial_gap') || typeof e.translation_revision !== 'undefined' || typeof e.translation_id === 'string' && e.translation_id.toLowerCase().indexOf('ap:') === 0 || typeof e.url === 'string' && e.url.indexOf('${APADANA_BASE}/') === 0);
    if (!checked) return d;
    var profiles = ${JSON.stringify(WIDGET_APADANA)}, p = Object.prototype.hasOwnProperty.call(profiles, d.text_id) && profiles[d.text_id];
    if (p && e.source === 'apadana' && e.translation_id === p.translation_id && e.url === p.url && e.fetched_url === p.fetched_url &&
        e.translation_revision === '${APADANA_COMMIT}' && e.license === '${APADANA_LICENSE}' && e.license_url === '${APADANA_LICENSE_URL}' &&
        e.translator === '${APADANA_TRANSLATOR}' && typeof e.attribution === 'string' && e.attribution.trim() &&
        typeof e.text === 'string' && e.text.trim() && typeof e.changes === 'string' && e.changes.trim() &&
        JSON.stringify(e.mapping_notes) === JSON.stringify(p.mapping_notes) && Array.isArray(e.notes) &&
        p.mapping_notes.every(function (note) { return e.notes.indexOf(note) !== -1; }) &&
        typeof e.publisher_paratext === 'string' && e.publisher_paratext.length <= 50000 && Boolean(e.publisher_paratext.trim()) === (p.paratext_sha256 !== 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') &&
        (${JSON.stringify(PINNED_NEW_PARATEXT_IDS)}.indexOf(d.text_id) === -1 || checkedContentHash(e.publisher_paratext, p.paratext_sha256)) &&
        Array.isArray(e.translator_notes) && e.translator_notes.length === p.note_count &&
        e.translator_notes.every(function (note, i) { return note && Object.keys(note).sort().join(',') === 'number,text' && note.number === (p.note_numbers ? p.note_numbers[i] : i + 1) && typeof note.text === 'string' && note.text.length <= 50000 && note.text.trim(); }) &&
        checkedContentHash(JSON.stringify(e.translator_notes), p.notes_sha256) &&
        (['tha-ap333','tha-ap334','tha-ap335','tha-ap336','tha-ap337','tha-ap338','tha-ap339','tha-ap340','tha-ap341','tha-ap342','tha-ap343','tha-ap344','tha-ap345','tha-ap346','tha-ap347','tha-ap348','tha-ap349','tha-ap350','tha-ap351','tha-ap352'].indexOf(d.text_id) === -1 || e.offset !== 0 || e.next_offset !== null ||
          Number.isSafeInteger(e.total_characters) && e.total_characters === e.text.length && checkedContentHash(e.text, p.body_sha256)) &&
        checkedChapterSummary(e, p) && checkedPublisherPreface(e, p, d.text_id) && checkedCollectionSummary(e, p, d.text_id) && checkedPublisherDivisions(e, p, d.text_id) && checkedEditorialGap(e, p, d.text_id) && ${JSON.stringify(APADANA_PINS)}.every(function (key) { return e[key] === p[key]; })) return d;
    return Object.assign({}, d, { english: null, english_error: 'Apadāna publisher identity, terms, edition notices or source pins changed. No English was displayed.' });
  }
  function sourceNoteRootKey(d) {
    try {
      var p = d && d.pali || {}, s = d && d.source || {};
      var anchors = (Array.isArray(p.segments) ? p.segments : []).map(function (segment, i) {
        return segment && (segment.ref === sourceNotesProfile.anchors.uid.segment.ref || segment.ref === sourceNotesProfile.anchors.book.segment.ref)
          ? { index: i, segment: segment } : null;
      }).filter(function (value) { return value !== null; });
      return sourceNotesPolicy.stable({ text_id: d && typeof d.text_id === 'string' ? d.text_id : null,
        book_id: d && typeof d.book_id === 'string' ? d.book_id : null, selection: d && d.selection || null,
        canonical: d && typeof d.canonical === 'boolean' ? d.canonical : null, content_type: d && d.content_type || null,
        source_commit: s.commit || null, locator_revision: s.locator_revision || null,
        offset: Number.isSafeInteger(p.offset) ? p.offset : null, returned: Number.isSafeInteger(p.returned) ? p.returned : null,
        total_segments: Number.isSafeInteger(p.total_segments) ? p.total_segments : null,
        script: d && d.script || 'roman', anchors: anchors });
    } catch { return null; }
  }
  function clearSourceNoteUi() {
    var active = document.activeElement, recoverFocus = false;
    sourceNoteUi.forEach(function (node) {
      if (node === active || typeof node.contains === 'function' && node.contains(active)) recoverFocus = true;
      if (node.parentNode) node.parentNode.removeChild(node);
    });
    sourceNoteUi = []; sourceNoteJump = null;
    if (recoverFocus) {
      var target = document.getElementById('pali-h');
      target.setAttribute('tabindex', '-1');
      if (typeof target.focus === 'function') target.focus({ preventScroll: true });
    }
  }
  function refreshSourceNotes(d, force) {
    if (closed || !rendered || !rendered.pali) return;
    var associated = sourceNoteRootBinding !== null && sourceNoteRootKey(d) === sourceNoteRootBinding;
    var inspected = sourceNotesPolicy.inspect(d);
    var currentRelevant = inspected.affected || !!(d && Object.prototype.hasOwnProperty.call(d, 'source_notes'));
    var view = associated ? inspected : sourceNoteRootRelevant || currentRelevant
      ? { state: 'unavailable', warning: sourceNoteWarning, signature: 'unassociated', entry: null, availability: null, opening: false }
      : { state: 'absent', warning: null, signature: 'unassociated-absent', entry: null, availability: null, opening: false };
    if (!force && sourceNoteSignature === view.signature) return;
    clearSourceNoteUi(); sourceNoteSignature = view.signature;
    var container = document.getElementById('pali');
    if (view.state === 'unavailable' || view.opening && view.state === 'available') {
      var status = el('section', 'source-notes-status'); status.setAttribute('role', 'status');
      status.appendChild(el('p', '', view.state === 'unavailable' ? view.warning : '1 separately indexed original VRI edition note is available at its recorded location.'));
      if (view.state === 'available' && view.availability) {
        sourceNoteJump = el('button', '', 'Open the recorded note location'); sourceNoteJump.type = 'button';
        sourceNoteJump.disabled = !!pending || awaitingSelection || !canNavigate();
        sourceNoteJump.addEventListener('click', function () {
          if (closed || !rendered || sourceNoteRootKey(rendered) !== sourceNoteRootBinding) { refreshSourceNotes(rendered, true); return; }
          var current = sourceNotesPolicy.inspect(rendered);
          if (current.state !== 'available' || !current.availability) { refreshSourceNotes(rendered, true); return; }
          var command = JSON.parse(JSON.stringify(current.availability.widget_read_with));
          if (${JSON.stringify(SCRIPT_CHOICES)}.indexOf(rendered.script) !== -1) command.arguments.script = rendered.script;
          navigate(command);
        });
        status.appendChild(sourceNoteJump);
      }
      container.insertBefore(status, container.firstChild); sourceNoteUi.push(status);
    }
    if (view.entry && sourceNoteAnchorNode && sourceNoteAnchorNode.parentNode === container) {
      var record = view.entry, aside = el('aside', 'original-edition-note');
      aside.setAttribute('role', 'note'); aside.setAttribute('aria-label', 'Original VRI edition note (Roman Pāli)');
      aside.appendChild(el('h3', '', 'Original VRI edition note (Roman Pāli)'));
      var text = el('p', 'edition-note-text', record.text); text.lang = 'pi-Latn'; aside.appendChild(text);
      aside.appendChild(el('p', '', 'Physical source location only; the remark’s stanza span has not been verified.'));
      aside.appendChild(el('p', '', record.qualification));
      aside.appendChild(el('p', 'edition-note-provenance', record.provenance.attribution + ' ' + record.provenance.terms));
      aside.appendChild(el('p', '', 'Extracted separately from the original source; no source wording has been changed.'));
      container.insertBefore(aside, sourceNoteAnchorNode.nextSibling); sourceNoteUi.push(aside);
    }
    queueSize();
  }
  function checkedCanonicalLocator(d) {
    if (!d || typeof d !== 'object') return d;
    var repairedPins = ${JSON.stringify(REPAIRED_CANONICAL_LOCATORS)};
    return Object.prototype.hasOwnProperty.call(repairedPins, d.text_id) && (!d.source || d.source.locator_revision !== repairedPins[d.text_id])
      ? { error: 'The paired Apadāna citation mapping revision changed. Reopen the whole current text explicitly; no old reference, replacement words or personal note was substituted.' } : d;
  }
  // In-memory cache identity only: never read widgetState or local drafts,
  // never publish this snapshot. Unsupported/non-JSON values disable reuse.
  // Inspect data descriptors before copying so getters/toJSON are not invoked.
  function jsonToolSnapshot(value) {
    var ancestors = [], nodes = 0, characters = 0;
    function copy(item, depth) {
      if (++nodes > 20000 || depth > 64) throw 0;
      if (typeof item === 'string') { if ((characters += item.length) > 2000000) throw 0; return item; }
      if (item === null || typeof item === 'boolean') return item;
      if (typeof item === 'number' && Number.isFinite(item)) return item;
      if (!item || typeof item !== 'object' || ancestors.indexOf(item) !== -1) throw 0;
      var array = Array.isArray(item), prototype = Object.getPrototypeOf(item);
      if (prototype !== null) {
        var constructor = Object.getOwnPropertyDescriptor(prototype, 'constructor');
        var constructorPrototype = constructor && typeof constructor.value === 'function' && Object.getOwnPropertyDescriptor(constructor.value, 'prototype');
        if (!constructor || !Object.prototype.hasOwnProperty.call(constructor, 'value') || typeof constructor.value !== 'function'
          || Function.prototype.toString.call(constructor.value) !== Function.prototype.toString.call(array ? Array : Object)
          || !constructorPrototype || !Object.prototype.hasOwnProperty.call(constructorPrototype, 'value') || constructorPrototype.value !== prototype
          || (array ? !Array.isArray(prototype) || Object.getPrototypeOf(Object.getPrototypeOf(prototype)) !== null : Object.getPrototypeOf(prototype) !== null)) throw 0;
      } else if (array) throw 0;
      var keys = Reflect.ownKeys(item), result = array ? Object.setPrototypeOf([], null) : Object.create(null);
      var length = array && Object.getOwnPropertyDescriptor(item, 'length').value;
      if (array && (length > 20000 || keys.length !== length + 1)) throw 0;
      ancestors.push(item);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i], descriptor = Object.getOwnPropertyDescriptor(item, key);
        if (array && key === 'length') continue;
        if (typeof key !== 'string' || !descriptor || !descriptor.enumerable
          || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
          || (characters += key.length) > 2000000
          || array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= length)) throw 0;
        result[key] = copy(descriptor.value, depth + 1);
      }
      ancestors.pop();
      return result;
    }
    try {
      var snapshot = JSON.stringify(copy(value, 0));
      return typeof snapshot === 'string' && snapshot.length <= 2000000 ? snapshot : null;
    } catch (error) { return null; }
  }
  function resultSnapshot(result) {
    if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
    // Only fields consumed by toolResult are relevant. Host-private metadata
    // and unrelated response fields are neither inspected nor serialized.
    try {
      var prototype = Object.getPrototypeOf(result);
      if (prototype !== null) {
        var constructor = Object.getOwnPropertyDescriptor(prototype, 'constructor');
        var constructorPrototype = constructor && typeof constructor.value === 'function' && Object.getOwnPropertyDescriptor(constructor.value, 'prototype');
        if (Object.getPrototypeOf(prototype) !== null || !constructor || !Object.prototype.hasOwnProperty.call(constructor, 'value')
          || !constructorPrototype || !Object.prototype.hasOwnProperty.call(constructorPrototype, 'value') || constructorPrototype.value !== prototype
          || typeof constructor.value !== 'function' || Function.prototype.toString.call(constructor.value) !== Function.prototype.toString.call(Object)) return null;
      }
      var envelope = Object.create(null);
      for (var name of ['isError', 'structuredContent', 'content']) {
        var descriptor = Object.getOwnPropertyDescriptor(result, name);
        if (!descriptor) { if (name in result) return null; continue; }
        if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) return null;
        envelope[name] = descriptor.value;
      }
      return jsonToolSnapshot(envelope);
    } catch (error) { return null; }
  }
  // Retain only the last fully rendered reading on a partial host edit.
  // Both frames come from an already strict JSON snapshot, never raw getters,
  // widgetState or drafts. They are captured only by a complete render below.
  function viewFrameSnapshot(snapshot, noteFrame) {
    if (snapshot === null) return null;
    try {
      var frame = JSON.parse(snapshot);
      if (!frame || typeof frame !== 'object' || Array.isArray(frame)) return null;
      if (noteFrame) delete frame.source_notes;
      else delete frame.text_id;
      var descriptor = Object.getOwnPropertyDescriptor(frame, noteFrame ? 'pali' : 'source');
      var nested = descriptor && descriptor.value;
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        if (noteFrame) delete nested.segments;
        else delete nested.commit;
      }
      return jsonToolSnapshot(frame);
    } catch (error) { return null; }
  }
  function render(d) {
    if (closed) return;
    if (!d || typeof d !== 'object') return;
    var input = d, snapshot = jsonToolSnapshot(d);
    d = checkedCanonicalLocator(d);
    if (input === renderedInput && snapshot !== null && snapshot === renderedSnapshot) { refreshSourceNotes(rendered); return; }
    if (input === renderedInput && d === input && snapshot !== null
      && (sourceNoteRootRelevant && renderedNoteFrame !== null && viewFrameSnapshot(snapshot, true) === renderedNoteFrame
        || renderedHeaderFrame !== null && viewFrameSnapshot(snapshot, false) === renderedHeaderFrame)) {
      // An envelope/anchor update cannot replace loaded Pali, nor can edited
      // selector headers repurpose unchanged words or model context. Keep the
      // initial root binding, DOM, focus and pending navigation; inspect only
      // the fresh apparatus. All other changed fields take the full path.
      refreshSourceNotes(input); return;
    }
    if (!d.pali && typeof d.error !== 'string') return;
    abandon(); generation++; awaitingSelection = false;
    if (!d.pali) {
      if (typeof d.error !== 'string') return;
      rendered = d; renderedInput = input; renderedSnapshot = snapshot; renderedNoteFrame = null; renderedHeaderFrame = null;
      sourceNoteUi = []; sourceNoteSignature = null; sourceNoteAnchorNode = null; sourceNoteRootBinding = null; sourceNoteRootRelevant = false; sourceNoteJump = null;
      document.getElementById('title').textContent = d.cancelled ? 'Reading cancelled' : 'Could not open the passage';
      document.getElementById('status').textContent = (d.cancelled ? 'Reading cancelled. ' : 'Could not open the passage. ') + d.error;
      ['meta', 'pali', 'english', 'footer'].forEach(function (id) { clear(document.getElementById(id)); });
      document.getElementById('pali').appendChild(el('p', 'empty', d.error));
      document.getElementById('english').appendChild(el('p', 'empty', d.cancelled ? 'No translation is displayed. Ask to open a passage again when you are ready.' : 'Check the citation and ask to open the passage again.'));
      navigation();
      wantModelContext(readingContext(d));
      return;
    }
    d = checkedApadana(d);
    rendered = d; renderedInput = input; renderedSnapshot = snapshot;
    sourceNoteRootBinding = sourceNoteRootKey(d);
    sourceNoteRootRelevant = sourceNotesPolicy.inspect(d).affected || Object.prototype.hasOwnProperty.call(d, 'source_notes');
    renderedNoteFrame = sourceNoteRootRelevant ? viewFrameSnapshot(snapshot, true) : null;
    renderedHeaderFrame = viewFrameSnapshot(snapshot, false);
    sourceNoteUi = []; sourceNoteSignature = null; sourceNoteAnchorNode = null; sourceNoteJump = null;
    document.getElementById('title').textContent = (d.citation || '') + (d.title ? ' · ' + d.title : '');
    var meta = document.getElementById('meta'); clear(meta);
    if (d.selection === 'source_book') meta.appendChild(el('span', 'chip', 'Complete source file · no individual text ID'));
    if (d.canonical === false) meta.appendChild(el('span', 'chip', d.content_type === 'commentary' ? 'Commentary · not the canon' : 'Post-canonical · not the canon'));
    if (d.collection) meta.appendChild(el('span', 'chip', d.collection));
    if (d.context_for) meta.appendChild(el('span', 'chip', 'Source context for ' + d.context_for));
    if (d.pts) meta.appendChild(el('span', 'chip', 'PTS ' + d.pts));
    if (d.vri_paragraphs) meta.appendChild(el('span', 'chip', 'VRI ¶ ' + d.vri_paragraphs));
    if (d.english && d.english.translator) meta.appendChild(el('span', 'chip', 'Tr. ' + d.english.translator));
    if (d.approximate) meta.appendChild(el('span', 'chip', 'approximate mapping'));

    var pali = document.getElementById('pali'); clear(pali);
    if ((d.canonical === false || d.selection === 'source_book') && d.label) pali.appendChild(el('p', 'note', d.label));
    if (d.alignment_note) pali.appendChild(el('p', 'note', d.alignment_note));
    if (d.available === false && d.availability_note) pali.appendChild(el('p', 'empty', d.availability_note));
    if (d.script_note) pali.appendChild(el('p', 'note', d.script_note));
    (d.notes || []).forEach(function (n) { pali.appendChild(el('p', 'note', n)); });
    (d.pali.segments || []).forEach(function (s) {
      var p = el('p', 'seg ' + (s.type || 'prose'));
      (s.commentary_pts_page_begins || []).forEach(function (pg) { p.appendChild(el('span', 'pts', 'Commentary PTS ' + pg)); });
      if (s.comments_on_vri_paragraphs) p.appendChild(el('span', 'vri', 'On root VRI ¶' + s.comments_on_vri_paragraphs));
      (s.pts_page_begins || []).forEach(function (pg) { p.appendChild(el('span', 'pts', pg)); });
      if ((d.canonical === false || d.selection === 'source_book' || d.segment_ref) && s.ref) p.appendChild(el('span', 'vri', s.ref));
      if (s.vri_paragraph) p.appendChild(el('span', 'vri', '¶' + s.vri_paragraph));
      p.appendChild(document.createTextNode(s.text || ''));
      pali.appendChild(p);
      if (s.ref === sourceNotesProfile.anchors.uid.segment.ref || s.ref === sourceNotesProfile.anchors.book.segment.ref) sourceNoteAnchorNode = p;
    });
    if (d.pali.next_offset != null) pali.appendChild(el('p', 'note', 'Showing ' + d.pali.returned + ' of ' + d.pali.total_segments + ' segments. Ask for more to continue from segment ' + d.pali.next_offset + '.'));
    if (d.pali.context_with) pali.appendChild(el('p', 'note', 'Ask for surrounding Pāli to read this passage in its source context.'));
    if (d.pali.exact_with) pali.appendChild(el('p', 'note', 'Ask to return to the exact selected segment.'));
    refreshSourceNotes(d, true);

    var en = document.getElementById('english'); clear(en);
    if (d.english) {
      (d.english.notes || []).forEach(function (n) { en.appendChild(el('p', 'note', n)); });
      var head = el('p', 'note');
      head.appendChild(document.createTextNode((d.english.translator || 'Translator not stated') + (d.english.reference ? ' (' + d.english.reference + ')' : '') + ' · '));
      head.appendChild(link(d.english.url, d.english.source === 'apadana' ? 'Legends of the Buddhist Saints (Apadāna)' : d.english.source || d.english.url));
      en.appendChild(head);
      en.appendChild(el('div', 'en', d.english.text || ''));
      if (d.english.offset) en.insertBefore(el('p', 'note', 'Continuing from ' + characterPosition(d.english.offset, d.english.total_characters) + '.'), en.lastChild);
      if (d.english.translation_revision) {
        en.appendChild(el('p', 'note', 'Publisher revision: ' + d.english.translation_revision));
        if (d.english.changes) en.appendChild(el('p', 'note', d.english.changes));
        if (d.english.publisher_paratext) {
          if (d.english.publisher_preface) {
            var preface = el('section', ''); preface.setAttribute('aria-label', 'Publisher preface · editorial, not poem text');
            preface.appendChild(el('h3', '', d.english.publisher_preface.label + ' · editorial, not poem text'));
            preface.appendChild(el('p', 'en', d.english.publisher_paratext));
            preface.appendChild(el('h3', '', 'Preface notes · editorial, not poem notes'));
            var prefaceNotes = el('ol', '');
            d.english.publisher_preface.translator_notes.forEach(function (n) { var li = el('li', '', n.text); li.value = n.number; prefaceNotes.appendChild(li); });
            preface.appendChild(prefaceNotes); en.appendChild(preface);
          } else {
            en.appendChild(el('h3', '', 'Publisher preface · editorial, not poem text'));
            en.appendChild(el('p', 'en', d.english.publisher_paratext));
          }
        }
        if (d.english.translator_notes && d.english.translator_notes.length) {
          en.appendChild(el('h3', '', 'Translator’s notes · editorial, not poem text'));
          var noteList = el('ol', '');
          d.english.translator_notes.forEach(function (n) { var li = el('li', '', n.text); li.value = n.number; noteList.appendChild(li); });
          en.appendChild(noteList);
        }
        if (d.english.chapter_summary) {
          var s = d.english.chapter_summary, chapter = el('section', '');
          chapter.setAttribute('aria-label', 'Canonical chapter summary · not poem text');
          chapter.appendChild(el('h3', '', 'Canonical chapter summary · not poem text'));
          chapter.appendChild(el('p', 'en', s.text));
          if (s.parent_id === 'thi-ap40') chapter.appendChild(el('p', 'note', 'Original summary counts and titles are preserved; they are not a measure of indexed translation coverage.'));
          if (s.translator_notes.length) {
            chapter.appendChild(el('h3', '', 'Chapter summary notes · editorial, not poem notes'));
            var summaryNotes = el('ol', '');
            s.translator_notes.forEach(function (n) { var li = el('li', '', n.text); li.value = n.number; summaryNotes.appendChild(li); });
            chapter.appendChild(summaryNotes);
          }
          en.appendChild(chapter);
        }
        if (d.english.collection_summary) {
          var collection = el('section', ''), cs = d.english.collection_summary;
          var firstHundred = cs.parent_id === 'tha-ap102', secondHundred = cs.parent_id === 'tha-ap202', collectionHeading = firstHundred ? 'Therā Apadāna first-hundred chapter summary and colophons · not poem text' : secondHundred ? 'Therā Apadāna second-hundred chapter summary and colophons · not poem text' : 'Canonical collection summary · not poem text';
          collection.setAttribute('aria-label', collectionHeading);
          collection.appendChild(el('h3', '', collectionHeading));
          collection.appendChild(el('p', 'en', cs.text));
          if (firstHundred) collection.appendChild(el('p', 'note', 'This summary covers the publisher’s first hundred Therā poems and first ten chapters. It does not mark the end of the Therā Apadāna. Original counts and titles are preserved; they are not a measure of indexed translation coverage. It is separate from the poem and chapter summary, and is not poem quotation evidence.'));
          if (secondHundred) collection.appendChild(el('p', 'note', 'This summary covers the publisher’s second hundred Therā poems and chapters eleven to twenty. Its stated 666 is the publisher’s original edition statement, not a validated corpus total. It does not mark the end of all Therā poems. It is separate from the poem and chapter summary, and is not poem quotation evidence.'));
          collection.appendChild(el('h3', '', 'Collection summary notes · editorial, not poem notes'));
          var collectionNotes = el('ol', '');
          cs.translator_notes.forEach(function (n) { var li = el('li', '', n.text); li.value = n.number; collectionNotes.appendChild(li); });
          collection.appendChild(collectionNotes); en.appendChild(collection);
        }
        if (d.english.editorial_gap) {
          var gap = d.english.editorial_gap, editorial = el('section', '');
          editorial.setAttribute('aria-label', 'Publisher editorial gap · not poem text');
          editorial.appendChild(el('h3', '', 'Publisher editorial gap · not poem text'));
          editorial.appendChild(el('p', 'note', 'Original publisher placement: after local stanza ' + gap.after_local_label + ' (printed global label ' + gap.after_publisher_label + '), before local stanza ' + gap.before_local_label + ' (printed global label ' + gap.before_publisher_label + ').'));
          editorial.appendChild(el('p', 'en', gap.text));
          editorial.appendChild(el('h3', '', 'Editorial gap notes · not poem notes'));
          var editorialNotes = el('ol', '');
          gap.translator_notes.forEach(function (n) { var li = el('li', '', n.text); li.value = n.number; editorialNotes.appendChild(li); });
          editorial.appendChild(editorialNotes); en.appendChild(editorial);
        }
        (d.english.publisher_divisions || []).forEach(function (s) {
          var section = el('section', ''); section.setAttribute('aria-label', 'Publisher recitation division · not poem text');
          section.appendChild(el('h3', '', 'Publisher recitation division · not poem text'));
          section.appendChild(el('p', 'note', s.placement === 'after_poem' ? 'After the publisher poem.' : s.placement === 'after_chapter_summary' ? 'After the chapter summary.' : 'Before publisher local stanza ' + s.before_local_label + ', printed global label ' + s.before_publisher_label + '.'));
          section.appendChild(el('p', 'en', s.text));
          if (s.translator_notes.length) {
            section.appendChild(el('h3', '', 'Recitation notes · editorial, not poem notes'));
            var divisionNotes = el('ol', '');
            s.translator_notes.forEach(function (n) { var li = el('li', '', n.text); li.value = n.number; divisionNotes.appendChild(li); });
            section.appendChild(divisionNotes);
          }
          en.appendChild(section);
        });
      }
      if (d.english.truncated) en.appendChild(el('p', 'note', 'The translation continues (' + characterPosition(d.english.next_offset, d.english.total_characters) + '). Ask for more to continue, or read the rest on the source page.'));
    } else {
      en.appendChild(el('p', 'empty', d.english_error || 'No English translation requested.'));
    }

    var f = document.getElementById('footer'); clear(f);
    f.appendChild(el('p', '', 'Pāli: ' + (d.pali.edition || '') + '. ' + (d.pali.attribution || '') + ' ' + (d.pali.license || '')));
    if (d.english) f.appendChild(el('p', '', 'English: ' + (d.english.attribution || '') + ' ' + (d.english.license || '')));
    if (d.english && d.english.license_url) { var license = el('p', ''); license.appendChild(link(d.english.license_url, 'English licence terms')); f.appendChild(license); }
    if (d.links && d.links.suttacentral) { var sc = el('p', ''); sc.appendChild(document.createTextNode('Parallels and other translations: ')); sc.appendChild(link(d.links.suttacentral, 'SuttaCentral')); f.appendChild(sc); }
    document.getElementById('status').textContent = (d.citation || 'Passage') + '. ' + (d.canonical === false ? (d.content_type === 'commentary' ? 'Commentary, not the canon. ' : 'Post-canonical, not the canon. ') : d.selection === 'source_book' ? 'Complete source file, no individual text identity. ' : '') +
      (d.available === false ? d.availability_note + ' ' : d.pali.returned ? 'Showing Pāli segments ' + (d.pali.offset + 1) + ' to ' + (d.pali.offset + d.pali.returned) + ' of ' + d.pali.total_segments + '. ' : 'No Pāli segments on this page. ') +
      (d.english ? 'English ' + (d.english.offset ? 'continuing from character ' + d.english.offset : 'loaded') + '.' : (d.english_error || 'No English translation requested.'));
    navigation();
    wantModelContext(readingContext(d));
  }
  // Apps SDK (window.openai) path.
  function toolResult(result) {
    if (!result) return;
    if (result.isError) {
      var message = result.structuredContent && result.structuredContent.error;
      if (typeof message !== 'string') {
        var text = typeof result.content === 'string' ? { text: result.content } :
          (Array.isArray(result.content) ? result.content.find(function (part) { return part.type === 'text'; }) : null);
        if (text) { try { message = JSON.parse(text.text).error; } catch (e) { message = text.text; } }
      }
      render({ error: typeof message === 'string' ? message : 'The passage could not be loaded.' });
      return;
    }
    render(result.structuredContent);
  }
  function fromOpenai() {
    if (window.openai && typeof window.openai.notifyIntrinsicHeight === 'function') startSizing('sdk');
    if (closed) return;
    if (window.openai) {
      setTheme(window.openai.theme);
      var input = JSON.stringify(window.openai.toolInput || null);
      if (lastInput !== input && rendered && window.openai.toolInput) requested(window.openai.toolInput);
      lastInput = input;
      var metadata = window.openai.toolResponseMetadata;
      var result = metadata && (metadata.mcp_tool_result || metadata.call_tool_result);
      var output = window.openai.toolOutput, outputSnapshot = jsonToolSnapshot(output), metadataSnapshot = resultSnapshot(result);
      var freshOutput = output !== lastOutput || output != null && (outputSnapshot === null || outputSnapshot !== lastOutputSnapshot);
      var freshMetadata = metadata !== lastMetadata || result != null && (metadataSnapshot === null || metadataSnapshot !== lastResultSnapshot);
      lastOutput = output; lastOutputSnapshot = outputSnapshot; lastMetadata = metadata; lastResultSnapshot = metadataSnapshot;
      if (result && result.isError && (freshMetadata || !freshOutput)) {
        if (freshMetadata || freshOutput) toolResult(result);
      } else if (freshOutput) render(output);
      else if (freshMetadata && result && result.structuredContent) toolResult(result);
      if (!freshOutput && output) {
        var locatorChecked = checkedCanonicalLocator(output);
        if (locatorChecked !== output) render(locatorChecked);
        else refreshSourceNotes(output);
      }
    }
  }
  function requested(args) {
    if (closed) return;
    function ordered(value) { return JSON.stringify(Object.keys(value || {}).sort().map(function (key) { return [key, value[key]]; })); }
    if (pending && ordered(args) === ordered(pending.command.arguments)) return;
    abandon(); generation++; awaitingSelection = true;
    document.getElementById('navigation').setAttribute('aria-busy', 'true'); navigation();
    document.getElementById('status').textContent = 'Opening the requested passage…';
    wantModelContext(vacantContext('loading'));
  }
  function closeReader() {
    if (closed) return;
    var canClear = !modelFlight && !modelBlocked, channel = modelChannel, modality = modelModality;
    closed = true; generation++; abandon(); stopSizing();
    if (modelFlight) clearTimeout(modelFlight.timer);
    modelFlight = null; modelDesired = null; modelAccepted = null; rendered = null; renderedInput = null; renderedSnapshot = null; renderedNoteFrame = null; renderedHeaderFrame = null; lastOutput = null; lastOutputSnapshot = null; lastMetadata = null; lastResultSnapshot = null; lastInput = null;
    sourceNoteUi = []; sourceNoteSignature = null; sourceNoteAnchorNode = null; sourceNoteRootBinding = null; sourceNoteRootRelevant = false; sourceNoteJump = null;
    awaitingSelection = false;
    ['meta', 'pali', 'english', 'footer', 'navigation'].forEach(function (id) { clear(document.getElementById(id)); });
    document.getElementById('title').textContent = 'Reader closed';
    document.getElementById('status').textContent = 'Reader closed. Open a new reader to continue.';
    document.getElementById('context-status').textContent = 'Reader closed. Clearing host-held reading context has not been verified.';
    if (canClear && channel) {
      var payload = { pali_reader: Object.assign(vacantContext('closed'), { revision: ++modelRevision }) };
      try {
        if (channel === 'widget-state') {
          var saved = window.openai.setWidgetState({ modelContent: JSON.stringify(payload) });
          if (saved && typeof saved.then === 'function') Promise.resolve(saved).then(function () {}, function () {});
        } else post({ jsonrpc: '2.0', id: requestId++, method: 'ui/update-model-context', params: modality === 'structured' ? { structuredContent: payload } : { content: [{ type: 'text', text: JSON.stringify(payload) }] } });
      } catch (error) { /* Closure must not depend on host context storage. */ }
    }
  }
  window.addEventListener('pagehide', function (event) { if (!event.persisted) closeReader(); });
  window.addEventListener('openai:set_globals', fromOpenai);
  // MCP Apps bridge path (JSON-RPC over postMessage).
  window.addEventListener('message', function (ev) {
    if (ev.source !== window.parent) return;
    var m = ev.data; if (!m || m.jsonrpc !== '2.0') return;
    if (m.method === 'ui/resource-teardown') {
      closeReader();
      if (m.id === null || typeof m.id === 'string' || (typeof m.id === 'number' && Number.isFinite(m.id))) post({ jsonrpc: '2.0', id: m.id, result: {} });
      return;
    }
    if (closed) return;
    if (m.id === 1 && m.result) {
      modelCapabilities = m.result.hostCapabilities && m.result.hostCapabilities.updateModelContext; pumpModelContext();
      serverTools = !!(m.result.hostCapabilities && m.result.hostCapabilities.serverTools); navigation();
      if (m.result.hostContext) setTheme(m.result.hostContext.theme);
      post({ jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} });
      startSizing('mcp');
      hostLinks = !!(m.result.hostCapabilities && m.result.hostCapabilities.openLinks);
    } else if (linkFlight && m.id === linkFlight.id && (Object.prototype.hasOwnProperty.call(m, 'result') || m.error)) {
      finishLink(linkFlight, m.error ? true : !m.result || typeof m.result !== 'object' || Array.isArray(m.result) ? 'unconfirmed' : !!m.result.isError, true);
    } else if (modelFlight && m.id === modelFlight.id && (m.result || m.error)) {
      modelReply(m);
    } else if (pending && m.id === pending.id && (m.result || m.error)) {
      finish(pending, m.result, m.error && new Error(m.error.message || 'The host refused the navigation request.'));
    } else if (m.method === 'ui/notifications/tool-result') {
      toolResult(m.params);
    } else if (m.method === 'ui/notifications/tool-input') {
      requested(m.params && m.params.arguments);
    } else if (m.method === 'ui/notifications/tool-input-partial') {
      // Partial arguments may change and have no request ID. A known UI read is already pending;
      // do not mistake its streamed echo for a different selection or execute incomplete input.
      if (!pending && !awaitingSelection) requested();
    } else if (m.method === 'ui/notifications/tool-cancelled') {
      if (pending || awaitingSelection || !rendered) render({ cancelled: true, error: 'The reading request was cancelled. Ask to open a passage again when you are ready.' });
    } else if (m.method === 'ui/notifications/host-context-changed') {
      setTheme(m.params && m.params.theme);
      refreshSourceNotes(rendered);
    }
  });
  post({ jsonrpc: '2.0', id: 1, method: 'ui/initialize', params: { protocolVersion: '2026-01-26', clientInfo: { name: 'pali-canon-reader', version: '${WIDGET_VERSION}' }, appCapabilities: { availableDisplayModes: ['inline', 'fullscreen'] } } });
  fromOpenai();
})();
</script>
</body>
</html>
`;
