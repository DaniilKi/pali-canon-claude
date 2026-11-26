/** Strict TEST authorities/metadata only. Never import from src/web/server. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readSixRegularRelative} from './six-regular-file.mjs';
const root=new URL('../../',import.meta.url),dir='docs/evidence/apadana/english335-350/';
const sha=x=>createHash('sha256').update(x).digest('hex'),objectSha=x=>sha(JSON.stringify(x));
export const INTAKE359_BASE='3d614795cf95e45280603e95f68846c52eba4818';
export const INTAKE359_CANON='f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de';
export const INTAKE359_IDS=Object.freeze(['tha-ap337','tha-ap338','tha-ap339','tha-ap340','tha-ap341','tha-ap342','tha-ap343','tha-ap344','tha-ap345','tha-ap346','tha-ap347','tha-ap348','tha-ap349','tha-ap350','tha-ap351','tha-ap352']);
export const INTAKE359_PUBLISHERS=Object.freeze([335,336,337,338,339,340,341,342,343,344,345,346,347,348,349,350]);
export const INTAKE359_PINS=Object.freeze({
 'BASELINE343.json':'4c122fff1283b3ee5904f1f6ea781572347d6e42140dcdd25d7765e8ab00e138',
 'BASELINE343_FULL_OBJECTS.json':'74c8c358e0bebec17f8679289f533975ee2e95270d3c7017aeb19594464d7a5e',
 'BASELINE_DATA27.json':'8631b90104e01329b74d22cc7632df265e9b9072efd6ba17b5478450b026a99f',
 'BASELINE_RUNTIME34.json':'6becdfab6b8e948a6d2df9af1a37131c4c0c727d77db79cf4bb4b93973512f23',
 'SOURCE_REVIEW.json':'61e8d843e61cbbab04c3dc4f1546c8725d0ad883d194d8e5b567c4e3d681385a',
 'SOURCE_CURATION.json':'e777f4dc3b154a448162b8d0c274d44995722903ebef59e133172ee46ecac5da',
 'APPROVAL.json':'9232fdeec1b93618b5019b1aeb2c706b2a6b423a62bbb5dae86ea39b520e4bf6',
 'PROFILES.json':'4d1ba58af7d5918ae18d68eab63d5e4e1258925d90c46d8d889fe5a74977a59d',
 'LINKS.json':'f284bc4dcbb415a55aa025f654018448ce3578772dea010f12d8e7cfd536da0a',
 'EXPECTED_MANIFEST.json':'57b6fd43f4b8273e9542b8a22a6bd84b2042914113d53c94fe727386c5ec0194',
 'PROFILE_SCHEMA_REVIEW.json':'7af2686040b00e89730568771ff8d35e64b676b383f014981eb809d4f63203e5',
});
export const INTAKE359_RUNTIME_FILE='RUNTIME_INVENTORY.json';
export const INTAKE359_REVIEW_FILE='RUNTIME_REVIEW.json';
export const INTAKE359_RUNTIME_SHA='516460d8fecb86a7b2831fc445439868d0c43df1277fc02322ce1840f047069b';
export const INTAKE359_RUNTIME_REVIEW_SHA='646ab8d8fdcabb0130766b056c00997d9e10f6e99a640445628bdff6bb296e76';
export const INTAKE359_APP_COMMIT='b2280c55ccf29c778abd89f26e3165b367b5ddba';
export const AP343_INPUT='server/data/apadana.json';
export const AP343_FIXTURE='tests/fixtures/canon-before-intake359/apadana.json';
const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
function sealed(base,name,pin){assert.match(pin,/^[a-f0-9]{64}$/,'Pending independent359 authority; no fallback');const b=readSixRegularRelative(base,dir+name);assert.equal(sha(b),pin,'Exact independent359 authority: '+name);return JSON.parse(b);}
export function fresh359Proofs(base,{runtime=false}={}){
 for(const[name,pin]of Object.entries(INTAKE359_PINS)){assert.match(pin,/^[a-f0-9]{64}$/,'Pending independent359 authority');assert.equal(sha(readSixRegularRelative(base,dir+name)),pin);}
 if(runtime)for(const[name,pin]of [[INTAKE359_RUNTIME_FILE,INTAKE359_RUNTIME_SHA],[INTAKE359_REVIEW_FILE,INTAKE359_RUNTIME_REVIEW_SHA]]){assert.match(pin,/^[a-f0-9]{64}$/,'Pending actual359 runtime authority');assert.equal(sha(readSixRegularRelative(base,dir+name)),pin);}
}
export function intake359Authority(base=root){
 const read=name=>sealed(base,name,INTAKE359_PINS[name]);
 const compact=read('BASELINE343.json'),previous=read('BASELINE343_FULL_OBJECTS.json');
 assert.equal(compact.commit,INTAKE359_BASE);assert.equal(previous.commit,INTAKE359_BASE);assert.equal(compact.canonical_logical_sha256,INTAKE359_CANON);
 assert.equal(compact.ids.length,343);assert.equal(new Set(compact.ids).size,343);assert.deepEqual(Object.keys(previous.profiles),compact.ids);assert.deepEqual(Object.keys(previous.links),compact.ids);
 for(const id of compact.ids){assert.equal(objectSha(previous.profiles[id]),compact.profile_object_sha256[id]);assert.equal(objectSha(previous.links[id]),compact.translation_object_sha256[id]);}
 assert.deepEqual(previous.manifest_source,compact.manifest_source);
 const data=read('BASELINE_DATA27.json'),priorRuntime=read('BASELINE_RUNTIME34.json');assert.equal(data.commit,INTAKE359_BASE);assert.equal(priorRuntime.commit,INTAKE359_BASE);assert.equal(Object.keys(data.files).length,27);assert.equal(Object.keys(priorRuntime.files).length,34);
 for(const[name,row]of Object.entries(data.files)){assert.ok(name.startsWith('server/data/'));assert.deepEqual(row,priorRuntime.files[name.slice(7)]);}
 const source=read('SOURCE_REVIEW.json');assert.equal(source.status,'GO_SIXTEEN_EXACT_SOURCE_AND_NORMALIZED_CONTENT_SCOPES_ONLY');assert.equal(source.canonical_sha256,INTAKE359_CANON);
 const curation=read('SOURCE_CURATION.json');assert.equal(curation.schema,'english16-independent-source-curation-v1');assert.equal(curation.status,'APPROVED_EXACT_SOURCE_AND_NORMALIZED_METADATA_SCOPES_NOT_RUNTIME');assert.equal(curation.canonical_logical_sha256,INTAKE359_CANON);assert.deepEqual(curation.canonical_ids,INTAKE359_IDS);assert.deepEqual(curation.publishers,INTAKE359_PUBLISHERS);assert.equal(curation.runtime_reader_package_CI_activation_release_approval,false);
 const approval=read('APPROVAL.json');assert.equal(approval.schema,'reviewed-thera335-350-approval-v1');assert.equal(approval.status,'approved');assert.equal(approval.base_commit,INTAKE359_BASE);assert.equal(approval.source_and_normalization_only,true);assert.equal(approval.runtime_approval,false);assert.equal(approval.release_approval,false);assert.equal(approval.canonical_logical_sha256,INTAKE359_CANON);assert.equal(approval.publisher_revision,'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4');assert.equal(approval.vri_revision,'2d134ff9ef60f70a1eb03c9370580228811a3070');
 const records=INTAKE359_IDS.map((id,i)=>({id,publisher_chapter:'chapter-3',poem:INTAKE359_PUBLISHERS[i]}));assert.deepEqual(approval.approved_records,records);assert.deepEqual(approval.approved_ids,INTAKE359_IDS);assert.deepEqual(approval.baseline_ids,compact.ids);
 for(const[field,file]of [['source_curation','SOURCE_CURATION.json'],['baseline_freeze','BASELINE343.json'],['baseline_full_objects','BASELINE343_FULL_OBJECTS.json'],['expected_profiles','PROFILES.json'],['expected_links','LINKS.json'],['expected_manifest','EXPECTED_MANIFEST.json'],['independent_source_review','SOURCE_REVIEW.json'],['profile_schema_review','PROFILE_SCHEMA_REVIEW.json']])assert.deepEqual(approval[field],{file,sha256:INTAKE359_PINS[file]});
 const profiles=read('PROFILES.json'),links=read('LINKS.json'),manifest=read('EXPECTED_MANIFEST.json'),peer=read('PROFILE_SCHEMA_REVIEW.json');assert.equal(peer.schema,'english16-independent-full-profile-schema-review-v1');assert.equal(peer.status,'GO_EXACT_SIXTEEN_PROFILES_LINKS_AND_TWO_SUMMARIES_SOURCE_METADATA_ONLY');assert.equal(peer.package_CI_activation_release_approval,false);assert.equal(peer.parser_API_reader_behavior_verified,false);assert.equal(peer.source_review_sha256,INTAKE359_PINS['SOURCE_REVIEW.json']);assert.equal(peer.final_profiles_sha256,INTAKE359_PINS['PROFILES.json']);assert.equal(peer.final_links_sha256,INTAKE359_PINS['LINKS.json']);
 assert.deepEqual(Object.keys(profiles),INTAKE359_IDS);assert.deepEqual(Object.keys(links),INTAKE359_IDS);assert.ok(INTAKE359_IDS.every(id=>!Object.hasOwn(previous.profiles,id)));
 for(const[id,p]of Object.entries(profiles)){const at=INTAKE359_IDS.indexOf(id),poem=INTAKE359_PUBLISHERS[at];assert.equal(p.id,id);assert.equal(p.poem,poem);assert.equal(p.publisher_chapter,'chapter-3');assert.equal(p.path,'/text/chapter-3/poem-'+poem+'/');assert.equal(p.translation_revision,'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4');assert.equal(p.license,'CC BY-NC-SA 4.0');for(const key of ['text','translator_notes','publisher_paratext','raw','body','notes'])assert.equal(Object.hasOwn(p,key),false,'Profiles bundle metadata only');}
 const ids=[...compact.ids,...INTAKE359_IDS];assert.equal(ids.length,359);assert.deepEqual(approval.expected_profile_ids,ids);assert.deepEqual(Object.keys(manifest),['version','source','vri_commit','held','links']);assert.equal(manifest.version,1);assert.deepEqual(manifest.held,{});assert.equal(manifest.vri_commit,'2d134ff9ef60f70a1eb03c9370580228811a3070');assert.deepEqual(Object.keys(manifest.links),ids);
 for(const id of compact.ids)assert.deepEqual(manifest.links[id],previous.links[id]);for(const id of INTAKE359_IDS)assert.deepEqual(manifest.links[id],links[id]);
 return freeze({approval,compact,previous,data:data.files,priorRuntime:priorRuntime.files,profiles,links,manifest,ids});
}
function matchProfiles(observed,a){assert.deepEqual(Object.keys(observed),a.ids);for(const id of a.compact.ids)assert.deepEqual(observed[id],a.previous.profiles[id]);for(const id of INTAKE359_IDS)assert.deepEqual(observed[id],a.profiles[id]);return observed;}
export function requireProfiles359(observed,base=root){return matchProfiles(observed,intake359Authority(base));}
function matchMetadata(observed,catalogue,a){matchProfiles(observed,a);assert.deepEqual(catalogue,a.manifest);assert.equal(objectSha(catalogue),objectSha(a.manifest),'Exact observed359 manifest field and link order');return {profiles:observed,catalogue};}
export function requireMetadata359(observed,catalogue,base=root){return matchMetadata(observed,catalogue,intake359Authority(base));}
export function project359To343(observed,catalogue,base=root){
 const a=intake359Authority(base);matchMetadata(observed,catalogue,a);const profiles=Object.fromEntries(a.compact.ids.map(id=>[id,observed[id]]));const prior={...catalogue,source:structuredClone(a.previous.manifest_source),links:Object.fromEntries(a.compact.ids.map(id=>[id,catalogue.links[id]]))};const envelope={...prior};delete envelope.links;assert.equal(objectSha(envelope),a.compact.manifest_envelope_without_links_sha256);return {profiles,catalogue:prior};
}
/** Only359 observations are projected; every other input reaches the old strict stage unchanged. */
export function normalize343Metadata(observed,catalogue,base=root){return observed&&Object.keys(observed).length===359?project359To343(observed,catalogue,base):{profiles:observed,catalogue};}
export function profilesForHistorical343(observed,base=root){if(!observed||Object.keys(observed).length!==359)return observed;const a=intake359Authority(base);matchProfiles(observed,a);return Object.fromEntries(a.compact.ids.map(id=>[id,observed[id]]));}
function runtimeRecords(base=root,previous,a=intake359Authority(base)){
 assert.deepEqual(previous,a.priorRuntime);const inv=sealed(base,INTAKE359_RUNTIME_FILE,INTAKE359_RUNTIME_SHA),review=sealed(base,INTAKE359_REVIEW_FILE,INTAKE359_RUNTIME_REVIEW_SHA);assert.match(INTAKE359_APP_COMMIT,/^[a-f0-9]{40}$/);assert.equal(inv.schema,'independent-reviewed-intake359-runtime-inventory-v1');assert.equal(review.schema,'reviewed-intake359-runtime-approval-v1');assert.equal(review.status,'APPROVE_EXACT_CURRENT34_RUNTIME_INVENTORY_SOURCE_SCOPE_ONLY');assert.equal(inv.baseline_commit,INTAKE359_BASE);assert.equal(review.baseline,INTAKE359_BASE);assert.equal(inv.candidate_commit,INTAKE359_APP_COMMIT);assert.equal(review.candidate_commit,INTAKE359_APP_COMMIT);assert.deepEqual(review.independent_inventory,{file:INTAKE359_RUNTIME_FILE,sha256:INTAKE359_RUNTIME_SHA});
 for(const v of [inv,review]){assert.equal(v.curation_sha256,INTAKE359_PINS['APPROVAL.json']);assert.equal(v.canonical_logical_sha256,INTAKE359_CANON);assert.equal(v.runtime_files,34);assert.equal(v.baseline_runtime_sha256,INTAKE359_PINS['BASELINE_RUNTIME34.json']);}
 assert.equal(inv.behavioral_or_release_approval,false);assert.equal(review.inventory_only,true);assert.equal(review.runtime_inventory_approval,true);assert.equal(review.finite_source_diff_approval,true);assert.equal(review.behavioral_harness_approval,false);assert.equal(review.release_or_push_approval,false);assert.deepEqual(inv.files,review.files);assert.deepEqual(Object.keys(inv.files).sort(),Object.keys(previous).sort());assert.equal(Object.keys(inv.files).length,34);
 const delta=Object.keys(inv.files).sort().filter(p=>JSON.stringify(inv.files[p])!==JSON.stringify(previous[p]));assert.deepEqual(delta,inv.allowed_changed_paths);assert.deepEqual(delta,review.allowed_changed_paths_from_3d);assert.equal(inv.unchanged_paths,34-delta.length);assert.equal(review.unchanged_runtime_paths,34-delta.length);const allowed=new Set(['data/apadana.json','http-worker.cjs','http.cjs','index.cjs','web/reader.js','THIRD_PARTY_LICENSES.txt']);assert.ok(delta.includes('data/apadana.json'));assert.ok(delta.every(p=>allowed.has(p)));
 for(const[path,row]of Object.entries(inv.files)){assert.ok(!path.startsWith('/')&&path.split('/').every(p=>p&&p!=='.'&&p!=='..'));assert.deepEqual(Object.keys(row),['bytes','sha256']);assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>0);assert.match(row.sha256,/^[a-f0-9]{64}$/);if(path.startsWith('data/')&&path!=='data/apadana.json')assert.deepEqual(row,previous[path]);}return freeze(inv.files);
}
function ap343Bytes(base=root,a=intake359Authority(base)){const b=readSixRegularRelative(base,AP343_FIXTURE);assert.deepEqual({bytes:b.length,sha256:sha(b)},a.data[AP343_INPUT]);const old=JSON.parse(b);assert.deepEqual(old.links,a.previous.links);assert.deepEqual(old.source,a.previous.manifest_source);const env={...old};delete env.links;assert.equal(objectSha(env),a.compact.manifest_envelope_without_links_sha256);return b;}
function matchManifestBytes(raw,base=root,a=intake359Authority(base)){assert.deepEqual(JSON.parse(raw),a.manifest);return raw;}

/** Fixed capture: validates physical proof graph once, exposes immutable records plus separate historical bytes. */
export function capture359Authority(base,previous){const a=intake359Authority(base);return Object.freeze({current:runtimeRecords(base,previous,a),ap343:ap343Bytes(base,a),manifest:a.manifest});}
