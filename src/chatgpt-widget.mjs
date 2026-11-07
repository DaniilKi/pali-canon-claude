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
import * as canon from './canon.mjs';
import * as english from './english.mjs';
import { romanizeInput, inputNote, localizeText, scriptName, SCRIPT_DESCRIPTION } from './script.mjs';
import * as postcanonical from './postcanonical.mjs';
import { readBook } from './source-books.mjs';
import { getCommentary } from './commentary.mjs';

export const WIDGET_TOOL = 'read_passage_widget';
export const WIDGET_VERSION = 'v10';
export const WIDGET_URI = `ui://pali-canon/reader-${WIDGET_VERSION}.html`;
export const SKYBRIDGE_URI = `ui://pali-canon/reader-${WIDGET_VERSION}.skybridge.html`;
export const MCP_APP_MIME = 'text/html;profile=mcp-app';
export const SKYBRIDGE_MIME = 'text/html+skybridge';

const WIDGET_DESCRIPTION = 'Shows canonical Pāli, distinctly labelled commentary or post-canonical Pāli, or complete VRI root source files, with English where linked, with the citation, PTS page, translator, attribution and licence. Everything shown was retrieved by the tool; nothing is generated.';

// The widget loads nothing from the network: no scripts, styles, fonts or API calls. Links open through the host
// (window.openai.openExternal / ui/open-link). redirect_domains marks the only link targets the widget makes as
// trusted openExternal destinations: the English sources already on the src/http.mjs allowlist, and
// suttacentral.net (link only, never fetched). `_meta.ui.csp` has no equivalent field, so it is set only here.
export const REDIRECT_DOMAINS = [
  'https://www.dhammatalks.org', 'https://dhammatalks.org',
  'https://www.accesstoinsight.org', 'https://accesstoinsight.org',
  'https://ancient-buddhist-texts.net',
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
export async function readPassage({ uid, book, commentary, segment, context = 0, source_commit: sourceCommit, anchor_sha256: anchorHash, translation, english: wantEnglish = true, offset = 0, limit = 40, english_offset: englishOffset = 0, englishCharacters = 6000, script }) {
  if ([uid, book, commentary].filter(value => value !== undefined).length !== 1) throw new Error('Give exactly one of uid (canonical/post-canonical), book (complete root file), or commentary (aligned citation or direct commentary reference).');
  if (sourceCommit !== undefined && sourceCommit !== canon.source().commit) throw new Error('The requested VRI source version is no longer bundled. Reopen the selection from the current source; no continuation or context was substituted.');
  if (!Number.isInteger(context) || context < 0 || context > 20) throw new Error('Context must be an integer from 0 to 20 neighbouring segments on each side.');
  if (uid !== undefined) {
    const reference = romanizeInput(uid).text;
    if (reference.startsWith('commentary:') || /^[^/]+\/c[1-9]\d*$/.test(reference)) { commentary = uid; uid = undefined; }
  }
  const commentaryAnchor = commentary !== undefined ? romanizeInput(commentary).text.match(/^(.+)\/c([1-9]\d*)$/) : null;
  if (segment === undefined && !commentaryAnchor && (context !== 0 || anchorHash !== undefined)) throw new Error('Context and anchor_sha256 require an exact segment selection.');
  if (commentaryAnchor && (context !== 0 || anchorHash !== undefined) && (offset !== 0 || englishOffset !== 0)) throw new Error('Commentary context cannot be combined with continuation offsets.');
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
    const exact = await readPassage({ uid, book, offset: index, limit: 1, english: false, script });
    if (exact.pali.segments[0]?.ref !== segment) throw new Error(`Segment ${segment} does not belong to this selection. Copy its exact reference from get_text or get_post_canonical; no other segment was selected.`);
    const fingerprint = createHash('sha256').update(JSON.stringify(exact.pali.segments[0])).digest('hex');
    if (anchorHash !== undefined && anchorHash !== fingerprint) throw new Error('The exact source segment has changed. Reopen it before requesting context; no neighbouring passage was substituted.');
    const selector = book !== undefined ? { book: exact.book_id } : { uid: exact.text_id || exact.citation };
    const args = { ...selector, segment, english: false, source_commit: exact.source.commit, anchor_sha256: fingerprint, ...(script ? { script: scriptName(script) } : {}) };
    const start = Math.max(0, index - context);
    const page = context ? await readPassage({ ...selector, offset: start, limit: index - start + context + 1, english: false, script }) : exact;
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
    const page = getCommentary(input.text, { offset, limit });
    if (!Array.isArray(page.segments)) throw new Error('Choose a commentary passage or book reference, not the commentary catalogue. Use get_commentary with uid commentary to list book references.');
    if (!page.source) throw new Error(page.notes?.join(' ') || 'Bundled commentary data is unavailable.');
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
    const args = { commentary: anchor, english: false, source_commit: displayed.source.commit, anchor_sha256: fingerprint, ...(script ? { script: scriptName(script) } : {}) };
    if (context) {
      const start = Math.max(0, index - context);
      const surrounding = await readPassage({ commentary: parent, offset: start, limit: index - start + context + 1, english: false, script });
      if (!surrounding.pali.segments.some(item => item.ref === anchor)) throw new Error('The commentary anchor is not in this source context; no neighbouring passage was substituted.');
      return { ...surrounding, context_for: anchor, ...(displayed.english_error ? { english_error: displayed.english_error } : {}),
        pali: { ...surrounding.pali, read_with: { name: WIDGET_TOOL, arguments: { ...args, context } }, context_with: null, exact_with: { name: WIDGET_TOOL, arguments: args } } };
    }
    const parentPage = getCommentary(parent, { limit: 1 });
    return { ...displayed, pali: { ...displayed.pali, read_with: { name: WIDGET_TOOL, arguments: args }, context_with: parentPage.total_segments > 1 ? { name: WIDGET_TOOL, arguments: { ...args, context: 2 } } : null, exact_with: null } };
  }
  if (book !== undefined) {
    const page = readBook({ book, offset, limit });
    const result = {
      canonical: true, selection: 'source_book', book_id: page.book_id,
      citation: 'vri-book:' + page.book_id, title: page.title, collection: 'VRI root source file',
      label: 'Complete VRI root source file, including front matter. Source-file positions are not individual sutta or rule identities.',
      source: page.source, notes: page.notes,
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
  const described = canon.describe(unit, notes);
  const all = canon.segments(unit);
  const page = all.slice(offset, offset + limit);
  const vri = canon.source();
  const result = {
    text_id: unit.id, canonical: true, source: canon.source(), ...inputNote(input),
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
  if (wantEnglish && result.english_available.length) {
    try {
      if (englishOffset > 0 && !/^(dt|ati|aj):/.test(translation || '')) {
        throw new Error('To continue English, use the exact translation_id from the previous result (english.continue_with gives the full arguments). Character offsets cannot be transferred between versions; start at english_offset 0 to choose a new translation.');
      }
      const t = await english.translation(unit, translation && translation !== 'default' ? translation : undefined, { offset: englishOffset, limit: englishCharacters });
      if (englishOffset > 0 && t.translation_id !== translation) {
        throw new Error('Cannot continue at this character offset: the requested translation is unavailable and the fallback is a different version. Retry the original translation later, or restart the fallback with english_offset 0.');
      }
      result.english = {
        translator: t.translator, translation_id: t.translation_id, source: t.source, url: t.url,
        reference: (canon.describe(unit).english.find((e) => e.translation_id === t.translation_id) || {}).reference,
        fetched_from: t.fetched_from, attribution: t.attribution, license: t.license,
        text: t.text, offset: t.offset, total_characters: t.total_characters, next_offset: t.next_offset, truncated: t.next_offset !== null, notes: t.notes,
        read_with: { name: WIDGET_TOOL, arguments: { uid: unit.id, source_commit: vri.commit, translation: t.translation_id, english: true, offset, limit, english_offset: t.offset, ...(script ? { script: scriptName(script) } : {}) } },
        continue_with: t.next_offset !== null ? {
          name: WIDGET_TOOL,
          arguments: { uid: unit.id, source_commit: vri.commit, translation: t.translation_id, english: true, offset, limit, english_offset: t.next_offset, ...(script ? { script: scriptName(script) } : {}) },
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
  const args = { ...(commentary ? { commentary } : book ? { book } : { uid }), source_commit: result.source.commit, english: wantEnglish, offset: result.pali.next_offset, limit,
    ...(version ? { translation: version } : {}), ...(script ? { script: scriptName(script) } : {}) };
  return { ...result, ...display, pali: { ...result.pali, segments,
    read_with: { name: WIDGET_TOOL, arguments: { ...args, english: false, offset: result.pali.offset } },
    continue_with: result.pali.next_offset === null ? null : { name: WIDGET_TOOL, arguments: args } } };
}

/** Register the widget tool and its two UI templates on an McpServer. Called by the HTTP entry only. */
export function registerChatgptWidget(server) {
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
      source_commit: z.string().regex(/^[a-f0-9]{40}$/).optional().describe('Expected VRI source commit from a returned cursor; a changed source fails instead of moving the reading to another version.'),
      anchor_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional().describe('Expected exact source-segment fingerprint from pali.context_with/exact_with. Preserve the command unchanged; a changed segment fails rather than substituting context.'),
      script: z.string().trim().min(1).max(30).optional().describe(SCRIPT_DESCRIPTION),
      translation: z.string().trim().min(1).max(200).optional().describe('At the start: "default", a translation_id from get_metadata, or a translator name; omit for default. For non-zero english_offset, use the exact translation_id returned by the previous result.'),
      english: z.boolean().default(true).describe('Fetch an English translation (live). false shows the Pāli only.'),
      offset: z.number().int().min(0).max(100000).default(0).describe('Pāli segment offset for continuation.'),
      limit: z.number().int().min(1).max(80).default(40).describe('Pāli segments to show.'),
      english_offset: z.number().int().min(0).max(10000000).default(0).describe('English character offset for continuation. Use english.continue_with.arguments from the previous result: non-zero offsets require its exact translation_id, so a source recovery/outage cannot transfer offsets to another version. Shows up to 6,000 characters per call.'),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    _meta: TOOL_META,
  }, async (args) => {
    try {
      const result = await readPassage(args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
    } catch (error) {
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
<footer id="footer"></footer>
<script>
(function () {
  var rendered = null;
  var generation = 0, requestId = 2, pending = null, serverTools = false, awaitingSelection = false, lastInput, lastOutput, lastMetadata;
  var modelCapabilities, modelChannel, modelModality, modelDesired, modelFlight, modelAccepted, modelFailure, modelRevision = 0, modelBlocked = false;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function modelStatus(message) { document.getElementById('context-status').textContent = message; }
  function modelAdvice() { return modelDesired && modelDesired.snapshot.state === 'displayed' ? ' Tell the assistant the displayed citation.' : ' No current reading has been confirmed for the assistant.'; }
  function vacantContext(state) { return { schema: 'pali-reader-selection-v1', widget_version: '${WIDGET_VERSION}', state: state,
    quotation: state === 'loading' ? 'A new reading is pending; do not assume an earlier page is the requested selection.' : 'No retrieved passage is displayed. Reopen a source before quoting.' }; }
  function readingContext(d) {
    if (!d || !d.pali) return vacantContext('error');
    var source = d.source || {}, book = d.book || {}, p = d.pali, e = d.english;
    return { schema: 'pali-reader-selection-v1', widget_version: '${WIDGET_VERSION}', state: 'displayed',
      kind: d.selection === 'source_book' ? 'source_book' : d.content_type || (d.canonical === true ? 'canonical' : 'unknown'),
      canonical: d.canonical, selection: d.selection, citation: d.citation, text_id: d.text_id, book_id: d.book_id,
      book: { id: book.id, uid: book.uid, file: book.file, title: book.title }, requested_on: d.requested_on,
      segment_ref: d.segment_ref, context_for: d.context_for, script: d.script || 'roman', available: d.available,
      approximate: !!d.approximate, alignment: d.alignment, alignment_note: d.alignment_note, alignment_method: d.alignment_method,
      availability_note: d.availability_note, notes: d.notes || [],
      source: { name: source.name, repository: source.repository, commit: source.commit, files: source.files, attribution: source.attribution, terms: source.terms },
      pali: { offset: p.offset, returned: p.returned, total_segments: p.total_segments, refs: (p.segments || []).map(function (s) { return s.ref; }), read_with: p.read_with },
      english: e ? { state: 'displayed', translation_id: e.translation_id, translator: e.translator, source: e.source, url: e.url,
        fetched_from: e.fetched_from, offset: e.offset, next_offset: e.next_offset, total_characters: e.total_characters,
        attribution: e.attribution, license: e.license, notes: e.notes || [], read_with: e.read_with }
        : { state: 'not_displayed', note: d.english_error || 'No English translation requested.', linked_versions: (d.english_available || []).map(function (version) { return version.translation_id; }) },
      quotation: 'Reading metadata only; no passage text is included. Retrieve read_with and verify its source, references and cautions before quoting. No scholarly or native-reader approval is implied.' };
  }
  function wantModelContext(snapshot) {
    var key = JSON.stringify(snapshot);
    if (!modelDesired || modelDesired.key !== key) modelDesired = { key: key, snapshot: Object.assign(JSON.parse(key), { revision: ++modelRevision }) };
    pumpModelContext();
  }
  function pumpModelContext() {
    if (!modelDesired) return;
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
          failModelContext('This host could not confirm reading-context storage. Sharing is unconfirmed.'); return;
        }
        modelAccepted = desired.key;
        if (modelDesired.key === desired.key) modelStatus('The updated reading state was passed to the host. Model delivery is not verified.');
        else Promise.resolve().then(pumpModelContext);
      } catch (error) { modelFlight = null; failModelContext('The host could not store the reading context.'); }
      return;
    }
    var flight = { id: requestId++, key: desired.key }; modelFlight = flight;
    modelStatus('Updating the reading state available to the host…');
    flight.timer = setTimeout(function () {
      if (modelFlight !== flight) return;
      flight.timedOut = true; modelStatus('The host has not confirmed the reading context.' + modelAdvice());
    }, 30000);
    post({ jsonrpc: '2.0', id: flight.id, method: 'ui/update-model-context', params: modelModality === 'structured' ? { structuredContent: payload } : { content: [{ type: 'text', text: JSON.stringify(payload) }] } });
  }
  function failModelContext(message) { modelBlocked = true; modelFailure = message; modelStatus(message + modelAdvice()); }
  function modelReply(message) {
    var flight = modelFlight;
    if (!flight || message.id !== flight.id) return;
    clearTimeout(flight.timer); modelFlight = null;
    if (message.error) { failModelContext('The host rejected reading-context sharing.'); return; }
    if (!message.result || typeof message.result !== 'object' || Array.isArray(message.result)) { failModelContext('The host did not confirm reading-context sharing.'); return; }
    modelAccepted = flight.key;
    if (modelDesired.key === flight.key) modelStatus('The host accepted the current reading state. Model delivery is not verified.');
    else pumpModelContext();
  }
  function canNavigate() { return !!(window.openai && typeof window.openai.callTool === 'function') || serverTools; }
  function abandon() {
    if (pending) { clearTimeout(pending.timer); pending = null; }
    document.getElementById('navigation').setAttribute('aria-busy', 'false');
  }
  function navigation() {
    var nav = document.getElementById('navigation'); clear(nav);
    if (awaitingSelection) { nav.appendChild(el('p', 'note', 'Opening the requested passage…')); return; }
    if (!canNavigate() || !rendered || !rendered.pali) return;
    if (pending) nav.appendChild(el('p', 'note', 'Loading the requested passage…'));
    var d = rendered;
    [[d.pali.context_with, 'Surrounding Pāli'], [d.pali.exact_with, 'Return to exact segment'], [d.pali.continue_with, 'Continue Pāli'], [d.english && d.english.continue_with, 'Continue English']].forEach(function (entry) {
      var command = entry[0];
      if (!command || command.name !== '${WIDGET_TOOL}' || !command.arguments || typeof command.arguments !== 'object' || Array.isArray(command.arguments)) return;
      var button = el('button', '', entry[1]); button.type = 'button'; button.disabled = !!pending;
      button.addEventListener('click', function () { if (rendered === d) navigate(command); }); nav.appendChild(button);
    });
  }
  function finish(call, result, error) {
    if (pending !== call || call.generation !== generation) return;
    abandon();
    var data = result && result.structuredContent, args = call.command.arguments;
    var readable = data && data.pali && Array.isArray(data.pali.segments) &&
      data.pali.segments.every(function (segment) { return segment && typeof segment.text === 'string'; }) &&
      Number.isInteger(data.pali.returned) && data.pali.returned === data.pali.segments.length &&
      Number.isInteger(data.pali.total_segments) && data.pali.total_segments >= data.pali.returned &&
      Number.isInteger(data.pali.offset) && data.pali.offset >= 0;
    if (!error && result && !result.isError && readable) {
      if ((args.source_commit && (!data.source || data.source.commit !== args.source_commit)) ||
          (args.script && (data.script || 'roman') !== args.script) ||
          (args.book && data.book_id !== args.book) ||
          (args.uid && data.text_id !== args.uid && data.citation !== args.uid) ||
          (args.commentary && (data.content_type !== 'commentary' || (data.context_for !== args.commentary && data.citation !== args.commentary && !(data.requested_on && data.requested_on.id === args.commentary)))) ||
          (args.context > 0 && data.context_for !== (args.segment || args.commentary)) ||
          (args.english_offset > 0 && data.english && data.english.translation_id !== args.translation)) {
        error = new Error('The host returned a different source, selection, script or translation version. Ask to reopen the selection.');
      }
    }
    if (error) render({ error: error.message || String(error) });
    else if (!result || (!result.isError && !readable)) render({ error: 'The host did not return a readable passage. Ask to reopen the selection.' });
    else toolResult(result);
    navigation();
    var title = document.getElementById('title'); if (typeof title.focus === 'function') title.focus();
  }
  function navigate(command) {
    if (pending || awaitingSelection || !canNavigate()) return;
    var call = { id: requestId++, generation: generation, command: command }; pending = call;
    document.getElementById('navigation').setAttribute('aria-busy', 'true'); navigation();
    document.getElementById('status').textContent = 'Loading the requested passage…';
    wantModelContext(vacantContext('loading'));
    call.timer = setTimeout(function () { finish(call, null, new Error('The host did not respond. Ask to reopen the selection.')); }, 30000);
    try {
      if (serverTools) post({ jsonrpc: '2.0', id: call.id, method: 'tools/call', params: command });
      else if (window.openai && typeof window.openai.callTool === 'function') {
        Promise.resolve(window.openai.callTool(command.name, command.arguments)).then(function (result) { finish(call, result); }, function (error) { finish(call, null, error); });
      }
    } catch (error) { finish(call, null, error); }
  }
  function post(msg) { try { window.parent.postMessage(msg, '*'); } catch (e) {} }
  function openLink(url) {
    if (window.openai && typeof window.openai.openExternal === 'function') { window.openai.openExternal({ href: url }); return; }
    post({ jsonrpc: '2.0', id: Date.now(), method: 'ui/open-link', params: { url: url } });
  }
  function link(url, text) {
    if (typeof url !== 'string' || !/^https:\\/\\//.test(url)) return el('span', '', text);
    var a = el('a', '', text); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.addEventListener('click', function (ev) { ev.preventDefault(); openLink(url); });
    return a;
  }
  function setTheme(theme) { if (theme === 'dark' || theme === 'light') document.documentElement.setAttribute('data-theme', theme); }
  function characterPosition(at, total) { return 'character ' + at + (typeof total === 'number' && Number.isFinite(total) ? ' of ' + total : ''); }
  function render(d) {
    if (!d || typeof d !== 'object' || d === rendered) return;
    if (!d.pali && typeof d.error !== 'string') return;
    abandon(); generation++; awaitingSelection = false;
    if (!d.pali) {
      if (typeof d.error !== 'string') return;
      rendered = d;
      document.getElementById('title').textContent = 'Could not open the passage';
      document.getElementById('status').textContent = 'Could not open the passage. ' + d.error;
      ['meta', 'pali', 'english', 'footer'].forEach(function (id) { clear(document.getElementById(id)); });
      document.getElementById('pali').appendChild(el('p', 'empty', d.error));
      document.getElementById('english').appendChild(el('p', 'empty', 'Check the citation and ask to open the passage again.'));
      navigation();
      wantModelContext(readingContext(d));
      return;
    }
    rendered = d;
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
    });
    if (d.pali.next_offset != null) pali.appendChild(el('p', 'note', 'Showing ' + d.pali.returned + ' of ' + d.pali.total_segments + ' segments. Ask for more to continue from segment ' + d.pali.next_offset + '.'));
    if (d.pali.context_with) pali.appendChild(el('p', 'note', 'Ask for surrounding Pāli to read this passage in its source context.'));
    if (d.pali.exact_with) pali.appendChild(el('p', 'note', 'Ask to return to the exact selected segment.'));

    var en = document.getElementById('english'); clear(en);
    if (d.english) {
      (d.english.notes || []).forEach(function (n) { en.appendChild(el('p', 'note', n)); });
      var head = el('p', 'note');
      head.appendChild(document.createTextNode((d.english.translator || 'Translator not stated') + (d.english.reference ? ' (' + d.english.reference + ')' : '') + ' · '));
      head.appendChild(link(d.english.url, d.english.source || d.english.url));
      en.appendChild(head);
      en.appendChild(el('div', 'en', d.english.text || ''));
      if (d.english.offset) en.insertBefore(el('p', 'note', 'Continuing from ' + characterPosition(d.english.offset, d.english.total_characters) + '.'), en.lastChild);
      if (d.english.truncated) en.appendChild(el('p', 'note', 'The translation continues (' + characterPosition(d.english.next_offset, d.english.total_characters) + '). Ask for more to continue, or read the rest on the source page.'));
    } else {
      en.appendChild(el('p', 'empty', d.english_error || 'No English translation requested.'));
    }

    var f = document.getElementById('footer'); clear(f);
    f.appendChild(el('p', '', 'Pāli: ' + (d.pali.edition || '') + '. ' + (d.pali.attribution || '') + ' ' + (d.pali.license || '')));
    if (d.english) f.appendChild(el('p', '', 'English: ' + (d.english.attribution || '') + ' ' + (d.english.license || '')));
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
    if (window.openai) {
      setTheme(window.openai.theme);
      var input = JSON.stringify(window.openai.toolInput || null);
      if (lastInput !== input && rendered && window.openai.toolInput) requested(window.openai.toolInput);
      lastInput = input;
      var metadata = window.openai.toolResponseMetadata;
      var output = window.openai.toolOutput, freshOutput = output !== lastOutput, freshMetadata = metadata !== lastMetadata;
      lastOutput = output; lastMetadata = metadata;
      var result = metadata && (metadata.mcp_tool_result || metadata.call_tool_result);
      if (result && result.isError && (freshMetadata || !freshOutput)) {
        if (freshMetadata || freshOutput) toolResult(result);
      } else if (freshOutput) render(output);
      else if (freshMetadata && result && result.structuredContent) toolResult(result);
    }
  }
  function requested(args) {
    function ordered(value) { return JSON.stringify(Object.keys(value || {}).sort().map(function (key) { return [key, value[key]]; })); }
    if (pending && ordered(args) === ordered(pending.command.arguments)) return;
    abandon(); generation++; awaitingSelection = true;
    document.getElementById('navigation').setAttribute('aria-busy', 'true'); navigation();
    document.getElementById('status').textContent = 'Opening the requested passage…';
    wantModelContext(vacantContext('loading'));
  }
  window.addEventListener('openai:set_globals', fromOpenai);
  // MCP Apps bridge path (JSON-RPC over postMessage).
  window.addEventListener('message', function (ev) {
    if (ev.source !== window.parent) return;
    var m = ev.data; if (!m || m.jsonrpc !== '2.0') return;
    if (m.id === 1 && m.result) {
      modelCapabilities = m.result.hostCapabilities && m.result.hostCapabilities.updateModelContext; pumpModelContext();
      serverTools = !!(m.result.hostCapabilities && m.result.hostCapabilities.serverTools); navigation();
      if (m.result.hostContext) setTheme(m.result.hostContext.theme);
      post({ jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} });
    } else if (modelFlight && m.id === modelFlight.id && (m.result || m.error)) {
      modelReply(m);
    } else if (pending && m.id === pending.id && (m.result || m.error)) {
      finish(pending, m.result, m.error && new Error(m.error.message || 'The host refused the navigation request.'));
    } else if (m.method === 'ui/notifications/tool-result') {
      toolResult(m.params);
    } else if (m.method === 'ui/notifications/tool-input') {
      requested(m.params && m.params.arguments);
    } else if (m.method === 'ui/notifications/host-context-changed') {
      setTheme(m.params && m.params.theme);
    }
  });
  post({ jsonrpc: '2.0', id: 1, method: 'ui/initialize', params: { protocolVersion: '2026-01-26', clientInfo: { name: 'pali-canon-reader', version: '${WIDGET_VERSION}' }, appCapabilities: { availableDisplayModes: ['inline', 'fullscreen'] } } });
  fromOpenai();
})();
</script>
</body>
</html>
`;
