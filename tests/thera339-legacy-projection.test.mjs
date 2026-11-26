import {project343To339} from './helpers/intake343-metadata.mjs';
import {frozen440FileReader} from './helpers/boundary333-336-source-input.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync as readCurrentFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {APADANA_PROFILES as CURRENT343_PROFILES} from '../src/apadana-profiles.mjs';
import {publisher339Authority,requireProfiles339,requireHistorical333Maps,projectPublisher339To333,historical333FileReader,projectPublisher339ClientTo333,normalize339InputTo333} from './helpers/thera339-legacy-projection.mjs';
const readFileSync=frozen440FileReader(readCurrentFileSync);
const historical339=project343To339(CURRENT343_PROFILES,JSON.parse(readCurrentFileSync('server/data/apadana.json','utf8')));
const APADANA_PROFILES=historical339.profiles;
const e=publisher339Authority(),sha=x=>createHash('sha256').update(x).digest('hex'),clone=x=>structuredClone(x),manifest=()=>structuredClone(historical339.catalogue);
const project=(p=APADANA_PROFILES,m=manifest())=>projectPublisher339To333(p,m);
function negative(fn){const p=clone(APADANA_PROFILES),m=manifest();fn(p,m);assert.throws(()=>project(p,m));}
test('strict339 maps preserve all333 full profiles links property order and immutable source policy',()=>{
 const p=clone(APADANA_PROFILES),m=manifest(),oldP=JSON.stringify(p),oldM=JSON.stringify(m),out=project(p,m);assert.equal(Object.keys(p).length,339);assert.equal(requireHistorical333Maps(out.profiles,out.catalogue.links),true);assert.equal(sha(JSON.stringify(out.catalogue.source)),e.compact.manifest_source_sha256);assert.equal(JSON.stringify(p),oldP);assert.equal(JSON.stringify(m),oldM);
 for(const id of e.compact.ids){assert.equal(out.profiles[id],p[id]);assert.equal(out.catalogue.links[id],m.links[id]);}assert.ok(Object.isFrozen(out.profiles));
 assert.throws(()=>project(out.profiles,out.catalogue));assert.throws(()=>requireProfiles339(out.profiles));assert.equal(normalize339InputTo333(out.profiles,out.catalogue).profiles,out.profiles);
});
test('old and new omissions same-count substitutions forged fields and property reorders fail after positives',()=>{
 project();for(const id of [e.compact.ids[0],...e.newIds]){
  for(const key of ['profiles','links'])for(const mutate of [x=>{delete x[id]},x=>{x[id]={...x[id],unapproved:true}},x=>{x[id]=Object.fromEntries(Object.entries(x[id]).reverse())}])negative((p,m)=>mutate(key==='profiles'?p:m.links));
 }
 for(const id of ['tha-ap324','tha-ap329','tha-ap330','tha-ap332','tha-ap333'])negative((p,m)=>{const fresh=e.newIds[0];p=Object.assign(p,{[id]:p[fresh]});delete p[fresh]});
 negative((p,m)=>{m.links=Object.fromEntries(Object.entries(m.links).reverse())});
});
test('source rights and only two exact current counters are mandatory; historical input is not current fallback',()=>{
 for(const key of ['source','held','vri_commit','version'])negative((p,m)=>{if(key==='source')m.source.policy+=' unreviewed';else if(key==='held')m.held={'tha-ap324':true};else m[key]=0;});
 for(const [a,b]of [['339 finite','338 finite'],['299 explicitly mapped Therā','298 explicitly mapped Therā']])negative((p,m)=>m.source.policy=m.source.policy.replace(a,b));negative((p,m)=>m.source.policy+='339 finite complete publisher-edition poems');negative((p,m)=>m.source.license='CC0');
});
test('finite six suffix and widget v40 inverse restore whole pinnedD4 source bytes and refuse unrelated edits',()=>{
 for(const path of ['src/chatgpt-widget.mjs','web/translation-policy.mjs']){
  const current=readFileSync(path,'utf8'),out=projectPublisher339ClientTo333(path,current);assert.notEqual(out,current);assert.throws(()=>projectPublisher339ClientTo333(path,out));
  const literal=current.match(/^const PINNED_NEW_PARATEXT_IDS = (?:new Set\()?(\[[^\n]+\])\)?;$/m)[1],ids=JSON.parse(literal);assert.equal(ids.length,250);
  for(const mutate of [x=>x.pop(),x=>x.reverse(),x=>{x[x.length-1]='tha-ap324'},x=>x.push(e.newIds[0])]){const x=[...ids];mutate(x);assert.throws(()=>projectPublisher339ClientTo333(path,current.replace(literal,JSON.stringify(x))));}
  assert.throws(()=>projectPublisher339ClientTo333(path,current+'\n// unrelated change\n'));if(path.startsWith('src/'))assert.throws(()=>projectPublisher339ClientTo333(path,current.replace("'v40'","'v41'")));
 }
});
