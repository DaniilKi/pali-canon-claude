// Audit cross-tool evidence from an isolated installed server; never fetch publisher content.
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as canon from '../src/canon.mjs';
import * as commentary from '../src/commentary.mjs';
import * as parallels from '../src/parallels.mjs';
import { checkReading, parallelPages } from './evidence/check.mjs';
import { auditSearchCommands } from './evidence/search.mjs';
import { auditStudyCommands } from './evidence/study.mjs';
import { auditNavigation } from './evidence/navigation.mjs';
import { auditVinayaCommands } from './evidence/vinaya.mjs';
import { auditAbhidhammaCommands } from './evidence/abhidhamma.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function option(name) {
  const i = process.argv.indexOf(name);
  if (i < 0) return;
  assert.ok(process.argv[i + 1] && !process.argv[i + 1].startsWith('--'), `${name} requires a path`);
  return resolve(process.argv[i + 1]);
}
const serverDir = option('--server-dir') || join(root, 'server');
const reportPath = option('--report');
const counts = { owners: 0, commentary_links: 0, commentary_segments: 0, shared_links: 0, shared_segments: 0, reading_commands: 0 };
const client = new Client({ name: 'pali-evidence-audit', version: '1.0' });
let stage;
let stderr = '';
try {
  if (reportPath) await writeFile(reportPath, '{"status":"running"}\n');
  stage = await mkdtemp(join(tmpdir(), 'pali-evidence-'));
  await cp(serverDir, join(stage, 'server'), { recursive: true });
  await mkdir(join(stage, 'empty'));
  const guard = join(stage, 'no-network.cjs');
  await writeFile(guard, `const fail=()=>{process.stderr.write('UNEXPECTED_NETWORK_ATTEMPT\\n');throw new Error('Network disabled in evidence audit')};globalThis.fetch=fail;for(const name of ['node:http','node:https']){const m=require(name);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
  const transport = new StdioClientTransport({ command: process.execPath, args: ['--require', guard, join(stage, 'server/index.cjs')], cwd: join(stage, 'empty'), stderr: 'pipe' });
  transport.stderr.on('data', chunk => { stderr += chunk.toString(); });
  await client.connect(transport);
  const call = async (name, args) => {
    const response = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
    assert.ok(!response.isError, `${name}: ${JSON.stringify(response.content)}`);
    return JSON.parse(response.content.find(part => part.type === 'text').text);
  };
  const graph = parallels.load();
  const owners = new Set([...graph.citations.map(l => l.from), ...graph.shared.flatMap(l => [l.a, l.b])]);
  const checked = new Set();
  const sourceSegments = new Map();
  function canonical(ref) {
    const match = ref.match(/^([^/]+)\/([1-9]\d*)$/);
    assert.ok(match, ref);
    if (!sourceSegments.has(match[1])) sourceSegments.set(match[1], canon.segments(canon.resolve(match[1]).unit));
    const segment = sourceSegments.get(match[1])[Number(match[2]) - 1];
    assert.equal(segment?.ref, ref);
    return { segment, command: { tool: 'get_text', uid: match[1], offset: Number(match[2]) - 1, limit: 1 } };
  }
  async function read(command, expected, kind) {
    const key = `${command.tool}:${expected.ref}`;
    if (checked.has(key)) return;
    await checkReading(call, command, expected);
    checked.add(key); counts.reading_commands++; counts[kind]++;
  }
  for (const uid of owners) {
    const links = await parallelPages(call, uid);
    // Compare the complete emitted graph with the bundled source, not merely its first page.
    assert.deepEqual(links, JSON.parse(JSON.stringify(parallels.getParallels(uid, { limit: 100000 }).links)));
    for (const link of links) {
      if (link.source === 'commentary-citation') {
        const ref = link.commentary.passage_ref;
        const index = Number(ref.split('/c')[1]) - 1;
        const expected = commentary.commentaryFor(canon.resolve(link.commentary.on.id).unit, { offset: index, limit: 1 }).segments[0];
        assert.equal(expected?.ref, ref);
        assert.ok(expected.text.includes(link.evidence), `${ref}: recorded evidence absent from source`);
        assert.deepEqual(link.commentary.read_with, { tool: 'get_commentary', uid: ref });
        await read(link.commentary.read_with, expected, 'commentary_segments');
        if (link.commentary.on.id === uid) counts.commentary_links++;
      } else if (link.source === 'shared-passage') {
        for (const side of ['this', 'other']) {
          const refs = link[`${side}_segments`];
          assert.ok(refs.length);
          assert.deepEqual(link[`${side}_read_with`], canonical(refs[0]).command);
          for (const ref of refs) {
            const { segment, command } = canonical(ref);
            await read(command, segment, 'shared_segments');
          }
        }
        if (link.this_segments[0].split('/')[0] === uid && uid < link.text.id) counts.shared_links++;
      }
    }
    counts.owners++;
  }
  assert.equal(counts.commentary_links, graph.citations.length);
  assert.equal(counts.shared_links, graph.shared.length);
  const search = await auditSearchCommands(call);
  const study = await auditStudyCommands(call);
  const navigation = await auditNavigation(call);
  const vinaya = await auditVinayaCommands(call);
  const abhidhamma = await auditAbhidhammaCommands(call);
  assert.doesNotMatch(stderr, /UNEXPECTED_NETWORK_ATTEMPT/);
  const report = { status: 'passed', counts, search, study, navigation, vinaya, abhidhamma, network_attempts: 0, vri_commit: canon.source().commit,
    scope: 'All recorded commentary citation links, retained shared-passage refs and source-book search fixtures and complete study/topic/list/paritta/Vinaya/Abhidhamma navigation checks through an isolated installed server; does not validate inferred scholarly relationships or omitted/truncated refs.' };
  if (reportPath) await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} catch (error) {
  if (reportPath) await writeFile(reportPath, JSON.stringify({ status: 'failed', counts, error: error.message }, null, 2) + '\n');
  throw error;
} finally {
  await client.close();
  if (stage) await rm(stage, { recursive: true, force: true });
}
