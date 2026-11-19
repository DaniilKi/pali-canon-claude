import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {scopeScreen} from '../scripts/source-scope-screen.mjs';

const d=canon.load(),id='mil3.1.8';
const snapshot=()=>({...d,translations:structuredClone(d.translations),sectionRegistry:structuredClone(d.sectionRegistry)});

test('ordinary whole-page screening excludes only validated extracted questions, not their PTS extents or fabricated review markers',()=>{
 const before=JSON.stringify(d.translations),result=scopeScreen(d);
 assert.equal(result.count,220);assert.equal(result.rows.some(row=>row.owner.startsWith('mil')),false);assert.equal(JSON.stringify(d.translations),before);
 const synthetic={...d,translations:{'mn1':[{source:'ati',path:'/tipitaka/mn/mn.001.synthetic',url:'https://accesstoinsight.org/tipitaka/mn/mn.001.synthetic.html',reference:'MN 1-2',match:'reviewed-ati-section'}]}};
 assert.equal(scopeScreen(synthetic).count,1,'A forged match label is not section evidence.');
});

test('screening cannot hide an invalid section binding or source root as a reviewed question',()=>{
 const mutations=[
  x=>{delete x.sectionRegistry;},
  x=>{delete x.translations[id][0].section;},
  x=>{delete x.translations['mil3.7.8'];},
  x=>{x.translations[id][0].translator='Different author';},
  x=>{x.translations[id][0].section.anchor='miln-2-1-14';},
  x=>{x.translations['mn1'].push(x.translations[id][0]);},
  x=>{x.canon={...x.canon,books:x.canon.books.slice()};const u=d.byId.get(id);x.canon.books[u.book]={...x.canon.books[u.book],blocks:x.canon.books[u.book].blocks.slice()};x.canon.books[u.book].blocks[u.start]=[...x.canon.books[u.book].blocks[u.start]];x.canon.books[u.book].blocks[u.start][2]+=' changed';},
 ];
 for(const mutate of mutations){const copy=snapshot();mutate(copy);assert.throws(()=>scopeScreen(copy),/Registered ATI question/);}
 assert.equal(scopeScreen(d).count,220,'Actual source snapshot remains unchanged.');
});
