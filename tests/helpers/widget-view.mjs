import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { WIDGET_HTML } from '../../src/chatgpt-widget.mjs';

export class Element {
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
export const commit = '1'.repeat(40);
export const command = args => ({ name: 'read_passage_widget', arguments: { uid: 'mn10', source_commit: commit, script: 'thai', english: false, ...args } });
export const fixture = (label = 'first') => ({
  canonical: true, citation: 'MN 10', text_id: 'mn10', source: { commit }, script: 'thai', title: label, notes: [],
  pali: { attribution: 'Fixture credit', license: 'Fixture terms', segments: [{ ref: 'mn10/1', text: `${label} fixture` }],
    offset: 0, returned: 1, total_segments: 10, next_offset: 1, continue_with: command({ offset: 1, limit: 1 }) },
  english: null, links: {},
});
export const settle = () => new Promise(resolve => setImmediate(resolve));

export function view(bridge, { supported = true, modelCapabilities, stateWriter, initialize = true, sizingRuntime, openLinks = true, html = WIDGET_HTML } = {}) {
  const elements = Object.fromEntries(['title', 'meta', 'pali', 'english', 'footer', 'status', 'navigation', 'context-status', 'link-status'].map(id => [id, new Element()]));
  const handlers = {}, calls = [], messages = [], models = [], stateUpdates = [], timers = new Map(), deadlines = new Map(); let timer = 0, now = 0;
  const parent = { postMessage(m) { messages.push(m); if (m.method === 'tools/call') calls.push(m); if (m.method === 'ui/update-model-context') models.push(m); } };
  const window = { parent, addEventListener(name, cb) { handlers[name] = cb; } };
  if (bridge === 'Apps SDK') window.openai = supported ? { callTool(name, args) { return new Promise((resolve, reject) => calls.push({ name, arguments: args, resolve, reject })); } } : {};
  if (stateWriter) { window.openai ||= {}; window.openai.setWidgetState = state => { stateUpdates.push(state); if (typeof stateWriter === 'function') return stateWriter(state); }; }
  if (sizingRuntime) Object.assign(window, sizingRuntime);
  const document = { body: sizingRuntime && sizingRuntime.body, documentElement: new Element(), getElementById: id => elements[id], createElement: tag => new Element(tag), createTextNode: text => { const e = new Element(); e.textContent = text; return e; } };
  runInNewContext(html.match(/<script>([^]*?)<\/script>/)[1], {
    window, document, Date, setTimeout(cb, ms) { timers.set(++timer, cb); deadlines.set(timer, now + ms); return timer; }, clearTimeout(id) { timers.delete(id); deadlines.delete(id); },
  });
  const message = data => handlers.message({ source: parent, data: { jsonrpc: '2.0', ...data } });
  const init = caps => message({ id: 1, result: { hostCapabilities: { ...(supported ? { serverTools: {} } : {}), ...(openLinks ? { openLinks: {} } : {}), ...(caps === undefined ? {} : { updateModelContext: caps }) } } });
  if (bridge === 'MCP Apps' && initialize) init(modelCapabilities);
  return { elements, calls, timers, messages, models, stateUpdates, window, initialize: init,
    notify(method, params = {}) { message({ method, params }); },
    response(id, result = {}, error) { message({ id, ...(error ? { error } : { result }) }); },
    request(id, method, params = {}) { message({ id, method, params }); },
    resize() { handlers.resize(); },
    pagehide(persisted = false) { handlers.pagehide({ persisted }); },
    foreign(data) { handlers.message({ source: {}, data: { jsonrpc: '2.0', ...data } }); },
    contextReply(index, result = {}, error) { message({ id: models[index].id, ...(error ? { error } : { result }) }); },
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
    advance(ms) { const end = now + ms; for (;;) { const next = [...deadlines].filter(([id, due]) => timers.has(id) && due <= end).sort((a,b) => a[1]-b[1])[0]; if (!next) break; const [id, due] = next, cb = timers.get(id); now = due; timers.delete(id); deadlines.delete(id); cb(); } now = end; },
  };
}

