import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as canon from '../src/canon.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8').replace(/\r\n/g, '\n');
const skill = read('skills/method/SKILL.md');
const command = read('commands/method.toml');

test('method skill: every example citation resolves in the bundled canon, with the stated genre', () => {
  const expected = {
    'MN 10': ['mn10', 'sutta'],
    'Dhp 183': ['dhp183', 'sutta'],
    'Thag 1.1': ['thag1.1', 'sutta'],
    'Pj 1': ['pli-tv-bu-vb-pj1', 'vinaya'],
    'Ds 1': ['ds1.1', 'abhidhamma'],
    'Kv 1': ['kv1.1', 'abhidhamma'],
  };
  for (const [ref, [id, pitaka]] of Object.entries(expected)) {
    assert.ok(skill.includes(ref) && command.includes(ref), `${ref} is cited in both the skill and the Gemini command`);
    const r = canon.resolve(ref);
    assert.equal(r.unit.id, id, ref);
    assert.equal(canon.describe(r.unit).pitaka, pitaka, ref);
  }
  // Examples used in the install docs.
  assert.equal(canon.resolve('Kv 1').unit.id, 'kv1.1');
});

test('method skill: factual claims about the bundled edition hold', () => {
  const d = canon.load();
  // Milindapañha, Nettippakaraṇa and Peṭakopadesa are in the VRI edition (Khuddaka Nikāya).
  for (const c of ['mil', 'ne', 'pe']) assert.ok(d.canon.books.some((b) => b.collection === c), c);
  // The bundled Jātaka is verse only; the prose stories are commentary and are not bundled.
  const ja = canon.resolve('Ja 1').unit;
  const rends = d.canon.books[ja.book].blocks.slice(ja.start, ja.end).map((b) => b[0]);
  assert.ok(rends.some((r) => r.startsWith('gatha')));
  assert.ok(!rends.includes('bodytext'), 'no prose in Ja 1');
  // No commentary books are bundled (the skill says commentaries are not in this server).
  assert.ok(!d.canon.books.some((b) => /\.att\.|\.tik\./.test(b.file)), 'no aṭṭhakathā or ṭīkā files');
});

test('method skill: library not teacher, cross-referenced from study and compare', () => {
  for (const text of [skill, command]) {
    assert.match(text, /library, not a teacher/);
    assert.match(text, /Never rank teachers, lineages or traditions/);
    assert.match(text, /label it "commentary"/);
    assert.match(text, /not bundled/);
  }
  assert.match(read('skills/study/SKILL.md'), /`method` skill/);
  assert.match(read('skills/compare/SKILL.md'), /`method` skill/);
  assert.match(read('commands/study.toml'), /`\/method`/);
  assert.match(read('commands/compare.toml'), /`\/method`/);
  assert.match(read('skills/method/agents/openai.yaml'), /value: "pali-canon"/);
  assert.match(read('GEMINI.md'), /`\/method /);
});
