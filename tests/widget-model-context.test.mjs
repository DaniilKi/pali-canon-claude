import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPassage } from '../src/chatgpt-widget.mjs';
import { SCRIPTS } from '../src/script.mjs';
import { view, fixture, settle } from './helpers/widget-view.mjs';

const plain = value => JSON.parse(JSON.stringify(value));
const snapshot = message => message.params.structuredContent?.pali_reader || JSON.parse(message.params.content[0].text).pali_reader;

test('MCP context updates use only advertised modalities and share source metadata and replay commands, not passage bodies', async () => {
  const page = await readPassage({ uid: 'MN 10', english: false, limit: 2 });
  for (const modality of ['structuredContent', 'text']) {
    const ui = view('MCP Apps', { modelCapabilities: { [modality]: {} } }); ui.output(page);
    assert.equal(ui.models.length, 1);
    assert.deepEqual(Object.keys(ui.models[0].params), [modality === 'text' ? 'content' : 'structuredContent']);
    const data = plain(snapshot(ui.models[0]));
    assert.equal(data.kind, 'canonical'); assert.equal(data.canonical, true); assert.equal(data.text_id, 'mn10');
    assert.deepEqual(data.source, page.source); assert.deepEqual(data.pali.refs, page.pali.segments.map(s => s.ref));
    assert.equal(data.pali.segments, undefined); assert.equal(data.english.text, undefined);
    assert.deepEqual(data.pali.read_with, page.pali.read_with);
    const repeated = await readPassage(data.pali.read_with.arguments);
    assert.deepEqual(repeated.pali.segments, page.pali.segments);
    assert.match(ui.elements['context-status'].textContent, /Updating/);
    ui.contextReply(0); assert.match(ui.elements['context-status'].textContent, /host accepted.*Model delivery is not verified/);
    ui.output(plain(page)); assert.equal(ui.models.length, 1);
  }
});

test('context capability absence or an unsupported modality never silently claims model sharing', () => {
  for (const caps of [undefined, {}, { image: {} }, { text: true }, { structuredContent: [] }]) {
    const ui = view('MCP Apps', { modelCapabilities: caps }); ui.output(fixture());
    assert.equal(ui.models.length, 0); assert.match(ui.elements['context-status'].textContent, /has not exposed/);
    assert.match(ui.elements.pali.textContent, /first fixture/);
  }
});

test('context updates serialize and coalesce rapid navigation; stale acknowledgements cannot confirm a newer page', async () => {
  const ui = view('MCP Apps', { modelCapabilities: { structuredContent: {} } });
  const first = await readPassage({ uid: 'MN 10', english: false, limit: 1 });
  const middle = await readPassage({ uid: 'MN 10', english: false, offset: 1, limit: 1 });
  const last = await readPassage({ uid: 'Vism 1.1', english: false, limit: 1 });
  ui.output(first); ui.output(middle); ui.output(last);
  assert.equal(ui.models.length, 1); assert.equal(snapshot(ui.models[0]).text_id, 'mn10');
  ui.contextReply(0); assert.equal(ui.models.length, 2);
  const latest = snapshot(ui.models[1]); assert.equal(latest.kind, 'post_canonical'); assert.equal(latest.canonical, false);
  assert.equal(latest.text_id, undefined); assert.equal(latest.citation, last.citation);
  assert.ok(latest.revision > snapshot(ui.models[0]).revision);
  assert.match(ui.elements['context-status'].textContent, /Updating/);
  ui.contextReply(0); assert.equal(ui.models.length, 2);
  ui.contextReply(1); assert.match(ui.elements['context-status'].textContent, /host accepted/);
  assert.match(ui.elements.title.textContent, /Vism 1.1/);
});

test('a timed-out context update remains unconfirmed until acknowledged; only then is the latest state sent', () => {
  const ui = view('MCP Apps', { modelCapabilities: { text: {} } });
  ui.output(fixture()); ui.output({ ...fixture('newer'), text_id: 'mn1', citation: 'MN 1' });
  ui.timeout(); assert.equal(ui.models.length, 1);
  assert.match(ui.elements['context-status'].textContent, /has not confirmed/);
  assert.match(ui.elements.pali.textContent, /newer fixture/);
  ui.contextReply(0); assert.equal(ui.models.length, 2); assert.equal(snapshot(ui.models[1]).text_id, 'mn1');
  assert.match(ui.elements['context-status'].textContent, /Updating/);
  ui.contextReply(1); ui.contextReply(0, {}, { code: -1, message: 'Late error' });
  assert.match(ui.elements['context-status'].textContent, /host accepted/);
});

test('host context errors do not clear the reader or trigger retries/fallbacks; malformed acknowledgements do not claim acceptance', () => {
  for (const malformed of [false, true]) {
    const ui = view('MCP Apps', { modelCapabilities: { structuredContent: {} }, stateWriter: true });
    ui.output(fixture());
    if (malformed) ui.contextReply(0, []); else ui.contextReply(0, {}, { code: -32601, message: 'Unsupported context method' });
    ui.output(fixture('newer'));
    assert.equal(ui.models.length, 1); assert.equal(ui.stateUpdates.length, 0);
    assert.match(ui.elements['context-status'].textContent, /rejected|did not confirm/);
    assert.doesNotMatch(ui.elements['context-status'].textContent, /accepted/);
    assert.match(ui.elements.pali.textContent, /newer fixture/);
  }
});

test('loading and errors clear source identity in shared metadata without late context replies changing the reader', () => {
  const ui = view('MCP Apps', { modelCapabilities: { structuredContent: {} } });
  ui.output(fixture()); ui.contextReply(0);
  ui.click('Continue Pāli'); assert.equal(snapshot(ui.models[1]).state, 'loading');
  assert.equal(snapshot(ui.models[1]).text_id, undefined);
  ui.reply(0, { isError: true, content: [{ type: 'text', text: 'Navigation failed fixture' }] });
  assert.match(ui.elements.title.textContent, /Could not open/);
  ui.contextReply(1); const cleared = snapshot(ui.models[2]);
  assert.equal(cleared.state, 'error'); assert.equal(cleared.source, undefined); assert.equal(cleared.pali, undefined);
  assert.equal(JSON.stringify(cleared).includes('Navigation failed fixture'), false);
  ui.contextReply(2); assert.match(ui.elements.title.textContent, /Could not open/);
});

test('legacy widget state is capability-detected and synchronous, with metadata-only content and cleared failure state', async () => {
  const ui = view('Apps SDK', { stateWriter: true });
  const page = await readPassage({ uid: 'Vism 1.1', english: false, limit: 2 }); ui.output(page);
  assert.equal(ui.models.length, 0); assert.equal(ui.stateUpdates.length, 1);
  const context = JSON.parse(ui.stateUpdates[0].modelContent).pali_reader;
  assert.equal(context.kind, 'post_canonical'); assert.equal(context.canonical, false);
  assert.equal(context.pali.segments, undefined); assert.deepEqual(context.source, page.source);
  ui.initialize({ structuredContent: {} }); assert.equal(ui.models.length, 0, 'keep one selected state channel');
  ui.window.openai.theme = 'dark'; ui.refresh(); assert.equal(ui.stateUpdates.length, 1);
  ui.output({ error: 'Private fixture error detail' });
  const error = JSON.parse(ui.stateUpdates[1].modelContent).pali_reader;
  assert.equal(error.state, 'error'); assert.equal(error.citation, undefined);
  assert.equal(JSON.stringify(error).includes('Private fixture'), false);
  assert.match(ui.elements['context-status'].textContent, /Model delivery is not verified/);
});

test('reentrant legacy globals serialize the latest selection without restoring an older context acknowledgement', async () => {
  let depth = 0, maximum = 0, ui;
  ui = view('Apps SDK', { stateWriter: () => {
    depth++; maximum = Math.max(maximum, depth);
    if (ui.stateUpdates.length === 1) ui.output({ ...fixture('newer'), citation: 'MN 1', text_id: 'mn1' });
    depth--;
  } });
  ui.output(fixture()); await settle();
  assert.equal(maximum, 1); assert.equal(ui.stateUpdates.length, 2);
  assert.equal(JSON.parse(ui.stateUpdates[1].modelContent).pali_reader.text_id, 'mn1');
  assert.match(ui.elements.pali.textContent, /newer fixture/);
  assert.match(ui.elements['context-status'].textContent, /Model delivery is not verified/);
});

test('throwing or unexpectedly asynchronous widget-state implementations remain unconfirmed without retrying', async () => {
  for (const asyncResult of [false, true]) {
    let resolve;
    const ui = view('Apps SDK', { stateWriter: () => {
      if (!asyncResult) throw Error('Fixture unsupported setter');
      return new Promise(done => { resolve = done; });
    } });
    ui.output(fixture()); ui.output(fixture('newer'));
    assert.equal(ui.stateUpdates.length, 1);
    if (resolve) resolve(); await settle();
    assert.doesNotMatch(ui.elements['context-status'].textContent, /host accepted|was passed/);
    assert.match(ui.elements.pali.textContent, /newer fixture/);
  }
});

test('metadata and replay preserve all source scopes, availability and cautions across eight scripts', async () => {
  const previous = globalThis.fetch; let attempts = 0;
  globalThis.fetch = async () => { attempts++; throw Error('Unexpected provider fetch'); };
  try {
    const ui = view('Apps SDK', { stateWriter: true });
    for (const script of SCRIPTS) for (const args of [
      { uid: 'MN 10' }, { uid: 'Vism 1.2' }, { book: 'vin02m1' },
      { commentary: 'mn10/c66' }, { commentary: 'commentary:s0101a.att.xml/c2' }, { commentary: 'AN 1.9' },
    ]) {
      const page = await readPassage({ ...args, script, limit: 2, english: false }); ui.output(page);
      const metadata = JSON.parse(ui.stateUpdates.at(-1).modelContent).pali_reader;
      assert.equal(metadata.canonical, page.canonical); assert.equal(metadata.text_id, page.text_id);
      assert.equal(metadata.requested_on?.id, page.requested_on?.id); assert.equal(metadata.book_id, page.book_id);
      assert.equal(metadata.script, script); assert.equal(metadata.available, page.available);
      assert.equal(metadata.approximate, !!page.approximate); assert.deepEqual(metadata.notes, page.notes);
      assert.equal(metadata.alignment_note, page.alignment_note);
      assert.deepEqual(metadata.pali.refs, page.pali.segments.map(s => s.ref));
      assert.equal(metadata.pali.segments, undefined); assert.equal(metadata.english.text, undefined);
      const repeated = await readPassage(metadata.pali.read_with.arguments);
      assert.deepEqual(repeated.pali.segments, page.pali.segments); assert.deepEqual(repeated.source, page.source);
    }
    assert.equal(attempts, 0);
  } finally { globalThis.fetch = previous; }
});
