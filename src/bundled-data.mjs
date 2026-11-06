/** Read legacy data or deterministic byte shards without changing the original gzip bytes. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const pathString = (path) => path instanceof URL ? fileURLToPath(path) : path;
export const shardManifest = (path) => `${pathString(path)}.parts.json`;
export const bundledExists = (path) => existsSync(path) || existsSync(shardManifest(path));
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function readBundled(path) {
  path = pathString(path);
  // Builders can install a new monolith over the previous shards; the next build re-shards it.
  if (existsSync(path)) return readFileSync(path);
  const manifest = JSON.parse(readFileSync(shardManifest(path), 'utf8'));
  const invalid = () => { throw new Error(`Invalid bundled data shards: ${basename(path)}`); };
  if (manifest.version !== 1 || !Number.isSafeInteger(manifest.size) || manifest.size < 1 ||
      !/^[a-f0-9]{64}$/.test(manifest.sha256) || !Array.isArray(manifest.parts) || !manifest.parts.length) invalid();
  let size = 0;
  const chunks = manifest.parts.map((part, i) => {
    const name = `${basename(path)}.part-${String(i + 1).padStart(4, '0')}`;
    if (part.file !== name || !Number.isSafeInteger(part.size) || part.size < 1 ||
        part.size >= 5 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(part.sha256)) invalid();
    const bytes = readFileSync(join(dirname(path), name));
    if (bytes.length !== part.size || sha256(bytes) !== part.sha256) invalid();
    size += bytes.length;
    return bytes;
  });
  if (size !== manifest.size) invalid();
  const bytes = Buffer.concat(chunks);
  if (sha256(bytes) !== manifest.sha256) invalid();
  return bytes;
}
