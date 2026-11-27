// Explicit immutable H pure-source inputs after the genuine CURRENT375 source guard.
// Registration stays in actual R; no H .test.mjs is imported or executed.
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHSourceInputs} from './helpers/historical-h-inputs.mjs';
import {pathToFileURL as historicalHFileURL} from 'node:url';
const ownedHistoricalHInputs=prepareHistoricalHSourceInputs(new URL('../',import.meta.url));
const HistoricalHBase=historicalHFileURL(ownedHistoricalHInputs.root+'/');
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync as readOwnedHPhysicalFile} from 'node:fs';const {normalizeC1SourceReader}=await import(new URL('tests/helpers/six-boundary-source-input.mjs',HistoricalHBase).href);const readFileSync=normalizeC1SourceReader(readActualFileSync);import {createHash} from 'node:crypto';
const {intake343SourceInverses,decodeIntake343SourceInverses,intake343SourceProofBytes,projectACSource,normalizeACSourceInput,acFileReader:ownedHAcFileReader}=await import(new URL('tests/helpers/intake343-source-input.mjs',HistoricalHBase).href);
const {boundarySourceInverses,frozen440FileReader}=await import(new URL('tests/helpers/boundary333-336-source-input.mjs',HistoricalHBase).href);const {sourceInverses,d4FileReader:ownedHD4FileReader}=await import(new URL('tests/helpers/current339-source-inverse.mjs',HistoricalHBase).href);
import {fileURLToPath as historicalInputFilePath} from 'node:url';
import {relative as historicalInputRelative,sep as historicalInputSeparator} from 'node:path';
// Only the literal intake343 source-map keys may change physical input roots.
function historicalSourcePath(path){
 if(!(path instanceof URL)||path.protocol!=='file:')return path;
 const name=historicalInputRelative(historicalInputFilePath(new URL('../',import.meta.url)),historicalInputFilePath(path)).split(historicalInputSeparator).join('/');
 return Object.hasOwn(intake343SourceInverses.files,name)?new URL(name,HistoricalHBase):path;
}
function readActualFileSync(path,...options){
 const target=historicalSourcePath(path);
 return readOwnedHPhysicalFile(typeof target==='string'&&Object.hasOwn(intake343SourceInverses.files,target)?new URL(target,HistoricalHBase):target,...options);
}
function acFileReader(reader){const owned=ownedHAcFileReader(reader);return(path,...options)=>owned(historicalSourcePath(path),...options);}
function d4FileReader(reader){const owned=ownedHD4FileReader(reader);return(path,...options)=>owned(historicalSourcePath(path),...options);}
const sha=x=>createHash('sha256').update(x).digest('hex');
test('every declared current source restores its complete immutable ac input',()=>{for(const[path,row]of Object.entries(intake343SourceInverses.files)){const actual=readFileSync(path,'utf8');assert.equal(sha(actual),row.current_sha256);const old=projectACSource(path,actual,{requireCurrent:true});assert.equal(sha(old),row.ac_sha256);assert.equal(projectACSource(path,old),old);assert.throws(()=>projectACSource(path,old,{requireCurrent:true}));}});
test('source omissions substitutions duplicates and unrelated mutations cannot project',()=>{for(const[path,row]of Object.entries(intake343SourceInverses.files)){const actual=readFileSync(path,'utf8');for(const bad of [actual+'\n// unrelated\n',actual.replace(row.hunks[0].after,''),actual+row.hunks[0].after,actual.replace(row.hunks[0].after,row.hunks[0].before)])assert.throws(()=>projectACSource(path,bad,{requireCurrent:true}));}});
test('proof omission reorder substitution hash hunk and byte tampering fail the mandatory seal',()=>{const bytes=intake343SourceProofBytes();assert.deepEqual(decodeIntake343SourceInverses(bytes),intake343SourceInverses);const proof=JSON.parse(bytes),entries=Object.entries(proof.files);const variants=[];for(const altered of [entries.slice(1),entries.slice().reverse(),[...entries,['tests/unapproved.mjs',entries[0][1]]]])variants.push({...proof,files:Object.fromEntries(altered)});const bad=structuredClone(proof);bad.files[entries[0][0]].current_sha256='0'.repeat(64);variants.push(bad);for(const x of variants)assert.throws(()=>decodeIntake343SourceInverses(Buffer.from(JSON.stringify(x))));assert.throws(()=>decodeIntake343SourceInverses(Buffer.concat([bytes,Buffer.from('\n')])));});
test('string Buffer fileURL and nested historical readers retain exact declared source identities',()=>{const reader=acFileReader(readFileSync),nested=d4FileReader(readFileSync);for(const[path,row]of Object.entries(intake343SourceInverses.files)){assert.equal(sha(reader(path)),row.ac_sha256);assert.equal(sha(reader(path,'utf8')),row.ac_sha256);const url=new URL('../'+path,import.meta.url);assert.equal(sha(reader(url)),row.ac_sha256);const older=boundarySourceInverses.files[path]?.frozen440_sha256??row.ac_sha256;assert.equal(sha(nested(url)),older);const oldest=sourceInverses.files[path]?.d4_sha256??older;assert.equal(sha(nested(path)),oldest);assert.equal(sha(readFileSync(path)),row.current_sha256);assert.equal(sha(acFileReader(reader)(path)),row.ac_sha256);}});
test('exact-current normalization never converts unknown supplied mutations',()=>{for(const[path,row]of Object.entries(intake343SourceInverses.files)){const actual=readFileSync(path,'utf8');assert.equal(sha(normalizeACSourceInput(path,actual)),row.ac_sha256);const bad=actual+'\n// mutation\n';assert.equal(normalizeACSourceInput(path,bad),bad);assert.throws(()=>projectACSource(path,bad,{requireCurrent:true}));}});
test('unlisted runtime corpus and URLs are not projected',()=>{for(const path of ['server/index.cjs','server/data/apadana.json','server/data/canon.json.gz','web/unlisted.js']){assert.ok(!Object.hasOwn(intake343SourceInverses.files,path));assert.equal(normalizeACSourceInput(path,'payload'),'payload');assert.equal(projectACSource(path,'payload'),'payload');assert.throws(()=>projectACSource(path,'payload',{requireCurrent:true}));}const fake=acFileReader(()=>Buffer.from('unchanged'));assert.equal(fake(new URL('https://example.invalid/runtime')).toString(),'unchanged');});
