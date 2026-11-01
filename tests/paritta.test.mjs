import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { PARITTA, CHANTING_BOOKS, paritta, find, chantingBooks } from '../src/paritta.mjs';

const fold = (s) => canon.fold(s).replace(/[^a-z0-9]+/g, ' ').trim();

test('every paritta source resolves in the bundled canon', () => {
  for (const entry of PARITTA) {
    assert.ok(entry.texts.length, entry.key);
    for (const ref of entry.texts) {
      const { unit } = canon.resolve(ref);
      assert.ok(unit, `${entry.key}: ${ref}`);
      assert.ok(!unit.approximate, `${entry.key}: ${ref} is abbreviated`);
      assert.notEqual(unit.kind, 'range', `${entry.key}: ${ref} is a range`);
      assert.ok(canon.segments(unit).length > 1, `${entry.key}: ${ref} has text`);
    }
  }
});

test('canonical sources are the expected texts', () => {
  const ids = Object.fromEntries(PARITTA.map((e) => [e.key, e.texts.map((t) => canon.resolve(t).unit.id)]));
  assert.deepEqual(ids.mangala, ['kp5', 'snp2.4']);
  assert.deepEqual(ids.ratana, ['kp6', 'snp2.1']);
  assert.deepEqual(ids['karaniya-metta'], ['kp9', 'snp1.8']);
  assert.deepEqual(ids.khandha, ['an4.67']);
  assert.deepEqual(ids.dhajagga, ['sn11.3']);
  assert.deepEqual(ids.mora, ['ja159']);
  assert.deepEqual(ids.atanatiya, ['dn32']);
  assert.deepEqual(ids.bojjhanga, ['sn46.14', 'sn46.15', 'sn46.16']);
  assert.equal(canon.resolve('Kp 5').unit.title, 'Maṅgalasuttaṃ');
  assert.equal(canon.resolve('Kp 6').unit.title, 'Ratanasuttaṃ');
  assert.equal(canon.resolve('Kp 9').unit.title, 'Mettasuttaṃ');
  assert.equal(canon.resolve('AN 4.67').unit.title, 'Ahirājasuttaṃ');
  assert.equal(canon.resolve('SN 11.3').unit.title, 'Dhajaggasuttaṃ');
  assert.match(canon.resolve('Ja 159').unit.title, /^Morajātakaṃ/);
  assert.equal(canon.resolve('DN 32').unit.title, 'Āṭānāṭiyasuttaṃ');
  assert.equal(canon.resolve('SN 46.14').unit.title, 'Paṭhamagilānasuttaṃ');
});

test('keys and aliases are unique and every entry is found by key and name', () => {
  const keys = PARITTA.map((e) => e.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const e of PARITTA) {
    assert.equal(find(e.key).key, e.key);
    assert.equal(find(e.name).key, e.key, e.name);
    for (const alias of e.aliases) assert.equal(find(alias).key, e.key, alias);
  }
  assert.equal(find('Karaṇīyamettā').key, 'karaniya-metta');
  assert.equal(find('karaniya metta sutta').key, 'karaniya-metta');
  assert.equal(find('Ratana Sutta').key, 'ratana');
  assert.equal(find('xyzzy'), null);
});

test('every entry returns Pāli identical to the bundled VRI text', () => {
  for (const e of PARITTA) {
    for (const ref of e.texts) {
      const r = paritta(canon, { name: e.key, text: ref, limit: 200 });
      const unit = canon.resolve(ref).unit;
      assert.equal(r.text_id, unit.id);
      const bundled = new Map(canon.segments(unit).map((s) => [s.ref, s.text]));
      assert.ok(r.segments.length, `${e.key} ${ref}`);
      for (const s of r.segments) assert.equal(s.text, bundled.get(s.ref), `${e.key} ${s.ref}`);
      assert.match(r.attribution, /Vipassana Research Institute/);
      assert.ok(r.terms);
    }
  }
});

test('passage selection finds its phrase in the bundle (Aṅgulimāla, MN 86)', () => {
  for (const e of PARITTA.filter((x) => x.passage)) {
    const r = paritta(canon, { name: e.key });
    const hits = r.segments.filter((s) => fold(s.text).includes(fold(e.passage)));
    assert.ok(hits.length, e.key);
    assert.ok(r.total_segments < canon.segments(canon.resolve(e.texts[0]).unit).length);
  }
  const a = paritta(canon, { name: 'Aṅgulimāla' });
  assert.equal(a.text_id, 'mn86');
  assert.ok(a.segments.some((s) => /ariyāya jātiyā jāto/.test(s.text)));
});

test('content checks against the bundled text', () => {
  assert.ok(paritta(canon, { name: 'mora' }).segments.some((s) => /Udetayaṃ cakkhumā ekarājā/.test(s.text)));
  assert.ok(paritta(canon, { name: 'khandha' }).segments.some((s) => /Virūpakkhehi me mettaṃ/.test(s.text)));
  const kp6 = paritta(canon, { name: 'ratana' });
  assert.equal(kp6.text_id, 'kp6');
  assert.deepEqual(kp6.other_sources, ['Snp 2.1']);
  assert.equal(paritta(canon, { name: 'ratana', text: 'Snp 2.1' }).text_id, 'snp2.1');
  assert.equal(paritta(canon, { name: 'metta', text: 'Sn 1.8' }).text_id, 'snp1.8');
});

test('pagination for long texts', () => {
  const p1 = paritta(canon, { name: 'atanatiya', limit: 10 });
  assert.equal(p1.returned, 10);
  assert.equal(p1.next_offset, 10);
  const p2 = paritta(canon, { name: 'atanatiya', offset: p1.next_offset, limit: 10 });
  assert.notEqual(p2.segments[0].ref, p1.segments[9].ref);
});

test('English is links only, from the existing translation index, never SuttaCentral content', () => {
  for (const e of PARITTA) {
    const r = paritta(canon, { name: e.key });
    const unit = canon.resolve(e.texts[0]).unit;
    assert.equal(r.english.length, canon.linksFor(unit).links.length, e.key);
    for (const link of r.english) {
      assert.match(link.url, /^https:\/\/(www\.)?(dhammatalks\.org|accesstoinsight\.org)\//, `${e.key} ${link.url}`);
      assert.ok(!('text' in link));
    }
  }
  const kh = paritta(canon, { name: 'khandha' });
  assert.ok(kh.english.some((l) => /dhammatalks/.test(l.url)));
  const sn4615 = paritta(canon, { name: 'bojjhanga', text: 'SN 46.15' });
  assert.equal(sn4615.english.length, 0);
  assert.match(sn4615.english_note, /No English translation/);
});

test('listing names every entry with resolved citations', () => {
  const list = paritta(canon, {});
  assert.equal(list.paritta.length, PARITTA.length);
  for (const item of list.paritta) for (const t of item.texts) assert.equal(canon.resolve(t.citation).unit.id, t.text_id);
});

test('errors: unknown name and a text that is not a source', () => {
  assert.throws(() => paritta(canon, { name: 'no such chant' }), /No paritta named/);
  assert.throws(() => paritta(canon, { name: 'ratana', text: 'MN 10' }), /not a source/);
});

test('chanting-book layouts are permission-gated: code path present, no content', () => {
  assert.ok(CHANTING_BOOKS.length >= 2);
  for (const b of CHANTING_BOOKS) assert.equal(b.granted, false, b.id);
  for (const b of chantingBooks()) {
    assert.equal(b.available, false);
    assert.match(b.reason, /not granted/);
    assert.deepEqual(Object.keys(b).sort(), ['available', 'publisher', 'reason']);
  }
  assert.deepEqual(paritta(canon, { name: 'mangala' }).chanting_books, chantingBooks());
});
