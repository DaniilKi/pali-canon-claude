import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFocusOwnership} from '../web/focus-ownership.mjs';

test('completion retains navigation focus only until a later task or focus change',()=>{
 let active='main',focused=true;
 const owner=createFocusOwnership({activeElement:()=>active,hasFocus:()=>focused});
 const read=owner.capture();assert.equal(owner.owns(read),true);
 active='query';owner.changed();assert.equal(owner.owns(read),false);
 active='main';owner.changed();assert.equal(owner.owns(read),false,'Returning to the same element does not restore an expired lease.');
 const next=owner.capture();assert.equal(owner.owns(next),true);
 owner.changed();assert.equal(owner.owns(next),false,'Pointer/keyboard work on the same element also expires the lease.');
});
test('backgrounded or superseded user work cannot regain completion focus on return',()=>{
 let focused=true;const owner=createFocusOwnership({activeElement:()=>null,hasFocus:()=>focused});
 const initial=owner.capture();focused=false;assert.equal(owner.owns(initial),false);
 owner.changed();focused=true;assert.equal(owner.owns(initial),false);
 assert.equal(owner.owns(undefined),false);assert.equal(owner.owns(owner.capture()),true);
});
