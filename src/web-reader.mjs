/** Fixed, first-party reader assets only. No user-controlled paths or content proxy. */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
let here;
try { here = __dirname; } catch { here = dirname(fileURLToPath(import.meta.url)); }
const folder = [join(here, 'web'), join(here, '../server/web')].find(p => existsSync(join(p, 'index.html')));
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/reader', ['index.html', 'text/html; charset=utf-8']],
  ['/reader.js', ['reader.js', 'text/javascript; charset=utf-8']],
  ['/reader.css', ['reader.css', 'text/css; charset=utf-8']],
]);
const cache = new Map();
export function serveReader(req, res, path) {
  const file = files.get(path);
  if (!file || !['GET', 'HEAD'].includes(req.method)) return false;
  if (!folder) throw new Error('Reader assets missing; rebuild the server.');
  if (!cache.has(file[0])) cache.set(file[0], readFileSync(join(folder, file[0])));
  res.writeHead(200, {
    'Content-Type': file[1], 'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  res.end(req.method === 'HEAD' ? undefined : cache.get(file[0]));
  return true;
}
