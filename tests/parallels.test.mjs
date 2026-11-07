// Parallels and cross-references (#29, D59): get_parallels, the bundled graph and the rules that build it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import * as parallels from '../src/parallels.mjs';
import * as canon from '../src/canon.mjs';
import * as commentary from '../src/commentary.mjs';
import { createServer } from '../src/server.mjs';
import { parseRefs, checkQuote, titleStem, nameStem, quotationsNear, quotationSources, PREFIXES } from '../scripts/parallels/citations.mjs';

const d = parallels.load();
const collection = (id) => canon.load().byId.get(id).collection;
const all = (uid) => parallels.getParallels(uid, { limit: 100000 });
const has = (uid, other, source) => all(uid).links.some((l) => l.text.id === other && (!source || l.source === source));

test('the data file is present, small and records its inputs', () => {
  assert.ok(d, 'parallels.json.gz is installed');
  const size = readFileSync(new URL('../server/data/parallels.json.gz', import.meta.url)).length;
  assert.ok(size < 5e6, `${size} bytes`);
  for (const file of ['canon.json.gz', 'commentary.json.gz']) {
    assert.match(d.source.inputs[file].sha256, /^[0-9a-f]{64}$/);
    assert.equal(d.source.inputs[file].vri_commit, canon.source().commit);
  }
  assert.doesNotMatch(JSON.stringify(d.source), /suttacentral\.net/i);
});

test('every link has a source and says how it was matched', () => {
  for (const uid of ['MN 10', 'DN 2', 'SN 56.11', 'AN 3.65', 'Dhp 1', 'Snp 1.8', 'Kd 1']) {
    const r = all(uid);
    for (const l of r.links) {
      assert.ok(parallels.SOURCES.includes(l.source), `${uid}: ${l.source}`);
      assert.ok(l.match && l.how_matched, `${uid}: ${l.text.id} lacks its match`);
      if (l.source === 'commentary-citation') {
        assert.match(l.commentary.passage_ref, /^[^/]+\/c\d+$/);
        assert.ok(l.evidence.length > 5);
        assert.equal(l.commentary.read_with.tool, 'get_commentary');
      } else {
        assert.ok(l.score > 0 && l.score <= 1);
        assert.ok(l.this_segments.length && l.other_segments.length);
      }
    }
  }
  for (const l of d.citations) assert.ok(l.from && l.to && l.match && l.commentary_ref && l.evidence, JSON.stringify(l).slice(0, 200));
  for (const l of d.shared) assert.ok(l.a && l.b && l.a_segments.length && l.b_segments.length && l.score > 0, `${l.a} ${l.b}`);
});

test('no SN or AN text is linked by number alone', () => {
  const sa = d.citations.filter((l) => ['sn', 'an'].includes(collection(l.to)));
  assert.ok(sa.length > 1000, `${sa.length} SN/AN citation links`);
  for (const l of sa) {
    assert.ok(['vri-reference+quotation', 'sutta-name', 'sutta-name+nikaya'].includes(l.match), `${l.from} -> ${l.to}: ${l.match}`);
    if (l.match === 'vri-reference+quotation') assert.ok(l.quotation_span && l.evidence.slice(...l.quotation_span).length >= 12);
    else assert.equal(titleStem(canon.load().byId.get(l.to).title), nameStem(l.named));
  }
});

test('commentary citations: known links found, with the commentary passage and the words quoted', () => {
  // The commentary on MN 10 quotes AN 4.28 (Ariyavaṃsa) with VRI's reference "a. ni. 4.28".
  const mn10 = all('MN 10').links.find((l) => l.text.id === 'an4.28');
  assert.ok(mn10);
  assert.equal(mn10.source, 'commentary-citation');
  assert.equal(mn10.match, 'vri-reference+quotation');
  assert.match(mn10.evidence, /ariyavaṃsā[\s\S]*\(a\. ni\. 4\.28\)/);
  assert.equal(mn10.commentary.work, 'Papañcasūdanī');
  // VRI's paragraph 66 of the Tikanipāta is the Kālāma Sutta, standard AN 3.65 (not 3.66).
  assert.ok(has('AN 3.65', 'dn1', 'commentary-citation'));
  assert.ok(!d.citations.some((l) => l.to === 'an3.66' && /a\. ni\. 3\.66/.test(l.vri_reference || '') && !l.quotation_span));
  // By name: the commentary on MN 61 names the Cūḷarāhulovāda Sutta (MN 147).
  assert.ok(d.citations.some((l) => l.from === 'mn61' && l.to === 'mn147' && l.match === 'sutta-name'));
  // Incoming links read the other way.
  const cited = all('MN 147').links.find((l) => l.text.id === 'mn61');
  assert.match(cited.relation, /commentary on MN 61 cites this text/);
});

test('shared passages: known parallels found, stock formulae and same-text overlaps left out', () => {
  assert.ok(has('DN 22', 'mn10', 'shared-passage'));
  assert.ok(has('SN 12.15', 'sn22.90', 'shared-passage')); // Kaccānagotta quoted in Channa
  assert.ok(has('Kp 9', 'snp1.8', 'shared-passage')); // the Metta Sutta in both
  assert.ok(has('AN 8.51', 'pli-tv-kd20', 'shared-passage')); // Mahāpajāpatī's ordination
  assert.ok(has('Ud 5.5', 'an8.20', 'shared-passage'));
  const l = all('DN 22').links.find((x) => x.text.id === 'mn10');
  assert.ok(l.shared_words > 1000 && l.score > 0.5);
  assert.ok(l.this_segments.every((r) => r.startsWith('dn22/')) && l.other_segments.every((r) => r.startsWith('mn10/')));
  // Texts sharing the same blocks (Vinaya duplicates, a Dhp verse and its chapter) are never their own parallel.
  for (const x of d.shared) assert.notEqual(x.a, x.b);
  assert.ok(!d.shared.some((x) => x.a.startsWith('dhp') && x.b.startsWith('dhp')));
  // A Niddesa section and another applying the same glosses are not parallels.
  assert.ok(!d.shared.some((x) => ['mnd', 'cnd'].includes(collection(x.a)) && ['mnd', 'cnd'].includes(collection(x.b))));
  // The stock opening alone never makes a link.
  const opening = canon.fold('Evaṃ me sutaṃ ekaṃ samayaṃ bhagavā sāvatthiyaṃ viharati jetavane anāthapiṇḍikassa ārāme');
  assert.ok(opening.length > 20 && d.shared.every((x) => x.shared_words >= 12));
});

test('builder rules: reference parsing, quotation check, titles', () => {
  assert.deepEqual(parseRefs('ma. ni. 1.27; 3.247').map((r) => [r.book, r.a, r.b]), [[8, 27, 27], [10, 247, 247]]);
  assert.deepEqual(parseRefs('a. ni. 3.66').map((r) => [r.book, r.a]), [[18, 66]]);
  assert.deepEqual(parseRefs('dha. pa. 153-154').map((r) => [r.book, r.a, r.b]), [[28, 153, 154]]);
  assert.deepEqual(parseRefs('dī. ni. aṭṭha. 2.33'), [], 'commentary references are not canon');
  assert.deepEqual(parseRefs('jā. 1.1.77'), [], 'Jātaka verse references are not used');
  assert.deepEqual(parseRefs('ma. ni. 2.187, 202-203').map((r) => r.a), [187], 'no volume, no guess');
  assert.ok(Array.isArray(PREFIXES.saṃni) && PREFIXES.saṃni.length === 5);
  assert.equal(checkQuote('kesakambalo tesaṃ paṭikuṭṭho akkhāyatī’', 'yāni kānici tantāvutānaṃ vatthānaṃ, kesakambalo tesaṃ paṭikuṭṭho akkhāyati.').status, 'whole');
  assert.equal(checkQuote('sabbe saṅkhārā', 'sabbe saṅkhārā aniccā').status, 'too-short');
  assert.equal(checkQuote('ekapuggalo bhikkhave loke uppajjamāno', 'cattārome bhikkhave puggalā santo').status, 'not-found');
  assert.equal(titleStem('Ambaṭṭhasuttaṃ'), 'ambaṭṭha');
  assert.equal(titleStem('1. Mūlapariyāyasuttaṃ'), 'mūlapariyāya');
  assert.equal(titleStem('Yamakavaggo'), null);
});

test('get_parallels: pagination, unknown citations, SuttaCentral as a link only', () => {
  const first = parallels.getParallels('MN 10', { limit: 5 });
  assert.equal(first.returned, 5);
  assert.equal(first.counts['commentary-citation'] + first.counts['shared-passage'], first.total);
  const next = parallels.getParallels('MN 10', { limit: 5, offset: first.next_offset });
  assert.notDeepEqual(next.links[0], first.links[0]);
  assert.equal(first.suttacentral_parallels.url, 'https://suttacentral.net/mn10');
  assert.match(first.suttacentral_parallels.note, /Link only/);
  assert.throws(() => parallels.getParallels('MN 999'));
  const none = parallels.getParallels('Patthana 1.1');
  assert.ok(none.total === 0 ? none.notes.some((n) => /does not mean/.test(n)) : true);
});

test('counts cover the four main Nikāyas', () => {
  for (const c of ['dn', 'mn', 'sn', 'an']) {
    assert.ok(d.counts.commentary_citations_to[c] > 100, `${c} cited`);
    assert.ok(d.counts.shared_passages_by_collection[c] > 50, `${c} shared`);
  }
  const raw = JSON.parse(gunzipSync(readFileSync(new URL('../server/data/parallels.json.gz', import.meta.url))));
  assert.equal(raw.citations.length, d.counts.commentary_citations);
});

test('get_parallels is registered read-only and offline over MCP', async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'parallels-test', version: '1.0.0' });
  await Promise.all([createServer().connect(serverSide), client.connect(clientSide)]);
  const { tools } = await client.listTools();
  const t = tools.find((x) => x.name === 'get_parallels');
  assert.ok(t);
  assert.equal(t.title, 'Find parallels and cross-references');
  assert.equal(t.annotations.readOnlyHint, true);
  assert.equal(t.annotations.openWorldHint, false);
  const res = await client.callTool({ name: 'get_parallels', arguments: { uid: 'SN 56.11', limit: 3 } });
  const body = JSON.parse(res.content[0].text);
  assert.equal(body.text_id, 'sn56.11');
  assert.ok(body.links.every((l) => l.source));
  await client.close();
});

test('the builder is deterministic: a fresh build gives the committed bytes', async () => {
  const { build } = await import('../scripts/parallels/build.mjs');
  const { gz } = build();
  assert.equal(Buffer.compare(gz, readFileSync(new URL('../server/data/parallels.json.gz', import.meta.url))), 0, 'run node scripts/parallels/build.mjs');
});

test('sutta names: diacritics count, and names shared with another text are dropped (review of #105)', () => {
  const link = (from, to) => d.citations.some((l) => l.from === from && l.to === to && l.match.startsWith('sutta-name'));
  // "Terasame udayasutte" in the Cūḷaniddesa is the Pārāyana's Udayamāṇavapucchā (Snp 5.14), not SN 7.12.
  assert.ok(!link('cnd17', 'sn7.12'));
  // The Ajita question (Snp 5.2), not AN 10.116 Ajitasutta.
  assert.ok(!link('cnd19', 'an10.116'));
  assert.ok(!link('cnd6', 'an10.116'));
  // "tissametteyyasuttassa (su. ni. 1038 ādayo)" is Snp 5.3, not Snp 4.7.
  assert.ok(!link('cnd19', 'snp4.7'));
  // "pārāyanasuttaṃ" is the Pārāyana chapter of the Sutta Nipāta, not SN 43.44 Parāyanasuttaṃ (different vowel).
  assert.ok(!link('an7.53', 'sn43.44'));
  // "Evaṃ me sutanti rāhulovādasuttaṃ" opens the commentary on MN 147 itself.
  assert.ok(!link('mn147', 'sn35.121'));
  assert.equal(nameStem('Pārāyanasuttaṃ'), 'pārāyana');
  assert.equal(nameStem('ajitasuttassa'), 'ajita');
  // Every name link: exact title with diacritics, and no other text goes by that name.
  for (const l of d.citations.filter((x) => x.match.startsWith('sutta-name'))) {
    assert.equal(titleStem(canon.load().byId.get(l.to).title), nameStem(l.named), `${l.from} -> ${l.to}`);
  }
  // The glossary (DPD sutta names) is a recorded input.
  assert.match(d.source.inputs['glossary.json.gz'].sha256, /^[0-9a-f]{64}$/);
});

test('sutta names: a quotation next to the name that comes from another text drops the link (coordinator, #105)', () => {
  const link = (from, to) => d.citations.some((l) => l.from === from && l.to === to && l.match.startsWith('sutta-name'));
  // "Ayaṃ panattho bakabrahmasuttena dīpetabbo. Vuttañhetaṃ (saṃ. ni. 1.176) – ‘‘…’’": the quoted verse is SN 6.5, not SN 6.4.
  assert.ok(!link('thag20.1', 'sn6.4'));
  assert.ok(!link('tha-ap4', 'sn6.4'));
  const segs = commentary.commentaryFor(canon.load().byId.get('thag20.1'), { limit: 100000 }).segments;
  const k = segs.findIndex((x) => x.ref === 'thag20.1/c138');
  const at = segs[k].text.indexOf('bakabrahmasuttena');
  const [, q] = quotationsNear(segs[k].text.slice(0, at), segs[k].text.slice(at + 'bakabrahmasuttena'.length) + ' ' + segs[k + 1].text);
  assert.equal(q.ref, 'saṃ. ni. 1.176');
  const sources = quotationSources(q.quote);
  const best = Math.max(...sources.map((x) => x.share));
  assert.deepEqual(sources.filter((x) => x.share === best).map((x) => x.unit.id), ['sn6.5']);
  // A quotation is only read after the name when the commentary introduces it as what was said ("vuttaṃ –").
  assert.deepEqual(quotationsNear('', ' methunavirati brahmacariyanti vuttā. ‘‘Mayañca bhariyā nātikkamāma’’'), []);
  // Kept: the quotation is in the named text, or VRI's own reference on it points there.
  assert.ok(link('dn2', 'mn8'));
  assert.ok(link('dn2', 'dn29'));
  assert.ok(link('ne13', 'mn6'));
});


test('native parallel citations retain graph evidence, pagination and source cautions', async () => {
  const { SCRIPTS, transliterate } = await import('../src/script.mjs');
  for (const ref of ['MN 10', 'AN 3.65', 'Dhp 1-20', 'AN 1.296-305']) {
    const baseline = parallels.getParallels(ref, { offset: 1, limit: 2 });
    for (const script of SCRIPTS) {
      const input = transliterate(ref, 'roman', script);
      const result = parallels.getParallels(input, { offset: 1, limit: 2 });
      const { input_script, input_romanized, ...graph } = result;
      assert.deepEqual(graph, baseline, `${script}: ${ref}`);
      assert.equal(input_script, script === 'roman' ? undefined : script);
      if (input_script) assert.equal(input_romanized.toLowerCase(), ref.toLowerCase());
    }
  }
  const page = parallels.getParallels('A i 189');
  assert.equal(page.text_id, 'an3.65');
  assert.match(page.notes.join(' '), /Also numbered AN 3.66/);
  assert.match(parallels.getParallels('AN 3.65-65').notes.join(' '), /identical endpoints/);
});

test('parallel lookup refuses mixed input, ambiguous pages and unindexed spans in every script', async () => {
  const { SCRIPTS, transliterate } = await import('../src/script.mjs');
  for (const script of SCRIPTS) {
    for (const ref of ['AN 3.65-66', 'S i 57']) {
      assert.throws(() => parallels.getParallels(transliterate(ref, 'roman', script)), /spans multiple texts|multiple canonical passages/);
    }
  }
  for (const ref of ['AN ๓.६५', '漢AN 3.65字', 'ηAN 3.65', 'AN 3.65-9999']) assert.throws(() => parallels.getParallels(ref));
});
