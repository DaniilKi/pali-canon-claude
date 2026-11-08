// Content-based translation links and per-collection coverage (#37).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { listSources, translationCoverage } from '../src/providers.mjs';
import { isScoped } from '../src/translation-scope.mjs';

const d = canon.load();
const CONTENT = new Set(['content-pts+names', 'content-number+names', 'content-title+number']);
const allLinks = Object.entries(d.translations).flatMap(([id, links]) => links.map((l) => ({ id, ...l })));
const linked = (id, url) => (d.translations[id] || []).some((l) => l.url === url);

test('list_sources reports English coverage per collection, and the rows add up to the total', () => {
  const s = listSources();
  const cov = s.translation_coverage;
  assert.ok(cov, 'translation_coverage present');
  assert.match(cov.note, /content-based linker/);
  const byKey = Object.fromEntries(cov.collections.map((r) => [r.collection, r]));
  for (const k of ['dn', 'mn', 'sn', 'an', 'dhp', 'snp', 'vinaya', 'patthana']) assert.ok(byKey[k], `row for ${k}`);
  assert.equal(byKey.sn.name, 'Saṃyutta Nikāya');
  assert.equal(byKey.vinaya.with_english, 0, 'no English for the Vinaya');
  for (const field of ['texts', 'with_english', 'with_english_including_inherited', 'links', 'content_matched_links']) {
    assert.equal(cov.collections.reduce((n, r) => n + r[field], 0), cov.total[field], field);
  }
  assert.equal(cov.total.links, allLinks.filter(l => !isScoped(l)).length);
  assert.equal(cov.total.links + (cov.total.partial_links || 0) + (cov.total.shared_links || 0), allLinks.length);
  assert.equal(cov.total.content_matched_links, allLinks.filter((l) => CONTENT.has(l.match)).length);
  assert.equal(cov.total.texts, d.canon.units.filter((u) => u.kind !== 'range').length);
  assert.equal(byKey.dhp.with_english_including_inherited, byKey.dhp.texts, 'every Dhp verse inherits its chapter link');
  for (const r of cov.collections) {
    assert.ok(r.with_english <= r.with_english_including_inherited && r.with_english_including_inherited <= r.texts, r.collection);
    assert.ok(r.percent_with_english >= 0 && r.percent_with_english <= 100, r.collection);
  }
  assert.equal(translationCoverage(), translationCoverage(), 'computed once');
});

test('content-matched links: known match types, evidence, whole texts, one text per page', () => {
  const content = allLinks.filter((l) => String(l.match).startsWith('content'));
  assert.ok(content.length >= 50, `${content.length} content links`);
  for (const l of content) {
    assert.ok(CONTENT.has(l.match), l.match);
    const u = d.byId.get(l.id);
    assert.ok(u && !u.approximate && u.kind !== 'range', l.id);
    if (l.match !== 'content-title+number') assert.ok(l.evidence.length >= 1, `${l.id} evidence`);
    assert.equal(allLinks.filter((x) => x.url === l.url).length, 1, `${l.url} linked once`);
    assert.equal(canon.resolve(l.url).unit.id, l.id, `${l.url} resolves back`);
  }
});

test('reviewed content links point at the right text despite different numbering', () => {
  const cases = [
    ['an7.72', 'https://www.accesstoinsight.org/tipitaka/an/an07/an07.068.yaho.html'], // ATI AN 7.68 = Aggikkhandhopama
    ['an7.61', 'https://www.accesstoinsight.org/tipitaka/an/an07/an07.058.than.html'], // Nodding (Pacalā)
    ['an11.16', 'https://www.accesstoinsight.org/tipitaka/an/an11/an11.017.than.html'], // To Dasama
    ['an3.114', 'https://www.dhammatalks.org/suttas/AN/AN3_115.html'], // Rare (Dullabha)
    ['an3.112', 'https://www.dhammatalks.org/suttas/AN/AN3_113.html'], // Causes (2): ordinal agrees
    ['an7.50', 'https://www.dhammatalks.org/suttas/AN/AN7_47.html'], // Copulation (Jāṇussoṇi)
    ['sn35.228', 'https://www.accesstoinsight.org/tipitaka/sn/sn35/sn35.187.wlsh.html'], // The Ocean (1)
    ['snp5.2', 'https://www.accesstoinsight.org/tipitaka/kn/snp/snp.5.01.than.html'], // Ajita: ATI does not count the Vatthugāthā
    ['ud6.5', 'https://www.dhammatalks.org/suttas/KN/Ud/ud6_5.html'], // Sectarians (2), no longer bridged to (1)
  ];
  for (const [id, url] of cases) assert.ok(linked(id, url), `${id} <- ${url}`);
  // The page's own number would have been wrong in each of these.
  assert.ok(!linked('an7.68', cases[0][1]));
  assert.ok(!linked('an3.115', cases[3][1]));
  assert.ok(!linked('snp5.1', cases[7][1]));
});

test('reviewed SN22.84 excerpt is withheld while its complete ATI alternative remains linked', () => {
  const ids = (d.translations['sn22.84'] || []).filter((l) => l.source === 'ati').map((l) => l.path);
  // D211 establishes that the old x-suffixed version omits the aggregate catechesis.
  assert.deepEqual(ids.sort(), ['/tipitaka/sn/sn22/sn22.084.than']);
  assert.ok(!linked('sn22.84', 'https://www.accesstoinsight.org/tipitaka/sn/sn22/sn22.084x.wlsh.html'));
  assert.ok(linked('sn22.84', 'https://www.dhammatalks.org/suttas/SN/SN22_84.html'));
});

test('no SN or AN link rests on the page number alone', () => {
  for (const l of allLinks) {
    if (!/^(sn|an)\d/.test(l.id)) continue;
    assert.notEqual(l.match, 'number', `${l.id} ${l.url}`);
  }
});
