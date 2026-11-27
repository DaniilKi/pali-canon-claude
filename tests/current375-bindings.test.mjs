/** Genuine actual-R375 counterpart to the exact historicalH368/v46 binding cases. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,realpathSync,rmSync,unlinkSync,renameSync,symlinkSync,statSync,utimesSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {APADANA_PROFILES} from '../src/apadana-profiles.mjs';
import {WIDGET_VERSION,WIDGET_URI,SKYBRIDGE_URI} from '../src/chatgpt-widget.mjs';
import {requiredCanonicalRevision} from '../src/locator-policy.mjs';
import {CURRENT_APADANA_IDS,CURRENT_APADANA_RECORDS,CURRENT_APADANA_URLS,CURRENT_THERA_IDS} from './helpers/apadana-intake-expectations.mjs';
import {intake375Authority,requireProfiles375,requireMetadata375,assertCurrent375SourceClosure,INTAKE375_IDS,CURRENT_WIDGET_VERSION,CURRENT_WIDGET_URI,INTAKE375_VRI,CURRENT375_SOURCE_FILE} from './helpers/intake375-metadata.mjs';

test('actual375 exports and full ordered profiles bind widget47 while H368 objects and canonical citation pins remain exact',()=>{
 const base=new URL('../',import.meta.url);assertCurrent375SourceClosure(base);
 const a=intake375Authority(base);requireProfiles375(APADANA_PROFILES,base);
 const catalogue=JSON.parse(readFileSync(new URL('../server/data/apadana.json',import.meta.url)));requireMetadata375(APADANA_PROFILES,catalogue,base);
 function bindings(value){
  assert.deepEqual(Object.keys(value),['ids','version','uri','skybridge']);
  assert.deepEqual(value.ids,a.ids);assert.equal(value.ids.length,375);assert.equal(new Set(value.ids).size,375);
  assert.equal(value.version,CURRENT_WIDGET_VERSION);assert.equal(value.version,'v47');
  assert.equal(value.uri,CURRENT_WIDGET_URI);assert.equal(value.uri,'ui://pali-canon/reader-v47.html');
  assert.equal(value.skybridge,'ui://pali-canon/reader-v47.skybridge.html');
 }
 const good={ids:CURRENT_APADANA_IDS,version:WIDGET_VERSION,uri:WIDGET_URI,skybridge:SKYBRIDGE_URI};bindings(good);
 assert.deepEqual(CURRENT_APADANA_IDS.slice(0,368),a.baseline.ids);assert.equal(a.baseline.ids.length,368);
 assert.deepEqual(CURRENT_APADANA_IDS.slice(368),INTAKE375_IDS);assert.equal(CURRENT_THERA_IDS.length,335);
 const expectedRecords=[...a.selection.baseline_records,...a.selection.approved_records];
 assert.deepEqual(CURRENT_APADANA_RECORDS,expectedRecords);assert.equal(CURRENT_APADANA_RECORDS.filter(row=>row.publisher_chapter==='chapter-4').length,40);
 assert.deepEqual(CURRENT_APADANA_URLS,expectedRecords.map(row=>'https://apadanatranslation.com/text/'+row.publisher_chapter+'/poem-'+String(row.poem).padStart(3,'0')+'/'));
 for(const id of a.baseline.ids){assert.deepEqual(APADANA_PROFILES[id],a.baseline.profiles[id]);assert.deepEqual(catalogue.links[id],a.baseline.links[id]);}
 for(const id of INTAKE375_IDS)assert.equal(requiredCanonicalRevision(id),id==='tha-ap374'?INTAKE375_VRI+'-apadana-thera-next10-v1':null);
 for(const ids of [good.ids.slice(1),good.ids.map((id,i)=>i===374?'tha-ap375':id),[...good.ids.slice(0,-1),good.ids[0]],good.ids.slice().reverse()])assert.throws(()=>bindings({...good,ids}));
 for(const bad of [{...good,version:'v46'},{...good,uri:'ui://pali-canon/reader-v46.html'},{...good,skybridge:'ui://pali-canon/reader-v46.skybridge.html'},{...good,extra:true},{ids:good.ids,version:good.version,uri:good.uri}])assert.throws(()=>bindings(bad));
 // Each side remains separately strict; a coherent same-count old/new owner substitution cannot become a new binding.
 for(const id of [a.baseline.ids[0],...INTAKE375_IDS]){
  const changed=structuredClone(APADANA_PROFILES);changed['tha-ap9999']=changed[id];delete changed[id];assert.equal(Object.keys(changed).length,375);assert.throws(()=>requireProfiles375(changed,base));
  const links=structuredClone(catalogue);links.links[id]={...links.links[id],raw_sha256:'0'.repeat(64)};assert.throws(()=>requireMetadata375(APADANA_PROFILES,links,base));
 }
 // The independently sealed current source manifest is the only fixture selector.
 // Copy its exact declared source rows; never copy the repository or runtime tree.
 const closure=assertCurrent375SourceClosure(base),declared=Object.keys(closure.files);
 assert.ok(declared.includes('src/chatgpt-widget.mjs'));
 assert.ok(declared.every(path=>!path.startsWith('server/')&&!path.startsWith('node_modules/')));
 const owner=realpathSync(mkdtempSync(join(tmpdir(),'pali375-source-closure-'))),fixture=join(owner,'fixture');
 mkdirSync(fixture);
 try{
  const targets=[CURRENT375_SOURCE_FILE,...declared],fixedPositiveTime=new Date('2020-01-01T00:00:00.000Z');
  for(const path of targets){const target=join(fixture,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,readFileSync(new URL(path,base)),{flag:'wx'});utimesSync(target,fixedPositiveTime,fixedPositiveTime);}
  const fixtureURL=pathToFileURL(fixture+sep),positive=()=>assertCurrent375SourceClosure(fixtureURL);
  assert.deepEqual(positive(),closure);
  for(const path of targets)for(const missing of [false,true]){
   assert.deepEqual(positive(),closure);const target=join(fixture,path),raw=readFileSync(target),stamp=statSync(target);
   assert.ok(raw.length>0,'Every finite declared source control has authentic nonempty bytes');
   try{
    if(missing)unlinkSync(target);else{const changed=Buffer.from(raw);changed[0]^=1;assert.equal(changed.length,raw.length);writeFileSync(target,changed);utimesSync(target,stamp.atime,stamp.mtime);const tamperedStamp=statSync(target);assert.equal(tamperedStamp.size,stamp.size);assert.equal(tamperedStamp.mtimeMs,stamp.mtimeMs,'Exact fixed positive mtime retained during byte tamper');}
    assert.throws(positive,path+' missing='+missing);
   }finally{writeFileSync(target,raw);utimesSync(target,stamp.atime,stamp.mtime);}
   assert.deepEqual(positive(),closure);
  }
  // Direct regular-file type controls apply to both the manifest and actual widget source.
  for(const path of [CURRENT375_SOURCE_FILE,'src/chatgpt-widget.mjs']){
   assert.deepEqual(positive(),closure);const target=join(fixture,path),raw=readFileSync(target);
   unlinkSync(target);mkdirSync(target);try{assert.throws(positive,path+' directory substitution');}finally{rmSync(target,{recursive:true});writeFileSync(target,raw,{flag:'wx'});}
   assert.deepEqual(positive(),closure);
   // Native Windows file-symlink privileges are not assumed. Its mandatory
   // parent/root junction controls below still exercise genuine alias refusal.
   if(process.platform!=='win32'){
    const authentic=join(owner,'authentic-'+(path===CURRENT375_SOURCE_FILE?'manifest':'widget'));writeFileSync(authentic,raw,{flag:'wx'});
    unlinkSync(target);symlinkSync(authentic,target,'file');try{assert.throws(positive,path+' authentic file alias');}finally{unlinkSync(target);writeFileSync(target,raw,{flag:'wx'});}
    assert.deepEqual(positive(),closure);
   }
  }
  // An authentic parent alias must refuse before its otherwise genuine source is hashed.
  const parent=join(fixture,'src'),savedParent=join(fixture,'src-authentic');
  renameSync(parent,savedParent);symlinkSync(savedParent,parent,process.platform==='win32'?'junction':'dir');
  try{assert.throws(positive,'authentic source-parent alias');}finally{unlinkSync(parent);renameSync(savedParent,parent);}
  assert.deepEqual(positive(),closure);
  const alias=join(owner,'root-alias');symlinkSync(fixture,alias,process.platform==='win32'?'junction':'dir');
  try{assert.throws(()=>assertCurrent375SourceClosure(alias));assert.throws(()=>assertCurrent375SourceClosure(pathToFileURL(alias+sep)));}finally{unlinkSync(alias);}
  assert.deepEqual(positive(),closure);
  const rootFile=join(owner,'not-a-directory');writeFileSync(rootFile,'SYNTHETIC_SOURCE_ROOT_FILE',{flag:'wx'});
  assert.throws(()=>assertCurrent375SourceClosure(rootFile));assert.throws(()=>assertCurrent375SourceClosure(join(owner,'missing-root')));
  let conversions=0;const foreign={toString(){conversions++;return fixture;},valueOf(){conversions++;return fixture;},[Symbol.toPrimitive](){conversions++;return fixture;}};
  for(const root of [null,{},foreign,new String(fixture),new URL('https://example.invalid/source')]){
   assert.throws(()=>assertCurrent375SourceClosure(root));
  }
  assert.equal(conversions,0,'Foreign source-root objects are not coerced');assert.deepEqual(positive(),closure);
 }finally{rmSync(owner,{recursive:true,force:true});}
 bindings(good);requireMetadata375(APADANA_PROFILES,catalogue,base);
});
