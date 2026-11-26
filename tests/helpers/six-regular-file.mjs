/** Guarded TEST-AUTHORITY file reads; no roots from environment or runtime payloads. */
import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
export function readSixRegularRelative(root,relative){
 assert.equal(typeof relative,'string');assert.match(relative,/^[a-zA-Z0-9_./-]+$/);const parts=relative.split('/');assert.ok(parts.length&&parts.every(p=>p&&p!=='.'&&p!=='..'));
 const base=resolve(root instanceof URL?fileURLToPath(root):root);const rootStat=lstatSync(base);assert.equal(rootStat.isSymbolicLink(),false,'Symlink authority root refused');assert.equal(rootStat.isDirectory(),true,'Regular authority root directory required');let path=base;
 for(let i=0;i<parts.length;i++){path=join(path,parts[i]);const stat=lstatSync(path);assert.equal(stat.isSymbolicLink(),false,'Symlink authority component refused');assert.equal(i===parts.length-1?stat.isFile():stat.isDirectory(),true,'Regular authority file/directory required');}
 return readFileSync(path);
}
