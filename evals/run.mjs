#!/usr/bin/env node
// Offline accuracy evaluation (issue #48). Starts the MCP server in-process (createServer + the SDK's
// InMemoryTransport), runs every question's tool checks from evals/questions.jsonl and prints a score per
// category. Deterministic: without --live, network access is switched off (globalThis.fetch throws), and
// questions marked "live" are skipped. Questions whose `requires_tool` is not registered are skipped too.
//
//   node evals/run.mjs [--live] [--category name] [--id id] [--threshold 1] [--json out.json] [--verbose]
//
// Exit code 1 when the suite does not validate (bad question, expected citation that does not resolve) or
// when the pass rate of the non-skipped questions is below the threshold (default 1 = every one passes).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as canon from '../src/canon.mjs';

export const QUESTIONS_PATH = fileURLToPath(new URL('./questions.jsonl', import.meta.url));

/** Categories, in report order, with a one-line description (also used by the docs). */
export const CATEGORIES = {
  citation_resolution: 'IDs, PTS pages, links, Vinaya forms and the Mahāvagga/Cūḷavagga → Khandhaka mapping',
  numbering_traps: 'standard vs PTS-based numbering (AN 7.64/7.68, Kālāma AN 3.65 vs dhammatalks AN 3.66, other SN/AN shifts)',
  approximate_texts: 'abbreviated (peyyāla) texts and grouped members stay flagged',
  quote_verification: 'genuine Pāli quotations found at the right text; fabricated and misattributed ones not found',
  find_citations: 'every citation in a passage found, resolved or reported unresolved',
  commentary: 'commentary and word analysis (get_commentary, analyse_passage: skipped until registered)',
  scripts: 'the script parameter and input in other scripts',
  edition_pages: 'Thai, Myanmar and VRI edition page references, both directions',
  variants: 'structured and raw variant readings with edition sigla',
  calendar: 'uposatha and festival output: internal consistency and linked citations only',
  topics_lists: 'numbered lists and Access to Insight topics with resolvable sources',
  vinaya_rules: 'Pātimokkha rules mapped to their Vinaya text',
  abhidhamma: 'mātikā, Paṭṭhāna conditions and Abhidhamma citations',
  daily_reading: 'daily text rotation and reading plans',
  paritta: 'chanted texts traced to canonical sources',
  translations: 'translation availability and the no-silent-substitution rule',
  refusals: 'invalid citations fail with a clear error',
};

const EXPECT_KEYS = new Set(['error', 'equals', 'includes', 'excludes', 'matches', 'some_match', 'min', 'max', 'exists', 'absent',
  'resolves', 'text_contains', 'text_not_contains', 'text_matches', 'text_not_matches']);

export function loadQuestions(path = QUESTIONS_PATH) {
  return readFileSync(path, 'utf8').split(/\r?\n/).filter((line) => line.trim()).map((line, i) => {
    try { return JSON.parse(line); } catch (error) { throw new Error(`questions.jsonl line ${i + 1}: ${error.message}`); }
  });
}

/** Values at a dot path; `*` expands every element of an array (or value of an object). Missing → []. */
export function valuesAt(obj, path) {
  let current = [obj];
  for (const key of path.split('.')) {
    const next = [];
    for (const value of current) {
      if (value === null || value === undefined) continue;
      if (key === '*') {
        if (Array.isArray(value)) next.push(...value);
        else if (typeof value === 'object') next.push(...Object.values(value));
      } else if (Array.isArray(value) && /^\d+$/.test(key)) {
        if (value[Number(key)] !== undefined) next.push(value[Number(key)]);
      } else if (typeof value === 'object' && key in value) {
        next.push(value[key]);
      }
    }
    current = next;
  }
  return current;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const show = (v) => { const s = JSON.stringify(v); return s && s.length > 160 ? `${s.slice(0, 157)}...` : s; };
const size = (v) => (Array.isArray(v) ? v.length : typeof v === 'string' ? v.length : typeof v === 'object' && v ? Object.keys(v).length : Number(v));

/** Does a citation or text ID resolve in the bundled canon? Returns the unit id or throws. */
export function resolveId(reference) {
  return canon.resolve(String(reference)).unit.id;
}

/** Check one tool result against an `expect` block. Returns a list of failure messages (empty = pass). */
export function evaluate(expect, { isError, text, json }) {
  const fails = [];
  if ('error' in expect) {
    if (!isError) return [`expected an error, got a result: ${show(json ?? text)}`];
    if (typeof expect.error === 'string' && !new RegExp(expect.error, 'u').test(text)) fails.push(`error does not match /${expect.error}/: ${show(text)}`);
  } else if (isError) {
    return [`tool returned an error: ${show(text)}`];
  }
  const obj = json ?? {};
  for (const [path, want] of Object.entries(expect.equals || {})) {
    const values = valuesAt(obj, path);
    if (!values.some((v) => same(v, want))) fails.push(`${path}: expected ${show(want)}, got ${show(values)}`);
  }
  for (const [path, wants] of Object.entries(expect.includes || {})) {
    const values = valuesAt(obj, path);
    for (const want of wants) if (!values.some((v) => same(v, want))) fails.push(`${path}: missing ${show(want)} in ${show(values)}`);
  }
  for (const [path, nots] of Object.entries(expect.excludes || {})) {
    const values = valuesAt(obj, path);
    for (const not of nots) if (values.some((v) => same(v, not))) fails.push(`${path}: must not contain ${show(not)}`);
  }
  for (const [path, pattern] of Object.entries(expect.matches || {})) {
    const values = valuesAt(obj, path);
    const re = new RegExp(pattern, 'u');
    if (!values.length) fails.push(`${path}: no values (expected all to match /${pattern}/)`);
    for (const v of values) if (!re.test(String(v))) { fails.push(`${path}: ${show(v)} does not match /${pattern}/`); break; }
  }
  for (const [path, pattern] of Object.entries(expect.some_match || {})) {
    const values = valuesAt(obj, path);
    const re = new RegExp(pattern, 'u');
    if (!values.some((v) => re.test(typeof v === 'string' ? v : JSON.stringify(v)))) fails.push(`${path}: nothing matches /${pattern}/ in ${show(values)}`);
  }
  for (const [path, n] of Object.entries(expect.min || {})) {
    const values = valuesAt(obj, path);
    if (!values.length || size(values[0]) < n) fails.push(`${path}: expected at least ${n}, got ${show(values.map(size))}`);
  }
  for (const [path, n] of Object.entries(expect.max || {})) {
    const values = valuesAt(obj, path);
    if (!values.length || size(values[0]) > n) fails.push(`${path}: expected at most ${n}, got ${show(values.map(size))}`);
  }
  for (const path of expect.exists || []) if (!valuesAt(obj, path).length) fails.push(`${path}: missing`);
  for (const path of expect.absent || []) if (valuesAt(obj, path).length) fails.push(`${path}: must be absent, got ${show(valuesAt(obj, path))}`);
  for (const path of expect.resolves || []) {
    const values = valuesAt(obj, path);
    if (!values.length) fails.push(`${path}: no citations to resolve`);
    for (const v of values) {
      try {
        const id = resolveId(v);
        if (/^[a-z]/.test(String(v)) && !String(v).includes(' ') && id !== v) fails.push(`${path}: ${v} resolves to ${id}, not itself`);
      } catch (error) { fails.push(`${path}: ${show(v)} does not resolve (${error.message})`); }
    }
  }
  for (const s of expect.text_contains || []) if (!text.includes(s)) fails.push(`result text lacks ${show(s)}`);
  for (const s of expect.text_not_contains || []) if (text.includes(s)) fails.push(`result text must not contain ${show(s)}`);
  for (const p of expect.text_matches || []) if (!new RegExp(p, 'iu').test(text)) fails.push(`result text does not match /${p}/i`);
  for (const p of expect.text_not_matches || []) if (new RegExp(p, 'iu').test(text)) fails.push(`result text must not match /${p}/i`);
  return fails;
}

/** Structural checks on the question file, and every expected citation resolves in the bundled canon. */
export function validateQuestions(questions, toolNames) {
  const problems = [];
  const ids = new Set();
  for (const q of questions) {
    const where = q.id || JSON.stringify(q).slice(0, 60);
    if (!q.id || typeof q.id !== 'string') problems.push(`${where}: missing id`);
    if (ids.has(q.id)) problems.push(`${where}: duplicate id`);
    ids.add(q.id);
    if (!(q.category in CATEGORIES)) problems.push(`${where}: unknown category ${q.category}`);
    if (!q.prompt || typeof q.prompt !== 'string') problems.push(`${where}: missing prompt`);
    if (!Array.isArray(q.expected_citations)) problems.push(`${where}: expected_citations must be an array`);
    if (!Array.isArray(q.checks) || !q.checks.length) problems.push(`${where}: needs at least one check`);
    if (Array.isArray(q.expected_citations) && !q.expected_citations.length && !q.answer_must_match?.length) {
      problems.push(`${where}: a question with no expected citation needs answer_must_match for model-level grading`);
    }
    for (const c of q.expected_citations || []) {
      try { resolveId(c); } catch (error) { problems.push(`${where}: expected citation "${c}" does not resolve: ${error.message}`); }
    }
    for (const p of q.answer_must_match || []) { try { new RegExp(p, 'iu'); } catch (error) { problems.push(`${where}: bad answer_must_match ${p}`); } }
    for (const check of q.checks || []) {
      if (!check.tool || typeof check.args !== 'object' || typeof check.expect !== 'object') { problems.push(`${where}: a check needs tool, args and expect`); continue; }
      for (const key of Object.keys(check.expect)) if (!EXPECT_KEYS.has(key)) problems.push(`${where}: unknown expect key ${key}`);
      // A tool that is not registered is allowed only when the question declares it in requires_tool (then skipped).
      if (toolNames && !toolNames.has(check.tool) && q.requires_tool !== check.tool) problems.push(`${where}: tool ${check.tool} is not registered and not declared in requires_tool`);
    }
  }
  return problems;
}

async function connect() {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'pali-canon-evals', version: '1.0.0' });
  await Promise.all([createServer().connect(serverSide), client.connect(clientSide)]);
  return client;
}

/**
 * Run the suite. Returns { results, byCategory, totals, problems, score, passed }.
 * Options: live (allow network and run live questions), category, id, threshold (0..1), questions.
 */
export async function runEvals({ live = false, category, id, threshold = 1, questions = loadQuestions() } = {}) {
  const realFetch = globalThis.fetch;
  if (!live) globalThis.fetch = async (url) => { throw new Error(`offline evaluation: network disabled (${url})`); };
  const client = await connect();
  try {
    const toolNames = new Set((await client.listTools()).tools.map((t) => t.name));
    const problems = validateQuestions(questions, toolNames);
    const selected = questions.filter((q) => (!category || q.category === category) && (!id || q.id === id));
    const results = [];
    for (const q of selected) {
      if (q.requires_tool && !toolNames.has(q.requires_tool)) { results.push({ id: q.id, category: q.category, status: 'skipped', reason: `requires ${q.requires_tool} (not registered)` }); continue; }
      if (q.live && !live) { results.push({ id: q.id, category: q.category, status: 'skipped', reason: 'live network question (run with --live)' }); continue; }
      const failures = [];
      for (const [i, check] of q.checks.entries()) {
        let raw;
        try {
          raw = await client.callTool({ name: check.tool, arguments: check.args });
        } catch (error) {
          raw = { isError: true, content: [{ type: 'text', text: error.message }] };
        }
        const text = (raw.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
        let json = raw.structuredContent;
        if (!json) { try { json = JSON.parse(text); } catch { json = undefined; } }
        for (const f of evaluate(check.expect, { isError: Boolean(raw.isError), text, json })) failures.push(`check ${i + 1} (${check.tool}): ${f}`);
      }
      results.push({ id: q.id, category: q.category, status: failures.length ? 'fail' : 'pass', failures });
    }
    const byCategory = {};
    for (const cat of Object.keys(CATEGORIES)) byCategory[cat] = { pass: 0, fail: 0, skipped: 0 };
    for (const r of results) byCategory[r.category][r.status === 'skipped' ? 'skipped' : r.status] += 1;
    const totals = { pass: 0, fail: 0, skipped: 0 };
    for (const c of Object.values(byCategory)) { totals.pass += c.pass; totals.fail += c.fail; totals.skipped += c.skipped; }
    const scored = totals.pass + totals.fail;
    const score = scored ? totals.pass / scored : 1;
    return { results, byCategory, totals, problems, score, threshold, live, passed: !problems.length && score >= threshold };
  } finally {
    await client.close();
    globalThis.fetch = realFetch;
  }
}

const pct = (pass, fail) => (pass + fail ? `${((100 * pass) / (pass + fail)).toFixed(1)}%` : '—');

export function formatReport({ results, byCategory, totals, problems, score, threshold, live }, { verbose = false } = {}) {
  const lines = [];
  lines.push(`Pali Canon accuracy evaluation (${live ? 'offline + live' : 'offline'} tool checks)`, '');
  lines.push(`${'category'.padEnd(22)} ${'pass'.padStart(5)} ${'fail'.padStart(5)} ${'skip'.padStart(5)} ${'score'.padStart(7)}`);
  for (const [cat, c] of Object.entries(byCategory)) {
    if (!c.pass && !c.fail && !c.skipped) continue;
    lines.push(`${cat.padEnd(22)} ${String(c.pass).padStart(5)} ${String(c.fail).padStart(5)} ${String(c.skipped).padStart(5)} ${pct(c.pass, c.fail).padStart(7)}`);
  }
  lines.push(`${'TOTAL'.padEnd(22)} ${String(totals.pass).padStart(5)} ${String(totals.fail).padStart(5)} ${String(totals.skipped).padStart(5)} ${pct(totals.pass, totals.fail).padStart(7)}`);
  lines.push('', `Questions: ${results.length}. Threshold: ${(threshold * 100).toFixed(0)}% of non-skipped questions. Score: ${(score * 100).toFixed(1)}%.`);
  const skipped = {};
  for (const r of results) if (r.status === 'skipped') skipped[r.reason] = (skipped[r.reason] || 0) + 1;
  for (const [reason, n] of Object.entries(skipped)) lines.push(`Skipped ${n}: ${reason}`);
  for (const r of results) {
    if (r.status === 'fail') { lines.push('', `FAIL ${r.id} [${r.category}]`); for (const f of r.failures) lines.push(`  - ${f}`); }
    else if (verbose) lines.push(`${r.status.toUpperCase()} ${r.id}`);
  }
  if (problems.length) { lines.push('', `Suite validation: ${problems.length} problem(s)`); for (const p of problems) lines.push(`  - ${p}`); }
  return lines.join('\n');
}

function parseArgs(argv) {
  const opts = { live: false, verbose: false, threshold: 1 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--live') opts.live = true;
    else if (a === '--verbose' || a === '-v') opts.verbose = true;
    else if (a === '--category') opts.category = argv[++i];
    else if (a === '--id') opts.id = argv[++i];
    else if (a === '--threshold') opts.threshold = Number(argv[++i]);
    else if (a === '--json') opts.json = argv[++i];
    else throw new Error(`Unknown option ${a}`);
  }
  return opts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = parseArgs(process.argv.slice(2));
  const report = await runEvals(opts);
  console.log(formatReport(report, opts));
  if (opts.json) writeFileSync(opts.json, JSON.stringify(report, null, 2));
  if (!report.passed) {
    console.error(`\nEVALUATION FAILED: ${report.problems.length ? 'the suite does not validate' : `score below ${(report.threshold * 100).toFixed(0)}%`}.`);
    process.exit(1);
  }
}
