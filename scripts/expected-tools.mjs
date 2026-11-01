// The exact MCP tool surface, derived from the source without importing it (no dependencies, so
// scripts/npx-check.mjs can use it against an installed package): the tool('name', ...) calls in
// src/server.mjs plus those in every feature module listed in src/features/index.mjs.
// tests/core.test.mjs cross-checks this list against what the feature modules really register.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const toolNames = (file) => [...readFileSync(file, 'utf8').matchAll(/\btool\(\s*'([a-z][a-z0-9_]*)'/g)].map((m) => m[1]);

/** Feature module files listed in src/features/index.mjs (one `export * as x from '../x.mjs'` line each). */
export function featureFiles() {
  const index = resolve(src, 'features', 'index.mjs');
  return [...readFileSync(index, 'utf8').matchAll(/^\s*export\s+\*\s+as\s+\w+\s+from\s+'([^']+)'/gm)]
    .map((m) => resolve(src, 'features', m[1]));
}

/** Tool names registered in src/server.mjs (the core tools). */
export function coreToolNames() {
  return toolNames(resolve(src, 'server.mjs'));
}

/** Every tool the server should expose, sorted. */
export function expectedToolNames() {
  return [...coreToolNames(), ...featureFiles().flatMap(toolNames)].sort();
}
