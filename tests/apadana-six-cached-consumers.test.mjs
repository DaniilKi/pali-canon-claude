/** Proposed focused regressions; root executes only after the atomic six-unit repair and policy patches. */
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext, runInContext} from 'node:vm';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {analysePassage} from '../src/analyse.mjs';
import {requiredCanonicalRevision, APADANA_SIX_INDEX_REVISION, APADANA_SIX_LOCATOR_REVISION} from '../src/locator-policy.mjs';
import {sourceRevision} from '../web/reading-position.mjs';
import {view} from './helpers/widget-view.mjs';

const ORIGINAL = '2d134ff9ef60f70a1eb03c9370580228811a3070';
const NEW_IDS = ['tha-ap340','tha-ap341','tha-ap343','tha-ap344','tha-ap346','tha-ap347'];
const OLD_IDS = ['tha-ap107','tha-ap108','tha-ap333','tha-ap334','tha-ap335','tha-ap336'];
let originalFetch, fetches = 0;
before(() => { originalFetch = globalThis.fetch; globalThis.fetch = async () => { fetches++; throw Error('These offline policy checks authorize no provider request'); }; });
after(() => { globalThis.fetch = originalFetch; assert.equal(fetches, 0); });

test('both embedded bridges recheck repaired pins before same-object cached output can retain Pali', async () => {
  assert.equal(APADANA_SIX_INDEX_REVISION, 'apadana-thera340-341-343-344-346-347-v1');
  assert.equal(APADANA_SIX_INDEX_REVISION.length, 39); assert.equal(APADANA_SIX_LOCATOR_REVISION.length, 80);
  for (const id of [...OLD_IDS, ...NEW_IDS]) {
    const actual = await readPassage({uid: id, limit: 2, english: false});
    assert.equal(actual.source.locator_revision, requiredCanonicalRevision(id));
    const wording = actual.pali.segments[0].text; assert.ok(wording.length > 0);
    for (const bridge of ['MCP Apps','Apps SDK']) for (const oldPin of [undefined, ORIGINAL, ORIGINAL + '-unreviewed-v1']) {
      const host = view(bridge), cached = structuredClone(actual);
      host.output(cached); assert.ok(host.elements.pali.textContent.includes(wording));
      // Unchanged identity refresh remains a valid positive before the mutation.
      host.output(cached); assert.ok(host.elements.pali.textContent.includes(wording));
      if (oldPin === undefined) delete cached.source.locator_revision;
      else cached.source.locator_revision = oldPin;
      // Reuse the identical object; cloning here would miss both former dedup paths.
      host.output(cached);
      assert.ok(!host.elements.pali.textContent.includes(wording));
      assert.ok(!host.elements.english.textContent.includes(wording));
      assert.match(host.elements.status.textContent, /mapping|revision|changed|reopen/i);
      host.output(structuredClone(actual)); assert.ok(host.elements.pali.textContent.includes(wording));
    }
  }
});

class Element {
  constructor(text = '') { this.text = text === undefined ? '' : String(text); this.children = []; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; this.text = ''; }
  setAttribute() {}
  get textContent() { return this.text + this.children.map(node => node.textContent).join(''); }
}
function wordView(args, expected) {
  let response;
  const target = new Element(), source = readFileSync(new URL('../web/reader.js', import.meta.url), 'utf8');
  const code = source.slice(source.indexOf('async function wordStudy('), source.indexOf('async function relatedTexts('));
  const context = createContext({epoch: 1, studyEpoch: 0, sourceRevision,
    studyTarget: () => target, tool: async () => response,
    localizeText: value => value, notes: () => {}, provenance: () => {},
    el: (_tag, text) => new Element(text), button: text => new Element(text)});
  runInContext(code + ';globalThis.showWords=wordStudy;', context);
  return {target, async output(value) { response = value; await context.showWords(args, expected, 1); }};
}

test('native word-study display refuses stale cached locator metadata even when ref text and authentic commit match', async () => {
  for (const id of NEW_IDS) {
    const pin = requiredCanonicalRevision(id), actual = analysePassage({uid: id});
    assert.equal(actual.text_source.commit, ORIGINAL); assert.equal(actual.text_source.locator_revision, pin);
    const args = {uid: id, segment: actual.segment.ref, offset: 0, limit: 15, source_commit: pin};
    const genuine = analysePassage(args);
    const expected = {ref: genuine.segment.ref, text: genuine.segment.text, source: ORIGINAL, script: 'roman', kind: 'canon'};
    for (const stale of [undefined, ORIGINAL, ORIGINAL + '-apadana-thera333-336-v1']) {
      const rendered = wordView(args, expected), cached = structuredClone(genuine);
      await rendered.output(cached);
      assert.ok(rendered.target.textContent.includes('Word study · dictionary reference'));
      assert.ok(rendered.target.textContent.includes(genuine.segment.ref));
      if (stale === undefined) delete cached.text_source.locator_revision;
      else cached.text_source.locator_revision = stale;
      assert.equal(cached.segment.ref, expected.ref); assert.equal(cached.segment.text, expected.text);
      assert.equal(cached.text_source.commit, ORIGINAL);
      await rendered.output(cached);
      assert.ok(!rendered.target.textContent.includes('Word study · dictionary reference'));
      assert.ok(!rendered.target.textContent.includes(genuine.segment.ref));
      assert.match(rendered.target.textContent, /does not match|revision|source passage/i);
      await rendered.output(structuredClone(genuine));
      assert.ok(rendered.target.textContent.includes('Word study · dictionary reference'));
    }
  }
});
