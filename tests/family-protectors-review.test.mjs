import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {scopeHash} from '../src/translation-scope.mjs';
import {translationCoverage} from '../src/providers.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {liveCache} from '../src/cache.mjs';
const shared=JSON.parse(readFileSync('scripts/canon/reviewed_shared_pages.json')),mother=shared.links.find(r=>r.owner_id==='sn15.14');
const whole=JSON.parse(readFileSync('scripts/canon/reviewed_ati_stories.json')),protectors=whole.links.filter(r=>r.unit_id==='an2.9');
const originalFetch=globalThis.fetch;let saved;
afterEach(()=>{globalThis.fetch=originalFetch;liveCache.clear();if(saved)canon.load().translations=saved;saved=undefined;translationCoverage({refresh:true});});
const motherId='ati:/tipitaka/sn/sn15/sn15.014.than',irel='ati:/tipitaka/an/an02/an02.009.irel',than='ati:/tipitaka/an/an02/an02.009.than',held='ati:/tipitaka/kn/iti/iti.2.042-049x.irel';

test('Mother pins all six complete family roots and stays separate from ordinary translation counts',()=>{
 assert.ok(mother);assert.deepEqual(mother.text_ids,Array.from({length:6},(_,i)=>'sn15.'+(14+i)));assert.equal(mother.presentation,'condensed');
 const d=canon.load();const selected=mother.root_units.map(p=>{const u=canon.resolve(p.id).unit;assert.equal(u.title,p.title);assert.equal(u.vri,p.vri);assert.equal(createHash('sha256').update(JSON.stringify(d.canon.books[u.book].blocks.slice(u.start,u.end))).digest('hex'),p.root_blocks_sha256);const m=canon.describe(u);assert.equal(m.english_available,0);assert.equal(m.shared_english_available,1);const s=m.english[0].translation_scope;assert.equal(s.condensed,true);assert.equal(s.whole_unit_coverage,false);assert.equal(s.individual_alignment_verified,false);assert.deepEqual(s.text_ids,mother.text_ids);return{id:u.id,segments:canon.segments(u).map(({ref,type,text})=>({ref,type,text}))};});assert.equal(scopeHash(selected),mother.pali_segments_sha256);
 saved=d.translations;const before=translationCoverage({refresh:true}).total;d.translations={...saved};delete d.translations['sn15.14'];const after=translationCoverage({refresh:true}).total;for(const k of ['links','with_english','with_english_including_inherited'])assert.equal(before[k],after[k]);assert.equal(before.shared_only,after.shared_only+6);assert.equal(before.shared_links,after.shared_links+1);
 for(const uid of ['sn15.13','sn15.20'])assert.equal(canon.describe(canon.resolve(uid).unit).english.some(l=>l.translation_id===motherId),false);
});

test('Mother requires exact scoped consent, never revives DT ownership and keeps null-ID page quotations',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No implicit source request');};
 for(const uid of mother.text_ids){const u=canon.resolve(uid).unit;await assert.rejects(english.translation(u,motherId),/allow_shared/);await assert.rejects(english.translation(u,'dt:SN/SN15_14'),/not linked|not available/i);}
 assert.throws(()=>canon.resolve('https://accesstoinsight.org'+mother.path+'.html'),/Shared-page URL/);await assert.rejects(verifyQuote({text:'Synthetic family source phrase',language:'english',texts:['sn15.19'],translation_ids:[motherId]}),/include_shared/);assert.equal(calls,0);
 const text=('Synthetic family page only. Violet copper lantern by the window. '.repeat(25)).trim(),html=`<!-- BEGIN COPYRIGHTED TEXT CHUNK -->${text}<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) --><div id="F_provenance">Synthetic notice, no actual grant.</div><div id="F_citation">Synthetic citation.</div>`;saved=canon.load().translations;canon.load().translations=structuredClone(saved);const l=canon.load().translations['sn15.14'][0];l.shared_scope.text_sha256=scopeHash(text);l.shared_scope.notice_sha256=scopeHash(english.atiNotice(html));globalThis.fetch=async()=>new Response(html);
 const first=await english.translation(canon.resolve('sn15.19').unit,motherId,{allow_shared:true,limit:500});assert.equal(first.text_id,null);assert.equal(first.requested_text_id,'sn15.19');assert.equal(first.translation_scope.condensed,true);const{uid,translation,...args}=first.continue_with.arguments;assert.equal((await english.translation(canon.resolve(uid).unit,translation,args)).text,text.slice(500,1000));
 const q={text:'Violet copper lantern by the window',language:'english',texts:['sn15.14','sn15.19'],translation_ids:[motherId],include_shared:true};const yes=await verifyQuote(q);assert.equal(yes.verdict,'found');assert.equal(yes.matches[0].text_id,null);assert.match(yes.explanation,/do not establish any individual/);const no=await verifyQuote({...q,text:'Zeppelins juggle green otters'});assert.equal(no.verdict,'not_found_in_scope');assert.match(no.explanation,/do not establish any individual/);
 liveCache.clear();globalThis.fetch=async()=>new Response(html.replace('Synthetic notice','Changed notice'));await assert.rejects(english.translation(canon.resolve('sn15.19').unit,motherId,{allow_shared:true}),/notice changed/);
});

test('both AN2.9 versions retain exact identity, distinct rights and complete root pins; no AN2.8 or Iti42 remap',async()=>{
 assert.equal(protectors.length,2);assert.deepEqual(protectors.map(r=>r.path),['/tipitaka/an/an02/an02.009.than','/tipitaka/an/an02/an02.009.irel']);assert.deepEqual(protectors.map(r=>r.license),['CC-BY-NC','BPS']);const u=canon.resolve('an2.9').unit;const root=createHash('sha256').update(JSON.stringify(canon.load().canon.books[u.book].blocks.slice(u.start,u.end))).digest('hex');for(const r of protectors)assert.equal(r.root_blocks_sha256,root);
 assert.deepEqual(english.available(u).map(l=>l.translation_id),[than,irel]);
 const urls=[];globalThis.fetch=async url=>{urls.push(url);return new Response('<body><!-- BEGIN COPYRIGHTED TEXT CHUNK -->Synthetic chosen Ireland source.<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) --><div id="F_provenance">Synthetic BPS-style notice, not real permission.</div><div id="F_citation">Synthetic attribution.</div></body>');};
 const result=await english.translation(u,irel,{allow_fallback:false});assert.equal(result.translation_id,irel);assert.equal(result.translator,'John D. Ireland');assert.equal(result.text_id,'an2.9');assert.match(result.license,/Synthetic BPS-style notice/);assert.equal(urls.length,1);assert.match(String(urls[0]),/an02\.009\.irel/);
 for(const id of ['an2.8','iti42'])await assert.rejects(english.translation(canon.resolve(id).unit,irel),/not linked|not available|No English/i);assert.equal(urls.length,1);
});

test('Iti42 collection is globally withheld while its independent DT version remains and exact selection never substitutes it',async()=>{
 const u=canon.resolve('iti42').unit;assert.deepEqual(english.available(u).filter(l=>!l.translation_scope).map(l=>l.translation_id),['dt:KN/Iti/iti42']);assert.equal(english.available(u).some(l=>l.translation_id===held),false);assert.throws(()=>canon.resolve('https://www.accesstoinsight.org/tipitaka/kn/iti/iti.2.042-049x.irel.html'),/not linked/);let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch');};await assert.rejects(english.translation(u,held),/not linked|not available/);await assert.rejects(verifyQuote({text:'Synthetic other-discourse quotation',language:'english',texts:['iti42'],translation_ids:[held]}),/not linked|not available/);assert.equal(calls,0);
});

test('ordinary rebuild excludes the noncontiguous Iti collection globally and preserves an unrelated source',()=>{
 const units=['iti42','iti43'].map(id=>canon.resolve(id).unit);
 const r=spawnSync('python',['-c',`import sys,json,pathlib,tempfile,gzip,subprocess,copy
sys.path.insert(0,'scripts/canon')
from reviewed_exclusions import apply_reviewed_exclusions
x=json.load(sys.stdin);url='https://www.accesstoinsight.org/tipitaka/kn/iti/iti.2.042-049x.irel.html'
a={'wrong':[{'source':'ati','url':url+'?bypass=1','shared_scope':{}}],'iti42':[{'source':'ati','url':url},{'source':'dhammatalks','url':'https://www.dhammatalks.org/suttas/KN/Iti/iti42.html'}]};old=copy.deepcopy(a);out,removed=apply_reviewed_exclusions(a);assert a==old and len(removed)==2 and len(out['iti42'])==1 and out['iti42'][0]['source']=='dhammatalks';assert apply_reviewed_exclusions(out)==(out,[])
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp)
 with gzip.open(p/'canon.gz','wt',encoding='utf-8') as f:json.dump({'units':x},f)
 pages=[{'path':'tipitaka/kn/iti/iti.2.042-049x.irel.html','html_title':'Itivuttaka: The Group of Twos','author':'John D. Ireland','license':'BPS'},{'path':'tipitaka/kn/iti/iti.2.043.synthetic.html','html_title':'Synthetic control','author':'Synthetic','license':'Synthetic'}]
 (p/'ati.json').write_text(json.dumps(pages));(p/'dt.json').write_text('[]')
 a=subprocess.run([sys.executable,'scripts/canon/build_translations.py',str(p/'canon.gz'),str(p/'dt.json'),str(p/'ati.json'),str(p/'out.json')],capture_output=True,text=True,encoding='utf-8');assert a.returncode==0,a.stderr
 out=json.loads((p/'out.json').read_text());assert list(out)==['iti43'],out;assert 'iti.2.042-049x.irel.html' in a.stdout
print('passed')`],{encoding:'utf8',input:JSON.stringify(units),env:{...process.env,PYTHONUTF8:'1'}});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/passed/);
});
