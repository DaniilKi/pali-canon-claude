// Historical H source/metadata inputs only. The owned provider validates CURRENT375 first.
// Registration stays at this actual-R file; no H .test.mjs is imported or executed.
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHRuntimeInputs} from './helpers/historical-h-inputs.mjs';
import {resolve as resolveHistoricalHInput,isAbsolute as isAbsoluteHistoricalHInput} from 'node:path';
import {pathToFileURL as historicalHFileURL} from 'node:url';
const ownedHistoricalHInputs=prepareHistoricalHRuntimeInputs(new URL('../',import.meta.url));
const HistoricalHBase=historicalHFileURL(ownedHistoricalHInputs.root+'/');
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
function readCurrentFileSync(path,...options){return readOwnedHPhysicalFile(typeof path==='string'&&!isAbsoluteHistoricalHInput(path)?resolveHistoricalHInput(ownedHistoricalHInputs.root,path):path,...options);}
/** Test-only current333→historical325 input binding; never a runtime downgrade. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readOwnedHPhysicalFile} from 'node:fs';
import {createHash} from 'node:crypto';
const {APADANA_PROFILES:CURRENT_APADANA_PROFILES}=await import(new URL('src/apadana-profiles.mjs',HistoricalHBase).href);
const {projectPublisher339To333,historical333FileReader,projectPublisher339ClientTo333}=await import(new URL('tests/helpers/thera339-legacy-projection.mjs',HistoricalHBase).href);
const APADANA_PROFILES=projectPublisher339To333(CURRENT_APADANA_PROFILES,JSON.parse(readCurrentFileSync('server/data/apadana.json','utf8'))).profiles;
const readHistorical333=historical333FileReader(CURRENT_APADANA_PROFILES,readCurrentFileSync);
const readFileSync=(path,...options)=>{const raw=readHistorical333(path,...options);if(!['src/chatgpt-widget.mjs','web/translation-policy.mjs'].includes(path))return raw;const projected=projectPublisher339ClientTo333(path,raw.toString('utf8'));return typeof raw==='string'?projected:Buffer.from(projected);};
const {publisher333Authority,requireHistorical325Maps,projectPublisher333To325,historical325FileReader,projectPublisher333ClientTo325}=await import(new URL('tests/helpers/thera333-legacy-projection.mjs',HistoricalHBase).href);
const e=publisher333Authority(),clone=value=>structuredClone(value),sha=value=>createHash('sha256').update(value).digest('hex');
const manifest=()=>JSON.parse(readFileSync('server/data/apadana.json','utf8'));
const project=(profiles=APADANA_PROFILES,catalogue=manifest())=>projectPublisher333To325(profiles,catalogue);
function rejectedMutation(mutator){const p=clone(APADANA_PROFILES),m=manifest();mutator(p,m);assert.throws(()=>project(p,m));}
function substitute(map,from,to){return Object.fromEntries(Object.entries(map).map(([id,value])=>[id===from?to:id,value]));}

test('finite legacy binding first requires all333 exact full objects, then preserves all325 identities without altering its input',()=>{
 const p=clone(APADANA_PROFILES),m=manifest(),beforeP=JSON.stringify(p),beforeM=JSON.stringify(m),out=project(p,m);
 assert.equal(Object.keys(p).length,333);assert.equal(Object.keys(m.links).length,333);
 assert.deepEqual(Object.keys(out.profiles),e.compact.ids);assert.deepEqual(Object.keys(out.catalogue.links),e.compact.ids);assert.equal(requireHistorical325Maps(out.profiles,out.catalogue.links),true);
 assert.equal(sha(JSON.stringify(out.catalogue.source)),e.compact.manifest_source_sha256);
 assert.deepEqual(Object.keys(out.catalogue),['version','source','vri_commit','held','links']);assert.equal(out.catalogue.version,1);assert.equal(out.catalogue.vri_commit,'2d134ff9ef60f70a1eb03c9370580228811a3070');assert.deepEqual(out.catalogue.held,{});
 for(const id of e.compact.ids){assert.equal(out.profiles[id],p[id]);assert.equal(out.catalogue.links[id],m.links[id]);}
 for(const id of e.newIds){assert.ok(!Object.hasOwn(out.profiles,id));assert.ok(!Object.hasOwn(out.catalogue.links,id));}
 assert.equal(JSON.stringify(p),beforeP);assert.equal(JSON.stringify(m),beforeM);
 assert.ok(Object.isFrozen(out.profiles));assert.ok(Object.isFrozen(e));assert.ok(Object.isFrozen(e.profiles[e.newIds[0]]));
});

test('preservation refuses old/new omission, same-count substitution, forged fields and reordered objects rather than accepting a matching count',()=>{
 const old=e.compact.ids[0],fresh=e.newIds[0];
 for(const id of [old,fresh]){
  rejectedMutation(p=>{delete p[id];});rejectedMutation((p,m)=>{delete m.links[id];});
  rejectedMutation(p=>{p[id]={...p[id],unreviewed_field:true};});rejectedMutation((p,m)=>{m.links[id]={...m.links[id],unreviewed_field:true};});
  rejectedMutation(p=>{p[id]=clone(p[id===old?fresh:old]);});rejectedMutation((p,m)=>{m.links[id]=clone(m.links[id===old?fresh:old]);});
  rejectedMutation(p=>{p[id]=Object.fromEntries(Object.entries(p[id]).reverse());});
  rejectedMutation((p,m)=>{m.links[id]=Object.fromEntries(Object.entries(m.links[id]).reverse());});
 }
 for(const forbidden of ['tha-ap262','tha-ap268','tha-ap313','tha-ap322','tha-ap9999']){
  const p=substitute(clone(APADANA_PROFILES),fresh,forbidden);assert.equal(Object.keys(p).length,333);assert.throws(()=>project(p));
  const m=manifest();m.links=substitute(m.links,fresh,forbidden);assert.equal(Object.keys(m.links).length,333);assert.throws(()=>project(APADANA_PROFILES,m));
 }
 assert.throws(()=>project(Object.fromEntries(Object.entries(APADANA_PROFILES).reverse())));
 rejectedMutation((p,m)=>{m.links=Object.fromEntries(Object.entries(m.links).reverse());});
 const prior=project();assert.throws(()=>project(prior.profiles,prior.catalogue),'A legacy325 input is never a fallback');
});

test('only the two exact independently approved current source counters and unchanged manifest envelope may project',()=>{
 rejectedMutation((p,m)=>{m.source.policy=m.source.policy.replace('333 finite complete publisher-edition poems','334 finite complete publisher-edition poems');});
 rejectedMutation((p,m)=>{m.source.policy=m.source.policy.replace('293 explicitly mapped Therā','292 explicitly mapped Therā');});
 rejectedMutation((p,m)=>{m.source.policy+=' 333 finite complete publisher-edition poems';});
 rejectedMutation((p,m)=>{m.source.policy+=' unreviewed';});
 rejectedMutation((p,m)=>{m.source.license='invented';});
 rejectedMutation((p,m)=>{m.source.unreviewed_field=true;});
 rejectedMutation((p,m)=>{m.version=2;});rejectedMutation((p,m)=>{m.vri_commit='0'.repeat(40);});
 rejectedMutation((p,m)=>{m.held={'tha-ap313':true};});rejectedMutation((p,m)=>{m.unreviewed_field=true;});
 rejectedMutation((p,m)=>{m.source=Object.fromEntries(Object.entries(m.source).reverse());});
 const current=manifest();assert.throws(()=>project(APADANA_PROFILES,{source:current.source,links:current.links}),'No shortened envelope passes');
});

test('historical manifest reader is scoped to the exact old test literal, keeps read types, and refuses corrupted current333',()=>{
 const bytes=readFileSync('server/data/apadana.json'),seen=[],reader=(path,...options)=>{seen.push([path,...options]);return options[0]==='utf8'?bytes.toString('utf8'):bytes;};
 const read=historical325FileReader(APADANA_PROFILES,reader),binary=read('server/data/apadana.json'),utf8=read('server/data/apadana.json','utf8');
 assert.ok(Buffer.isBuffer(binary));assert.equal(typeof utf8,'string');assert.deepEqual(JSON.parse(binary),project().catalogue);assert.equal(binary.toString('utf8'),utf8);
 assert.equal(read('any-other-path'),bytes);assert.equal(read('./server/data/apadana.json'),bytes);assert.equal(seen.length,4);
 assert.throws(()=>read('server/data/apadana.json',{encoding:'utf8'}));
 const bad=manifest();bad.links[e.newIds[0]].unreviewed_field=true;
 assert.throws(()=>historical325FileReader(APADANA_PROFILES,()=>Buffer.from(JSON.stringify(bad)))('server/data/apadana.json'));
});

test('finite client inverse restores full pinned104 code and refuses missing, swapped, held, duplicate and non-suffix identities or wrong versions',()=>{
 for(const[path,expected]of [['web/translation-policy.mjs','d94ee9b91a30e4883056b6c4e2e12d7af1ea58d1720d4bda7a99fd672ad66af7'],['src/chatgpt-widget.mjs','4a99a25704b6ad56b217cabc63334887a5388c65380f0539a0b4d271aeb5663d']]){
  const current=readFileSync(path,'utf8'),out=projectPublisher333ClientTo325(path,current);assert.equal(sha(out),expected);assert.throws(()=>projectPublisher333ClientTo325(path,out),'No old325 source fallback');
  const match=[...current.matchAll(/^const PINNED_NEW_PARATEXT_IDS = (?:new Set\()?(\[[^\n]+\])\)?;$/gm)];assert.equal(match.length,1);const literal=match[0][1],ids=JSON.parse(literal),old=ids.find(id=>!e.newIds.includes(id));assert.equal(ids.length,244);
  const mutated=fn=>{const list=[...ids];fn(list);return current.replace(literal,JSON.stringify(list));};
  for(const replacement of [old,'tha-ap313','tha-ap322','tha-ap9999'])assert.throws(()=>projectPublisher333ClientTo325(path,mutated(list=>{list[list.indexOf(e.newIds[0])]=replacement;})));
  assert.throws(()=>projectPublisher333ClientTo325(path,mutated(list=>{list.splice(list.indexOf(e.newIds[0]),1);})));
  assert.throws(()=>projectPublisher333ClientTo325(path,mutated(list=>{const index=list.indexOf(e.newIds[0]);[list[0],list[index]]=[list[index],list[0]];})));
  assert.throws(()=>projectPublisher333ClientTo325(path,current+'\n// unauthorized historical source change\n'));
  assert.throws(()=>projectPublisher333ClientTo325('src/other.mjs',current));
  if(path==='src/chatgpt-widget.mjs')for(const version of ['v38','v40'])assert.throws(()=>projectPublisher333ClientTo325(path,current.replace("export const WIDGET_VERSION = 'v39';",`export const WIDGET_VERSION = '${version}';`)));
 }
});
