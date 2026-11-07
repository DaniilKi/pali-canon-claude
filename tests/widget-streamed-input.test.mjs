import { test } from 'node:test';
import assert from 'node:assert/strict';
import { view, fixture, settle } from './helpers/widget-view.mjs';

const partial = (ui, args) => ui.notify('ui/notifications/tool-input-partial', { arguments: args });
const latest = ui => ui.models.length ? ui.models.at(-1).params.structuredContent.pali_reader : JSON.parse(ui.stateUpdates.at(-1).modelContent).pali_reader;

for (const bridge of ['MCP Apps', 'Apps SDK']) {
  test(`${bridge}: partial input marks pending state without executing or sharing incomplete/private arguments`, () => {
    const ui = view(bridge, bridge === 'MCP Apps' ? { modelCapabilities: { structuredContent: {} } } : { stateWriter: true });
    ui.output(fixture()); if (bridge === 'MCP Apps') ui.contextReply(0);
    partial(ui, { uid: 'Private incomplete argument fixture', translation: '<img src=x>' });
    assert.match(ui.elements.status.textContent, /Opening/);
    assert.equal(ui.elements.navigation.children.filter(e => e.tagName === 'button').length, 0);
    assert.equal(ui.calls.length, 0);
    const metadata = latest(ui); assert.equal(metadata.state, 'loading');
    assert.equal(metadata.source, undefined); assert.equal(metadata.text_id, undefined);
    assert.equal(JSON.stringify(metadata).includes('Private incomplete'), false);
    assert.equal(ui.elements.pali.textContent.includes('Private incomplete'), false);
    const count = ui.models.length + ui.stateUpdates.length;
    for (const args of [undefined, {}, { uid: 'different incomplete fixture' }, null, ['invalid']]) partial(ui, args);
    assert.equal(ui.models.length + ui.stateUpdates.length, count, 'partial chunks coalesce without metadata churn');
    ui.notify('ui/notifications/tool-cancelled', { reason: 'Private fixture reason' });
    assert.equal(ui.elements.title.textContent, 'Reading cancelled');
    if (bridge === 'MCP Apps') ui.contextReply(1);
    assert.equal(latest(ui).state, 'cancelled'); assert.equal(latest(ui).source, undefined);
  });

  test(`${bridge}: partial echoes cannot cancel an existing UI call or interfere with its correlated result`, async () => {
    const ui = view(bridge); ui.output(fixture()); ui.click('Continue Pāli');
    for (const args of [undefined, {}, { uid: 'mn' }, { source_commit: '1' }, { uid: 'another provisional fixture' }]) partial(ui, args);
    assert.equal(ui.calls.length, 1); assert.equal(ui.timers.size, 1);
    ui.reply(0, { structuredContent: fixture('next') }); await settle();
    assert.match(ui.elements.pali.textContent, /next fixture/);
    assert.equal(ui.elements.navigation.attributes['aria-busy'], 'false');
  });

  test(`${bridge}: complete input and result recover from streaming; closed readers ignore further partial events`, () => {
    const ui = view(bridge); partial(ui, { uid: 'MN' });
    assert.match(ui.elements.status.textContent, /Opening/);
    ui.input({ uid: 'mn10' }); ui.output(fixture('completed'));
    assert.match(ui.elements.pali.textContent, /completed fixture/);
    assert.equal(ui.calls.length, 0, 'only the host result supplies the retrieved source');
    ui.request('close', 'ui/resource-teardown');
    const count = ui.messages.length + ui.stateUpdates.length;
    partial(ui, { uid: 'Private closed fixture' }); ui.input({ uid: 'mn1' });
    assert.equal(ui.elements.title.textContent, 'Reader closed');
    assert.equal(ui.messages.length + ui.stateUpdates.length, count);
  });
}
