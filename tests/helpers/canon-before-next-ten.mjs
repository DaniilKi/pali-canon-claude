/** Pure finite TEST-INPUT inverse. Never transform production/runtime responses. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readSixRegularRelative} from './six-regular-file.mjs';
const root=new URL('../../',import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex');
const source='2d134ff9ef60f70a1eb03c9370580228811a3070';
export const DD7_CANON_SHA='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b';
export const NEXT_TEN_CANON_SHA='f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de';
export const NEXT_TEN_ORACLE_SHA='78fd34efd9942bb363010123f4019cfa31df3b609fbd3736d2db7288c2036655';
export const NEXT_TEN_REVISION='apadana-thera-next10-v1';
export const NEXT_TEN_IDS=Object.freeze(['tha-ap348','tha-ap349','tha-ap374','tha-ap375','tha-ap423','tha-ap424','tha-ap426','tha-ap427','tha-ap428','tha-ap429']);
export const NEXT_TEN_DIRECTORY='docs/evidence/apadana/boundaries-next-ten/';
const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
export function nextTenAuthority({root:base=root}={}){
 const raw=readSixRegularRelative(base,NEXT_TEN_DIRECTORY+'FUTURE_ORACLE.json');assert.equal(sha(raw),NEXT_TEN_ORACLE_SHA,'Mandatory original-first ten-record oracle');
 const v=JSON.parse(raw);assert.equal(v.schema,'independent-original-first-next-ten-source-oracle-v1');assert.equal(v.application_baseline_commit,'dd7b697df2c54308084fffd934af38130d01f952');assert.deepEqual(v.targets,NEXT_TEN_IDS);assert.equal(v.index_revision,NEXT_TEN_REVISION);assert.equal(v.index_revision_length,23);assert.equal(v.locator_revision,source+'-'+NEXT_TEN_REVISION);assert.equal(v.locator_revision_length,64);assert.equal(v.old_canonical_logical_sha256,DD7_CANON_SHA);assert.equal(v.future_canonical_logical_sha256,NEXT_TEN_CANON_SHA);assert.equal(v.app_Builder_or_proposed_repair_imports,false);assert.equal(v.coverage_gain,0);
 assert.deepEqual(Object.keys(v.original_sources),['36','37']);for(const[k,n]of [['36',14645],['37',10672]]){assert.equal(v.original_sources[k].VRI_commit,source);assert.equal(v.original_sources[k].retained_tuples,n);assert.equal(v.original_sources[k].full_original_tuple_equality_current,true);}
 assert.deepEqual(v.records.map(r=>r.id),NEXT_TEN_IDS);for(const row of v.records){assert.equal(sha(JSON.stringify(row.before)),row.before_object_sha256);assert.equal(sha(JSON.stringify(row.after)),row.after_object_sha256);assert.equal(row.after.index_revision,NEXT_TEN_REVISION);}return freeze(v);
}
export function nextTenState(canon,options){
 const oracle=nextTenAuthority(options);assert.equal(canon.source?.commit,source);assert.ok(Array.isArray(canon.units));const chosen={};
 for(const id of NEXT_TEN_IDS){const rows=canon.units.filter(u=>u.id===id);assert.equal(rows.length,1,'Missing or duplicate ten-record unit');chosen[id]=rows[0];}
 for(const[state,field]of [['old','before'],['new','after']]){const expected=Object.fromEntries(oracle.records.map(r=>[r.id,r[field]]));try{assert.deepEqual(chosen,expected);return state;}catch{}}
 assert.fail('Mixed or unreviewed ten-record metadata');
}
/** Unrelated intentional mutations survive this pure finite inverse. */
export function canonBeforeNextTen(canon,options){nextTenState(canon,options);const old=Object.fromEntries(nextTenAuthority(options).records.map(r=>[r.id,r.before]));return {...canon,units:canon.units.map(u=>Object.hasOwn(old,u.id)?structuredClone(old[u.id]):u)};}
export function exactDD7CanonBytes(raw,options){assert.equal(sha(raw),NEXT_TEN_CANON_SHA,'Exact whole current ten-record canon required');const canon=JSON.parse(raw);assert.equal(nextTenState(canon,options),'new');const old=Buffer.from(JSON.stringify(canonBeforeNextTen(canon,options)));assert.equal(sha(old),DD7_CANON_SHA,'Whole immutable DD7 canon restored');return old;}
/** Explicit historical input is permitted; never use pure inverse after a full-hash failure. */
export function nextTenLogicalInput(raw,options){return sha(raw)===DD7_CANON_SHA?raw:exactDD7CanonBytes(raw,options);}
