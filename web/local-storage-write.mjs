/** Best-effort optimistic storage guard, not an atomic compare-and-swap or cross-tab transaction. */
export function guardedStorageWrite({expected,value,read,write}) {
 const actual=read();
 if (!(expected===null||typeof expected==='string') || actual!==expected) {
  const error=Error('Another tab changed browser data. No stored data was overwritten.');error.code='BROWSER_DATA_CHANGED';throw error;
 }
 if(typeof value!=='string')throw Error('Browser data could not be serialized.');
 write(value);return value;
}
