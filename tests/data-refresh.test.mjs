// Monthly data refresh (issue #50): the workflow's safety properties, the diff report and the DPD pin update.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW = fs.readFileSync(path.join(ROOT, '.github/workflows/data-refresh.yml'), 'utf8');

// The report scripts are Python, like the rest of the data pipeline. Skip their tests where no Python 3 is installed.
const PYTHON = ['python3', 'python'].find((cmd) => {
  const r = spawnSync(cmd, ['-c', 'import sys; assert sys.version_info >= (3, 8)'], { encoding: 'utf8' });
  return r.status === 0;
});
const py = (args) => spawnSync(PYTHON, args, { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });

test('workflow runs monthly and on demand, and never merges', () => {
  assert.match(WORKFLOW, /schedule:\s*\n\s*- cron: '\d+ \d+ \d+ \* \*'/);
  assert.match(WORKFLOW, /workflow_dispatch:/);
  assert.doesNotMatch(WORKFLOW, /\/merge\b|gh pr merge|auto-merge|automerge|enablePullRequestAutoMerge/i);
  assert.match(WORKFLOW, /repos\/\$REPO\/pulls"/, 'opens a pull request through the REST API');
});

test('workflow rebuilds from upstream HEAD, validates, audits and writes the diff report', () => {
  assert.match(WORKFLOW, /VipassanaTech\/tipitaka-xml\.git/);
  assert.match(WORKFLOW, /VRI_REF: \$\{\{ inputs\.vri_ref \|\| 'main' \}\}/);
  for (const step of ['build_canon.py', 'build_indexes.py ati', 'build_indexes.py dhammatalks', 'validate.py', 'build_translations.py',
    'npm run audit', 'npm test', 'diff_report.py']) assert.ok(WORKFLOW.includes(step), step);
  // Every upstream commit goes into the report.
  for (const v of ['VRI_COMMIT', 'BILARA_COMMIT', 'ATI_COMMIT', 'OLD_VRI_COMMIT']) assert.ok(WORKFLOW.includes(`$${v}`), v);
  // Failed checks make a draft, not a silent pass.
  assert.match(WORKFLOW, /draft=true/);
});

test('optional builders run only when their scripts exist; DPD is checked against its SHA-256', () => {
  assert.match(WORKFLOW, /if: hashFiles\('scripts\/canon\/build_commentary\.py'\) != ''/);
  assert.match(WORKFLOW, /if: hashFiles\('scripts\/canon\/build_postcanonical\.py'\) != ''/);
  assert.match(WORKFLOW, /if: hashFiles\('scripts\/dpd\/build_dpd\.py'\) != '' && hashFiles\('server\/data\/dpd\.json\.gz'\) != ''/);
  assert.match(WORKFLOW, /sha256sum/);
  assert.match(WORKFLOW, /--archive-sha256 "\$sha"/);
  assert.match(WORKFLOW, /update_dpd_pin\.py/);
});

test('workflow fetches no SuttaCentral content beyond the Mahāsaṅgīti root used for numbering', () => {
  const sc = WORKFLOW.split('\n').filter((l) => /suttacentral/i.test(l) && !/^\s*#/.test(l));
  assert.equal(sc.length, 1, sc.join('\n'));
  assert.match(sc[0], /bilara-data\.git/);
  assert.match(WORKFLOW, /sparse-checkout set --no-cone '\/root\/pli\/ms\/'/);
  assert.doesNotMatch(WORKFLOW, /translation\/en|\/html\/pli|suttacentral\.net\/api/);
});

test('workflow inputs are validated before reaching the shell', () => {
  assert.match(WORKFLOW, /case "\$VRI_REF" in \*\[!A-Za-z0-9\._\/-\]\*\|''\) echo "invalid vri_ref"; exit 1;; esac/);
  assert.match(WORKFLOW, /case "\$tag" in \*\[!A-Za-z0-9\._-\]\*\|''\)/);
  // ${{ inputs.* }} only ever reaches a step through env, never inline in a script.
  for (const line of WORKFLOW.split('\n')) if (/\$\{\{\s*inputs\./.test(line)) assert.match(line, /^\s+[A-Z_]+: \$\{\{/, line);
});

// ---- diff_report.py on a small synthetic build

const gz = (file, data) => fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(data)));

function canonFixture() {
  const blocks = (n, label) => Array.from({ length: n }, (_, i) => ['bodytext', String(i + 1), `${label} text ${i + 1}`, [], i === 0 ? { P: ['1.1'] } : {}]);
  return {
    source: { name: 'VRI', commit: 'a'.repeat(40) },
    collections: {},
    books: [{ file: 's0201m.mul.xml', collection: 'mn', blocks: blocks(10, 'mn') }, { file: 's0301m1.mul.xml', collection: 'sn', blocks: blocks(6, 'sn') }],
    units: [
      { id: 'mn1', book: 0, start: 0, end: 4, title: 'Mūlapariyāya', collection: 'mn', acronym: 'MN 1', vri: '1–4', pts: { volume: 1, page: 1, end_page: 6 } },
      { id: 'mn2', book: 0, start: 4, end: 10, title: 'Sabbāsava', collection: 'mn', acronym: 'MN 2', vri: '5–10', pts: { volume: 1, page: 6, end_page: 12 } },
      { id: 'sn1.1', book: 1, start: 0, end: 3, title: 'Oghatarana', collection: 'sn', acronym: 'SN 1.1', vri: '1–3', pts: { volume: 1, page: 1, end_page: 1 } },
      { id: 'sn1.2', book: 1, start: 3, end: 6, title: 'Nimokkha', collection: 'sn', acronym: 'SN 1.2', vri: '4–6', pts: { volume: 1, page: 2, end_page: 2 } },
    ],
  };
}
const links = () => ({
  mn1: [{ source: 'dhammatalks', url: 'https://www.dhammatalks.org/suttas/MN/MN1.html', match: 'number' }],
  'sn1.1': [{ source: 'ati', url: 'https://www.accesstoinsight.org/tipitaka/sn/sn01/sn01.001.than.html', match: 'number+title' }],
});

test('diff_report.py: unchanged content (even with different gzip bytes) is reported as no change', { skip: !PYTHON && 'no Python 3' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-'));
  for (const side of ['old', 'new']) {
    fs.mkdirSync(path.join(dir, side));
    fs.writeFileSync(path.join(dir, side, 'canon.json.gz'), zlib.gzipSync(JSON.stringify(canonFixture()), { level: side === 'old' ? 9 : 1 }));
    fs.writeFileSync(path.join(dir, side, 'translations.json'), JSON.stringify(links()));
  }
  const r = py([path.join(ROOT, 'scripts/canon/diff_report.py'), path.join(dir, 'old'), path.join(dir, 'new'),
    '--out', path.join(dir, 'r.md'), '--json', path.join(dir, 's.json'), '--changed-list', path.join(dir, 'c.txt')]);
  assert.equal(r.status, 0, r.stderr);
  const summary = JSON.parse(fs.readFileSync(path.join(dir, 's.json'), 'utf8'));
  assert.equal(summary.changed, false);
  assert.equal(fs.readFileSync(path.join(dir, 'c.txt'), 'utf8'), '');
  assert.match(fs.readFileSync(path.join(dir, 'r.md'), 'utf8'), /No data file changed/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('diff_report.py: texts added/removed/moved, PTS, wording and link changes', { skip: !PYTHON && 'no Python 3' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-'));
  fs.mkdirSync(path.join(dir, 'old'));
  fs.mkdirSync(path.join(dir, 'new'));
  const old = canonFixture();
  gz(path.join(dir, 'old', 'canon.json.gz'), old);
  fs.writeFileSync(path.join(dir, 'old', 'translations.json'), JSON.stringify(links()));
  fs.writeFileSync(path.join(dir, 'old', 'topics.json'), '{"a":1}');
  const cur = canonFixture();
  cur.source.commit = 'b'.repeat(40);
  cur.units = cur.units.filter((u) => u.id !== 'sn1.2'); // removed
  cur.units.push({ id: 'sn1.3', book: 1, start: 3, end: 6, title: 'Nimokkha', collection: 'sn', acronym: 'SN 1.3', vri: '4–6', pts: { volume: 1, page: 2, end_page: 2 } });
  cur.units[1].vri = '6–10'; // mn2 moved to other VRI paragraphs
  cur.units[1].start = 5;
  cur.units[0].pts = { volume: 1, page: 2, end_page: 6 }; // mn1 PTS start changed
  cur.books[0].blocks[1][2] = 'mn text two, corrected'; // mn1 wording
  cur.books[1].blocks[0][4] = { P: ['1.1'], T: ['1.1'] }; // a Thai page marker added
  gz(path.join(dir, 'new', 'canon.json.gz'), cur);
  const l = links();
  l['sn1.3'] = l['sn1.1']; // link moved to another text
  delete l['sn1.1'];
  l.mn1[0].match = 'number+title'; // match type changed
  l.mn2 = [{ source: 'dhammatalks', url: 'https://www.dhammatalks.org/suttas/MN/MN2.html', match: 'number' }]; // added
  fs.writeFileSync(path.join(dir, 'new', 'translations.json'), JSON.stringify(l));
  fs.writeFileSync(path.join(dir, 'new', 'topics.json'), '{"a":1}');

  const r = py([path.join(ROOT, 'scripts/canon/diff_report.py'), path.join(dir, 'old'), path.join(dir, 'new'),
    '--out', path.join(dir, 'r.md'), '--json', path.join(dir, 's.json'), '--changed-list', path.join(dir, 'c.txt'),
    '--check', 'validate.py=success', '--check', 'npm run audit=failure', '--note', 'test run']);
  assert.equal(r.status, 0, r.stderr);
  const s = JSON.parse(fs.readFileSync(path.join(dir, 's.json'), 'utf8'));
  assert.equal(s.changed, true);
  assert.deepEqual(fs.readFileSync(path.join(dir, 'c.txt'), 'utf8').trim().split('\n').sort(), ['canon.json.gz', 'translations.json']);
  assert.deepEqual(s.canon.commit, { old: 'a'.repeat(40), new: 'b'.repeat(40) });
  assert.equal(s.canon.added, 1);
  assert.equal(s.canon.removed, 1);
  assert.equal(s.canon.moved, 1);
  assert.equal(s.canon.pts, 1);
  assert.equal(s.canon.wording, 2, 'mn1 edited; mn2 lost its first block');
  assert.deepEqual(s.links, { added: 1, removed: 0, moved: 1, match: 1 });
  const md = fs.readFileSync(path.join(dir, 'r.md'), 'utf8');
  assert.match(md, /compare\/a{40}\.\.\.b{40}/);
  assert.match(md, /\| sn1\.3 \| SN 1\.3 \|/);
  assert.match(md, /\| mn2 \| MN 2 \| s0201m\.mul\.xml ¶5–10 \| s0201m\.mul\.xml ¶6–10 \|/);
  assert.match(md, /\| mn1 \| MN 1 \| 1\.1–6 \| 1\.2–6 \|/);
  assert.match(md, /Thai 0 → 1/);
  assert.match(md, /\| ati \| https:\/\/www\.accesstoinsight\.org\/[^|]+ \| sn1\.1 \| sn1\.3 \|/);
  assert.match(md, /\| npm run audit \| \*\*failure\*\* \|/);
  assert.match(md, /`topics\.json` \(unchanged\)/);
  assert.match(md, /- test run/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('diff_report.py: long lists are capped', { skip: !PYTHON && 'no Python 3' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-'));
  fs.mkdirSync(path.join(dir, 'old'));
  fs.mkdirSync(path.join(dir, 'new'));
  gz(path.join(dir, 'old', 'canon.json.gz'), canonFixture());
  const cur = canonFixture();
  for (let i = 0; i < 12; i += 1) cur.units.push({ ...cur.units[0], id: `mn${100 + i}`, acronym: `MN ${100 + i}` });
  gz(path.join(dir, 'new', 'canon.json.gz'), cur);
  const r = py([path.join(ROOT, 'scripts/canon/diff_report.py'), path.join(dir, 'old'), path.join(dir, 'new'), '--out', path.join(dir, 'r.md'), '--limit', '5']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(dir, 'r.md'), 'utf8'), /… and 7 more/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('update_dpd_pin.py rewrites only DPD_PIN, from the rebuilt subset', { skip: !PYTHON && 'no Python 3' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-'));
  const mjs = path.join(dir, 'analyse.mjs');
  const before = `const OTHER = { version: 'keep' };\nexport const DPD_PIN = {\n  version: 'v0.4.1',\n  release: 'r1',\n  asset: 'a1',\n  asset_sha256: '${'0'.repeat(64)}',\n  doi: 'd1',\n  attribution: 'Digital Pāḷi Dictionary by Bodhirasa Bhikkhu, v0.4.1, CC BY-NC-SA 4.0',\n};\nexport const AFTER = 'keep';\n`;
  fs.writeFileSync(mjs, before);
  gz(path.join(dir, 'dpd.json.gz'), { source: { version: 'v0.5.2', release: 'r2', asset: 'a2', asset_sha256: 'f'.repeat(64), doi: "d'2", attribution: 'Digital Pāḷi Dictionary by Bodhirasa Bhikkhu, v0.5.2, CC BY-NC-SA 4.0' } });
  const r = py([path.join(ROOT, 'scripts/canon/update_dpd_pin.py'), path.join(dir, 'dpd.json.gz'), mjs]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /v0\.4\.1 -> v0\.5\.2/);
  const after = fs.readFileSync(mjs, 'utf8');
  assert.match(after, /const OTHER = \{ version: 'keep' \};/);
  assert.match(after, /export const AFTER = 'keep';/);
  assert.match(after, /version: 'v0\.5\.2'/);
  assert.match(after, new RegExp(`asset_sha256: '${'f'.repeat(64)}'`));
  assert.match(after, /doi: 'd\\'2'/);
  assert.match(after, /attribution: 'Digital Pāḷi Dictionary by Bodhirasa Bhikkhu, v0\.5\.2, CC BY-NC-SA 4\.0'/);
  // Without DPD_PIN (DPD not merged yet) nothing changes.
  fs.writeFileSync(mjs, 'export const X = 1;\n');
  const r2 = py([path.join(ROOT, 'scripts/canon/update_dpd_pin.py'), path.join(dir, 'dpd.json.gz'), mjs]);
  assert.equal(r2.status, 0, r2.stderr);
  assert.equal(fs.readFileSync(mjs, 'utf8'), 'export const X = 1;\n');
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---- review fixes: base branch, ATI checkout, draft state, size budget, IDs, PR body

const runLines = WORKFLOW.split('\n').filter((l) => !/^\s*#/.test(l));

test('the PR base branch does not depend on github.event.repository (absent on the schedule trigger)', () => {
  for (const l of runLines) assert.doesNotMatch(l, /github\.event\.repository/, l);
  assert.match(WORKFLOW, /base=\$\(gh api "repos\/\$REPO" --jq \.default_branch\)/);
  assert.match(WORKFLOW, /-f base="\$base"/);
});

test('Access to Insight is checked out whole (/tipitaka/), Khuddaka texts included, as in scripts/canon/README.md', () => {
  assert.match(WORKFLOW, /git -C "\$W\/ati" sparse-checkout set --no-cone '\/tipitaka\/'\n/);
  assert.doesNotMatch(WORKFLOW, /!\/tipitaka/);
});

test('an existing refresh PR gets this month\'s draft state; report checks (size, IDs) also make a draft', () => {
  assert.match(WORKFLOW, /convertPullRequestToDraft/);
  assert.match(WORKFLOW, /markPullRequestReadyForReview/);
  assert.match(WORKFLOW, /if \[ "\$was_draft" != "\$draft" \]/);
  assert.match(WORKFLOW, /--budget-mb 60/);
  assert.match(WORKFLOW, /\.report_checks\[\]/);
  assert.match(WORKFLOW, /scripts\/canon\/pr_body\.py/);
});

test('diff_report.py: package size budget and unit IDs that no longer resolve fail the report checks', { skip: !PYTHON && 'no Python 3' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-'));
  fs.mkdirSync(path.join(dir, 'old'));
  fs.mkdirSync(path.join(dir, 'new'));
  gz(path.join(dir, 'old', 'canon.json.gz'), canonFixture());
  const cur = canonFixture();
  cur.units = cur.units.filter((u) => u.id !== 'sn1.2');
  cur.books[0].blocks[1][2] = 'mn text two, corrected'; // mn1 wording changes under an Ānandajoti link
  gz(path.join(dir, 'new', 'canon.json.gz'), cur);
  const ana = { source: {}, links: { mn1: { path: '/x.htm', reference: 'MN 1', coverage: 0.8 }, 'sn1.2': { path: '/y.htm', reference: 'SN 1.2' } } };
  const topics = { source: {}, topics: [{ slug: 't', texts: [{ id: 'mn2' }, { id: 'sn1.2' }] }] };
  const lists = { lists: [{ slug: 'l', defined_in: ['MN 1'], see_also_texts: ['SN 1.2'] }] };
  for (const side of ['old', 'new']) {
    fs.writeFileSync(path.join(dir, side, 'anandajoti.json'), JSON.stringify(ana));
    fs.writeFileSync(path.join(dir, side, 'topics.json'), JSON.stringify(topics));
    fs.writeFileSync(path.join(dir, side, 'dhamma_lists.json'), JSON.stringify(lists));
  }
  const bundle = path.join(dir, 'index.cjs');
  fs.writeFileSync(bundle, Buffer.alloc(300 * 1024));
  const run = (budget) => {
    const r = py([path.join(ROOT, 'scripts/canon/diff_report.py'), path.join(dir, 'old'), path.join(dir, 'new'),
      '--out', path.join(dir, 'r.md'), '--json', path.join(dir, 's.json'), '--budget-mb', String(budget), '--extra', bundle]);
    assert.equal(r.status, 0, r.stderr);
    return { s: JSON.parse(fs.readFileSync(path.join(dir, 's.json'), 'utf8')), md: fs.readFileSync(path.join(dir, 'r.md'), 'utf8') };
  };
  const over = run(0.2);
  assert.equal(over.s.report_checks['package size budget (≤ 0.2 MB)'], 'failure');
  assert.ok(over.s.size.total_bytes > 300 * 1024);
  assert.match(over.md, /\*\*over budget\*\*/);
  assert.match(over.md, /\| package size budget \(≤ 0\.2 MB\) \| \*\*failure\*\* \|/);
  assert.equal(over.s.report_checks['linked unit IDs resolve'], 'failure');
  assert.deepEqual(over.s.dangling_ids.map((d) => `${d[0]}:${d[2]}`).sort(), ['anandajoti.json:sn1.2', 'dhamma_lists.json:SN 1.2', 'topics.json:sn1.2']);
  assert.equal(over.s.anandajoti_recheck, 1);
  assert.match(over.md, /\| mn1 \| MN 1 \| MN 1 \| 0\.8 \|/);
  const within = run(60);
  assert.equal(within.s.report_checks['package size budget (≤ 60 MB)'], 'success');
  assert.match(within.md, /within budget/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('pr_body.py cuts a long report at a section boundary and closes what is open', { skip: !PYTHON && 'no Python 3' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-'));
  const rows = Array.from({ length: 400 }, (_, i) => `| sn${i} | SN ${i} | ${'x'.repeat(40)} |`).join('\n');
  const sec = (t) => `<details open><summary><b>${t}</b>: 400</summary>\n\n| ID | Citation | Note |\n|---|---|---|\n${rows}\n\n</details>\n\n`;
  const report = `# Data refresh report\n\n## Checks\n\n| Check | Result |\n|---|---|\n| npm test | pass |\n\n${sec('A')}${sec('B')}${sec('C')}`;
  fs.writeFileSync(path.join(dir, 'r.md'), report);
  const r = py([path.join(ROOT, 'scripts/canon/pr_body.py'), path.join(dir, 'r.md'), path.join(dir, 'b.md'), '--limit', '40000']);
  assert.equal(r.status, 0, r.stderr);
  const body = fs.readFileSync(path.join(dir, 'b.md'), 'utf8');
  assert.ok(body.length <= 40000, String(body.length));
  assert.equal((body.match(/<details[\s>]/g) || []).length, (body.match(/<\/details>/g) || []).length);
  assert.match(body, /report truncated/);
  assert.match(body, /<\/details>\n\n?\n… report truncated/);
  // One section too long to fit: cut at a line, close the open <details> and code fence.
  fs.writeFileSync(path.join(dir, 'r.md'), `<details><summary>log</summary>\n\n\`\`\`\n${'line\n'.repeat(5000)}\`\`\`\n</details>\n`);
  const r2 = py([path.join(ROOT, 'scripts/canon/pr_body.py'), path.join(dir, 'r.md'), path.join(dir, 'b.md'), '--limit', '3000']);
  assert.equal(r2.status, 0, r2.stderr);
  const b2 = fs.readFileSync(path.join(dir, 'b.md'), 'utf8');
  assert.ok(b2.length <= 3000);
  assert.match(b2, /line\n```\n<\/details>\n/);
  // A short report is kept whole.
  fs.writeFileSync(path.join(dir, 'r.md'), report.slice(0, 200));
  py([path.join(ROOT, 'scripts/canon/pr_body.py'), path.join(dir, 'r.md'), path.join(dir, 'b.md')]);
  assert.ok(fs.readFileSync(path.join(dir, 'b.md'), 'utf8').startsWith(report.slice(0, 200)));
  fs.rmSync(dir, { recursive: true, force: true });
});
