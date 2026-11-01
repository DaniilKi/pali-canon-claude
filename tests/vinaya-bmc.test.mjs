import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { vinayaRule, ruleKeys, RULE_COUNTS, source, register } from '../src/vinaya-bmc.mjs';

const CLASSES = [['pj', 'Pj'], ['ss', 'Ss'], ['ay', 'Ay'], ['np', 'Np'], ['pc', 'Pc'], ['pd', 'Pd'], ['sk', 'Sk'], ['as', 'As']];
// Rules the BMC discusses as pairs; its table of contents lists them as "1 [2]" … "23 [24]" and "61 [62]".
const PAIRED = new Map([...[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map((n) => [`sk${n}`, `Sk${n - 1}`]), ['sk62', 'Sk61']]);
const ANCHOR = { pj: 'Pr', ss: 'Sg', ay: 'Ay', np: 'NP', pc: 'Pc', pd: 'Pd', sk: 'Sk', as: 'As' };

test('audit: all 227 bhikkhu rules map to a BMC section and resolve in the bundled canon', () => {
  assert.equal(Object.values(RULE_COUNTS).reduce((a, b) => a + b, 0), 227);
  assert.equal(ruleKeys().length, 227);
  let checked = 0;
  for (const [key, abbr] of CLASSES) {
    for (let n = 1; n <= RULE_COUNTS[key]; n += 1) {
      const r = vinayaRule(`${abbr} ${n}`, canon);
      const id = `pli-tv-bu-vb-${key}${n}`;
      assert.equal(r.canonical_text.id, id);
      assert.equal(canon.resolve(r.canonical_text.id).unit.id, id, `${id} resolves`);
      assert.equal(canon.resolve(`Bu ${abbr} ${n}`).unit.id, id);
      assert.equal(r.rule, `${abbr} ${n}`);
      assert.equal(r.of, RULE_COUNTS[key]);
      const url = r.buddhist_monastic_code.url;
      assert.match(url, /^https:\/\/www\.dhammatalks\.org\/vinaya\/bmc\/Section00(1\d|2[0-7])\.html#[A-Za-z]+\d+$/, url);
      const anchor = PAIRED.get(`${key}${n}`) || `${ANCHOR[key]}${n}`;
      assert.equal(url.split('#')[1], anchor, `${abbr} ${n}`);
      assert.equal(r.buddhist_monastic_code.attribution.license, 'CC BY-NC 4.0');
      assert.match(r.buddhist_monastic_code.kind, /commentary/);
      checked += 1;
    }
  }
  assert.equal(checked, 227);
});

test('BMC chapters and sub-chapters follow the book', () => {
  const at = (ref) => vinayaRule(ref, canon).buddhist_monastic_code;
  assert.deepEqual(at('Pj 1'), { ...at('Pj 1'), url: 'https://www.dhammatalks.org/vinaya/bmc/Section0010.html#Pr1', chapter: 'Chapter Four: Pārājika' });
  assert.equal(at('Ss 13').chapter, 'Chapter Five: Saṅghādisesa');
  assert.equal(at('Np 11').url, 'https://www.dhammatalks.org/vinaya/bmc/Section0014.html#NP11');
  assert.equal(at('Np 11').section, 'Two: The Silk Chapter');
  assert.equal(at('Pc 71').section, 'Eight: The In-accordance-with-the-Rule Chapter');
  assert.equal(at('Pc 82').url, 'https://www.dhammatalks.org/vinaya/bmc/Section0023.html#Pc82');
  assert.equal(at('Pc 83').url, 'https://www.dhammatalks.org/vinaya/bmc/Section0024.html#Pc83');
  assert.equal(at('Sk 2').discussed_with, 'Sk 1');
  assert.equal(at('Sk 62').url, 'https://www.dhammatalks.org/vinaya/bmc/Section0026.html#Sk61');
  assert.equal(at('Sk 25').discussed_with, undefined);
  assert.equal(at('As 7').chapter, 'Chapter Eleven: Adhikaraṇa-samatha');
  assert.match(vinayaRule('Sk 2', canon).notes.join(' '), /together with Sk 1/);
});

test('citation forms and errors', () => {
  for (const ref of ['Pc 5', 'Bu Pc 5', 'Pācittiya 5', 'pacittiya 5', 'pli-tv-bu-vb-pc5']) {
    assert.equal(vinayaRule(ref, canon).canonical_text.id, 'pli-tv-bu-vb-pc5', ref);
  }
  assert.equal(vinayaRule('Pj 1', canon).canonical_text.title, 'Paṭhamapārājikasikkhāpada');
  assert.match(vinayaRule('Pj 1', canon).canonical_text.read_with, /get_text\("pli-tv-bu-vb-pj1"\)/);
  assert.throws(() => vinayaRule('Pj 5', canon), /not in the canon index/);
  assert.throws(() => vinayaRule('Bi Pc 5', canon), /bhikkhunī rule/);
  assert.throws(() => vinayaRule('As 1-7', canon), /group of rules/);
  assert.throws(() => vinayaRule('MN 10', canon), /not a Pātimokkha rule/);
  assert.throws(() => vinayaRule('Kd 1', canon), /not a Pātimokkha rule/);
});

test('source record: Ṭhānissaro Bhikkhu, CC BY-NC, link only', () => {
  const s = source();
  assert.equal(s.author, 'Ṭhānissaro Bhikkhu');
  assert.equal(s.license, 'CC BY-NC 4.0');
  assert.match(s.method, /Link only/);
  assert.match(s.retrieved, /^\d{4}-\d{2}-\d{2}$/);
});

test('vinaya_rule is registered read-only and offline', async () => {
  const seen = [];
  const { z } = await import('zod');
  register({ tool: (name, description, shape, fn, opts) => seen.push({ name, description, shape, fn, opts }), z, canon });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].name, 'vinaya_rule');
  assert.equal(seen[0].opts, undefined, 'no network');
  assert.match(seen[0].description, /Works offline/);
  const out = await seen[0].fn({ rule: 'Pc 5' });
  assert.equal(out.buddhist_monastic_code.url, 'https://www.dhammatalks.org/vinaya/bmc/Section0016.html#Pc5');
});
