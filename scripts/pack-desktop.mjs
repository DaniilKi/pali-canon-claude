import { cp, mkdir, rm, readFile } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const staging = resolve(root, 'dist', 'desktop');
const dist = resolve(root, 'dist');
if (!staging.startsWith(dist + sep)) throw new Error('Invalid bundle staging path.');
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
for (const name of ['manifest.json', 'server', 'README.md', 'LICENSE', 'THIRD_PARTY.md', 'PRIVACY.md']) {
  // The desktop extension runs over stdio; the hosted HTTP bundle (server/http.cjs) is left out.
  await cp(resolve(root, name), resolve(staging, name), { recursive: true, filter: (source) => !/[\/]server[\/]http\.cjs$/.test(source) });
}
const { version } = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const cli = resolve(root, 'node_modules/@anthropic-ai/mcpb/dist/cli/cli.js');
const destination = resolve(dist, `pali-canon-${version}.mcpb`);
const result = spawnSync(process.execPath, [cli, 'pack', staging, destination], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
