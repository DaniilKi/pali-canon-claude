import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outageError } from '../scripts/outage-diagnostics.mjs';
test('outage diagnostics retain all four provider failures, including the later CDN, without weakening failure gates',()=>{
 const message='Could not retrieve the translation (All sources failed — accesstoinsight.org: accesstoinsight.org unreachable (simulated outage); raw.githubusercontent.com: raw.githubusercontent.com unreachable (simulated outage); cdn.jsdelivr.net: request timed out (TimeoutError); raw.githubusercontent.com: raw.githubusercontent.com unreachable (simulated outage)).';
 assert.ok(message.indexOf('cdn.jsdelivr.net')>120);
 assert.equal(outageError(message),message);
 assert.match(outageError(message),/cdn\.jsdelivr\.net: request timed out \(TimeoutError\)/);
 assert.equal(outageError('x'.repeat(10000)).length,4096+' [diagnostic truncated]'.length);
 assert.equal(outageError(null),'Source returned no error message.');
 assert.equal(outageError('host\u001b[31m\u0000failure'),'host [31m failure');
});
