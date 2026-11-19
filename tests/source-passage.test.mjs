import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as commentary from '../src/commentary.mjs';
import * as postcanonical from '../src/postcanonical.mjs';
import {readBook} from '../src/source-books.mjs';
import {createSourcePassage} from '../web/source-passage.mjs';

// A text-only DOM sink makes accidental markup setters and extra attributes fail.
const document={createElement(tag){
 assert.ok(['p','h2','h3','h4','h5'].includes(tag));
 return{tagName:tag.toUpperCase(),set textContent(value){this.literal=String(value);},get textContent(){return this.literal;},set innerHTML(value){throw Error('Source markup must not execute');},setAttribute(){throw Error('No invented source attributes');}};
}};

test('actual MN10 page exposes all fourteen literal source headings without changing text, order or source metadata',()=>{
 const segments=canon.segments(canon.resolve('mn10').unit).slice(0,30),before=JSON.stringify(segments);
 const nodes=segments.map(segment=>createSourcePassage(document,segment,3));
 assert.equal(nodes.filter(node=>node.tagName==='H3').length,14);
 assert.deepEqual(nodes.map(node=>node.textContent),segments.map(segment=>segment.text));
 for(let i=0;i<nodes.length;i++){
  assert.equal(nodes[i].tagName,segments[i].type==='heading'?'H3':'P');
  assert.equal(nodes[i].lang,'pi');assert.equal(nodes[i].className,'passage');
 }
 assert.equal(JSON.stringify(segments),before);
});

test('source invocations, titles and colophons keep one caller-selected level rather than an inferred chapter hierarchy',()=>{
 const segments=[...readBook({book:'vin02m2',limit:5}).segments,...canon.segments(canon.resolve('pli-tv-kd1').unit)],headings=segments.filter(segment=>segment.type==='heading');
 assert.ok(headings.some(segment=>segment.text.startsWith('Namo tassa')));assert.ok(headings.some(segment=>/niṭṭhit/.test(segment.text)));
 for(const level of [2,3,4,5])for(const segment of headings){
  const node=createSourcePassage(document,Object.freeze({...segment}),level,level===2?'print-passage':'passage');
  assert.equal(node.tagName,'H'+level);assert.equal(node.textContent,segment.text);assert.equal(node.lang,'pi');assert.equal(node.className,level===2?'print-passage':'passage');
 }
});

test('actual commentary and later-work metadata use their source type at the pane level with no mutation',()=>{
 const comment=commentary.bookSegments(commentary.load().books[0]);
 const later=postcanonical.segmentsOf(postcanonical.load().books[0].blocks);
 for(const segments of [comment,later]){
  assert.ok(segments.some(segment=>segment.type==='heading'));assert.ok(segments.some(segment=>segment.type==='prose'));
  const before=JSON.stringify(segments);
  for(const level of [4,5])for(const segment of segments.slice(0,30)){
   const node=createSourcePassage(document,segment,level);assert.equal(node.tagName,segment.type==='heading'?'H'+level:'P');assert.equal(node.textContent,segment.text);assert.equal(node.lang,'pi');
  }
  assert.equal(JSON.stringify(segments),before);
 }
});

test('only the exact heading type is promoted; text and unknown metadata cannot inject markup or a heading level',()=>{
 const text='<h1 onclick="bad()">1. Namo tassa</h1>\nA source-shaped title niṭṭhitaṃ.';
 for(const type of ['prose','verse','title','Heading','heading ','h3','heading<script>',null,undefined]){
  const segment=Object.freeze({type,text,ref:'fixture/1',source_commit:'untouched'}),node=createSourcePassage(document,segment,3);
  assert.equal(node.tagName,'P');assert.equal(node.textContent,text);assert.equal(segment.ref,'fixture/1');assert.equal(segment.source_commit,'untouched');
 }
 const heading=createSourcePassage(document,Object.freeze({type:'heading',text}),5);assert.equal(heading.tagName,'H5');assert.equal(heading.textContent,text);
 for(const level of [undefined,null,1,6,0,-1,3.5,'3','3 onclick="bad()"'])assert.throws(()=>createSourcePassage(document,{type:'heading',text},level),/Unsupported source heading level/);
});
