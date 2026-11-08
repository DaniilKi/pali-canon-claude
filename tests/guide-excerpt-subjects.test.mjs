import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {GUIDE_DATA,readingPlan} from '../src/daily.mjs';
import {daySignature} from '../web/reading-plans.mjs';
import {scopeHash} from '../src/translation-scope.mjs';
const plan='ati-into-the-stream';
test('two reviewed guide excerpts retain all original day identities and saved-progress signatures without reviving translation bindings',()=>{
 const schedule=readingPlan(canon,{name:plan});assert.equal(schedule.days,50);
 assert.equal(scopeHash(GUIDE_DATA[plan].entries),'30dd1357072aa142cb00a283490caf06ecb6d1aac31757817aa74a6c4998411c','All fifty original source/path day assignments remain unchanged from12201ec');
 for(const id of ['mn95','mn75']){
  const day=GUIDE_DATA[plan].entries.findIndex(([,uid])=>uid===id)+1,data=readingPlan(canon,{name:plan,day}),r=data.readings[0];
  assert.equal(r.id,id);assert.deepEqual(r.get_text,{uid:id});assert.equal(r.guide_link.scope,'withheld-publisher-page');
  assert.equal(r.guide_link.whole_unit_coverage,false);assert.equal(r.guide_link.individual_alignment_verified,false);
  assert.match(r.notes.join(' '),/not an available whole-unit translation/);assert.match(r.notes.join(' '),/original Pāli assignment/);
  assert.throws(()=>canon.resolve(r.guide_link.url),/not linked/);
  assert.ok(r.english.every(l=>l.translation_id!==('ati:/tipitaka/'+GUIDE_DATA[plan].entries[day-1][0])));
  assert.equal(daySignature(data),JSON.stringify({name:plan,day,source:canon.source().commit,readings:[{id,offset:0,limit:null,part:null,of:null}]}));
 }
 assert.deepEqual(schedule.schedule.map(d=>d.readings[0].id),GUIDE_DATA[plan].entries.map(([,id])=>id));
});
test('reviewed guide subject pins reject root, identity and source drift and never guess an unreviewed absent source',()=>{
 const real=canon.load(),fresh=()=>({...canon});
 const changedSource={...canon,load:()=>({...real,canon:{...real.canon,source:{...real.canon.source,commit:'changed'}}})};
 assert.throws(()=>readingPlan(changedSource,{name:plan}),/reviewed study-guide excerpt subject changed/);
 const books=real.canon.books.slice(),u=canon.resolve('mn95').unit;books[u.book]={...books[u.book],blocks:books[u.book].blocks.slice()};books[u.book].blocks[u.start]=['changed fixture'];
 assert.throws(()=>readingPlan({...canon,load:()=>({...real,canon:{...real.canon,books}})},{name:plan}),/reviewed study-guide excerpt subject changed/);
 assert.throws(()=>readingPlan({...canon,resolve:ref=>{const r=canon.resolve(ref);return ref==='mn95'?{...r,unit:{...r.unit,title:'Synthetic wrong subject'}}:r;}},{name:plan}),/reviewed study-guide excerpt subject changed/);
 const entry=GUIDE_DATA[plan].entries.find(([,id])=>id==='mn95'),before=entry[0];
 try{entry[0]='mn/mn.021x.than';assert.throws(()=>readingPlan(fresh(),{name:plan}),/not linked/);}finally{entry[0]=before;}
});


test('warmed guide caches recheck the current source and complete root before returning old assignments',()=>{
 const real=canon.load(),u=canon.resolve('mn95').unit;
 for(const kind of ['source','root']){
  let current=real;
  const stable={...canon,load:()=>current};
  assert.equal(readingPlan(stable,{name:plan,day:2}).readings[0].id,'mn95');
  if(kind==='source')current={...real,canon:{...real.canon,source:{...real.canon.source,commit:'synthetic-drift-after-warmup'}}};
  else{const books=real.canon.books.slice();books[u.book]={...books[u.book],blocks:books[u.book].blocks.slice()};books[u.book].blocks[u.start]=['synthetic root drift'];current={...real,canon:{...real.canon,books}};}
  assert.throws(()=>readingPlan(stable,{name:plan,day:2}),/reviewed study-guide excerpt subject changed/,kind);
 }
});
