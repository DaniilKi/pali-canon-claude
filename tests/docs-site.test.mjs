import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as canon from '../src/canon.mjs';
import { buildIndex, toCsv, notice, writeExport, CSV_COLUMNS, LICENSE_LABELS } from '../scripts/export-index.mjs';
import { buildSite, rewriteTarget, rewriteLinks, sitePage, titleOf, REPO } from '../scripts/build-site.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

// ---- citation index export --------------------------------------------------

const index = buildIndex();

/** Minimal RFC 4180 parser, enough to round-trip the export. */
function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i += 1; }
    else cell += ch;
  }
  return rows;
}

test('export has one record per citable text, in canon order, with the pinned source and licence', () => {
  const units = canon.load().canon.units;
  assert.equal(index.count, units.length);
  assert.deepEqual(index.texts.map((t) => t.id), units.map((u) => u.id));
  assert.equal(new Set(index.texts.map((t) => t.id)).size, index.count);
  assert.equal(index.source.commit, canon.source().commit);
  assert.match(index.source.terms, /non-commercial/);
  assert.match(index.license, /no scripture text/);
  assert.match(index.license, /CC BY-NC 4\.0/);
  assert.equal(index.version, JSON.parse(read('package.json')).version);
});

test('every exported ID resolves with the bundled canon to the same text and location', () => {
  for (const t of index.texts) {
    const { unit } = canon.resolve(t.id);
    assert.equal(unit.id, t.id, t.id);
    assert.equal(t.citation, unit.acronym, t.id);
    assert.equal(t.vri.paragraphs, unit.vri || null, t.id);
    if (unit.pts) assert.equal(t.pts.page, unit.pts.page, t.id); else assert.equal(t.pts, null, t.id);
  }
});

test('known records: MN 10, AN 3.65 numbering, Dhp verse inheriting its chapter links', () => {
  const by = (id) => index.texts.find((t) => t.id === id);
  const mn10 = by('mn10');
  assert.equal(mn10.citation, 'MN 10');
  assert.equal(mn10.vri.paragraphs, '105–138');
  assert.equal(mn10.pts.label, 'M i 55–63');
  assert.deepEqual([mn10.pts.volume, mn10.pts.page, mn10.pts.end_page], [1, 55, 63]);
  assert.ok(mn10.english.some((e) => e.url === 'https://www.dhammatalks.org/suttas/MN/MN10.html' && e.translation_id === 'dt:MN/MN10' && e.license === 'CC BY-NC 4.0'));
  assert.equal(mn10.english_inherited_from, null);
  assert.equal(canon.resolve('M i 55').unit.id, 'mn10');

  const an = by('an3.65');
  assert.ok(an.english.some((e) => /AN 3:66/.test(e.reference)), 'translator numbering is visible');

  const dhp = by('dhp183');
  assert.equal(canon.resolve('Dhp 183').unit.id, 'dhp183');
  assert.equal(dhp.english_inherited_from, canon.linksFor(canon.resolve('Dhp 183').unit).via.id);
  assert.match(dhp.english_inherited_from, /^dhp\d+-\d+$/);
  assert.ok(dhp.english.length > 0);
  assert.equal(dhp.pts.volume, null, 'verse books have no PTS volume');
});

test('export never carries scripture or SuttaCentral content', () => {
  const json = JSON.stringify(index);
  assert.doesNotMatch(json, /suttacentral\.net/);
  assert.doesNotMatch(json, /Evaṃ me sutaṃ/, 'no Pāli text body');
  for (const t of index.texts) for (const e of t.english) assert.match(e.url, /^https:\/\/(www\.dhammatalks\.org\/|(?:www\.)?accesstoinsight\.org\/|ancient-buddhist-texts\.net\/Texts-and-Translations\/)/, e.url);
});

test('CSV round-trips: header, one row per text, quoting of commas and quotes', () => {
  const rows = parseCsv(toCsv(index));
  assert.deepEqual(rows[0], CSV_COLUMNS);
  assert.equal(rows.length, index.count + 1);
  const col = (name) => CSV_COLUMNS.indexOf(name);
  const mn10 = rows.find((r) => r[0] === 'mn10');
  assert.equal(mn10[col('pts')], 'M i 55–63');
  assert.equal(mn10[col('english_count')], '4');
  assert.equal(mn10[col('english_urls')].split(' | ')[0], 'https://www.dhammatalks.org/suttas/MN/MN10.html');
  for (const r of rows) assert.equal(r.length, CSV_COLUMNS.length);
  const tricky = toCsv({ texts: [{ ...index.texts[0], title: 'a, "b"' }] });
  assert.equal(parseCsv(tricky)[1][col('title')], 'a, "b"');
});

test('every translation link has a known licence code with a readable name, in JSON and CSV', () => {
  const seen = new Set();
  for (const t of index.texts) for (const e of t.english) {
    assert.ok(e.license && LICENSE_LABELS[e.license], `${t.id} ${e.url}: ${e.license}`);
    assert.equal(e.license_name, LICENSE_LABELS[e.license].name);
    seen.add(e.license);
  }
  assert.deepEqual([...seen].sort(), Object.keys(LICENSE_LABELS).sort(), 'no unused or missing labels');
  assert.deepEqual(index.license_labels, LICENSE_LABELS);
  const rows = parseCsv(toCsv(index));
  const col = (name) => rows[0].indexOf(name);
  for (const r of rows.slice(1)) {
    const n = Number(r[col('english_count')]);
    for (const c of ['english_urls', 'english_translators', 'english_references', 'english_translation_ids', 'english_licenses']) {
      assert.equal(n ? r[col(c)].split(' | ').length : 0, n ? n : 0, `${r[0]} ${c}`);
      if (!n) assert.equal(r[col(c)], '', `${r[0]} ${c}`);
    }
  }
  const dn1 = rows.find((r) => r[0] === 'dn1');
  assert.deepEqual(dn1[col('english_licenses')].split(' | '), [LICENSE_LABELS['CC BY-NC 4.0'].name, LICENSE_LABELS.BPS.name]);
  assert.equal(dn1[col('english_translation_ids')].split(' | ')[0], 'dt:DN/DN01');
  const md = read('docs/export.md');
  const note = notice(index);
  for (const [code, l] of Object.entries(LICENSE_LABELS)) {
    assert.ok(md.includes(`\`${code}\``) && md.includes(l.name), `docs/export.md explains ${code}`);
    assert.ok(note.includes(`\`${code}\``) && note.includes(l.name), `licence notice explains ${code}`);
  }
  assert.match(index.license, /english_licenses/);
});

test('writeExport writes JSON, CSV and the licence notice', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pcc-export-'));
  try {
    const { files } = writeExport(dir);
    assert.deepEqual(files, ['citation-index.json', 'citation-index.csv', 'citation-index-LICENSE.md']);
    assert.equal(JSON.parse(readFileSync(join(dir, 'citation-index.json'), 'utf8')).count, index.count);
    assert.match(readFileSync(join(dir, 'citation-index-LICENSE.md'), 'utf8'), /Vipassana Research Institute/);
    assert.match(notice(index), new RegExp(index.source.commit));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('release workflow builds the export before the checksums and includes it in SHA256SUMS', () => {
  const yml = read('.github/workflows/release.yml');
  const exp = yml.indexOf('node scripts/export-index.mjs');
  const sums = yml.indexOf('SHA256SUMS.txt');
  assert.ok(exp > 0 && exp < sums, 'export step comes before the checksum step');
  assert.match(yml, /cd export && sha256sum \*/);
  assert.match(yml, /dist\/export\/\*/);
});

// ---- llms.txt and docs ------------------------------------------------------

test('llms.txt follows the llms.txt shape and lists every tool, prompt and skill', () => {
  const llms = read('llms.txt');
  assert.match(llms, /^# Pali Canon for Claude\n\n> /);
  const server = read('src/server.mjs');
  const tools = [...server.matchAll(/^\s*tool\('([a-z_]+)'/gm)].map((m) => m[1]);
  const prompts = [...server.matchAll(/^\s*prompt\('([a-z_]+)'/gm)].map((m) => m[1]);
  assert.ok(tools.length >= 11);
  for (const name of [...tools, ...prompts]) assert.match(llms, new RegExp(`\\b${name}\\b`), name);
  for (const skill of ['study', 'compare', 'pali-word']) assert.ok(existsSync(resolve(root, 'skills', skill)), skill);
});

test('llms.txt links point at files that exist in the repository', () => {
  const llms = read('llms.txt');
  const links = [...llms.matchAll(/\]\((https:\/\/github\.com\/DaniilKi\/pali-canon-claude\/blob\/main\/([^)#]+))\)/g)];
  assert.ok(links.length >= 10);
  for (const [, , path] of links) assert.ok(existsSync(resolve(root, path)), path);
  assert.equal([...llms.matchAll(/\]\((?!https:\/\/github\.com\/DaniilKi\/pali-canon-claude\/blob\/main\/)/g)].length, 0, 'only repository links');
});

test('every citation on the examples page resolves with the bundled canon', () => {
  const md = read('docs/examples.md');
  const spans = [...md.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((s) => /^(MN|SN|AN|DN|Dhp|Sn|Snp|Ud|Thag|Thig|M|S|A|D) [ivx\d]/.test(s));
  assert.ok(spans.length >= 10, spans.join(', '));
  for (const s of spans) assert.ok(canon.resolve(s).unit, s);
  assert.equal(canon.resolve('S v 420').unit.id, 'sn56.11');
  assert.equal(canon.resolve('M i 55').unit.id, 'mn10');
  assert.equal(canon.resolve('Sn 1.8').unit.id, 'snp1.8');
  assert.equal(canon.resolve('SN 1.8').unit.id, 'sn1.8');
  assert.equal(canon.resolve('https://www.dhammatalks.org/suttas/MN/MN10.html').unit.id, 'mn10');
  assert.ok(canon.describe(canon.resolve('AN 3.65').unit, canon.resolve('AN 3.65').notes).notes.some((n) => /AN 3\.66/.test(n)));
});

test('examples page uses real tool parameters', () => {
  const md = read('docs/examples.md');
  const server = read('src/server.mjs');
  for (const param of ['includeVariants', 'variants', 'script', 'translation', 'collection']) {
    if (md.includes(`\`${param}:`)) assert.match(server, new RegExp(`\\b${param}:`), param);
  }
});

test('export page links the site files by absolute URL (they are not in the repository)', () => {
  const md = read('docs/export.md');
  assert.doesNotMatch(md, /\]\(export\//);
  assert.match(md, /\]\(https:\/\/daniilki\.github\.io\/pali-canon-claude\/export\/citation-index\.csv\)/);
  assert.match(read('docs/README.md'), /Source: \*\*GitHub Actions\*\*/);
});

test('export page states the real text count and fields', () => {
  const md = read('docs/export.md');
  assert.match(md, new RegExp(index.count.toLocaleString('en-US')));
  for (const c of CSV_COLUMNS) assert.ok(md.includes(c), c);
});

test('install index links every per-client guide', () => {
  const md = read('docs/install/README.md');
  for (const f of ['claude-desktop.md', 'claude-code.md', 'codex.md', 'gemini.md', 'ide.md', 'local-clients.md']) {
    assert.ok(existsSync(resolve(root, 'docs/install', f)), f);
    assert.ok(md.includes(`(${f})`), f);
  }
});

// ---- site builder -------------------------------------------------------------

test('link rewriting: inside docs stays relative, outside goes to GitHub, README becomes index', () => {
  const always = () => true;
  const never = () => false;
  assert.equal(rewriteTarget('citations.md#sn', 'docs/examples.md', never), 'citations.md#sn');
  assert.equal(rewriteTarget('listings/README.md', 'docs/README.md', never), 'listings/index.md');
  assert.equal(rewriteTarget('README.md#shared', 'docs/listings/glama.md', never), 'index.md#shared');
  assert.equal(rewriteTarget('../../README.md#install', 'docs/install/ide.md', never), `${REPO}/blob/main/README.md#install`);
  assert.equal(rewriteTarget('../AGENTS.md', 'docs/README.md', never), `${REPO}/blob/main/AGENTS.md`);
  assert.equal(rewriteTarget('../scripts/canon/', 'docs/how-it-works.md', always), `${REPO}/tree/main/scripts/canon`);
  assert.equal(rewriteTarget('../../assets/icon.svg', 'docs/listings/x.md', never), 'https://raw.githubusercontent.com/DaniilKi/pali-canon-claude/main/assets/icon.svg');
  for (const t of ['https://x.org/a.md', '#top', 'mailto:a@b.c', '/abs']) assert.equal(rewriteTarget(t, 'docs/a.md', never), t);
  const md = 'See [A](../AGENTS.md) and `[x](../y.md)`.\n```\n[z](../z.md)\n```\n[ref]: ../LICENSE';
  const out = rewriteLinks(md, 'docs/a.md', never);
  assert.match(out, /\(https:\/\/github\.com\/DaniilKi\/pali-canon-claude\/blob\/main\/AGENTS\.md\)/);
  assert.match(out, /`\[x\]\(\.\.\/y\.md\)`/);
  assert.match(out, /\[z\]\(\.\.\/z\.md\)/);
  assert.match(out, /\[ref\]: https:\/\/github\.com\/DaniilKi\/pali-canon-claude\/blob\/main\/LICENSE/);
});

test('pages get front matter, and Liquid-like text is protected', () => {
  assert.equal(titleOf('# Install *Pali* [Canon](x)\n', 'f'), 'Install Pali Canon');
  const page = sitePage('# Hello\n\nUse {{ name }} here.\n', 'a/b.md', () => false);
  assert.match(page, /^---\ntitle: "Hello"\nsource_path: "a\/b\.md"\n---\n\{% raw %\}\n/);
  assert.match(page, /\{% endraw %\}\n$/);
  assert.doesNotMatch(sitePage('# Plain\n', 'p.md', () => false), /raw/);
});

test('built site: every page, llms.txt, export, and every relative link resolves inside the site', async () => {
  const out = mkdtempSync(join(tmpdir(), 'pcc-site-'));
  try {
    const pages = await buildSite(out);
    for (const p of ['index.md', 'examples.md', 'export.md', 'install/index.md', 'install/claude-desktop.md', 'citations.md', 'sources.md']) assert.ok(pages.includes(p), p);
    for (const f of ['_config.yml', '_layouts/default.html', 'assets/site.css', 'llms.txt', 'export/citation-index.json', 'export/citation-index.csv']) assert.ok(existsSync(join(out, f)), f);
    assert.equal(readFileSync(join(out, 'llms.txt'), 'utf8'), read('llms.txt'));
    assert.ok(!pages.some((p) => /README\.md$/.test(p)));
    const broken = [];
    for (const page of pages) {
      let fenced = false;
      for (const line of readFileSync(join(out, page), 'utf8').split('\n')) {
        if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
        if (fenced) continue;
        for (const m of line.replace(/`[^`]*`/g, '').matchAll(/\]\(([^)\s]+)/g)) {
          const target = m[1].replace(/[?#].*$/, '');
          if (!target || /^[a-z][a-z0-9+.-]*:/i.test(m[1]) || m[1].startsWith('#')) continue;
          const resolved = posix.normalize(posix.join(posix.dirname(page), target));
          const ok = existsSync(join(out, resolved)) || existsSync(join(out, resolved, 'index.md'));
          if (!ok) broken.push(`${page} -> ${m[1]}`);
        }
      }
    }
    assert.deepEqual(broken, []);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('pages workflow builds with GitHub Jekyll from the prepared folder and deploys on main', () => {
  const yml = read('.github/workflows/pages.yml');
  assert.match(yml, /branches: \[main\]/);
  assert.match(yml, /node scripts\/build-site\.mjs --out dist\/site/);
  assert.match(yml, /actions\/jekyll-build-pages@v1/);
  assert.match(yml, /source: \.\/dist\/site/);
  assert.match(yml, /actions\/deploy-pages@v4/);
  assert.match(yml, /pages: write/);
});
