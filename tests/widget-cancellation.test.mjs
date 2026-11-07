import { test } from 'node:test';
import assert from 'node:assert/strict';
import { view, fixture, settle } from './helpers/widget-view.mjs';

const cancel = ui => ui.notify('ui/notifications/tool-cancelled', { reason: 'Private cancellation reason fixture' });
const lastContext = ui => ui.models.length ? ui.models.at(-1).params.structuredContent.pali_reader : JSON.parse(ui.stateUpdates.at(-1).modelContent).pali_reader;

for (const bridge of ['MCP Apps', 'Apps SDK']) {
  test(`${bridge}: cancellation clears an announced reading and its model-visible source identity`, () => {
    const ui = view(bridge, bridge === 'MCP Apps' ? { modelCapabilities: { structuredContent: {} } } : { stateWriter: true });
    ui.output(fixture()); if (bridge === 'MCP Apps') ui.contextReply(0);
    ui.input({ uid: 'mn1' }); assert.match(ui.elements.status.textContent, /Opening/);
    cancel(ui);
    assert.equal(ui.elements.title.textContent, 'Reading cancelled');
    assert.doesNotMatch(ui.elements.pali.textContent, /first fixture|Private cancellation/);
    assert.equal(ui.elements.footer.textContent, ''); assert.equal(ui.elements.navigation.children.length, 0);
    if (bridge === 'MCP Apps') ui.contextReply(1);
    const context = lastContext(ui);
    assert.equal(context.state, 'cancelled'); assert.equal(context.pali, undefined); assert.equal(context.source, undefined);
    assert.equal(context.text_id, undefined); assert.equal(context.citation, undefined);
    assert.equal(JSON.stringify(context).includes('Private cancellation'), false);
    if (bridge === 'MCP Apps') ui.contextReply(2);
    ui.input({ uid: 'mn10' }); ui.output(fixture('recovered'));
    if (bridge === 'MCP Apps') ui.contextReply(3);
    assert.match(ui.elements.pali.textContent, /recovered fixture/);
    assert.equal(lastContext(ui).state, 'displayed');
  });

  test(`${bridge}: late correlated success or rejection cannot reopen a cancelled navigation`, async () => {
    for (const reject of [false, true]) {
      const ui = view(bridge); ui.output(fixture()); const oldButton = ui.click('Continue Pāli');
      cancel(ui); assert.equal(ui.timers.size, 0);
      oldButton.disabled = false; oldButton.click(); assert.equal(ui.calls.length, 1);
      if (reject) ui.reject(0, 'Late failure'); else ui.reply(0, { structuredContent: fixture('late') });
      await settle(); assert.equal(ui.elements.title.textContent, 'Reading cancelled');
      assert.doesNotMatch(ui.elements.pali.textContent, /late fixture|Late failure/);
      ui.output(fixture('fresh')); cancel(ui);
      assert.match(ui.elements.pali.textContent, /fresh fixture/, 'idle cancellation must not clear a completed newer reading');
    }
  });

  test(`${bridge}: cancellation before the initial result ends loading and repeated notices remain harmless`, () => {
    const ui = view(bridge); cancel(ui);
    assert.equal(ui.elements.title.textContent, 'Reading cancelled');
    assert.doesNotMatch(ui.elements.status.textContent, /Waiting|Opening|Loading/);
    const text = ui.elements.pali.textContent; cancel(ui);
    assert.equal(ui.elements.pali.textContent, text); assert.equal(ui.calls.length, 0);
  });
}
