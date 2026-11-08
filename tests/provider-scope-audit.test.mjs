import{historicalSutta}from'./helpers/daily-epochs.mjs';
import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {dailyText} from '../src/daily.mjs';
import {scopeScreen} from '../scripts/source-scope-screen.mjs';
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
const blocked='dt:KN/Iti/iti10',retained='dt:AN/AN3_47';
const roots=[['iti10','367f1ca74ee3e5653da2c16528ba19dcfa7792383cbfb58eb7f00db75297fb35'],['iti11','cf52d1e71d04437874587727c994d932b57a7bed61a6b5354bf39949b41f5012'],['iti12','b147e9ea77571d6834e5f3f7bc85add132b9726b2c39353ba811bbedb8cc59ed'],['iti13','89b8bf42494fdfb085987646268dd9ed51f2c954376e08cc58e737b7894cc54e'],['an3.47','3077b231390dad86b3b5106f90b659b9c09c0b775dd2e1faab961ca521438cab'],['an3.48','97dc21e82e76c5bae9daf734fb9d1929a7e5e8eb95cc79d54a87ae7573abe315']];

test('complete roots distinguish four Iti records from the valid two-section AN primary record',()=>{
 for(const[id,digest]of roots){const u=canon.resolve(id).unit;assert.equal(createHash('sha256').update(JSON.stringify(canon.load().canon.books[u.book].blocks.slice(u.start,u.end))).digest('hex'),digest);}
 const a=canon.resolve('an3.47').unit,next=canon.resolve('an3.48').unit;assert.equal(a.vri,'47–48');assert.equal(next.vri,'49');assert.equal(a.end,next.start);assert.ok(canon.segments(a).some(s=>s.text.includes('asaṅkhatalakkhaṇāni')));assert.ok(canon.segments(next).some(s=>s.text.includes('Himavantaṃ')));assert.ok(english.available(a).some(l=>l.translation_id===retained));assert.equal(english.available(next).some(l=>l.translation_id===retained),false);
});

test('held DT Iti10 cannot be resolved, fetched, verified or replaced silently; ATI remains explicit scoped access',async()=>{
 assert.equal(Object.values(canon.load().translations).flat().some(l=>l.url==='https://www.dhammatalks.org/suttas/KN/Iti/iti10.html'),false);assert.throws(()=>canon.resolve('https://www.dhammatalks.org/suttas/KN/Iti/iti10.html'),/not linked/);let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch');};
 for(const id of ['iti10','iti11','iti12','iti13']){const u=canon.resolve(id).unit,m=canon.describe(u);assert.equal(m.english_available,0);assert.equal(m.shared_english_available,1);const link=m.english[0];assert.equal(link.translation_id,'ati:/tipitaka/kn/iti/iti.1.001-027.than');assert.equal(link.translation_scope.condensed,true);assert.equal(link.translation_scope.individual_alignment_verified,false);await assert.rejects(english.translation(u,blocked),/not linked|not available/);await assert.rejects(english.translation(u),/scoped|shared/);await assert.rejects(verifyQuote({text:'Synthetic neighbouring discourse phrase',language:'english',texts:[id],translation_ids:[blocked],include_shared:true}),/not linked|not available/);}
 assert.equal(calls,0);
});

test('metadata screen produces leads without approving, excluding or fetching and preserves root-number context',()=>{
 const units=new Map([['a',{id:'a',title:'Combined',vri:'47–48',book:0,start:0,end:2,collection:'an'}],['b',{id:'b',title:'Verse',vri:'23–24',book:0,start:2,end:4,collection:'thig'}]]);
 const d={canon:{source:{commit:'synthetic'}},byId:units,translations:{a:[{source:'dhammatalks',url:'https://www.dhammatalks.org/suttas/AN/AN3_47.html',reference:'AN3:47–48',match:'number+title'}],b:[{source:'ati',path:'/tipitaka/kn/thig/fixture',url:'https://accesstoinsight.org/tipitaka/kn/thig/fixture.html',reference:'Thig19–38',match:'number'}]}};
 const before=structuredClone(d.translations),r=scopeScreen(d);assert.equal(r.screening_only,true);assert.equal(r.count,2);assert.equal(r.rows[0].triage,'inspect wider verse-reference extent');assert.equal(r.rows[1].indexed_root.vri,'47–48');assert.match(r.warning,/before any change/);assert.deepEqual(d.translations,before);assert.equal(r.rows.some(x=>Object.hasOwn(x,'approved')),false);
 const actual=scopeScreen();assert.ok(actual.rows.some(r=>r.translation_id===retained));assert.equal(actual.rows.some(r=>r.translation_id===blocked),false);
});

test('post-linker hold removes every owner/scope bypass, preserves AN3.47 and cannot be recreated by a normal rebuild',()=>{
 const units=['iti10','iti11','iti12','iti13','an3.47','an3.48'].map(id=>canon.resolve(id).unit);
 const p=spawnSync('python',['-c',`import sys,json,pathlib,tempfile,gzip,copy,subprocess
sys.path.insert(0,'scripts/canon')
from reviewed_exclusions import apply_reviewed_exclusions
units=json.load(sys.stdin);url='https://www.dhammatalks.org/suttas/KN/Iti/iti10.html'
a={'wrong':[{'source':'dhammatalks','url':url+'?bypass=1','shared_scope':{}}],'iti10':[{'source':'dhammatalks','url':url}],'an3.47':[{'source':'dhammatalks','url':'https://www.dhammatalks.org/suttas/AN/AN3_47.html'}]};old=copy.deepcopy(a);out,removed=apply_reviewed_exclusions(a);assert old==a and len(removed)==2 and list(out)==['an3.47'];assert apply_reviewed_exclusions(out)==(out,[])
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp)
 with gzip.open(p/'canon.gz','wt',encoding='utf-8') as f:json.dump({'units':units},f)
 pages=[{'url':url,'title':'10—13 Itivuttaka | sutta on dhammatalks.org'},{'url':'https://www.dhammatalks.org/suttas/AN/AN3_47.html','title':'AN3:47–48 Fabricated | Saṅkhata Sutta | sutta on dhammatalks.org'}]
 (p/'dt.json').write_text(json.dumps(pages),encoding='utf-8');(p/'ati.json').write_text('[]')
 r=subprocess.run([sys.executable,'scripts/canon/build_translations.py',str(p/'canon.gz'),str(p/'dt.json'),str(p/'ati.json'),str(p/'out.json')],capture_output=True,text=True,encoding='utf-8');assert r.returncode==0,r.stderr
 out=json.loads((p/'out.json').read_text());assert list(out)==['an3.47'],out;assert 'iti10.html' in r.stdout
print('passed')`],{encoding:'utf8',input:JSON.stringify(units),env:{...process.env,PYTHONUTF8:'1'}});assert.equal(p.status,0,p.stderr);assert.match(p.stdout,/passed/);
});

test('D203 historical eligibility snapshots preserve both sides of its source correction without restoring held runtime links',()=>{
 assert.deepEqual(historicalSutta('d203_after'),{of:1269,id:'sn5.3'});
 assert.deepEqual(historicalSutta('d203_before'),{of:1270,id:'snp2.7'});
});
