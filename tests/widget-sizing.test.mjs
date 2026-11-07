import { test } from 'node:test';
import assert from 'node:assert/strict';
import { view, fixture, settle } from './helpers/widget-view.mjs';
function layout({ observer = true, notify } = {}) {
  let height = 180.2, callback, disconnected = false, next = 0;
  const frames = new Map();
  const runtime = { body: { getBoundingClientRect: () => ({ height }) },
    requestAnimationFrame(cb) { frames.set(++next, cb); return next; }, cancelAnimationFrame(id) { frames.delete(id); },
    ...(observer ? { ResizeObserver: class { constructor(cb) { callback = cb; } observe() {} disconnect() { disconnected = true; } } } : {}),
    ...(notify ? { openai: { notifyIntrinsicHeight: notify } } : {}),
  };
  return { runtime, frames, height(value) { height = value; }, resize() { callback?.(); }, get disconnected() { return disconnected; },
    flush() { const callbacks = [...frames.values()]; frames.clear(); for (const cb of callbacks) cb(); } };
}
const heights = ui => ui.messages.filter(m => m.method === 'ui/notifications/size-changed').map(m => m.params);
test('MCP sizes only after initialization, coalesces frames, reports height only and allows shrinkage', () => {
  const l = layout(); const ui = view('MCP Apps', { initialize: false, sizingRuntime: l.runtime });
  l.resize(); l.flush(); assert.deepEqual(heights(ui), []);
  ui.initialize(); l.flush(); assert.equal(JSON.stringify(heights(ui)), '[{"height":181}]');
  l.height(900); l.resize(); l.resize(); assert.equal(l.frames.size, 1); l.flush();
  l.resize(); l.flush(); assert.equal(heights(ui).length, 2, 'equal heights deduplicate');
  l.height(70.1); l.resize(); l.flush(); assert.equal(heights(ui).at(-1).height, 71);
  for (const invalid of [0, -1, NaN, Infinity]) { l.height(invalid); l.resize(); l.flush(); }
  assert.equal(heights(ui).length, 3); assert.equal(ui.calls.length, 0);
});
test('teardown cancels scheduled frame, disconnects observer and prevents all later publications', () => {
  const l = layout(); const ui = view('MCP Apps', { sizingRuntime: l.runtime });
  assert.equal(l.frames.size, 1); ui.request(0, 'ui/resource-teardown');
  assert.equal(l.frames.size, 0); assert.equal(l.disconnected, true);
  l.height(500); l.resize(); ui.resize(); l.flush(); assert.deepEqual(heights(ui), []);
  ui.output(fixture()); assert.equal(ui.elements.title.textContent, 'Reader closed');
});
test('legacy sizing uses one detected route; resize failures do not disable source reading or retry through MCP', async () => {
  for (const asyncFailure of [false, true]) {
    let calls = 0;
    const l = layout({ notify() { calls++; if (asyncFailure) return Promise.reject(Error('private sizing failure')); throw Error('private sizing failure'); } });
    const ui = view('Apps SDK', { sizingRuntime: l.runtime }); l.flush(); await settle();
    assert.equal(calls, 1); assert.equal(l.disconnected, true);
    ui.initialize(); ui.output(fixture()); l.height(300); l.resize(); ui.resize(); l.flush(); await settle();
    assert.equal(calls, 1); assert.deepEqual(heights(ui), []); assert.match(ui.elements.pali.textContent, /first fixture/);
    assert.doesNotMatch(ui.elements.status.textContent, /private sizing/);
  }
});
test('without ResizeObserver, explicit reading and viewport updates still measure content', () => {
  const l = layout({ observer: false }); const ui = view('MCP Apps', { sizingRuntime: l.runtime }); l.flush();
  l.height(350); ui.output(fixture()); l.flush(); assert.equal(heights(ui).at(-1).height, 350);
  l.height(190); ui.resize(); l.flush(); assert.equal(heights(ui).at(-1).height, 190);
});
test('cache-preserving pagehide retains sizing; actual removal disconnects it', () => {
  const l = layout(); const ui = view('MCP Apps', { sizingRuntime: l.runtime }); l.flush();
  ui.pagehide(true); l.height(250); l.resize(); l.flush(); assert.equal(heights(ui).at(-1).height, 250);
  ui.pagehide(false); assert.equal(l.disconnected, true); l.height(300); l.resize(); l.flush(); assert.equal(heights(ui).length, 2);
});
test('legacy reports numeric height through its detected API without duplicating MCP reports', () => {
  const sent = []; const l = layout({ notify: height => sent.push(height) });
  const ui = view('Apps SDK', { sizingRuntime: l.runtime }); l.flush();
  ui.initialize(); l.height(400); l.resize(); l.flush();
  assert.deepEqual(sent, [181, 400]); assert.deepEqual(heights(ui), []);
  ui.request('close', 'ui/resource-teardown'); l.height(600); l.resize(); l.flush(); assert.deepEqual(sent, [181, 400]);
});
test('failed observer setup retains explicit viewport measurements and reading', () => {
  const l = layout(); l.runtime.ResizeObserver = class { observe() { throw Error('unsupported observer'); } disconnect() {} };
  const ui = view('MCP Apps', { sizingRuntime: l.runtime }); l.flush();
  l.height(240); ui.resize(); l.flush(); assert.equal(heights(ui).at(-1).height, 240);
  ui.output(fixture()); assert.match(ui.elements.pali.textContent, /first fixture/);
});
