// Offline consistency check for server.json (the official MCP Registry entry)
// and the directory listing files. No network.
//
//   node scripts/check-server-json.mjs            # repository consistency (tests run this)
//   node scripts/check-server-json.mjs --publish  # also refuse placeholders: run before `mcp-publisher publish`
//
// Schema: https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json
// Official registry rules: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));

export const SCHEMA_URL = 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json';
// GitHub login exactly as GitHub reports it. The registry compares namespaces
// case-sensitively (modelcontextprotocol/registry#689), so this must not be lower-cased.
export const REGISTRY_NAME = 'io.github.DaniilKi/pali-canon';
export const NPM_PACKAGE = 'pali-canon-mcp';
export const PLACEHOLDER = /placeholder|\.invalid(\/|$)|example\.(com|org)/i;

export function checkServerJson({ publish = false } = {}) {
  const problems = [];
  const fail = (msg) => problems.push(msg);
  const server = readJson('server.json');
  const pkg = readJson('package.json');
  const manifest = readJson('manifest.json');

  if (server.$schema !== SCHEMA_URL) fail(`$schema should be ${SCHEMA_URL}`);
  if (server.name !== REGISTRY_NAME) fail(`name should be ${REGISTRY_NAME}, got ${server.name}`);
  if (!/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/.test(server.name || '')) fail('name does not match the registry pattern');
  // The registry allows 100 characters; staying within 100 UTF-8 bytes is safe either way.
  const desc = server.description || '';
  if (!desc) fail('description is missing');
  if (Buffer.byteLength(desc, 'utf8') > 100) fail(`description is ${Buffer.byteLength(desc)} bytes; keep it within 100`);
  if (!server.title || server.title.length > 100) fail('title missing or longer than 100 characters');

  for (const [label, v] of [['package.json', pkg.version], ['manifest.json', manifest.version]]) {
    if (server.version !== v) fail(`server.json version ${server.version} differs from ${label} ${v}`);
  }

  const npm = (server.packages || []).filter((p) => p.registryType === 'npm');
  if (npm.length !== 1) fail('expected exactly one npm package entry');
  for (const p of npm) {
    if (p.identifier !== NPM_PACKAGE) fail(`npm identifier should be ${NPM_PACKAGE}`);
    if (p.registryBaseUrl && p.registryBaseUrl !== 'https://registry.npmjs.org') fail('npm registryBaseUrl must be https://registry.npmjs.org');
    if (p.version !== server.version) fail(`npm package version ${p.version} differs from server version ${server.version}`);
    if (p.transport?.type !== 'stdio') fail('npm package transport must be stdio');
    if (p.environmentVariables?.length) fail('the server needs no environment variables; do not declare any');
  }

  // package.json ownership proof for the registry (mcpName must equal server.json name).
  if (pkg.mcpName !== undefined && pkg.mcpName !== server.name) fail(`package.json mcpName ${pkg.mcpName} differs from server.json name ${server.name}`);
  if (publish) {
    if (pkg.mcpName !== server.name) fail(`package.json needs "mcpName": "${server.name}" before publishing`);
    if (pkg.name !== NPM_PACKAGE) fail(`package.json name is ${pkg.name}; the npm package must be ${NPM_PACKAGE} (issue #4)`);
  }

  for (const r of server.remotes || []) {
    if (r.type !== 'streamable-http') fail(`remote transport ${r.type} should be streamable-http`);
    if (!/^https:\/\//.test(r.url || '')) fail(`remote URL must be https: ${r.url}`);
    if (publish && PLACEHOLDER.test(r.url)) {
      fail(`remote URL ${r.url} is a placeholder: put the live hosted URL (issue #5) in its place, or delete the "remotes" array`);
    }
  }

  for (const icon of server.icons || []) {
    if (!/^https:\/\//.test(icon.src) || icon.src.length > 255) fail(`icon src must be an https URL of at most 255 characters: ${icon.src}`);
    const m = icon.src.match(/^https:\/\/raw\.githubusercontent\.com\/DaniilKi\/pali-canon-claude\/main\/(.+)$/);
    if (m && !existsSync(path.join(ROOT, m[1]))) fail(`icon file ${m[1]} is missing from the repository`);
  }

  const repo = server.repository || {};
  if (repo.source !== 'github' || repo.url !== 'https://github.com/DaniilKi/pali-canon-claude') fail('repository must point at github.com/DaniilKi/pali-canon-claude');

  if (existsSync(path.join(ROOT, 'glama.json'))) {
    const glama = readJson('glama.json');
    if (!glama.maintainers?.includes('DaniilKi')) fail('glama.json maintainers must include DaniilKi');
  }
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const publish = process.argv.includes('--publish');
  const problems = checkServerJson({ publish });
  if (problems.length) {
    console.error(`server.json: ${problems.length} problem(s)${publish ? ' (publish mode)' : ''}`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`server.json: OK${publish ? ' (ready to publish)' : ''}`);
}
