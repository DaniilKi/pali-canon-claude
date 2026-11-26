import {historical339Metadata,profilesForHistorical339} from './intake343-metadata.mjs';
import {projectFrozen440Source} from './boundary333-336-source-input.mjs';
/** Finite test-input adapter only. Runtime readers/parsers remain current339. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function sealed(file,expected){assert.match(file,/^[A-Z0-9_]+\.json$/);const bytes=readFileSync(new URL('../../docs/evidence/apadana/'+file,import.meta.url));assert.equal(sha(bytes),expected,'Mandatory exact339 authority '+file);return JSON.parse(bytes);}
const approval=sealed('THERA_321_329_APPROVAL.json','39a344a026373f8a902ecb5857414daf12fc4a8ae942132050529844aa602810');
const descriptors=[['baseline_freeze','THERA_321_329_BASELINE333_COMPACT.json','084180e7967985cf375a71554234405de977f6f6945c41c202a9b467dcb3ba8e'],['expected_profiles','THERA_321_329_EXPECTED_PROFILES.json','d7815f6413f1201a9d1dc2be92feb94f3cee00f526d4ab4f68a061b1505304b8'],['expected_links','THERA_321_329_EXPECTED_LINKS.json','52131947ea7b90b3f54d4ddde4b00f02652ce9c4b260c18a59e92f3063fc6971']];
for(const[key,file,hash]of descriptors)assert.deepEqual(approval[key],{file,sha256:hash});
const [compact,profiles,links]=descriptors.map(([,file,hash])=>sealed(file,hash));
const PUBLISHERS=[321,323,324,325,326,329];
const NEW_IDS=['tha-ap323','tha-ap325','tha-ap326','tha-ap327','tha-ap328','tha-ap331'];
const NEW_RECORDS=NEW_IDS.map((id,i)=>({id,publisher_chapter:'chapter-3',poem:PUBLISHERS[i]}));
assert.equal(approval.schema,'reviewed-apadana-intake-v1');assert.equal(approval.status,'approved');assert.equal(approval.base_commit,'d4dac33e76b449412d7e0cb7a6b93d6189549337');assert.equal(approval.publisher_revision,'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4');assert.equal(approval.source_and_normalization_only,true);assert.equal(approval.runtime_approval,false);assert.equal(approval.release_approval,false);assert.equal(approval.external_activations,0);assert.equal(approval.media_approval,false);
assert.equal(compact.schema,'independent-pinnedD4-baseline333-preservation-v1');assert.equal(compact.base_commit,approval.base_commit);assert.equal(compact.profile_count,333);assert.equal(compact.translation_count,333);assert.equal(compact.ids.length,333);assert.equal(new Set(compact.ids).size,333);assert.deepEqual(Object.keys(compact.profile_object_sha256),compact.ids);assert.deepEqual(Object.keys(compact.translation_object_sha256),compact.ids);
assert.deepEqual(approval.baseline_ids,compact.ids);assert.deepEqual(approval.approved_ids,NEW_IDS);assert.deepEqual(approval.approved_records,NEW_RECORDS);assert.deepEqual(Object.keys(profiles),NEW_IDS);assert.deepEqual(Object.keys(links),NEW_IDS);assert.deepEqual(approval.expected_profile_ids,[...compact.ids,...NEW_IDS]);assert.equal(new Set(approval.expected_profile_ids).size,339);
assert.deepEqual(approval.previous_intake,{file:'THERA_312_319_APPROVAL.json',sha256:'cc8480e22bb9a1615af86cee2e153c77695f4d20c21fd8f147e31f8658ca610d'});assert.deepEqual(approval.held_ids,['tha-ap72','tha-ap142','tha-ap160','tha-ap161','tha-ap262','tha-ap268','tha-ap282','tha-ap308','tha-ap309']);
for(const id of [...approval.held_ids,'tha-ap293','tha-ap299','tha-ap302','tha-ap313','tha-ap322','tha-ap324','tha-ap329','tha-ap330','tha-ap332','tha-ap333'])assert.ok(!approval.expected_profile_ids.includes(id),'Held/unapproved owner '+id);
function historicalMaps(observedProfiles,observedLinks){assert.deepEqual(Object.keys(observedProfiles),compact.ids,'Exact historical333 profile keys/order');assert.deepEqual(Object.keys(observedLinks),compact.ids,'Exact historical333 link keys/order');for(const id of compact.ids){assert.equal(sha(JSON.stringify(observedProfiles[id])),compact.profile_object_sha256[id],'Unchanged full historical profile '+id);assert.equal(sha(JSON.stringify(observedLinks[id])),compact.translation_object_sha256[id],'Unchanged full historical link '+id);}}
export function requireHistorical333Maps(observedProfiles,observedLinks){historicalMaps(observedProfiles,observedLinks);return true;}
export function publisher339Authority(){return authority;}
const authority=freeze({approval,compact,profiles,links,newIds:NEW_IDS,newRecords:NEW_RECORDS});
function historicalRequireProfiles339(observed){assert.deepEqual(Object.keys(observed),approval.expected_profile_ids,'Exact complete339 profile keys/order required');for(const id of compact.ids)assert.equal(sha(JSON.stringify(observed[id])),compact.profile_object_sha256[id],'Unchanged full historical profile '+id);for(const id of NEW_IDS){assert.deepEqual(observed[id],profiles[id],'Exact approved new profile '+id);assert.equal(sha(JSON.stringify(observed[id])),sha(JSON.stringify(profiles[id])),'Exact new profile property order '+id);}}
function source333From339(source){assert.ok(source&&typeof source==='object'&&!Array.isArray(source));const projected=structuredClone(source);assert.equal(typeof projected.policy,'string');for(const[current,prior]of [['339 finite complete publisher-edition poems','333 finite complete publisher-edition poems'],['299 explicitly mapped Therā','293 explicitly mapped Therā']]){assert.equal(projected.policy.split(current).length-1,1,'Exactly one approved339 source-policy counter '+current);projected.policy=projected.policy.replace(current,prior);}assert.equal(sha(JSON.stringify(projected)),compact.manifest_source_sha256,'Only the two exact approved source-policy counter edits may differ');return projected;}
/** No baseline333 fallback: the caller must present the complete genuine339 maps first. */
function historicalProjectPublisher339To333(observedProfiles,catalogue){requireProfiles339(observedProfiles);assert.deepEqual(Object.keys(catalogue),['version','source','vri_commit','held','links'],'Exact catalogue envelope');assert.equal(catalogue.version,1);assert.equal(catalogue.vri_commit,'2d134ff9ef60f70a1eb03c9370580228811a3070');assert.deepEqual(catalogue.held,{});assert.deepEqual(Object.keys(catalogue.links),approval.expected_profile_ids,'Exact complete339 link keys/order required');for(const id of compact.ids)assert.equal(sha(JSON.stringify(catalogue.links[id])),compact.translation_object_sha256[id],'Unchanged full historical link '+id);for(const id of NEW_IDS){assert.deepEqual(catalogue.links[id],links[id],'Exact approved new link '+id);assert.equal(sha(JSON.stringify(catalogue.links[id])),sha(JSON.stringify(links[id])),'Exact new link property order '+id);}const source=source333From339(catalogue.source);const oldProfiles=Object.fromEntries(compact.ids.map(id=>[id,observedProfiles[id]])),oldLinks=Object.fromEntries(compact.ids.map(id=>[id,catalogue.links[id]]));historicalMaps(oldProfiles,oldLinks);return {profiles:Object.freeze(oldProfiles),catalogue:{...catalogue,source,links:oldLinks}};}
/** Only the historical test's exact manifest literal is projected; other file bytes pass through. */
export function historical333FileReader(observedProfiles,reader){assert.equal(typeof reader,'function');return function readHistorical333(path,...options){const raw=reader(path,...options);if(path!=='server/data/apadana.json')return raw;assert.ok(options.length===0||options.length===1&&options[0]==='utf8','Only the existing historical manifest read modes are adapted');const catalogue=JSON.parse(raw.toString('utf8')),projected=projectPublisher339To333(observedProfiles,catalogue).catalogue;const bytes=Buffer.from(JSON.stringify(projected),'utf8');return typeof raw==='string'?bytes.toString('utf8'):bytes;};}
const CLIENT333_SHA={"web/translation-policy.mjs":"327299730f8fde603c0a7bbf86a0797545bc7c5ba1f481e073bd8fad5082550e","src/chatgpt-widget.mjs":"5397258206f6c7439abb1a301981f459e5580df12f1d6efa1ff1f1e1afafb619"};
/** Require the entire new source delta, then let unchanged old333→325 assertions run. */
function historicalProjectPublisher339ClientTo333(path,source){assert.ok(Object.hasOwn(CLIENT333_SHA,path));assert.equal(typeof source,'string');const found=[...source.matchAll(/^const PINNED_NEW_PARATEXT_IDS = (?:new Set\()?(\[[^\n]+\])\)?;$/gm)];assert.equal(found.length,1);const literal=found[0][1],ids=JSON.parse(literal),suffix=','+NEW_IDS.map(id=>JSON.stringify(id)).join(',');assert.equal(ids.length,250);assert.equal(new Set(ids).size,250);assert.deepEqual(ids.filter(id=>NEW_IDS.includes(id)),NEW_IDS);assert.ok(literal.endsWith(suffix+']'));assert.equal(literal.split(suffix).length-1,1);const prior=literal.substring(0,literal.length-suffix.length-1)+']';assert.equal(JSON.parse(prior).length,244);let projected=source.replace(literal,prior);if(path==='src/chatgpt-widget.mjs'){const current="export const WIDGET_VERSION = 'v40';";assert.equal(projected.split(current).length-1,1);projected=projected.replace(current,"export const WIDGET_VERSION = 'v39';");}assert.equal(sha(projected),CLIENT333_SHA[path],'Only exact6 suffix IDs and widgetv40 may differ from full pinnedD4 source');return projected;}

/** A historical caller may present genuine333; old333 assertions still validate it.
 *339 inputs can reach that body only after this complete finite verification. */
function historicalNormalize339InputTo333(observedProfiles,catalogue){
  if(Object.keys(observedProfiles).length===339)return projectPublisher339To333(observedProfiles,catalogue);
  assert.equal(Object.keys(observedProfiles).length,333,'Only complete339 or genuine historical333 inputs');
  requireHistorical333Maps(observedProfiles,catalogue.links);
  assert.equal(sha(JSON.stringify(catalogue.source)),compact.manifest_source_sha256);
  const envelope={...catalogue};delete envelope.links;
  assert.equal(sha(JSON.stringify(envelope)),compact.manifest_envelope_without_links_sha256);
  return {profiles:observedProfiles,catalogue};
}
export function normalize339ClientTo333(path,source){
  assert.ok(Object.hasOwn(CLIENT333_SHA,path));
  if(sha(source)===CLIENT333_SHA[path])return source;
  return projectPublisher339ClientTo333(path,source);
}

export function projectPublisher339ClientTo333(path,source){
 return historicalProjectPublisher339ClientTo333(path,projectFrozen440Source(path,source));
}

export function requireProfiles339(observed){return historicalRequireProfiles339(profilesForHistorical339(observed));}
export function projectPublisher339To333(observed,catalogue){const old=historical339Metadata(observed,catalogue);return historicalProjectPublisher339To333(old.profiles,old.catalogue);}
export function normalize339InputTo333(observed,catalogue){if(Object.keys(observed).length===343||Object.keys(observed).length===359){const old=historical339Metadata(observed,catalogue);return historicalNormalize339InputTo333(old.profiles,old.catalogue);}return historicalNormalize339InputTo333(observed,catalogue);}
