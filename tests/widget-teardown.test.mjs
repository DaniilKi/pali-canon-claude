import { test } from 'node:test';
import assert from 'node:assert/strict';
import { view, fixture, settle } from './helpers/widget-view.mjs';

const close = (ui, id = 'close') => ui.request(id, 'ui/resource-teardown', { reason: 'Private teardown reason fixture' });
const reply = (ui, id) => ui.messages.find(m => m.id === id && m.result);
const closed = ui => {
  assert.equal(ui.elements.title.textContent, 'Reader closed');
  for (const id of ['pali', 'english', 'meta', 'footer', 'navigation']) assert.equal(ui.elements[id].textContent, '');
  assert.equal(ui.elements.navigation.attributes['aria-busy'], 'false');
  assert.equal(ui.timers.size, 0);
  assert.match(ui.elements['context-status'].textContent, /has not been verified/);
};

for (const bridge of ['MCP Apps', 'Apps SDK']) {
  test(`${bridge}: teardown acknowledges numeric/string IDs, is repeatable and terminal even before initial data`, () => {
    const ui = view(bridge); close(ui, 0); closed(ui);
    assert.equal(JSON.stringify(reply(ui, 0)), '{"jsonrpc":"2.0","id":0,"result":{}}');
    close(ui, 'again'); assert.ok(reply(ui, 'again')); closed(ui);
    const count = ui.messages.length;
    ui.output(fixture()); ui.input({ uid: 'mn1' }); ui.timeout();
    assert.equal(ui.messages.length, count); closed(ui);
  });

  test(`${bridge}: pending reads, detached controls and late success/rejection cannot revive a closed reader`, async () => {
    for (const reject of [false, true]) {
      const ui = view(bridge); ui.output(fixture()); const button = ui.click('Continue Pāli');
      assert.equal(ui.timers.size, 1); close(ui); closed(ui);
      const count = ui.messages.length;
      if (reject) ui.reject(0, 'Late teardown failure'); else ui.reply(0, { structuredContent: fixture('late') });
      await settle(); button.disabled = false; button.click(); ui.output(fixture('newer')); ui.timeout();
      assert.equal(ui.calls.length, 1); assert.equal(ui.messages.length, count); closed(ui);
    }
  });

  test(`${bridge}: actual page removal closes the reader while a cache-preserving pagehide does not`, () => {
    const ui = view(bridge); ui.output(fixture()); ui.pagehide(true);
    assert.match(ui.elements.pali.textContent, /first fixture/);
    ui.pagehide(false); closed(ui);
    ui.output(fixture('late')); closed(ui);
  });
}

test('untrusted frames cannot request teardown; notifications without an ID receive no response', () => {
  const ui = view('MCP Apps'); ui.output(fixture());
  ui.foreign({ method: 'ui/resource-teardown', id: 42, params: {} });
  assert.match(ui.elements.pali.textContent, /first fixture/); assert.equal(reply(ui, 42), undefined);
  const count = ui.messages.length;
  ui.notify('ui/resource-teardown'); closed(ui); assert.equal(ui.messages.length, count);
});

test('an idle acknowledged context receives one best-effort closed snapshot before teardown acknowledgement', () => {
  for (const modality of ['structuredContent', 'text']) {
    const ui = view('MCP Apps', { modelCapabilities: { [modality]: {} } }); ui.output(fixture()); ui.contextReply(0);
    close(ui); closed(ui); assert.equal(ui.models.length, 2);
    const update = ui.models[1];
    const context = modality === 'text' ? JSON.parse(update.params.content[0].text).pali_reader : update.params.structuredContent.pali_reader;
    assert.equal(context.state, 'closed'); assert.equal(context.pali, undefined); assert.equal(context.source, undefined);
    assert.ok(ui.messages.indexOf(update) < ui.messages.indexOf(reply(ui, 'close')));
    const count = ui.messages.length; ui.contextReply(1); ui.output(fixture()); ui.timeout();
    assert.equal(ui.messages.length, count); closed(ui);
  }
});

test('in-flight, timed-out or rejected context is not overwritten through a second route during closure', () => {
  for (const state of ['in-flight', 'timeout', 'rejected']) {
    const ui = view('MCP Apps', { modelCapabilities: { structuredContent: {} }, stateWriter: true }); ui.output(fixture());
    if (state === 'timeout') ui.timeout();
    if (state === 'rejected') ui.contextReply(0, {}, { code: -1, message: 'Rejected fixture' });
    close(ui); closed(ui); assert.equal(ui.models.length, 1); assert.equal(ui.stateUpdates.length, 0);
    const count = ui.messages.length; ui.contextReply(0); ui.timeout();
    assert.equal(ui.messages.length, count); closed(ui);
  }
});

test('legacy closure stores only a closed snapshot when idle and still acknowledges setter failure', async () => {
  for (const fail of ['none', 'throw', 'reject', 'resolve']) {
    let writes = 0;
    const ui = view('Apps SDK', { stateWriter: () => {
      writes++;
      if (writes > 1 && fail === 'throw') throw Error('Fixture close failure');
      if (writes > 1 && fail === 'reject') return Promise.reject(Error('Fixture asynchronous close failure'));
      if (writes > 1 && fail === 'resolve') return Promise.resolve();
    } });
    ui.output(fixture()); close(ui); closed(ui); assert.ok(reply(ui, 'close'));
    assert.equal(ui.stateUpdates.length, 2);
    assert.equal(JSON.parse(ui.stateUpdates[1].modelContent).pali_reader.state, 'closed');
    ui.refresh(); await settle(); assert.equal(ui.stateUpdates.length, 2); closed(ui);
  }
});

test('a queued legacy publication cannot run after teardown acknowledgement', async () => {
  let ui;
  ui = view('Apps SDK', { stateWriter: () => { if (ui.stateUpdates.length === 1) ui.output({ ...fixture('newer'), citation: 'MN 1', text_id: 'mn1' }); } });
  ui.output(fixture()); close(ui); await settle();
  assert.equal(ui.stateUpdates.length, 2); assert.equal(JSON.parse(ui.stateUpdates[1].modelContent).pali_reader.state, 'closed');
  assert.ok(reply(ui, 'close')); closed(ui);
});

test('reentrant teardown during context publication cannot dispatch a read or revive queued publication', async () => {
  let ui;
  ui = view('Apps SDK', { stateWriter: state => {
    if (JSON.parse(state.modelContent).pali_reader.state === 'loading') close(ui);
  } });
  ui.output(fixture()); ui.click('Continue Pāli'); await settle();
  assert.equal(ui.calls.length, 0); assert.equal(ui.stateUpdates.length, 2); assert.ok(reply(ui, 'close')); closed(ui);
});

test('teardown during publication of a read result prevents subsequent focus and UI work', async () => {
  let ui;
  ui = view('Apps SDK', { stateWriter: () => { if (ui.stateUpdates.length === 3) close(ui); } });
  ui.output(fixture()); ui.click('Continue Pāli');
  ui.reply(0, { structuredContent: fixture('next') }); await settle();
  assert.ok(reply(ui, 'close')); assert.notEqual(ui.elements.title.focused, true);
  assert.equal(ui.stateUpdates.length, 3); closed(ui);
});
