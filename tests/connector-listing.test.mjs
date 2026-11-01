// Keeps docs/listings/claude-connector.md honest: the annotations review table and the example
// prompts must match what the server really exposes and what the bundled canon resolves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as canon from '../src/canon.mjs';

const packet = readFileSync(new URL('../docs/listings/claude-connector.md', import.meta.url), 'utf8');

async function listTools() {
  const server = createServer();
  const client = new Client({ name: 'listing-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  try {
    return (await client.listTools()).tools;
  } finally {
    await client.close();
  }
}

// Rows of the "Tool annotations review" table: | `name` | title | read-only | destructive | open-world | ... |
function reviewRows() {
  const section = packet.split('## Tool annotations review')[1].split('\n## ')[0];
  return section.split('\n')
    .map((line) => line.match(/^\| `([a-z_]+)` \| ([^|]+) \| (yes|no) \| (yes|no) \| (yes|no) \|/))
    .filter(Boolean)
    .map(([, name, title, ro, destr, open]) => ({ name, title: title.trim(), ro: ro === 'yes', destr: destr === 'yes', open: open === 'yes' }));
}

test('every tool meets the directory rules: read-only, not destructive, name at most 64 characters', async () => {
  for (const t of await listTools()) {
    assert.ok(t.name.length <= 64, t.name);
    assert.equal(t.annotations?.readOnlyHint, true, `${t.name} readOnlyHint`);
    assert.equal(t.annotations?.destructiveHint, false, `${t.name} destructiveHint`);
    assert.equal(typeof t.annotations?.openWorldHint, 'boolean', `${t.name} openWorldHint`);
    assert.ok(t.description && t.description.length >= 20, `${t.name} description`);
  }
});

test('the annotations review table matches the live tools', async () => {
  const live = new Map((await listTools()).map((t) => [t.name, t]));
  const rows = reviewRows();
  for (const row of rows) {
    const t = live.get(row.name);
    assert.ok(t, `${row.name} is a real tool`);
    assert.equal(t.annotations.readOnlyHint, row.ro, `${row.name} read-only`);
    assert.equal(t.annotations.destructiveHint, row.destr, `${row.name} destructive`);
    assert.equal(t.annotations.openWorldHint, row.open, `${row.name} open-world`);
    // Titles are proposed in the packet until src/server.mjs sets them; once set they must agree.
    const liveTitle = t.title ?? t.annotations.title;
    if (liveTitle) assert.equal(liveTitle, row.title, `${row.name} title`);
  }
  // Both directions: a tool added later (for example through src/features/) needs its own row.
  const tableNames = rows.map((r) => r.name).sort();
  assert.equal(new Set(tableNames).size, tableNames.length, 'no tool is listed twice');
  const missing = [...live.keys()].filter((name) => !tableNames.includes(name));
  assert.deepEqual(missing, [], 'add a row to "Tool annotations review" in docs/listings/claude-connector.md for each of these tools');
  assert.deepEqual(tableNames, [...live.keys()].sort(), 'the table lists exactly the live tools');
  for (const core of ['resolve_reference', 'get_metadata', 'get_text', 'get_translation', 'compare_translations', 'search_texts',
    'browse_canon', 'lookup_pali', 'search_access_to_insight', 'get_access_to_insight_text', 'list_sources']) {
    assert.ok(rows.some((r) => r.name === core), `${core} reviewed`);
  }
});

test('the packet does not hard-code a tool count that can go stale', () => {
  const portalTools = packet.split('### 2. Tools')[1].split('\n### ')[0];
  assert.doesNotMatch(portalTools, /\b\d+ tools\b/, 'refer to the review table instead of a number');
});

test('proposed titles are short and unique', () => {
  const titles = reviewRows().map((r) => r.title);
  assert.equal(new Set(titles).size, titles.length);
  for (const title of titles) assert.ok(title.length > 3 && title.length <= 40, title);
});

test('every citation in the example prompts resolves in the bundled canon', () => {
  const expected = {
    'MN 10': 'mn10', 'SN 56:11': 'sn56.11', 'S v 420': 'sn56.11', 'Dhp 183': 'dhp183',
    'AN 3.65': 'an3.65', 'Snp 1.8': 'snp1.8', 'M i 55': 'mn10',
  };
  for (const [ref, id] of Object.entries(expected)) {
    assert.ok(packet.includes(ref), `${ref} appears in the packet`);
    assert.equal(canon.resolve(ref).unit.id, id, ref);
  }
});

test('the icon PNGs exist, are square 512 px and under 2 MB', () => {
  for (const path of ['../assets/icon.png', '../.claude-plugin/icon.png']) {
    const url = new URL(path, import.meta.url);
    const head = readFileSync(url).subarray(0, 24);
    assert.equal(head.toString('latin1', 1, 4), 'PNG', path);
    assert.equal(head.readUInt32BE(16), 512, `${path} width`);
    assert.equal(head.readUInt32BE(20), 512, `${path} height`);
    assert.ok(statSync(url).size < 2 * 1024 * 1024, `${path} size`);
  }
});

test('listing texts fit the portal limits', () => {
  const quoted = (heading) => packet.split(heading)[1].split('\n#')[0].split('\n')
    .filter((l) => l.startsWith('>')).map((l) => l.replace(/^> ?/, '')).join('\n').trim();
  const oneLiner = quoted('#### One-liner');
  const description = quoted('#### Description');
  assert.ok(oneLiner.length > 50 && oneLiner.length <= 200, `one-liner ${oneLiner.length}`);
  assert.ok(description.length > 500 && description.length <= 2000, `description ${description.length}`);
  assert.ok(packet.includes('| Server name | `Pali Canon` |'));
});
