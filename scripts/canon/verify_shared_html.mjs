// Offline source-pin verification using the same extraction functions as live reading.
import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { atiContent, atiNotice } from '../../src/english.mjs';
import { plainText } from '../../src/http.mjs';
import { scopeHash } from '../../src/translation-scope.mjs';
const [manifestPath, sourceRoot] = process.argv.slice(2);
if (!manifestPath || !sourceRoot) throw Error('Usage: verify_shared_html.mjs MANIFEST ATI-CHECKOUT');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')), root = await realpath(sourceRoot);
const verified = [];
for (const row of manifest.links) {
  const path = await realpath(resolve(root, row.path.replace(/^\//, '') + '.html'));
  if (!path.startsWith(root + sep)) throw Error('Shared source escapes checkout');
  const raw = await readFile(path), html = raw.toString('utf8');
  if (createHash('sha256').update(raw).digest('hex') !== row.source_html_sha256) throw Error('Shared HTML changed: ' + row.path);
  if (scopeHash(plainText(atiContent(html))) !== row.text_sha256) throw Error('Shared extracted text changed: ' + row.path);
  const notice = atiNotice(html);
  if (!notice.licensing || !notice.citation || scopeHash(notice) !== row.notice_sha256) throw Error('Shared source notice changed: ' + row.path);
  verified.push({path:row.path,characters:plainText(atiContent(html)).length});
}
console.log(JSON.stringify({verified}));
