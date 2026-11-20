import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as canon from '../src/canon.mjs';
import {APADANA_PROFILES} from '../src/apadana-profiles.mjs';
import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
import {sourceNoteBaselineProjection,SOURCE_NOTE_PROJECTED_FILES} from './helpers/source-note-baseline.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const jsonSha=value=>sha(JSON.stringify(value));
const pins={
 'web/reader.js':{old:'ba9f930608b219fc01dd41dcd35f4cb123afe911da1dc21449c2c082d570dafe',current:'7158816561af99d414a82716776e7a2d36373c682aa36ddcf333a9e5424ad47d'},
 'scripts/build.mjs':{old:'fdc7adeecdd98156871fe35e5aee89d8f8938cac0e0041101274eead3cc64009',current:'709bdd937a4f7621e3d5870dcab820ad25211ec3f87a63d44206c49c529d491c'},
 'src/server.mjs':{old:'ed142f6875b2278fd6d789c3bee6c3ceda58d06fedcc34d994878f5eb96bfff6',current:'7a04c8715136bcec8fdec9c1370a4a86d47cfd3f623ec7160622bd1d7e5324d4'},
};
function historical(name){
 const approval=JSON.parse(readFileSync(`docs/evidence/apadana/${name}_APPROVAL.json`)),descriptor=approval.baseline_freeze;
 const raw=readFileSync('docs/evidence/apadana/'+descriptor.file);assert.equal(sha(raw),descriptor.sha256,'The original historical evidence seal is retained');return JSON.parse(raw);
}
const freezes=[historical('THERA_221_230'),historical('THERA_REMAINING')];
const before=JSON.parse(readFileSync(new URL('./fixtures/source-notes-baseline.json',import.meta.url)));

test('only three exact approved additive files project back to both unchanged historical seals',()=>{
 assert.deepEqual(SOURCE_NOTE_PROJECTED_FILES,Object.keys(pins));
 for(const [path,pin]of Object.entries(pins)){
  const raw=readFileSync(path),copy=Buffer.from(raw);assert.equal(sha(raw),pin.current);
  const projected=sourceNoteBaselineProjection(path,raw,pin.old);assert.equal(sha(projected),pin.old);assert.deepEqual(raw,copy);
  assert.ok(projected.length<raw.length);assert.notEqual(sha(raw),pin.old);
  assert.doesNotMatch(projected.toString(),/sourceNotesForPage|originalEditionNote|createSourceNotesPolicy|__PALI_SOURCE_NOTES_POLICY_SOURCE__/);
  for(const baseline of freezes){
   const all={...baseline.privacy_storage_files,...baseline.helper_builder_auditor_files};assert.equal(all[path],pin.old);
   assert.equal(sha(sourceNoteBaselineProjection(path,raw,all[path])),all[path]);
  }
 }
});

test('arbitrary old root/private/builder code changes cannot disappear in the projection',()=>{
 const changes=[
  ['web/reader.js','const $ = id => document.getElementById(id);','const $ = id => document.querySelector(id);'],
  ['scripts/build.mjs','__PALI_WIDGET_HASH_SOURCE__: JSON.stringify(contentSha256.toString())','__PALI_WIDGET_HASH_SOURCE__: "unverified"'],
  ['src/server.mjs','segments: page, notes, english_available: english.available(unit),','segments: [], notes, english_available: english.available(unit),'],
 ];
 for(const [path,from,to]of changes){
  const text=readFileSync(path,'utf8');assert.equal(text.split(from).length,2,'Mutation targets one preexisting source-code expression');
  assert.throws(()=>sourceNoteBaselineProjection(path,Buffer.from(text.replace(from,to)),pins[path].old),/exact approved source-note additions/);
 }
});

test('missing, duplicate, relocated or changed approved additions and alternate old hashes refuse',()=>{
 const path='web/reader.js',raw=readFileSync(path),text=raw.toString(),line="import { createSourceNotesPolicy } from './source-notes-policy.mjs';\n";
 assert.ok(text.startsWith(line));
 for(const changed of [text.replace(line,''),text+line,text.replace(line,'')+line,text.replace('const sourceNotesPolicy = createSourceNotesPolicy','const sourceNotesPolicy = unreviewedPolicy')]){
  assert.throws(()=>sourceNoteBaselineProjection(path,Buffer.from(changed),pins[path].old),/exact approved source-note additions/);
 }
 assert.throws(()=>sourceNoteBaselineProjection(path,raw,'0'.repeat(64)),/alternate historical authority/);
 const old=sourceNoteBaselineProjection(path,raw,pins[path].old);
 assert.throws(()=>sourceNoteBaselineProjection(path,old,pins[path].old),/exact approved source-note additions/);
 assert.equal(sourceNoteBaselineProjection('./'+path,raw,pins[path].old),raw,'No path normalization broadens this finite scope');
});

test('every private-data/storage helper retains its original bytes outside the exact reader addition',()=>{
 for(const baseline of freezes)for(const [path,expected]of Object.entries(baseline.privacy_storage_files)){
  const raw=readFileSync(path),projected=sourceNoteBaselineProjection(path,raw,expected);assert.equal(sha(projected),expected,path);
  if(path!=='web/reader.js'){
   assert.equal(projected,raw,'Unknown files are not transformed');
   const changed=Buffer.concat([raw,Buffer.from('\n/* unapproved private-data mutation */\n')]);
   assert.equal(sourceNoteBaselineProjection(path,changed,expected),changed);
   assert.throws(()=>assert.equal(sha(sourceNoteBaselineProjection(path,changed,expected)),expected));
  }
 }
});

test('the projection cannot mask canonical or all285 profile/link changes',()=>{
 assert.equal(jsonSha(canon.load().canon),before.canonical_sha256);
 const heldBytes=readFileSync(new URL('../docs/evidence/apadana/THERA_HELD234_APPROVAL.json',import.meta.url));
 assert.equal(sha(heldBytes),'14b739ffe5f3e6f01718ccd1c247dd35454d71abb6cf4d0de672295cef8f4aa7');
 const historicalIds=JSON.parse(heldBytes).expected_profile_ids;assert.equal(historicalIds.length,285);assert.equal(new Set(historicalIds).size,285);
 assert.equal(CURRENT_APADANA_IDS.length,310);assert.deepEqual(Object.keys(APADANA_PROFILES),CURRENT_APADANA_IDS);
 assert.deepEqual(CURRENT_APADANA_IDS.slice(0,285),historicalIds);
 const historicalProfiles=Object.fromEntries(historicalIds.map(id=>{assert.ok(Object.hasOwn(APADANA_PROFILES,id),id+' prior profile retained');return [id,APADANA_PROFILES[id]];}));
 assert.equal(jsonSha(historicalProfiles),before.profiles_sha256);
 const raw=readFileSync('server/data/apadana.json');assert.equal(sourceNoteBaselineProjection('server/data/apadana.json',raw,sha(raw)),raw);
 const links=JSON.parse(raw).links;assert.deepEqual(Object.keys(links),CURRENT_APADANA_IDS);
 const historicalLinks=Object.fromEntries(historicalIds.map(id=>{assert.ok(Object.hasOwn(links,id),id+' prior translation retained');return [id,links[id]];}));
 assert.equal(jsonSha(historicalLinks),before.links_sha256);
 for(const path of ['src/apadana-profiles.mjs','src/apadana-thera-profiles.mjs']){
  const bytes=readFileSync(path),expected=sha(bytes),changed=Buffer.concat([bytes,Buffer.from('\n/* unapproved profile change */\n')]);
  assert.equal(sourceNoteBaselineProjection(path,bytes,expected),bytes);
  assert.throws(()=>assert.equal(sha(sourceNoteBaselineProjection(path,changed,expected)),expected));
 }
});
