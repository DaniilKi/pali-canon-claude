// Accuracy evaluation suite (issue #48): CI runs the offline tool checks of evals/questions.jsonl and requires
// every non-skipped question to pass. Also checks that the runner cannot pass vacuously and that the
// model-level graders (Claude plugin eval cases, Codex answers) recognise citations correctly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, evaluate, loadQuestions, runEvals, valuesAt } from '../evals/run.mjs';
import { citationPattern, gradeAnswer } from '../evals/model-grading.mjs';
import { caseFiles } from '../evals/claude-plugin-eval/build.mjs';

const questions = loadQuestions();

test('the question set is large enough and covers every category', () => {
  assert.ok(questions.length >= 150, `${questions.length} questions`);
  for (const cat of Object.keys(CATEGORIES)) assert.ok(questions.some((q) => q.category === cat), `no questions in ${cat}`);
});

test('offline evaluation: suite validates and every non-skipped question passes', async () => {
  const report = await runEvals();
  assert.deepEqual(report.problems, [], report.problems.join('\n'));
  const failed = report.results.filter((r) => r.status === 'fail');
  assert.deepEqual(failed.map((r) => `${r.id}: ${r.failures.join('; ')}`), []);
  assert.ok(report.totals.pass >= 150, `only ${report.totals.pass} offline passes`);
  // Skips are only for live-network questions and tools that are not registered yet, never silent.
  for (const r of report.results.filter((x) => x.status === 'skipped')) assert.match(r.reason, /^(live network question|requires \w+ \(not registered\))/, r.id);
  assert.equal(report.passed, true);
});

test('the runner fails a wrong expectation and an unresolvable expected citation', async () => {
  const q = structuredClone(questions.find((x) => x.id === 'num-an7-68-standard'));
  q.checks[0].expect.equals.id = 'an7.64';
  q.expected_citations = ['MN 999'];
  const report = await runEvals({ questions: [q] });
  assert.equal(report.results[0].status, 'fail');
  assert.ok(report.problems.some((p) => /MN 999.*does not resolve/.test(p)), report.problems.join('\n'));
  assert.equal(report.passed, false);
});

test('offline runs have no network: a live question forced offline fails instead of fetching', async () => {
  const q = structuredClone(questions.find((x) => x.id === 'tr-live-mn10-dt'));
  delete q.live;
  const report = await runEvals({ questions: [q] });
  assert.equal(report.results[0].status, 'fail');
  assert.match(report.results[0].failures.join(' '), /network disabled|unreachable|error/i);
});

test('expect operators: paths, wildcards, errors', () => {
  const json = { a: [{ id: 'mn10', n: [1, 2] }, { id: 'mn11' }], s: 'x' };
  assert.deepEqual(valuesAt(json, 'a.*.id'), ['mn10', 'mn11']);
  assert.deepEqual(valuesAt(json, 'a.0.n.*'), [1, 2]);
  assert.deepEqual(valuesAt(json, 'missing.*'), []);
  const ok = { isError: false, text: JSON.stringify(json), json };
  assert.deepEqual(evaluate({ equals: { 'a.*.id': 'mn11' }, min: { a: 2 }, resolves: ['a.*.id'] }, ok), []);
  assert.equal(evaluate({ includes: { 'a.*.id': ['mn12'] } }, ok).length, 1);
  assert.equal(evaluate({ matches: { 'a.*.id': '^mn10$' } }, ok).length, 1);
  assert.equal(evaluate({ error: true }, ok).length, 1);
  assert.equal(evaluate({ equals: { s: 'x' } }, { isError: true, text: 'boom' }).length, 1);
  assert.deepEqual(evaluate({ error: 'boo' }, { isError: true, text: 'boom' }), []);
});

test('model-level grading finds citations in their common spellings only', () => {
  const re = (c) => new RegExp(citationPattern(c), 'iu');
  for (const s of ['AN 7.68', 'AN 7:68', 'an7.68', '(AN 7.68)']) assert.match(s, re('AN 7.68'));
  for (const s of ['AN 7.680', 'AN 7.6', 'AN 17.68']) assert.doesNotMatch(s, re('AN 7.68'));
  assert.doesNotMatch('MN 10', re('MN 1'));
  assert.match('Sn 1.8', re('Snp 1.8'));
  assert.match('Khp 9', re('Kp 9'));
  assert.match('Pj 1', re('Bu Pj 1'));
  assert.match('Dhp 1-20', re('Dhp 1–20'));
  assert.match('Patthana 1.1', re('Paṭṭh 1.1'));
  const q = questions.find((x) => x.id === 'num-kalama-an3-65');
  assert.equal(gradeAnswer(q, 'The Kālāma Sutta is AN 3.65 (Ṭhānissaro: AN 3:66).').pass, true);
  assert.equal(gradeAnswer(q, 'The Kālāma Sutta is AN 3.66.').pass, false);
  const refusal = questions.find((x) => x.id === 'ref-mn999');
  assert.equal(gradeAnswer(refusal, 'MN 999 does not exist: the Majjhima Nikāya has 152 suttas.').pass, true);
  assert.equal(gradeAnswer(refusal, 'MN 999 teaches mindfulness.').pass, false);
});

test('Claude plugin eval cases: prompt.md frontmatter and one regex grader per expected citation', () => {
  const q = questions.find((x) => x.id === 'num-an7-68-standard');
  const files = caseFiles(q);
  assert.match(files['prompt.md'], /^---\nname: "num-an7-68-standard"\n[\s\S]*\n---\n\nWhat is AN 7\.68/);
  const graders = Object.keys(files).filter((f) => f.startsWith('graders/'));
  assert.equal(graders.length, q.expected_citations.length + (q.answer_must_match || []).length);
  assert.match(files['graders/cites-1.md'], /^---\ntype: regex\npattern: ".+"\nflags: i\ntarget: last_message\n---/);
});
