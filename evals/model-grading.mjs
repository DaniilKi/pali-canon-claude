// Model-level grading shared by the Claude plugin eval adapter and the Codex runner (issue #48).
// A model's answer passes a question when every expected citation appears in it (in any common spelling:
// "AN 7.68", "AN 7:68", "an7.68") and every answer_must_match pattern matches. No model is called here.
//
//   node evals/model-grading.mjs prompts <dir> [--all] [--category c]   write <id>.txt prompts for a runner
//   node evals/model-grading.mjs grade <answers-dir> [--json out.json]   grade <id>.md / <id>.txt answers
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CATEGORIES, loadQuestions, resolveId } from './run.mjs';
import { expectedToolNames } from '../scripts/expected-tools.mjs';

// Letters that people (and models) often type without diacritics.
const FOLD = { ā: 'a', ī: 'i', ū: 'u', ṃ: 'm', ṁ: 'm', ṅ: 'n', ñ: 'n', ṭ: 't', ḍ: 'd', ṇ: 'n', ḷ: 'l' };
// Other abbreviations in common use for the same collection (Ṭhānissaro writes Khp and Sn, for example).
const ALIASES = { Snp: ['Sn'], Kp: ['Khp'], Iti: ['It'], Paṭṭh: ['Patthana', 'Paṭṭhāna'] };
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function letters(s) {
  return [...s].map((ch) => {
    const lower = ch.toLowerCase();
    if (FOLD[lower]) return `[${lower}${FOLD[lower]}]`;
    return escape(ch);
  }).join('');
}

/**
 * A regular expression source (flags: i) that finds a citation in prose. "AN 7.68" also matches "AN 7:68",
 * "AN7.68" and "an7.68" but not "AN 7.680"; "Bu Pj 1" also matches "Pj 1"; ranges accept "-" or "–".
 */
export function citationPattern(citation) {
  const c = citation.trim().replace(/^(Bu)\s+/, '');
  const m = c.match(/^(.*?[A-Za-zāīūṃṅñṭḍṇḷ.])\s*(\d.*)$/u);
  if (!m) return `(?<![\\w])${letters(c)}(?![\\w])`;
  const [, prefix, number] = m;
  const num = number.split(/([.:–-])/).map((part) => (/^[.:]$/.test(part) ? '\\s*[.:]\\s*' : /^[–-]$/.test(part) ? '\\s*[-–]\\s*' : escape(part))).join('');
  const trimmed = prefix.trim();
  const spellings = [trimmed, ...(ALIASES[trimmed] || [])];
  const pre = `(?:${spellings.map((p) => p.split(/\s+/).map(letters).join('\\s*')).join('|')})`;
  return `(?<![\\w])${pre}\\s*${num}(?![\\d])`;
}

/** Grade one answer. Returns { pass, missing_citations, missing_patterns }. */
export function gradeAnswer(question, answer) {
  const missing_citations = question.expected_citations.filter((c) => !new RegExp(citationPattern(c), 'iu').test(answer));
  const missing_patterns = (question.answer_must_match || []).filter((p) => !new RegExp(p, 'iu').test(answer));
  return { pass: !missing_citations.length && !missing_patterns.length, missing_citations, missing_patterns };
}

/** Questions a model can be asked now: those whose requires_tool is registered (or all, with all: true). */
export function modelQuestions({ all = false, category } = {}) {
  const tools = new Set(expectedToolNames());
  return loadQuestions().filter((q) => (all || !q.requires_tool || tools.has(q.requires_tool)) && (!category || q.category === category));
}

export function gradeDirectory(dir, questions = loadQuestions()) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const results = [];
  for (const file of readdirSync(dir).filter((f) => /\.(md|txt)$/.test(f)).sort()) {
    const id = file.replace(/\.(md|txt)$/, '');
    const q = byId.get(id);
    if (!q) continue;
    results.push({ id, category: q.category, ...gradeAnswer(q, readFileSync(join(dir, file), 'utf8')) });
  }
  const byCategory = {};
  for (const cat of Object.keys(CATEGORIES)) byCategory[cat] = { pass: 0, fail: 0 };
  for (const r of results) byCategory[r.category][r.pass ? 'pass' : 'fail'] += 1;
  const pass = results.filter((r) => r.pass).length;
  return { results, byCategory, totals: { pass, fail: results.length - pass } };
}

function main(argv) {
  const [command, dir, ...rest] = argv;
  const flag = (name) => rest.includes(name);
  const value = (name) => (rest.includes(name) ? rest[rest.indexOf(name) + 1] : undefined);
  if (command === 'prompts' && dir) {
    mkdirSync(dir, { recursive: true });
    const qs = modelQuestions({ all: flag('--all'), category: value('--category') });
    for (const q of qs) {
      for (const c of q.expected_citations) resolveId(c); // never send a question whose answer key is broken
      writeFileSync(join(dir, `${q.id}.txt`), q.prompt);
    }
    console.log(`${qs.length} prompts written to ${dir}`);
    return 0;
  }
  if (command === 'grade' && dir && existsSync(dir)) {
    const report = gradeDirectory(dir);
    for (const [cat, c] of Object.entries(report.byCategory)) {
      if (c.pass + c.fail) console.log(`${cat.padEnd(22)} ${String(c.pass).padStart(4)} / ${String(c.pass + c.fail).padEnd(4)} ${((100 * c.pass) / (c.pass + c.fail)).toFixed(1)}%`);
    }
    const { pass, fail } = report.totals;
    console.log(`${'TOTAL'.padEnd(22)} ${String(pass).padStart(4)} / ${String(pass + fail).padEnd(4)} ${pass + fail ? ((100 * pass) / (pass + fail)).toFixed(1) : '0.0'}%`);
    for (const r of report.results.filter((x) => !x.pass)) {
      console.log(`FAIL ${r.id}: missing ${[...r.missing_citations, ...r.missing_patterns.map((p) => `/${p}/`)].join(', ')}`);
    }
    if (value('--json')) writeFileSync(value('--json'), JSON.stringify(report, null, 2));
    return 0;
  }
  console.error('Usage: node evals/model-grading.mjs prompts <dir> [--all] [--category c] | grade <answers-dir> [--json out.json]');
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main(process.argv.slice(2)));
