// Split gzip bytes, never scripture records: concatenation is exactly the original input.
import { mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBundled, sha256, shardManifest } from '../src/bundled-data.mjs';

export const CHUNK_SIZE = 4 * 1024 * 1024;
export function shardData(directory) {
  for (const file of readdirSync(directory).filter((name) => ['canon.json.gz', 'commentary.json.gz', 'postcanonical.json.gz', 'dpd.json.gz'].includes(name)).sort()) {
    const path = join(directory, file);
    const bytes = readFileSync(path);
    if (bytes.length < 5 * 1024 * 1024) {
      // A future smaller rebuild no longer needs the old shards.
      cleanParts(directory, file);
      continue;
    }
    const parts = [];
    for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
      const chunk = bytes.subarray(offset, offset + CHUNK_SIZE);
      const name = `${file}.part-${String(parts.length + 1).padStart(4, '0')}`;
      writeFileSync(join(directory, name), chunk);
      parts.push({ file: name, size: chunk.length, sha256: sha256(chunk) });
    }
    writeFileSync(shardManifest(path), `${JSON.stringify({ version: 1, size: bytes.length, sha256: sha256(bytes), parts }, null, 2)}\n`);
    // Verify before removing the monolith; readBundled prefers it while it exists.
    unlinkSync(path);
    try { readBundled(path); } catch (error) { writeFileSync(path, bytes); throw error; }
    for (const name of readdirSync(directory)) {
      if (name.startsWith(`${file}.part-`) && !parts.some((part) => part.file === name)) unlinkSync(join(directory, name));
    }
  }
  // A repeated build verifies the committed shards too.
  for (const file of readdirSync(directory).filter((name) => name.endsWith('.parts.json'))) {
    readBundled(join(directory, file.slice(0, -'.parts.json'.length)));
  }
}
function cleanParts(directory, file) {
  for (const name of readdirSync(directory)) {
    if (name === `${file}.parts.json` || name.startsWith(`${file}.part-`)) unlinkSync(join(directory, name));
  }
}
export function unpackData(directory, output) {
  if (resolve(output) === resolve(directory) || resolve(output).startsWith(resolve(directory) + sep)) {
    throw new Error('Unpack into a separate working directory outside the input directory');
  }
  mkdirSync(output, { recursive: true });
  for (const name of readdirSync(directory).sort()) {
    if (name.includes('.part-')) continue;
    if (name.endsWith('.parts.json')) {
      const original = name.slice(0, -'.parts.json'.length);
      writeFileSync(join(output, original), readBundled(join(directory, original)));
    } else writeFileSync(join(output, name), readFileSync(join(directory, name)));
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--unpack') {
    if (!process.argv[4]) throw new Error('Usage: node scripts/shard-data.mjs --unpack <input-dir> <output-dir>');
    if (resolve(process.argv[3]) === resolve(process.argv[4])) throw new Error('Unpack into a separate working directory');
    unpackData(process.argv[3], process.argv[4]);
  } else shardData(process.argv[2] || 'server/data');
}
