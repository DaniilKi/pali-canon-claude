import {projectFrozen440Source,boundarySourceInverses,frozen440FileReader} from './boundary333-336-source-input.mjs';
/** Exact reviewed test-input inverses only; never transform application output. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const bytes=readFileSync(new URL('../../docs/evidence/apadana/CURRENT339_SOURCE_INVERSES.json',import.meta.url));
assert.equal(sha(bytes),'23ad6da6cb733e1419be305541565518fc115d1215e6d66764c2f767e153d9b3','Mandatory finite339 source-inverse authority');
export const sourceInverses=Object.freeze(JSON.parse(bytes));
assert.equal(sourceInverses.base_commit,'d4dac33e76b449412d7e0cb7a6b93d6189549337');
function historicalProjectD4Source(path,source){
 const row=sourceInverses.files[path];if(!row)return source;
 assert.equal(typeof source,'string');assert.equal(sha(source),row.current_sha256,'Only the reviewed current test source can project: '+path);
 let old=source;
 for(const hunk of row.hunks){assert.equal(old.split(hunk.after).length-1,1,'Exact finite source hunk once');old=old.replace(hunk.after,hunk.before);}
 assert.equal(sha(old),row.d4_sha256,'Every D4 assertion and fixture byte remains exact: '+path);return old;
}
export function d4FileReader(reader){const sourceReader=frozen440FileReader(reader);return (path,...options)=>{const raw=sourceReader(path,...options);if(typeof path!=='string'||!sourceInverses.files[path]&&!boundarySourceInverses.files[path])return raw;const old=projectD4Source(path,raw.toString('utf8'));return typeof raw==='string'?old:Buffer.from(old);};}

export function projectD4Source(path,source){
 return historicalProjectD4Source(path,projectFrozen440Source(path,source));
}
