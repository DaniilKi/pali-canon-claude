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
import * as canon from './canon.mjs';
import * as english from './english.mjs';
import { romanizeInput, inputNote } from './script.mjs';

export const WIDGET_TOOL = 'read_passage_widget';
export const WIDGET_VERSION = 'v2';
export const WIDGET_URI = `ui://pali-canon/reader-${WIDGET_VERSION}.html`;
export const SKYBRIDGE_URI = `ui://pali-canon/reader-${WIDGET_VERSION}.skybridge.html`;
export const MCP_APP_MIME = 'text/html;profile=mcp-app';
export const SKYBRIDGE_MIME = 'text/html+skybridge';

const WIDGET_DESCRIPTION = 'Shows the Pāli text and an English translation side by side, with the citation, PTS page, translator, attribution and licence. Everything shown was retrieved by the tool; nothing is generated.';

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
  ui: { resourceUri: WIDGET_URI },
  'openai/outputTemplate': SKYBRIDGE_URI,
  'openai/toolInvocation/invoking': 'Opening the passage…',
  'openai/toolInvocation/invoked': 'Reader updated.',
};

/** Data for the widget: Pāli segments (VRI) plus one English translation, each with its attribution. */
export async function readPassage({ uid, translation, english: wantEnglish = true, offset = 0, limit = 40, english_offset: englishOffset = 0, englishCharacters = 6000 }) {
  const input = romanizeInput(uid);
  const { unit, notes } = canon.resolve(input.text);
  const described = canon.describe(unit, notes);
  const all = canon.segments(unit);
  const page = all.slice(offset, offset + limit);
  const vri = canon.source();
  const result = {
    text_id: unit.id, ...inputNote(input),
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
        continue_with: t.next_offset !== null ? {
          name: WIDGET_TOOL,
          arguments: { uid: unit.id, translation: t.translation_id, english: true, offset, limit, english_offset: t.next_offset },
        } : null,
      };
    } catch (error) {
      result.english_error = error.message;
    }
  } else if (wantEnglish) {
    result.english_error = `No English translation is linked for ${unit.acronym}. The Pāli is shown on its own; see ${described.links.suttacentral} for other translations.`;
  }
  return result;
}

/** Register the widget tool and its two UI templates on an McpServer. Called by the HTTP entry only. */
export function registerChatgptWidget(server) {
  for (const [name, uri, mimeType] of [['reader-widget', WIDGET_URI, MCP_APP_MIME], ['reader-widget-skybridge', SKYBRIDGE_URI, SKYBRIDGE_MIME]]) {
    server.registerResource(name, uri, { mimeType, description: WIDGET_DESCRIPTION, _meta: RESOURCE_META },
      async (u) => ({ contents: [{ uri: u.href, mimeType, text: WIDGET_HTML, _meta: RESOURCE_META }] }));
  }
  server.registerTool(WIDGET_TOOL, {
    title: 'Read a passage (Pāli and English)',
    description: 'Show an individual text in a reading view: Pāli (VRI) and one English translation, with citation, PTS page, translator, attribution and licence. Use when the user wants to read a sutta or passage. Accepts individual citations in supported scripts and source links; displayed text stays Roman. The Pāli works offline; English is fetched live. For English continuation use the exact english.continue_with arguments from the previous result.',
    inputSchema: {
      uid: z.string().min(1).max(300).describe('Any citation: MN 10, SN 56:11, AN 3.65, Dhp 183, Snp 1.8, a PTS page such as M i 55, or a suttacentral.net / accesstoinsight.org / dhammatalks.org link.'),
      translation: z.string().max(200).optional().describe('At the start: "default", a translation_id from get_metadata, or a translator name; omit for default. For non-zero english_offset, use the exact translation_id returned by the previous result.'),
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
  .seg { margin:0 0 10px; white-space:pre-wrap; }
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
  .empty { color:var(--muted); font-style:italic; }
  @media (max-width: 640px) { .cols { grid-template-columns:1fr; } .col + .col { border-left:0; border-top:1px solid var(--line); } }
</style>
</head>
<body>
<header><h1 id="title">Loading the passage…</h1><div class="meta" id="meta"></div></header>
<main class="cols">
  <section class="col" aria-labelledby="pali-h"><h2 id="pali-h">Pāli</h2><div id="pali"></div></section>
  <section class="col" aria-labelledby="en-h"><h2 id="en-h">English</h2><div id="english"></div></section>
</main>
<footer id="footer"></footer>
<script>
(function () {
  var rendered = null;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
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
    if (!d.pali) {
      if (typeof d.error !== 'string') return;
      rendered = d;
      document.getElementById('title').textContent = 'Could not open the passage';
      ['meta', 'pali', 'english', 'footer'].forEach(function (id) { clear(document.getElementById(id)); });
      document.getElementById('pali').appendChild(el('p', 'empty', d.error));
      document.getElementById('english').appendChild(el('p', 'empty', 'Check the citation and ask to open the passage again.'));
      return;
    }
    rendered = d;
    document.getElementById('title').textContent = (d.citation || '') + (d.title ? ' · ' + d.title : '');
    var meta = document.getElementById('meta'); clear(meta);
    if (d.collection) meta.appendChild(el('span', 'chip', d.collection));
    if (d.pts) meta.appendChild(el('span', 'chip', 'PTS ' + d.pts));
    if (d.vri_paragraphs) meta.appendChild(el('span', 'chip', 'VRI ¶ ' + d.vri_paragraphs));
    if (d.english && d.english.translator) meta.appendChild(el('span', 'chip', 'Tr. ' + d.english.translator));
    if (d.approximate) meta.appendChild(el('span', 'chip', 'abbreviated in the edition'));

    var pali = document.getElementById('pali'); clear(pali);
    (d.notes || []).forEach(function (n) { pali.appendChild(el('p', 'note', n)); });
    (d.pali.segments || []).forEach(function (s) {
      var p = el('p', 'seg ' + (s.type || 'prose'));
      (s.pts_page_begins || []).forEach(function (pg) { p.appendChild(el('span', 'pts', pg)); });
      if (s.vri_paragraph) p.appendChild(el('span', 'vri', '¶' + s.vri_paragraph));
      p.appendChild(document.createTextNode(s.text || ''));
      pali.appendChild(p);
    });
    if (d.pali.next_offset != null) pali.appendChild(el('p', 'note', 'Showing ' + d.pali.returned + ' of ' + d.pali.total_segments + ' segments. Ask for more to continue from segment ' + d.pali.next_offset + '.'));

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
    var sc = el('p', ''); sc.appendChild(document.createTextNode('Parallels and other translations: ')); sc.appendChild(link(d.links && d.links.suttacentral, 'SuttaCentral')); f.appendChild(sc);
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
      var metadata = window.openai.toolResponseMetadata;
      var result = metadata && (metadata.mcp_tool_result || metadata.call_tool_result);
      if (result && result.isError) toolResult(result); else render(window.openai.toolOutput);
    }
  }
  window.addEventListener('openai:set_globals', fromOpenai);
  // MCP Apps bridge path (JSON-RPC over postMessage).
  window.addEventListener('message', function (ev) {
    if (ev.source !== window.parent) return;
    var m = ev.data; if (!m || m.jsonrpc !== '2.0') return;
    if (m.id === 1 && m.result) {
      if (m.result.hostContext) setTheme(m.result.hostContext.theme);
      post({ jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} });
    } else if (m.method === 'ui/notifications/tool-result') {
      toolResult(m.params);
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
