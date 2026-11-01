import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCitation, CitationError } from '../src/citations.mjs';
import * as canon from '../src/canon.mjs';
import { cleanDpdText } from '../src/providers.mjs';
import { plainText } from '../src/http.mjs';

const id = (ref) => canon.resolve(ref).unit.id;

test('common citation forms resolve to the same text', () => {
  for (const ref of ['MN 10', 'mn10', 'M 10', 'MN10', 'MN 010', 'mn.010', 'Majjhima Nikāya 10', 'Majjhima 10', 'M i 55', 'M.i.55', 'M I 55']) {
    assert.equal(id(ref), 'mn10', ref);
  }
  for (const ref of ['SN 56.11', 'SN 56:11', 'S 56.11', 'sn56.11', 'sn56.11:5.1', 'Saṃyutta 56.11', 'Samyutta Nikaya 56.11', 'S v 420', 'S.V.420']) {
    assert.equal(id(ref), 'sn56.11', ref);
  }
  for (const ref of ['AN 3.65', 'AN 3:65', 'an03.065', 'A i 188', 'Aṅguttara 3.65']) assert.equal(id(ref), 'an3.65', ref);
});

test('Sutta Nipāta and Saṃyutta are told apart by case', () => {
  assert.equal(id('Sn 1.8'), 'snp1.8');
  assert.equal(id('Snp 1.8'), 'snp1.8');
  assert.equal(id('SN 1.8'), 'sn1.8');
  assert.equal(canon.resolve('Snp 1.8').unit.title, 'Mettasuttaṃ');
  assert.throws(() => canon.resolve('Sn 1032'), /verse number/);
});

test('Khuddaka collections', () => {
  assert.equal(id('Dhp 183'), 'dhp183');
  assert.equal(id('Dhp 1–20'), 'dhp1-20');
  assert.equal(id('Dhammapada 5'), 'dhp5');
  assert.equal(id('Iti 27'), 'iti27');
  assert.equal(id('It 27'), 'iti27');
  assert.equal(id('Kp 9'), 'kp9');
  assert.equal(id('Khp 9'), 'kp9');
  assert.equal(id('Ud 1.10'), 'ud1.10');
  assert.equal(canon.resolve('Ud 1.10').unit.title, 'Bāhiyasuttaṃ');
  assert.equal(id('Thag 1.1'), 'thag1.1');
  assert.equal(id('Thig 5.4'), 'thig5.4');
  assert.equal(id('Ja 1'), 'ja1');
  assert.equal(id('Thi Ap 1'), 'thi-ap1');
  assert.equal(canon.resolve('Thi Ap 1').unit.title, 'Sumedhātherīapadānaṃ');
});

test('texts printed together resolve by member number, with a note', () => {
  const r = canon.resolve('AN 10.208');
  assert.equal(r.unit.id, 'an10.199-210');
  assert.ok(r.notes.some((n) => /not printed separately/.test(n)));
  assert.match(id('AN 1.300'), /^an1\.\d+-\d+$/);
  assert.match(id('SN 46.150'), /^sn46\.\d+-\d+$/);
});

test('Vinaya rules, khandhakas and PTS volumes', () => {
  assert.equal(id('Pj 1'), 'pli-tv-bu-vb-pj1');
  assert.equal(id('Bu Pj 1'), 'pli-tv-bu-vb-pj1');
  assert.equal(id('Pārājika 1'), 'pli-tv-bu-vb-pj1');
  assert.equal(id('Bi Pc 5'), 'pli-tv-bi-vb-pc5');
  assert.equal(id('Bu As 1-7'), 'pli-tv-bu-vb-as1-7');
  assert.equal(id('Mv 1'), 'pli-tv-kd1');
  assert.equal(id('Cv 4'), 'pli-tv-kd14');
  assert.equal(id('Kd 11'), 'pli-tv-kd11');
  assert.equal(id('Vin i 1'), 'pli-tv-kd1');
  assert.equal(id('Vin ii 1'), 'pli-tv-kd11');
  assert.equal(id('Vin iii 1'), 'pli-tv-bu-vb-pj1');
  assert.equal(id('Vin iv 1'), 'pli-tv-bu-vb-pc1');
  assert.equal(id('Vin v 1'), 'pli-tv-pvr1.1');
});

test('PTS-numbered translations map to the standard text', () => {
  assert.equal(id('https://www.dhammatalks.org/suttas/AN/AN7_64.html'), 'an7.68');
  assert.equal(id('https://www.dhammatalks.org/suttas/AN/AN3_66.html'), 'an3.65');
  assert.equal(id('https://www.accesstoinsight.org/tipitaka/an/an03/an03.065.than.html'), 'an3.65');
  assert.ok(canon.resolve('AN 7.68').notes.some((n) => /AN 7\.64/.test(n)));
  assert.equal(id('https://suttacentral.net/mn10/en/sujato#3.1'), 'mn10');
});

test('bad input fails clearly, never silently', () => {
  for (const ref of ['MN 153', 'XYZ 1', 'Ja i 1', '', 'https://example.org/mn10', '../etc/passwd']) {
    assert.throws(() => canon.resolve(ref), CitationError, ref);
  }
  assert.throws(() => parseCitation('MN 1; rm -rf /'));
});

test('Pāli text renders with paragraphs, verses and PTS page breaks', () => {
  const u = canon.resolve('MN 10').unit;
  const segs = canon.segments(u);
  assert.ok(segs.some((s) => s.text.startsWith('Evaṃ me sutaṃ')));
  assert.ok(segs.some((s) => (s.pts_page_begins || []).includes('M i 56')));
  const verse = canon.segments(canon.resolve('Dhp 183').unit).find((s) => s.type === 'verse');
  assert.match(verse.text, /Sabbapāpassa akaraṇaṃ[^]*\n/);
});

test('offline search finds Pāli without diacritics', () => {
  const r = canon.search('"sabbe sankhara anicca"', { collection: 'dhp' });
  assert.ok(r.results.some((x) => x.id === 'dhp277'));
  assert.ok(canon.search('anapanassati', { limit: 3 }).results.length);
});

test('dictionary and HTML cleaning', () => {
  const cleaned = cleanDpdText('<p>sati 1.1</p><p>fem.</p><p>Did you spot a mistake?</p><p>Correct it here.</p><p>memory</p><p>Frequency of</p><p>table</p>');
  assert.equal(cleaned.includes('mistake'), false);
  assert.equal(cleaned.includes('table'), false);
  assert.equal(plainText('<p><span class="ref">Nya 1</span>Thus I heard</p>'), 'Thus I heard');
  assert.equal(plainText('<i>dhamma</i>s'), 'dhammas');
});

test('regressions from independent review: no silent wrong answers', () => {
  assert.equal(id('Bhikkhuni Ss 1'), 'pli-tv-bi-vb-ss1');
  assert.equal(id('bhikkhunī ss 1'), 'pli-tv-bi-vb-ss1');
  assert.equal(id('Bhikkhunī Pārājika 5'), 'pli-tv-bi-vb-pj5');
  for (const ref of ['Mv 11', 'Cv 0', 'Cv 13', 'Kd 23', 'Kd 1.2', 'Kd 1-3', 'MN 12-10', 'Th i 1', 'Sn i 25', 'Thi i 1']) {
    assert.throws(() => canon.resolve(ref), CitationError, ref);
  }
  assert.equal(id('S i 1'), 'sn1.1');
  assert.equal(id('Ds 1.1'), 'ds1.1');
  const snp = canon.describe(canon.resolve('Snp 1.8').unit);
  assert.doesNotMatch(String(snp.pts), /null/);
  assert.equal(canon.resolve('MN 1').unit.title.includes('vagg'), false);
  assert.equal(canon.resolve('SN 56.11').unit.title.includes('vagg'), false);
  assert.doesNotMatch(canon.resolve('Ss 1').unit.title, /^Ime kho/);
  assert.ok(!canon.resolve('S v 420').notes.some((n) => /PTS PTS/.test(n)));
});

test('translation links agree with Pāli ordinals and never point at a sibling sutta', () => {
  const d = canon.load();
  const ord = { pathama: 1, dutiya: 2, tatiya: 3, catuttha: 4, pancama: 5 };
  for (const [tid, links] of Object.entries(d.translations)) {
    const t = canon.fold(d.byId.get(tid).title || '');
    const p = Object.entries(ord).find(([w]) => t.startsWith(w))?.[1];
    for (const l of links) {
      const e = (l.reference || '').match(/\((\d)\)/);
      if (p && e) assert.equal(Number(e[1]), p, `${tid} ↔ ${l.reference}`);
    }
    const dt = new Set(links.filter((l) => l.source === 'dhammatalks').map((l) => l.url));
    assert.ok(dt.size <= 1, `${tid} has several dhammatalks pages`);
  }
  // Cases found by review: wrong links must be gone.
  const urls = (x) => (d.translations[x] || []).map((l) => l.url).join(' ');
  assert.doesNotMatch(urls('an10.100'), /AN10_76/);
  assert.doesNotMatch(urls('an10.48'), /AN10_59/);
  assert.doesNotMatch(urls('sn3.12'), /SN3_3\./);
  assert.doesNotMatch(urls('ud6.6'), /ud6_4/);
  assert.match(urls('an3.65'), /AN3_66/);
  assert.match(urls('an7.68'), /AN7_64/);
});

test('a verse inherits its chapter translations, with a note', () => {
  const u = canon.resolve('Dhp 183').unit;
  const desc = canon.describe(u);
  assert.ok(desc.english.length > 0);
  assert.ok(desc.notes.some((n) => /whole Dhp 179/.test(n)));
});

test('edition page citations keep "Sn" (Sutta Nipāta) apart from "SN" (Saṃyutta)', () => {
  assert.equal(parseCitation('Thai Sn 330').scope, 'snp');
  assert.equal(parseCitation('Thai SN 1.5').scope, 'sn');
  assert.throws(() => canon.resolve('Thai Sn 1.5'), CitationError);
  assert.throws(() => canon.resolve('Thai Thi Ap 2.200'), CitationError);
});
