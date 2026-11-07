import { shardData } from './shard-data.mjs';
import { build } from 'esbuild';
import { chmod, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';

shardData('server/data');
await mkdir('server', { recursive: true });
const common = {
  bundle: true, platform: 'node', target: 'node20', format: 'cjs', minify: false,
  banner: { js: '#!/usr/bin/env node' }, legalComments: 'eof',
  // CJS output avoids import-meta/dynamic-require issues in bundled SDK dependencies.
  supported: { 'top-level-await': false }, metafile: true,
};
// server/index.cjs: stdio transport (Claude Desktop, Claude Code). server/http.cjs: Streamable HTTP (hosted /mcp).
const results = [
  await build({ ...common, entryPoints: ['src/index.mjs'], outfile: 'server/index.cjs' }),
  await build({ ...common, entryPoints: ['src/http-worker.mjs'], outfile: 'server/http-worker.cjs' }),
  await build({
    ...common, outfile: 'server/http.cjs',
    stdin: { contents: "import { startHttpServer } from './src/http-server.mjs';\nstartHttpServer();\n", resolveDir: process.cwd(), sourcefile: 'http-entry.mjs', loader: 'js' },
  }),
];
await chmod('server/index.cjs', 0o755);
await chmod('server/http.cjs', 0o755);
const packageRoots = new Set();
for (const input of results.flatMap((result) => Object.keys(result.metafile.inputs))) {
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
const notices = ['Third-party packages included in server/index.cjs, server/http.cjs and server/http-worker.cjs. Their licenses apply to their code.'];
for (const directory of [...packageRoots].sort()) {
  const metadata = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  notices.push(`\n--- ${metadata.name} ${metadata.version} (${metadata.license || 'see license'}) ---`);
  for (const filename of await readdir(directory)) {
    if (/^(licen[cs]e|copying|notice)(\.|$)/i.test(filename)) notices.push(await readFile(resolve(directory, filename), 'utf8'));
  }
}
await writeFile('server/THIRD_PARTY_LICENSES.txt', notices.join('\n\n'));
console.error('Built self-contained stdio, HTTP and hosted-tool-worker bundles');
