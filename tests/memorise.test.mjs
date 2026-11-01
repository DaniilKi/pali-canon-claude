import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as canon from '../src/canon.mjs';
import * as features from '../src/features/index.mjs';
import { memorisePrompt, REVIEW_DAYS, register } from '../src/memorise.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const serverTools = [...read('src/server.mjs').matchAll(/tool\('([a-z_]+)'/g)].map((m) => m[1]);

test('memorise_passage is registered through the feature registry', () => {
  assert.equal(features.memorise?.register, register);
  const prompts = [];
  register({ prompt: (...args) => prompts.push(args) });
  assert.equal(prompts.length, 1);
  const [name, description, field, text] = prompts[0];
  assert.equal(name, 'memorise_passage');
  assert.equal(field, 'reference');
  assert.match(description, /cloze/);
  assert.equal(text, memorisePrompt);
});

test('memorise prompt works only from retrieved text', () => {
  const text = memorisePrompt('Dhp 1');
  assert.match(text, /^Help me memorise Dhp 1 in Pāli/);
  for (const name of ['resolve_reference', 'get_text', 'lookup_pali']) {
    assert.ok(text.includes(name), name);
    assert.ok(serverTools.includes(name), `${name} is a real tool`);
  }
  assert.match(text, /only text retrieved/);
  assert.match(text, /never recite from memory/);
  assert.match(text, /approximate/);
  assert.match(text, /do not expand it/);
  assert.match(text, /Chunk by segment/);
  assert.match(text, /never reword, normalise, complete or reorder/);
  assert.match(text, /Cloze practice/);
  assert.match(text, /Review schedule/);
  assert.match(text, /name the translator/);
  // Library, not teacher: no rulings on chanting or practice.
  assert.match(text, /not instruction in chanting style, pronunciation or practice/);
  // The prompt carries no scripture of its own: no Pāli verse text from the canon.
  const dhp1 = canon.segments(canon.resolve('Dhp 1').unit).find((s) => s.type === 'verse');
  assert.ok(dhp1, 'Dhp 1 has a verse segment');
  const firstLine = dhp1.text.split('\n')[0];
  assert.ok(firstLine.length > 10);
  assert.ok(!text.includes(firstLine));
});

test('review intervals expand and are stated identically in the skill and the commands', () => {
  for (let i = 1; i < REVIEW_DAYS.length; i += 1) assert.ok(REVIEW_DAYS[i] > REVIEW_DAYS[i - 1]);
  const spoken = `${REVIEW_DAYS.slice(0, -1).join(', ')} and ${REVIEW_DAYS.at(-1)} days`;
  assert.ok(memorisePrompt('x').includes(`${REVIEW_DAYS.join(', ')} days`));
  for (const file of ['skills/memorise/SKILL.md', 'commands/memorise.toml']) assert.ok(read(file).includes(spoken), file);
});

test('memorise skill, Codex metadata and Gemini command are in step', () => {
  const skill = read('skills/memorise/SKILL.md').replace(/\r\n/g, '\n');
  assert.ok(skill.startsWith('---\nname: memorise\ndescription: '));
  assert.match(skill, /\$ARGUMENTS/);
  const yaml = read('skills/memorise/agents/openai.yaml');
  assert.match(yaml, /\$memorise/);
  assert.match(yaml, /value: "pali-canon"/);
  const toml = read('commands/memorise.toml').replace(/\r\n/g, '\n');
  assert.match(toml, /\{\{args\}\}/);
  // The steps are the same text in the skill and the Gemini command.
  const steps = (s) => s.match(/^\d\. .*$/gm);
  assert.equal(steps(skill).length, 5);
  assert.deepEqual(steps(toml), steps(skill));
  for (const s of [skill, toml]) {
    for (const [, name] of s.matchAll(/`([a-z]+_[a-z_]+)`/g)) {
      if (name !== 'next_offset') assert.ok(serverTools.includes(name), `unknown tool ${name}`);
    }
  }
});

test('example references in the memorise docs resolve in the bundled canon', () => {
  assert.equal(canon.resolve('Dhp 1').unit.id, 'dhp1');
  assert.equal(canon.resolve('Snp 1.8').unit.id, 'snp1.8');
  const skill = read('skills/memorise/SKILL.md');
  for (const ref of ['Dhp 1', 'Snp 1.8']) assert.ok(skill.includes(ref), ref);
  assert.match(read('skills/memorise/agents/openai.yaml'), /Dhp 1/);
});
