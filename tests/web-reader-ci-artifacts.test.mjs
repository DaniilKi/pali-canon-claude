import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('every browser-group JSON report is retained as a CI artifact',()=>{
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 assert.ok(group,'browser matrix exists');
 const produced=new Set([...group.matchAll(/--report\s+([\w.-]+\.report\.json)/g)].map(x=>x[1]));
 for(const x of group.matchAll(/>\s+([\w.-]+\.report\.json)/g))produced.add(x[1]);
 const paths=group.split('          path: |')[1]?.split('          if-no-files-found:')[0];
 assert.ok(paths,'artifact upload paths exist');assert.ok(produced.size>10,'report discovery cannot silently become empty');
 const retained=new Set(paths.trim().split(/\s+/));
 for(const report of produced)assert.ok(retained.has(report),`${report} is generated but not retained`);
});
