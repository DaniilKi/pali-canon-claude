// Runs every tests/*.test.mjs file with node's test runner (portable: no shell globbing).
import { readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'tests');
const files = readdirSync(dir).filter((name) => name.endsWith('.test.mjs')).sort().map((name) => resolve(dir, name));
const result = spawnSync(process.execPath, ['--test', ...files, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
