import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readBundled, bundledExists, shardManifest, sha256 } from '../src/bundled-data.mjs';
import { shardData, unpackData, CHUNK_SIZE } from '../scripts/shard-data.mjs';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'pali-shards-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return { dir, file: join(dir, 'canon.json.gz') };
}
const snapshot = (dir) => Object.fromEntries(readdirSync(dir).sort().map((name) => [name, sha256(readFileSync(join(dir, name)))]));

test('byte sharding is deterministic and round-trips the exact original bytes', (t) => {
  const { dir, file } = fixture(t);
  const bytes = Buffer.alloc(3 * CHUNK_SIZE + 17, 71);
  writeFileSync(file, bytes);
  assert.deepEqual(readBundled(file), bytes); // legacy builders still work
  shardData(dir);
  assert.ok(bundledExists(file));
  assert.deepEqual(readBundled(file), bytes);
  const first = snapshot(dir);
  shardData(dir);
  assert.deepEqual(snapshot(dir), first);
  // Reinstalling the same builder output produces the same shard files and manifest.
  writeFileSync(file, bytes);
  shardData(dir);
  assert.deepEqual(snapshot(dir), first);
  assert.throws(() => unpackData(dir, dir), /separate working directory/);
  assert.throws(() => unpackData(dir, join(dir, 'nested')), /separate working directory/);
  const output = fixture(t).dir;
  unpackData(dir, output);
  assert.deepEqual(readFileSync(join(output, 'canon.json.gz')), bytes);
  assert.equal(JSON.parse(readFileSync(shardManifest(file))).sha256, sha256(bytes));
});

test('shards reject corruption, missing parts, traversal and reordered manifests', (t) => {
  const { dir, file } = fixture(t);
  const bytes = Buffer.alloc(6 * 1024 * 1024, 9);
  writeFileSync(file, bytes);
  shardData(dir);
  const manifest = JSON.parse(readFileSync(shardManifest(file)));
  const first = join(dir, manifest.parts[0].file);
  const original = readFileSync(first);
  writeFileSync(first, Buffer.alloc(original.length, 1));
  assert.throws(() => readBundled(file), /Invalid bundled data shards/);
  writeFileSync(first, original);
  writeFileSync(shardManifest(file), JSON.stringify({ ...manifest, parts: [...manifest.parts].reverse() }));
  assert.throws(() => readBundled(file), /Invalid bundled data shards/);
  writeFileSync(shardManifest(file), JSON.stringify({ ...manifest, parts: [{ ...manifest.parts[0], file: '../outside' }] }));
  assert.throws(() => readBundled(file), /Invalid bundled data shards/);
  writeFileSync(shardManifest(file), JSON.stringify(manifest));
  unlinkSync(first);
  assert.throws(() => readBundled(file), /ENOENT/);
});

test('a smaller replacement removes stale shards and keeps legacy loading', (t) => {
  const { dir, file } = fixture(t);
  writeFileSync(file, Buffer.alloc(13 * 1024 * 1024));
  shardData(dir);
  writeFileSync(file, Buffer.alloc(6 * 1024 * 1024, 2));
  shardData(dir);
  assert.equal(readdirSync(dir).filter((name) => name.includes('.part-')).length, 2);
  writeFileSync(file, 'small');
  shardData(dir);
  assert.deepEqual(readdirSync(dir), ['canon.json.gz']);
  assert.equal(readBundled(file).toString(), 'small');
});


test('manifest points to the published policy documents with supported HTTPS fields', () => {
  const manifest = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url)));
  for (const [field, file] of [['privacyPolicyUrl', 'PRIVACY.md'], ['termsOfServiceUrl', 'TERMS.md']]) {
    assert.equal(manifest[field], `https://github.com/DaniilKi/pali-canon-claude/blob/main/${file}`);
    assert.ok(readFileSync(new URL(`../${file}`, import.meta.url)).length > 0);
  }
});
