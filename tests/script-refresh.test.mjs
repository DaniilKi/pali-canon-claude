import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scriptRefreshEligible,retainBookSearchDraft} from '../web/script-refresh.mjs';
import {bookSearchSelection} from '../web/book-search.mjs';
import {canonicalSearchSelection} from '../web/canonical-search.mjs';
import {citationSelection} from '../web/citation-resolution.mjs';

test('script refresh admits only the five exact source-display routes and leaves executed routes untouched',()=>{
 const routes=['#read?uid=mn10&offset=30&ref=mn10%2F31&source=pinned','#daily?date=2026-11-19&kind=sutta','#resolve?reference=MN+10','#search?q=sati&scope=canon&offset=15','#search?q=sati&scope=commentary&offset=15','#search?q=sati&scope=post&offset=15','#book-search?book=vin02m1&q=sati&offset=15&source=pinned','#book-search?book=vin02m1&mode=headings&source=pinned'];
 for(const hash of routes){const before=hash;assert.equal(scriptRefreshEligible(hash),true,hash);assert.equal(hash,before);}
 for(const hash of ['#browse?node=books','#saved','#backup','#verify','#glossary?term=sati','#plans','#topics','#topic?name=sati','#lists','#about','#content','#read-more?uid=mn10','#daily-settings','#searching?q=sati','#book-search-extra?book=vin02m1','read?uid=mn10','','#',null,undefined])assert.equal(scriptRefreshEligible(hash),false,String(hash));
});

test('one raw source-book draft retains UTF-16 selection through same-route refresh and retry, without copying other form data',()=>{
 const hash='#book-search?book=vin02m1&q=sati&offset=15&source=original';
 const input=Object.freeze({value:'  unsubmitted  සති 𑀲\n',selectionStart:2,selectionEnd:19,selectionDirection:'backward',toolsOpen:true,files:['private file'],note:'private note',query:'never execute'});
 const draft=retainBookSearchDraft(null,hash,input);assert.deepEqual(draft,{hash,value:input.value,start:2,end:19,direction:'backward',toolsOpen:true});
 assert.equal(Object.hasOwn(draft,'files'),false);assert.equal(Object.hasOwn(draft,'note'),false);assert.equal(Object.hasOwn(draft,'query'),false);
 const before=JSON.stringify(draft);
 // During rapid changes, a stopped request or a failed request there is no form to recapture.
 for(let attempt=0;attempt<5;attempt++)assert.equal(retainBookSearchDraft(draft,hash),draft);
 assert.equal(JSON.stringify(draft),before);assert.equal(input.value,'  unsubmitted  සති 𑀲\n');
 const cleared=retainBookSearchDraft(draft,hash,{value:'',selectionStart:0,selectionEnd:0,selectionDirection:'none',toolsOpen:false});assert.equal(cleared.value,'');assert.equal(cleared.toolsOpen,false);
 for(const changed of [hash+'&extra=1',hash.replace('sati','metta'),hash.replace('offset=15','offset=30'),hash.replace('original','changed'),hash.replace('vin02m1','vin02m2'),'#read?book=vin02m1','#saved'])assert.equal(retainBookSearchDraft(draft,changed),null,changed);
 assert.equal(retainBookSearchDraft(draft,'#saved',input),null);
});

test('refresh keeps executed source-book/canonical/citation selections authoritative while draft wording remains separate',()=>{
 const raw='book=vin02m1&q=sati&offset=15&source=original',hash='#book-search?'+raw;
 const selected=bookSearchSelection(new URLSearchParams(raw),raw),before=structuredClone(selected);
 const draft=retainBookSearchDraft(null,hash,{value:'  never send this unsent wording  ',selectionStart:2,selectionEnd:7,selectionDirection:'forward'});
 assert.deepEqual(bookSearchSelection(new URLSearchParams(raw),raw),before);assert.equal(selected.query,'sati');assert.equal(selected.source,'original');assert.equal(selected.offset,15);assert.notEqual(draft.value,selected.query);
 const canonRaw='q=sati&scope=canon&offset=15',canonArgs=new URLSearchParams(canonRaw);
 for(const script of ['sinhala','thai','roman']){const current=canonicalSearchSelection(canonArgs,script,canonRaw);assert.equal(current.query,'sati');assert.equal(current.offset,15);assert.equal(current.script,script);}
 const referenceRaw='reference=MN+10';assert.equal(citationSelection(new URLSearchParams(referenceRaw),referenceRaw),'MN 10');
 assert.equal(raw,'book=vin02m1&q=sati&offset=15&source=original');assert.equal(canonArgs.toString(),canonRaw);
});
