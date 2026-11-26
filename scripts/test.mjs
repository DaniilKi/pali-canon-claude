// Runs every tests/*.test.mjs file with node's test runner (portable: no shell globbing).
// The bounded Windows contrast failed concurrently and passed serially.
// Serialize test files there; every case,
// in-file interaction, original timeout and complete TAP inventory is retained.
import { readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'tests');
const files = readdirSync(dir).filter((name) => name.endsWith('.test.mjs')).sort().map((name) => resolve(dir, name));
const result = spawnSync(process.execPath, ['--test', ...(process.platform === 'win32' ? ['--test-concurrency=1'] : []), ...files, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
