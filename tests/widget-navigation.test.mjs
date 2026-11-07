import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { WIDGET_HTML, TOOL_META } from '../src/chatgpt-widget.mjs';

class Element {
  constructor(tag = '') { this.tagName = tag; this.children = []; this.value = ''; this.attributes = {}; this.listeners = {}; }
  set textContent(value) { this.value = String(value); this.children = []; }
  get textContent() { return this.value + this.children.map(c => c.textContent).join(''); }
  get firstChild() { return this.children[0]; }
  get lastChild() { return this.children.at(-1); }
  appendChild(child) { this.children.push(child); return child; }
  removeChild(child) { this.children.splice(this.children.indexOf(child), 1); return child; }
  insertBefore(child, before) { this.children.splice(this.children.indexOf(before), 0, child); return child; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  focus() { this.focused = true; }
  click() { if (!this.disabled) this.listeners.click?.(); }
}
const commit = '1'.repeat(40);
const command = args => ({ name: 'read_passage_widget', arguments: { uid: 'mn10', source_commit: commit, script: 'thai', english: false, ...args } });
const fixture = (label = 'first') => ({
  citation: 'MN 10', text_id: 'mn10', source: { commit }, script: 'thai', title: label, notes: [],
  pali: { attribution: 'Fixture credit', license: 'Fixture terms', segments: [{ ref: 'mn10/1', text: `${label} fixture` }],
    offset: 0, returned: 1, total_segments: 10, next_offset: 1, continue_with: command({ offset: 1, limit: 1 }) },
  english: null, links: {},
});
const settle = () => new Promise(resolve => setImmediate(resolve));

function view(bridge, { supported = true } = {}) {
  const elements = Object.fromEntries(['title', 'meta', 'pali', 'english', 'footer', 'status', 'navigation'].map(id => [id, new Element()]));
  const handlers = {}, calls = [], messages = [], timers = new Map(); let timer = 0;
  const parent = { postMessage(m) { messages.push(m); if (m.method === 'tools/call') calls.push(m); } };
  const window = { parent, addEventListener(name, cb) { handlers[name] = cb; } };
  if (bridge === 'Apps SDK') window.openai = supported ? { callTool(name, args) { return new Promise((resolve, reject) => calls.push({ name, arguments: args, resolve, reject })); } } : {};
  const document = { documentElement: new Element(), getElementById: id => elements[id], createElement: tag => new Element(tag), createTextNode: text => { const e = new Element(); e.textContent = text; return e; } };
  runInNewContext(WIDGET_HTML.match(/<script>([^]*?)<\/script>/)[1], {
    window, document, Date, setTimeout(cb) { timers.set(++timer, cb); return timer; }, clearTimeout(id) { timers.delete(id); },
  });
  const message = data => handlers.message({ source: parent, data: { jsonrpc: '2.0', ...data } });
  if (bridge === 'MCP Apps') message({ id: 1, result: { hostCapabilities: supported ? { serverTools: {} } : {} } });
  return { elements, calls, timers, messages, window,
    output(data) {
      if (bridge === 'Apps SDK') { window.openai.toolOutput = data; handlers['openai:set_globals'](); }
      else message({ method: 'ui/notifications/tool-result', params: { structuredContent: data } });
    },
    globals(data, metadata) { window.openai.toolOutput = data; window.openai.toolResponseMetadata = metadata; handlers['openai:set_globals'](); },
    refresh() { handlers['openai:set_globals'](); },
    reply(index, result) { const c = calls[index]; if (bridge === 'Apps SDK') c.resolve(result); else message({ id: c.id, result }); },
    reject(index, text) { const c = calls[index]; if (bridge === 'Apps SDK') c.reject(Error(text)); else message({ id: c.id, error: { code: -1, message: text } }); },
    input(args) { if (bridge === 'Apps SDK') { window.openai.toolInput = args; handlers['openai:set_globals'](); } else message({ method: 'ui/notifications/tool-input', params: { arguments: args } }); },
    click(label) { const button = elements.navigation.children.find(c => c.textContent === label); assert.ok(button, label); button.click(); return button; },
    timeout() { for (const cb of [...timers.values()]) cb(); },
  };
}

test('Apps SDK theme/global updates retain local navigation and fresh output recovers past stale error metadata', async () => {
  const ui = view('Apps SDK'); ui.output(fixture()); ui.click('Continue Pāli');
  ui.reply(0, { structuredContent: fixture('locally navigated') }); await settle();
  ui.window.openai.theme = 'dark'; ui.refresh();
  assert.match(ui.elements.pali.textContent, /locally navigated fixture/);
  const metadata = { call_tool_result: { isError: true, content: [{ type: 'text', text: 'Host error fixture' }] } };
  ui.globals(undefined, metadata); assert.match(ui.elements.pali.textContent, /Host error fixture/);
  ui.globals(fixture('recovered'), metadata);
  assert.match(ui.elements.pali.textContent, /recovered fixture/);
  ui.refresh(); assert.match(ui.elements.pali.textContent, /recovered fixture/);
});

test('widget exposes navigation only when a supported bridge can call the reader', () => {
  assert.equal(TOOL_META['openai/widgetAccessible'], true);
  assert.deepEqual(TOOL_META.ui.visibility, ['model', 'app']);
  for (const bridge of ['MCP Apps', 'Apps SDK']) {
    const ui = view(bridge, { supported: false }); ui.output(fixture());
    assert.equal(ui.elements.navigation.children.length, 0); assert.equal(ui.calls.length, 0);
    const supported = view(bridge), data = fixture();
    data.pali.continue_with = { name: 'some_other_tool', arguments: {} }; supported.output(data);
    assert.equal(supported.elements.navigation.children.length, 0);
  }
});

for (const bridge of ['MCP Apps', 'Apps SDK']) {
  test(`${bridge}: direct controls forward complete pinned commands and restore focus after async success`, async () => {
    const ui = view(bridge); const data = fixture();
    data.pali.context_with = command({ segment: 'mn10/1', context: 2, anchor_sha256: '2'.repeat(64) });
    data.pali.exact_with = command({ segment: 'mn10/1', anchor_sha256: '2'.repeat(64) });
    data.english = { text: 'Synthetic English', continue_with: command({ english: true, english_offset: 6000, translation: 'dt:mn010' }) };
    ui.output(data);
    assert.equal(ui.elements.navigation.children.length, 4);
    ui.click('Continue Pāli'); ui.click('Continue English');
    assert.equal(ui.calls.length, 1); assert.ok(ui.elements.navigation.children.filter(b => b.tagName === 'button').every(b => b.disabled));
    const sent = bridge === 'Apps SDK' ? { name: ui.calls[0].name, arguments: ui.calls[0].arguments } : ui.calls[0].params;
    assert.equal(JSON.stringify(sent), JSON.stringify(data.pali.continue_with));
    assert.equal(ui.elements.navigation.attributes['aria-busy'], 'true');
    ui.input(data.pali.continue_with.arguments);
    assert.equal(ui.elements.navigation.attributes['aria-busy'], 'true');
    assert.equal(ui.timers.size, 1);
    ui.reply(0, { structuredContent: fixture('next') }); await settle();
    assert.match(ui.elements.pali.textContent, /next fixture/); assert.equal(ui.timers.size, 0);
    assert.equal(ui.elements.navigation.attributes['aria-busy'], 'false'); assert.ok(ui.elements.title.focused);
    assert.ok(ui.elements.navigation.children.every(b => !b.disabled));
  });

  test(`${bridge}: late success and rejection cannot replace a newer host selection`, async () => {
    for (const reject of [false, true]) {
      const ui = view(bridge); ui.output(fixture()); const oldButton = ui.click('Continue Pāli');
      ui.output({ ...fixture('newer'), citation: 'MN 1', text_id: 'mn1' });
      oldButton.disabled = false; oldButton.click(); assert.equal(ui.calls.length, 1);
      if (reject) ui.reject(0, 'Late failure'); else ui.reply(0, { structuredContent: fixture('late') });
      await settle(); assert.match(ui.elements.title.textContent, /MN 1/);
      assert.match(ui.elements.pali.textContent, /newer fixture/); assert.doesNotMatch(ui.elements.status.textContent, /Late|late|error/);
      assert.equal(ui.timers.size, 0);
    }
  });

  test(`${bridge}: an announced selection cancels an old request before its replacement arrives`, async () => {
    const ui = view(bridge); ui.output(fixture()); const oldButton = ui.click('Continue Pāli');
    ui.input({ uid: 'mn1' }); assert.match(ui.elements.status.textContent, /Opening/);
    oldButton.disabled = false; oldButton.click(); assert.equal(ui.calls.length, 1);
    assert.equal(ui.elements.navigation.children.filter(b => b.tagName === 'button').length, 0);
    ui.reply(0, { structuredContent: fixture('obsolete') }); await settle();
    assert.doesNotMatch(ui.elements.pali.textContent, /obsolete/);
    const newer = { ...fixture('newer'), citation: 'MN 1', text_id: 'mn1' };
    newer.pali.continue_with = command({ uid: 'mn1', offset: 1 }); ui.output(newer);
    ui.click('Continue Pāli');
    const next = { ...fixture('new next'), citation: 'MN 1', text_id: 'mn1' };
    ui.reply(0, { structuredContent: fixture('obsolete again') }); await settle();
    assert.equal(ui.elements.navigation.attributes['aria-busy'], 'true');
    ui.reply(1, { structuredContent: next }); await settle();
    assert.match(ui.elements.pali.textContent, /new next fixture/); assert.equal(ui.timers.size, 0);
  });

  test(`${bridge}: failed, malformed and timed-out navigation clears stale source text and can recover`, async () => {
    for (const failure of ['reject', 'tool-error', 'malformed', 'invalid-page', 'timeout']) {
      const ui = view(bridge); ui.output(fixture()); ui.click('Continue Pāli');
      if (failure === 'reject') ui.reject(0, '<img src=x> denied fixture');
      else if (failure === 'tool-error') ui.reply(0, { isError: true, content: [{ type: 'text', text: '{"error":"Provider unavailable fixture"}' }] });
      else if (failure === 'malformed') ui.reply(0, { content: [] });
      else if (failure === 'invalid-page') ui.reply(0, { structuredContent: { ...fixture(), pali: {} } });
      else ui.timeout();
      await settle(); assert.match(ui.elements.title.textContent, /Could not open/);
      assert.doesNotMatch(ui.elements.pali.textContent, /first fixture/); assert.equal(ui.elements.footer.textContent, '');
      assert.equal(ui.elements.navigation.children.length, 0); assert.equal(ui.timers.size, 0);
      if (failure === 'timeout') { ui.reply(0, { structuredContent: fixture('too late') }); await settle(); assert.doesNotMatch(ui.elements.pali.textContent, /too late/); }
      ui.output(fixture('recovered')); assert.match(ui.elements.pali.textContent, /recovered fixture/);
    }
  });

  test(`${bridge}: mismatched source, scope, script and English version replies are rejected`, async () => {
    for (const change of ['source', 'uid', 'script', 'english', 'book', 'commentary', 'context']) {
      const ui = view(bridge); const initial = fixture();
      if (change === 'book') { initial.pali.continue_with = { name: 'read_passage_widget', arguments: { book: 'vin02m1', source_commit: commit, script: 'thai' } }; }
      if (change === 'commentary') { initial.pali.continue_with = { name: 'read_passage_widget', arguments: { commentary: 'mn10', source_commit: commit, script: 'thai' } }; }
      if (change === 'context') initial.pali.continue_with = command({ segment: 'mn10/1', context: 2 });
      if (change === 'english') { initial.english = { text: 'Synthetic', continue_with: command({ english: true, english_offset: 6000, translation: 'dt:mn010' }) }; }
      ui.output(initial); ui.click(change === 'english' ? 'Continue English' : 'Continue Pāli');
      const response = fixture('incorrect');
      if (change === 'source') response.source.commit = '0'.repeat(40);
      if (change === 'uid') { response.text_id = 'mn1'; response.citation = 'MN 1'; }
      if (change === 'script') response.script = 'roman';
      if (change === 'english') response.english = { text: 'Wrong version', translation_id: 'ati:mn010' };
      ui.reply(0, { structuredContent: response }); await settle();
      assert.match(ui.elements.pali.textContent, /different source, selection, script or translation version/);
      assert.doesNotMatch(ui.elements.pali.textContent, /incorrect fixture|Wrong version/);
    }
  });
}
