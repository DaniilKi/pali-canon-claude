/** Best-effort optimistic storage guard, not atomic CAS or a cross-tab transaction. */
import {isReadingLocator} from './reading-position.mjs';
const own=(x,k)=>Object.hasOwn(x,k);
function profile(raw) {const x=raw===null?{}:JSON.parse(raw);if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Unsupported browser data');return x;}
function conflict() {const e=Error('Another tab changed browser data. No stored data was overwritten.');e.code='BROWSER_DATA_CHANGED';return e;}
function withoutPosition(x) {const {last,...rest}=x;return JSON.stringify(rest);}
const pointerOK=x=>!own(x,'last')||isReadingLocator(x.last);
export function readingPointerOnlyChange(expected,actual) {
 try {if(!(expected===null||typeof expected==='string')||!(actual===null||typeof actual==='string'))return false;const a=profile(expected),b=profile(actual);return pointerOK(a)&&pointerOK(b)&&withoutPosition(a)===withoutPosition(b);}catch{return false;}
}
export function guardedStorageWrite({expected,value,read,write}) {
 const actual=read();if(typeof value!=='string')throw Error('Browser data could not be serialized.');
 let committed=value;
 if(!(expected===null||typeof expected==='string')||actual!==expected) {
  if(!readingPointerOnlyChange(expected,actual))throw conflict();
  const base=profile(expected),current=profile(actual),incoming=profile(value);if(!pointerOK(incoming))throw conflict();
  // An unrelated note/mark save must not resurrect its old locator. Adopt only this observed metadata field.
  if(own(base,'last')===own(incoming,'last')&&base.last===incoming.last){if(own(current,'last'))incoming.last=current.last;else delete incoming.last;}
  committed=JSON.stringify(incoming);
 }
 if(read()!==actual)throw conflict();
 write(committed);return committed;
}
/** Reading alone writes only a validated locator into current data; its private-data baseline stays old. */
export function guardedPositionWrite({expected,locator,read,write}) {
 if(!isReadingLocator(locator))throw Error('Unsupported reading locator');
 const actual=read(),current=profile(actual),baseline=profile(expected);
 if(!pointerOK(current)||!pointerOK(baseline))throw conflict();
 if(current.remember_position===false){baseline.remember_position=false;delete baseline.last;return {snapshot:JSON.stringify(baseline),disabled:true};}
 const committed=JSON.stringify({...current,last:locator}),snapshot=JSON.stringify({...baseline,last:locator});
 if(read()!==actual)throw conflict();
 write(committed);return {snapshot,disabled:false};
}
