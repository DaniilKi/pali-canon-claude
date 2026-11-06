// Execute the actual self-contained widget script with a minimal DOM/host bridge, without network access.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { WIDGET_HTML } from '../src/chatgpt-widget.mjs';

class Element {
  constructor(tag = '') { this.tagName = tag; this.children = []; this.value = ''; this.attributes = {}; this.listeners = {}; }
  set textContent(value) { this.value = String(value); this.children = []; }
  get textContent() { return this.value + this.children.map((c) => c.textContent).join(''); }
  get firstChild() { return this.children[0]; }
  get lastChild() { return this.children.at(-1); }
  appendChild(child) { this.children.push(child); return child; }
  removeChild(child) { this.children.splice(this.children.indexOf(child), 1); return child; }
  insertBefore(child, before) { this.children.splice(this.children.indexOf(before), 0, child); return child; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
}

function view(output) {
  const elements = Object.fromEntries(['title', 'meta', 'pali', 'english', 'footer'].map((id) => [id, new Element()]));
  const handlers = {};
  const parent = { postMessage() {} };
  const window = { parent, openai: { toolOutput: output, theme: 'light' }, addEventListener(name, callback) { handlers[name] = callback; } };
  const document = {
    documentElement: new Element('html'), getElementById: (id) => elements[id],
    createElement: (tag) => new Element(tag), createTextNode: (text) => { const node = new Element(); node.textContent = text; return node; },
  };
  const script = WIDGET_HTML.match(/<script>([^]*?)<\/script>/)[1];
  runInNewContext(script, { window, document, Date }, { timeout: 1000 });
  return {
    elements,
    globals(data, metadata) { window.openai.toolOutput = data; window.openai.toolResponseMetadata = metadata; handlers['openai:set_globals'](); },
    result(params) { handlers.message({ source: parent, data: { jsonrpc: '2.0', method: 'ui/notifications/tool-result', params } }); },
  };
}

const fixture = () => ({
  citation: 'Fixture 1', title: 'Prior fixture', collection: 'fixture', notes: [],
  pali: { edition: 'Fixture', attribution: 'Fixture credit', license: 'Fixture terms', segments: [{ type: 'prose', text: 'Prior fixture text' }], total_segments: 1, returned: 1, next_offset: null },
  english: null, links: { suttacentral: 'https://suttacentral.net/mn10' },
});

test('an approximate mapping badge does not assert source abbreviation', () => {
  const data = { ...fixture(), approximate: true,
    notes: ['The independent citation location is unverified.'] };
  const ui = view(data);
  assert.match(ui.elements.meta.textContent, /approximate mapping/);
  assert.doesNotMatch(ui.elements.meta.textContent, /abbreviated in the edition/);
  assert.match(ui.elements.pali.textContent, /location is unverified/);
});

test('Apps SDK errors clear the previous passage and source links instead of leaving stale text', () => {
  const ui = view(fixture());
  assert.match(ui.elements.pali.textContent, /Prior fixture text/);
  ui.globals({ error: 'Unknown citation fixture', recovery: 'Check the citation.' });
  assert.doesNotMatch(ui.elements.pali.textContent, /Prior fixture text/);
  assert.match(ui.elements.pali.textContent, /Unknown citation fixture/);
  assert.equal(ui.elements.footer.textContent, '');
  assert.doesNotMatch(ui.elements.title.textContent, /Fixture 1/);
});

test('MCP Apps error envelopes with text-only content clear a previous result', () => {
  const ui = view(fixture());
  ui.result({ isError: true, content: [{ type: 'text', text: JSON.stringify({ error: 'Bridge error fixture' }) }] });
  assert.match(ui.elements.pali.textContent, /Bridge error fixture/);
  assert.doesNotMatch(ui.elements.pali.textContent, /Prior fixture/);
  assert.equal(ui.elements.footer.textContent, '');
});

test('Apps SDK full-result metadata exposes errors even without structured tool output', () => {
  for (const field of ['mcp_tool_result', 'call_tool_result']) {
    const ui = view(fixture());
    ui.globals(undefined, { [field]: { isError: true, content: 'Metadata error fixture' } });
    assert.match(ui.elements.pali.textContent, /Metadata error fixture/);
    assert.doesNotMatch(ui.elements.pali.textContent, /Prior fixture/);
    assert.equal(ui.elements.footer.textContent, '');
  }
});

test('an error is displayed as plain text and a subsequent valid passage can render', () => {
  const ui = view(fixture());
  ui.result({ isError: true, structuredContent: { error: '<img src=x> fixture error' } });
  assert.match(ui.elements.pali.textContent, /<img src=x> fixture error/);
  assert.equal(ui.elements.pali.children.some((node) => node.tagName === 'img'), false);
  ui.globals(fixture());
  assert.match(ui.elements.title.textContent, /Fixture 1/);
  assert.match(ui.elements.pali.textContent, /Prior fixture text/);
});

test('unknown multi-page translation totals never render literal null as a character count', () => {
  const data = fixture();
  data.english = { translator: 'Fixture translator', source: 'Fixture source', url: 'https://ancient-buddhist-texts.net/Texts-and-Translations/fixture.htm', text: 'Continuation fixture', offset: 6000, next_offset: 12000, total_characters: null, truncated: true };
  const ui = view(data);
  assert.match(ui.elements.english.textContent, /6000/);
  assert.match(ui.elements.english.textContent, /12000/);
  assert.doesNotMatch(ui.elements.english.textContent, /null|undefined/);
});
