/** Fixed source-only current canonical context; unchanged English380 is decoded once. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lstatSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {URL,fileURLToPath} from 'node:url';
import {intake380Authority,INTAKE380_CANON,INTAKE380_VRI,CURRENT380_SOURCE_FILE,CURRENT380_SOURCE_SHA} from './intake380-metadata.mjs';
const DEFAULT_ROOT=fileURLToPath(new URL('../../',import.meta.url));
export const CURRENT389390_BASE='40d27f3bc8af2386ee253c32174652a9bbad0153';
export const CURRENT_CANONICAL_SHA='883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a';
export const CURRENT_LOCATOR_NAMESPACE='apadana-thera389-390-v1';
export const CURRENT_WIDGET_VERSION='v49';
export const CURRENT_WIDGET_URI='ui://pali-canon/reader-v49.html';
export const CURRENT389390_DIRECTORY='docs/evidence/apadana/thera389-390/';
export const CURRENT389390_CANON_BINDING_FILE=CURRENT389390_DIRECTORY+'CURRENT_CANON_BINDING.json';
export const CURRENT389390_CANON_BINDING_SHA='3b9cf33ff529ec5e950cf07bdf1aec0ed1edcf41123d9c975958c2f66e2d31e9';
export const CURRENT389390_SOURCE_FILE=CURRENT389390_DIRECTORY+'CURRENT_SOURCE_INPUTS.json';
export const CURRENT389390_SOURCE_SHA='c21e9a8b2edcd7bdbaabb3380d99b02388b6e892942e14bfdc226dfdb21727d2';
const sha=value=>createHash('sha256').update(value).digest('hex');
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
function keys(value,names){assert.ok(plain(value));assert.deepEqual(Object.keys(value).sort(),[...names].sort());}
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function pin(value){assert.equal(typeof value,'string');assert.match(value,/^[a-f0-9]{64}$/,'PENDING/unsealed current389390 authority; no old-current fallback');}
function relative(name){assert.equal(typeof name,'string');assert.match(name,/^[a-zA-Z0-9_./-]+$/);assert.ok(name&&!name.startsWith('/')&&!name.includes('\\')&&name.split('/').every(part=>part&&part!=='.'&&part!=='..'));return name;}
function physicalBase(base=DEFAULT_ROOT){
 let path;if(typeof base==='string'){assert.ok(!base.split(/[\\/]/).includes('..'),'Root parent traversal refused before IO');path=resolve(base);}else{assert.ok(base&&Object.getPrototypeOf(base)===URL.prototype,'Exact path string or native file URL required');assert.equal(base.protocol,'file:');path=resolve(fileURLToPath(base));}
 const ancestors=[];for(let p=path;;p=dirname(p)){ancestors.push(p);if(dirname(p)===p)break;}
 for(const p of ancestors.reverse()){const status=lstatSync(p);assert.equal(status.isSymbolicLink(),false,'Source root/ancestor alias refused');assert.equal(status.isDirectory(),true,'Physical source directory required');}return path;
}
function readRegular(base,name){relative(name);let path=base;const parts=name.split('/');for(let i=0;i<parts.length;i++){path=resolve(path,parts[i]);const status=lstatSync(path);assert.equal(status.isSymbolicLink(),false,'Source component alias refused');assert.equal(i===parts.length-1?status.isFile():status.isDirectory(),true,'Physical regular source input required');}return readFileSync(path);}
const BINDING_KEYS=['schema','status','base_commit','source_commit','old_canonical_logical_sha256','new_canonical_logical_sha256','namespace','targets','old_units','new_units','preservation','english_profiles_sha256_JSON_stringify','english_links_sha256_JSON_stringify','held_sha256_JSON_stringify','evidence','source_only','behavioral_or_release_approval'];
const PRESERVATION=Object.freeze({source_books:61,other_units:8542,commentary_unchanged:true,english_profiles:380,english_links:380,held_unchanged:true,accepted_citations:5327,shared_links:1518});
const OLD_UNITS={"tha-ap389":{"id":"tha-ap389","book":36,"start":11045,"end":11067,"title":"Kadaliphaladāyakattheraapadānaṃ","collection":"ap","acronym":"Tha Ap 389","vri":"37–43","pts":{"volume":1,"page":297,"end_page":297}},"tha-ap390":{"id":"tha-ap390","book":36,"start":11067,"end":11081,"title":"Panasaphaladāyakattheraapadāna","collection":"ap","acronym":"Tha Ap 390","vri":"44–48","pts":{"volume":1,"page":297,"end_page":297}}};
const NEW_UNITS={"tha-ap389":{"id":"tha-ap389","book":36,"start":11045,"end":11063,"title":"Kadaliphaladāyakattheraapadānaṃ","collection":"ap","acronym":"Tha Ap 389","vri":"37–42","pts":{"volume":1,"page":297,"end_page":297},"index_revision":"apadana-thera389-390-v1"},"tha-ap390":{"id":"tha-ap390","book":36,"start":11063,"end":11081,"title":"Panasaphaladāyakattheraapadānaṃ","collection":"ap","acronym":"Tha Ap 390","vri":"43–48","pts":{"volume":1,"page":297,"end_page":297},"index_revision":"apadana-thera389-390-v1"}};
export function current389390Authority(base=DEFAULT_ROOT){
 base=physicalBase(base);pin(CURRENT389390_CANON_BINDING_SHA);const raw=readRegular(base,CURRENT389390_CANON_BINDING_FILE);assert.equal(sha(raw),CURRENT389390_CANON_BINDING_SHA,'Exact reviewed canonical binding');const canonical=JSON.parse(raw);keys(canonical,BINDING_KEYS);
 assert.equal(canonical.schema,'reviewed-boundary389390-current-canon-binding-v1');assert.equal(canonical.status,'APPROVED_SOURCE_BOUNDARY_AND_PARALLELS_BINDING_ONLY');assert.equal(canonical.base_commit,CURRENT389390_BASE);assert.equal(canonical.source_commit,INTAKE380_VRI);assert.equal(canonical.old_canonical_logical_sha256,INTAKE380_CANON);assert.equal(canonical.new_canonical_logical_sha256,CURRENT_CANONICAL_SHA);assert.equal(canonical.namespace,CURRENT_LOCATOR_NAMESPACE);assert.deepEqual(canonical.targets,['tha-ap389','tha-ap390']);assert.deepEqual(canonical.old_units,OLD_UNITS);assert.deepEqual(canonical.new_units,NEW_UNITS);assert.deepEqual(canonical.preservation,PRESERVATION);assert.equal(canonical.source_only,true);assert.equal(canonical.behavioral_or_release_approval,false);
 keys(canonical.evidence,['source_review','namespace_oracle_review','full_canon_audit','parallels_diff_review']);for(const row of Object.values(canonical.evidence)){keys(row,['artifact','bytes','sha256']);relative(row.artifact);assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>0);pin(row.sha256);}
 const english=intake380Authority(base);assert.equal(english.ids.length,380);for(const[field,value]of [['english_profiles_sha256_JSON_stringify',english.profiles],['english_links_sha256_JSON_stringify',english.links],['held_sha256_JSON_stringify',english.selection.held_ids]]){pin(canonical[field]);assert.equal(sha(JSON.stringify(value)),canonical[field],'Full unchanged ordered English authority '+field);}
 return freeze({english,canonical,widget:{version:CURRENT_WIDGET_VERSION,uri:CURRENT_WIDGET_URI,skybridge:'ui://pali-canon/reader-v49.skybridge.html'}});
}
const REQUIRED_NEW_SOURCE_PATHS=[CURRENT380_SOURCE_FILE,CURRENT389390_CANON_BINDING_FILE,CURRENT389390_DIRECTORY+'RUNTIME_INVENTORY.json',CURRENT389390_DIRECTORY+'RUNTIME_REVIEW.json','scripts/web_reader_boundary389390.py','tests/apadana-thera389390-boundary.test.mjs','tests/apadana_thera389390_acceptance.py','scripts/canon/apadana_thera389390_spans.py','scripts/canon/repair_apadana_thera389390_spans.py'];
export function assertCurrent389390SourceClosure(base=DEFAULT_ROOT){
 base=physicalBase(base);pin(CURRENT389390_SOURCE_SHA);const raw=readRegular(base,CURRENT389390_SOURCE_FILE);assert.equal(sha(raw),CURRENT389390_SOURCE_SHA);const manifest=JSON.parse(raw);keys(manifest,['schema','status','baseline_commit','files']);assert.equal(manifest.schema,'reviewed-current389390-source-inputs-v1');assert.equal(manifest.status,'APPROVED_EXACT_CURRENT389390_SOURCE_INPUTS_ONLY');assert.equal(manifest.baseline_commit,CURRENT389390_BASE);assert.ok(plain(manifest.files));assert.deepEqual(Object.keys(manifest.files),Object.keys(manifest.files).sort());
 // Old136 is a literal historical declaration. Current rows are independently
 // resealed; do not compare its old hashes to changed current canonical code.
 pin(CURRENT380_SOURCE_SHA);const oldRaw=readRegular(base,CURRENT380_SOURCE_FILE);assert.equal(sha(oldRaw),CURRENT380_SOURCE_SHA);const old=JSON.parse(oldRaw);keys(old,['schema','status','baseline_commit','files']);assert.equal(old.schema,'reviewed-current380-source-inputs-v1');assert.equal(old.status,'APPROVED_EXACT_CURRENT380_SOURCE_INPUTS_ONLY');assert.equal(old.baseline_commit,'9bacd4d7b98c53ed4ae53785b5213a35c2a93096');assert.ok(plain(old.files));assert.equal(Object.keys(old.files).length,136);for(const path of Object.keys(old.files))assert.ok(Object.hasOwn(manifest.files,path),'Every old136 pathname remains a current canonical source control');
 for(const path of REQUIRED_NEW_SOURCE_PATHS)assert.ok(Object.hasOwn(manifest.files,path),'Finite current/historical source prerequisite retained '+path);
 const excluded=new Set([CURRENT389390_SOURCE_FILE,'tests/helpers/current389390-metadata.mjs','tests/helpers/historical-h-inputs.mjs','scripts/ci-test-partitions.mjs','tests/ci-test-partitions.test.mjs','.github/workflows/check.yml']);
 for(const[path,row]of Object.entries(manifest.files)){relative(path);assert.ok(path==='README.md'||/^(?:src|web|scripts|tests|docs)\//.test(path));assert.ok(!excluded.has(path));assert.ok(!path.startsWith('docs/evidence/qa/'),'Current CI authorities remain outside source graph');keys(row,['bytes','sha256']);assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>=0);pin(row.sha256);const value=readRegular(base,path);assert.equal(value.length,row.bytes);assert.equal(sha(value),row.sha256,'Exact current389390 physical source '+path);}
 return freeze(manifest);
}
