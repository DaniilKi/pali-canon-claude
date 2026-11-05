// Exhaustive reading check through the built MCP server, without online providers.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as canon from '../src/canon.mjs';
import * as commentary from '../src/commentary.mjs';
import * as postcanonical from '../src/postcanonical.mjs';
import { ALLOWED_HOSTS } from '../src/http.mjs';

export function toolData(response) {
  const text = response.content?.find((part) => part.type === 'text')?.text;
  assert.ok(!response.isError, text || 'MCP tool returned an error');
  const data = JSON.parse(text);
  assert.deepEqual(response.structuredContent, data, 'structured and text responses disagree');
  return data;
}

/** Verify every page, including order, text, references, metadata and exact termination. */
export async function checkPages(call, { tool, args, expected, validate = () => {}, pageSize = 60 }) {
  assert.ok(Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 200, 'page size must be 1–200');
  assert.ok(expected.length > 0, 'expected source has no segments');
  let offset = 0;
  let pages = 0;
  const digest = createHash('sha256');
  do {
    const result = await call(tool, { ...args, offset, limit: pageSize });
    validate(result);
    assert.equal(result.total_segments, expected.length, 'total segment count changed');
    assert.equal(result.offset, offset, 'wrong page offset');
    assert.equal(result.limit, pageSize, 'wrong page limit');
    const page = expected.slice(offset, offset + pageSize);
    assert.equal(result.returned, page.length, 'wrong returned count');
    assert.deepEqual(result.segments, page, `source mismatch at offset ${offset}`);
    const next = offset + page.length < expected.length ? offset + page.length : null;
    assert.equal(result.next_offset, next, 'continuation skips, repeats or prematurely ends text');
    for (const segment of result.segments) digest.update(JSON.stringify(segment) + '\n');
    pages += 1;
    offset = next;
  } while (offset !== null);
  return { pages, segments: expected.length, sha256: digest.digest('hex') };
}

export function options(argv) {
  const out = { server: 'server/index.cjs', pageSize: 60, scope: 'all' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!['--server', '--report', '--page-size', '--scope'].includes(arg)) throw new Error(`Unknown option: ${arg}`);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`${arg} needs a value`);
    if (arg === '--server') out.server = value;
    if (arg === '--report') out.report = value;
    if (arg === '--page-size') out.pageSize = Number(value);
    if (arg === '--scope') out.scope = value;
  }
  assert.ok(Number.isInteger(out.pageSize) && out.pageSize >= 1 && out.pageSize <= 200, 'page size must be 1–200');
  assert.ok(['all', 'canon', 'commentary', 'postcanonical'].includes(out.scope), 'scope must be all, canon, commentary or postcanonical');
  return out;
}

/** Report source blocks outside citable units rather than hiding front matter in a completion claim. */
export function sourceCoverage(data) {
  const headings = new Set(['subhead', 'title', 'chapter', 'book', 'nikaya', 'subsubhead']);
  const colophon = /(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$/i;
  let bodyBlocks = 0;
  const uncovered = [];
  data.books.forEach((book, bi) => {
    const covered = new Uint8Array(book.blocks.length);
    for (const unit of data.units) if (unit.book === bi) covered.fill(1, unit.start, unit.end);
    book.blocks.forEach(([rend, paragraph, text], i) => {
      if (!text || headings.has(rend) || (rend === 'centre' && colophon.test(text))) return;
      bodyBlocks += 1;
      if (!covered[i]) uncovered.push({ file: book.file, block: i, rend, paragraph: paragraph || null });
    });
  });
  return { body_blocks: bodyBlocks, uncovered, uncovered_numbered: uncovered.filter((b) => b.paragraph && b.paragraph !== '0').length };
}

export async function run({ server, pageSize, scope, report }) {
  const started = Date.now();
  const root = canon.load();
  assert.ok(root.canon.books.length > 0 && root.canon.units.length > 0, 'canonical data is empty');
  const pc = scope === 'all' || scope === 'postcanonical' ? postcanonical.load() : null;
  if (scope === 'all' || scope === 'postcanonical') assert.ok(pc?.books.length > 0, 'post-canonical data is missing or empty');
  if (scope === 'all' || scope === 'commentary') assert.ok(commentary.load(), 'commentary data is missing');
  const summary = {
    schema_version: 1, scope, transport: 'stdio', server: resolve(server), page_size: pageSize,
    vri_commit: root.canon.source.commit, offline: true,
    expected: { canon_texts: root.canon.units.length, canon_books: root.canon.books.length, postcanonical_books: pc?.books.length ?? null },
    checked: { canon: 0, commentary: 0, postcanonical: 0 }, commentary_unavailable: 0,
    pages: 0, segments: 0, collections: {}, failures: [], failure_count: 0,
    source_coverage: sourceCoverage(root.canon),
  };
  if (summary.source_coverage.uncovered_numbered) {
    summary.failure_count += 1;
    summary.failures.push({ scope: 'source', error: 'Numbered source body blocks are outside every citable unit' });
  }
  const hash = createHash('sha256');
  const client = new Client({ name: 'pali-canon-corpus-check', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath, args: [resolve(server)], stderr: 'pipe',
    env: { ...process.env, PALI_CANON_SIMULATE_OUTAGE: ALLOWED_HOSTS.join(',') },
  });
  transport.stderr?.on('data', (data) => process.stderr.write(data));
  const call = async (name, args) => toolData(await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 }));
  const record = async (kind, id, work) => {
    try {
      const result = await work();
      summary.checked[kind] += 1;
      summary.pages += result.pages;
      summary.segments += result.segments;
      hash.update(JSON.stringify([kind, id, result.sha256]) + '\n');
    } catch (error) {
      summary.failure_count += 1;
      const failure = { scope: kind, id, error: error.message.slice(0, 2000) };
      if (summary.failures.length < 100) summary.failures.push(failure);
      console.error(`FAIL ${kind} ${id}: ${failure.error}`);
    }
  };
  try {
    await client.connect(transport);
    for (const [index, unit] of root.canon.units.entries()) {
      if (scope === 'postcanonical') break;
      const resolved = canon.resolve(unit.id).unit;
      if (scope === 'all' || scope === 'canon') {
        await record('canon', unit.id, async () => {
          const result = await checkPages(call, {
            tool: 'get_text', args: { uid: unit.acronym }, expected: canon.segments(resolved), pageSize,
            validate: (page) => {
              assert.equal(page.text_id, resolved.id);
              assert.equal(page.citation, resolved.acronym);
              assert.equal(page.attribution, root.canon.source.attribution);
              if (unit.approximate) assert.ok(page.notes.some((note) => /abbreviat|peyyāla|approximate/i.test(note)), 'missing abbreviation warning');
            },
          });
          const collection = summary.collections[unit.collection] ||= { texts: 0, segments: 0 };
          collection.texts += 1;
          collection.segments += result.segments;
          return result;
        });
      }
      if (scope === 'all' || scope === 'commentary') {
        await record('commentary', unit.id, async () => {
          const expected = commentary.commentaryFor(resolved, { limit: 1000000 });
          const validate = (page) => {
            assert.equal(page.text_id, resolved.id);
            assert.equal(page.available, expected.available);
            assert.equal(page.label, commentary.LABEL);
            assert.equal(page.source?.attribution, root.canon.source.attribution);
          };
          if (!expected.available) {
            const page = await call('get_commentary', { uid: unit.id, limit: pageSize });
            validate(page);
            assert.deepEqual(page.segments, []);
            assert.equal(page.total_segments, 0);
            assert.ok(page.notes.length, 'unavailable commentary needs an explanation');
            summary.commentary_unavailable += 1;
            return { pages: 1, segments: 0, sha256: null };
          }
          assert.equal(expected.segments.length, expected.total_segments, 'expected commentary was truncated');
          return checkPages(call, { tool: 'get_commentary', args: { uid: unit.id }, expected: expected.segments, pageSize, validate });
        });
      }
      if ((index + 1) % 100 === 0) console.log(`Read ${index + 1}/${root.canon.units.length} canon units; ${summary.failure_count} failures`);
    }
    for (const book of pc?.books || []) {
      await record('postcanonical', book.id, async () => {
        const selection = postcanonical.select(book.id);
        assert.equal(selection.start, 0);
        assert.equal(selection.end, book.blocks.length, 'book citation does not expose the whole source book');
        const expected = postcanonical.segmentsOf(book.blocks).map((segment, i) => ({ ref: `${selection.citation}/${i + 1}`, ...segment }));
        return checkPages(call, {
          tool: 'get_post_canonical', args: { citation: book.id }, expected, pageSize,
          validate: (page) => {
            assert.equal(page.canonical, false);
            assert.equal(page.book.id, book.id);
            assert.ok(page.label.includes('not the canon'));
            assert.equal(page.attribution, pc.source.attribution);
          },
        });
      });
      console.log(`Read post-canonical book ${book.id}; ${summary.failure_count} failures`);
    }
  } finally { await client.close(); }
  for (const kind of ['canon', 'commentary', 'postcanonical']) {
    if (scope !== 'all' && scope !== kind) continue;
    const expected = kind === 'postcanonical' ? pc.books.length : root.canon.units.length;
    if (summary.checked[kind] !== expected && summary.failure_count === 0) {
      summary.failure_count += 1;
      summary.failures.push({ scope: kind, error: `Checked ${summary.checked[kind]} of ${expected} expected entries` });
    }
  }
  summary.sha256 = hash.digest('hex');
  summary.elapsed_ms = Date.now() - started;
  summary.status = summary.failure_count ? 'failed' : scope === 'all' ? 'passed' : 'passed_selected_scope';
  if (report) writeFileSync(report, JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const summary = await run(options(process.argv.slice(2)));
    process.exitCode = summary.failure_count ? 1 : 0;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
