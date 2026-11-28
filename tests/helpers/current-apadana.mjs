/** Stable live QA role; PhaseA delegates the unchanged pure382 source authority. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lstatSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {URL,fileURLToPath} from 'node:url';
import {current382Authority,INTAKE382_PINS,CURRENT_CANONICAL_SHA,CURRENT_WIDGET_VERSION,CURRENT_WIDGET_URI} from './intake382-metadata.mjs';
export {CURRENT_CANONICAL_SHA,CURRENT_WIDGET_VERSION,CURRENT_WIDGET_URI};
const DEFAULT_ROOT=fileURLToPath(new URL('../../',import.meta.url));
export const CURRENT_SOURCE_FILE='docs/evidence/apadana/current/CURRENT_SOURCE_INPUTS.json';
export const CURRENT_SOURCE_SHA='5d136e71e1cdc0fcc2812f9c6fa6c08547c2704f0b96fffc275f29b55a4eb0a8';
export const CURRENT_SOURCE_BASE='81c970094bcb1a539acf4e3856491ea9af9cc57f';
const OLD_SOURCE_FILE='docs/evidence/apadana/english401-402-pair/CURRENT_SOURCE_INPUTS.json';
const OLD_SOURCE_SHA='4c3cf4df171873477757e158736a842903770c35e824df5ab0f820ecc566c425';
const OLD_HELPER_FILE='tests/helpers/intake382-metadata.mjs';
const OLD_HELPER_SHA='c63a5965ed821ecc6af3a43c5ec34d28be0108b4c3c8a240a65b83ef79e27f5f';
const sha=x=>createHash('sha256').update(x).digest('hex');
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
function keys(x,names){assert.ok(plain(x));assert.deepEqual(Object.keys(x).sort(),[...names].sort());}
function pin(x){assert.equal(typeof x,'string');assert.match(x,/^[a-f0-9]{64}$/,'Pending independently reviewed live source map; no old-closure fallback');}
function freeze(x){if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;}
function relative(name){assert.equal(typeof name,'string');assert.match(name,/^[a-zA-Z0-9_./-]+$/);assert.ok(name&&!name.startsWith('/')&&!name.includes('\\')&&name.split('/').every(p=>p&&p!=='.'&&p!=='..'));return name;}
function physical(base){let path;if(typeof base==='string'){assert.ok(!base.split(/[\\/]/).includes('..'));path=resolve(base);}else{assert.ok(base&&Object.getPrototypeOf(base)===URL.prototype);assert.equal(base.protocol,'file:');path=resolve(fileURLToPath(base));}const parents=[];for(let p=path;;p=dirname(p)){parents.push(p);if(dirname(p)===p)break;}for(const p of parents.reverse()){const stat=lstatSync(p);assert.ok(stat.isDirectory()&&!stat.isSymbolicLink(),'Physical nonsymlink source root required');}return path;}
function regular(base,name){let path=base;const parts=relative(name).split('/');for(const[i,p]of parts.entries()){path=resolve(path,p);const s=lstatSync(path);assert.ok(!s.isSymbolicLink());assert.ok(i===parts.length-1?s.isFile():s.isDirectory());}return readFileSync(path);}
export function currentContext(base=DEFAULT_ROOT){return current382Authority(base);}
export function currentAuthority(base=DEFAULT_ROOT){return currentContext(base).english;}
export function currentSourceViews(base=DEFAULT_ROOT){const current=currentContext(base);return freeze({current,historical382:current});}
export function currentSourcePins(){return INTAKE382_PINS;}
export function currentRuntimeContract(){return freeze({inventory_schema:'independent-reviewed-intake382-runtime-inventory-v1',review_schema:'reviewed-intake382-runtime-approval-v1',approval_sha256:INTAKE382_PINS['APPROVAL.json'],expected_manifest_sha256:'0bdd61300073bdf55631709f0152707a9fa4039c5de55b31681260d5b74f43ae',predecessor_inventory_sha256:'fa46d776a08100d79117bd415f29a16f8fa4d2a37a8ef4918acccea88f30256b',predecessor_directory:'docs/evidence/apadana/thera389-390/',baseline_commit:'f03150ff03f75e20abfb735836093cf3a0bfe5c2'});}
export function requireCurrentProfiles(observed,base=DEFAULT_ROOT){assert.deepEqual(observed,currentAuthority(base).profiles);return observed;}
export function requireCurrentMetadata(observed,catalogue,base=DEFAULT_ROOT){const a=currentAuthority(base);assert.deepEqual(observed,a.profiles);assert.deepEqual(catalogue,a.manifest);return{profiles:observed,catalogue};}
export function currentRegistryIds(base=DEFAULT_ROOT){return currentAuthority(base).ids;}
export function currentRecords(base=DEFAULT_ROOT){const a=currentAuthority(base);return freeze([...a.selection.baseline_records,...a.selection.approved_records]);}
export function currentFamilyRecords(chapter,base=DEFAULT_ROOT){assert.ok(chapter==='chapter-3'||chapter==='chapter-4');return freeze(currentRecords(base).filter(row=>row.publisher_chapter===chapter).sort((a,b)=>a.poem-b.poem));}
export function currentFamilyIds(chapter,base=DEFAULT_ROOT){return freeze(currentFamilyRecords(chapter,base).map(row=>row.id));}
export function currentSourceApproval(base=DEFAULT_ROOT){return currentAuthority(base).selection.current_source_approval;}
const REQUIRED=['tests/helpers/intake382-metadata.mjs',OLD_SOURCE_FILE,'scripts/web_reader_current_apadana.py','scripts/web-reader-apadana-thera-expansion-check.py','scripts/check-current-source-adapters.py'];
export function assertCurrentSourceClosure(base=DEFAULT_ROOT){
 base=physical(base);pin(CURRENT_SOURCE_SHA);const raw=regular(base,CURRENT_SOURCE_FILE);assert.equal(sha(raw),CURRENT_SOURCE_SHA);const manifest=JSON.parse(raw);keys(manifest,['schema','status','baseline_commit','files']);assert.equal(manifest.schema,'reviewed-current-apadana-source-inputs-v1');assert.equal(manifest.status,'APPROVED_EXACT_CURRENT_APADANA_SOURCE_INPUTS_ONLY');assert.equal(manifest.baseline_commit,CURRENT_SOURCE_BASE);assert.ok(plain(manifest.files));assert.deepEqual(Object.keys(manifest.files),Object.keys(manifest.files).sort());
 const oldRaw=regular(base,OLD_SOURCE_FILE);assert.equal(sha(oldRaw),OLD_SOURCE_SHA);const old=JSON.parse(oldRaw);keys(old,['schema','status','baseline_commit','files']);assert.equal(old.schema,'reviewed-current382-source-inputs-v1');assert.equal(old.status,'APPROVED_EXACT_CURRENT382_SOURCE_INPUTS_ONLY');assert.equal(Object.keys(old.files).length,198);assert.equal(sha(regular(base,OLD_HELPER_FILE)),OLD_HELPER_SHA,'Pure historical382 helper is immutable');
 for(const p of Object.keys(old.files))assert.ok(Object.hasOwn(manifest.files,p),'Every old198 pathname remains a live control');for(const p of REQUIRED)assert.ok(Object.hasOwn(manifest.files,p),'Explicit live source membership '+p);
 const excluded=new Set([CURRENT_SOURCE_FILE,'tests/helpers/current-apadana.mjs','tests/helpers/historical-h-inputs.mjs','scripts/ci-test-partitions.mjs','tests/ci-test-partitions.test.mjs','.github/workflows/check.yml']);
 for(const[p,row]of Object.entries(manifest.files)){relative(p);assert.ok(p==='README.md'||/^(?:src|web|scripts|tests|docs)\//.test(p));assert.ok(!excluded.has(p)&&!p.startsWith('docs/evidence/qa/'));keys(row,['bytes','sha256']);assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>=0);pin(row.sha256);const value=regular(base,p);assert.equal(value.length,row.bytes);assert.equal(sha(value),row.sha256,'Exact live source '+p);}return freeze(manifest);
}
