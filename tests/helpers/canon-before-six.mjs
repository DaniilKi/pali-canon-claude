import {canonBeforeNextTen,nextTenLogicalInput} from './canon-before-next-ten.mjs';
/** Pure TEST-INPUT inverse only; never transform production/runtime responses. */
import assert from 'node:assert/strict';
import {readSixRegularRelative} from './six-regular-file.mjs';
const authorityRoot=new URL('../../',import.meta.url);
import {createHash} from 'node:crypto';
export const C1_CANON_SHA='46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8';
export const SOURCE_ORACLE_SHA='01bc011f958165274ce1a09850dd5cbe4f495a14242c7b96e3fd4ab0e152c397';
export const FUTURE_CANON_SHA='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b';
export const SIX_IDS=Object.freeze(['tha-ap340','tha-ap341','tha-ap343','tha-ap344','tha-ap346','tha-ap347']);
export const SIX_REVISION='apadana-thera340-341-343-344-346-347-v1';
const sha=x=>createHash('sha256').update(x).digest('hex');
const source='2d134ff9ef60f70a1eb03c9370580228811a3070';
const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
export function sixAuthority({root=authorityRoot}={}){
 assert.match(SOURCE_ORACLE_SHA,/^[a-f0-9]{64}$/,'Pending independent source oracle; no fallback');
 const raw=readSixRegularRelative(root,'docs/evidence/apadana/boundaries340-347/FUTURE_ORACLE.json');assert.equal(sha(raw),SOURCE_ORACLE_SHA);
 const value=JSON.parse(raw);assert.equal(value.schema,'independent-original-first-six-boundary-future-oracle-v1');assert.deepEqual(value.targets,SIX_IDS);assert.equal(value.index_revision,SIX_REVISION);assert.equal(SIX_REVISION.length,39);assert.equal(value.old_canonical_logical_sha256,C1_CANON_SHA);assert.match(FUTURE_CANON_SHA,/^[a-f0-9]{64}$/);assert.equal(value.future_canonical_logical_sha256,FUTURE_CANON_SHA);assert.equal(value.original_xml.VRI_commit,source);assert.equal(value.original_xml.retained_tuples,14645);assert.equal(value.original_xml.all_original_tuples_equal_C1_book,true);assert.deepEqual(value.records.map(r=>r.id),SIX_IDS);
 for(const row of value.records){assert.equal(sha(JSON.stringify(row.before)),row.before_object_sha256);assert.equal(sha(JSON.stringify(row.future)),row.future_object_sha256);assert.equal(row.future.index_revision,SIX_REVISION);}return freeze(value);
}
export function sixState(canon,options){
 canon=canonBeforeNextTen(canon,options);const oracle=sixAuthority(options);assert.equal(canon.source?.commit,source);const selected={};for(const id of SIX_IDS){const rows=canon.units.filter(u=>u.id===id);assert.equal(rows.length,1,'Missing or duplicate six-poem unit');selected[id]=rows[0];}
 const equals=expected=>{try{assert.deepEqual(selected,expected);return true;}catch{return false;}};
 for(const[state,field]of [['old','before'],['new','future']])if(equals(Object.fromEntries(oracle.records.map(r=>[r.id,r[field]]))))return state;
 assert.fail('Mixed or unreviewed six-poem metadata');
}
export function canonBeforeSix(canon,options){canon=canonBeforeNextTen(canon,options);sixState(canon,options);const previous=Object.fromEntries(sixAuthority(options).records.map(r=>[r.id,r.before]));return {...canon,units:canon.units.map(u=>Object.hasOwn(previous,u.id)?structuredClone(previous[u.id]):u)};}
export function exactC1CanonBytes(raw,options){raw=nextTenLogicalInput(raw,options);const oracle=sixAuthority(options);assert.equal(sha(raw),oracle.future_canonical_logical_sha256,'Exact complete future canon required');const value=JSON.parse(raw);assert.equal(sixState(value,options),'new');const old=Buffer.from(JSON.stringify(canonBeforeSix(value,options)));assert.equal(sha(old),C1_CANON_SHA,'Whole immutable C1 canon restored');return old;}
/** Explicit genuine C1 historical frame, otherwise strict exact future input. */
export function c1LogicalInput(raw,options){return sha(raw)===C1_CANON_SHA?raw:exactC1CanonBytes(raw,options);}
