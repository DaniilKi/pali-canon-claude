// Localised guidance drafts (issue #19): structure, untranslatable tokens and citations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as canon from '../src/canon.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n');
const LANGS = ['si', 'th', 'my', 'km', 'lo', 'vi', 'zh-Hans', 'es'];
const MARKER = '> **Machine-drafted, awaiting native review.**';
const INSTALL = 'https://github.com/DaniilKi/pali-canon-claude#install';

const serverSource = read('src/server.mjs');
const instructions = serverSource.slice(serverSource.indexOf('instructions: ['), serverSource.indexOf("].join(' ')"));

const DOCS = {
  study: {
    source: 'skills/study/SKILL.md',
    citations: ['MN 10', 'SN 56:11', 'AN 3.65', 'Dhp 183', 'Snp/Sn 1.8', 'Thag 1.1', 'Pj 1', 'M i 55', 'AN 7.64', 'AN 7.68'],
    names: ['Ṭhānissaro', 'SuttaCentral', 'Access to Insight', 'dhammatalks.org'],
  },
  compare: { source: 'skills/compare/SKILL.md', citations: [], names: ['SuttaCentral'] },
  'pali-word': { source: 'skills/pali-word/SKILL.md', citations: [], names: ['Digital Pāḷi Dictionary', 'DPD', 'CC BY-NC-SA 4.0'] },
  'server-instructions': {
    source: 'src/server.mjs',
    text: instructions,
    citations: ['MN 10', 'SN 56:11', 'AN 3.65', 'Dhp 183', 'Snp 1.8', 'Thag 1.1', 'Pj 1', 'Kd 1', 'M i 55', 'S v 420'],
    names: ['Ṭhānissaro Bhikkhu', 'Chaṭṭha Saṅgāyana', 'Access to Insight', 'dhammatalks.org', 'SuttaCentral', 'Bodhi'],
    code: ['resolve_reference'],
  },
};

const ticks = (text) => new Set([...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]));
const body = (text) => text.replace(/^---\n[\s\S]*?\n---\n/, '');

test('the server instructions were found for comparison', () => {
  assert.ok(instructions.length > 200);
  assert.ok(instructions.includes('resolve_reference'));
});

test('every language folder has all four drafts, each marked as awaiting native review', () => {
  const dirs = readdirSync(resolve(root, 'docs/i18n')).filter((name) => statSync(resolve(root, 'docs/i18n', name)).isDirectory());
  assert.deepEqual(dirs.sort(), [...LANGS].sort());
  const readme = read('docs/i18n/README.md');
  for (const lang of LANGS) {
    assert.ok(readme.includes(`[\`${lang}\`](${lang}/)`), `README lists ${lang}`);
    assert.deepEqual(readdirSync(resolve(root, 'docs/i18n', lang)).sort(), Object.keys(DOCS).map((d) => `${d}.md`).sort(), lang);
    for (const doc of Object.keys(DOCS)) {
      const text = read(`docs/i18n/${lang}/${doc}.md`);
      assert.ok(text.split('\n')[0].startsWith(MARKER), `${lang}/${doc} first line marks the draft`);
      assert.ok(text.includes(`(../../../${DOCS[doc].source})`), `${lang}/${doc} links its English source`);
    }
  }
});

test('citations in the guidance are kept verbatim and resolve against the bundled canon', () => {
  for (const [doc, spec] of Object.entries(DOCS)) {
    const english = spec.text ?? read(spec.source);
    for (const citation of spec.citations) {
      assert.ok(english.includes(citation), `${citation} is in the English ${doc}`);
      const refs = citation === 'Snp/Sn 1.8' ? ['Snp 1.8', 'Sn 1.8'] : [citation];
      for (const ref of refs) assert.ok(canon.resolve(ref).unit.id, `${ref} resolves`);
      for (const lang of LANGS) assert.ok(read(`docs/i18n/${lang}/${doc}.md`).includes(citation), `${lang}/${doc} keeps ${citation}`);
    }
  }
  assert.equal(canon.resolve('MN 10').unit.id, 'mn10');
  assert.equal(canon.resolve('M i 55').unit.id, 'mn10');
  assert.equal(canon.resolve('S v 420').unit.id, 'sn56.11');
  assert.equal(canon.resolve('Sn 1.8').unit.id, 'snp1.8');
  assert.equal(canon.resolve('AN 7.68').unit.id, 'an7.68');
});

test('tool names, parameters, URLs, licences and names stay untranslated', () => {
  for (const [doc, spec] of Object.entries(DOCS)) {
    const english = spec.text ?? body(read(spec.source));
    const expected = spec.code ? new Set(spec.code) : ticks(english);
    const allowed = new Set([...expected, doc, 'instructions', spec.source]);
    for (const lang of LANGS) {
      const text = read(`docs/i18n/${lang}/${doc}.md`);
      const found = ticks(text);
      for (const token of expected) assert.ok(found.has(token), `${lang}/${doc} keeps \`${token}\``);
      for (const token of found) assert.ok(allowed.has(token), `${lang}/${doc} has unexpected code \`${token}\``);
      for (const name of spec.names) assert.ok(text.includes(name), `${lang}/${doc} keeps ${name}`);
      assert.equal(text.includes(INSTALL), english.includes(INSTALL), `${lang}/${doc} install link`);
      assert.equal(text.includes('$ARGUMENTS'), english.includes('$ARGUMENTS'), `${lang}/${doc} $ARGUMENTS`);
      const urls = [...text.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => m[0]);
      for (const url of urls) assert.equal(url, INSTALL, `${lang}/${doc} adds no other URL`);
    }
  }
});

test('each draft ends with the language note and contains no Pāli passage beyond terms', () => {
  for (const lang of LANGS) {
    for (const doc of Object.keys(DOCS)) {
      const text = read(`docs/i18n/${lang}/${doc}.md`);
      assert.equal(text.match(/^## /gm)?.length, 1, `${lang}/${doc} has one language-note section`);
      // Stock scriptural openings must never appear in guidance.
      for (const phrase of ['Evaṃ me sutaṃ', 'Namo tassa', 'bhikkhave']) assert.ok(!text.includes(phrase), `${lang}/${doc} quotes no scripture`);
    }
  }
});
