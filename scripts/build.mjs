import { build } from 'esbuild';
import { chmod, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';

await mkdir('server', { recursive: true });
const result = await build({
  entryPoints: ['src/index.mjs'], outfile: 'server/index.cjs', bundle: true,
  platform: 'node', target: 'node20', format: 'cjs', minify: false,
  banner: { js: '#!/usr/bin/env node' }, legalComments: 'eof',
  // CJS output avoids import-meta/dynamic-require issues in bundled SDK dependencies.
  supported: { 'top-level-await': false }, metafile: true,
});
await chmod('server/index.cjs', 0o755);
const packageRoots = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
  if (!input.includes('node_modules/')) continue;
  let directory = dirname(resolve(input));
  while (relative(process.cwd(), directory).includes('node_modules')) {
    try {
      const metadata = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
      if (metadata.name && metadata.version) { packageRoots.add(directory); break; }
    } catch { /* Continue past nested module-type metadata. */ }
    directory = dirname(directory);
  }
}
const notices = ['Third-party packages included in server/index.cjs. Their licenses apply to their code.'];
for (const directory of [...packageRoots].sort()) {
  const metadata = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  notices.push(`\n--- ${metadata.name} ${metadata.version} (${metadata.license || 'see license'}) ---`);
  for (const filename of await readdir(directory)) {
    if (/^(licen[cs]e|copying|notice)(\.|$)/i.test(filename)) notices.push(await readFile(resolve(directory, filename), 'utf8'));
  }
}
await writeFile('server/THIRD_PARTY_LICENSES.txt', notices.join('\n\n'));
console.error('Built self-contained server/index.cjs');
