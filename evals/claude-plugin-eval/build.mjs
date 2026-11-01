// Generates `claude plugin eval` cases from evals/questions.jsonl (issue #48).
//
//   node evals/claude-plugin-eval/build.mjs [--all] [--category c] [--runs n]
//
// Writes evals/claude-plugin-eval/cases/<id>/prompt.md plus one regex grader per expected citation
// (graders/cites-<n>.md) and per answer_must_match pattern (graders/says-<n>.md). The cases directory is
// generated, not committed (.gitignore); the question file stays the single source of truth.
//
// Format: as documented at https://code.claude.com/docs/en/plugin-evals (read 2026-11-01): a case is a
// directory with prompt.md (YAML frontmatter + prompt body) and graders/<name>.md (frontmatter with
// `type: regex`, `pattern`, `flags`, `target: last_message`). Not yet run against a real `claude plugin eval`
// here (no Claude Code CLI in the build environment); see the notes in run.sh.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { citationPattern, modelQuestions } from '../model-grading.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const CASES_DIR = join(here, 'cases');

const yamlString = (s) => JSON.stringify(String(s)); // a JSON string is a valid YAML double-quoted scalar

export function caseFiles(q, { runs = 1 } = {}) {
  const files = {};
  files['prompt.md'] = [
    '---',
    `name: ${yamlString(q.id)}`,
    `description: ${yamlString(`${q.category}: generated from evals/questions.jsonl`)}`,
    `tags: [${yamlString(q.category)}${q.live ? ', "live"' : ''}]`,
    `runs: ${runs}`,
    'max_turns: 15',
    'timeout_seconds: 300',
    `expected_outcome: ${yamlString(`Cites ${q.expected_citations.join(', ') || 'no text (refusal or non-citation answer)'}, from the Pali Canon tools, without inventing text.`)}`,
    '---',
    '',
    q.prompt,
    '',
  ].join('\n');
  q.expected_citations.forEach((c, i) => {
    files[`graders/cites-${i + 1}.md`] = ['---', 'type: regex', `pattern: ${yamlString(citationPattern(c))}`, 'flags: i', 'target: last_message', '---', '', `The answer cites ${c}.`, ''].join('\n');
  });
  (q.answer_must_match || []).forEach((p, i) => {
    files[`graders/says-${i + 1}.md`] = ['---', 'type: regex', `pattern: ${yamlString(p)}`, 'flags: i', 'target: last_message', '---', '', `The answer matches /${p}/i.`, ''].join('\n');
  });
  return files;
}

export function build({ all = false, category, runs = 1, dir = CASES_DIR } = {}) {
  rmSync(dir, { recursive: true, force: true });
  const questions = modelQuestions({ all, category });
  for (const q of questions) {
    for (const [name, content] of Object.entries(caseFiles(q, { runs }))) {
      const path = join(dir, q.id, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    }
  }
  return questions.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const n = build({ all: args.includes('--all'), category: value('--category'), runs: Number(value('--runs') || 1) });
  console.log(`${n} cases written to ${CASES_DIR}`);
}
