// Preserve historical compressed-byte receipts after the strictly reviewed inverse.
// Match shared_spans.write_gzip: Node and Python zlib versions can emit different
// valid deflate bytes, so the original Python serializer remains the byte oracle.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { canonBeforeTheraPair } from './canon-before-thera-pair.mjs';

export function canonBeforeTheraPairGzip(canon) {
  const result = spawnSync(process.env.PYTHON || 'python', ['-c', `
import gzip,json,sys
sys.stdin.reconfigure(encoding='utf-8')
data=json.load(sys.stdin)
with gzip.GzipFile(filename='',fileobj=sys.stdout.buffer,mode='wb',compresslevel=9,mtime=0) as compressed:
 compressed.write(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode('utf-8'))
`], { input: JSON.stringify(canonBeforeTheraPair(canon)), maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, result.error?.message || result.stderr?.toString());
  return result.stdout;
}
